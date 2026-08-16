import { prisma } from './db/client';

export async function evaluateAttempt(attemptId: string, status?: string) {
  // 1. Fetch attempt with ALL data
  const attempt = await prisma.exam_attempts.findUnique({
    where: { id: attemptId },
    include: {
      exams: {
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
      },
      answers: true
    }
  });

  if (!attempt) return null;

  const allExamQuestions = (attempt.exams?.exam_sections || []).flatMap(sec => 
    (sec.exam_questions || []).map(eq => ({
      eqMarks: eq.marks,
      question: eq.questions
    })).filter(item => !!item.question)
  );

  const savedAnswerMap = new Map(attempt.answers.map(a => [a.question_id, a]));

  let totalObtainedMarks = 0;
  let totalPossibleMarks = 0;

  const parseCorrectAnswers = (raw: any): string[] => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw.map(x => String(x).trim().toLowerCase());
    const str = String(raw).trim();
    if (str.startsWith('[') && str.endsWith(']')) {
      try {
        const parsed = JSON.parse(str);
        if (Array.isArray(parsed)) return parsed.map(x => String(x).trim().toLowerCase());
      } catch (e) {}
    }
    return str.split(',').map(a => a.trim().toLowerCase()).filter(Boolean);
  };

  const dbOperations: any[] = [];
  const evaluationsList: Array<{
    questionId: string;
    studentAnswer: string;
    isCorrect: boolean;
    marksObtained: number;
  }> = [];

  // Evaluate EVERY question in memory
  for (const item of allExamQuestions) {
    const question = item.question;
    const rawMarks = item.eqMarks !== null && item.eqMarks !== undefined ? item.eqMarks : question.marks;
    const marks = Number(rawMarks) || 1.0;
    const negativeMarks = Number(question.negative_marks || 0);
    totalPossibleMarks += marks;

    const existingRecord = savedAnswerMap.get(question.id);
    const studentAnswer = (existingRecord?.answer_text || '').trim();

    let isCorrect = false;
    let marksObtained = 0;

    if (!studentAnswer) {
      isCorrect = false;
      marksObtained = 0;
    } else {
      const type = (question.type || '').toLowerCase();
      const rawCorrect = question.correct_answer;

      if (type === 'mcq' || type === 'mcq_single') {
        const correctAnswers = parseCorrectAnswers(rawCorrect);
        const targetCorrect = correctAnswers.length > 0 ? correctAnswers[0] : String(rawCorrect || '').trim().toLowerCase();
        isCorrect = studentAnswer.toLowerCase() === targetCorrect;
        marksObtained = isCorrect ? marks : -negativeMarks;
      } else if (type === 'msq' || type === 'mcq_multiple') {
        const studentAnswers = studentAnswer
          .split(',')
          .map((a: string) => a.trim().toLowerCase())
          .filter((a: string) => a.length > 0)
          .sort();
        const correctAnswers = parseCorrectAnswers(rawCorrect).sort();

        isCorrect = studentAnswers.length === correctAnswers.length &&
                    studentAnswers.every((val: string, index: number) => val === correctAnswers[index]);
        marksObtained = isCorrect ? marks : -negativeMarks;
      } else if (type === 'nat') {
        const studentNum = parseFloat(studentAnswer);
        const correctNum = parseFloat(String(rawCorrect || ''));
        const natNegative = (question as any).negative_marks_enabled ? negativeMarks : 0;

        if (isNaN(studentNum) || isNaN(correctNum)) {
          marksObtained = -natNegative;
          isCorrect = false;
        } else {
          const metadata = (question.metadata as any) || {};
          const qNatTol = (question as any).nat_tolerance;
          
          // STRICT TOLERANCE CHECK (NO HARDCODED 0.01 FALLBACK)
          let tolerance = qNatTol !== undefined && qNatTol !== null && !isNaN(parseFloat(qNatTol))
            ? parseFloat(qNatTol)
            : (metadata.tolerance !== undefined && !isNaN(parseFloat(metadata.tolerance)) ? parseFloat(metadata.tolerance) : null);
          
          if (tolerance === null) {
            // Apply 0.1% relative tolerance or minimum of 0.001
            tolerance = Math.max(0.001, Math.abs(correctNum) * 0.001);
          }

          const difference = Math.abs(studentNum - correctNum);
          isCorrect = difference <= tolerance;
          marksObtained = isCorrect ? marks : -natNegative;
        }
      } else {
        const correctAnswers = parseCorrectAnswers(rawCorrect);
        const targetCorrect = correctAnswers.length > 0 ? correctAnswers[0] : String(rawCorrect || '').trim().toLowerCase();
        isCorrect = studentAnswer.toLowerCase() === targetCorrect;
        marksObtained = isCorrect ? marks : -negativeMarks;
      }
    }

    totalObtainedMarks += marksObtained;

    evaluationsList.push({
      questionId: question.id,
      studentAnswer,
      isCorrect,
      marksObtained,
    });
  }

  // Queue bulk operations for answers
  for (const evalItem of evaluationsList) {
    const existingRecord = savedAnswerMap.get(evalItem.questionId);
    if (existingRecord) {
      dbOperations.push(
        prisma.answers.update({
          where: { id: existingRecord.id },
          data: {
            is_correct: evalItem.isCorrect,
            marks_awarded: evalItem.marksObtained,
            updated_at: new Date(),
          }
        })
      );
    } else if (evalItem.studentAnswer) {
      dbOperations.push(
        prisma.answers.create({
          data: {
            tenant_id: attempt.tenant_id,
            attempt_id: attemptId,
            question_id: evalItem.questionId,
            answer_text: evalItem.studentAnswer,
            is_correct: evalItem.isCorrect,
            marks_awarded: evalItem.marksObtained,
            created_at: new Date(),
            updated_at: new Date(),
          }
        })
      );
    }
  }

  // Update Attempt with scores
  dbOperations.push(
    prisma.exam_attempts.update({
      where: { id: attemptId },
      data: {
        score: totalObtainedMarks,
        total_marks: totalPossibleMarks,
        percentage: totalPossibleMarks > 0 ? (totalObtainedMarks / totalPossibleMarks) * 100 : 0,
        status: status || attempt.status || 'submitted',
        end_time: attempt.end_time || new Date(),
        updated_at: new Date(),
      }
    })
  );

  // Execute all score calculations and updates in a single batch transaction
  if (dbOperations.length > 0) {
    await prisma.$transaction(dbOperations);
  }

  // Calculate and Set Best Attempt
  const allAttempts = await prisma.exam_attempts.findMany({
    where: {
      exam_id: attempt.exam_id,
      student_id: attempt.student_id,
      status: { in: ['submitted', 'auto_submitted', 'force_submitted', 'graded', 'evaluated'] }
    }
  });

  if (allAttempts.length > 0) {
    const bestAttempt = allAttempts.reduce((prev: any, current: any) => {
      const prevPercentage = prev.percentage ? Number(prev.percentage) : 0;
      const currentPercentage = current.percentage ? Number(current.percentage) : 0;
      if (currentPercentage > prevPercentage) return current;
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

  // Reload and return updated attempt
  return prisma.exam_attempts.findUnique({
    where: { id: attemptId },
    include: {
      answers: true,
      exams: true
    }
  });
}
