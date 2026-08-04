import { prisma } from '@/lib/db/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { redirect } from 'next/navigation';
import AdminDashboardUI from './AdminDashboardUI';

// Define a simple cache service fallback if the Redis one is missing/failing
import { redis } from '@/lib/redis/client';
const CacheService = {
  get: async (key: string) => {
    try {
      const data = await redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.warn('Redis Cache Get Failed:', e);
      return null;
    }
  },
  set: async (key: string, value: any, ttl: number) => {
    try {
      await redis.setex(key, ttl, JSON.stringify(value));
    } catch (e) {
      console.warn('Redis Cache Set Failed:', e);
    }
  }
};

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  const session = await getServerSession(authOptions);
  
  // Only Admin or Super Admin can access
  if (!session || !['admin', 'super_admin'].includes(session.user.role)) {
    redirect('/login');
  }
  
  // Note: in your schema, session user might have tenant_id mapping, check standard NextAuth config
  const tenantId = session.user.tenantId || (session.user as any).tenant_id;
  if (!tenantId) {
    throw new Error("No tenant ID found in session.");
  }

  const cacheKey = `dashboard:admin:${tenantId}`;
  
  // Try cache first
  let data = await CacheService.get(cacheKey);
  
  if (!data) {
    const now = new Date();

    // Fetch all data in parallel
    const [
      studentCount,
      teacherCount,
      activeExams,
      pendingGrading,
      departmentPerformance,
      recentActivity,
      pendingQuestionBanks,
      pendingExamApprovals
    ] = await Promise.all([
      prisma.users.count({ 
        where: { tenant_id: tenantId, role: 'student', is_active: true } 
      }),
      prisma.users.count({ 
        where: { tenant_id: tenantId, role: 'teacher', is_active: true } 
      }),
      prisma.exams.count({ 
        where: { 
          tenant_id: tenantId, 
          is_published: true, 
          is_active: true,
          start_time: { lte: now },
          end_time: { gte: now }
        } 
      }),
      // Pending grading count
      prisma.answers.count({ 
        where: { 
          tenant_id: tenantId, 
          grading_status: 'pending',
        } 
      }),
      // Department performance
      getDepartmentPerformance(tenantId),
      // Recent activity (last 10 audit logs)
      prisma.audit_logs.findMany({
        where: { tenant_id: tenantId },
        orderBy: { created_at: 'desc' },
        take: 10,
        include: { 
          users: { select: { full_name: true, email: true } }
        }
      }),
      // Pending approvals counts
      prisma.question_banks.count({
        where: { tenant_id: tenantId, is_published: false }
      }),
      prisma.exams.count({
        where: { tenant_id: tenantId, is_published: false }
      })
    ]);
    
    // Format recent activity safely
    const formattedRecentActivity = recentActivity.map(log => ({
      id: log.id,
      action: log.action.replace(/_/g, ' '),
      user: log.users?.full_name || log.users?.email || 'System User',
      createdAt: log.created_at ? log.created_at.toISOString() : new Date().toISOString()
    }));

    data = {
      stats: { studentCount, teacherCount, activeExams, pendingGrading },
      departmentPerformance,
      recentActivity: formattedRecentActivity,
      pendingApprovals: {
        questionBanks: pendingQuestionBanks,
        examApprovals: pendingExamApprovals
      },
    };
    
    // Cache for 5 minutes (300 seconds)
    await CacheService.set(cacheKey, data, 300);
  }
  
  return <AdminDashboardUI data={data} />;
}

// Helper function using the actual Prisma Schema mapping
async function getDepartmentPerformance(tenantId: string) {
  const departments = await prisma.departments.findMany({
    where: { tenant_id: tenantId, is_active: true },
    select: {
      id: true,
      name: true,
      users_users_department_idTodepartments: {
        where: { is_active: true, role: 'student' },
        select: {
          exam_attempts: {
            select: {
              percentage: true
            }
          }
        }
      }
    }
  });
  
  return departments.map(dept => {
    // Flatten all exam attempts from students in this department
    const allAttempts = dept.users_users_department_idTodepartments.flatMap(u => u.exam_attempts);
    
    // Filter attempts that have a numerical percentage score
    const validAttempts = allAttempts.filter(a => a.percentage !== null);
    
    const avgScore = validAttempts.length > 0 
      ? validAttempts.reduce((sum, a) => sum + Number(a.percentage), 0) / validAttempts.length 
      : 0;

    return {
      name: dept.name,
      averageScore: Math.round(avgScore),
      studentCount: dept.users_users_department_idTodepartments.length,
    };
  });
}
