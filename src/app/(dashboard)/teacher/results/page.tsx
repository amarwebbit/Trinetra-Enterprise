import { prisma } from '@/lib/db/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { redirect } from 'next/navigation';
import TeacherResultsUI from './TeacherResultsUI';
import { getExamAnalytics } from '@/app/actions/results-actions';
import { serializeData } from '@/lib/utils/serialize';

export const dynamic = 'force-dynamic';

export default async function TeacherResultsPage(
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

  // Fetch all active, published exams for the tenant/teacher (removing end_time < now filter)
  const allTeacherExams = await prisma.exams.findMany({
    where: {
      tenant_id: tenantId,
      ...(session.user.role === 'teacher' ? { teacher_id: teacherId } : {}),
      is_published: true,
      is_active: true,
    },
    select: {
      id: true,
      title: true,
      end_time: true,
      start_time: true,
      total_marks: true,
      exam_type: true,
      show_results_immediately: true,
      _count: {
        select: {
          exam_attempts: {
            where: { status: { in: ['submitted', 'auto_submitted', 'force_submitted', 'evaluated', 'graded'] } }
          }
        }
      }
    },
    orderBy: { created_at: 'desc' },
  });

  const completedExams = allTeacherExams.filter(e => e.exam_type !== 'assignment');
  const assignmentExams = allTeacherExams.filter(e => e.exam_type === 'assignment');

  // Auto-select the most relevant exam if no examId searchParam is provided
  let selectedExamId = searchParams.examId;
  if (!selectedExamId) {
    // 1. Prefer the most recent exam that has submitted attempts
    const examWithSubmissions = allTeacherExams.find(e => e._count.exam_attempts > 0);
    if (examWithSubmissions) {
      selectedExamId = examWithSubmissions.id;
    } else if (allTeacherExams.length > 0) {
      // 2. Otherwise default to the latest exam
      selectedExamId = allTeacherExams[0].id;
    }
  }

  let analytics = null;
  if (selectedExamId) {
    try {
      analytics = await getExamAnalytics(selectedExamId, tenantId);
    } catch (e) {
      console.error("Failed to load analytics", e);
    }
  }

  return (
    <main className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Exam Results
        </h1>
        <p className="text-sm text-muted-foreground">
          View analytics, leaderboards, and publish scores for completed exams.
        </p>
      </div>

      <TeacherResultsUI
        completedExams={serializeData(completedExams)}
        assignmentExams={serializeData(assignmentExams)}
        selectedExamId={selectedExamId}
        analytics={serializeData(analytics)}
      />
    </main>
  );
}
