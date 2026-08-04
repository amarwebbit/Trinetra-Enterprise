import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db/client';
import { authOptions } from '@/lib/auth/options';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['teacher', 'admin', 'super_admin'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { questionIds, topicId } = await req.json();

    if (!questionIds || !Array.isArray(questionIds) || questionIds.length === 0) {
      return NextResponse.json(
        { error: 'Question IDs are required and must be a non-empty array' },
        { status: 400 }
      );
    }

    const tenantId = session.user.tenantId || (session.user as any).tenant_id;

    // Verify topic belongs to tenant, if topicId is provided
    let topicName = 'None';
    if (topicId) {
      const topic = await prisma.topics.findFirst({
        where: {
          id: topicId,
          tenant_id: tenantId,
        }
      });

      if (!topic) {
        return NextResponse.json(
          { error: 'Topic not found' },
          { status: 404 }
        );
      }
      topicName = topic.name;
    }

    // Update questions
    await prisma.questions.updateMany({
      where: {
        id: { in: questionIds },
        tenant_id: tenantId,
      },
      data: {
        topic_id: topicId || null,
      }
    });

    return NextResponse.json({
      success: true,
      message: `${questionIds.length} questions assigned to topic "${topicName}"`
    });

  } catch (error) {
    console.error('Bulk assign topic error:', error);
    return NextResponse.json(
      { error: 'Failed to assign topic' },
      { status: 500 }
    );
  }
}
