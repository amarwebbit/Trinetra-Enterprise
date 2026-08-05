'use client';

import React from 'react';
import Link from 'next/link';
import { formatDateForHydration } from '@/lib/utils/date';
import { BookOpenCheck, Calendar, Clock, ArrowUpRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AssignmentCardProps {
  assignment: any;
}

export function AssignmentCard({ assignment }: AssignmentCardProps) {
  const attempted = assignment.exam_attempts && assignment.exam_attempts.length > 0;
  const attempt = attempted ? assignment.exam_attempts[0] : null;
  const isCompleted = attempted && attempt?.status !== 'in_progress';
  const dueDate = assignment.end_time || (assignment.metadata as any)?.due_date;

  return (
    <div className="group relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 overflow-hidden">
      {/* Accent left border pill */}
      <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${isCompleted ? 'bg-emerald-500' : attempted ? 'bg-amber-500' : 'bg-purple-500'}`} />

      <div className="pl-2 relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 border border-purple-100 dark:border-purple-800/50">
              <BookOpenCheck className="w-3.5 h-3.5" />
              Assignment
            </span>

            {isCompleted ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/50">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Completed
              </span>
            ) : attempted ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 border border-amber-100 dark:border-amber-800/50">
                <AlertCircle className="w-3.5 h-3.5" />
                In Progress
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                Pending
              </span>
            )}
          </div>

          <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors line-clamp-1">
            {assignment.title}
          </h3>

          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
            {assignment.description || 'Practice assignment and coursework problem set.'}
          </p>

          <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 pt-1">
            {dueDate && (
              <span className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                <Calendar className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                Due: {formatDateForHydration(dueDate)}
              </span>
            )}
            {assignment.duration_minutes > 0 && (
              <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                <Clock className="w-3.5 h-3.5" />
                {assignment.duration_minutes} mins
              </span>
            )}
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-2 self-start md:self-center">
          <Link href={`/student/exams/${assignment.id}/instructions`}>
            <Button
              size="sm"
              variant={isCompleted ? "outline" : "default"}
              className={`rounded-lg text-xs font-bold gap-1.5 ${isCompleted ? 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800' : 'bg-purple-600 hover:bg-purple-700 text-white shadow-md'}`}
            >
              <span>{isCompleted ? 'Review Work' : attempted ? 'Resume' : 'Start Assignment'}</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
