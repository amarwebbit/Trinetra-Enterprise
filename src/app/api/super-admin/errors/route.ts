import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db/client';
import { redis } from '@/lib/redis/client';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');

    // Query recent audit logs that represent errors
    const errors = await prisma.audit_logs.findMany({
      where: {
        OR: [
          { action: { contains: 'error', mode: 'insensitive' } },
          { action: { contains: 'fail', mode: 'insensitive' } },
          { action: { contains: 'exception', mode: 'insensitive' } },
          { action: { contains: 'timeout', mode: 'insensitive' } },
          { action: { contains: 'violation', mode: 'insensitive' } },
          { resource_type: { in: ['error', 'exception', 'failure', 'timeout', 'violation'] } },
        ]
      },
      orderBy: { created_at: 'desc' },
      take: limit,
    });

    // Check resolve states in Redis
    let resolvedIds: string[] = [];
    try {
      if (redis) {
        resolvedIds = await redis.smembers('resolved_errors');
      }
    } catch (redisErr) {
      console.error('Failed to query resolved error set from Redis:', redisErr);
    }
    const resolvedSet = new Set(resolvedIds);

    return NextResponse.json({
      success: true,
      data: errors.map((error: any) => ({
        id: error.id,
        timestamp: error.created_at,
        level: error.action.toLowerCase().includes('fail') || error.action.toLowerCase().includes('error') ? 'error' : 'warning',
        source: error.resource_type || 'system',
        message: error.action,
        stack: (error.metadata as any)?.stack || null,
        context: error.metadata || null,
        resolved: resolvedSet.has(error.id),
        resolvedAt: null,
        resolvedBy: null,
      })),
    });

  } catch (error) {
    console.error('Error fetching error logs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch error logs' },
      { status: 500 }
    );
  }
}
