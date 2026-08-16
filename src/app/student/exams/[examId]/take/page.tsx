import { prisma } from '@/lib/db/client';
import { getExamActor } from '@/lib/auth/exam-guest';
import { notFound, redirect } from 'next/navigation';
import { ExamInterfaceUI } from './ExamInterfaceUI';
import { serializeData } from '@/lib/utils/serialize';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ExamTakePage(
  props: {
    params: Promise<{ examId: string }>;
  }
) {
  const params = await props.params;
  const actor = await getExamActor();
  if (!actor) {
    redirect('/login');
  }

  const attemptId = params.examId;
  const studentId = actor.studentId;
  const tenantId = actor.tenantId;
  if (actor.guest && actor.guest.attemptId !== attemptId) notFound();

  // Fetch attempt with ALL required data
  const attempt = await prisma.exam_attempts.findUnique({
    where: {
      id: attemptId,
      student_id: studentId,
    },
    include: {
      exams: {
        include: {
          users: { select: { full_name: true } },
          exam_sections: {
            include: {
              exam_questions: {
                include: {
                  questions: true,
                },
                orderBy: { order_index: 'asc' },
              },
            },
            orderBy: { order_index: 'asc' },
          },
        },
      },
    },
  });

  if (!attempt || (actor.guest && (actor.guest.examId !== attempt.exam_id || actor.guest.tenantId !== attempt.tenant_id))) {
    notFound();
  }

  // Strictly block re-entry to completed or non-in_progress attempts
  if (attempt.status !== 'in_progress') {
    redirect(`/student/results/${attempt.exam_id}`);
  }

  const now = new Date();
  const exam = attempt.exams;

  // Auto-submit and block re-entry if end time is reached
  if (new Date(exam.end_time) < now) {
    await prisma.exam_attempts.update({
      where: { id: attemptId },
      data: {
        status: 'submitted',
        end_time: now,
      },
    });
    redirect(`/student/results/${exam.id}`);
  }

  if (attempt.exams) {
    (attempt.exams as any).sections = (attempt.exams as any).exam_sections.map((sec: any) => ({
      ...sec,
      exam_questions: (sec.exam_questions || []).map((eq: any) => ({
        ...eq,
        question: eq.questions,
      })),
    }));
  }

  // Fetch existing answers
  const answers = await prisma.answers.findMany({
    where: { attempt_id: attemptId },
  });

  // Fetch tenant branding and student data
  const [tenant, student] = await Promise.all([
    prisma.tenants.findUnique({
      where: { id: tenantId },
      select: {
        name: true,
        logo_url: true,
        primary_color: true,
        secondary_color: true,
        header_bg_color: true,
        footer_text: true,
        remove_branding: true,
      },
    }),
    prisma.users.findUnique({
      where: { id: studentId },
      select: {
        full_name: true,
        roll_number: true,
        email: true,
      },
    }),
  ]);

  const showCalculator = !!(exam?.metadata as any)?.allow_calculator;

  return (
    <ExamInterfaceUI
      attempt={serializeData(attempt)}
      exam={serializeData(exam)}
      initialAnswers={serializeData(answers)}
      tenant={tenant}
      student={student}
      showCalculator={showCalculator}
      studentId={studentId}
    />
  );
}
