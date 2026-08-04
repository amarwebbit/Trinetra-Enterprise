import Link from 'next/link';
import { formatDateForHydration } from '@/lib/utils/date';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, FileText, ArrowRight, PlayCircle } from 'lucide-react';

export function ExamCard({ exam, type }: { exam: any; type: 'upcoming' | 'active' }) {
  const startDate = new Date(exam.start_time);
  
  const statusColors = {
    upcoming: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200/50',
    active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200/50',
  };
  
  const statusLabels = {
    upcoming: 'Upcoming',
    active: 'In Progress',
  };
  
  // Checking if the student has already attempted it
  const hasAttempted = exam.exam_attempts && exam.exam_attempts.length > 0;
  
  return (
    <div className="group relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 overflow-hidden">
      {/* Subtle background gradient on hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 to-purple-50/50 dark:from-blue-900/10 dark:to-purple-900/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <div className="relative z-10">
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full border ${statusColors[type]}`}>
                {statusLabels[type]}
              </span>
              {type === 'active' && !hasAttempted && (
                <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  Live Now
                </span>
              )}
            </div>
            
            <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100 line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {exam.title}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {exam.users?.full_name || 'Unknown Teacher'}
            </p>
          </div>
          
          {type === 'active' && !hasAttempted && (
            <Link href={`/student/exams/${exam.id}/instructions`} className="shrink-0">
              <Button size="sm" className="rounded-full shadow-md hover:shadow-lg transition-all bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border-0 h-9 px-4 gap-2">
                <PlayCircle className="w-4 h-4" />
                Start Exam
              </Button>
            </Link>
          )}
          
          {type === 'active' && hasAttempted && (
            <div className="shrink-0 text-sm font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 px-3 py-1.5 rounded-full border border-emerald-200 dark:border-emerald-800">
              ✓ Submitted
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-3 gap-4 mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/60">
          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <div className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-md text-slate-500 dark:text-slate-400">
              <Calendar className="w-3.5 h-3.5" />
            </div>
            <span className="truncate">{formatDateForHydration(startDate)}</span>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <div className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-md text-slate-500 dark:text-slate-400">
              <Clock className="w-3.5 h-3.5" />
            </div>
            <span>{exam.duration_minutes} mins</span>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <div className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-md text-slate-500 dark:text-slate-400">
              <FileText className="w-3.5 h-3.5" />
            </div>
            <span>{exam._count?.exam_sections || 0} sections</span>
          </div>
        </div>
      </div>
    </div>
  );
}
