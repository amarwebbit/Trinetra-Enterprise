'use server';

import { prisma } from '@/lib/db/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { revalidatePath } from 'next/cache';

function getTenantId(session: any) {
  return session?.user?.tenantId || session?.user?.tenant_id;
}

export async function forceSubmit(attemptId: string) {
  const session = await getServerSession(authOptions);
  if (!session || !['admin', 'super_admin'].includes(session.user.role)) {
    throw new Error('Unauthorized');
  }

  const tenantId = getTenantId(session);

  // Verify the attempt belongs to this tenant
  const attempt = await prisma.exam_attempts.findFirst({
    where: { id: attemptId },
    include: { users: true }
  });

  if (!attempt || attempt.users?.tenant_id !== tenantId) {
    throw new Error('Attempt not found or unauthorized');
  }

  await prisma.exam_attempts.update({
    where: { id: attemptId },
    data: { 
      status: 'submitted',
      end_time: new Date()
    }
  });

  await prisma.audit_logs.create({
    data: {
      tenant_id: tenantId,
      user_id: session.user.id,
      action: 'EXAM_FORCE_SUBMITTED',
      resource_type: 'exam_attempts',
      resource_id: attemptId,
    }
  });

  // Revalidate to instantly update UI if not relying solely on polling
  revalidatePath('/admin/live');
  return { success: true };
}

export async function endExam(examId: string) {
  const session = await getServerSession(authOptions);
  if (!session || !['admin', 'super_admin'].includes(session.user.role)) {
    throw new Error('Unauthorized');
  }

  const tenantId = getTenantId(session);

  const exam = await prisma.exams.update({
    where: { id: examId, tenant_id: tenantId },
    data: { 
      end_time: new Date() // Forces all attempts to expire based on timeframe rules
    }
  });

  await prisma.audit_logs.create({
    data: {
      tenant_id: tenantId,
      user_id: session.user.id,
      action: 'EXAM_FORCE_ENDED',
      resource_type: 'exams',
      resource_id: exam.id,
    }
  });

  revalidatePath('/admin/live');
  return { success: true };
}

export async function sendMessage(examId: string, messageText: string) {
  const session = await getServerSession(authOptions);
  if (!session || !['admin', 'super_admin'].includes(session.user.role)) {
    throw new Error('Unauthorized');
  }

  const tenantId = getTenantId(session);

  // Find all active students for this exam
  const activeAttempts = await prisma.exam_attempts.findMany({
    where: {
      exam_id: examId,
      status: 'in_progress',
      users: { tenant_id: tenantId }
    },
    select: { student_id: true }
  });

  if (activeAttempts.length === 0) {
    return { success: true, count: 0 };
  }

  // Insert a notification for each student
  const notificationsData = activeAttempts
    .filter(a => a.student_id != null)
    .map(a => ({
      tenant_id: tenantId,
      user_id: a.student_id as string,
      title: 'Exam Announcement',
      message: messageText,
      type: 'alert',
      is_read: false
    }));

  if (notificationsData.length > 0) {
    // Assuming `notifications` table accepts these standard fields
    await prisma.notifications.createMany({
      data: notificationsData as any
    });
  }

  await prisma.audit_logs.create({
    data: {
      tenant_id: tenantId,
      user_id: session.user.id,
      action: 'EXAM_ANNOUNCEMENT_SENT',
      resource_type: 'exams',
      resource_id: examId,
      metadata: { message: messageText, recipientCount: notificationsData.length }
    }
  });

  return { success: true, count: notificationsData.length };
}
