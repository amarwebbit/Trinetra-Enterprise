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
  
  // 3. Fetch Tenant Settings (Templates)
  const tenant = await prisma.tenants.findUnique({
    where: { id: tenantId },
    select: { 
      module_settings: true, // Assuming templates are stored in JSON settings if not specific columns
    },
  });

  // Mock template count if not explicitly found in schema
  const templates = (tenant?.module_settings as any)?.templates || [];
  
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
