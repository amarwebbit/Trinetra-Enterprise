import { prisma } from '@/lib/db/client';
import { getExamActor } from '@/lib/auth/exam-guest';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const actor = await getExamActor();
  if (!actor) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { attemptId, eventType, severity, violationCount, violationThreshold } = await req.json();

  if (!attemptId || !eventType) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const attempt = await prisma.exam_attempts.findUnique({
    where: { id: attemptId },
  });

  if (!attempt || attempt.student_id !== actor.studentId || (actor.guest && (actor.guest.attemptId !== attemptId || actor.guest.examId !== attempt.exam_id))) {
    return NextResponse.json({ error: 'Attempt not found or unauthorized' }, { status: 404 });
  }

  if (attempt.status !== 'in_progress') {
    return NextResponse.json({
      success: true,
      forceStopped: true,
      status: attempt.status,
      message: 'Exam session is no longer active',
    });
  }

  // Log the violation / heartbeat event safely
  try {
    await prisma.proctoring_logs.create({
      data: {
        tenant_id: actor.tenantId,
        attempt_id: attemptId,
        event_type: eventType,
        severity: severity,
        event_data: {
          timestamp: new Date().toISOString(),
          violationCount: violationCount ?? null,
          violationThreshold: violationThreshold ?? null,
        },
      },
    });
  } catch (logErr) {
    console.warn('Proctoring log insertion warning:', logErr);
  }

  // Always update last activity timestamp on attempt for real-time live monitoring
  try {
    await prisma.exam_attempts.update({
      where: { id: attemptId },
      data: { updated_at: new Date() },
    });
  } catch (updateErr) {
    console.warn('Exam attempt timestamp update warning:', updateErr);
  }

  // ✅ If critical severity, auto-submit the exam
  if (severity === 'critical') {
    await prisma.exam_attempts.update({
      where: { id: attemptId },
      data: {
        status: 'submitted',
        end_time: new Date(),
      },
    });
    
    // Create notification
    await prisma.notifications.create({
      data: {
        tenant_id: actor.tenantId,
        user_id: actor.studentId,
        type: 'exam_auto_submitted',
        title: 'Exam Auto-Submitted',
        content: `Your exam was auto-submitted due to a critical proctoring violation (${eventType}).`,
        channel: 'app',
        is_sent: true,
        sent_at: new Date(),
      },
    });
    
    return NextResponse.json({ 
      success: true, 
      autoSubmitted: true,
      message: 'Exam auto-submitted due to critical violation',
    });
  }

  return NextResponse.json({ success: true });
}
