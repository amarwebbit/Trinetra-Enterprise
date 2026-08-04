import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db/client';
import { authOptions } from '@/lib/auth/options';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch the most recent completed or graded attempts
    const recentAttempts = await prisma.exam_attempts.findMany({
      where: {
        student_id: session.user.id,
        status: {
          in: ['submitted', 'evaluated', 'graded']
        },
      },
      include: {
        exams: {
          select: {
            title: true,
            total_marks: true,
            max_attempts: true,
            allow_multiple: true,
          }
        }
      },
      orderBy: {
        percentage: 'desc'
      },
      take: 20
    });

    // Group by exam_id and pick the first one (which is the best because of orderBy percentage desc)
    const uniqueExams = new Map();
    recentAttempts.forEach(attempt => {
      // Prioritize explicit best attempt, otherwise fallback to highest percentage
      if (!uniqueExams.has(attempt.exam_id) || attempt.is_best_attempt) {
        uniqueExams.set(attempt.exam_id, attempt);
      }
    });

    // Sort by end_time desc to show most recently completed
    const sortedResults = Array.from(uniqueExams.values()).sort((a: any, b: any) => {
      return new Date(b.end_time || 0).getTime() - new Date(a.end_time || 0).getTime();
    }).slice(0, 5);

    const results = sortedResults.map((attempt: any) => ({
      id: attempt.id,
      examId: attempt.exam_id,
      examTitle: attempt.exams?.title || 'Unknown Exam',
      score: attempt.score,
      percentage: attempt.percentage,
      totalMarks: attempt.exams?.total_marks || 100,
      completedAt: attempt.end_time,
      isBestAttempt: attempt.is_best_attempt,
      maxAttempts: attempt.exams?.max_attempts || 1,
      allowMultiple: attempt.exams?.allow_multiple || false
    }));

    return NextResponse.json({
      success: true,
      data: results
    });

  } catch (error) {
    console.error('Fetch recent results error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recent results' },
      { status: 500 }
    );
  }
}
