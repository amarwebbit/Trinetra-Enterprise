import { prisma } from '@/lib/db/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { redirect } from 'next/navigation';
import ExamListUI from './ExamListUI';
import { serializeData } from '@/lib/utils/serialize';

export const dynamic = 'force-dynamic';

export default async function TeacherExamsPage(
  props: {
    searchParams: Promise<{
      page?: string;
      status?: string;
      search?: string;
    }>
  }
) {
  const searchParams = await props.searchParams;
  const session = await getServerSession(authOptions);

  if (!session || !['teacher', 'admin', 'super_admin'].includes(session.user.role)) {
    redirect('/login');
  }

  const tenantId = session.user.tenantId || (session.user as any).tenant_id;
  const teacherId = session.user.id;
  const page = parseInt(searchParams.page || '1');
  const pageSize = 20;

  // Build where clause based on status filter
  const where: any = {
    tenant_id: tenantId,
    ...(session.user.role === 'teacher' ? { teacher_id: teacherId } : {}),
    is_active: true, // Only show non-deleted exams
  };

  switch (searchParams.status) {
    case 'draft':
      where.is_published = false;
      break;
    case 'ongoing':
      where.is_published = true;
      where.start_time = { lte: new Date() };
      where.end_time = { gte: new Date() };
      break;
    case 'upcoming':
      where.is_published = true;
      where.start_time = { gt: new Date() };
      break;
    case 'completed':
      where.is_published = true;
      where.end_time = { lt: new Date() };
      break;
    case 'published':
      where.is_published = true;
      break;
    default: // 'all'
      break;
  }

  if (searchParams.search) {
    where.OR = [
      { title: { contains: searchParams.search, mode: 'insensitive' } },
      { description: { contains: searchParams.search, mode: 'insensitive' } },
    ];
  }

  // Parallel queries - ALL real data
  const [exams, total] = await Promise.all([
    prisma.exams.findMany({
      where,
      include: {
        _count: {
          select: {
            exam_attempts: {
              where: { status: { in: ['submitted', 'evaluated'] } }
            },
            exam_sections: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.exams.count({ where }),
  ]);

  // Calculate exam status for each exam
  const examsWithStatus = exams.map(exam => {
    let status = 'draft';
    if (exam.is_published) {
      const now = new Date();
      if (exam.end_time < now) {
        status = 'completed';
      } else if (exam.start_time <= now && exam.end_time >= now) {
        status = 'ongoing';
      } else if (exam.start_time > now) {
        status = 'upcoming';
      } else {
        status = 'published';
      }
    }
    return { ...exam, status };
  });

  const baseWhere = {
    tenant_id: tenantId,
    ...(session.user.role === 'teacher' ? { teacher_id: teacherId } : {}),
    is_active: true,
  };

  // Get counts for status tabs
  const [allCount, draftCount, publishedCount, ongoingCount, upcomingCount, completedCount] = await Promise.all([
    prisma.exams.count({ where: baseWhere }),
    prisma.exams.count({ where: { ...baseWhere, is_published: false } }),
    prisma.exams.count({ where: { ...baseWhere, is_published: true } }),
    prisma.exams.count({
      where: {
        ...baseWhere,
        is_published: true,
        start_time: { lte: new Date() },
        end_time: { gte: new Date() },
      },
    }),
    prisma.exams.count({
      where: {
        ...baseWhere,
        is_published: true,
        start_time: { gt: new Date() },
      },
    }),
    prisma.exams.count({
      where: {
        ...baseWhere,
        is_published: true,
        end_time: { lt: new Date() },
      },
    }),
  ]);

  return (
    <main className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          My Exams
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage your created exams, view submissions, and monitor ongoing tests.
        </p>
      </div>

      <ExamListUI
        exams={serializeData(examsWithStatus)}
        total={total}
        page={page}
        pageSize={pageSize}
        currentFilter={searchParams.status || 'all'}
        counts={{
          all: allCount,
          draft: draftCount,
          published: publishedCount,
          ongoing: ongoingCount,
          upcoming: upcomingCount,
          completed: completedCount,
        }}
        filters={searchParams}
      />
    </main>
  );
}
