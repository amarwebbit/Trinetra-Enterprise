'use server';

import { prisma } from '@/lib/db/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';

export async function exportAuditLogs(filters: any) {
  const session = await getServerSession(authOptions);
  if (!session || !['admin', 'super_admin'].includes(session.user.role)) {
    throw new Error('Unauthorized');
  }

  const tenantId = session.user.tenantId || (session.user as any).tenant_id;
  
  // Construct Prisma WHERE clause based on exact same filters as the page
  const where: any = { tenant_id: tenantId };
  if (filters.action) where.action = filters.action;
  if (filters.user) where.user_id = filters.user;
  if (filters.startDate) {
    where.created_at = { ...where.created_at, gte: new Date(filters.startDate) };
  }
  if (filters.endDate) {
    const end = new Date(filters.endDate);
    end.setHours(23, 59, 59, 999);
    where.created_at = { ...where.created_at, lte: end };
  }
  if (filters.search) {
    where.OR = [
      { action: { contains: filters.search, mode: 'insensitive' } },
      { resource_type: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  const logs = await prisma.audit_logs.findMany({
    where,
    include: { users: true },
    orderBy: { created_at: 'desc' },
    take: 10000, // Hard limit to prevent memory issues during CSV generation
  });

  // Build CSV
  const header = ['Timestamp', 'User', 'Action', 'Resource', 'IP Address', 'Details'];
  const rows = logs.map(log => {
    const timestamp = log.created_at?.toLocaleString() || 'N/A';
    const user = log.users?.full_name || log.users?.email || 'System';
    const action = log.action || 'UNKNOWN';
    const resource = `${log.resource_type || 'N/A'}:${log.resource_id || 'N/A'}`;
    const ip = log.ip_address || 'N/A';
    
    // Safely stringify JSON for CSV, escaping double quotes
    const details = JSON.stringify(log.new_values || log.old_values || log.metadata || {})
      .replace(/"/g, '""');

    return [`"${timestamp}"`, `"${user}"`, `"${action}"`, `"${resource}"`, `"${ip}"`, `"${details}"`].join(',');
  });

  return [header.join(','), ...rows].join('\\n');
}
