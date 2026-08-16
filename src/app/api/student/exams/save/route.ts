import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db/client';
import { timeService } from '@/lib/services/time.service';
import { withExamRateLimit } from '@/lib/redis/with-rate-limit';
import { withErrorHandler } from '@/lib/error-handler';

async function saveHandler(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { attemptId, answers, questionId, answerText, markedForReview, timeSpent, clientUpdatedAt } = body;

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

    // 2. Verify student owns this attempt
    const attempt = await prisma.exam_attempts.findUnique({
      where: { id: attemptId },
      select: { student_id: true, status: true, tenant_id: true },
    });

    if (!attempt || attempt.student_id !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (attempt.status !== 'in_progress') {
      return NextResponse.json(
        { error: 'This attempt is already submitted' },
        { status: 403 }
      );
    }

    // Normalized answers list for upserting
    let answersList: Array<{
      questionId: string;
      answerText: string | null;
      markedForReview?: boolean;
      timeSpent?: number;
      clientUpdatedAt?: string;
    }> = [];

    if (Array.isArray(answers)) {
      answersList = answers.map((ans: any) => ({
        questionId: ans.questionId,
        answerText: ans.selectedOption !== undefined ? ans.selectedOption : (ans.answerText || ''),
        markedForReview: ans.markedForReview || false,
        timeSpent: ans.timeSpent || 0,
        clientUpdatedAt: ans.clientUpdatedAt || clientUpdatedAt,
      }));
    } else if (questionId) {
      answersList = [{
        questionId,
        answerText: answerText || '',
        markedForReview: markedForReview || false,
        timeSpent: timeSpent || 0,
        clientUpdatedAt: clientUpdatedAt,
      }];
    } else {
      return NextResponse.json({ error: 'No answers payload provided' }, { status: 400 });
    }

    // 3. Process each answer with timestamp validation
    const results = [];

    for (const ans of answersList) {
      const existingAnswer = await prisma.answers.findFirst({
        where: {
          attempt_id: attemptId,
          question_id: ans.questionId,
        },
        select: {
          id: true,
          updated_at: true,
        },
      });

      // If updating, check timestamp to prevent stale overwrites
      if (existingAnswer && ans.clientUpdatedAt) {
        const clientTime = new Date(ans.clientUpdatedAt).getTime();
        const serverTime = new Date(existingAnswer.updated_at || 0).getTime();

        if (clientTime < serverTime) {
          results.push({
            questionId: ans.questionId,
            status: 'conflict',
            message: 'A newer version of this answer exists',
          });
          continue;
        }
      }

      const meta = {
        marked_for_review: ans.markedForReview || false,
        time_spent: ans.timeSpent || 0,
      };

      if (existingAnswer) {
        const result = await prisma.answers.update({
          where: { id: existingAnswer.id },
          data: {
            answer_text: ans.answerText,
            metadata: meta,
            updated_at: new Date(),
          },
        });
        results.push({
          questionId: ans.questionId,
          status: 'success',
          id: result.id,
        });
      } else {
        const result = await prisma.answers.create({
          data: {
            tenant_id: attempt.tenant_id,
            attempt_id: attemptId,
            question_id: ans.questionId,
            answer_text: ans.answerText,
            metadata: meta,
            created_at: new Date(),
            updated_at: new Date(),
          },
        });
        results.push({
          questionId: ans.questionId,
          status: 'success',
          id: result.id,
        });
      }
    }

    return NextResponse.json({
      success: true,
      results,
      remainingSeconds: timeValidation.remainingSeconds,
    });

  } catch (error) {
    console.error('Save error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save answers' },
      { status: 500 }
    );
  }
}

export const POST = withErrorHandler(withExamRateLimit(saveHandler));
