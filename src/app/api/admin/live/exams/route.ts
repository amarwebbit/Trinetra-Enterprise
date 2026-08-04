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

    const exams = await prisma.exams.findMany({
      where: {
        tenant_id: tenantId,
        is_active: true,
        start_time: {
          lte: new Date()
        },
        end_time: {
          gte: new Date()
        }
      },
      select: {
        id: true,
        title: true,
        users: {
          select: {
            full_name: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    return NextResponse.json({
      success: true,
      exams: exams.map(exam => ({
        id: exam.id,
        title: exam.title,
        teacherName: exam.users?.full_name || 'Unknown'
      }))
    });

  } catch (error) {
    console.error('Failed to fetch exams:', error);
    return NextResponse.json(
      { error: 'Failed to fetch exams' },
      { status: 500 }
    );
  }
}
