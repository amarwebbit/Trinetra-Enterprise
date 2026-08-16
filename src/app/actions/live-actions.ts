'use server';

import { prisma } from '@/lib/db/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { revalidatePath } from 'next/cache';
import { evaluateAttempt } from '@/lib/evaluation';

function getTenantId(session: any) {
  return session?.user?.tenantId || session?.user?.tenant_id;
}

export async function forceSubmit(attemptId: string) {
  const session = await getServerSession(authOptions);
  if (!session || !['admin', 'teacher', 'super_admin'].includes(session.user.role)) {
    throw new Error('Unauthorized');
  }

  const tenantId = getTenantId(session);

  // Verify the attempt belongs to this tenant
  const attempt = await prisma.exam_attempts.findFirst({
    where: { id: attemptId },
    include: { users: true }
  });

  if (!attempt || attempt.users?.tenant_id !== tenantId) {
    throw new Error('Attempt not found or unauthorized');
  }

  await evaluateAttempt(attemptId, 'auto_submitted');

  try {
    await prisma.proctoring_logs.create({
      data: {
        tenant_id: tenantId,
        attempt_id: attemptId,
        event_type: 'force_stopped',
        severity: 'critical',
        event_data: { stopped_by: session.user.id, role: session.user.role, timestamp: new Date().toISOString() },
      }
    });
  } catch (e) {}

  await prisma.audit_logs.create({
    data: {
      tenant_id: tenantId,
      user_id: session.user.id,
      action: 'EXAM_FORCE_SUBMITTED',
      resource_type: 'exam_attempts',
      resource_id: attemptId,
    }
  });

  // Revalidate to instantly update UI if not relying solely on polling
  revalidatePath('/admin/live');
  revalidatePath('/teacher/live');
  return { success: true };
}

export async function endExam(examId: string) {
  const session = await getServerSession(authOptions);
  if (!session || !['admin', 'teacher', 'super_admin'].includes(session.user.role)) {
    throw new Error('Unauthorized');
  }

  const tenantId = getTenantId(session);

  const exam = await prisma.exams.update({
    where: { id: examId, tenant_id: tenantId },
    data: { 
      end_time: new Date() // Forces all attempts to expire based on timeframe rules
    }
  });

  // Force submit and grade all in_progress attempts for this exam immediately
  const inProgressAttempts = await prisma.exam_attempts.findMany({
    where: {
      exam_id: examId,
      status: 'in_progress'
    },
    select: { id: true }
  });

  for (const att of inProgressAttempts) {
    try {
      await evaluateAttempt(att.id, 'auto_submitted');
    } catch (err) {
      console.error(`Failed to evaluate auto-submitted attempt ${att.id}:`, err);
    }
  }

  await prisma.audit_logs.create({
    data: {
      tenant_id: tenantId,
      user_id: session.user.id,
      action: 'EXAM_FORCE_ENDED',
      resource_type: 'exams',
      resource_id: exam.id,
    }
  });

  revalidatePath('/admin/live');
  revalidatePath('/teacher/live');
  return { success: true };
}

export async function sendMessage(examId: string, messageText: string) {
  const session = await getServerSession(authOptions);
  if (!session || !['admin', 'super_admin'].includes(session.user.role)) {
    throw new Error('Unauthorized');
  }

  const tenantId = getTenantId(session);

  // Find all active students for this exam
  const activeAttempts = await prisma.exam_attempts.findMany({
    where: {
      exam_id: examId,
      status: 'in_progress',
      users: { tenant_id: tenantId }
    },
    select: { student_id: true }
  });

  if (activeAttempts.length === 0) {
    return { success: true, count: 0 };
  }

  // Insert a notification for each student
  const notificationsData = activeAttempts
    .filter(a => a.student_id != null)
    .map(a => ({
      tenant_id: tenantId,
      user_id: a.student_id as string,
      title: 'Exam Announcement',
      message: messageText,
      type: 'alert',
      is_read: false
    }));

  if (notificationsData.length > 0) {
    // Assuming `notifications` table accepts these standard fields
    await prisma.notifications.createMany({
      data: notificationsData as any
    });
  }

  await prisma.audit_logs.create({
    data: {
      tenant_id: tenantId,
      user_id: session.user.id,
      action: 'EXAM_ANNOUNCEMENT_SENT',
      resource_type: 'exams',
      resource_id: examId,
      metadata: { message: messageText, recipientCount: notificationsData.length }
    }
  });

  return { success: true, count: notificationsData.length };
}

export async function adjustAttemptTime(attemptId: string, adjustmentMinutes: number) {
  const session = await getServerSession(authOptions);
  if (!session || !['admin', 'teacher', 'super_admin'].includes(session.user.role)) {
    throw new Error('Unauthorized');
  }

  const tenantId = getTenantId(session);

  // Verify the attempt exists
  const attempt = await prisma.exam_attempts.findFirst({
    where: { id: attemptId },
    select: { exam_id: true, tenant_id: true }
  });

  if (!attempt || attempt.tenant_id !== tenantId) {
    throw new Error('Attempt not found or unauthorized');
  }

  const exam = await prisma.exams.findUnique({
    where: { id: attempt.exam_id },
    select: { metadata: true }
  });

  if (!exam) {
    throw new Error('Exam not found');
  }

  const currentMetadata = (exam.metadata as Record<string, any>) || {};
  const currentAdjustmentSeconds = Number(currentMetadata.time_adjustment_seconds || 0);
  const newAdjustmentSeconds = currentAdjustmentSeconds + (adjustmentMinutes * 60);

  // Update exam metadata (effectively granting it to all students of this test)
  await prisma.exams.update({
    where: { id: attempt.exam_id },
    data: {
      metadata: {
        ...currentMetadata,
        time_adjustment_seconds: newAdjustmentSeconds,
      }
    }
  });

  // Audit log
  await prisma.audit_logs.create({
    data: {
      tenant_id: tenantId,
      user_id: session.user.id,
      action: `EXAM_TIME_ADJUSTED: ${adjustmentMinutes > 0 ? '+' : ''}${adjustmentMinutes} minutes`,
      resource_type: 'exams',
      resource_id: attempt.exam_id,
      new_values: { time_adjustment_seconds: newAdjustmentSeconds },
    }
  });

  revalidatePath('/admin/live');
  revalidatePath('/teacher/live');
  return { success: true, newAdjustmentSeconds };
}

export async function resumeAttempt(attemptId: string) {
  const session = await getServerSession(authOptions);
  if (!session || !['admin', 'teacher', 'super_admin'].includes(session.user.role)) {
    throw new Error('Unauthorized');
  }

  const tenantId = getTenantId(session);

  // Verify attempt belongs to tenant
  const attempt = await prisma.exam_attempts.findFirst({
    where: { id: attemptId },
    include: { users: true }
  });

  if (!attempt || attempt.users?.tenant_id !== tenantId) {
    throw new Error('Attempt not found or unauthorized');
  }

  await prisma.exam_attempts.update({
    where: { id: attemptId },
    data: {
      status: 'in_progress',
      end_time: null, // Allow system to calculate end time
    }
  });

  // Audit log
  await prisma.audit_logs.create({
    data: {
      tenant_id: tenantId,
      user_id: session.user.id,
      action: 'EXAM_ATTEMPT_RESUMED',
      resource_type: 'exam_attempts',
      resource_id: attemptId,
    }
  });

  revalidatePath('/teacher/live');
  return { success: true };
}

export async function resetAttempt(attemptId: string) {
  const session = await getServerSession(authOptions);
  if (!session || !['admin', 'teacher', 'super_admin'].includes(session.user.role)) {
    throw new Error('Unauthorized');
  }

  const tenantId = getTenantId(session);

  // Verify attempt belongs to tenant
  const attempt = await prisma.exam_attempts.findFirst({
    where: { id: attemptId },
    include: { users: true }
  });

  if (!attempt || attempt.users?.tenant_id !== tenantId) {
    throw new Error('Attempt not found or unauthorized');
  }

  // Delete attempt record (cascading automatically)
  await prisma.exam_attempts.delete({
    where: { id: attemptId },
  });

  // Audit log
  await prisma.audit_logs.create({
    data: {
      tenant_id: tenantId,
      user_id: session.user.id,
      action: 'EXAM_ATTEMPT_RESET',
      resource_type: 'exam_attempts',
      resource_id: attemptId,
    }
  });

  revalidatePath('/teacher/live');
  return { success: true };
}
