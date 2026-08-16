import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db/client';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenants = await prisma.tenants.findMany({
      select: {
        id: true,
        name: true,
        is_active: true,
        modules_enabled: true,
      },
    });

    const data = await Promise.all(
      tenants.map(async (t) => {
        const activeExamsCount = await prisma.exams.count({
          where: {
            tenant_id: t.id,
            is_active: true,
          },
        });

        const activeUsersCount = await prisma.users.count({
          where: {
            tenant_id: t.id,
            is_active: true,
          },
        });

        return {
          tenantId: t.id,
          tenantName: t.name,
          status: t.is_active ? 'healthy' : 'critical',
          activeExams: activeExamsCount,
          activeUsers: activeUsersCount,
          errorCount: 0,
          lastError: null,
          modules: t.modules_enabled || ['core'],
        };
      })
    );

    return NextResponse.json({
      success: true,
      data,
    });

  } catch (error) {
    console.error('Error fetching tenant health:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tenant health' },
      { status: 500 }
    );
  }
}
