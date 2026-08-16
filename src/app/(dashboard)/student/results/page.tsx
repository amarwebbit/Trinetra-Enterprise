import { prisma } from '@/lib/db/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { redirect } from 'next/navigation';
import { ResultsListUI } from './ResultsListUI';
import { serializeData } from '@/lib/utils/serialize';

export default async function StudentResultsPage(
  props: {
    searchParams: Promise<{ filter?: string; page?: string }>
  }
) {
  const searchParams = await props.searchParams;
  const session = await getServerSession(authOptions);

  if (!session || !['student', 'admin', 'super_admin'].includes(session.user.role)) {
    redirect('/login');
  }

  const studentId = session.user.id;
  const tenantId = session.user.tenantId || (session.user as any).tenant_id;
  const page = parseInt(searchParams.page || '1');
  const pageSize = 20;
  const filter = searchParams.filter || 'all';

  // Build where clause - ONLY SHOW COMPLETED EXAMS
  const where: any = {
    student_id: studentId,
    status: { in: ['submitted', 'auto_submitted', 'force_submitted', 'evaluated', 'graded'] },
    OR: [
      { exams: { end_time: { lt: new Date() } } },
      { exams: { show_results_immediately: true } }
    ]
  };

  // Fetch results - REAL data
  const [attempts, total, stats] = await Promise.all([
    prisma.exam_attempts.findMany({
      where,
      include: {
        exams: {
          select: {
            id: true,
            title: true,
            total_marks: true,
            passing_percentage: true,
            show_results_immediately: true,
            end_time: true,
          },
        },
        users: {
          select: { full_name: true, roll_number: true },
        },
      },
      orderBy: { end_time: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.exam_attempts.count({ where }),
    prisma.exam_attempts.aggregate({
      where: { 
        student_id: studentId, 
        status: { in: ['submitted', 'auto_submitted', 'force_submitted', 'evaluated', 'graded'] },
        OR: [
          { exams: { end_time: { lt: new Date() } } },
          { exams: { show_results_immediately: true } }
        ]
      },
      _avg: { percentage: true },
      _count: true,
    }),
  ]);

  // Calculate passed/failed
  const attemptsWithStatus = attempts.map((attempt) => ({
    ...attempt,
    passed: (attempt.percentage || 0) >= (attempt.exams.passing_percentage || 40),
  }));

  // Filter after calculation
  const filteredAttempts = filter === 'passed'
    ? attemptsWithStatus.filter(a => a.passed)
    : filter === 'failed'
    ? attemptsWithStatus.filter(a => !a.passed)
    : attemptsWithStatus;

  // Fetch tenant branding for white-label
  const tenant = await prisma.tenants.findUnique({
    where: { id: tenantId },
    select: {
      name: true,
      logo_url: true,
      primary_color: true,
    },
  });

  return (
    <ResultsListUI
      attempts={serializeData(filteredAttempts)}
      total={total}
      page={page}
      pageSize={pageSize}
      stats={{
        total: stats._count,
        average: Math.round(Number(stats._avg.percentage || 0)),
        passed: attemptsWithStatus.filter(a => a.passed).length,
        failed: attemptsWithStatus.filter(a => !a.passed).length,
      }}
      filter={filter}
      tenant={tenant}
    />
  );
}
