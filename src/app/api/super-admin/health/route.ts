import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db/client';
import { redis } from '@/lib/redis/client';
import os from 'os';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check Database
    const dbStart = Date.now();
    let dbStatus: 'up' | 'down' | 'degraded' = 'down';
    let dbConnections = 0;
    let dbLatency = 0;

    try {
      const result = await prisma.$queryRaw`SELECT 1 as connected, (SELECT count(*) FROM pg_stat_activity) as connections`;
      dbStatus = 'up';
      dbConnections = Number((result as any[])[0]?.connections || 0);
      dbLatency = Date.now() - dbStart;
    } catch (error) {
      dbStatus = 'down';
    }

    // Check Redis
    const redisStart = Date.now();
    let redisStatus: 'up' | 'down' | 'degraded' = 'down';
    let redisMemory = 0;
    let redisLatency = 0;

    try {
      if (redis) {
        await redis.ping();
        redisStatus = 'up';
        const info = await redis.info('memory');
        const usedMemory = info.match(/used_memory:([^\r\n]+)/);
        if (usedMemory) {
          redisMemory = Math.round(parseFloat(usedMemory[1]) / 1024 / 1024);
        }
        redisLatency = Date.now() - redisStart;
      } else {
        redisStatus = 'degraded';
      }
    } catch (error) {
      redisStatus = 'down';
    }

    // Check App
    const appMemory = process.memoryUsage();
    const appMemoryPercent = (appMemory.heapUsed / appMemory.heapTotal) * 100;
    const appStatus: 'up' | 'down' | 'degraded' = appMemoryPercent < 90 ? 'up' : 'degraded';

    // Check Nginx (via health check)
    let nginxStatus: 'up' | 'down' = 'down';
    let nginxRequests = 0;
    let nginxErrors = 0;

    try {
      // Connect internally on localhost:8080 health port
      const nginxHealth = await fetch('http://localhost:8080/health', {
        signal: AbortSignal.timeout(2000),
      });
      if (nginxHealth.ok) {
        nginxStatus = 'up';
      }
    } catch (error) {
      nginxStatus = 'down';
    }

    // Overall status
    const allUp = dbStatus === 'up' && redisStatus === 'up' && appStatus === 'up' && nginxStatus === 'up';
    const anyDown = dbStatus === 'down' || redisStatus === 'down' || nginxStatus === 'down';

    const overallStatus = allUp ? 'healthy' : anyDown ? 'critical' : 'degraded';

    return NextResponse.json({
      success: true,
      data: {
        status: overallStatus,
        services: {
          database: {
            status: dbStatus,
            latency: dbLatency,
            connections: dbConnections,
          },
          redis: {
            status: redisStatus,
            latency: redisLatency,
            memory: redisMemory,
          },
          app: {
            status: appStatus,
            uptime: process.uptime(),
            memory: Math.round(appMemoryPercent),
            cpu: Math.round(os.loadavg()[0] * 100 / Math.max(os.cpus().length, 1)),
          },
          nginx: {
            status: nginxStatus,
            requests: nginxRequests,
            errors: nginxErrors,
          },
        },
        timestamp: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('Health check error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check system health' },
      { status: 500 }
    );
  }
}
