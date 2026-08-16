import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { redis } from '@/lib/redis/client';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (redis) {
      await redis.sadd('resolved_errors', id);
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error resolving error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to resolve error' },
      { status: 500 }
    );
  }
}
