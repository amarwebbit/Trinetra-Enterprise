'use server';

import { prisma } from '@/lib/db/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { revalidatePath } from 'next/cache';
import { serializeData } from '@/lib/utils/serialize';

export async function createQuestion(data: FormData) {
  const session = await getServerSession(authOptions);
  if (!session || !['teacher', 'admin', 'super_admin'].includes(session.user.role)) {
    throw new Error('Unauthorized');
  }

  const tenantId = session.user.tenantId || (session.user as any).tenant_id;
  
  // Parse fields
  const question_text = data.get('question_text') as string;
  const optionsStr = data.get('options') as string;
  const options = optionsStr ? JSON.parse(optionsStr) : null;
  const imagesStr = data.get('images') as string;
  const images = imagesStr ? JSON.parse(imagesStr) : [];
  
  const negativeMarksEnabled = data.get('negative_marks_enabled') === 'true';
  const negativeMarksValue = parseFloat(data.get('negative_marks_value') as string || '0.25');
  const marks = parseFloat(data.get('marks') as string || '1');

  let bank_id = data.get('bank_id') ? (data.get('bank_id') as string) : null;

  if (!bank_id && session.user.role === 'teacher') {
    const defaultBank = await prisma.question_banks.findFirst({
      where: {
        tenant_id: tenantId,
        teacher_id: session.user.id,
      },
    });

    if (defaultBank) {
      bank_id = defaultBank.id;
    } else {
      const newBank = await prisma.question_banks.create({
        data: {
          tenant_id: tenantId,
          teacher_id: session.user.id,
          name: 'Default Question Bank',
          subject: 'General',
          description: 'Auto-created default bank for my questions',
        },
      });
      bank_id = newBank.id;
    }
  }

  const natAnswer = data.get('nat_answer') as string | null;
  const natTolerance = parseFloat(data.get('nat_tolerance') as string || '0');

  const question = await prisma.questions.create({
    data: {
      tenant_id: tenantId,
      bank_id: bank_id,
      type: data.get('type') as string,
      question_text: question_text,
      options: options,
      correct_answer: data.get('type') === 'nat' ? natAnswer : data.get('correct_answer') as string,
      marks: marks,
      // Map negative marks value to schema (0.0 if disabled)
      negative_marks: negativeMarksEnabled ? negativeMarksValue : 0.0,
      difficulty: data.get('difficulty') as string,
      topic: data.get('topic') as string,
      topic_id: data.get('topic_id') ? (data.get('topic_id') as string) : null,
      is_active: true,
      metadata: { 
        images: images,
        negative_marks_enabled: negativeMarksEnabled,
        negative_marks_value: negativeMarksValue,
        nat_tolerance: data.get('type') === 'nat' ? natTolerance : undefined,
      },
    },
  });

  await prisma.audit_logs.create({
    data: {
      tenant_id: tenantId,
      user_id: session.user.id,
      action: 'QUESTION_CREATED',
      resource_type: 'questions',
      resource_id: question.id,
      new_values: {
        type: question.type,
        marks: question.marks,
        negative_marks_enabled: negativeMarksEnabled,
        negative_marks_value: negativeMarksValue,
      },
    },
  });

  revalidatePath('/teacher/questions');
  return { success: true, question: serializeData(question) };
}

export async function updateQuestion(id: string, data: FormData) {
  const session = await getServerSession(authOptions);
  if (!session || !['teacher', 'admin', 'super_admin'].includes(session.user.role)) {
    throw new Error('Unauthorized');
  }

  const tenantId = session.user.tenantId || (session.user as any).tenant_id;

  // Parse fields
  const type = data.get('type') as string;
  const question_text = data.get('question_text') as string;
  const optionsStr = data.get('options') as string;
  const options = optionsStr ? JSON.parse(optionsStr) : null;
  
  const negativeMarksEnabled = data.get('negative_marks_enabled') === 'true';
  const negativeMarksValue = parseFloat(data.get('negative_marks_value') as string || '0.25');
  const marks = parseFloat(data.get('marks') as string || '1');
  const bank_id = data.get('bank_id') ? (data.get('bank_id') as string) : null;
  const topic_id = data.get('topic_id') ? (data.get('topic_id') as string) : null;
  const natAnswer = data.get('nat_answer') as string | null;
  const natTolerance = parseFloat(data.get('nat_tolerance') as string || '0');

  // Fetch current metadata to preserve images and metadata
  const currentQ = await prisma.questions.findUnique({ where: { id, tenant_id: tenantId } });
  if (!currentQ) throw new Error("Question not found");

  const newMetadata = {
    ...(currentQ.metadata as object || {}),
    negative_marks_enabled: negativeMarksEnabled,
    negative_marks_value: negativeMarksValue,
    nat_tolerance: type === 'nat' ? natTolerance : undefined,
  };

  const question = await prisma.questions.update({
    where: { id },
    data: {
      type: type || currentQ.type,
      bank_id: bank_id,
      question_text: question_text,
      options: options,
      correct_answer: type === 'nat' ? natAnswer : (data.get('correct_answer') as string),
      marks: marks,
      negative_marks: negativeMarksEnabled ? negativeMarksValue : 0.0,
      difficulty: data.get('difficulty') as string,
      topic: data.get('topic') as string,
      topic_id: topic_id,
      metadata: newMetadata,
    },
  });

  await prisma.audit_logs.create({
    data: {
      tenant_id: tenantId,
      user_id: session.user.id,
      action: 'QUESTION_UPDATED',
      resource_type: 'questions',
      resource_id: question.id,
      new_values: {
        type: question.type,
        marks: question.marks,
        negative_marks_enabled: negativeMarksEnabled,
        negative_marks_value: negativeMarksValue,
      },
    },
  });

  revalidatePath('/teacher/questions');
  return { success: true, question: serializeData(question) };
}

export async function createQuestionBank(name: string, subject = 'General', description = '') {
  const session = await getServerSession(authOptions);
  if (!session || !['teacher', 'admin', 'super_admin'].includes(session.user.role)) {
    throw new Error('Unauthorized');
  }

  const tenantId = session.user.tenantId || (session.user as any).tenant_id;
  const bank = await prisma.question_banks.create({
    data: {
      tenant_id: tenantId,
      teacher_id: session.user.id,
      name: name.trim(),
      subject: subject.trim(),
      description: description.trim(),
    },
  });

  revalidatePath('/teacher/questions');
  return { success: true, bank: serializeData(bank) };
}

export async function updateQuestionBank(bankId: string, name: string) {
  const session = await getServerSession(authOptions);
  if (!session || !['teacher', 'admin', 'super_admin'].includes(session.user.role)) {
    throw new Error('Unauthorized');
  }

  const tenantId = session.user.tenantId || (session.user as any).tenant_id;
  
  const existing = await prisma.question_banks.findFirst({
    where: { id: bankId }
  });

  let bank;
  if (existing) {
    bank = await prisma.question_banks.update({
      where: { id: bankId },
      data: { name: name.trim(), updated_at: new Date() },
    });
  } else {
    bank = await prisma.question_banks.create({
      data: {
        tenant_id: tenantId,
        teacher_id: session.user.id,
        name: name.trim(),
        subject: 'General',
        description: 'Question Bank',
      },
    });
  }

  revalidatePath('/teacher/questions');
  return { success: true, bank: serializeData(bank) };
}

export async function deleteQuestionBank(bankId: string) {
  const session = await getServerSession(authOptions);
  if (!session || !['teacher', 'admin', 'super_admin'].includes(session.user.role)) {
    throw new Error('Unauthorized');
  }

  const tenantId = session.user.tenantId || (session.user as any).tenant_id;
  
  // Unlink questions or soft delete bank
  await prisma.questions.updateMany({
    where: { bank_id: bankId, tenant_id: tenantId },
    data: { bank_id: null }
  });

  await prisma.question_banks.delete({
    where: { id: bankId }
  });

  revalidatePath('/teacher/questions');
  return { success: true };
}

export async function getQuestionBanks() {
  const session = await getServerSession(authOptions);
  if (!session || !['teacher', 'admin', 'super_admin'].includes(session.user.role)) {
    throw new Error('Unauthorized');
  }

  const tenantId = session.user.tenantId || (session.user as any).tenant_id;
  const banks = await prisma.question_banks.findMany({
    where: {
      tenant_id: tenantId,
      OR: [
        { teacher_id: session.user.id },
        { is_shared: true }
      ]
    },
    include: {
      _count: { select: { questions: { where: { is_active: true } } } }
    },
    orderBy: { created_at: 'asc' }
  });

  return { success: true, banks: serializeData(banks) };
}

export async function deleteQuestion(id: string) {
  const session = await getServerSession(authOptions);
  if (!session || !['teacher', 'admin', 'super_admin'].includes(session.user.role)) {
    throw new Error('Unauthorized');
  }
  
  const tenantId = session.user.tenantId || (session.user as any).tenant_id;

  await prisma.questions.update({
    where: { id, tenant_id: tenantId },
    data: { is_active: false }
  });

  await prisma.audit_logs.create({
    data: {
      tenant_id: tenantId,
      user_id: session.user.id,
      action: 'QUESTION_DELETED',
      resource_type: 'questions',
      resource_id: id,
    },
  });

  revalidatePath('/teacher/questions');
  return { success: true };
}

export async function getQuestionsByBank(bankId: string) {
  const session = await getServerSession(authOptions);
  if (!session || !['teacher', 'admin', 'super_admin'].includes(session.user.role)) {
    throw new Error('Unauthorized');
  }
  const tenantId = session.user.tenantId || (session.user as any).tenant_id;
  const questions = await prisma.questions.findMany({
    where: {
      tenant_id: tenantId,
      bank_id: bankId,
      is_active: true,
    },
    select: {
      id: true,
      type: true,
      question_text: true,
      marks: true,
      difficulty: true,
      topic: true,
      topic_id: true,
      options: true,
      correct_answer: true,
      topics: { select: { id: true, name: true } },
    },
    orderBy: { created_at: 'desc' },
  });
  return { success: true, questions: serializeData(questions) };
}

import { parseQuestionsFromExcel } from '@/lib/export/excel-importer';

export async function importQuestionsFromJSON(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session || !['teacher', 'admin', 'super_admin'].includes(session.user.role)) {
    throw new Error('Unauthorized');
  }
  
  const tenantId = session.user.tenantId || (session.user as any).tenant_id;
  const file = formData.get('file') as File;

  // Resolve target question bank for teacher
  let targetBankId: string | null = null;
  if (session.user.role === 'teacher') {
    const defaultBank = await prisma.question_banks.findFirst({
      where: {
        tenant_id: tenantId,
        teacher_id: session.user.id,
      },
    });

    if (defaultBank) {
      targetBankId = defaultBank.id;
    } else {
      const newBank = await prisma.question_banks.create({
        data: {
          tenant_id: tenantId,
          teacher_id: session.user.id,
          name: 'Default Question Bank',
          subject: 'General',
          description: 'Default question bank for imported questions',
        },
      });
      targetBankId = newBank.id;
    }

    // Assign any existing unlinked questions to this bank
    await prisma.questions.updateMany({
      where: { tenant_id: tenantId, bank_id: null },
      data: { bank_id: targetBankId },
    });
  }

  const normalizeCorrectAnswer = (val: any): string | null => {
    if (val === null || val === undefined) return null;
    if (Array.isArray(val)) return val.join(',');
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
  };
  
  if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const parseResult = await parseQuestionsFromExcel(buffer);
    
    if (!parseResult.success || parseResult.questions.length === 0) {
      throw new Error(parseResult.errors.join(' ') || 'No valid questions found in Excel file');
    }

    const validatedQuestions = parseResult.questions.map((q: any) => ({
      tenant_id: tenantId,
      bank_id: targetBankId,
      type: q.type,
      question_text: q.question_text,
      options: q.options || {},
      correct_answer: normalizeCorrectAnswer(q.correct_answer),
      marks: Number(q.marks) || 1,
      negative_marks: Number(q.negative_marks) || 0,
      difficulty: q.difficulty || 'medium',
      topic: q.topic || 'General',
      is_active: true,
      metadata: {
        imported_from: 'excel',
      },
    }));

    const result = await prisma.questions.createMany({
      data: validatedQuestions,
    });

    await prisma.audit_logs.create({
      data: {
        tenant_id: tenantId,
        user_id: session.user.id,
        action: 'QUESTIONS_IMPORTED_EXCEL',
        resource_type: 'questions',
        new_values: { count: result.count },
      },
    });

    revalidatePath('/teacher/questions');
    return { success: true, count: result.count };
  }

  const content = await file.text();
  const parsed = JSON.parse(content);
  const questions = parsed.questions || parsed; // Support both {questions: [...]} and [...]

  // Validate each question
  const validatedQuestions = questions.map((q: any) => {
    return {
      tenant_id: tenantId,
      bank_id: targetBankId,
      type: q.type,
      question_text: q.question_text,
      options: q.options || {},
      correct_answer: normalizeCorrectAnswer(q.correct_answer),
      marks: Number(q.marks) || 1,
      negative_marks: Number(q.negative_marks) || 0,
      difficulty: q.difficulty || 'medium',
      topic: q.topic || 'General',
      is_active: true,
      metadata: {
        images: q.images || [],
      },
    };
  });
  
  // Create all questions
  const result = await prisma.questions.createMany({
    data: validatedQuestions,
  });
  
  // Audit log
  await prisma.audit_logs.create({
    data: {
      tenant_id: tenantId,
      user_id: session.user.id,
      action: 'QUESTIONS_IMPORTED_JSON',
      resource_type: 'questions',
      new_values: { count: result.count },
    },
  });
  
  revalidatePath('/teacher/questions');
  return { success: true, count: result.count };
}
