import { prisma } from '@/lib/db/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { redirect } from 'next/navigation';
import ExamBuilderUI from './ExamBuilderUI';

import { serializeData } from '@/lib/utils/serialize';

export const dynamic = 'force-dynamic';

export default async function CreateExamPage() {
  const session = await getServerSession(authOptions);
  
  if (!session || !['teacher', 'admin', 'super_admin'].includes(session.user.role)) {
    redirect('/login');
  }
  
  const tenantId = session.user.tenantId || (session.user as any).tenant_id;
  const teacherId = session.user.id;
  
  // Fetch required data for the wizard
  const [questionBanks, teacherSettings, modules] = await Promise.all([
    // 1. Question Banks (for question selection)
    prisma.question_banks.findMany({
      where: {
        tenant_id: tenantId,
        OR: [
          ...(session.user.role === 'teacher' ? [{ teacher_id: teacherId }] : []),
          { is_published: true }
        ]
      },
      select: {
        id: true,
        name: true,
        _count: { select: { questions: { where: { is_active: true } } } },
      },
    }),
    
    // 2. Teacher Settings (for defaults)
    prisma.users.findUnique({
      where: { id: teacherId },
      select: { metadata: true },
    }),
    
    // 3. Available Modules (for exam patterns)
    prisma.tenant_modules.findMany({
      where: {
        tenant_id: tenantId,
        is_enabled: true,
        modules: {
          code: { in: ['exam_patterns', 'advanced_questions'] },
        },
      },
      include: { modules: true },
    }),
  ]);
  
  // Extract teacher defaults from metadata
  const teacherDefaults = (teacherSettings?.metadata as any) || {};
  
  return (
    <main className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Create Exam
        </h1>
        <p className="text-sm text-muted-foreground">
          Build a new exam, configure sections, and set proctoring rules.
        </p>
      </div>
      
      <ExamBuilderUI
        questionBanks={serializeData(questionBanks)}
        teacherDefaults={serializeData(teacherDefaults)}
        availableModules={serializeData(modules)}
        teacherId={teacherId}
        tenantId={tenantId}
      />
    </main>
  );
}
