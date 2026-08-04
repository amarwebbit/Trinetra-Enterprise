import React from 'react';
import { prisma } from '@/lib/db/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { redirect } from 'next/navigation';
import AuditLogsUI from './AuditLogsUI';

export const dynamic = 'force-dynamic';

export default async function AuditLogsPage(
  props: {
    searchParams: Promise<{ page?: string; search?: string; tenant?: string; action?: string; user?: string; startDate?: string; endDate?: string }>
  }
) {
  const searchParams = await props.searchParams;
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'super_admin') {
    redirect('/login');
  }

  const page = parseInt(searchParams.page || '1');
  const pageSize = 20;

  // Build where clause
  const where: any = {};

  if (searchParams.tenant && searchParams.tenant !== 'all') {
    where.tenant_id = searchParams.tenant;
  }

  if (searchParams.action && searchParams.action !== 'all') {
    where.action = searchParams.action;
  }

  if (searchParams.user && searchParams.user !== 'all') {
    where.user_id = searchParams.user;
  }

  if (searchParams.startDate || searchParams.endDate) {
    where.created_at = {};
    if (searchParams.startDate) {
      where.created_at.gte = new Date(searchParams.startDate);
    }
    if (searchParams.endDate) {
      where.created_at.lte = new Date(searchParams.endDate);
    }
  }

  if (searchParams.search) {
    where.OR = [
      { action: { contains: searchParams.search, mode: 'insensitive' } },
      { resource_type: { contains: searchParams.search, mode: 'insensitive' } },
      { ip_address: { contains: searchParams.search, mode: 'insensitive' } },
      { users: { full_name: { contains: searchParams.search, mode: 'insensitive' } } },
      { users: { email: { contains: searchParams.search, mode: 'insensitive' } } },
    ];
  }

  // Fetch data
  const [logs, total, totalCount, todayCount, actionsCount, tenantCount, filterTenants, filterActions] = await Promise.all([
    prisma.audit_logs.findMany({
      where,
      include: {
        users: { select: { id: true, full_name: true, email: true } },
        tenants: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { created_at: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.audit_logs.count({ where }),
    prisma.audit_logs.count(),
    prisma.audit_logs.count({
      where: { created_at: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }
    }),
    prisma.audit_logs.groupBy({
      by: ['action'],
      _count: true,
    }),
    prisma.tenants.count(),
    
    // For filters
    prisma.tenants.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    prisma.audit_logs.groupBy({ by: ['action'] }),
  ]);

  const stats = {
    total: totalCount,
    today: todayCount,
    actions: actionsCount,
    tenantCount: tenantCount,
  };

  const filterOptions = {
    tenants: filterTenants,
    actions: filterActions.map((a: any) => a.action),
  };

  return (
    <AuditLogsUI
      logs={logs}
      total={total}
      page={page}
      pageSize={pageSize}
      stats={stats}
      filterOptions={filterOptions}
    />
  );
}
