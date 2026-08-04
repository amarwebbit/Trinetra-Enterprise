'use client';

import React from 'react';
import Link from 'next/link';
import { 
  BookOpen, 
  PlayCircle, 
  Database, 
  Plus, 
  BarChart3, 
  ArrowRight, 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import WelcomeBanner from '@/components/ui/welcome-banner';
import StatCard from '@/components/ui/stat-card';
import { toast } from 'sonner';

export interface TeacherStats {
  totalExams: number;
  activeExams: number;
  totalQuestions: number;
}

export interface RecentExamItem {
  id: string;
  code: string;
  title: string;
  pattern: string;
  status: 'ongoing' | 'upcoming' | 'completed' | 'draft';
  attemptCount: number;
  durationMinutes: number;
  startDate: string;
}

interface TeacherOverviewProps {
  stats: TeacherStats;
  recentExams: RecentExamItem[];
  teacherName: string;
}

export default function TeacherOverview({
  stats,
  recentExams,
  teacherName
}: TeacherOverviewProps) {

  return (
    <div className="space-y-6">
      {/* 1. Personalized Welcome Banner */}
      <WelcomeBanner
        name={teacherName}
        title="Teacher Console"
        description="Manage your GATE question banks, monitor live active exams, and view class attainment."
        semester="Faculty Portal • Fall 2026"
      />

      {/* 2. Quick Stats Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Total Exams Created"
          value={stats.totalExams}
          description="Semester & GATE assessments"
          icon={BookOpen}
          trendValue="+12%"
          isPositive={true}
        />

        <StatCard
          title="Active Exams Running"
          value={stats.activeExams}
          description="Currently live for test-takers"
          icon={PlayCircle}
          trendValue="Live"
          isPositive={true}
        />

        <StatCard
          title="Questions in Bank"
          value={stats.totalQuestions}
          description="MCQ, NAT & MSQ repositories"
          icon={Database}
          trendValue="+45 new"
          isPositive={true}
        />
      </div>

      {/* 3. Main Section: Recent Exams */}
      <div className="bg-card border border-border p-5 rounded-none space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <h2 className="text-sm font-bold text-foreground">Recent Exams Created</h2>
          </div>
          <Link 
            href="/teacher/exams" 
            className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
          >
            View All Exams
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="divide-y divide-border">
          {recentExams.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">
              No recent exams created yet.
            </p>
          ) : (
            recentExams.map((exam) => (
              <div key={exam.id} className="py-3.5 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-[10px] bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 font-bold uppercase">
                      {exam.code}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-semibold">
                      • {exam.pattern}
                    </span>
                  </div>
                  <h3 className="font-bold text-foreground text-xs truncate mt-1">{exam.title}</h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {exam.durationMinutes} Mins • {exam.attemptCount} Student Submissions • {exam.startDate}
                  </p>
                </div>

                <div className="shrink-0">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold uppercase border rounded-none ${
                    exam.status === 'ongoing'
                      ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                      : exam.status === 'upcoming'
                      ? 'bg-primary/10 text-primary border-primary/20'
                      : exam.status === 'completed'
                      ? 'bg-muted text-muted-foreground border-border'
                      : 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                  }`}>
                    {exam.status === 'ongoing' && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                    {exam.status.toUpperCase()}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 4. Quick Actions Grid (3 Cards) */}
      <div className="space-y-3">
        <h3 className="font-bold text-foreground text-sm">Faculty Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link href="/teacher/exams/create" className="group">
            <div className="p-5 bg-gradient-to-br from-primary/10 via-card to-card border border-primary/20 group-hover:border-primary transition-all rounded-none space-y-2">
              <div className="h-10 w-10 bg-primary/15 text-primary flex items-center justify-center font-bold">
                <Plus className="h-5 w-5" />
              </div>
              <h4 className="font-bold text-foreground text-sm group-hover:text-primary transition-colors">Create New Exam</h4>
              <p className="text-xs text-muted-foreground">Build GATE tests, section schemes & time limits.</p>
            </div>
          </Link>

          <Link href="/teacher/questions" className="group">
            <div className="p-5 bg-gradient-to-br from-secondary/10 via-card to-card border border-secondary/20 group-hover:border-secondary transition-all rounded-none space-y-2">
              <div className="h-10 w-10 bg-secondary/15 text-secondary flex items-center justify-center font-bold">
                <Database className="h-5 w-5" />
              </div>
              <h4 className="font-bold text-foreground text-sm group-hover:text-secondary transition-colors">Question Bank</h4>
              <p className="text-xs text-muted-foreground">Manage MCQ, MSQ, and NAT numerical questions.</p>
            </div>
          </Link>

          <Link href="/teacher/results" className="group">
            <div className="p-5 bg-gradient-to-br from-emerald-500/10 via-card to-card border border-emerald-500/20 group-hover:border-emerald-500 transition-all rounded-none space-y-2">
              <div className="h-10 w-10 bg-emerald-500/15 text-emerald-600 flex items-center justify-center font-bold">
                <BarChart3 className="h-5 w-5" />
              </div>
              <h4 className="font-bold text-foreground text-sm group-hover:text-emerald-600 transition-colors">Class Analytics</h4>
              <p className="text-xs text-muted-foreground">View pass percentages & subject CO attainment.</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
