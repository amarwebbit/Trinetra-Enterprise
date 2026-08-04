import { prisma } from '@/lib/db/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { redirect } from 'next/navigation';
import { LiveMonitoringUI } from './LiveMonitoringUI';

export default async function TeacherLivePage(
  props: {
    searchParams: Promise<{ examId?: string }>
  }
) {
  const searchParams = await props.searchParams;
  const session = await getServerSession(authOptions);

  if (!session || !['teacher', 'admin', 'super_admin'].includes(session.user.role)) {
    redirect('/login');
  }

  const tenantId = session.user.tenantId || (session.user as any).tenant_id;
  const teacherId = session.user.id;

  const activeExams = await prisma.exams.findMany({
    where: {
      tenant_id: tenantId,
      teacher_id: teacherId,
      is_active: true,
      start_time: { lte: new Date() },
      end_time: { gte: new Date() },
    },
    select: { id: true, title: true },
    orderBy: { start_time: 'asc' },
  });

  const selectedExamId = searchParams.examId || (activeExams.length > 0 ? activeExams[0].id : undefined);

  let initialStudents: any[] = [];
  
  if (selectedExamId) {
    const attempts = await prisma.exam_attempts.findMany({
      where: {
        exam_id: selectedExamId,
        status: { in: ['in_progress', 'flagged'] },
      },
      include: {
        users: true,
        exams: { include: { exam_sections: { include: { exam_questions: true } } } },
        answers: true,
        proctoring_logs: { take: 5, orderBy: { created_at: 'desc' } }
      }
    });

    initialStudents = attempts.map(attempt => {
      const totalQuestions = attempt.exams.exam_sections.reduce(
        (acc: number, section: any) => acc + section.exam_questions.length, 0
      );
      const answeredQuestions = attempt.answers.length;
      const violations = attempt.proctoring_logs.filter(
        (log: any) => log.severity === 'high' || log.severity === 'critical'
      ).length;

      return {
        id: attempt.id,
        studentName: attempt.users?.full_name || 'Unknown Student',
        studentEmail: attempt.users?.email,
        examTitle: attempt.exams.title,
        examId: attempt.exams.id,
        startTime: attempt.start_time?.toISOString(),
        status: attempt.status,
        questionsAnswered: answeredQuestions,
        totalQuestions: totalQuestions,
        score: attempt.score ? Number(attempt.score) : 0,
        violations: violations,
        lastActivity: attempt.updated_at?.toISOString(),
        proctoringEvents: attempt.proctoring_logs.map((log: any) => ({
          type: log.event_type,
          severity: log.severity,
          timestamp: log.created_at?.toISOString()
        }))
      };
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Live Monitoring</h1>
        <p className="text-muted-foreground text-sm mt-1">Monitor your active exams in real-time</p>
      </div>
      <LiveMonitoringUI
        examId={selectedExamId}
        userRole="teacher"
        initialStudents={initialStudents}
        availableExams={activeExams}
      />
    </div>
  );
}
