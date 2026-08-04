'use server';
  
import { prisma } from '@/lib/db/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { revalidatePath } from 'next/cache';

function getTenantId(session: any) {
  return session?.user?.tenantId || session?.user?.tenant_id;
}

export async function publishResults(examId: string) {
  const session = await getServerSession(authOptions);
  if (!session || !['teacher', 'admin', 'super_admin'].includes(session.user.role)) {
    throw new Error('Unauthorized');
  }
  
  const tenantId = getTenantId(session);

  // Verify exam exists and belongs to this teacher/tenant
  const exam = await prisma.exams.findUnique({
    where: { 
      id: examId, 
      tenant_id: tenantId,
      // Only enforce teacher_id match if the user is literally just a teacher
      ...(session.user.role === 'teacher' ? { teacher_id: session.user.id } : {})
    },
  });
  
  if (!exam) {
    throw new Error('Exam not found or unauthorized');
  }
  
  // Update in database
  await prisma.exams.update({
    where: { id: examId },
    data: { show_results_immediately: true },
  });
  
  // Audit log
  await prisma.audit_logs.create({
    data: {
      tenant_id: tenantId,
      user_id: session.user.id,
      action: 'RESULTS_PUBLISHED',
      resource_type: 'exam',
      resource_id: examId,
      new_values: { show_results_immediately: true },
    },
  });
  
  revalidatePath('/teacher');
  revalidatePath(`/teacher/results/${examId}`);
  
  return { success: true };
}

export async function publishAllResults() {
  const session = await getServerSession(authOptions);
  if (!session || !['teacher', 'admin', 'super_admin'].includes(session.user.role)) {
    throw new Error('Unauthorized');
  }
  
  const tenantId = getTenantId(session);

  // Get ALL pending exams from database
  const pendingExams = await prisma.exams.findMany({
    where: {
      tenant_id: tenantId,
      ...(session.user.role === 'teacher' ? { teacher_id: session.user.id } : {}),
      end_time: { lt: new Date() },
      show_results_immediately: false,
      is_published: true
    },
    select: { id: true },
  });
  
  if (pendingExams.length === 0) {
    return { success: true, count: 0 };
  }

  // Update ALL in database
  await prisma.exams.updateMany({
    where: {
      id: { in: pendingExams.map(e => e.id) },
    },
    data: { show_results_immediately: true },
  });
  
  // Audit log with count
  await prisma.audit_logs.create({
    data: {
      tenant_id: tenantId,
      user_id: session.user.id,
      action: 'ALL_RESULTS_PUBLISHED',
      resource_type: 'exam',
      new_values: { count: pendingExams.length },
    },
  });
  
  revalidatePath('/teacher');
  return { success: true, count: pendingExams.length };
}

export async function unpublishResults(examId: string) {
  const session = await getServerSession(authOptions);
  if (!session || !['teacher', 'admin', 'super_admin'].includes(session.user.role)) {
    throw new Error('Unauthorized');
  }
  
  const tenantId = getTenantId(session);

  // Verify exam exists and belongs to this teacher/tenant
  const exam = await prisma.exams.findUnique({
    where: { 
      id: examId, 
      tenant_id: tenantId,
      ...(session.user.role === 'teacher' ? { teacher_id: session.user.id } : {})
    },
  });
  
  if (!exam) {
    throw new Error('Exam not found or unauthorized');
  }
  
  // Update in database
  await prisma.exams.update({
    where: { id: examId },
    data: { show_results_immediately: false },
  });
  
  // Audit log
  await prisma.audit_logs.create({
    data: {
      tenant_id: tenantId,
      user_id: session.user.id,
      action: 'RESULTS_UNPUBLISHED',
      resource_type: 'exam',
      resource_id: examId,
      new_values: { show_results_immediately: false },
    },
  });
  
  revalidatePath('/teacher');
  revalidatePath(`/teacher/results/${examId}`);
  
  return { success: true };
}

export async function updateTeacherSettings(data: FormData) {
  const session = await getServerSession(authOptions);
  if (!session || !['teacher', 'admin', 'super_admin'].includes(session.user.role)) {
    throw new Error('Unauthorized');
  }

  // Current metadata
  const user = await prisma.users.findUnique({ where: { id: session.user.id } });
  const currentMeta = (user?.metadata as any) || {};

  const updatedMeta = {
    ...currentMeta,
    // Exam & Proctoring defaults
    default_violation_threshold: parseInt(data.get('default_violation_threshold') as string || '5'),
    default_auto_submit_seconds: parseInt(data.get('default_auto_submit_seconds') as string || '10'),
    default_require_webcam: data.get('default_require_webcam') === 'true',
    default_full_screen_required: data.get('default_full_screen_required') === 'true',
    default_disable_copy_paste: data.get('default_disable_copy_paste') === 'true',
    default_show_results_immediately: data.get('default_show_results_immediately') === 'true',
    default_passing_percentage: parseFloat(data.get('default_passing_percentage') as string || '40'),
    
    // Question defaults
    default_negative_marks_enabled: data.get('default_negative_marks_enabled') === 'true',
    default_negative_marks_value: parseFloat(data.get('default_negative_marks_value') as string || '0.25'),
    default_marks: parseFloat(data.get('default_marks') as string || '1'),
    default_difficulty: data.get('default_difficulty') as string || 'medium'
  };

  await prisma.users.update({
    where: { id: session.user.id },
    data: {
      metadata: updatedMeta
    },
  });

  revalidatePath('/teacher/settings');
  revalidatePath('/teacher/questions');
  revalidatePath('/teacher/exams/create');
  return { success: true };
}
