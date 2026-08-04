import { prisma } from '@/lib/db/client';
import { getExamActor } from '@/lib/auth/exam-guest';
import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

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

export async function POST(req: Request) {
  const actor = await getExamActor();
  if (!actor) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { attemptId, auto, answers } = await req.json();

  if (!attemptId) {
    return NextResponse.json({ error: 'Missing attemptId' }, { status: 400 });
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

  if (!attempt || attempt.student_id !== actor.studentId || (actor.guest && (actor.guest.attemptId !== attemptId || actor.guest.examId !== attempt.exam_id))) {
    return NextResponse.json({ error: 'Attempt not found or unauthorized' }, { status: 404 });
  }

  if (!attempt.exams.is_active || new Date() < attempt.exams.start_time) {
    return NextResponse.json({ error: 'Exam is not available for submission' }, { status: 403 });
  }

  if (attempt.status === 'submitted' || attempt.status === 'evaluated') {
    return NextResponse.json({ success: true, message: 'Already submitted' });
  }

  // 1. Save any answers passed directly in the submission payload
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
            }
          })
        );
      }
    }
    if (saveOps.length > 0) {
      await prisma.$transaction(saveOps);
    }
  }

  // 2. Fetch all sections & questions in this exam for complete evaluation
  const examWithSections = await prisma.exams.findUnique({
    where: { id: attempt.exam_id },
    include: {
      exam_sections: {
        include: {
          exam_questions: {
            include: { questions: true },
            orderBy: { order_index: 'asc' }
          }
        },
        orderBy: { order_index: 'asc' }
      }
    }
  });

  const allExamQuestions = (examWithSections?.exam_sections || []).flatMap(sec => 
    (sec.exam_questions || []).map(eq => eq.questions).filter(Boolean)
  );

  // 3. Fetch updated saved answers from DB
  const savedAnswers = await prisma.answers.findMany({
    where: { attempt_id: attemptId }
  });
  const savedAnswerMap = new Map(savedAnswers.map(a => [a.question_id, a]));

  let totalObtainedMarks = 0;
  let totalPossibleMarks = 0;
  const questionResults = [];

  // Evaluate EVERY question in the exam
  for (const question of allExamQuestions) {
    const marks = Number(question.marks || 1);
    const negativeMarks = Number(question.negative_marks || 0);
    totalPossibleMarks += marks;

    const existingRecord = savedAnswerMap.get(question.id);
    const studentAnswer = (existingRecord?.answer_text || (answers as any)?.[question.id] || '').trim();

    let isCorrect = false;
    let marksObtained = 0;

    if (!studentAnswer) {
      isCorrect = false;
      marksObtained = 0;
    } else {
      const type = (question.type || '').toLowerCase();
      const correctAnswer = (question.correct_answer || '').trim();

      if (type === 'mcq' || type === 'mcq_single') {
        isCorrect = studentAnswer.toLowerCase() === correctAnswer.toLowerCase();
        marksObtained = isCorrect ? marks : -negativeMarks;
      } else if (type === 'msq' || type === 'mcq_multiple') {
        const studentAnswers = studentAnswer
          .split(',')
          .map((a: string) => a.trim().toLowerCase())
          .filter((a: string) => a.length > 0)
          .sort();
        const correctAnswers = correctAnswer
          .split(',')
          .map((a: string) => a.trim().toLowerCase())
          .filter((a: string) => a.length > 0)
          .sort();

        isCorrect = studentAnswers.length === correctAnswers.length &&
                    studentAnswers.every((val: string, index: number) => val === correctAnswers[index]);
        marksObtained = isCorrect ? marks : -negativeMarks;
      } else if (type === 'nat') {
        const studentNum = parseFloat(studentAnswer);
        const correctNum = parseFloat(correctAnswer);
        if (isNaN(studentNum) || isNaN(correctNum)) {
          marksObtained = -negativeMarks;
          isCorrect = false;
        } else {
          const metadata = (question.metadata as any) || {};
          const tolerance = metadata.tolerance !== undefined ? parseFloat(metadata.tolerance) : 0.01;
          const difference = Math.abs(studentNum - correctNum);
          isCorrect = difference <= tolerance;
          marksObtained = isCorrect ? marks : -negativeMarks;
        }
      } else {
        isCorrect = studentAnswer.toLowerCase() === correctAnswer.toLowerCase();
        marksObtained = isCorrect ? marks : -negativeMarks;
      }
    }

    totalObtainedMarks += marksObtained;

    // Update or create answer record in DB
    if (existingRecord) {
      await prisma.answers.update({
        where: { id: existingRecord.id },
        data: {
          answer_text: studentAnswer,
          is_correct: isCorrect,
          marks_awarded: marksObtained,
        }
      });
    } else if (studentAnswer) {
      await prisma.answers.create({
        data: {
          tenant_id: actor.tenantId,
          attempt_id: attemptId,
          question_id: question.id,
          answer_text: studentAnswer,
          is_correct: isCorrect,
          marks_awarded: marksObtained,
        }
      });
    }

    questionResults.push({
      questionId: question.id,
      isCorrect,
      marksAwarded: marksObtained,
      correctAnswer: question.correct_answer,
    });
  }

  // 4. Fix Final Score Calculation (update)
  const percentage = totalPossibleMarks > 0 
    ? (totalObtainedMarks / totalPossibleMarks) * 100 
    : 0;

  await prisma.exam_attempts.update({
    where: { id: attemptId },
    data: {
      score: totalObtainedMarks,
      total_marks: totalPossibleMarks,
      percentage: percentage,
      status: 'submitted',
      end_time: new Date(),
    },
  });

  // Calculate Best Attempt
  const allAttempts = await prisma.exam_attempts.findMany({
    where: {
      exam_id: attempt.exam_id,
      student_id: actor.studentId,
      status: { in: ['submitted', 'graded', 'evaluated'] }
    }
  });

  if (allAttempts.length > 0) {
    const bestAttempt = allAttempts.reduce((prev: any, current: any) => {
      const prevPercentage = prev.percentage ? Number(prev.percentage) : 0;
      const currentPercentage = current.percentage ? Number(current.percentage) : 0;
      if (currentPercentage > prevPercentage) return current;
      // Break ties with most recent attempt (highest attempt number)
      if (currentPercentage === prevPercentage && (current.attempt_number || 1) > (prev.attempt_number || 1)) return current;
      return prev;
    });

    await prisma.$transaction(
      allAttempts.map((a: any) => 
        prisma.exam_attempts.update({
          where: { id: a.id },
          data: { is_best_attempt: a.id === bestAttempt.id }
        })
      )
    );
  }

  // Log audit
  await prisma.audit_logs.create({
    data: {
      tenant_id: actor.tenantId,
      user_id: actor.studentId,
      action: auto ? 'EXAM_AUTO_SUBMITTED' : 'EXAM_SUBMITTED',
      resource_type: 'exam_attempt',
      resource_id: attempt.id,
    },
  });

  // Revalidate result paths immediately for Admin, Teacher, and Student portals
  try {
    const eId = attempt.exam_id;
    revalidatePath(`/student/results/${eId}`);
    revalidatePath(`/teacher/exams/${eId}/results`);
    revalidatePath(`/teacher/results/${eId}`);
    revalidatePath(`/admin/results/${eId}`);
    revalidatePath('/student/dashboard');
    revalidatePath('/teacher/dashboard');
    revalidatePath('/admin/dashboard');
  } catch (e) {
    // Ignore revalidation errors in non-SSG context
  }

  // 5. Update API Response
  return NextResponse.json({
    success: true,
    data: {
      attemptId: attemptId,
      score: totalObtainedMarks,
      totalMarks: totalPossibleMarks,
      percentage: percentage,
      status: 'submitted',
      questionResults: questionResults,
    },
  });
}
