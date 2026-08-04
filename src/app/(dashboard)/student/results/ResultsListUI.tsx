'use client';

import Link from 'next/link';
import { formatDateForHydration } from '@/lib/utils/date';

export function ResultsListUI({
  attempts,
  total,
  page,
  pageSize,
  stats,
  filter,
  tenant,
}: any) {
  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">📊 My Results</h1>
          <p className="text-sm text-slate-500 mt-1">Review your completed exams and track your performance.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full">
            Average Score: <strong className="text-purple-600 dark:text-purple-400">{stats.average}%</strong>
          </span>
        </div>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-blue-200 dark:border-blue-900/50 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full transition-transform group-hover:scale-150"></div>
          <div className="relative z-10">
            <div className="text-3xl font-extrabold text-blue-600 dark:text-blue-400">{stats.total}</div>
            <div className="text-sm font-semibold text-slate-600 dark:text-slate-400 mt-1 uppercase tracking-wider">Total Exams</div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-emerald-200 dark:border-emerald-900/50 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full transition-transform group-hover:scale-150"></div>
          <div className="relative z-10">
            <div className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">{stats.passed}</div>
            <div className="text-sm font-semibold text-slate-600 dark:text-slate-400 mt-1 uppercase tracking-wider">Passed</div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-red-200 dark:border-red-900/50 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full transition-transform group-hover:scale-150"></div>
          <div className="relative z-10">
            <div className="text-3xl font-extrabold text-red-600 dark:text-red-400">{stats.failed}</div>
            <div className="text-sm font-semibold text-slate-600 dark:text-slate-400 mt-1 uppercase tracking-wider">Failed</div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-purple-200 dark:border-purple-900/50 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full transition-transform group-hover:scale-150"></div>
          <div className="relative z-10">
            <div className="text-3xl font-extrabold text-purple-600 dark:text-purple-400">{stats.average}%</div>
            <div className="text-sm font-semibold text-slate-600 dark:text-slate-400 mt-1 uppercase tracking-wider">Avg Score</div>
          </div>
        </div>
      </div>
      
      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <Link href="/student/results?filter=all">
          <button className={`px-5 py-2.5 rounded-t-lg font-bold text-sm transition-colors ${filter === 'all' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
            All ({stats.total})
          </button>
        </Link>
        <Link href="/student/results?filter=passed">
          <button className={`px-5 py-2.5 rounded-t-lg font-bold text-sm transition-colors ${filter === 'passed' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
            Passed ({stats.passed})
          </button>
        </Link>
        <Link href="/student/results?filter=failed">
          <button className={`px-5 py-2.5 rounded-t-lg font-bold text-sm transition-colors ${filter === 'failed' ? 'bg-red-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
            Failed ({stats.failed})
          </button>
        </Link>
      </div>
      
      {/* Results List */}
      {attempts.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-12 text-center shadow-sm">
          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">📝</span>
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">No results found</h3>
          <p className="text-slate-500 max-w-sm mx-auto">
            {filter === 'all' 
              ? "You haven't completed any exams yet. When you do, their results will appear here." 
              : `You don't have any ${filter} exams.`}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {attempts.map((attempt: any) => (
            <Link key={attempt.id} href={`/student/results/${attempt.exams.id}`} className="group block h-full">
              <div className={`h-full bg-white dark:bg-slate-900 border rounded-xl p-5 hover:shadow-md transition-all group-hover:-translate-y-1 ${
                attempt.passed 
                  ? 'border-emerald-200 dark:border-emerald-800/50 hover:border-emerald-300 dark:hover:border-emerald-700'
                  : 'border-red-200 dark:border-red-800/50 hover:border-red-300 dark:hover:border-red-700'
              }`}>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-extrabold text-lg text-slate-900 dark:text-white line-clamp-1">{attempt.exams.title}</h3>
                    <p className="text-sm font-medium text-slate-500 mt-1">
                      {formatDateForHydration(attempt.end_time)}
                    </p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                    attempt.passed 
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' 
                      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  }`}>
                    {attempt.passed ? 'Passed' : 'Failed'}
                  </div>
                </div>
                
                <div className="flex items-end justify-between mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div>
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Score</div>
                    <div className="text-lg font-bold text-slate-700 dark:text-slate-300">
                      {attempt.score} <span className="text-sm text-slate-400">/ {attempt.exams.total_marks}</span>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Percentage</div>
                    <div className={`text-3xl font-extrabold ${attempt.passed ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                      {attempt.percentage}%
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
