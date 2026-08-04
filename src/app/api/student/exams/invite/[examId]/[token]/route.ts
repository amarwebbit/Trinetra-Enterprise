import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db/client';
import { authOptions } from '@/lib/auth/options';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ examId: string; token: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { examId, token } = await params;

    // Verify token
    const inviteToken = await prisma.examInviteToken.findFirst({
      where: {
        examId: examId,
        token: token,
        isActive: true,
      },
      include: {
        exam: {
          include: {
            tenants: {
              select: {
                id: true,
                name: true,
                logo_url: true,
                primary_color: true,
              }
            }
          }
        }
      }
    });

    if (!inviteToken || !inviteToken.exam) {
      return NextResponse.json({ error: 'Invalid or inactive invite link' }, { status: 404 });
    }

    // Check expiration
    if (inviteToken.expiresAt && new Date() > inviteToken.expiresAt) {
      return NextResponse.json({ error: 'Invite link has expired' }, { status: 410 });
    }

    // Check usage limits
    if (inviteToken.maxUses > 0 && inviteToken.usedCount >= inviteToken.maxUses) {
      return NextResponse.json({ error: 'Invite link has reached its usage limit' }, { status: 410 });
    }

    // Check if logged in student already attempted
    let existingAttempt = null;
    if (session?.user?.id && session.user.role === 'student') {
      existingAttempt = await prisma.exam_attempts.findFirst({
        where: {
          exam_id: examId,
          student_id: session.user.id,
          tenant_id: inviteToken.exam.tenant_id,
        },
        orderBy: { start_time: 'desc' }
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: inviteToken.exam.id,
        title: inviteToken.exam.title,
        description: inviteToken.exam.description,
        duration_minutes: inviteToken.exam.duration_minutes,
        total_marks: inviteToken.exam.total_marks,
        start_time: inviteToken.exam.start_time,
        end_time: inviteToken.exam.end_time,
        tenant_id: inviteToken.exam.tenant_id,
        tenant: inviteToken.exam.tenants,
        existingAttempt: existingAttempt ? {
          status: existingAttempt.status,
          score: existingAttempt.score,
          started_at: existingAttempt.start_time
        } : null
      }
    });
  } catch (error) {
    console.error('Fetch invite error:', error);
    return NextResponse.json(
      { error: 'Failed to load exam details' },
      { status: 500 }
    );
  }
}
