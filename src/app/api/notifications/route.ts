import { prisma } from '@/lib/db/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      // Bell is rendered on all pages including guest exam pages — return empty gracefully
      return NextResponse.json({ notifications: [], unreadCount: 0 });
    }

    const notifications = await prisma.notifications.findMany({
      where: {
        user_id: session.user.id,
      },
      orderBy: {
        created_at: 'desc',
      },
      take: 50,
    });

    const unreadCount = await prisma.notifications.count({
      where: {
        user_id: session.user.id,
        is_read: false,
      },
    });

    return NextResponse.json({
      notifications,
      unreadCount,
    }, {
      headers: {
        'Cache-Control': 'private, max-age=10, stale-while-revalidate=30',
      }
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    
    if (body.all) {
      await prisma.notifications.updateMany({
        where: {
          user_id: session.user.id,
          is_read: false,
        },
        data: {
          is_read: true,
        },
      });
    } else if (body.id) {
      await prisma.notifications.update({
        where: {
          id: body.id,
          user_id: session.user.id,
        },
        data: {
          is_read: true,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating notifications:', error);
    return NextResponse.json(
      { error: 'Failed to update notifications' },
      { status: 500 }
    );
  }
}
