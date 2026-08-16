import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import bcrypt from 'bcrypt';
import { createExamGuestToken, EXAM_GUEST_COOKIE } from '@/lib/auth/exam-guest';
import { withExamRateLimit } from '@/lib/redis/with-rate-limit';

async function joinHandler(req: NextRequest) {
  try {
    const { examId, token, rollNumber, studentName, email, branch, section } = await req.json();

    if (!examId || !token || !rollNumber?.trim()) {
      return NextResponse.json({ error: 'Exam link and roll number are required' }, { status: 400 });
    }

    const invite = await prisma.examInviteToken.findFirst({
      where: { examId, token, isActive: true },
      include: { exam: true },
    });

    if (!invite?.exam || !invite.exam.is_active || !invite.exam.is_published) {
      return NextResponse.json({ error: 'Invalid or inactive invite link' }, { status: 404 });
    }

    const now = new Date();
    if (now < invite.exam.start_time || now >= invite.exam.end_time) {
      return NextResponse.json({ error: 'Exam is outside its allowed window' }, { status: 403 });
    }

    if ((invite.expiresAt && now > invite.expiresAt) || (invite.maxUses > 0 && invite.usedCount >= invite.maxUses)) {
      return NextResponse.json({ error: 'Invite link is no longer available' }, { status: 410 });
    }

    const tenantId = invite.exam.tenant_id;
    const cleanRoll = rollNumber.trim();
    const cleanEmail = email?.trim() ? email.trim().toLowerCase() : `${cleanRoll.toLowerCase()}@student.local`;
    const cleanName = studentName?.trim() || `Student ${cleanRoll}`;
    const cleanBranch = branch?.trim() || 'CSE';
    const cleanSection = section?.trim() || '3A';

    // 1. Look up existing student by Roll Number or Email
    let student = await prisma.users.findFirst({
      where: {
        tenant_id: tenantId,
        role: 'student',
        OR: [
          { roll_number: { equals: cleanRoll, mode: 'insensitive' } },
          { email: { equals: cleanEmail, mode: 'insensitive' } },
        ],
      },
    });

    // 2. If student does not exist, auto-register/create new student in database
    if (!student) {
      const passwordHash = await bcrypt.hash(cleanRoll, 10);
      student = await prisma.users.create({
        data: {
          tenant_id: tenantId,
          email: cleanEmail,
          password_hash: passwordHash,
          full_name: cleanName,
          roll_number: cleanRoll,
          role: 'student',
          is_active: true,
          metadata: {
            branch: cleanBranch,
            section: cleanSection,
            registered_via_invite: true,
          },
        },
      });
    } else {
      // Update metadata if branch or section provided
      const meta = (student.metadata as any) || {};
      if (cleanBranch || cleanSection) {
        await prisma.users.update({
          where: { id: student.id },
          data: {
            full_name: student.full_name || cleanName,
            metadata: {
              ...meta,
              branch: cleanBranch || meta.branch || 'CSE',
              section: cleanSection || meta.section || '3A',
            },
          },
        });
      }
    }

    // 3. Create or resume exam attempt
    const attempts = await prisma.exam_attempts.findMany({
      where: { exam_id: examId, student_id: student.id },
      orderBy: { attempt_number: 'desc' },
    });

    let attempt = attempts.find((item) => item.status === 'in_progress');

    if (!attempt) {
      if (attempts.length >= (invite.exam.max_attempts || 1)) {
        const latestAttempt = attempts[0];
        if (latestAttempt) {
          const showResults = Boolean(invite.exam.show_results_immediately);
          const redirectUrl = showResults 
            ? `/student/results/${examId}` 
            : `/exam/complete/${latestAttempt.id}`;

          const response = NextResponse.json({ 
            success: true, 
            alreadySubmitted: true, 
            attemptId: latestAttempt.id, 
            redirectUrl 
          });

          response.cookies.set(
            EXAM_GUEST_COOKIE,
            createExamGuestToken({
              studentId: student.id,
              tenantId,
              examId,
              attemptId: latestAttempt.id,
            }),
            {
              httpOnly: true,
              sameSite: 'lax',
              secure: process.env.NODE_ENV === 'production',
              path: '/',
              maxAge: 8 * 60 * 60,
            }
          );

          return response;
        }

        return NextResponse.json({ error: 'Maximum attempts reached for this exam' }, { status: 403 });
      }

      const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';

      attempt = await prisma.$transaction(async (tx) => {
        const created = await tx.exam_attempts.create({
          data: {
            tenant_id: tenantId,
            exam_id: examId,
            student_id: student!.id,
            status: 'in_progress',
            score: 0,
            start_time: now,
            attempt_number: attempts.length + 1,
            metadata: {
              joined_via_invite: true,
              branch: cleanBranch,
              section: cleanSection,
              ip_address: ipAddress,
            },
          },
        });

        await tx.examInviteUsage.create({
          data: {
            tokenId: invite.id,
            studentId: student!.id,
            ipAddress,
            userAgent: req.headers.get('user-agent') || 'unknown',
          },
        });

        await tx.examInviteToken.update({
          where: { id: invite.id },
          data: { usedCount: { increment: 1 } },
        });

        return created;
      });
    }

    // Determine if instructions should be shown (per exam setting)
    const showInstructions = invite.exam.show_instructions !== null
      ? invite.exam.show_instructions
      : (invite.exam.metadata as any)?.show_instructions !== false;

    const response = NextResponse.json({ success: true, attemptId: attempt.id, examId, showInstructions });
    
    response.cookies.set(
      EXAM_GUEST_COOKIE,
      createExamGuestToken({
        studentId: student.id,
        tenantId,
        examId,
        attemptId: attempt.id,
      }),
      {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 8 * 60 * 60,
      }
    );

    return response;
  } catch (error) {
    console.error('Join exam error:', error);
    return NextResponse.json({ error: 'Failed to join exam' }, { status: 500 });
  }
}

export const POST = withExamRateLimit(joinHandler);
