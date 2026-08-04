'use server';

import { prisma } from '@/lib/db/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';

export async function createNotification(data: {
  userId: string;
  title: string;
  content: string;
  type: string;
  link?: string;
  tenantId?: string;
}) {
  const session = await getServerSession(authOptions);
  if (!session || !['teacher', 'admin', 'super_admin', 'student'].includes(session.user.role)) {
    throw new Error('Unauthorized');
  }

  // Get tenant ID either from session or explicitly provided (for super_admin crossing boundaries)
  const tenantId = data.tenantId || session.user.tenantId;

  if (!tenantId) {
    throw new Error('Tenant ID is required for creating a notification');
  }

  await prisma.notifications.create({
    data: {
      tenant_id: tenantId,
      user_id: data.userId,
      title: data.title,
      content: data.content,
      type: data.type,
      channel: 'app',
      is_read: false,
      is_sent: true,
      sent_at: new Date(),
      metadata: data.link ? { link: data.link } : {},
    },
  });
}

import { revalidatePath } from 'next/cache';

export async function sendGlobalNotification(data: {
  subject: string;
  message: string;
  channel: string;
  recipientIds?: string[];
  tenantIds?: string[];
  scheduleDate?: Date | null;
}) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'super_admin') {
    throw new Error('Unauthorized');
  }
  
  const recipients = data.recipientIds || await prisma.users.findMany({
    where: { role: 'admin', is_active: true },
    select: { id: true, email: true },
  });
  
  await prisma.notifications.createMany({
    data: recipients.map((r: any) => ({
      tenant_id: session.user.tenantId,
      user_id: r.id,
      type: 'admin_announcement',
      title: data.subject,
      content: data.message,
      channel: data.channel,
      is_sent: true,
      sent_at: new Date(),
    })),
  });
  
  await prisma.audit_logs.create({
    data: {
      tenant_id: session.user.tenantId,
      user_id: session.user.id,
      action: 'GLOBAL_NOTIFICATION_SENT',
      resource_type: 'notification',
      new_values: { subject: data.subject, count: recipients.length },
    },
  });
  
  revalidatePath('/super/notifications');
  return { success: true, recipientCount: recipients.length };
}

export async function retryNotification(notificationId: string) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'super_admin') {
    throw new Error('Unauthorized');
  }
  
  await prisma.notifications.update({
    where: { id: notificationId },
    data: { is_sent: true, sent_at: new Date() },
  });
  
  revalidatePath('/super/notifications');
  return { success: true };
}

export async function getNotificationTemplates() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'super_admin') {
    throw new Error('Unauthorized');
  }
  
  // Return predefined templates
  return [
    {
      id: 'maintenance',
      name: 'System Maintenance',
      subject: 'System Maintenance Notification',
      message: 'Dear Admins,\n\nWe will be performing scheduled maintenance on [date]. The system will be unavailable for [duration].\n\nRegards,\nSuper Admin Team',
    },
    {
      id: 'feature_update',
      name: 'Feature Update',
      subject: 'New Feature Available',
      message: 'Dear Admins,\n\nWe have released a new feature: [feature_name]. You can access it from your dashboard.\n\nRegards,\nSuper Admin Team',
    },
  ];
}
