import { prisma } from '@/lib/db/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { notFound, redirect } from 'next/navigation';
import { InstructionsUI } from './InstructionsUI';
import { WaitingRoomUI } from './WaitingRoomUI';
import { serializeData } from '@/lib/utils/serialize';

export const dynamic = 'force-dynamic';

export default async function ExamInstructionsPage(
  props: {
    params: Promise<{ examId: string }>;
  }
) {
  const params = await props.params;
  const session = await getServerSession(authOptions);

  if (!session || !['student', 'admin', 'super_admin'].includes(session.user.role)) {
    redirect('/login');
  }

  const { examId } = params;
  const studentId = session.user.id;
  const tenantId = session.user.tenantId || (session.user as any).tenant_id;

  // Fetch exam with all required data - REAL data only
  const dbExam = await prisma.exams.findUnique({
    where: {
      id: examId,
      tenant_id: tenantId,
      is_published: true,
      is_active: true,
    },
    include: {
      users: { select: { full_name: true } },
      exam_sections: {
        include: {
          _count: { select: { exam_questions: true } },
        },
        orderBy: { order_index: 'asc' },
      },
      exam_attempts: {
        where: { student_id: studentId },
        select: { id: true, status: true },
      },
    },
  });

  if (!dbExam) {
    notFound();
  }

  const exam = {
    ...dbExam,
    sections: dbExam.exam_sections
  };

  // Check if exam is available
  const now = new Date();
  const isStarted = new Date(exam.start_time) <= now;
  const isEnded = new Date(exam.end_time) <= now;
  const isAvailable = isStarted && !isEnded;
  const hasAttempted = exam.exam_attempts.length > 0;

  // If exam has ended and no attempt, redirect to exams list
  if (isEnded && !hasAttempted) {
    redirect('/student/exams');
  }

  // If exam hasn't started yet — show waiting room with countdown
  if (!isStarted && !hasAttempted) {
    const tenant = await prisma.tenants.findUnique({
      where: { id: tenantId },
      select: { name: true, logo_url: true, primary_color: true },
    });
    const totalQuestions = exam.sections.reduce(
      (sum, s) => sum + s._count.exam_questions, 0
    );
    const studentRecord = await prisma.users.findUnique({
      where: { id: studentId },
      select: { full_name: true },
    });
    return (
      <WaitingRoomUI
        exam={serializeData(exam)}
        tenant={tenant}
        totalQuestions={totalQuestions}
        studentName={studentRecord?.full_name || 'Student'}
      />
    );
  }

  if (hasAttempted && exam.exam_attempts[0].status !== 'in_progress') {
    redirect(`/student/results/${examId}`);
  } else if (hasAttempted && exam.exam_attempts[0].status === 'in_progress') {
    // If they already started it, send them straight into the exam
    redirect(`/student/exams/${exam.exam_attempts[0].id}/take`);
  }

  // ✅ Check show_instructions from database model, fallback to metadata
  const showInstructions = exam.show_instructions !== null 
    ? exam.show_instructions 
    : (exam.metadata as any)?.show_instructions !== false;

  if (!showInstructions) {
    // Create attempt and redirect directly to exam, skipping instructions
    const attempt = await prisma.exam_attempts.create({
      data: {
        tenant_id: tenantId,
        exam_id: examId,
        student_id: studentId,
        start_time: new Date(),
        status: 'in_progress',
      },
    });

    // Audit log
    await prisma.audit_logs.create({
      data: {
        tenant_id: tenantId,
        user_id: studentId,
        action: 'EXAM_STARTED',
        resource_type: 'exam_attempt',
        resource_id: attempt.id,
      },
    });

    redirect(`/student/exams/${attempt.id}/take`);
  }

  // Fetch tenant branding for white-label
  const tenant = await prisma.tenants.findUnique({
    where: { id: tenantId },
    select: {
      name: true,
      logo_url: true,
      primary_color: true,
    },
  });

  // Calculate total marks and questions
  const totalQuestions = exam.sections.reduce(
    (sum, s) => sum + s._count.exam_questions,
    0
  );

  const totalMarks = exam.total_marks ? Number(exam.total_marks) : 0;

  return (
    <InstructionsUI
      exam={serializeData(exam)}
      tenant={tenant}
      totalQuestions={totalQuestions}
      totalMarks={totalMarks}
      studentId={studentId}
    />
  );
}
