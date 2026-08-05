'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import StudentUI from './StudentUI';
import { AlertCircle } from 'lucide-react';

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 animate-pulse">
        <div className="h-8 w-48 bg-slate-800 rounded mb-2" />
        <div className="h-4 w-64 bg-slate-800/60 rounded" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl p-5 animate-pulse">
            <div className="h-4 w-20 bg-slate-800 rounded mb-2" />
            <div className="h-8 w-16 bg-slate-800 rounded" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6 animate-pulse">
          <div className="h-6 w-32 bg-slate-800 rounded mb-4" />
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-16 bg-slate-800/40 rounded-lg" />
            ))}
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 animate-pulse">
          <div className="h-6 w-32 bg-slate-800 rounded mb-4" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 bg-slate-800/40 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="min-h-[400px] flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl">
        <div className="w-16 h-16 bg-red-900/30 border border-red-800/50 rounded-full flex items-center justify-center mx-auto mb-4 text-red-400">
          <AlertCircle className="h-8 w-8" />
        </div>
        <h3 className="text-lg font-bold text-slate-100">Unable to load dashboard</h3>
        <p className="text-slate-400 text-sm mt-2">{message}</p>
        <button
          onClick={onRetry}
          className="mt-5 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl transition-all duration-200 shadow-md"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}

export default function StudentDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/student/dashboard');
      if (!res.ok) throw new Error('Failed to load dashboard data');
      const json = await res.json();
      const payload = json.data || json;
      setDashboardData(payload);
    } catch (err: any) {
      setError(err.message || 'Something went wrong loading your dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }
    if (status === 'authenticated') {
      fetchDashboard();
    }
  }, [status, router]);

  if (status === 'loading' || loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={fetchDashboard} />;
  }

  const rawExams = dashboardData?.upcomingExams || [];
  const upcomingExams = rawExams.filter((e: any) => e.exam_type !== 'assignment');
  const activeExams = rawExams.filter((e: any) => e.exam_type !== 'assignment' && new Date(e.start_time) <= new Date());
  const assignmentExams = rawExams.filter((e: any) => e.exam_type === 'assignment');

  const stats = {
    upcomingCount: upcomingExams.length,
    completedCount: dashboardData?.completedExams || 0,
    averageScore: dashboardData?.avgScore || 0,
    pendingResults: dashboardData?.inProgress || 0,
  };

  return (
    <StudentUI
      upcomingExams={upcomingExams}
      activeExams={activeExams}
      assignments={[]}
      assignmentExams={assignmentExams}
      recentResults={dashboardData?.recentResults || []}
      stats={stats}
      studentName={dashboardData?.studentName || session?.user?.name || 'Student'}
      tenantId={(session?.user as any)?.tenantId || (session?.user as any)?.tenant_id || ''}
      studentId={session?.user?.id || ''}
    />
  );
}
