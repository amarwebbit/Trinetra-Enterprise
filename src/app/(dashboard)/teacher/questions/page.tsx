import { prisma } from '@/lib/db/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { redirect } from 'next/navigation';
import QuestionsUI from './QuestionsUI';
import { serializeData } from '@/lib/utils/serialize';

export const dynamic = 'force-dynamic';

export default async function QuestionBankPage(
  props: {
    searchParams: Promise<{
      page?: string;
      type?: string;
      difficulty?: string;
      topic?: string;
      topicId?: string;
      bankId?: string;
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

  const user = await prisma.users.findUnique({ where: { id: teacherId } });
  const teacherSettings = (user?.metadata as any) || {};

  // Build base filter for teacher to include all questions created in tenant or in teacher's banks
  const teacherFilter = session.user.role === 'teacher' 
    ? {
        OR: [
          { bank_id: null },
          { question_banks: { teacher_id: teacherId } },
          { tenant_id: tenantId }
        ]
      }
    : {};

  const where: any = {
    tenant_id: tenantId,
    ...teacherFilter,
    is_active: true,
  };

  if (searchParams.bankId) {
    where.bank_id = searchParams.bankId;
  }

  if (searchParams.type) where.type = searchParams.type;
  if (searchParams.difficulty) where.difficulty = searchParams.difficulty;
  if (searchParams.topic) {
    where.topic = { contains: searchParams.topic, mode: 'insensitive' };
  }
  
  if (searchParams.topicId) {
    const selectedTopic = await prisma.topics.findUnique({
      where: { id: searchParams.topicId, tenant_id: tenantId },
      select: { name: true }
    });

    if (selectedTopic) {
      where.OR = [
        { topic_id: searchParams.topicId },
        { topic: { equals: selectedTopic.name, mode: 'insensitive' } }
      ];
    } else {
      where.topic_id = searchParams.topicId;
    }
  }

  if (searchParams.search) {
    const searchConditions = [
      { question_text: { contains: searchParams.search, mode: 'insensitive' } },
      { topic: { contains: searchParams.search, mode: 'insensitive' } },
    ];
    if (where.OR) {
      where.AND = [{ OR: searchConditions }];
    } else {
      where.OR = searchConditions;
    }
  }

  const baseWhere = {
    tenant_id: tenantId,
    ...teacherFilter,
    is_active: true,
  };

  // Parallel queries
  const [questions, total, topicsGrouped, dbTopics, typeCounts, difficulties, questionBanks] = await Promise.all([
    prisma.questions.findMany({
      where,
      include: {
        question_banks: { select: { id: true, name: true } },
      },
      orderBy: { created_at: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.questions.count({ where }),
    prisma.questions.groupBy({
      by: ['topic'],
      where: baseWhere,
      orderBy: { topic: 'asc' },
    }),
    prisma.topics.findMany({
      where: { tenant_id: tenantId },
      select: { id: true, name: true, color: true },
      orderBy: { name: 'asc' }
    }),
    prisma.questions.groupBy({
      by: ['type'],
      where: baseWhere,
    }),
    prisma.questions.groupBy({
      by: ['difficulty'],
      where: baseWhere,
    }),
    prisma.question_banks.findMany({
      where: {
        tenant_id: tenantId,
        OR: [
          { teacher_id: teacherId },
          { is_shared: true }
        ]
      },
      include: {
        _count: { select: { questions: { where: { is_active: true } } } }
      },
      orderBy: { created_at: 'asc' }
    }),
  ]);

  // Combine topics from topics table and existing question topics
  const topicSet = new Set<string>();
  dbTopics.forEach(t => topicSet.add(t.name));
  topicsGrouped.forEach(t => { if (t.topic) topicSet.add(t.topic); });
  const combinedTopics = Array.from(topicSet).sort();

  return (
    <main className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Question Bank
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage your questions, import new ones, and configure negative marks.
          </p>
        </div>
      </div>

      <QuestionsUI
        questions={serializeData(questions)}
        total={total}
        page={page}
        pageSize={pageSize}
        topics={combinedTopics}
        dbTopics={serializeData(dbTopics)}
        typeCounts={typeCounts}
        difficulties={difficulties.map(d => d.difficulty).filter((d): d is string => Boolean(d))}
        questionBanks={serializeData(questionBanks)}
        filters={searchParams}
        teacherSettings={serializeData(teacherSettings)}
      />
    </main>
  );
}
