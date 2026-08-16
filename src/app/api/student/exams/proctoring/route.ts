import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db/client';
import { proctoringService } from '@/lib/proctoring/proctoring.service';
import { withExamRateLimit } from '@/lib/redis/with-rate-limit';

async function proctoringHandler(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { attemptId, eventType, questionNumber, metadata, clientTimestamp } = await request.json();

    if (!attemptId || !eventType) {
      return NextResponse.json(
        { error: 'Missing required fields: attemptId, eventType' },
        { status: 400 }
      );
    }

    // Verify student owns this attempt
    const attempt = await prisma.exam_attempts.findUnique({
      where: { id: attemptId },
      select: { student_id: true, status: true },
    });

    if (!attempt) {
      return NextResponse.json({ error: 'Attempt not found' }, { status: 404 });
    }

    if (attempt.student_id !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Server-side violation recording - THIS IS THE SOURCE OF TRUTH
    const result = await proctoringService.recordViolation({
      attemptId,
      eventType,
      questionNumber,
      metadata,
      clientTimestamp,
    });

    return NextResponse.json({
      success: true,
      violationCount: result.newCount,
      threshold: result.threshold,
      shouldSubmit: result.shouldSubmit,
      message: result.shouldSubmit 
        ? 'Violation threshold reached. Exam will be auto-submitted.' 
        : `Violation ${result.newCount} of ${result.threshold} recorded.`,
    });

  } catch (error) {
    console.error('Proctoring error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to record violation' },
      { status: 500 }
    );
  }
}

export const POST = withExamRateLimit(proctoringHandler);
