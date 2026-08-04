import { exportExcel } from '@/app/actions/results-actions';
import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const examId = url.searchParams.get('examId');
  
  if (!examId) {
    return Response.json({ error: 'Exam ID required' }, { status: 400 });
  }
  
  try {
    // The action returns a base64 encoded string to safely cross the Server Action boundary
    const base64Buffer = await exportExcel(examId);
    
    // Decode it back to a raw binary buffer for file streaming
    const buffer = Buffer.from(base64Buffer, 'base64');
    
    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename=results_${examId}_${new Date().toISOString().split('T')[0]}.xlsx`,
      },
    });
  } catch (error: any) {
    console.error("Excel Export Error:", error);
    return Response.json({ error: error.message || 'Failed to export results' }, { status: 500 });
  }
}
