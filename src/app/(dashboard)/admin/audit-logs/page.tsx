import { prisma } from '@/lib/db/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { redirect } from 'next/navigation';
import AuditLogsUI from './AuditLogsUI';

export const dynamic = 'force-dynamic';

export default async function AdminAuditLogsPage(
  props: {
    searchParams: Promise<{
      page?: string;
      pageSize?: string;
      action?: string;
      user?: string;
      startDate?: string;
      endDate?: string;
      search?: string;
    }>
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
  const pageSize = parseInt(searchParams.pageSize || '20');

  // Build where clause
  const where: any = { tenant_id: tenantId };
  if (searchParams.action) where.action = searchParams.action;
  if (searchParams.user) where.user_id = searchParams.user;
  if (searchParams.startDate) {
    where.created_at = { ...where.created_at, gte: new Date(searchParams.startDate) };
  }
  if (searchParams.endDate) {
    const end = new Date(searchParams.endDate);
    end.setHours(23, 59, 59, 999);
    where.created_at = { ...where.created_at, lte: end };
  }
  if (searchParams.search) {
    where.OR = [
      { action: { contains: searchParams.search, mode: 'insensitive' } },
      { resource_type: { contains: searchParams.search, mode: 'insensitive' } },
    ];
  }

  // Fetch logs and metadata in parallel
  const [logs, total, actionsGroup, users] = await Promise.all([
    prisma.audit_logs.findMany({
      where,
      include: {
        users: {
          select: { id: true, full_name: true, email: true },
        },
      },
      orderBy: { created_at: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.audit_logs.count({ where }),
    prisma.audit_logs.groupBy({
      by: ['action'],
      where: { tenant_id: tenantId },
      orderBy: { action: 'asc' }
    }),
    prisma.users.findMany({
      where: { tenant_id: tenantId },
      select: { id: true, full_name: true, email: true },
      orderBy: { full_name: 'asc' }
    }),
  ]);

  const actions = actionsGroup.map(g => g.action);

  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Audit Logs
        </h1>
        <p className="text-sm text-muted-foreground">
          Monitor all administrative and system actions across your institution.
        </p>
      </div>

      <AuditLogsUI
        logs={logs}
        total={total}
        page={page}
        pageSize={pageSize}
        actions={actions}
        users={users}
        filters={searchParams}
      />
    </main>
  );
}
