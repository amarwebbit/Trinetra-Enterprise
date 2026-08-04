import React from 'react';
import { prisma } from '@/lib/db/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { redirect } from 'next/navigation';
import BillingUI from './BillingUI';

export const dynamic = 'force-dynamic';

export default async function SuperAdminBillingPage() {
  const session = await getServerSession(authOptions);
  
  if (!session || session.user.role !== 'super_admin') {
    redirect('/login');
  }

  // Fetch all tenants with their subscription details and counts
  const tenants = await prisma.tenants.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      subscription_plan: true,
      subscription_end_date: true,
      is_active: true,
      created_at: true,
      _count: {
        select: { users: true, exams: true },
      },
    },
    orderBy: { created_at: 'desc' }
  });

  // Calculate MRR from subscription plans
  const plans: Record<string, number> = {
    starter: 15000,       // ₹15,000/year
    professional: 50000,  // ₹50,000/year
    enterprise: 150000,   // ₹1,50,000/year
  };

  const activeTenants = tenants.filter(t => t.is_active);
  
  const yearlyRevenue = activeTenants.reduce((sum, t) => {
    return sum + (plans[t.subscription_plan || 'starter'] || 0);
  }, 0);

  const mrr = Math.round(yearlyRevenue / 12);
  
  // No historical monthly data yet to compute real growth
  const growth = "N/A"; 

  const stats = {
    mrr,
    activeTenants: activeTenants.length,
    totalRevenue: yearlyRevenue,
    growth,
  };

  return (
    <BillingUI
      tenants={tenants}
      stats={stats}
      plans={plans}
    />
  );
}
