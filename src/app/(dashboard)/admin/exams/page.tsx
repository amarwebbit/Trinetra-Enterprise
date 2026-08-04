import { prisma } from '@/lib/db/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { redirect } from 'next/navigation';
import ExamsUI from './ExamsUI';
import { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

export default async function AdminExamsPage(
  props: {
    searchParams: Promise<{ status?: string; type?: string; search?: string; page?: string }>
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

  const page = parseInt(searchParams.page || '1');
  const pageSize = 20;

  // Build where clause
  const where: Prisma.examsWhereInput = { 
    tenant_id: tenantId,
    is_active: true // Exclude soft-deleted
  };

  const now = new Date();

  if (searchParams.status === 'ongoing') {
    where.start_time = { lte: now };
    where.end_time = { gte: now };
    where.is_published = true;
  } else if (searchParams.status === 'upcoming') {
    where.start_time = { gt: now };
    where.is_published = true;
  } else if (searchParams.status === 'completed') {
    where.end_time = { lt: now };
    where.is_published = true;
  } else if (searchParams.status === 'draft') {
    where.is_published = false;
  }

  if (searchParams.type && searchParams.type !== 'all') {
    where.exam_type = searchParams.type;
  }

  if (searchParams.search) {
    where.OR = [
      { title: { contains: searchParams.search, mode: 'insensitive' } },
      { description: { contains: searchParams.search, mode: 'insensitive' } },
    ];
  }

  // Fetch data in parallel
  const [dbExams, total, pendingQuestionBanks, groupedTypes] = await Promise.all([
    prisma.exams.findMany({
      where,
      include: {
        users: { select: { full_name: true, email: true } },
        exam_sections: { include: { _count: { select: { exam_questions: true } } } },
        _count: { select: { exam_attempts: true } },
      },
      orderBy: { created_at: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.exams.count({ where }),
    prisma.question_banks.count({
      where: { tenant_id: tenantId, is_published: false }
    }),
    prisma.exams.groupBy({
      by: ['exam_type'],
      where: { tenant_id: tenantId, is_active: true, exam_type: { not: null } },
    }),
  ]);

  // Extract distinct exam types, excluding nulls safely
  const examTypes = groupedTypes
    .map(g => g.exam_type)
    .filter((type): type is string => type !== null);

  // Map to clean client objects
  const mappedExams = dbExams.map(exam => {
    const totalQuestions = exam.exam_sections.reduce((acc, sec) => acc + sec._count.exam_questions, 0);
    
    // Determine exact status string for UI badge based on dates and flags
    let computedStatus = 'Draft';
    if (exam.is_published) {
      if (exam.end_time < now) computedStatus = 'Completed';
      else if (exam.start_time > now) computedStatus = 'Upcoming';
      else computedStatus = 'Ongoing';
    }

    return {
      id: exam.id,
      title: exam.title,
      exam_type: exam.exam_type || 'General',
      is_published: exam.is_published || false,
      start_time: exam.start_time.toISOString(),
      end_time: exam.end_time.toISOString(),
      computedStatus,
      teacher: {
        name: exam.users?.full_name || exam.users?.email || 'System'
      },
      metrics: {
        totalQuestions,
        attempts: exam._count.exam_attempts
      }
    };
  });

  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Exam Management
        </h1>
        <p className="text-sm text-muted-foreground">
          Monitor and manage all assessments across the institution.
        </p>
      </div>

      <ExamsUI 
        exams={mappedExams}
        total={total}
        page={page}
        pageSize={pageSize}
        pendingQuestionBanks={pendingQuestionBanks}
        examTypes={examTypes}
        filters={searchParams}
      />
    </main>
  );
}
