'use server';

import { prisma } from '@/lib/db/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { revalidatePath } from 'next/cache';

export async function createExam(data: FormData) {
  const session = await getServerSession(authOptions);
  if (!session || !['teacher', 'admin', 'super_admin'].includes(session.user.role)) {
    throw new Error('Unauthorized');
  }

  const tenantId = session.user.tenantId || (session.user as any).tenant_id;

  const sectionsRaw = data.get('sections') as string;
  const sections = sectionsRaw ? JSON.parse(sectionsRaw) : [];
  const questionIds = [...new Set<string>(sections.flatMap((section: any) => (section.question_ids || []).filter((id: unknown): id is string => typeof id === 'string')))];
  const selectedQuestions = questionIds.length ? await prisma.questions.findMany({
    where: { id: { in: questionIds }, tenant_id: tenantId, is_active: true },
    select: { id: true, marks: true },
  }) : [];
  if (selectedQuestions.length !== questionIds.length) {
    throw new Error('One or more selected questions are unavailable. Refresh the question bank and try again.');
  }
  const totalMarks = selectedQuestions.reduce((total, question) => total + Number(question.marks ?? 1), 0);

  const pattern = data.get('pattern') as string || 'custom';
  const mode = data.get('mode') as string || 'live';
  const isAssignment = mode === 'assignment';
  const dueDate = data.get('due_date') as string || null;
  const targetBranch = data.get('target_branch') as string || 'all';
  const targetYear = parseInt(data.get('target_year') as string || '0');
  
  const showInstructions = data.get('show_instructions') === 'true';
  const requireAcknowledgement = data.get('require_acknowledgement') === 'true';
  const instructions = (data.get('instructions') as string) || null;
  const instructionsHtml = (data.get('instructions_html') as string) || null;
  const sectionInstructionsRaw = data.get('section_instructions') as string;
  const sectionInstructions = sectionInstructionsRaw ? JSON.parse(sectionInstructionsRaw) : {};
  
  const maxAttempts = parseInt(data.get('max_attempts') as string || '1');
  const violationThreshold = parseInt(data.get('violation_threshold') as string || '5');
  const autoSubmitSeconds = parseInt(data.get('auto_submit_seconds') as string || '10');
  
  const exam = await prisma.exams.create({
    data: {
      tenant_id: tenantId,
      teacher_id: session.user.id,
      title: data.get('title') as string,
      description: (data.get('description') as string) || null,
      exam_type: isAssignment ? 'assignment' : 'live',
      pattern: pattern,
      duration_minutes: parseInt(data.get('duration_minutes') as string || '60'),
      // This is calculated on the server so an exam can never retain the old 100-mark default.
      total_marks: totalMarks,
      passing_percentage: parseFloat(data.get('passing_percentage') as string || '40'),
      start_time: new Date(data.get('start_time') as string),
      end_time: new Date(data.get('end_time') as string),
      max_attempts: maxAttempts,
      
      require_webcam: false, // always off
      full_screen_required: data.get('full_screen_required') === 'true',
      disable_copy_paste: data.get('disable_copy_paste') === 'true',
      show_results_immediately: data.get('show_results_immediately') === 'true',
      
      shuffle_questions: data.get('shuffle_questions') === 'true',
      shuffle_options: data.get('shuffle_options') === 'true',
      allow_back_navigation: data.get('allow_back_navigation') === 'true',
      
      instructions: instructions,
      instructions_html: instructionsHtml,
      show_instructions: showInstructions,
      require_acknowledgement: requireAcknowledgement,
      
      is_published: data.get('action') === 'publish',
      is_active: true,
      
      metadata: {
        max_attempts: maxAttempts,
        mode: mode,
        violation_threshold: violationThreshold,
        auto_submit_seconds: autoSubmitSeconds,
        show_instructions: data.get('show_instructions') !== 'false', // default true
        due_date: dueDate || undefined,
        target_branch: targetBranch,
        target_year: targetYear,
        allow_calculator: data.get('allow_calculator') === 'true',
      },
      
      exam_sections: {
        create: sections.map((section: any, index: number) => ({
          tenant_id: tenantId,
          name: section.name,
          order_index: index,
          question_count: section.question_ids?.length || 0,
          section_time_limit: section.section_time_limit,
          shuffle_questions: section.shuffle_questions,
          instructions: sectionInstructions[index]?.text || null,
          instructions_html: sectionInstructions[index]?.html || null,
          exam_questions: {
            create: (section.question_ids || []).map((qId: string, qIndex: number) => ({
              tenant_id: tenantId,
              question_id: qId,
              order_index: qIndex,
            })),
          },
        })),
      },
    },
  });

  await prisma.audit_logs.create({
    data: {
      tenant_id: tenantId,
      user_id: session.user.id,
      action: data.get('action') === 'publish' ? 'EXAM_PUBLISHED' : 'EXAM_CREATED',
      resource_type: 'exams',
      resource_id: exam.id,
      new_values: {
        title: exam.title,
        violation_threshold: violationThreshold,
        auto_submit_seconds: autoSubmitSeconds,
      },
    },
  });

  revalidatePath('/teacher/exams');
  return { success: true, examId: exam.id };
}

export async function deleteExam(examId: string) {
  const session = await getServerSession(authOptions);
  if (!session || !['teacher', 'admin', 'super_admin'].includes(session.user.role)) {
    throw new Error('Unauthorized');
  }
  
  const tenantId = session.user.tenantId || (session.user as any).tenant_id;
  
  // Verify exam belongs to this teacher
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
  
  // Soft delete
  await prisma.exams.update({
    where: { id: examId },
    data: { is_active: false },
  });
  
  // Audit log
  await prisma.audit_logs.create({
    data: {
      tenant_id: tenantId,
      user_id: session.user.id,
      action: 'EXAM_DELETED',
      resource_type: 'exam',
      resource_id: examId,
    },
  });
  
  revalidatePath('/teacher/exams');
  return { success: true };
}

export async function duplicateExam(examId: string) {
  const session = await getServerSession(authOptions);
  if (!session || !['teacher', 'admin', 'super_admin'].includes(session.user.role)) {
    throw new Error('Unauthorized');
  }
  
  const tenantId = session.user.tenantId || (session.user as any).tenant_id;
  
  // Fetch the original exam with all data
  const original = await prisma.exams.findUnique({
    where: { 
      id: examId,
      tenant_id: tenantId,
      ...(session.user.role === 'teacher' ? { teacher_id: session.user.id } : {})
    },
    include: {
      exam_sections: {
        include: {
          exam_questions: true,
        },
      },
    },
  });
  
  if (!original) {
    throw new Error('Exam not found or unauthorized');
  }
  
  // Create a copy
  const copy = await prisma.exams.create({
    data: {
      tenant_id: tenantId,
      teacher_id: session.user.id,
      title: `${original.title} (Copy)`,
      description: original.description,
      exam_type: original.exam_type,
      pattern: original.pattern,
      duration_minutes: original.duration_minutes,
      total_marks: original.total_marks,
      passing_percentage: original.passing_percentage,
      start_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
      end_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + original.duration_minutes * 60 * 1000),
      shuffle_questions: original.shuffle_questions,
      shuffle_options: original.shuffle_options,
      allow_back_navigation: original.allow_back_navigation,
      show_results_immediately: original.show_results_immediately,
      require_webcam: original.require_webcam,
      full_screen_required: original.full_screen_required,
      disable_copy_paste: original.disable_copy_paste,
      instructions: original.instructions,
      instructions_html: original.instructions_html,
      show_instructions: original.show_instructions,
      require_acknowledgement: original.require_acknowledgement,
      is_published: false,
      is_active: true,
      metadata: original.metadata || {},
      exam_sections: {
        create: original.exam_sections.map((section: any) => ({
          tenant_id: tenantId,
          name: section.name,
          order_index: section.order_index,
          question_count: section.question_count,
          section_time_limit: section.section_time_limit,
          shuffle_questions: section.shuffle_questions,
          instructions: section.instructions,
          instructions_html: section.instructions_html,
          exam_questions: {
            create: section.exam_questions.map((eq: any) => ({
              tenant_id: tenantId,
              question_id: eq.question_id,
              order_index: eq.order_index,
            })),
          },
        })),
      },
    },
  });
  
  // Audit log
  await prisma.audit_logs.create({
    data: {
      tenant_id: tenantId,
      user_id: session.user.id,
      action: 'EXAM_DUPLICATED',
      resource_type: 'exam',
      resource_id: copy.id,
      old_values: { original_id: examId },
    },
  });
  
  revalidatePath('/teacher/exams');
  return { success: true, examId: copy.id };
}

export async function publishExam(examId: string) {
  const session = await getServerSession(authOptions);
  if (!session || !['admin', 'super_admin'].includes(session.user.role)) {
    throw new Error('Unauthorized');
  }
  
  const tenantId = session.user.tenantId || (session.user as any).tenant_id;
  
  await prisma.exams.update({
    where: { id: examId, tenant_id: tenantId },
    data: { is_published: true },
  });
  
  await prisma.audit_logs.create({
    data: {
      tenant_id: tenantId,
      user_id: session.user.id,
      action: 'EXAM_PUBLISHED',
      resource_type: 'exam',
      resource_id: examId,
    },
  });
  
  revalidatePath('/admin/exams');
  return { success: true };
}

export async function unpublishExam(examId: string) {
  const session = await getServerSession(authOptions);
  if (!session || !['admin', 'super_admin'].includes(session.user.role)) {
    throw new Error('Unauthorized');
  }
  
  const tenantId = session.user.tenantId || (session.user as any).tenant_id;
  
  await prisma.exams.update({
    where: { id: examId, tenant_id: tenantId },
    data: { is_published: false },
  });
  
  await prisma.audit_logs.create({
    data: {
      tenant_id: tenantId,
      user_id: session.user.id,
      action: 'EXAM_UNPUBLISHED',
      resource_type: 'exam',
      resource_id: examId,
    },
  });
  
  revalidatePath('/admin/exams');
  return { success: true };
}

export async function getPendingQuestionBanks() {
  const session = await getServerSession(authOptions);
  if (!session || !['admin', 'super_admin'].includes(session.user.role)) {
    throw new Error('Unauthorized');
  }
  
  const tenantId = session.user.tenantId || (session.user as any).tenant_id;
  
  const banks = await prisma.question_banks.findMany({
    where: {
      tenant_id: tenantId,
      is_published: false,
    },
    include: {
      users: { select: { full_name: true, email: true } },
      questions: {
        where: { is_active: true },
        select: { id: true },
      },
    },
    orderBy: { created_at: 'desc' },
  });
  
  return banks.map((bank) => ({
    id: bank.id,
    name: bank.name,
    subject: bank.subject,
    questionCount: bank.questions.length,
    teacherName: bank.users?.full_name || 'Unknown',
    teacherEmail: bank.users?.email,
    createdAt: bank.created_at ? bank.created_at.toISOString() : new Date().toISOString(),
    isPublished: bank.is_published,
  }));
}

export async function approveQuestionBank(bankId: string) {
  const session = await getServerSession(authOptions);
  if (!session || !['admin', 'super_admin'].includes(session.user.role)) {
    throw new Error('Unauthorized');
  }
  
  const tenantId = session.user.tenantId || (session.user as any).tenant_id;
  
  await prisma.question_banks.update({
    where: { id: bankId, tenant_id: tenantId },
    data: { is_published: true },
  });
  
  await prisma.audit_logs.create({
    data: {
      tenant_id: tenantId,
      user_id: session.user.id,
      action: 'QUESTION_BANK_APPROVED',
      resource_type: 'question_bank',
      resource_id: bankId,
    },
  });
  
  revalidatePath('/admin/banks');
  return { success: true };
}
