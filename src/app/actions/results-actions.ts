'use server';

import { prisma } from '@/lib/db/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { revalidatePath } from 'next/cache';
import ExcelJS from 'exceljs';

export async function getExamAnalytics(examId: string, tenantId: string) {
  const exam = await prisma.exams.findUnique({
    where: { id: examId, tenant_id: tenantId },
    include: {
      exam_attempts: {
        where: { status: { in: ['submitted', 'auto_submitted', 'force_submitted', 'evaluated', 'graded'] } },
        include: {
          users: {
            include: { departments_users_department_idTodepartments: true },
          },
        },
        orderBy: { end_time: 'desc' }
      },
      exam_sections: {
        include: {
          exam_questions: {
            include: { questions: true },
          },
        },
      },
    },
  });
  
  if (!exam) throw new Error('Exam not found');
  
  const attempts = exam.exam_attempts;
  const totalStudents = attempts.length;
  const passingPercentage = Number(exam.passing_percentage) || 40;
  
  // Pass rate
  const passed = attempts.filter(a => Number(a.percentage || 0) >= passingPercentage);
  const passRate = totalStudents > 0 ? (passed.length / totalStudents) * 100 : 0;
  
  // Average score
  const avgScore = totalStudents > 0 
    ? attempts.reduce((sum, a) => sum + Number(a.score || 0), 0) / totalStudents 
    : 0;
  
  // Score distribution
  const distribution = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((min, i) => {
    const max = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 100][i];
    const count = attempts.filter(a => Number(a.percentage || 0) >= min && Number(a.percentage || 0) < max).length;
    return { range: `${min}-${max}%`, count };
  }).filter(d => d.count > 0);
  
  // Top performers
  const topPerformers = [...attempts]
    .sort((a, b) => Number(b.percentage || 0) - Number(a.percentage || 0))
    .slice(0, 10)
    .map(a => ({
      name: a.users?.full_name || 'Unknown',
      rollNumber: a.users?.roll_number || 'N/A',
      score: Number(a.score || 0),
      percentage: Number(a.percentage || 0),
    }));
  
  return {
    exam,
    totalStudents,
    passRate: passRate.toFixed(1),
    avgScore: avgScore.toFixed(1),
    distribution,
    topPerformers,
    passedCount: passed.length,
    failedCount: totalStudents - passed.length,
    isPublished: exam.show_results_immediately,
  };
}

export async function getExamExportData(examId: string, tenantId: string) {
  const exam = await prisma.exams.findUnique({
    where: { id: examId, tenant_id: tenantId },
    include: {
      exam_attempts: {
        where: { status: { in: ['submitted', 'auto_submitted', 'force_submitted', 'evaluated', 'graded'] } },
        include: {
          users: {
            include: { departments_users_department_idTodepartments: true },
          },
          answers: {
            include: { questions: true },
          },
        },
        orderBy: { percentage: 'desc' },
      },
      exam_sections: {
        include: {
          exam_questions: {
            include: { questions: true },
          },
        },
      },
    },
  });
  
  if (!exam) throw new Error('Exam not found');
  
  const totalQuestions = exam.exam_sections.reduce(
    (sum, s) => sum + s.exam_questions.length,
    0
  );
  
  const exportRows = exam.exam_attempts.map((attempt, index) => {
    let correct = 0;
    let wrong = 0;
    let unattempted = 0;
    
    attempt.answers.forEach((answer) => {
      if (answer.is_correct === true) {
        correct++;
      } else if (answer.is_correct === false) {
        wrong++;
      } else {
        unattempted++;
      }
    });
    
    if (attempt.answers.length === 0) {
      unattempted = totalQuestions;
    }
    
    return {
      name: attempt.users?.full_name || 'N/A',
      rollNo: attempt.users?.roll_number || 'N/A',
      email: attempt.users?.email || 'N/A',
      branch: attempt.users?.departments_users_department_idTodepartments?.name || 'N/A',
      section: attempt.users?.metadata && typeof attempt.users.metadata === 'object' && 'section' in attempt.users.metadata 
        ? (attempt.users.metadata as any).section 
        : 'N/A',
      totalQue: totalQuestions,
      correct: correct,
      wrong: wrong,
      unattempt: unattempted,
      percentage: Number(attempt.percentage || 0),
      score: Number(attempt.score || 0),
      rank: index + 1,
    };
  });
  
  return {
    examTitle: exam.title,
    examDate: exam.end_time || new Date(),
    totalMarks: Number(exam.total_marks || 0),
    rows: exportRows,
    passingPercentage: Number(exam.passing_percentage || 40),
  };
}

export async function publishResults(examId: string, isPublished: boolean = true) {
  const session = await getServerSession(authOptions);
  if (!session || !['admin', 'super_admin'].includes(session.user.role)) {
    throw new Error('Unauthorized');
  }
  
  const exam = await prisma.exams.update({
    where: { id: examId, tenant_id: session.user.tenantId },
    data: { show_results_immediately: isPublished },
  });
  
  await prisma.audit_logs.create({
    data: {
      tenant_id: session.user.tenantId,
      user_id: session.user.id,
      action: isPublished ? 'RESULTS_PUBLISHED' : 'RESULTS_UNPUBLISHED',
      resource_type: 'exam',
      resource_id: examId,
    },
  });
  
  revalidatePath('/admin/results');
  revalidatePath(`/admin/results/${examId}`);
  revalidatePath('/teacher/results');
  return { success: true, exam };
}

export async function exportExcel(examId: string) {
  const session = await getServerSession(authOptions);
  if (!session || !['admin', 'super_admin'].includes(session.user.role)) {
    throw new Error('Unauthorized');
  }
  
  // Fetch exam data with attempts
  const exam = await prisma.exams.findUnique({
    where: { id: examId, tenant_id: session.user.tenantId },
    include: {
      exam_attempts: {
        where: { status: { in: ['submitted', 'auto_submitted', 'force_submitted', 'evaluated', 'graded'] } },
        include: {
          users: { include: { departments_users_department_idTodepartments: true } },
          answers: { include: { questions: true } },
        },
        orderBy: { percentage: 'desc' },
      },
    },
  });
  
  if (!exam) throw new Error('Exam not found');
  
  // Generate Excel data
  const excelData = exam.exam_attempts.map((attempt) => ({
    'Student Name': attempt.users?.full_name || 'N/A',
    'Roll Number': attempt.users?.roll_number || 'N/A',
    'Email': attempt.users?.email || 'N/A',
    'Department': attempt.users?.departments_users_department_idTodepartments?.name || 'N/A',
    'Score': Number(attempt.score || 0),
    'Total Marks': Number(exam.total_marks || 0),
    'Percentage': Number(attempt.percentage || 0),
    'Status': Number(attempt.percentage || 0) >= Number(exam.passing_percentage || 40) ? 'Pass' : 'Fail',
  }));
  
  // Create Excel workbook
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Results');
  
  if (excelData.length > 0) {
    const keys = Object.keys(excelData[0]);
    worksheet.columns = keys.map(key => ({ header: key, key, width: 20 }));
    excelData.forEach(row => worksheet.addRow(row));
    worksheet.getRow(1).font = { bold: true };
  }
  
  const buffer = await workbook.xlsx.writeBuffer();
  const base64 = Buffer.from(buffer).toString('base64');
  return base64;
}
