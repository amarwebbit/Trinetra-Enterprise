import React from 'react';
import Link from 'next/link';
import { prisma } from '@/lib/db/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Server, Users, Activity, Cpu, Shield, 
  ChevronRight, DollarSign
} from 'lucide-react';
import WelcomeBanner from '@/components/ui/welcome-banner';
import StatCard from '@/components/ui/stat-card';
import ActivityFeed from '@/components/ui/activity-feed';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function SuperAdminDashboard() {
  const session = await getServerSession(authOptions);
  
  if (!session || session.user.role !== 'super_admin') {
    redirect('/login');
  }

  // Fetch all tenants with their stats
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

  // Calculate MRR
  let totalMRR = 0;
  tenants.forEach(t => {
    if (t.is_active) {
      if (t.subscription_plan === 'pro') totalMRR += 99;
      if (t.subscription_plan === 'enterprise') totalMRR += 499;
    }
  });

  // Calculate global stats
  const globalStats = {
    totalTenants: tenants.length,
    activeTenants: tenants.filter(t => t.is_active).length,
    totalUsers: tenants.reduce((sum, t) => sum + t._count.users, 0),
    activeExams: tenants.reduce((sum, t) => sum + t._count.exams, 0),
    mrr: totalMRR
  };
  
  // Fetch system health (from Redis or database)
  const systemHealth = {
    database: await checkDatabaseConnection(),
    redis: await checkRedisConnection(),
    storage: await checkMinIOConnection(),
  };

  // Fetch recent activity across all tenants
  const recentActivity = await prisma.audit_logs.findMany({
    orderBy: { created_at: 'desc' },
    take: 20,
    include: {
      users: {
        select: {
          full_name: true,
          email: true,
        }
      },
      tenants: {
        select: {
          name: true
        }
      }
    }
  });

  // Format display logs for ActivityFeed compatibility
  const formattedLogs = recentActivity.map((log) => ({
    id: log.id,
    user: log.users?.full_name || 'System Operator',
    action: `[${log.tenants.name}] ${log.action.replace(/_/g, ' ')}`,
    resourceType: log.resource_type,
    createdAt: log.created_at ? new Date(log.created_at).toISOString() : new Date().toISOString()
  }));

  return (
    <main className="space-y-6">
      <WelcomeBanner 
        name={session.user.name || 'Super Admin'}
        title="Super Admin Console"
        description="Manage Enterprise Tenants, monitor global system metrics, and control billing."
        semester="Global Administrator"
      />

      {/* 2. Reusable Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard 
          title="Active Tenants" 
          value={globalStats.activeTenants} 
          trendValue={`Total: ${globalStats.totalTenants}`} 
          isPositive={true}
          description="Onboarded institutions" 
          icon={Server} 
        />
        
        <StatCard 
          title="Total Active Exams" 
          value={globalStats.activeExams} 
          trendValue="Total" 
          isPositive={globalStats.activeExams > 0}
          description="Exams created across all tenants" 
          icon={Activity} 
        />
        
        <StatCard 
          title="Total Users" 
          value={globalStats.totalUsers} 
          trendValue="Live" 
          isPositive={true}
          description="Across all active tenants" 
          icon={Users} 
        />
        
        <StatCard
          title="Monthly MRR"
          value={`$${globalStats.mrr}`}
          trendValue="Est."
          isPositive={globalStats.mrr > 0}
          description="From active subscriptions"
          icon={DollarSign}
        />
      </div>

      {/* 3. Main Dashboard Contents */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Resource Monitor Panel (Progress Gauges) */}
        <Card className="border border-muted bg-card md:col-span-2 rounded-none">
          <CardHeader className="border-b border-muted">
            <CardTitle className="text-lg font-bold flex items-center space-x-2">
              <Cpu className="h-5 w-5 text-primary" />
              <span>Real-Time Host Performance</span>
            </CardTitle>
            <CardDescription className="text-xs">Database, Redis, and Storage Status</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
                <span className="text-foreground">PostgreSQL Database</span>
                <span className={systemHealth.database ? "text-green-500" : "text-red-500"}>
                  {systemHealth.database ? "Operational" : "Offline"}
                </span>
              </div>
              <div className="w-full bg-muted/30 h-3 border border-muted">
                <div className={`h-full ${systemHealth.database ? 'bg-green-500' : 'bg-red-500'}`} style={{ width: '100%' }}></div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
                <span className="text-foreground">Redis Cache & Queue</span>
                <span className={systemHealth.redis ? "text-green-500" : "text-red-500"}>
                  {systemHealth.redis ? "Operational" : "Offline"}
                </span>
              </div>
              <div className="w-full bg-muted/30 h-3 border border-muted">
                <div className={`h-full ${systemHealth.redis ? 'bg-green-500' : 'bg-red-500'}`} style={{ width: '100%' }}></div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
                <span className="text-foreground">MinIO Object Storage</span>
                <span className={systemHealth.storage ? "text-green-500" : "text-red-500"}>
                  {systemHealth.storage ? "Operational" : "Offline"}
                </span>
              </div>
              <div className="w-full bg-muted/30 h-3 border border-muted">
                <div className={`h-full ${systemHealth.storage ? 'bg-green-500' : 'bg-red-500'}`} style={{ width: '100%' }}></div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Global Quick Action Panel */}
        <Card className="border border-muted bg-card rounded-none">
          <CardHeader className="border-b border-muted">
            <CardTitle className="text-lg font-bold">Quick Actions</CardTitle>
            <CardDescription className="text-xs">Navigate to critical platform control tools</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <Link href="/super/tenants?create=true" className="w-full block">
              <Button className="w-full justify-between bg-primary hover:bg-primary/95 text-primary-foreground font-semibold py-2.5 rounded-none">
                <span>Create New Tenant</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>

            <Link href="/super/tenants" className="w-full block">
              <Button variant="outline" className="w-full justify-between border-muted text-foreground font-semibold py-2.5 rounded-none">
                <span>Manage Tenant Directory</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>

            <Link href="/super/billing" className="w-full block">
              <Button variant="outline" className="w-full justify-between border-muted text-foreground font-semibold py-2.5 rounded-none">
                <span>Configure Modules & Billing</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* 4. Bottom Grid: Tenants Preview & Recent Audits Preview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Onboarded Institutes Preview */}
        <Card className="border border-muted bg-card rounded-none flex flex-col">
          <CardHeader className="border-b border-muted flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold">Newest Institutions</CardTitle>
              <CardDescription className="text-xs">Recently provisioned tenants directories</CardDescription>
            </div>
            <Link href="/super/tenants">
              <Button variant="ghost" size="sm" className="text-xs text-primary flex items-center space-x-1 rounded-none">
                <span>View All</span>
                <ChevronRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0 flex-1">
            <div className="divide-y divide-muted">
              {tenants.slice(0, 6).map((t) => (
                <div key={t.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-foreground">{t.name}</p>
                    <p className="text-[10px] text-primary">{t.slug}.localhost</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-muted text-muted-foreground border border-border rounded-none">
                      {t.subscription_plan}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{t._count.users} users</span>
                  </div>
                </div>
              ))}
              {tenants.length === 0 && (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  No tenants found.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* System Activity Preview using Reusable ActivityFeed */}
        <Card className="border border-muted bg-card rounded-none flex flex-col">
          <CardHeader className="border-b border-muted flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold">Recent System Activity</CardTitle>
              <CardDescription className="text-xs">Global events logs across all tenants</CardDescription>
            </div>
            <Link href="/super/audit-logs">
              <Button variant="ghost" size="sm" className="text-xs text-primary flex items-center space-x-1 rounded-none">
                <span>View Full Logs</span>
                <ChevronRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-5 flex-1 relative min-h-[300px]">
            <ActivityFeed activities={formattedLogs} maxHeight="max-h-[300px]" />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

// Helper functions
async function checkDatabaseConnection() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error("Database health check failed:", error);
    return false;
  }
}

async function checkRedisConnection() {
  try {
    const redisClient = await import('@/lib/redis/client');
    await redisClient.redis.ping();
    return true;
  } catch (error) {
    console.error("Redis health check failed:", error);
    return false;
  }
}

async function checkMinIOConnection() {
  // Implement MinIO health check when configured
  return true;
}
