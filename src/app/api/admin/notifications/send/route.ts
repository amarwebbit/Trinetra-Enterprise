import { prisma } from '@/lib/db/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    // Fix: allow admin AND super_admin roles
    if (!session || !['admin', 'super_admin'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { subject, message, channel: rawChannel, recipientType, targetId, recipientIds } = body;

    // DB check constraint only allows: email, sms, push, app, whatsapp
    // Map legacy 'in_app' -> 'app'
    const channel = rawChannel === 'in_app' ? 'app' : (rawChannel || 'app');


    if (!subject?.trim() || !message?.trim()) {
      return NextResponse.json({ error: 'Subject and message are required' }, { status: 400 });
    }

    const tenantId = session.user.tenantId || (session.user as any).tenant_id;

    // Build recipient filter based on recipientType
    let recipientFilter: any = {
      tenant_id: tenantId,
      role: 'student',
      is_active: true,
    };

    if (recipientIds && Array.isArray(recipientIds) && recipientIds.length > 0) {
      // Explicit list of user IDs provided
      recipientFilter = { id: { in: recipientIds }, tenant_id: tenantId };
    } else if (recipientType === 'department' && targetId) {
      recipientFilter.department_id = targetId;
    } else if (recipientType === 'course' && targetId) {
      // Find students enrolled in this course
      const enrollments = await prisma.enrollments.findMany({
        where: { course_id: targetId, tenant_id: tenantId },
        select: { student_id: true },
      });
      const studentIds = enrollments.map((e: any) => e.student_id).filter(Boolean);
      if (studentIds.length === 0) {
        return NextResponse.json({ success: true, recipientCount: 0, message: 'No students enrolled in this course' });
      }
      recipientFilter = { id: { in: studentIds }, tenant_id: tenantId };
    }
    // else recipientType === 'all' — use default filter above

    const recipients = await prisma.users.findMany({
      where: recipientFilter,
      select: { id: true },
    });

    if (recipients.length === 0) {
      return NextResponse.json({ success: true, recipientCount: 0, message: 'No matching recipients found' });
    }

    // Create notifications in DB
    await prisma.notifications.createMany({
      data: recipients.map((r: any) => ({
        tenant_id: tenantId,
        user_id: r.id,
        type: 'in_app',
        title: subject.trim(),
        content: message.trim(),
        channel: channel || 'app',
        is_sent: true,
        is_read: false,
        sent_at: new Date(),
        metadata: {
          sent_by: session.user.id,
          sent_by_role: session.user.role,
          recipient_type: recipientType || 'all',
        },
      })),
      skipDuplicates: true,
    });

    return NextResponse.json({
      success: true,
      recipientCount: recipients.length,
    });

  } catch (error: any) {
    console.error('Notification send error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to send notification' },
      { status: 500 }
    );
  }
}
