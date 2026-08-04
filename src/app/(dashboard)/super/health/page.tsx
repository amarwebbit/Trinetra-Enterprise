import React from 'react';
import { prisma } from '@/lib/db/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { redirect } from 'next/navigation';
import os from 'os';
import { checkRedisHealth } from '@/lib/redis/health';
import { checkStorageHealth } from '@/lib/storage/health';
import HealthUI from './HealthUI';

export const dynamic = 'force-dynamic';

export default async function SystemHealthPage() {
  const session = await getServerSession(authOptions);
  
  if (!session || session.user.role !== 'super_admin') {
    redirect('/login');
  }

  // 1. Database Health
  let dbStatus = 'offline';
  let dbLatencyMs = 0;
  let dbMetrics = { version: 'Unknown', size_mb: 0, connections: 0 };
  
  try {
    const start = Date.now();
    const dbHealth = await prisma.$queryRaw<Array<{
      version: string;
      size_mb: number;
      connections: number;
    }>>`
      SELECT 
        version(),
        (pg_database_size('exam_engine') / 1024 / 1024)::int as size_mb,
        (SELECT count(*)::int FROM pg_stat_activity) as connections
    `;
    
    dbLatencyMs = Date.now() - start;
    
    if (dbHealth && dbHealth.length > 0) {
      dbStatus = 'online';
      dbMetrics = dbHealth[0];
    }
  } catch (error) {
    console.error('Database health check failed:', error);
  }

  // 2. Redis Health
  const redisHealth = await checkRedisHealth();

  // 3. Storage Health (MinIO)
  const storageHealth = await checkStorageHealth();

  // 4. Server Metrics
  const serverMetrics = {
    cpu: {
      loadAvg: os.loadavg()[0], // 1 minute load average
      cores: os.cpus().length,
    },
    memory: {
      total: os.totalmem(),
      free: os.freemem(),
      used: os.totalmem() - os.freemem(),
      percentage: ((os.totalmem() - os.freemem()) / os.totalmem()) * 100,
    },
    uptime: os.uptime(),
    platform: os.platform(),
    hostname: os.hostname(),
  };

  // 5. Recent Alerts
  const recentAlerts = await prisma.audit_logs.findMany({
    where: {
      action: { in: ['TENANT_SUSPENDED', 'TENANT_DELETED', 'MODULE_TOGGLED', 'TENANT_CREATED'] }
    },
    orderBy: { created_at: 'desc' },
    take: 10,
    include: {
      users: { select: { full_name: true } },
      tenants: { select: { name: true } },
    },
  });

  return (
    <HealthUI 
      db={{ status: dbStatus as any, latencyMs: dbLatencyMs, metrics: dbMetrics }}
      redis={redisHealth}
      storage={storageHealth}
      server={serverMetrics}
      alerts={recentAlerts}
    />
  );
}
