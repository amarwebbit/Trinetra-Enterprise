import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db/client';
import { authOptions } from '@/lib/auth/options';

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

    // Force submit
    await prisma.exam_attempts.update({
      where: { id: attemptId },
      data: {
        status: 'submitted',
        end_time: new Date(),
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Force submit error:', error);
    return NextResponse.json({ error: 'Failed to force submit' }, { status: 500 });
  }
}
