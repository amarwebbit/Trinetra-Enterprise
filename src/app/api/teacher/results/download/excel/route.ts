import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db/client';
import { getExamExportData } from '@/app/actions/results-actions';
import { generateResultsExcel } from '@/lib/export/excel-generator';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const examId = url.searchParams.get('examId');
    
    if (!examId) {
      return Response.json({ error: 'Exam ID required' }, { status: 400 });
    }
    
    const session = await getServerSession(authOptions);
    if (!session || !['teacher', 'admin', 'super_admin'].includes(session.user.role)) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const tenantId = session.user.tenantId || (session.user as any).tenant_id;
    
    // Get tenant name for white-label
    const tenant = await prisma.tenants.findUnique({
      where: { id: tenantId },
      select: { name: true },
    });
    
    // Get export data
    const exportData = await getExamExportData(examId, tenantId);
    
    // Generate Excel
    const buffer = await generateResultsExcel({
      tenantName: tenant?.name || 'Institution',
      examTitle: exportData.examTitle,
      examDate: exportData.examDate,
      rows: exportData.rows,
      totalMarks: exportData.totalMarks,
    });
    
    // Log audit asynchronously
    try {
      await prisma.audit_logs.create({
        data: {
          tenant_id: tenantId,
          user_id: session.user.id,
          action: 'RESULTS_EXPORT_EXCEL',
          resource_type: 'exam',
          resource_id: examId,
        },
      });
    } catch (auditErr) {
      console.warn("Audit log creation skipped:", auditErr);
    }
    
    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="results_${examId}.xlsx"`,
        'Content-Length': buffer.length.toString(),
      },
    });
  } catch (error: any) {
    console.error("Excel generation error detail:", error);
    return Response.json({ error: error?.message || 'Excel generation failed' }, { status: 500 });
  }
}
