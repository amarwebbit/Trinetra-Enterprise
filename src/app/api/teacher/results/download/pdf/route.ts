import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db/client';
import { getExamExportData } from '@/app/actions/results-actions';
import { generateResultsPDF } from '@/lib/export/pdf-generator';

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
    
    // Get tenant branding
    const tenant = await prisma.tenants.findUnique({
      where: { id: tenantId },
      select: {
        name: true,
        logo_url: true,
        primary_color: true,
        secondary_color: true,
        subscription_plan: true,
      },
    });
    
    // Get export data
    const exportData = await getExamExportData(examId, tenantId);
    
    // Generate PDF
    const doc = await generateResultsPDF({
      tenantName: tenant?.name || 'Institution',
      logoUrl: tenant?.logo_url || undefined,
      primaryColor: tenant?.primary_color || '#2563EB',
      secondaryColor: tenant?.secondary_color || '#7C3AED',
      examTitle: exportData.examTitle,
      examDate: exportData.examDate,
      rows: exportData.rows,
      totalMarks: exportData.totalMarks,
      passingPercentage: exportData.passingPercentage,
      showPoweredBy: tenant?.subscription_plan === 'enterprise' ? false : true,
    });
    
    const pdfArrayBuffer = doc.output('arraybuffer');
    const buffer = Buffer.from(pdfArrayBuffer);
    
    // Log audit asynchronously
    try {
      await prisma.audit_logs.create({
        data: {
          tenant_id: tenantId,
          user_id: session.user.id,
          action: 'RESULTS_EXPORT_PDF',
          resource_type: 'exam',
          resource_id: examId,
        },
      });
    } catch (auditErr) {
      console.warn("Audit log creation skipped:", auditErr);
    }
    
    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="results_${examId}.pdf"`,
        'Content-Length': buffer.length.toString(),
      },
    });
  } catch (error: any) {
    console.error("PDF generation error detail:", error);
    return Response.json({ error: error?.message || 'PDF generation failed' }, { status: 500 });
  }
}
