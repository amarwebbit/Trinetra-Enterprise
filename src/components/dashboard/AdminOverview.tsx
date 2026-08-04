'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { 
  Users, 
  Award, 
  TrendingUp, 
  UserPlus, 
  Upload, 
  Video, 
  FileText,
  ArrowRight
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip 
} from 'recharts';
import { toast } from 'sonner';

import WelcomeBanner from '@/components/ui/welcome-banner';
import StatCard from '@/components/ui/stat-card';
import ActivityFeed, { ActivityItem } from '@/components/ui/activity-feed';

interface DepartmentPerformance {
  name: string;
  averageScore: number;
  passRate: number;
}

interface RecentActivity {
  id: string;
  userEmail: string;
  userName: string;
  action: string;
  resourceType: string;
  createdAt: string;
}

interface AdminOverviewProps {
  stats: {
    studentCount: number;
    studentTrend: number;
    teacherCount: number;
    teacherTrend: number;
    activeExamsCount: number;
    activeExamsTrend: number;
    passRate: number;
    passRateTrend: number;
  };
  departmentPerformance: DepartmentPerformance[];
  weeklyScoreTrends: { name: string; score: number }[];
  recentActivities: RecentActivity[];
  userName: string;
}

export default function AdminOverview({
  stats,
  departmentPerformance,
  weeklyScoreTrends,
  recentActivities,
  userName
}: AdminOverviewProps) {
  const router = useRouter();

  // Convert raw activities to target ActivityItem structure
  const formattedActivities: ActivityItem[] = recentActivities.map(act => ({
    id: act.id,
    user: act.userName || act.userEmail || 'System Operator',
    action: act.action,
    resourceType: act.resourceType,
    createdAt: act.createdAt
  }));

  // Warm theme colors from palette
  const chartColors = {
    sage: '#A4B885',
    orange: '#D46D25',
    peach: '#FDC086',
    border: '#E8E4DC',
    text: '#9A9287'
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* 1. Reusable Welcome Banner */}
      <WelcomeBanner 
        name={userName} 
        title="Admin Console"
        description="Manage your college departments, monitor active exams, view attainment analysis, and onboard students directly from this console."
        semester="Semester 2, 2026"
      />

      {/* 2. Reusable Key Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Total Students"
          value={stats.studentCount}
          trendValue={`${stats.studentTrend}%`}
          isPositive={true}
          description="vs last semester"
          icon={Users}
          onClick={() => router.push('/admin/users?role=student')}
        />
        
        <StatCard
          title="Total Faculty"
          value={stats.teacherCount}
          trendValue={`${stats.teacherTrend}%`}
          isPositive={true}
          description="vs last year"
          icon={Users}
          onClick={() => router.push('/admin/users?role=teacher')}
        />

        <StatCard
          title="Active Exams"
          value={stats.activeExamsCount}
          trendValue={stats.activeExamsCount > 0 ? "LIVE NOW" : "0%"}
          isPositive={stats.activeExamsCount > 0}
          description="Exams currently running"
          icon={Award}
          onClick={() => router.push('/admin/exams')}
        />

        <StatCard
          title="Average Pass Rate"
          value={`${stats.passRate}%`}
          trendValue={`${stats.passRateTrend >= 0 ? '+' : ''}${stats.passRateTrend}%`}
          isPositive={stats.passRateTrend >= 0}
          description="vs city average"
          icon={TrendingUp}
          onClick={() => router.push('/admin/results')}
        />
      </div>

      {/* 3. Recharts Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Chart A: Score Area Chart */}
        <div className="bg-card border border-border p-5 rounded-none shadow-sm">
          <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
            <div>
              <h3 className="text-sm font-bold text-foreground">Performance Trends</h3>
              <p className="text-[10px] text-muted-foreground">Weekly average scores percentage</p>
            </div>
            <div className="text-xs font-semibold text-primary bg-primary/10 px-2.5 py-0.5 rounded-none border border-primary/20">
              GATE Format
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyScoreTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="scoreColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={chartColors.sage} stopOpacity={0.2}/>
                    <stop offset="95%" stopColor={chartColors.sage} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.border} />
                <XAxis dataKey="name" stroke={chartColors.text} fontSize={10} tickLine={false} />
                <YAxis domain={[0, 100]} stroke={chartColors.text} fontSize={10} tickLine={false} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'var(--color-surface, #FFF)', 
                    borderColor: 'var(--color-border, #E8E4DC)', 
                    borderRadius: '0px', 
                    fontSize: '12px' 
                  }}
                  formatter={(value: any) => [`${value}%`, 'Average Score']}
                />
                <Area type="monotone" dataKey="score" stroke={chartColors.sage} strokeWidth={2} fillOpacity={1} fill="url(#scoreColor)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart B: Department Performance Bar Chart */}
        <div className="bg-card border border-border p-5 rounded-none shadow-sm">
          <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
            <div>
              <h3 className="text-sm font-bold text-foreground">Department Performance</h3>
              <p className="text-[10px] text-muted-foreground">Average Score vs Pass Rate by Department</p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={departmentPerformance} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.border} />
                <XAxis dataKey="name" stroke={chartColors.text} fontSize={10} tickLine={false} />
                <YAxis domain={[0, 100]} stroke={chartColors.text} fontSize={10} tickLine={false} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'var(--color-surface, #FFF)', 
                    borderColor: 'var(--color-border, #E8E4DC)', 
                    borderRadius: '0px', 
                    fontSize: '12px' 
                  }}
                />
                <Bar dataKey="averageScore" name="Avg Score %" fill={chartColors.sage} radius={[0, 0, 0, 0]} />
                <Bar dataKey="passRate" name="Pass Rate %" fill={chartColors.orange} radius={[0, 0, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 4. Actions & Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Quick Actions Grid */}
        <div className="lg:col-span-1 bg-card border border-border p-5 rounded-none shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-foreground border-b border-border pb-3">Administrative Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            
            <button
              onClick={() => {
                toast.info('Opening user registration portal...');
                router.push('/admin/users?action=create-teacher');
              }}
              className="flex flex-col items-center justify-center p-4 border border-border hover:border-primary/45 hover:bg-primary/5 transition-all text-center space-y-2 rounded-none group"
            >
              <Users className="h-6 w-6 text-primary group-hover:scale-105 transition-transform shrink-0" />
              <span className="text-xs font-semibold text-foreground">Create Teacher</span>
            </button>

            <button
              onClick={() => {
                toast.info('Opening CSV bulk import helper...');
                router.push('/admin/users?action=import-students');
              }}
              className="flex flex-col items-center justify-center p-4 border border-border hover:border-primary/45 hover:bg-primary/5 transition-all text-center space-y-2 rounded-none group"
            >
              <Upload className="h-6 w-6 text-[#D46D25] group-hover:scale-105 transition-transform shrink-0" />
              <span className="text-xs font-semibold text-foreground">Import Students</span>
            </button>

            <button
              onClick={() => {
                toast.info('Navigating to Live Proctor Monitor...');
                router.push('/admin/live');
              }}
              className="flex flex-col items-center justify-center p-4 border border-border hover:border-primary/45 hover:bg-primary/5 transition-all text-center space-y-2 rounded-none group"
            >
              <Video className="h-6 w-6 text-[#FDC086] group-hover:scale-105 transition-transform shrink-0" />
              <span className="text-xs font-semibold text-foreground">Live Monitor</span>
            </button>



          </div>
        </div>

        {/* Reusable Activity Feed */}
        <div className="lg:col-span-2 bg-card border border-border p-5 rounded-none shadow-sm flex flex-col">
          <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
            <h3 className="text-sm font-bold text-foreground">Institutional Logs Activity</h3>
            <button
              onClick={() => router.push('/admin/audit-logs')}
              className="flex items-center text-xs font-semibold text-primary hover:underline hover:text-primary/80 transition-colors"
            >
              <span>View all logs</span>
              <ArrowRight className="h-3 w-3 ml-1" />
            </button>
          </div>
          
          <ActivityFeed activities={formattedActivities} />
        </div>

      </div>

    </div>
  );
}
