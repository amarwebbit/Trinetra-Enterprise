import { prisma } from '@/lib/db/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !['student', 'admin', 'super_admin'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const body = await req.json();
  const { examId } = body;
  
  const exam = await prisma.exams.findFirst({
    where: { id: examId, tenant_id: session.user.tenantId || (session.user as any).tenant_id, is_active: true, is_published: true },
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
      student_id: session.user.id,
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
      student_id: session.user.id,
      status: { in: ['submitted', 'auto_submitted', 'force_submitted', 'graded', 'evaluated'] },
    },
  });

  const maxAllowedAttempts = exam.max_attempts || (exam.metadata as any)?.max_attempts || 1;

  if (completedAttemptsCount >= maxAllowedAttempts) {
    return NextResponse.json({ 
      error: `You have reached the maximum allowed attempts (${maxAllowedAttempts}) for this ${exam.exam_type === 'assignment' ? 'assignment' : 'test'}.` 
    }, { status: 403 });
  }
  
  const tenantId = session.user.tenantId || (session.user as any).tenant_id;

  // Create new attempt
  const attempt = await prisma.exam_attempts.create({
    data: {
      tenant_id: tenantId,
      exam_id: examId,
      student_id: session.user.id,
      start_time: new Date(),
      status: 'in_progress',
      attempt_number: completedAttemptsCount + 1,
    },
  });
  
  // Log audit
  await prisma.audit_logs.create({
    data: {
      tenant_id: session.user.tenantId || (session.user as any).tenant_id,
      user_id: session.user.id,
      action: 'EXAM_STARTED',
      resource_type: 'exam_attempt',
      resource_id: attempt.id,
    },
  });
  
  return NextResponse.json({ attemptId: attempt.id });
}
