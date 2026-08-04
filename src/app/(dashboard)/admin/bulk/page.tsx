import { prisma } from '@/lib/db/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { redirect } from 'next/navigation';
import BulkUI from './BulkUI';
import { bulkQueue } from '@/lib/queue/bulk-queue';
import { serializeData } from '@/lib/utils/serialize';

export const dynamic = 'force-dynamic';

export default async function AdminBulkPage() {
  const session = await getServerSession(authOptions);
  
  if (!session || !['admin', 'super_admin'].includes(session.user.role)) {
    redirect('/login');
  }
  
  const tenantId = session.user.tenantId || (session.user as any).tenant_id;
  
  // 1. Fetch recent import history from audit_logs
  const recentImports = await prisma.audit_logs.findMany({
    where: {
      tenant_id: tenantId,
      action: { in: ['BULK_STUDENT_IMPORT', 'BULK_QUESTION_IMPORT'] },
    },
    include: {
      users: { select: { full_name: true, email: true } },
    },
    orderBy: { created_at: 'desc' },
    take: 10,
  });
  
  // 2. Import Stats
  const [studentCount, questionCount, examCount] = await Promise.all([
    prisma.users.count({ where: { tenant_id: tenantId, role: 'student' } }),
    prisma.questions.count({ where: { tenant_id: tenantId } }),
    prisma.exams.count({ where: { tenant_id: tenantId } }),
  ]);
  
  // 3. Pending Imports (from BullMQ)
  const pendingJobs = await bulkQueue.getJobs(['waiting', 'active']);
  
  // 4. Fetch data for dropdowns
  const [exams, questionBanks] = await Promise.all([
    prisma.exams.findMany({
      where: { tenant_id: tenantId },
      select: { id: true, title: true, created_at: true },
      orderBy: { created_at: 'desc' }
    }),
    prisma.question_banks.findMany({
      where: { tenant_id: tenantId },
      select: { id: true, name: true },
      orderBy: { created_at: 'desc' }
    })
  ]);

  return (
    <BulkUI 
      recentImports={serializeData(recentImports)}
      stats={{
        studentCount,
        questionCount,
        examCount,
        pendingCount: pendingJobs.length,
      }}
      exams={serializeData(exams)}
      questionBanks={serializeData(questionBanks)}
    />
  );
}
