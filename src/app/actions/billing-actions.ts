'use server';

import { prisma } from '@/lib/db/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { revalidatePath } from 'next/cache';

const checkSuperAdmin = async () => {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'super_admin') {
    throw new Error('Unauthorized');
  }
};

export async function updateTenantPlan(tenantId: string, plan: string, durationMonths: number = 12) {
  await checkSuperAdmin();

  try {
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + durationMonths);

    await prisma.tenants.update({
      where: { id: tenantId },
      data: {
        subscription_plan: plan,
        subscription_end_date: endDate,
        is_active: true,
      },
    });

    // Also log this action
    await prisma.audit_logs.create({
      data: {
        tenant_id: tenantId,
        action: 'TENANT_PLAN_UPDATE',
        resource_type: 'Tenant',
        resource_id: tenantId,
        new_values: { plan, durationMonths, endDate: endDate.toISOString() },
        user_agent: 'System Server Action'
      }
    });

    revalidatePath('/super/billing');
    return { success: true };
  } catch (error: any) {
    console.error('Error updating plan:', error);
    return { success: false, error: error.message || 'Failed to update plan' };
  }
}

export async function cancelTenantSubscription(tenantId: string) {
  await checkSuperAdmin();

  try {
    await prisma.tenants.update({
      where: { id: tenantId },
      data: {
        is_active: false,
      },
    });

    await prisma.audit_logs.create({
      data: {
        tenant_id: tenantId,
        action: 'TENANT_SUBSCRIPTION_CANCEL',
        resource_type: 'Tenant',
        resource_id: tenantId,
        user_agent: 'System Server Action'
      }
    });

    revalidatePath('/super/billing');
    return { success: true };
  } catch (error: any) {
    console.error('Error cancelling subscription:', error);
    return { success: false, error: error.message || 'Failed to cancel subscription' };
  }
}
