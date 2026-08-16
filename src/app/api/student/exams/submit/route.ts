import { NextRequest, NextResponse } from 'next/server';
import { getExamActor } from '@/lib/auth/exam-guest';
import { prisma } from '@/lib/db/client';
import { revalidatePath } from 'next/cache';
import { evaluateAttempt } from '@/lib/evaluation';
import { timeService } from '@/lib/services/time.service';

async function withRetry<T>(fn: () => Promise<T>, retries = 3, delayMs = 200): Promise<T> {
  let lastError: any;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      if (i < retries - 1) {
        await new Promise((res) => setTimeout(res, delayMs * Math.pow(2, i) + Math.random() * 150));
      }
    }
  }
  throw lastError;
}

import { withExamRateLimit } from '@/lib/redis/with-rate-limit';

async function submitHandler(req: NextRequest) {
  try {
    const actor = await getExamActor();
    if (!actor) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { attemptId, auto, answers } = await req.json();

    if (!attemptId) {
      return NextResponse.json({ error: 'Missing attemptId' }, { status: 400 });
    }

    // 1. Validate individual time limit (CRITICAL FIX)
    const timeValidation = await timeService.validateAttemptTime(attemptId);
    if (!timeValidation.valid) {
      return NextResponse.json(
        { error: timeValidation.error || 'Time limit exceeded' },
        { status: 403 }
      );
    }

    const attempt = await withRetry(() =>
      prisma.exam_attempts.findUnique({
        where: { id: attemptId },
        include: {
          exams: true,
          answers: true,
        }
      })
    );

    if (!attempt || attempt.student_id !== actor.studentId) {
      return NextResponse.json({ error: 'Attempt not found or unauthorized' }, { status: 404 });
    }

    if (!attempt.exams.is_active || new Date() < attempt.exams.start_time) {
      return NextResponse.json({ error: 'Exam is not available for submission' }, { status: 403 });
    }

    if (attempt.status && ['submitted', 'auto_submitted', 'force_submitted', 'evaluated', 'graded'].includes(attempt.status)) {
      return NextResponse.json({ success: true, message: 'Already submitted' });
    }

    // 2. Save any answers passed directly in the submission payload
    if (answers && typeof answers === 'object') {
      const existingAnswers = await prisma.answers.findMany({
        where: { attempt_id: attemptId }
      });
      const existingMap = new Map(existingAnswers.map(a => [a.question_id, a.id]));
      const saveOps = [];

      for (const [qId, ansText] of Object.entries(answers)) {
        if (typeof ansText !== 'string' || !ansText.trim()) continue;
        const existId = existingMap.get(qId);
        if (existId) {
          saveOps.push(
            prisma.answers.update({
              where: { id: existId },
              data: { answer_text: ansText.trim(), updated_at: new Date() }
            })
          );
        } else {
          saveOps.push(
            prisma.answers.create({
              data: {
                tenant_id: actor.tenantId,
                attempt_id: attemptId,
                question_id: qId,
                answer_text: ansText.trim(),
                created_at: new Date(),
                updated_at: new Date(),
              }
            })
          );
        }
      }
      if (saveOps.length > 0) {
        await prisma.$transaction(saveOps);
      }
    }

    // 3. Centralized evaluation execution
    const finalStatus = auto ? 'auto_submitted' : 'submitted';
    const updatedAttempt = await evaluateAttempt(attemptId, finalStatus);
    if (!updatedAttempt) {
      return NextResponse.json({ error: 'Evaluation failed' }, { status: 500 });
    }

    // Log audit safely
    try {
      await prisma.audit_logs.create({
        data: {
          tenant_id: actor.tenantId,
          user_id: actor.studentId,
          action: auto ? 'EXAM_AUTO_SUBMITTED' : 'EXAM_SUBMITTED',
          resource_type: 'exam_attempt',
          resource_id: attempt.id,
        },
      });
    } catch (e) {
      console.warn('Audit log creation failed during submission:', e);
    }

    // Revalidate paths
    try {
      const eId = attempt.exam_id;
      revalidatePath(`/student/results/${eId}`);
      revalidatePath(`/teacher/exams/${eId}/results`);
      revalidatePath(`/teacher/results/${eId}`);
      revalidatePath(`/admin/results/${eId}`);
      revalidatePath('/student/dashboard');
      revalidatePath('/teacher/dashboard');
      revalidatePath('/admin/dashboard');
    } catch (e) {}

    return NextResponse.json({
      success: true,
      data: {
        attemptId: attemptId,
        score: updatedAttempt.score,
        totalMarks: updatedAttempt.total_marks,
        percentage: updatedAttempt.percentage,
        status: updatedAttempt.status,
      },
    });
  } catch (error) {
    console.error('Submission error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to submit' },
      { status: 500 }
    );
  }
}

export const POST = withExamRateLimit(submitHandler);
