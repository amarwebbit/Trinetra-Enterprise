import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db/client';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const examId = searchParams.get('examId');

    if (!examId) {
      return NextResponse.json({ error: 'Exam ID is required' }, { status: 400 });
    }

    const attempts = await prisma.exam_attempts.findMany({
      where: {
        exam_id: examId,
        student_id: session.user.id,
      },
      include: {
        exams: {
          select: {
            title: true,
            max_attempts: true,
            allow_multiple: true,
          }
        }
      },
      orderBy: {
        attempt_number: 'desc'
      }
    });

    return NextResponse.json({
      success: true,
      attempts: attempts.map(attempt => ({
        id: attempt.id,
        attemptNumber: attempt.attempt_number || 1,
        isBestAttempt: attempt.is_best_attempt || false,
        score: attempt.score ? Number(attempt.score) : null,
        totalMarks: attempt.total_marks ? Number(attempt.total_marks) : null,
        percentage: attempt.percentage ? Number(attempt.percentage) : null,
        status: attempt.status,
        startTime: attempt.start_time,
        endTime: attempt.end_time,
        examTitle: attempt.exams.title,
        maxAttempts: attempt.exams.max_attempts || 1
      }))
    });
  } catch (error) {
    console.error('Failed to fetch student attempts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch attempts' },
      { status: 500 }
    );
  }
}
