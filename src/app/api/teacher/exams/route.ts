import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db/client';
import { cache } from '@/lib/cache';
import { OptimizedAPI } from '@/lib/api-optimized';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !['teacher', 'admin', 'super_admin'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const tenantId = session.user.tenantId || (session.user as any).tenant_id;
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const status = searchParams.get('status');
  const search = searchParams.get('search');

  const cacheKey = `teacher:${session.user.id}:exams:${page}:${limit}:${status || 'all'}:${search || 'all'}`;

  try {
    const result = await OptimizedAPI.paginatedQuery(
      prisma.exams,
      {
        where: {
          teacher_id: session.user.id,
          tenant_id: tenantId,
          ...(status && status !== 'all' ? { status } : {}),
          ...(search ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
            ],
          } : {}),
        },
        select: {
          id: true,
          title: true,
          description: true,
          exam_type: true,
          duration_minutes: true,
          total_marks: true,
          start_time: true,
          end_time: true,
          is_published: true,
          is_active: true,
          status: true,
          created_at: true,
          _count: {
            select: {
              exam_attempts: {
                where: { status: { in: ['submitted', 'evaluated', 'graded'] } },
              },
            },
          },
        },
        orderBy: { created_at: 'desc' },
        page,
        limit,
        cacheKey,
        ttl: 60,
        tags: [`teacher:${session.user.id}`],
      }
    );

    return NextResponse.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });

  } catch (error) {
    console.error('[API Error] /api/teacher/exams:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch exams' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !['teacher', 'admin', 'super_admin'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const tenantId = session.user.tenantId || (session.user as any).tenant_id;
  const body = await request.json();

  try {
    const exam = await prisma.exams.create({
      data: {
        ...body,
        teacher_id: session.user.id,
        tenant_id: tenantId,
      },
    });

    // Invalidate cache for this teacher
    await cache.invalidateTag(`teacher:${session.user.id}`);

    return NextResponse.json({ success: true, data: exam });

  } catch (error) {
    console.error('[API Error] POST /api/teacher/exams:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create exam' },
      { status: 500 }
    );
  }
}
