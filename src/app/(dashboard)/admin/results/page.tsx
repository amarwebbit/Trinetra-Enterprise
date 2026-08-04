import { prisma } from '@/lib/db/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { redirect } from 'next/navigation';
import ResultsUI from './ResultsUI';
import { serializeData } from '@/lib/utils/serialize';

export const dynamic = 'force-dynamic';

export default async function AdminResultsPage(
  props: {
    searchParams: Promise<{ examId?: string }>
  }
) {
  const searchParams = await props.searchParams;
  const session = await getServerSession(authOptions);

  if (!session || !['admin', 'super_admin'].includes(session.user.role)) {
    redirect('/login');
  }

  const tenantId = session.user.tenantId || (session.user as any).tenant_id;
  if (!tenantId) {
    throw new Error("No tenant ID found in session.");
  }

  const examId = searchParams.examId;
  const now = new Date();

  // Fetch all active, published exams for the dropdown (no end_time restriction)
  const completedExams = await prisma.exams.findMany({
    where: {
      tenant_id: tenantId,
      is_active: true,
      is_published: true,
    },
    select: { id: true, title: true, end_time: true },
    orderBy: { created_at: 'desc' }
  });

  // If no exam selected in URL, use the first completed one
  const selectedExamId = examId || (completedExams.length > 0 ? completedExams[0].id : null);

  let analyticsData = null;

  if (selectedExamId) {
    const exam = await prisma.exams.findUnique({
      where: { id: selectedExamId, tenant_id: tenantId },
      include: {
        exam_attempts: {
          where: { status: { in: ['submitted', 'evaluated', 'graded'] } },
          include: {
            users: {
              include: { departments_users_department_idTodepartments: true }
            }
          },
          orderBy: { percentage: 'desc' }
        }
      }
    });

    if (exam) {
      const attempts = exam.exam_attempts;
      const totalStudents = attempts.length;
      
      const passingPercentage = Number(exam.passing_percentage || 40);
      const passedCount = attempts.filter(a => Number(a.percentage || 0) >= passingPercentage).length;
      
      const avgScore = totalStudents > 0 
        ? attempts.reduce((acc, a) => acc + Number(a.score || 0), 0) / totalStudents 
        : 0;

      // Top 10 Performers
      const topPerformers = attempts.slice(0, 10).map(a => ({
        id: a.id,
        name: a.users?.full_name || a.users?.email || 'Unknown',
        department: a.users?.departments_users_department_idTodepartments?.name || 'N/A',
        score: Number(a.score || 0),
        percentage: Number(a.percentage || 0),
      }));

      // Department-wise breakdown
      const deptMap = new Map<string, { totalScore: number, count: number }>();
      attempts.forEach(a => {
        const deptName = a.users?.departments_users_department_idTodepartments?.name || 'Unassigned';
        const current = deptMap.get(deptName) || { totalScore: 0, count: 0 };
        deptMap.set(deptName, {
          totalScore: current.totalScore + Number(a.score || 0),
          count: current.count + 1
        });
      });

      const departmentBreakdown = Array.from(deptMap.entries()).map(([name, data]) => ({
        name,
        averageScore: Math.round((data.totalScore / data.count) * 10) / 10,
        studentCount: data.count
      }));

      // Score Distribution (Histogram)
      const distribution = [
        { range: '0-20%', count: 0 },
        { range: '21-40%', count: 0 },
        { range: '41-60%', count: 0 },
        { range: '61-80%', count: 0 },
        { range: '81-100%', count: 0 },
      ];

      attempts.forEach(a => {
        const p = Number(a.percentage || 0);
        if (p <= 20) distribution[0].count++;
        else if (p <= 40) distribution[1].count++;
        else if (p <= 60) distribution[2].count++;
        else if (p <= 80) distribution[3].count++;
        else distribution[4].count++;
      });

      analyticsData = {
        passRate: totalStudents > 0 ? Math.round((passedCount / totalStudents) * 100) : 0,
        avgScore: Math.round(avgScore * 10) / 10,
        totalStudents,
        totalMarks: Number(exam.total_marks || 0),
        topPerformers,
        departmentBreakdown,
        distribution,
        isResultsPublished: exam.show_results_immediately || false
      };
    }
  }

  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Results & Analytics
        </h1>
        <p className="text-sm text-muted-foreground">
          Analyze institutional performance, top students, and department metrics.
        </p>
      </div>

      <ResultsUI 
        completedExams={completedExams.map(e => ({ id: e.id, title: e.title }))}
        selectedExamId={selectedExamId}
        analytics={serializeData(analyticsData)}
      />
    </main>
  );
}
