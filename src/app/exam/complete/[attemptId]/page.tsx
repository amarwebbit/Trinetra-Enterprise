import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/db/client';
import { getExamActor } from '@/lib/auth/exam-guest';

export default async function ExamCompletionPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const actor = await getExamActor();
  if (!actor) redirect('/login');
  const { attemptId } = await params;
  if (actor.guest && actor.guest.attemptId !== attemptId) notFound();
  const attempt = await prisma.exam_attempts.findFirst({ where: { id: attemptId, student_id: actor.studentId, tenant_id: actor.tenantId }, include: { exams: { select: { title: true, show_results_immediately: true } } } });
  if (!attempt || (actor.guest && actor.guest.examId !== attempt.exam_id)) notFound();
  const published = Boolean(attempt.exams.show_results_immediately) || attempt.status === 'evaluated' || attempt.status === 'graded';
  return <main className="min-h-screen bg-slate-50 p-6 flex items-center justify-center"><section className="w-full max-w-lg bg-white border shadow-sm p-8 text-center"><h1 className="text-2xl font-bold">{attempt.exams.title}</h1><p className="mt-4 text-slate-600">Your assessment has been submitted successfully.</p>{published ? <div className="mt-6 rounded border border-emerald-200 bg-emerald-50 p-5"><p className="text-sm text-emerald-800">Score</p><p className="text-3xl font-bold text-emerald-700">{Number(attempt.score || 0)} / {Number(attempt.total_marks || 0)}</p><p className="mt-2 text-sm text-emerald-800">{Number(attempt.percentage || 0).toFixed(1)}%</p></div> : <p className="mt-6 text-sm text-slate-500">Your instructor will publish the result later.</p>}</section></main>;
}
