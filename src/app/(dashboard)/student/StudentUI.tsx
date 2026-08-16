'use client';

import Link from 'next/link';
import { formatDateForHydration } from '@/lib/utils/date';
import { StatCard } from './components/StatCard';
import { ExamCard } from './components/ExamCard';
import { ResultCard } from './components/ResultCard';
import { AssignmentCard } from './components/AssignmentCard';
import { useState, useEffect } from 'react';
import { BookOpen, CheckCircle, Trophy, Clock, SearchX, Inbox, BookDashed, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useStore } from '@/store/useStore';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid } from 'recharts';

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-950/90 border border-slate-800 p-3 rounded-lg shadow-xl backdrop-blur-md">
        <p className="text-[10px] font-semibold text-slate-400">{payload[0].payload.name}</p>
        <p className="text-xs font-extrabold text-blue-400 mt-1">Score: {payload[0].value}%</p>
      </div>
    );
  }
  return null;
};

interface StudentUIProps {
  upcomingExams: any[];
  activeExams: any[];
  assignments: any[];
  assignmentExams: any[];
  recentResults: any[];
  stats: {
    upcomingCount: number;
    completedCount: number;
    averageScore: number;
    pendingResults: number;
  };
  studentName: string;
  tenantId: string;
  studentId: string;
}

export default function StudentUI({ 
  upcomingExams, 
  activeExams, 
  assignments,
  assignmentExams,
  recentResults, 
  stats,
  studentName,
}: StudentUIProps) {
  const { theme } = useStore();
  const isDark = theme === 'dark';
  const gridColor = isDark ? '#1e293b' : '#f1f5f9';
  const chartStroke = isDark ? '#8b5cf6' : '#6366f1';

  const hasUpcoming = upcomingExams.length > 0;
  const hasActive = activeExams.length > 0;
  const hasResults = recentResults.length > 0;
  const hasAssignmentExams = assignmentExams.length > 0;
  
  const [liveResults, setLiveResults] = useState(recentResults);
  const [newResultIds, setNewResultIds] = useState<Set<string>>(new Set());

  // Animation states for staggering
  const [isLoaded, setIsLoaded] = useState(false);
  const [mountedChart, setMountedChart] = useState(false);

  useEffect(() => {
    setMountedChart(true);
  }, []);

  useEffect(() => {
    setIsLoaded(true);
    
    // Poll for new results every 10 seconds
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/student/results/recent');
        const data = await res.json();
        if (data.success && data.data) {
          const currentIds = new Set(liveResults.map((r: any) => r.id));
          const newlyAddedIds = new Set(newResultIds);
          
          let hasNew = false;
          const formattedData = data.data.map((r: any) => {
             if (!currentIds.has(r.id)) {
               newlyAddedIds.add(r.id);
               hasNew = true;
             }
             return {
               id: r.id,
               status: 'evaluated',
               score: r.score,
               percentage: r.percentage || (r.score / r.totalMarks) * 100,
               end_time: r.completedAt,
               is_best_attempt: r.isBestAttempt,
               exams: {
                 title: r.examTitle,
                 total_marks: r.totalMarks,
                 passing_percentage: 40,
                 show_results_immediately: true,
                 allow_multiple: r.allowMultiple,
                 max_attempts: r.maxAttempts
               }
             };
          });

          if (hasNew) {
            setNewResultIds(newlyAddedIds);
            setLiveResults(formattedData);
          }
        }
      } catch (e) {
        // silently fail on polling error
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [liveResults, newResultIds]);
  
  const displayResults = liveResults.length > 0 ? liveResults : recentResults;
  const hasLiveResults = displayResults.length > 0;

  const chartData = displayResults.length > 0 
    ? [...displayResults].reverse().map((r: any) => ({
        name: r.exams?.title?.substring(0, 12) || 'Test',
        Score: Math.round(r.percentage || 0),
      }))
    : [];

  const initials = studentName?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'ST';
  
  return (
    <div className={`space-y-8 transition-opacity duration-700 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}>
      
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
        {/* Abstract shapes for background */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 rounded-full bg-white opacity-5 blur-3xl"></div>
        <div className="absolute bottom-0 left-20 w-40 h-40 rounded-full bg-white opacity-10 blur-2xl"></div>
        
        <div className="flex items-center justify-between relative z-10">
          <div className="space-y-1">
            <p className="text-blue-100 text-sm font-medium tracking-wide uppercase">Welcome back,</p>
            <h1 className="text-3xl font-extrabold tracking-tight">{studentName}!</h1>
            <p className="text-blue-100 mt-2 max-w-lg">
              You have <span className="font-bold text-white">{stats.upcomingCount}</span> upcoming {stats.upcomingCount === 1 ? 'exam' : 'exams'} and <span className="font-bold text-white">{stats.pendingResults}</span> pending {stats.pendingResults === 1 ? 'result' : 'results'}. Ready to ace them?
            </p>
          </div>
          <div className="hidden sm:flex w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full items-center justify-center text-3xl font-bold border border-white/30 shadow-inner">
            {initials}
          </div>
        </div>
      </div>
      
      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          icon={<BookOpen className="h-6 w-6" />}
          label="Upcoming"
          value={stats.upcomingCount}
          color="blue"
        />
        <StatCard 
          icon={<CheckCircle className="h-6 w-6" />}
          label="Completed"
          value={stats.completedCount}
          color="green"
        />
        <StatCard 
          icon={<Trophy className="h-6 w-6" />}
          label="Avg Score"
          value={`${stats.averageScore.toFixed(1)}%`}
          color="purple"
        />
        <StatCard 
          icon={<Clock className="h-6 w-6" />}
          label="Pending Results"
          value={stats.pendingResults}
          color="orange"
        />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Active & Upcoming Exams */}
        <div className="lg:col-span-7 space-y-8">
          
          {/* Active Exams - Only show if there are active exams */}
          {hasActive && (
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                  </span>
                  Live Now
                </h2>
                <Link href="/student/exams" className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1 group">
                  View All <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
              <div className="space-y-4">
                {activeExams.map((exam) => (
                  <ExamCard key={exam.id} exam={exam} type="active" />
                ))}
              </div>
            </div>
          )}

          {/* Upcoming Exams */}
          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                Upcoming Exams
              </h2>
              <Link href="/student/exams" className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1 group">
                View All <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
            
            {hasUpcoming ? (
              <div className="space-y-4">
                {upcomingExams.map((exam) => (
                  <ExamCard key={exam.id} exam={exam} type="upcoming" />
                ))}
              </div>
            ) : (
              <div className="bg-slate-50 dark:bg-slate-900/50 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-10 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center text-blue-500 dark:text-blue-400 mb-4">
                  <SearchX className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">No upcoming exams</h3>
                <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-sm">
                  You don't have any upcoming exams scheduled at the moment. Enjoy your free time or review past results!
                </p>
                <Link href="/student/exams">
                  <Button variant="outline" className="rounded-full border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700">Browse Courses</Button>
                </Link>
              </div>
            )}
          </div>

          {/* Practice & Coursework Assignments */}
          {hasAssignmentExams && (
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/30">
                    <BookOpen className="w-5 h-5" />
                  </span>
                  Practice & Coursework Assignments
                </h2>
              </div>
              <div className="space-y-3">
                {assignmentExams.map((assignment: any) => (
                  <AssignmentCard key={assignment.id} assignment={assignment} />
                ))}
              </div>
            </div>
          )}

          {/* Legacy PDF Assignments */}
          {assignments.length > 0 && (
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  Files & Resources
                </h2>
              </div>
              <div className="space-y-3">
                {assignments.map((assignment) => (
                  <AssignmentCard key={assignment.id} assignment={assignment} />
                ))}
              </div>
            </div>
          )}
          
        </div>

        {/* Right Column: Recent Results & Analytics */}
        <div className="lg:col-span-5 space-y-6">
          {/* Preparation & Score Trends Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm dark:shadow-lg relative overflow-hidden">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-200 mb-4 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              Preparation & Performance Trends
            </h3>
            <div className="h-48 w-full">
              {displayResults.length > 0 ? (
                mountedChart ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                      <defs>
                        <linearGradient id="scoreColor" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={chartStroke} stopOpacity={0.3}/>
                          <stop offset="95%" stopColor={chartStroke} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke={gridColor} strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" stroke={isDark ? '#64748b' : '#94a3b8'} fontSize={9} tickLine={false} />
                      <YAxis stroke={isDark ? '#64748b' : '#94a3b8'} fontSize={9} tickLine={false} axisLine={false} domain={[0, 100]} />
                      <RechartsTooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="Score" stroke={chartStroke} strokeWidth={2} fillOpacity={1} fill="url(#scoreColor)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full w-full bg-slate-100 dark:bg-slate-800/40 animate-pulse rounded" />
                )
              ) : (
                <div className="h-full w-full flex flex-col items-center justify-center text-center p-4 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50/50 dark:bg-slate-900/30">
                  <Trophy className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-2" />
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">No test history yet</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 max-w-[220px]">
                    Complete your first exam to unlock performance trends and analytics.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                Recent Results
              </h2>
              <Link href="/student/results" className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1 group">
                View All <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
            
            {hasLiveResults ? (
              <div className="space-y-4">
                {displayResults.map((result: any, index: number) => (
                  <div key={result.id} className="relative transform transition-all duration-500" style={{ transitionDelay: `${index * 100}ms` }}>
                    {newResultIds.has(result.id) && (
                      <span className="absolute -top-2 -right-2 z-20 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md animate-bounce">
                        NEW
                      </span>
                    )}
                    <ResultCard result={result} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-slate-50 dark:bg-slate-900/80 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-10 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800/50 rounded-full flex items-center justify-center text-purple-600 dark:text-purple-400 mb-4">
                  <Inbox className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">No results yet</h3>
                <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-[200px]">
                  Complete an exam to see your performance metrics and grades here.
                </p>
                <Link href="/student/results">
                  <Button variant="outline" className="rounded-full border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700">View History</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
