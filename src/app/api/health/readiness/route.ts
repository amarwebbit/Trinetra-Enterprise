import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { redis } from '@/lib/redis/client';

export async function GET() {
  try {
    // Check database
    await prisma.$queryRaw`SELECT 1`;
    
    // Check Redis
    if (redis) {
      await redis.ping();
    }

    return NextResponse.json(
      { status: 'ready' },
      { 
        status: 200,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      { status: 'not ready', error: String(error) },
      { 
        status: 503,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      }
    );
  }
}
