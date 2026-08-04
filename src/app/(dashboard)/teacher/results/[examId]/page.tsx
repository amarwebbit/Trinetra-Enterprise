import { prisma } from '@/lib/db/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { notFound, redirect } from 'next/navigation';
import DetailedResultsUI from './DetailedResultsUI';
import { serializeData } from '@/lib/utils/serialize';

export const dynamic = 'force-dynamic';

export default async function TeacherResultDetailPage(
  props: {
    params: Promise<{ examId: string }>;
  }
) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  if (!session || !['teacher', 'admin', 'super_admin'].includes(session.user.role)) {
    redirect('/login');
  }

  const { examId } = params;
  const tenantId = session.user.tenantId || (session.user as any).tenant_id;
  const teacherId = session.user.id;

  // 1. Fetch Exam with All Sections, Questions and Attempts
  const exam = await prisma.exams.findUnique({
    where: {
      id: examId,
      tenant_id: tenantId,
      ...(session.user.role === 'teacher' ? { teacher_id: teacherId } : {}),
    },
    include: {
      exam_attempts: {
        where: { status: { in: ['submitted', 'evaluated'] } },
        include: {
          users: {
            select: {
              id: true,
              full_name: true,
              roll_number: true,
              departments_users_department_idTodepartments: {
                select: { name: true }
              }
            }
          }
        },
        orderBy: { percentage: 'desc' },
      },
      exam_sections: {
        include: {
          exam_questions: {
            include: {
              questions: true
            }
          }
        }
      }
    }
  });

  if (!exam) {
    notFound();
  }

  // 2. Extract and format stats
  const attempts = exam.exam_attempts || [];
  const totalStudents = attempts.length;
  const passingPercentage = Number(exam.passing_percentage || 40);
  const passedCount = attempts.filter(a => Number(a.percentage || 0) >= passingPercentage).length;
  const passRate = totalStudents > 0 ? Math.round((passedCount / totalStudents) * 100) : 0;

  const totalPercentageSum = attempts.reduce((sum, a) => sum + Number(a.percentage || 0), 0);
  const avgScore = totalStudents > 0 ? Math.round((totalPercentageSum / totalStudents) * 10) / 10 : 0;

  // Median Calculation
  const sortedPercentages = [...attempts].map(a => Number(a.percentage || 0)).sort((a, b) => a - b);
  let medianScore = 0;
  if (totalStudents > 0) {
    const mid = Math.floor(totalStudents / 2);
    medianScore = totalStudents % 2 !== 0 ? sortedPercentages[mid] : (sortedPercentages[mid - 1] + sortedPercentages[mid]) / 2;
  }
  medianScore = Math.round(medianScore * 10) / 10;

  // Top Performer
  const topPerformer = attempts[0] ? {
    name: attempts[0].users?.full_name || 'N/A',
    rollNo: attempts[0].users?.roll_number || 'N/A',
    percentage: Number(attempts[0].percentage || 0)
  } : null;

  // 3. Score Distribution Histogram
  const ranges = [
    { range: '0-20%', min: 0, max: 20, count: 0 },
    { range: '21-40%', min: 20.01, max: 40, count: 0 },
    { range: '41-60%', min: 40.01, max: 60, count: 0 },
    { range: '61-80%', min: 60.01, max: 80, count: 0 },
    { range: '81-100%', min: 80.01, max: 100, count: 0 },
  ];

  attempts.forEach(a => {
    const pct = Number(a.percentage || 0);
    for (const r of ranges) {
      if (pct >= r.min && pct <= r.max) {
        r.count++;
        break;
      }
    }
  });
  const histogramData = ranges.map(r => ({ range: r.range, count: r.count }));

  // 4. Student Results Table Mapping (Group by student to handle multiple attempts)
  const studentMap = new Map<string, any>();
  
  attempts.forEach(a => {
    const studentId = a.users?.id || 'unknown';
    if (!studentMap.has(studentId)) {
      studentMap.set(studentId, {
        userId: studentId,
        name: a.users?.full_name || 'N/A',
        rollNo: a.users?.roll_number || 'N/A',
        department: a.users?.departments_users_department_idTodepartments?.name || 'N/A',
        bestAttempt: a,
        allAttempts: [a],
      });
    } else {
      const existing = studentMap.get(studentId);
      existing.allAttempts.push(a);
      if (a.is_best_attempt) {
        existing.bestAttempt = a;
      }
    }
  });

  const studentResults = Array.from(studentMap.values()).map((s, index) => {
    const a = s.bestAttempt;
    return {
      rank: index + 1,
      userId: s.userId,
      name: s.name,
      rollNo: s.rollNo,
      department: s.department,
      score: Number(a.score || 0),
      maxScore: Number(a.total_marks || exam.total_marks || 100),
      percentage: Number(a.percentage || 0),
      status: Number(a.percentage || 0) >= passingPercentage ? 'passed' as const : 'failed' as const,
      attemptsCount: s.allAttempts.length,
      attempts: s.allAttempts.map((att: any) => ({
        id: att.id,
        attemptNumber: att.attempt_number || 1,
        isBestAttempt: att.is_best_attempt || false,
        score: Number(att.score || 0),
        percentage: Number(att.percentage || 0),
        startTime: att.start_time,
        endTime: att.end_time,
      })),
    };
  });
  
  // Re-sort and rank based on best attempt percentage
  studentResults.sort((a, b) => b.percentage - a.percentage);
  studentResults.forEach((s, idx) => s.rank = idx + 1);

  // 5. Question Difficulty Analysis Calculation
  const attemptIds = attempts.map(a => a.id);
  const answers = attemptIds.length > 0 ? await prisma.answers.findMany({
    where: {
      attempt_id: { in: attemptIds },
    }
  }) : [];

  const examQuestionsList: any[] = [];
  let currentQNo = 1;
  exam.exam_sections.forEach(sec => {
    sec.exam_questions.forEach(eq => {
      if (eq.questions) {
        examQuestionsList.push({
          id: eq.questions.id,
          qNo: currentQNo++,
          type: eq.questions.type,
          statement: eq.questions.question_text,
          maxScore: Number(eq.questions.marks || 1),
          negativeMarks: Number(eq.questions.negative_marks || 0),
        });
      }
    });
  });

  const questionStats: Record<string, { qNo: number; type: string; statement: string; totalScore: number; maxScore: number; negativeMarks: number; count: number; correctCount: number }> = {};
  examQuestionsList.forEach(q => {
    questionStats[q.id] = {
      qNo: q.qNo,
      type: q.type,
      statement: q.statement,
      totalScore: 0,
      maxScore: q.maxScore,
      negativeMarks: q.negativeMarks,
      count: 0,
      correctCount: 0,
    };
  });

  answers.forEach(ans => {
    const qStat = questionStats[ans.question_id];
    if (qStat) {
      qStat.count++;
      qStat.totalScore += Number(ans.marks_awarded || 0);
      if (ans.is_correct) {
        qStat.correctCount++;
      }
    }
  });

  const questionAnalysis = examQuestionsList.map(q => {
    const stat = questionStats[q.id];
    const correctPct = stat.count > 0 ? Math.round((stat.correctCount / stat.count) * 100) : 0;
    const avgScore = stat.count > 0 ? Math.round((stat.totalScore / stat.count) * 10) / 10 : 0;
    return {
      qNo: stat.qNo,
      type: stat.type,
      statement: stat.statement,
      avgScore,
      maxScore: stat.maxScore,
      negativeMarks: stat.negativeMarks,
      correctPct,
    };
  });

  const uiExam = {
    id: exam.id,
    title: exam.title,
    pattern: exam.pattern,
  };

  const uiStats = {
    totalStudents,
    passRate,
    avgScore,
    medianScore,
    topPerformer,
  };

  return (
    <DetailedResultsUI
      exam={serializeData(uiExam)}
      stats={serializeData(uiStats)}
      histogramData={serializeData(histogramData)}
      questionAnalysis={serializeData(questionAnalysis)}
      studentResults={serializeData(studentResults)}
    />
  );
}
