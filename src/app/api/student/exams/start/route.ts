import { prisma } from '@/lib/db/client';
import { getExamActor } from '@/lib/auth/exam-guest';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const actor = await getExamActor();
  if (!actor) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const body = await req.json();
  const { examId } = body;
  
  const exam = await prisma.exams.findFirst({
    where: { id: examId, tenant_id: actor.tenantId, is_active: true, is_published: true },
    select: { id: true, exam_type: true, max_attempts: true, start_time: true, end_time: true, metadata: true },
  });
  if (!exam) return NextResponse.json({ error: 'Exam is unavailable' }, { status: 404 });
  const now = new Date();
  if (now < exam.start_time || now >= exam.end_time) {
    return NextResponse.json({ error: 'Exam is outside its allowed window' }, { status: 403 });
  }

  // Resume only an active attempt. Submitted attempts must never be reopened.
  const existing = await prisma.exam_attempts.findFirst({
    where: {
      exam_id: examId,
      student_id: actor.studentId,
      status: 'in_progress',
    },
  });
  
  if (existing) {
    return NextResponse.json({ attemptId: existing.id });
  }

  // Count completed attempts for this exam/assignment
  const completedAttemptsCount = await prisma.exam_attempts.count({
    where: {
      exam_id: examId,
      student_id: actor.studentId,
      status: { in: ['submitted', 'auto_submitted', 'force_submitted', 'graded', 'evaluated'] },
    },
  });

  const maxAllowedAttempts = exam.max_attempts || (exam.metadata as any)?.max_attempts || 1;

  if (completedAttemptsCount >= maxAllowedAttempts) {
    return NextResponse.json({ 
      error: `You have reached the maximum allowed attempts (${maxAllowedAttempts}) for this ${exam.exam_type === 'assignment' ? 'assignment' : 'test'}.` 
    }, { status: 403 });
  }
  
  // Create new attempt
  const attempt = await prisma.exam_attempts.create({
    data: {
      tenant_id: actor.tenantId,
      exam_id: examId,
      student_id: actor.studentId,
      start_time: new Date(),
      status: 'in_progress',
      attempt_number: completedAttemptsCount + 1,
    },
  });
  
  // Log audit
  try {
    await prisma.audit_logs.create({
      data: {
        tenant_id: actor.tenantId,
        user_id: actor.studentId,
        action: 'EXAM_STARTED',
        resource_type: 'exam_attempt',
        resource_id: attempt.id,
      },
    });
  } catch (e) {
    console.warn('Audit log creation failed during exam start:', e);
  }
  
  return NextResponse.json({ attemptId: attempt.id });
}
