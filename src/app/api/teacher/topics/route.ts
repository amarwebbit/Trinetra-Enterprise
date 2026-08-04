import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db/client';
import { authOptions } from '@/lib/auth/options';

// GET - Fetch all topics for a tenant
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['teacher', 'admin', 'super_admin'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = session.user.tenantId || (session.user as any).tenant_id;

    const topicsList = await prisma.topics.findMany({
      where: {
        tenant_id: tenantId,
      },
      include: {
        _count: {
          select: { questions: true }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    return NextResponse.json({
      success: true,
      topics: topicsList.map(topic => ({
        ...topic,
        questionCount: topic._count.questions
      }))
    });

  } catch (error) {
    console.error('Failed to fetch topics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch topics' },
      { status: 500 }
    );
  }
}

// POST - Create a new topic
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['teacher', 'admin', 'super_admin'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, description, color } = await req.json();

    if (!name) {
      return NextResponse.json(
        { error: 'Topic name is required' },
        { status: 400 }
      );
    }

    const tenantId = session.user.tenantId || (session.user as any).tenant_id;

    const topic = await prisma.topics.create({
      data: {
        name,
        description,
        color: color || '#3B82F6',
        tenant_id: tenantId,
        created_by: session.user.id,
      }
    });

    return NextResponse.json({
      success: true,
      topic
    });

  } catch (error) {
    console.error('Failed to create topic:', error);
    return NextResponse.json(
      { error: 'Failed to create topic' },
      { status: 500 }
    );
  }
}

// PUT - Update a topic
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['teacher', 'admin', 'super_admin'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, name, description, color } = await req.json();

    if (!id || !name) {
      return NextResponse.json(
        { error: 'Topic ID and name are required' },
        { status: 400 }
      );
    }

    const tenantId = session.user.tenantId || (session.user as any).tenant_id;

    const topic = await prisma.topics.update({
      where: {
        id: id,
        tenant_id: tenantId,
      },
      data: {
        name,
        description,
        color,
      }
    });

    return NextResponse.json({
      success: true,
      topic
    });

  } catch (error) {
    console.error('Failed to update topic:', error);
    return NextResponse.json(
      { error: 'Failed to update topic' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a topic
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['teacher', 'admin', 'super_admin'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Topic ID is required' },
        { status: 400 }
      );
    }

    const tenantId = session.user.tenantId || (session.user as any).tenant_id;

    // Remove topic association from questions first
    await prisma.questions.updateMany({
      where: {
        topic_id: id,
        tenant_id: tenantId,
      },
      data: {
        topic_id: null,
      }
    });

    // Delete the topic
    await prisma.topics.delete({
      where: {
        id: id,
        tenant_id: tenantId,
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Topic deleted successfully'
    });

  } catch (error) {
    console.error('Failed to delete topic:', error);
    return NextResponse.json(
      { error: 'Failed to delete topic' },
      { status: 500 }
    );
  }
}
