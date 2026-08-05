'use client';

import { useState } from 'react';
import { formatDateForHydration } from '@/lib/utils/date';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AvailableExamsUIProps {
  exams: any[];
  total: number;
  page: number;
  pageSize: number;
  filter: string;
  counts: { all: number; upcoming: number; ongoing: number; completed: number };
  search: string;
  studentId: string;
}

export function AvailableExamsUI({
  exams,
  total,
  page,
  pageSize,
  filter,
  counts,
  search,
  studentId,
}: AvailableExamsUIProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState(search);
  const [activeFolder, setActiveFolder] = useState<'all' | 'live' | 'assignment'>('all');
  
  // Filter tabs - ALL from REAL data
  const tabs = [
    { key: 'all', label: 'All Statuses', count: counts.all },
    { key: 'upcoming', label: '📅 Upcoming', count: counts.upcoming },
    { key: 'ongoing', label: '🔄 Ongoing', count: counts.ongoing },
    { key: 'completed', label: '✅ Completed', count: counts.completed },
  ];
  
  const handleFilterChange = (key: string) => {
    const params = new URLSearchParams();
    if (key !== 'all') params.set('filter', key);
    if (searchTerm) params.set('search', searchTerm);
    if (page > 1) params.set('page', String(page));
    router.push(`/student/exams?${params.toString()}`);
  };
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (filter !== 'all') params.set('filter', filter);
    if (searchTerm) params.set('search', searchTerm);
    router.push(`/student/exams?${params.toString()}`);
  };
  
  const getExamAction = (exam: any) => {
    const now = new Date();
    const isAssignment = exam.exam_type === 'assignment';
    const activeAttempt = exam.activeAttempt || (exam.studentAttempt?.status === 'in_progress' ? exam.studentAttempt : null);
    const completedCount = exam.completedAttemptsCount || 0;
    const maxAttempts = isAssignment ? (exam.max_attempts || 5) : (exam.max_attempts || 1);
    
    // 1. If student has an active in_progress attempt:
    if (activeAttempt) {
      return {
        label: isAssignment ? 'Resume Assignment' : 'Resume Exam',
        href: `/student/exams/${activeAttempt.id}/take`,
        color: 'bg-yellow-600 hover:bg-yellow-700 text-white font-bold',
      };
    }

    // 2. If past due/end_time:
    if (exam.end_time < now) {
      return {
        label: isAssignment ? 'Past Due' : 'Completed',
        href: '#',
        color: 'bg-gray-400 text-white cursor-not-allowed',
        disabled: true,
      };
    }
    
    // 3. For Assignments: Check attempt limit (e.g. 5 attempts allowed)
    if (isAssignment) {
      if (completedCount < maxAttempts) {
        const attemptLabel = completedCount > 0 
          ? `Re-attempt (${completedCount + 1}/${maxAttempts})` 
          : `Start Assignment (${maxAttempts} Attempts)`;
        return {
          label: attemptLabel,
          href: `/student/exams/${exam.id}/instructions`,
          color: 'bg-purple-600 hover:bg-purple-700 text-white font-bold',
        };
      } else {
        return {
          label: `Max Attempts Reached (${completedCount}/${maxAttempts})`,
          href: exam.show_results_immediately ? `/student/results/${exam.id}` : '#',
          color: exam.show_results_immediately ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'bg-gray-400 text-white cursor-not-allowed',
          disabled: !exam.show_results_immediately,
        };
      }
    }

    // 4. For Live/Standard Exams: Check attempt limit
    if (completedCount >= maxAttempts) {
      if (exam.show_results_immediately) {
        return {
          label: 'View Results',
          href: `/student/results/${exam.id}`,
          color: 'bg-purple-600 hover:bg-purple-700 text-white',
        };
      }
      return {
        label: '⏳ Submitted',
        href: '#',
        color: 'bg-gray-400 text-white cursor-not-allowed',
        disabled: true,
      };
    }
    
    if (completedCount > 0 && completedCount < maxAttempts) {
      return {
        label: `Re-attempt (${completedCount + 1}/${maxAttempts})`,
        href: `/student/exams/${exam.id}/instructions`,
        color: 'bg-purple-600 hover:bg-purple-700 text-white font-bold',
      };
    }

    if (exam.start_time <= now && exam.end_time >= now) {
      return {
        label: 'Start Exam',
        href: `/student/exams/${exam.id}/instructions`,
        color: 'bg-green-600 hover:bg-green-700 text-white',
      };
    }
    
    return {
      label: 'View Details',
      href: `/student/exams/${exam.id}/instructions`,
      color: 'bg-blue-600 hover:bg-blue-700 text-white',
    };
  };
  
  const getStatusBadge = (exam: any) => {
    const statusColors: Record<string, string> = {
      upcoming: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
      ongoing: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
      in_progress: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800',
      completed: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
      pending_results: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800',
      available: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    };
    
    const labels: Record<string, string> = {
      upcoming: '📅 Upcoming',
      ongoing: '🔄 Ongoing',
      in_progress: '⏳ In Progress',
      completed: '✅ Completed',
      pending_results: '⏳ Pending',
      available: '📅 Available',
    };

    if (exam.exam_type === 'assignment') {
      return (
        <span className="text-xs px-2.5 py-1 rounded-full border font-bold whitespace-nowrap bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-300">
          📝 Assignment
        </span>
      );
    }

    return (
      <span className={`text-xs px-2.5 py-1 rounded-full border font-medium whitespace-nowrap ${statusColors[exam.status] || statusColors.available}`}>
        {labels[exam.status] || exam.status}
      </span>
    );
  };

  const displayedExams = exams.filter((exam) => {
    if (activeFolder === 'live') return exam.exam_type !== 'assignment';
    if (activeFolder === 'assignment') return exam.exam_type === 'assignment';
    return true;
  });

  const liveCount = exams.filter(e => e.exam_type !== 'assignment').length;
  const assignmentCount = exams.filter(e => e.exam_type === 'assignment').length;
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight">Student Portal Assessments</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Access your proctored live exams, semester mid-terms, and homework assignments.
          </p>
        </div>
      </div>

      {/* Folders Navigation: Live Exams vs Homework Assignments */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-2">
        <button
          onClick={() => setActiveFolder('all')}
          className={`flex items-center space-x-2 px-4 py-2 text-xs font-bold transition-all border-b-2 ${
            activeFolder === 'all'
              ? 'border-primary text-primary font-extrabold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <span>📁 All Assessments</span>
          <span className="bg-muted px-2 py-0.5 text-[10px] rounded-full">{exams.length}</span>
        </button>

        <button
          onClick={() => setActiveFolder('live')}
          className={`flex items-center space-x-2 px-4 py-2 text-xs font-bold transition-all border-b-2 ${
            activeFolder === 'live'
              ? 'border-blue-600 text-blue-600 font-extrabold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <span>🏆 Live Exams & Tests</span>
          <span className="bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 px-2 py-0.5 text-[10px] rounded-full font-bold">
            {liveCount}
          </span>
        </button>

        <button
          onClick={() => setActiveFolder('assignment')}
          className={`flex items-center space-x-2 px-4 py-2 text-xs font-bold transition-all border-b-2 ${
            activeFolder === 'assignment'
              ? 'border-purple-600 text-purple-600 font-extrabold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <span>📝 Homework & Assignments</span>
          <span className="bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 px-2 py-0.5 text-[10px] rounded-full font-bold">
            {assignmentCount}
          </span>
        </button>
      </div>
      
      {/* Filters & Search */}
      <div className="bg-card border border-border p-4 rounded-none space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex flex-wrap items-center space-x-1 border-b border-border sm:border-0 pb-2 sm:pb-0">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => handleFilterChange(tab.key)}
                className={`px-3 py-1.5 text-xs font-bold transition-all rounded-none ${
                  filter === tab.key
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>
          
          {/* Search Input */}
          <form onSubmit={handleSearch} className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search assessment title..."
              className="w-full bg-background border border-input pl-9 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary rounded-none"
            />
          </form>
        </div>
      </div>
      
      {/* Exam Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayedExams.length === 0 ? (
          <div className="col-span-full py-12 text-center text-muted-foreground text-xs bg-card border border-border">
            No assessments found in this folder.
          </div>
        ) : (
          displayedExams.map((exam) => {
            const action = getExamAction(exam);
            const isOngoing = exam.status === 'ongoing' || exam.status === 'in_progress';
            const isAssignment = exam.exam_type === 'assignment';
            
            return (
              <div 
                key={exam.id} 
                className={`bg-card border p-5 rounded-none space-y-4 shadow-sm flex flex-col justify-between transition-all ${
                  isOngoing ? 'border-emerald-500/50 ring-1 ring-emerald-500/20' : 'border-border'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="font-bold text-foreground text-sm leading-tight line-clamp-2" title={exam.title}>{exam.title}</h2>
                    {getStatusBadge(exam)}
                  </div>
                  
                  <p className="text-xs text-muted-foreground">
                    Instructor: <span className="font-medium text-foreground">{exam.users?.full_name || 'Faculty Member'}</span>
                  </p>
                  
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/60 text-xs">
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                        {isAssignment ? 'Due Date' : 'Start Date'}
                      </span>
                      <span className="font-bold text-foreground truncate block" title={formatDateForHydration(isAssignment ? exam.end_time : exam.start_time)}>
                        {formatDateForHydration(isAssignment ? exam.end_time : exam.start_time)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase font-bold block">Time Limit</span>
                      <span className="font-bold text-foreground block">{exam.duration_minutes} Mins</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase font-bold block">Total Marks</span>
                      <span className="font-bold text-foreground block">{exam.total_marks ? Number(exam.total_marks) : '—'}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-border/60">
                  {!action.disabled ? (
                    <Link href={action.href} className="w-full">
                      <Button className={`w-full rounded-none text-xs font-bold ${action.color} border-0`}>
                        {action.label}
                      </Button>
                    </Link>
                  ) : (
                    <Button disabled variant="outline" className="w-full rounded-none text-xs font-semibold">
                      {action.label}
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
      
      {/* Pagination */}
      {total > pageSize && (
        <div className="flex justify-center gap-2 mt-6">
          {Array.from({ length: Math.ceil(total / pageSize) }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => {
                const params = new URLSearchParams();
                if (filter !== 'all') params.set('filter', filter);
                if (searchTerm) params.set('search', searchTerm);
                if (p > 1) params.set('page', String(p));
                router.push(`/student/exams?${params.toString()}`);
              }}
              className={`px-3 py-1.5 rounded-none text-xs font-bold border ${
                p === page
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card text-muted-foreground border-border hover:bg-muted'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
