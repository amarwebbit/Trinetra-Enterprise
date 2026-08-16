import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { redis } from '@/lib/redis/client';

export async function GET(request: NextRequest) {
  const checks = {
    database: false,
    redis: false,
    memory: false,
    uptime: false,
    timestamp: new Date().toISOString(),
  };

  const startTime = Date.now();
  let status = 200;
  let statusText = 'healthy';

  try {
    // Check database
    await prisma.$queryRaw`SELECT 1`;
    checks.database = true;
  } catch (error) {
    console.error('Health check - Database error:', error);
    checks.database = false;
    status = 503;
    statusText = 'degraded';
  }

  try {
    // Check Redis
    if (redis) {
      await redis.ping();
      checks.redis = true;
    } else {
      checks.redis = false;
    }
  } catch (error) {
    console.error('Health check - Redis error:', error);
    checks.redis = false;
    status = 503;
    statusText = 'degraded';
  }

  // Check memory usage
  const memoryUsage = process.memoryUsage();
  const memoryUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
  const memoryTotalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
  checks.memory = memoryUsedMB < memoryTotalMB * 0.9;

  if (!checks.memory) {
    status = 503;
    statusText = 'degraded';
  }

  // Uptime
  checks.uptime = process.uptime() > 0;

  const responseTime = Date.now() - startTime;

  return NextResponse.json(
    {
      status: statusText,
      checks,
      metrics: {
        memoryUsedMB,
        memoryTotalMB,
        responseTimeMs: responseTime,
        uptimeSeconds: Math.floor(process.uptime()),
      },
    },
    {
      status,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    }
  );
}
