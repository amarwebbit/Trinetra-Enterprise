'use client';

import React from 'react';
import Link from 'next/link';
import { 
  Calendar, 
  CheckCircle2, 
  BarChart3, 
  Clock, 
  Award, 
  BookOpen, 
  ArrowRight, 
  PlayCircle, 
  TrendingUp, 
  Sparkles,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import WelcomeBanner from '@/components/ui/welcome-banner';
import StatCard from '@/components/ui/stat-card';
import { toast } from 'sonner';

export interface StudentStats {
  upcomingExams: number;
  completedExams: number;
  averageScore: number;
  pendingResults: number;
}

export interface StudentUpcomingExam {
  id: string;
  code: string;
  title: string;
  subject: string;
  durationMinutes: number;
  questionCount: number;
  startsInText: string;
  startDate: string;
  isLiveNow: boolean;
}

export interface StudentRecentResult {
  id: string;
  title: string;
  subject: string;
  score: number;
  maxScore: number;
  percentage: number;
  status: 'passed' | 'failed';
  date: string;
}

interface StudentOverviewProps {
  stats: StudentStats;
  upcomingExams: StudentUpcomingExam[];
  recentResults: StudentRecentResult[];
  studentName: string;
  enrollmentText: string;
}

export default function StudentOverview({
  stats,
  upcomingExams,
  recentResults,
  studentName,
  enrollmentText
}: StudentOverviewProps) {
  return (
    <div className="space-y-6">
      {/* 1. Student Welcome Banner */}
      <WelcomeBanner
        name={studentName}
        title="Student Console"
        description="View your scheduled GATE & Semester examinations, track score trends, and inspect graded marksheets."
        semester={enrollmentText}
      />

      {/* 2. Quick Stats Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Upcoming Exams"
          value={stats.upcomingExams}
          description="Scheduled in next 7 days"
          icon={Calendar}
          trendValue="Scheduled"
          isPositive={true}
        />

        <StatCard
          title="Completed Exams"
          value={stats.completedExams}
          description="Evaluated attempts"
          icon={CheckCircle2}
          trendValue="Passed"
          isPositive={true}
        />

        <StatCard
          title="Average Score"
          value={`${stats.averageScore.toFixed(1)}%`}
          description="Cumulative performance"
          icon={BarChart3}
          trendValue="+3.4%"
          isPositive={true}
        />

        <StatCard
          title="Pending Results"
          value={stats.pendingResults}
          description="Awaiting teacher release"
          icon={Clock}
          trendValue="Pending"
          isPositive={false}
        />
      </div>

      {/* 3. Main 2-Column Section: Upcoming Exams & Recent Results */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Upcoming Scheduled Exams (7 Columns) */}
        <div className="lg:col-span-7 bg-card border border-border p-5 rounded-none space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              <h2 className="text-sm font-bold text-foreground">Upcoming & Live Exams</h2>
            </div>
            <Link 
              href="/student/exams" 
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
            >
              Browse All
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {upcomingExams.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">
                No upcoming exams scheduled for your courses at this moment.
              </p>
            ) : (
              upcomingExams.map((ex) => (
                <div 
                  key={ex.id} 
                  className={`p-4 border space-y-2 rounded-none transition-all ${
                    ex.isLiveNow 
                      ? 'bg-emerald-500/10 border-emerald-500/40' 
                      : 'bg-background border-border hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 font-bold uppercase">
                      {ex.code}
                    </span>

                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 border ${
                      ex.isLiveNow 
                        ? 'bg-emerald-500/20 text-emerald-600 border-emerald-500/40 flex items-center gap-1' 
                        : 'bg-primary/10 text-primary border-primary/20'
                    }`}>
                      {ex.isLiveNow && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                      {ex.startsInText}
                    </span>
                  </div>

                  <h3 className="font-bold text-foreground text-sm">{ex.title}</h3>
                  <p className="text-xs text-muted-foreground">{ex.subject} • {ex.durationMinutes} Mins • {ex.questionCount} Questions</p>

                  <div className="flex items-center justify-between pt-2 border-t border-border/50">
                    <span className="text-[11px] text-muted-foreground font-medium">Starts: {ex.startDate}</span>

                    <Link href="/student/exams">
                      <Button
                        size="sm"
                        className={`rounded-none text-xs font-bold h-7 px-3 ${
                          ex.isLiveNow 
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                            : 'bg-primary text-primary-foreground hover:bg-primary/90'
                        }`}
                      >
                        {ex.isLiveNow ? 'Start Exam Now' : 'View Instructions'}
                      </Button>
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Recent Evaluated Results (5 Columns) */}
        <div className="lg:col-span-5 bg-card border border-border p-5 rounded-none space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-secondary" />
              <h2 className="text-sm font-bold text-foreground">Recent Exam Performance</h2>
            </div>
          </div>

          <div className="space-y-3">
            {recentResults.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">
                No recent graded results available.
              </p>
            ) : (
              recentResults.map((res) => (
                <div key={res.id} className="p-3.5 bg-background border border-border space-y-2 rounded-none">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-xs text-foreground">{res.title}</h4>
                      <p className="text-[10px] text-muted-foreground">{res.subject} • {res.date}</p>
                    </div>

                    <span className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 px-2 py-0.5 text-[9px] font-bold uppercase">
                      {res.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="font-semibold text-muted-foreground">Score: <strong className="text-foreground">{res.score}</strong> / {res.maxScore}</span>
                    <span className="font-extrabold text-primary">{res.percentage.toFixed(1)}%</span>
                  </div>

                  {/* Progress Bar */}
                  <div className="h-2 w-full bg-muted rounded-none overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-500" 
                      style={{ width: `${res.percentage}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
