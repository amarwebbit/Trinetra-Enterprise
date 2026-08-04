import { prisma } from '@/lib/db/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { redirect } from 'next/navigation';
import { AvailableExamsUI } from './AvailableExamsUI';
import { serializeData } from '@/lib/utils/serialize';

export const dynamic = 'force-dynamic';

export default async function AvailableExamsPage(
  props: {
    searchParams: Promise<{ filter?: string; search?: string; page?: string }>
  }
) {
  const searchParams = await props.searchParams;
  const session = await getServerSession(authOptions);

  if (!session || !['student', 'admin', 'super_admin'].includes(session.user.role)) {
    redirect('/login');
  }

  const tenantId = session.user.tenantId || (session.user as any).tenant_id;
  const studentId = session.user.id;
  const page = parseInt(searchParams.page || '1');
  const pageSize = 20;
  const filter = searchParams.filter || 'all';

  const now = new Date();
  const where: any = {
    tenant_id: tenantId,
    is_published: true,
    is_active: true,
  };

  // Filter logic
  switch (filter) {
    case 'upcoming':
      where.start_time = { gt: now };
      break;
    case 'ongoing':
      where.start_time = { lte: now };
      where.end_time = { gte: now };
      break;
    case 'completed':
      where.end_time = { lt: now };
      break;
    case 'all':
    default:
      break;
  }

  if (searchParams.search) {
    where.OR = [
      { title: { contains: searchParams.search, mode: 'insensitive' } },
      { description: { contains: searchParams.search, mode: 'insensitive' } },
    ];
  }

  const baseWhere = {
    tenant_id: tenantId,
    is_published: true,
    is_active: true,
  };

  // Parallel queries - ALL real data
  const [exams, total, counts] = await Promise.all([
    // 1. Exams (paginated)
    prisma.exams.findMany({
      where,
      include: {
        users: { select: { full_name: true } },
        _count: { select: { exam_sections: true } },
        exam_attempts: {
          where: { student_id: studentId },
          select: { id: true, status: true, score: true, percentage: true, attempt_number: true, created_at: true },
          orderBy: { created_at: 'desc' },
        },
      },
      orderBy: { start_time: 'asc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    
    // 2. Total count (for pagination)
    prisma.exams.count({ where }),
    
    // 3. Counts for tabs
    prisma.$transaction([
      prisma.exams.count({ where: baseWhere }), // All
      prisma.exams.count({
        where: { ...baseWhere, start_time: { gt: now } },
      }), // Upcoming
      prisma.exams.count({
        where: { ...baseWhere, start_time: { lte: now }, end_time: { gte: now } },
      }), // Ongoing
      prisma.exams.count({
        where: { ...baseWhere, end_time: { lt: now } },
      }), // Completed
    ]),
  ]);

  // Enrich exams with student attempt data
  const examsWithStatus = exams.map(exam => {
    const attempts = exam.exam_attempts || [];
    const activeAttempt = attempts.find(a => a.status === 'in_progress') || null;
    const completedAttempts = attempts.filter(a => a.status === 'submitted' || a.status === 'evaluated' || a.status === 'graded');
    const latestAttempt = attempts[0] || null;

    let status = 'available';
    
    if (exam.end_time < now) {
      status = 'completed';
    } else if (exam.start_time <= now && exam.end_time >= now) {
      status = activeAttempt ? 'in_progress' : 'ongoing';
    } else if (exam.start_time > now) {
      status = 'upcoming';
    }
    
    return { 
      ...exam, 
      attempts, 
      activeAttempt, 
      completedAttemptsCount: completedAttempts.length,
      studentAttempt: activeAttempt || latestAttempt, 
      status 
    };
  });

  const [allCount, upcomingCount, ongoingCount, completedCount] = counts;

  return (
    <AvailableExamsUI
      exams={serializeData(examsWithStatus)}
      total={total}
      page={page}
      pageSize={pageSize}
      filter={filter}
      counts={serializeData({ all: allCount, upcoming: upcomingCount, ongoing: ongoingCount, completed: completedCount })}
      search={searchParams.search || ''}
      studentId={studentId}
    />
  );
}
