import { prisma } from '@/lib/db/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { redirect } from 'next/navigation';
import { StudentUI } from './StudentUI';
import { serializeData } from '@/lib/utils/serialize';

export const dynamic = 'force-dynamic';

export default async function StudentDashboard() {
  const session = await getServerSession(authOptions);
  
  // REAL role check
  if (!session || !['student', 'admin', 'super_admin'].includes(session.user.role)) {
    redirect('/login');
  }
  
  const tenantId = session.user.tenantId || (session.user as any).tenant_id;
  const studentId = session.user.id;
  
  // Get student's enrolled courses from REAL database
  const enrollments = await prisma.enrollments.findMany({
    where: { student_id: studentId },
    select: { course_id: true },
  });
  
  const courseIds = enrollments.map(e => e.course_id);
  
  // Get student's branch and year from metadata
  const user = await prisma.users.findUnique({
    where: { id: studentId },
    select: { metadata: true }
  });
  
  const metadata = (user?.metadata as Record<string, any>) || {};
  const studentBranch = metadata.branch || 'Unknown';
  const studentYear = metadata.passing_year ? parseInt(metadata.passing_year.toString(), 10) : 0;
  
  // If student isn't enrolled in any courses, still allow them to see the dashboard but with empty exams
  const courseIdFilter = courseIds.length > 0 ? { in: courseIds } : undefined;
  
  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  
  // ALL data from REAL database - NO MOCK
  const [
    upcomingExams,
    activeExams,
    recentResults,
    upcomingCount,
    completedCount,
    avgScoreData,
    pendingCount,
    assignments,
    assignmentExams,
  ] = await Promise.all([
    // 1. Upcoming Exams (next 7 days)
    prisma.exams.findMany({
      where: {
        tenant_id: tenantId,
        is_published: true,
        is_active: true,
        start_time: { gt: now, lte: nextWeek },
        ...(courseIdFilter ? { course_id: courseIdFilter } : {}),
      },
      include: {
        users: { select: { full_name: true } },
        _count: { select: { exam_sections: true } },
      },
      orderBy: { start_time: 'asc' },
      take: 5,
    }),
    
    // 2. Active Exams (ongoing - Live Exams)
    prisma.exams.findMany({
      where: {
        tenant_id: tenantId,
        is_published: true,
        is_active: true,
        exam_type: 'live',
        start_time: { lte: now },
        end_time: { gte: now },
        ...(courseIdFilter ? { course_id: courseIdFilter } : {}),
      },
      include: {
        users: { select: { full_name: true } },
        _count: { select: { exam_sections: true } },
        exam_attempts: {
          where: { student_id: studentId },
          select: { id: true }
        }
      },
      orderBy: { end_time: 'asc' },
      take: 3,
    }),
    
    // 3. Recent Results (last 20 for grouping)
    prisma.exam_attempts.findMany({
      where: {
        student_id: studentId,
        status: { in: ['submitted', 'evaluated'] },
      },
      include: {
        exams: { 
          select: { 
            id: true,
            title: true, 
            total_marks: true,
            passing_percentage: true,
            show_results_immediately: true,
            allow_multiple: true,
            max_attempts: true,
          } 
        },
      },
      orderBy: { percentage: 'desc' },
      take: 20,
    }),
    
    // 4. Stats: Upcoming count
    prisma.exams.count({
      where: {
        tenant_id: tenantId,
        is_published: true,
        is_active: true,
        start_time: { gt: now },
        ...(courseIdFilter ? { course_id: courseIdFilter } : {}),
      },
    }),
    
    // 5. Stats: Completed count
    prisma.exam_attempts.count({
      where: {
        student_id: studentId,
        status: { in: ['submitted', 'evaluated'] },
      },
    }),
    
    // 6. Stats: Average score
    prisma.exam_attempts.aggregate({
      where: {
        student_id: studentId,
        status: { in: ['submitted', 'evaluated'] },
      },
      _avg: { percentage: true },
    }),
    
    // 7. Stats: Pending results — only where teacher explicitly hid results
    prisma.exam_attempts.count({
      where: {
        student_id: studentId,
        status: 'submitted',
        exams: {
          show_results_immediately: false,
        },
      },
    }),
    
    // 8. Assignments (no time constraints) — old PDF/link based
    prisma.assignments.findMany({
      where: {
        tenant_id: tenantId,
        is_published: true,
        OR: [
          { branch: studentBranch },
          { branch: 'All' }
        ],
        AND: [
          {
            OR: [
              { passing_year: studentYear },
              { passing_year: 0 } // 0 means All Years
            ]
          }
        ]
      },
      include: { teacher: { select: { full_name: true } } },
      orderBy: { created_at: 'desc' },
    }),

    // 9. Assignment-mode exams filtered by student's branch + year
    prisma.exams.findMany({
      where: {
        tenant_id: tenantId,
        is_published: true,
        is_active: true,
        exam_type: 'assignment',
        AND: [
          // Branch filter: 'all', student's branch, or no branch set (old exams)
          {
            OR: [
              { metadata: { path: ['target_branch'], equals: 'all' } },
              { metadata: { path: ['target_branch'], equals: studentBranch } },
              { metadata: { path: ['target_branch'], equals: null } }, // exams before this feature
            ],
          },
          // Year filter: 0 = all years, student's year, or no year set (old exams)
          {
            OR: [
              { metadata: { path: ['target_year'], equals: 0 } },
              { metadata: { path: ['target_year'], equals: studentYear } },
              { metadata: { path: ['target_year'], equals: null } }, // exams before this feature
            ],
          },
        ],
      },
      include: {
        users: { select: { full_name: true } },
        _count: { select: { exam_sections: true } },
        exam_attempts: {
          where: { student_id: studentId },
          select: { id: true, status: true },
        },
      },
      orderBy: { created_at: 'desc' },
      take: 10,
    }),
  ]);
  
  // Note: For pendingCount, we might also want to check exam.show_results_immediately if status is evaluated but not published.
  // We'll keep it simple: if it's 'submitted' but not 'evaluated', it's pending.
  
  // Group recent results by exam and pick the best one
  const uniqueRecentExams = new Map();
  recentResults.forEach(attempt => {
    if (!uniqueRecentExams.has(attempt.exam_id) || attempt.is_best_attempt) {
      uniqueRecentExams.set(attempt.exam_id, attempt);
    }
  });
  
  const finalRecentResults = Array.from(uniqueRecentExams.values())
    .sort((a: any, b: any) => new Date(b.end_time || 0).getTime() - new Date(a.end_time || 0).getTime())
    .slice(0, 5);
  
  // Format stats properly
  const stats = {
    upcomingCount,
    completedCount,
    averageScore: Number(avgScoreData._avg.percentage || 0),
    pendingResults: pendingCount,
  };
  
  return (
    <StudentUI
      upcomingExams={serializeData(upcomingExams)}
      activeExams={serializeData(activeExams)}
      assignments={serializeData(assignments)}
      assignmentExams={serializeData(assignmentExams)}
      recentResults={serializeData(finalRecentResults)}
      stats={stats}
      studentName={session.user.name || 'Student'}
      tenantId={tenantId}
      studentId={studentId}
    />
  );
}
