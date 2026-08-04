import { prisma } from '@/lib/db/client';
import { getExamActor } from '@/lib/auth/exam-guest';
import { NextResponse } from 'next/server';

async function withRetry<T>(fn: () => Promise<T>, retries = 3, delayMs = 150): Promise<T> {
  let lastError: any;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      if (i < retries - 1) {
        await new Promise((res) => setTimeout(res, delayMs * Math.pow(2, i) + Math.random() * 100));
      }
    }
  }
  throw lastError;
}

export async function POST(req: Request) {
  const actor = await getExamActor();
  if (!actor) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const tenantId = actor.tenantId;
  const { attemptId, answers, markedForReview, questionId, answerText } = await req.json();

  if (!attemptId) {
    return NextResponse.json({ error: 'Missing attemptId' }, { status: 400 });
  }

  // Verify attempt belongs to student with retry
  const attempt = await withRetry(() =>
    prisma.exam_attempts.findUnique({
      where: { id: attemptId },
      include: { exams: { select: { start_time: true, end_time: true, is_active: true } } },
    })
  );

  if (!attempt || attempt.student_id !== actor.studentId || (actor.guest && (actor.guest.attemptId !== attemptId || actor.guest.examId !== attempt.exam_id))) {
    return NextResponse.json({ error: 'Attempt not found or unauthorized' }, { status: 404 });
  }
  const now = new Date();
  if (attempt.status !== 'in_progress' || !attempt.exams.is_active || now < attempt.exams.start_time || now >= attempt.exams.end_time) {
    return NextResponse.json({ error: 'This exam attempt is no longer editable' }, { status: 409 });
  }

  // Handle single answer save
  if (questionId && answerText !== undefined) {
    const permittedQuestion = await withRetry(() =>
      prisma.exam_questions.findFirst({
        where: { question_id: questionId, exam_sections: { exam_id: attempt.exam_id } },
        select: { question_id: true },
      })
    );
    if (!permittedQuestion) return NextResponse.json({ error: 'Question is not part of this exam' }, { status: 400 });
    try {
      await withRetry(async () => {
        const existing = await prisma.answers.findFirst({
          where: {
            attempt_id: attemptId,
            question_id: questionId,
          }
        });
        
        if (existing) {
          await prisma.answers.update({
            where: { id: existing.id },
            data: {
              answer_text: answerText,
              updated_at: new Date(),
            }
          });
        } else {
          await prisma.answers.create({
            data: {
              attempt_id: attemptId,
              question_id: questionId,
              answer_text: answerText,
              tenant_id: tenantId,
            }
          });
        }
      });
      return NextResponse.json({ success: true, savedAt: new Date().toISOString() });
    } catch (error) {
      console.error('Single save error:', error);
      return NextResponse.json({ error: 'Failed to save answer' }, { status: 500 });
    }
  }

  // Bulk save answers
  const existingAnswers = await withRetry(() =>
    prisma.answers.findMany({
      where: { attempt_id: attemptId }
    })
  );
  
  const existingAnswerMap = new Map(existingAnswers.map(a => [a.question_id, a.id]));
  const operations: any[] = [];

  if (answers) {
    for (const [qId, aText] of Object.entries(answers)) {
      if (typeof aText !== 'string') continue;
      const existingId = existingAnswerMap.get(qId);
      
      if (existingId) {
        operations.push(
          prisma.answers.update({
            where: { id: existingId },
            data: {
              answer_text: aText,
              updated_at: new Date()
            }
          })
        );
      } else {
        operations.push(
          prisma.answers.create({
            data: {
              tenant_id: tenantId,
              attempt_id: attemptId,
              question_id: qId,
              answer_text: aText,
            }
          })
        );
      }
    }
  }

  if (operations.length > 0) {
    await withRetry(() => prisma.$transaction(operations));
  }

  return NextResponse.json({ success: true, savedAt: new Date().toISOString() });
}
