import { Suspense } from 'react';
import { prisma } from '@/lib/db/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { redirect } from 'next/navigation';
import TenantsUI from './TenantsUI';
import { createTenant, updateTenant, suspendTenant, activateTenant, deleteTenant, uploadTenantImage, updateTenantColor } from '@/app/actions/tenant-actions';

export const dynamic = 'force-dynamic';

export default async function SuperTenantsPage() {
  const session = await getServerSession(authOptions);
  
  if (!session || session.user.role !== 'super_admin') {
    redirect('/login');
  }
  
  // Fetch all tenants with counts
  const tenants = await prisma.tenants.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      domain: true,
      is_active: true,
      subscription_plan: true,
      subscription_end_date: true,
      created_at: true,
      logo_url: true,
      favicon_url: true,
      banner_url: true,
      primary_color: true,
      secondary_color: true,
      font_family: true,
      _count: {
        select: {
          users: {
            where: { is_active: true }
          },
          exams: {
            where: { is_active: true }
          }
        }
      }
    },
    orderBy: { created_at: 'desc' }
  });
  
  // Map properties for UI component since the Prisma schema uses snake_case and UI might expect standard names
  const mappedTenants = tenants.map(t => ({
    id: t.id,
    name: t.name,
    slug: t.slug,
    domain: t.domain || '',
    isActive: t.is_active || false,
    subscriptionPlan: t.subscription_plan || 'starter',
    createdAt: t.created_at ? t.created_at.toISOString() : new Date().toISOString(),
    usersCount: t._count.users,
    examsCount: t._count.exams,
    logo_url: t.logo_url,
    favicon_url: t.favicon_url,
    banner_url: t.banner_url,
    primary_color: t.primary_color,
    secondary_color: t.secondary_color,
    font_family: t.font_family,
  }));
  
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground animate-pulse">Loading Tenant Directory...</div>}>
      <TenantsUI 
        tenants={mappedTenants}
        // Pass server actions
        createTenant={createTenant}
        updateTenant={updateTenant}
        suspendTenant={suspendTenant}
        activateTenant={activateTenant}
        deleteTenant={deleteTenant}
        uploadTenantImage={uploadTenantImage}
        updateTenantColor={updateTenantColor}
      />
    </Suspense>
  );
}
