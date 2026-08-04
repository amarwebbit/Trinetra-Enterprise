import { prisma } from '@/lib/db/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session || !['admin', 'super_admin'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const examId = searchParams.get('examId');
  const format = searchParams.get('format') || 'csv';
  
  if (!examId) {
    return NextResponse.json({ error: 'Exam ID is required' }, { status: 400 });
  }
  
  const tenantId = session.user.tenantId || (session.user as any).tenant_id;

  // Verify the exam belongs to the tenant
  const exam = await prisma.exams.findFirst({
    where: { id: examId, tenant_id: tenantId },
  });

  if (!exam) {
    return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
  }

  // Fetch all attempts with student info
  const attempts = await prisma.exam_attempts.findMany({
    where: { exam_id: examId, status: 'evaluated' },
    include: {
      users: { select: { full_name: true, roll_number: true, email: true } }
    },
    orderBy: { score: 'desc' }
  });

  // Transform data for export
  const exportData = attempts.map(attempt => ({
    'Student Name': attempt.users?.full_name || 'N/A',
    'Roll Number': attempt.users?.roll_number || 'N/A',
    'Email': attempt.users?.email || 'N/A',
    'Score': attempt.score || 0,
    'Status': attempt.status,
    'Started At': attempt.start_time ? new Date(attempt.start_time).toLocaleString() : 'N/A',
    'Submitted At': attempt.end_time ? new Date(attempt.end_time).toLocaleString() : 'N/A'
  }));

  if (exportData.length === 0) {
    // Add dummy row if no data so file isn't empty
    exportData.push({
      'Student Name': 'No data',
      'Roll Number': 'No data',
      'Email': 'No data',
      'Score': 0,
      'Status': 'No data',
      'Started At': 'No data',
      'Submitted At': 'No data'
    });
  }

  // Log export action
  await prisma.audit_logs.create({
    data: {
      tenant_id: tenantId,
      user_id: session.user.id,
      action: 'BULK_RESULTS_EXPORT',
      resource_type: 'exam',
      resource_id: examId,
      metadata: { format, recordsProcessed: attempts.length }
    }
  });

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Results');
  
  if (exportData.length > 0) {
    const keys = Object.keys(exportData[0]);
    worksheet.columns = keys.map(key => ({ header: key, key, width: 20 }));
    exportData.forEach(row => worksheet.addRow(row));
    worksheet.getRow(1).font = { bold: true };
  }

  if (format === 'csv') {
    const csvBuffer = await workbook.csv.writeBuffer();
    return new NextResponse(new Uint8Array(csvBuffer as unknown as ArrayBuffer), {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="results-${exam.title.replace(/\s+/g, '-')}.csv"`
      }
    });
  } else {
    // default to excel
    const excelBuffer = await workbook.xlsx.writeBuffer();
    return new NextResponse(new Uint8Array(excelBuffer as unknown as ArrayBuffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="results-${exam.title.replace(/\s+/g, '-')}.xlsx"`
      }
    });
  }
}
