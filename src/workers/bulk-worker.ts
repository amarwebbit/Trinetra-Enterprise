import { Worker, Job } from 'bullmq';
import { redis } from '../lib/redis/client';
import { prisma } from '../lib/db/client';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { ProgressTracker } from '@/lib/queue/progress-tracker';
import { sendImportCompletionEmail } from '@/lib/notifications/import-notification';

const progressTracker = new ProgressTracker();

function generateRandomPassword(length: number = 12): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+~';
  let password = '';
  const randomArray = new Uint8Array(randomBytes(length));
  for (let i = 0; i < length; i++) {
    password += charset[randomArray[i] % charset.length];
  }
  return password;
}

export const bulkWorker = new Worker(
  'bulk-operations',
  async (job: Job) => {
    console.log(`Processing job ${job.id} of type ${job.name}`);
    
    // Legacy support for 'import-users' (if still present in queue) or the new 'bulk-operations' format
    const { type, rows, tenantId, userId, email, users } = job.data;
    const actualType = type || (job.name === 'import-users' ? 'students' : null);
    const actualRows = rows || users || [];
    
    try {
      if (actualType === 'students') {
        await processStudentImport(job, actualRows, tenantId, userId);
      } else if (actualType === 'questions') {
        await processQuestionImport(job, actualRows, tenantId, userId);
      }
      
      const progress = await progressTracker.get(job.id as string);
      if (progress && email) {
        await sendImportCompletionEmail(email, {
          type: actualType as any,
          total: progress.total,
          success: progress.success,
          failed: progress.failed,
          errors: progress.errors,
        });
      }
      
      return { success: true };
    } catch (error: any) {
      console.error(`Job ${job.id} failed processing:`, error);
      await progressTracker.fail(job.id as string, error.message);
      throw error;
    }
  },
  { connection: redis, concurrency: 1 }
);

async function processStudentImport(
  job: Job,
  rows: any[],
  tenantId: string,
  userId: string
): Promise<void> {
  const BATCH_SIZE = 100;
  const total = rows.length;
  let processed = 0;
  let success = 0;
  
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    
    try {
      const dataToInsert = await Promise.all(batch.map(async (row) => ({
        tenant_id: tenantId,
        email: row.email,
        password_hash: await bcrypt.hash((row.role || 'student') === 'student' && row.rollNumber ? row.rollNumber : generateRandomPassword(), 10),
        full_name: row.fullName || row.name || row.email.split('@')[0],
        role: row.role || 'student',
        phone: row.phone || null,
        roll_number: row.rollNumber || null,
        is_active: true,
        email_verified: true,
      })));
      
      const result = await prisma.users.createMany({
        data: dataToInsert,
        skipDuplicates: true, // Prisma handles uniqueness
      });
      
      success += result.count;
      processed += batch.length;
      
      await progressTracker.update(job.id as string, { processed, success });
      await job.updateProgress(Math.round((processed / total) * 100));
      
    } catch (error: any) {
      // Fallback to individual inserts for specific error tracing
      for (const row of batch) {
        try {
          await prisma.users.create({
            data: {
              tenant_id: tenantId,
              email: row.email,
              password_hash: await bcrypt.hash((row.role || 'student') === 'student' && row.rollNumber ? row.rollNumber : generateRandomPassword(), 10),
              full_name: row.fullName || row.name || row.email.split('@')[0],
              role: row.role || 'student',
              phone: row.phone || null,
              roll_number: row.rollNumber || null,
              is_active: true,
              email_verified: true,
            },
          });
          success++;
        } catch (rowError: any) {
          await progressTracker.addError(job.id as string, {
            row: i + batch.indexOf(row) + 1,
            field: rowError.meta?.target?.[0] || 'unknown',
            message: rowError.message,
            value: JSON.stringify(row),
          });
        }
      }
      processed += batch.length;
      await progressTracker.update(job.id as string, { processed, success });
      await job.updateProgress(Math.round((processed / total) * 100));
    }
  }
  
  await progressTracker.complete(job.id as string, success);
  
  await prisma.audit_logs.create({
    data: {
      tenant_id: tenantId,
      user_id: userId,
      action: `Bulk CSV Import Job ${job.id}: Processed ${processed} students`,
      resource_type: 'user_management',
      metadata: { count: processed, success, jobId: job.id }
    }
  });
}

async function processQuestionImport(
  job: Job,
  rows: any[],
  tenantId: string,
  userId: string
): Promise<void> {
  const BATCH_SIZE = 500;
  const total = rows.length;
  let processed = 0;
  let success = 0;
  
  const normalizeAns = (val: any): string | null => {
    if (val === null || val === undefined) return null;
    if (Array.isArray(val)) return val.join(',');
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
  };

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    
    try {
      const result = await prisma.questions.createMany({
        data: batch.map(row => ({
          tenant_id: tenantId,
          bank_id: job.data.bankId,
          type: row.type,
          question_text: row.questionText,
          options: row.options,
          correct_answer: normalizeAns(row.correctAnswer || row.correctAnswers),
          marks: Number(row.marks) || 1,
          negative_marks: Number(row.negativeMarks) || 0,
          difficulty: row.difficulty,
          topic: row.topic,
          is_active: true,
        })),
        skipDuplicates: true,
      });
      
      success += result.count;
      processed += batch.length;
      
      await progressTracker.update(job.id as string, { processed, success });
      await job.updateProgress(Math.round((processed / total) * 100));
      
    } catch (error: any) {
      for (const row of batch) {
        try {
          await prisma.questions.create({
            data: {
              tenant_id: tenantId,
              bank_id: job.data.bankId,
              type: row.type,
              question_text: row.questionText,
              options: row.options,
              correct_answer: normalizeAns(row.correctAnswer || row.correctAnswers),
              marks: Number(row.marks) || 1,
              negative_marks: Number(row.negativeMarks) || 0,
              difficulty: row.difficulty,
              topic: row.topic,
              is_active: true,
            },
          });
          success++;
        } catch (rowError: any) {
          await progressTracker.addError(job.id as string, {
            row: i + batch.indexOf(row) + 1,
            field: rowError.meta?.target?.[0] || 'unknown',
            message: rowError.message,
            value: JSON.stringify(row),
          });
        }
      }
      processed += batch.length;
      await progressTracker.update(job.id as string, { processed, success });
      await job.updateProgress(Math.round((processed / total) * 100));
    }
  }
  
  await progressTracker.complete(job.id as string, success);
  
  await prisma.audit_logs.create({
    data: {
      tenant_id: tenantId,
      user_id: userId,
      action: `Bulk CSV Import Job ${job.id}: Processed ${processed} questions`,
      resource_type: 'question_management',
      metadata: { count: processed, success, jobId: job.id }
    }
  });
}

bulkWorker.on('completed', (job) => {
  console.log(`Job ${job.id} completed successfully`);
});

bulkWorker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed with error:`, err.message);
});

console.log('Bulk worker is running...');
