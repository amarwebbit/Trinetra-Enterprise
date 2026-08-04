import { prisma } from '@/lib/db/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { redirect } from 'next/navigation';
import TeacherUI from './TeacherUI';
import { serializeData } from '@/lib/utils/serialize';

export const dynamic = 'force-dynamic';

export default async function TeacherDashboard() {
  const session = await getServerSession(authOptions);
  
  if (!session || !['teacher', 'admin', 'super_admin'].includes(session.user.role)) {
    redirect('/login');
  }
  
  const tenantId = session.user.tenantId || (session.user as any).tenant_id;
  const teacherId = session.user.id;
  const teacherRoleParams = session.user.role === 'teacher' ? { teacher_id: teacherId } : {};

  // Parallel Database Queries for REAL DATA ONLY
  const [
    totalExams,
    activeExams,
    totalStudents,
    pendingResults,
    readyToPublishExams,
    recentExams,
  ] = await Promise.all([
    // 1. Total Exams
    prisma.exams.count({
      where: { 
        tenant_id: tenantId, 
        ...teacherRoleParams
      }
    }),
    
    // 2. Active Exams
    prisma.exams.count({
      where: { 
        tenant_id: tenantId, 
        ...teacherRoleParams,
        is_published: true,
        start_time: { lte: new Date() },
        end_time: { gte: new Date() },
      }
    }),
    
    // 3. Total Distinct Students
    prisma.exam_attempts.findMany({
      where: { 
        exams: { 
          tenant_id: tenantId, 
          ...teacherRoleParams
        } 
      },
      distinct: ['student_id'],
      select: { student_id: true }
    }).then(res => res.length),
    
    // 4. Pending Results Count
    prisma.exams.count({
      where: {
        tenant_id: tenantId,
        ...teacherRoleParams,
        is_published: true,
        end_time: { lt: new Date() },
        show_results_immediately: false,
      },
    }),
    
    // 5. Ready to Publish Exams
    prisma.exams.findMany({
      where: {
        tenant_id: tenantId,
        ...teacherRoleParams,
        is_published: true,
        end_time: { lt: new Date() },
        show_results_immediately: false,
      },
      include: {
        _count: {
          select: {
            exam_attempts: {
              where: { 
                status: { in: ['submitted', 'evaluated'] }
              }
            }
          }
        }
      },
      orderBy: { end_time: 'desc' },
      take: 10,
    }),
    
    // 6. Recent Exams (take 5)
    prisma.exams.findMany({
      where: {
        tenant_id: tenantId,
        ...teacherRoleParams,
      },
      include: {
        _count: {
          select: { exam_attempts: true }
        }
      },
      orderBy: { created_at: 'desc' },
      take: 5,
    }),
  ]);
  
  return (
    <main className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Welcome back, {session.user.name?.split(' ')[0] || 'Teacher'}
          </h1>
          <p className="text-sm text-muted-foreground">
            Here's what's happening in your classes today.
          </p>
        </div>
      </div>

      <TeacherUI
        stats={{
          totalExams,
          activeExams,
          totalStudents,
          pendingResults,
        }}
        readyToPublishExams={serializeData(readyToPublishExams) as any}
        recentExams={serializeData(recentExams) as any}
        teacherName={session.user.name || 'Teacher'}
      />
    </main>
  );
}
