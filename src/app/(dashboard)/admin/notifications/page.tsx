import { prisma } from '@/lib/db/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { redirect } from 'next/navigation';
import NotificationsUI from './NotificationsUI';

export const dynamic = 'force-dynamic';

export default async function AdminNotificationsPage() {
  const session = await getServerSession(authOptions);
  
  if (!session || !['admin', 'super_admin'].includes(session.user.role)) {
    redirect('/login');
  }
  
  const tenantId = session.user.tenantId || (session.user as any).tenant_id;
  
  // 1. Fetch Sent Notifications
  const notifications = await prisma.notifications.findMany({
    where: { tenant_id: tenantId },
    include: {
      users: { select: { full_name: true, email: true } },
    },
    orderBy: { created_at: 'desc' },
    take: 20,
  });
  
  // 2. Fetch Notification Stats
  const [total, sent, failed, read] = await Promise.all([
    prisma.notifications.count({ where: { tenant_id: tenantId } }),
    prisma.notifications.count({ where: { tenant_id: tenantId, is_sent: true } }),
    prisma.notifications.count({ where: { tenant_id: tenantId, is_sent: false } }),
    prisma.notifications.count({ where: { tenant_id: tenantId, is_read: true } }),
  ]);
  
const DEFAULT_SYSTEM_TEMPLATES = [
  { id: 'exam-schedule', name: 'Exam Schedule Alert', channel: 'app', title: 'Upcoming Exam Scheduled', content: 'Dear student, your exam has been scheduled. Please check your dashboard for details.' },
  { id: 'result-published', name: 'Results Published', channel: 'app', title: 'Exam Results Available', content: 'Your recent exam result is now available to view under your dashboard results tab.' },
  { id: 'system-maintenance', name: 'System Maintenance', channel: 'app', title: 'Scheduled System Maintenance', content: 'The platform will undergo scheduled maintenance. Please save your work.' },
];

  // Fetch Tenant Settings (Templates)
  const tenant = await prisma.tenants.findUnique({
    where: { id: tenantId },
    select: { 
      module_settings: true,
    },
  });

  const templates = (tenant?.module_settings as any)?.templates || DEFAULT_SYSTEM_TEMPLATES;
  
  // 4. Fetch available courses and departments for targeted sending
  const [courses, departments] = await Promise.all([
    prisma.courses.findMany({ where: { tenant_id: tenantId }, select: { id: true, name: true } }),
    prisma.departments.findMany({ where: { tenant_id: tenantId }, select: { id: true, name: true } })
  ]);

  return (
    <NotificationsUI 
      notifications={notifications}
      stats={{
        total,
        sent,
        failed,
        read,
        templateCount: templates.length || 0,
      }}
      courses={courses}
      departments={departments}
      templates={templates}
    />
  );
}
