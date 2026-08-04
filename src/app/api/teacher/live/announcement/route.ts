import { prisma } from '@/lib/db/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !['teacher', 'admin', 'super_admin'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const body = await req.json();
  const { examId, message } = body;
  const tenantId = session.user.tenantId || (session.user as any).tenant_id;
  
  // ✅ Get all active attempts for this exam
  const activeAttempts = await prisma.exam_attempts.findMany({
    where: {
      exam_id: examId,
      status: 'in_progress',
    },
    select: { student_id: true },
  });
  
  if (activeAttempts.length === 0) {
    return NextResponse.json({ 
      success: true, 
      message: 'No active students to notify' 
    });
  }
  
  // ✅ Create notifications for all active students
  await prisma.notifications.createMany({
    data: activeAttempts.map(a => ({
      tenant_id: tenantId,
      user_id: a.student_id as string,
      type: 'in_app',
      title: '📢 Announcement from Teacher',
      content: message,
      channel: 'app',
      is_read: false,
      is_sent: true,
      sent_at: new Date(),
    })),
  });
  
  // ✅ Log audit
  await prisma.audit_logs.create({
    data: {
      tenant_id: tenantId,
      user_id: session.user.id,
      action: 'SEND_ANNOUNCEMENT',
      resource_type: 'exam',
      resource_id: examId,
      metadata: { 
        message: message.substring(0, 100),
        studentCount: activeAttempts.length,
      },
    },
  });
  
  return NextResponse.json({ 
    success: true, 
    studentCount: activeAttempts.length 
  });
}
