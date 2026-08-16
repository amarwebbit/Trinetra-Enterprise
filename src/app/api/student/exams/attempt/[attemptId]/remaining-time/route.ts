import { NextRequest, NextResponse } from 'next/server';
import { getExamActor } from '@/lib/auth/exam-guest';
import { timeService } from '@/lib/services/time.service';
import { prisma } from '@/lib/db/client';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  try {
    const actor = await getExamActor();
    if (!actor) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { attemptId } = await params;

    // Verify student owns this attempt
    const attempt = await prisma.exam_attempts.findUnique({
      where: { id: attemptId },
      select: { student_id: true },
    });

    if (!attempt || attempt.student_id !== actor.studentId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const result = await timeService.validateAttemptTime(attemptId);

    return NextResponse.json({
      success: true,
      remainingSeconds: result.remainingSeconds,
      elapsedSeconds: result.elapsedSeconds,
      totalSeconds: result.totalSeconds,
      isValid: result.valid,
      error: result.error,
    });

  } catch (error) {
    console.error('Remaining time error:', error);
    return NextResponse.json(
      { error: 'Failed to get remaining time' },
      { status: 500 }
    );
  }
}
