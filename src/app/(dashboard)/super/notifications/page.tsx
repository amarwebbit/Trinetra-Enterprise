import React from 'react';
import { prisma } from '@/lib/db/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { redirect } from 'next/navigation';
import NotificationsUI from './NotificationsUI';
import { getNotificationTemplates } from '@/app/actions/notification-actions';

export const dynamic = 'force-dynamic';

export default async function SuperAdminNotificationsPage(
  props: {
    searchParams: Promise<{ page?: string }>
  }
) {
  const searchParams = await props.searchParams;
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'super_admin') {
    redirect('/login');
  }

  const page = parseInt(searchParams.page || '1');
  const pageSize = 20;

  // 1. Fetch All Tenant Admins (for the recipient selector)
  const admins = await prisma.users.findMany({
    where: { 
      role: 'admin', 
      is_active: true,
    },
    include: {
      tenants: { 
        select: { 
          id: true,
          name: true, 
        } 
      },
    },
    orderBy: { tenants: { name: 'asc' } },
  });

  // Unique tenants from the admins
  const uniqueTenants = Array.from(new Map(
    admins.filter(a => a.tenants).map(a => [a.tenants?.id, { id: a.tenants?.id, name: a.tenants?.name }])
  ).values());

  // 2. Notification History
  const notifications = await prisma.notifications.findMany({
    where: { 
      type: 'admin_announcement',
    },
    include: {
      users: { select: { full_name: true, email: true } },
      tenants: { select: { name: true } }
    },
    orderBy: { created_at: 'desc' },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  const totalLogs = await prisma.notifications.count({ 
    where: { 
      type: 'admin_announcement',
    }
  });

  // 3. Notification Stats
  const stats = {
    total: totalLogs,
    sent: await prisma.notifications.count({ 
      where: { 
        type: 'admin_announcement',
        is_sent: true,
      } 
    }),
    failed: await prisma.notifications.count({ 
      where: { 
        type: 'admin_announcement',
        is_sent: false,
      } 
    }),
    lastSevenDays: await prisma.notifications.count({
      where: {
        type: 'admin_announcement',
        created_at: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    }),
  };

  // 4. Notification Templates
  const templates = await getNotificationTemplates();

  return (
    <NotificationsUI 
      adminsCount={admins.length}
      tenants={uniqueTenants as any[]}
      history={notifications}
      totalHistory={totalLogs}
      page={page}
      pageSize={pageSize}
      stats={stats}
      templates={templates}
    />
  );
}
