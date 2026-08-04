'use client';

import React from 'react';
import { formatDateForHydration } from '@/lib/utils/date';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  BookOpen, 
  GraduationCap, 
  ArrowRight,
  UserPlus,
  FileUp,
  BarChart,
  Clock,
  CheckCircle
} from 'lucide-react';
import Link from 'next/link';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

type DashboardData = {
  stats: {
    studentCount: number;
    teacherCount: number;
    activeExams: number;
    pendingGrading: number;
  };
  departmentPerformance: {
    name: string;
    averageScore: number;
    studentCount: number;
  }[];
  recentActivity: {
    id: string;
    action: string;
    user: string;
    createdAt: string;
  }[];
  pendingApprovals: {
    questionBanks: number;
    examApprovals: number;
  };
};

export default function AdminDashboardUI({ data }: { data: DashboardData }) {
  const { stats, departmentPerformance, recentActivity, pendingApprovals } = data;
  
  const totalApprovals = pendingApprovals.questionBanks + pendingApprovals.examApprovals;

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Admin Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Overview of your institution's performance and activity.
          </p>
        </div>
      </div>

      {/* 3 Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="rounded-none border-muted">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Students</CardTitle>
            <GraduationCap className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.studentCount.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card className="rounded-none border-muted">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Teachers</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.teacherCount.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card className="rounded-none border-muted">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Exams</CardTitle>
            <BookOpen className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeExams.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-bold mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Button asChild variant="outline" className="h-24 flex flex-col items-center justify-center gap-2 rounded-none hover:border-blue-500/50 hover:bg-blue-500/5">
            <Link href="/admin/users?role=teacher">
              <UserPlus className="h-6 w-6 text-blue-500" />
              <span>Add Teacher</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-24 flex flex-col items-center justify-center gap-2 rounded-none hover:border-green-500/50 hover:bg-green-500/5">
            <Link href="/admin/users?action=import">
              <FileUp className="h-6 w-6 text-green-500" />
              <span>Import Students</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-24 flex flex-col items-center justify-center gap-2 rounded-none hover:border-purple-500/50 hover:bg-purple-500/5">
            <Link href="/admin/results">
              <BarChart className="h-6 w-6 text-purple-500" />
              <span>View Results</span>
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Department Performance Chart */}
        <Card className="col-span-1 lg:col-span-2 rounded-none border-muted">
          <CardHeader>
            <CardTitle>Department Performance</CardTitle>
            <CardDescription>Average scores across all exam attempts</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            {departmentPerformance.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart data={departmentPerformance} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    domain={[0, 100]}
                  />
                  <Tooltip 
                    cursor={{ fill: 'hsl(var(--muted))' }}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '0px',
                      color: 'hsl(var(--foreground))'
                    }}
                  />
                  <Bar dataKey="averageScore" name="Avg Score (%)" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </RechartsBarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                No performance data available yet.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Activity Feed */}
        <Card className="col-span-1 rounded-none border-muted">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest actions in your institution</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.length > 0 ? (
                recentActivity.map((log) => (
                  <div key={log.id} className="flex items-start gap-3">
                    <div className="mt-0.5 bg-muted p-1.5 rounded-full">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm text-foreground font-medium capitalize">{log.action.toLowerCase()}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <span>{log.user}</span>
                        <span>•</span>
                        <span>{formatDateForHydration(log.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  No recent activity found.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
