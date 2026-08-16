import { prisma } from '@/lib/db/client';
import { getExamActor } from '@/lib/auth/exam-guest';
import { notFound, redirect } from 'next/navigation';
import { ResultDetailUI } from './ResultDetailUI';
import { serializeData } from '@/lib/utils/serialize';

export default async function StudentResultDetailPage(
  props: {
    params: Promise<{ examId: string }>;
  }
) {
  const params = await props.params;
  const actor = await getExamActor();

  if (!actor) {
    redirect('/login');
  }

  const { examId } = params;
  const studentId = actor.studentId;
  const tenantId = actor.tenantId;

  // Fetch attempt with ALL data
  const attempt = await prisma.exam_attempts.findFirst({
    where: {
      exam_id: examId,
      student_id: studentId,
      status: { in: ['submitted', 'auto_submitted', 'force_submitted', 'evaluated', 'graded'] },
    },
    include: {
      exams: {
        include: {
          exam_sections: {
            include: {
              exam_questions: {
                include: {
                  questions: true,
                },
              },
            },
          },
        },
      },
      answers: {
        include: {
          questions: true,
        },
      },
    },
  });

  if (!attempt) {
    notFound();
  }

  // Self-heal: If the attempt was submitted but not evaluated, evaluate it now!
  if (attempt.score === null || attempt.percentage === null || attempt.answers.some(a => a.is_correct === null)) {
    const { evaluateAttempt } = await import('@/lib/evaluation');
    await evaluateAttempt(attempt.id);
    redirect(`/student/results/${examId}`);
  }

  if (attempt.exams) {
    (attempt.exams as any).sections = (attempt.exams as any).exam_sections.map((sec: any) => ({
      ...sec,
      exam_questions: (sec.exam_questions || []).map((eq: any) => ({
        ...eq,
        question: eq.questions
      }))
    }));
  }

  if (attempt.answers) {
    (attempt as any).answers = attempt.answers.map((ans: any) => ({
      ...ans,
      question: ans.questions
    }));
  }

  // Check if results are published
  if (!attempt.exams.show_results_immediately && attempt.status === 'submitted') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-500 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
            ⏳
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-2">Results Pending</h2>
          <p className="text-slate-600 dark:text-slate-400">
            Your exam has been submitted. Results will be available once the teacher publishes them.
          </p>
        </div>
      </div>
    );
  }

  // Fetch student details from DB
  const student = await prisma.users.findUnique({
    where: { id: studentId },
    select: {
      full_name: true,
      roll_number: true,
    },
  });

  // FETCH REAL DATA - Tenant branding for white-label
  const tenant = await prisma.tenants.findUnique({
    where: { id: tenantId },
    select: {
      name: true,
      logo_url: true,
      primary_color: true,
    },
  });

  // CALCULATE REAL SCORES - Section-wise breakdown
  const sectionScores = (attempt.exams as any).sections.map((section: any) => {
    const sectionQuestions = section.exam_questions || [];
    const sectionAnswers = attempt.answers.filter((a: any) =>
      sectionQuestions.some((eq: any) => eq.question_id === a.question_id)
    );
    
    const scored = sectionAnswers.reduce((sum: number, a: any) => sum + (Number(a.marks_awarded) || 0), 0);
    const total = sectionQuestions.reduce((sum: number, eq: any) => {
      const q = eq.questions || eq.question;
      const rawMarks = eq.marks !== null && eq.marks !== undefined ? eq.marks : q?.marks;
      const marks = Number(rawMarks) || 1.0;
      return sum + marks;
    }, 0);
    
    return {
      name: section.name,
      scored,
      total,
      percentage: total > 0 ? Math.round((scored / total) * 100) : 0,
    };
  });

  // CALCULATE REAL STATS
  const totalQuestions = (attempt.exams as any).sections.reduce(
    (sum: number, s: any) => sum + s.exam_questions.length,
    0
  );

  const correct = attempt.answers.filter((a: any) => a.is_correct === true && a.answer_text && a.answer_text.trim() !== '').length;
  const wrong = attempt.answers.filter((a: any) => a.is_correct === false && a.answer_text && a.answer_text.trim() !== '').length;
  const unattempted = totalQuestions - (correct + wrong);

  // 7-DAY AUTO PURGE RULE FOR DETAILED QUESTION ANALYSIS
  const attemptEndTime = attempt.end_time ? new Date(attempt.end_time).getTime() : Date.now();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const isPurged = (Date.now() - attemptEndTime) > sevenDaysMs;

  const detailedQuestions = (attempt.exams as any).sections.flatMap((sec: any) =>
    (sec.exam_questions || []).map((eq: any) => {
      const q = eq.question || eq.questions;
      const studentAnsObj = attempt.answers.find((a: any) => a.question_id === q.id);
      const studentAnswer = studentAnsObj?.answer_text || '';
      const isCorrect = studentAnsObj?.is_correct;
      const marksAwarded = studentAnsObj?.marks_awarded ?? 0;

      let status = 'unattempted';
      if (studentAnswer && studentAnswer.trim() !== '') {
        status = isCorrect ? 'correct' : 'incorrect';
      }

      return {
        id: q.id,
        sectionName: sec.name,
        questionText: q.question_text,
        type: q.type,
        options: q.options,
        correctAnswer: q.correct_answer,
        explanation: q.explanation || (q.metadata as any)?.explanation || null,
        marks: q.marks || 1,
        negativeMarks: q.negative_marks || 0,
        studentAnswer,
        isCorrect,
        marksAwarded,
        status,
      };
    })
  );

  // PASS/FAIL based on REAL passing percentage
  const rawPassingPercentage = attempt.exams.passing_percentage ? Number(attempt.exams.passing_percentage) : 40;
  const rawPercentage = attempt.percentage ? Number(attempt.percentage) : 0;
  const passed = rawPercentage >= rawPassingPercentage;

  const serializedAttempt = serializeData(attempt);
  const serializedTenant = serializeData(tenant);
  const serializedSectionScores = serializeData(sectionScores);
  const serializedDetailedQuestions = serializeData(detailedQuestions);

  return (
    <ResultDetailUI
      attempt={serializedAttempt}
      tenant={serializedTenant}
      sectionScores={serializedSectionScores}
      stats={{ correct, wrong, unattempted, totalQuestions }}
      passed={passed}
      passingPercentage={rawPassingPercentage}
      studentName={student?.full_name || 'Student'}
      rollNumber={student?.roll_number || 'N/A'}
      isPurged={isPurged}
      detailedQuestions={serializedDetailedQuestions}
    />
  );
}

