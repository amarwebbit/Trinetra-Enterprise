import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db/client';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const studentId = session.user.id;
    const tenantId = (session.user.tenantId || (session.user as any).tenant_id || '') as string;
    const now = new Date();

    // 1. Student details
    const student = await prisma.users.findUnique({
      where: { id: studentId },
      select: { full_name: true },
    });
    const studentName = student?.full_name || session.user.name || 'Student';

    // 2. Upcoming / Active Exams & Assignments
    const upcomingExams = await prisma.exams.findMany({
      where: {
        tenant_id: tenantId,
        is_active: true,
        is_published: true,
        end_time: { gte: now },
      },
      select: {
        id: true,
        title: true,
        exam_type: true,
        start_time: true,
        end_time: true,
        duration_minutes: true,
        total_marks: true,
      },
      orderBy: { start_time: 'asc' },
      take: 10,
    });

    // 3. Exam attempts for this student
    const attempts = await prisma.exam_attempts.findMany({
      where: {
        student_id: studentId,
      },
      include: {
        exams: {
          select: {
            id: true,
            title: true,
            total_marks: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    const completedAttempts = attempts.filter(a =>
      a.status && ['submitted', 'auto_submitted', 'force_submitted', 'graded', 'evaluated'].includes(a.status)
    );
    const inProgressCount = attempts.filter(a => a.status === 'in_progress').length;

    // Calculate avg score
    let totalScoreSum = 0;
    let totalScoreCount = 0;

    const recentResults = completedAttempts.slice(0, 5).map(attempt => {
      const score = Number(attempt.score || 0);
      const total = Number(attempt.exams?.total_marks || 100);
      const percentage = total > 0 ? Math.round((score / total) * 100) : 0;

      totalScoreSum += percentage;
      totalScoreCount++;

      return {
        id: attempt.id,
        exam_id: attempt.exam_id,
        exam_title: attempt.exams?.title || 'Assessment',
        submitted_at: attempt.end_time || attempt.created_at,
        percentage,
        score,
        total_marks: total,
      };
    });

    const avgScore = totalScoreCount > 0 ? Math.round(totalScoreSum / totalScoreCount) : 0;

    return NextResponse.json({
      success: true,
      studentName,
      totalExams: upcomingExams.length + completedAttempts.length,
      completedExams: completedAttempts.length,
      inProgress: inProgressCount,
      avgScore,
      upcomingExams,
      recentResults,
    });

  } catch (error: any) {
    console.error('[Student Dashboard API Error]:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data', details: error.message },
      { status: 500 }
    );
  }
}
