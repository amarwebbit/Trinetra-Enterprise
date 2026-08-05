import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { examService } from '@/lib/services';
import { monitoring } from '@/lib/monitoring';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !['teacher', 'admin', 'super_admin'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const tenantId: string = (session.user as any).tenantId || (session.user as any).tenant_id || '';
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  
  const rawStatus = searchParams.get('status');
  const rawSearch = searchParams.get('search');
  const status = rawStatus || undefined;
  const search = rawSearch || undefined;

  try {
    monitoring.setUserContext({
      id: session.user.id,
      email: session.user.email,
      role: session.user.role,
      tenantId,
    });

    const result = await examService.findAll(
      { tenantId },
      {
        page,
        limit,
        status,
        search,
        teacherId: session.user.role === 'teacher' ? session.user.id : undefined,
      }
    );

    return NextResponse.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });

  } catch (error) {
    console.error('[API Error] /api/teacher/exams:', error);
    monitoring.captureException(error as Error, {
      endpoint: '/api/teacher/exams',
      method: 'GET',
      userId: session.user.id,
    });
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

  const tenantId: string = (session.user as any).tenantId || (session.user as any).tenant_id || '';
  
  try {
    const body = await request.json();

    monitoring.setUserContext({
      id: session.user.id,
      email: session.user.email,
      role: session.user.role,
      tenantId,
    });

    const exam = await examService.create(
      body,
      session.user.id,
      { tenantId }
    );

    return NextResponse.json({ success: true, data: exam });

  } catch (error) {
    console.error('[API Error] POST /api/teacher/exams:', error);
    monitoring.captureException(error as Error, {
      endpoint: '/api/teacher/exams',
      method: 'POST',
      userId: session.user.id,
    });
    return NextResponse.json(
      { success: false, error: 'Failed to create exam' },
      { status: 500 }
    );
  }
}
