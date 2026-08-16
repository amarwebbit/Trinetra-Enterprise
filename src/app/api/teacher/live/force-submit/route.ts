import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db/client';
import { authOptions } from '@/lib/auth/options';
import { evaluateAttempt } from '@/lib/evaluation';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['teacher', 'admin', 'super_admin'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { attemptId } = body;

    if (!attemptId) {
      return NextResponse.json({ error: 'Missing attempt ID' }, { status: 400 });
    }

    const attempt = await prisma.exam_attempts.findUnique({
      where: { id: attemptId },
      include: { exams: true }
    });

    if (!attempt) {
      return NextResponse.json({ error: 'Attempt not found' }, { status: 404 });
    }

    // Force submit and grade attempt
    await evaluateAttempt(attemptId, 'force_submitted');

    try {
      await prisma.proctoring_logs.create({
        data: {
          tenant_id: attempt.tenant_id,
          attempt_id: attemptId,
          event_type: 'force_stopped',
          severity: 'critical',
          event_data: { stopped_by: session.user.id, role: session.user.role, timestamp: new Date().toISOString() },
        }
      });
    } catch (logErr) {
      console.warn('Failed to record force stop proctoring log:', logErr);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Force submit error:', error);
    return NextResponse.json({ error: 'Failed to force submit' }, { status: 500 });
  }
}
