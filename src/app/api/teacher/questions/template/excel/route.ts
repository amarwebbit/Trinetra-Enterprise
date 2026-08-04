import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { generateQuestionTemplateExcel } from '@/lib/export/excel-importer';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !['teacher', 'admin', 'super_admin'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const excelBuffer = await generateQuestionTemplateExcel();
    return new NextResponse(new Uint8Array(excelBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="question_import_template.xlsx"',
      },
    });
  } catch (error: any) {
    console.error('Failed to generate Excel template:', error);
    return NextResponse.json({ error: 'Failed to generate template' }, { status: 500 });
  }
}
