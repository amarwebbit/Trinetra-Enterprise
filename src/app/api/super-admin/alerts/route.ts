import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db/client';
import { redis } from '@/lib/redis/client';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Query recent logs containing alerts/critical actions
    const alerts = await prisma.audit_logs.findMany({
      where: {
        OR: [
          { action: { contains: 'error', mode: 'insensitive' } },
          { action: { contains: 'fail', mode: 'insensitive' } },
          { action: { contains: 'critical', mode: 'insensitive' } },
          { action: { contains: 'violation', mode: 'insensitive' } },
        ],
        created_at: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
      orderBy: { created_at: 'desc' },
      take: 50,
    });

    // Check acknowledgement states in Redis
    let acknowledgedIds: string[] = [];
    try {
      if (redis) {
        acknowledgedIds = await redis.smembers('acknowledged_alerts');
      }
    } catch (redisErr) {
      console.error('Failed to query acknowledged alerts set from Redis:', redisErr);
    }
    const acknowledgedSet = new Set(acknowledgedIds);

    return NextResponse.json({
      success: true,
      data: alerts.map((alert: any) => ({
        id: alert.id,
        severity: alert.action.toLowerCase().includes('critical') ? 'critical' : 'high',
        type: alert.resource_type || 'system_alert',
        message: alert.action,
        source: alert.resource_type || 'system',
        timestamp: alert.created_at,
        acknowledged: acknowledgedSet.has(alert.id),
        acknowledgedBy: null,
        acknowledgedAt: null,
      })),
    });

  } catch (error) {
    console.error('Error fetching alerts:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch alerts' },
      { status: 500 }
    );
  }
}
