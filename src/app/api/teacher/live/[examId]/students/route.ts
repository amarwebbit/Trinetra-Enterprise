import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db/client';
import { authOptions } from '@/lib/auth/options';

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ examId: string }> }
) {
  try {
    const params = await props.params;
    const session = await getServerSession(authOptions);
    if (!session || !['teacher', 'admin', 'super_admin'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = session.user.tenantId || (session.user as any).tenant_id;
    const { examId } = params;

    const where: any = {
      tenant_id: tenantId,
      status: {
        in: ['in_progress', 'submitted', 'auto_submitted', 'flagged']
      },
      created_at: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
      }
    };
    
    if (examId && examId !== 'all') {
      where.exam_id = examId;
    } else {
      where.exams = { teacher_id: session.user.id };
    }

    const attempts = await prisma.exam_attempts.findMany({
      where,
      include: {
        users: true,
        exams: {
          include: {
            exam_sections: {
              include: {
                exam_questions: true
              }
            }
          }
        },
        answers: true,
        proctoring_logs: {
          where: {
            event_type: {
              not: 'heartbeat'
            }
          },
          orderBy: {
            created_at: 'desc'
          }
        }
      },
      orderBy: {
        updated_at: 'desc'
      }
    });

    const students = attempts.map(attempt => {
      const totalQuestions = attempt.exams.exam_sections.reduce(
        (acc: number, section: any) => acc + section.exam_questions.length,
        0
      );
      
      const answeredQuestions = attempt.answers.length;
      
      // Total security violation logs
      const violations = attempt.proctoring_logs.length;

      return {
        id: attempt.id,
        studentName: attempt.users?.full_name || 'Unknown Student',
        studentEmail: attempt.users?.email,
        examTitle: attempt.exams.title,
        examId: attempt.exams.id,
        startTime: attempt.start_time?.toISOString(),
        status: attempt.status,
        questionsAnswered: answeredQuestions,
        totalQuestions: totalQuestions,
        score: attempt.score ? Number(attempt.score) : 0,
        violations: violations,
        lastActivity: attempt.updated_at?.toISOString(),
        proctoringEvents: attempt.proctoring_logs.map((log: any) => ({
          type: log.event_type,
          severity: log.severity,
          timestamp: log.created_at?.toISOString()
        }))
      };
    });

    return NextResponse.json({
      success: true,
      students
    });

  } catch (error) {
    console.error('Teacher live monitoring error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch live data' },
      { status: 500 }
    );
  }
}
