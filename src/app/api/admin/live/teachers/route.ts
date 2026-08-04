import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db/client';
import { authOptions } from '@/lib/auth/options';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['admin', 'super_admin'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = session.user.tenantId || (session.user as any).tenant_id;

    const teachers = await prisma.users.findMany({
      where: {
        tenant_id: tenantId,
        role: 'teacher',
        is_active: true
      },
      select: {
        id: true,
        full_name: true
      },
      orderBy: {
        full_name: 'asc'
      }
    });

    return NextResponse.json({
      success: true,
      teachers: teachers.map(t => ({
        id: t.id,
        name: t.full_name || 'Unknown Teacher'
      }))
    });

  } catch (error) {
    console.error('Failed to fetch teachers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch teachers' },
      { status: 500 }
    );
  }
}
