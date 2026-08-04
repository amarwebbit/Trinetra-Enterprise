import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'super_admin') {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const tenant = searchParams.get('tenant');
    const action = searchParams.get('action');
    const user = searchParams.get('user');
    const search = searchParams.get('search');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: any = {};

    if (tenant && tenant !== 'all') where.tenant_id = tenant;
    if (action && action !== 'all') where.action = action;
    if (user && user !== 'all') where.user_id = user;

    if (startDate || endDate) {
      where.created_at = {};
      if (startDate) where.created_at.gte = new Date(startDate);
      if (endDate) where.created_at.lte = new Date(endDate);
    }

    if (search) {
      where.OR = [
        { action: { contains: search, mode: 'insensitive' } },
        { resource_type: { contains: search, mode: 'insensitive' } },
        { ip_address: { contains: search, mode: 'insensitive' } },
        { users: { full_name: { contains: search, mode: 'insensitive' } } },
        { users: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const logs = await prisma.audit_logs.findMany({
      where,
      include: {
        users: { select: { full_name: true, email: true } },
        tenants: { select: { name: true } },
      },
      orderBy: { created_at: 'desc' },
      take: 5000, // Reasonable limit for CSV export
    });

    // Generate CSV
    const headers = ['Timestamp', 'Tenant', 'User Name', 'User Email', 'Action', 'Resource Type', 'Resource ID', 'IP Address', 'User Agent'];
    
    const rows = logs.map(log => [
      log.created_at ? new Date(log.created_at).toISOString() : '',
      log.tenants?.name || 'System',
      log.users?.full_name || 'System',
      log.users?.email || '',
      log.action,
      log.resource_type,
      log.resource_id || '',
      log.ip_address || '',
      log.user_agent || ''
    ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(','));

    const csvContent = [headers.join(','), ...rows].join('\n');

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="audit-logs-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });

  } catch (error) {
    console.error('Audit logs export error:', error);
    return new NextResponse('Error generating export', { status: 500 });
  }
}
