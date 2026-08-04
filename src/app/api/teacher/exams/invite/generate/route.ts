import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db/client';
import { authOptions } from '@/lib/auth/options';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['teacher', 'admin', 'super_admin'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = session.user.tenantId || (session.user as any).tenant_id;
    const { examId, maxUses = 0, expiresInHours = 72 } = await req.json();

    if (!examId) {
      return NextResponse.json({ error: 'Exam ID is required' }, { status: 400 });
    }

    // Verify exam exists within the tenant
    const exam = await prisma.exams.findFirst({
      where: {
        id: examId,
        tenant_id: tenantId,
      }
    });

    if (!exam) {
      return NextResponse.json({ error: 'Exam not found or unauthorized' }, { status: 404 });
    }

    // Generate unique token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = expiresInHours > 0 
      ? new Date(Date.now() + expiresInHours * 60 * 60 * 1000)
      : null;

    // Create invite token in database
    try {
      await prisma.examInviteToken.create({
        data: {
          examId: examId,
          token: token,
          maxUses: maxUses,
          expiresAt: expiresAt,
          createdBy: session.user.id,
          isActive: true,
        }
      });
    } catch (e) {
      console.warn('examInviteToken entry fallback:', e);
    }

    // Update exam with primary invite token
    await prisma.exams.update({
      where: { id: examId },
      data: {
        invite_token: token,
        invite_expires_at: expiresAt,
        invite_max_uses: maxUses,
      }
    });

    // Automatically construct domain-aware tenant invite link
    const hostHeader = req.headers.get('host') || 'localhost:3000';
    const protocol = req.headers.get('x-forwarded-proto') || (hostHeader.includes('localhost') ? 'http' : 'https');
    const origin = `${protocol}://${hostHeader}`;

    const inviteUrl = `${origin}/student/exams/${examId}/invite/${token}`;

    return NextResponse.json({
      success: true,
      inviteUrl: inviteUrl,
      data: {
        token: token,
        inviteUrl: inviteUrl,
        expiresAt: expiresAt,
        maxUses: maxUses,
        examTitle: exam.title,
        tenantId: tenantId,
      }
    });

  } catch (error) {
    console.error('Invite generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate invite link' },
      { status: 500 }
    );
  }
}
