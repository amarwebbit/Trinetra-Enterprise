import { getExamActor } from '@/lib/auth/exam-guest';
import { prisma } from '@/lib/db/client';
import { generateStudentResultExcel } from '@/lib/export/excel-generator';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const examId = url.searchParams.get('examId');
  
  if (!examId) {
    return Response.json({ error: 'Exam ID required' }, { status: 400 });
  }
  
  const actor = await getExamActor();
  if (!actor) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Fetch attempt and tenant data - REAL data only
  const attempt = await prisma.exam_attempts.findFirst({
    where: {
      exam_id: examId,
      student_id: actor.studentId,
    },
    include: {
      exams: true,
      users: true,
      answers: { include: { questions: true } },
    },
  });
  
  if (!attempt) {
    return Response.json({ error: 'Attempt not found' }, { status: 404 });
  }
  
  const tenant = await prisma.tenants.findUnique({
    where: { id: actor.tenantId },
    select: { name: true },
  });
  
  const passingPercentage = attempt.exams.passing_percentage ? Number(attempt.exams.passing_percentage) : 40;
  
  const mappedAnswers = attempt.answers.map((ans: any) => ({
    ...ans,
    question: ans.questions
  }));

  // Prepare data for Excel
  const data = {
    tenantName: tenant?.name || 'Institution',
    examTitle: attempt.exams.title,
    examDate: attempt.end_time || new Date(),
    studentName: attempt.users.full_name || 'Student',
    rollNumber: (attempt.users as any).roll_number || 'N/A',
    score: attempt.score ? Number(attempt.score) : 0,
    totalMarks: attempt.exams.total_marks ? Number(attempt.exams.total_marks) : 0,
    percentage: attempt.percentage ? Number(attempt.percentage) : 0,
    passingPercentage: passingPercentage,
    passed: (attempt.percentage ? Number(attempt.percentage) : 0) >= passingPercentage,
    correct: attempt.answers.filter(a => a.is_correct).length,
    wrong: attempt.answers.filter(a => a.is_correct === false).length,
    unattempted: attempt.answers.length - attempt.answers.filter(a => a.is_correct !== null).length,
    answers: mappedAnswers,
  };
  
  // Generate Excel
  const buffer = await generateStudentResultExcel(data);
  
  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="result_${examId}.xlsx"`,
    },
  });
}
