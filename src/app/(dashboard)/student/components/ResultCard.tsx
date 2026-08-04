import { formatDateForHydration } from '@/lib/utils/date';
import { Trophy, Clock, Target, Calendar } from 'lucide-react';

export function ResultCard({ result }: { result: any }) {
  const percentage = result.percentage || 0;
  const passingPercentage = result.exams?.passing_percentage || 40;
  const passed = percentage >= passingPercentage;
  const isPublished = result.exams?.show_results_immediately !== false;
  const hasScore = result.score !== null && result.score !== undefined;
  const isScored = ['submitted', 'evaluated', 'graded'].includes(result.status) && hasScore;

  // Show PENDING only if results are explicitly hidden or not yet scored
  if (!isPublished || !isScored) {
    return (
      <div className="group relative bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-5 overflow-hidden">
        <div className="flex justify-between items-center relative z-10">
          <div className="flex gap-4 items-center">
            <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100">{result.exams?.title || 'Unknown Exam'}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                {!isPublished ? 'Results not yet released' : 'Submitted - Waiting for evaluation'}
              </p>
            </div>
          </div>
          <span className="text-xs px-3 py-1.5 rounded-full border bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-200/50 dark:border-orange-800/50 font-bold tracking-wide uppercase">
            Pending
          </span>
        </div>
      </div>
    );
  }
  
  // Calculate SVG circle properties for progress ring
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  
  return (
    <div className="group relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 overflow-hidden">
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r ${passed ? 'from-emerald-50/50 to-teal-50/50 dark:from-emerald-900/10 dark:to-teal-900/10' : 'from-red-50/50 to-rose-50/50 dark:from-red-900/10 dark:to-rose-900/10'}`} />
      
      <div className="relative z-10 flex items-center gap-5">
        {/* Progress Ring */}
        <div className="relative shrink-0 w-16 h-16 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 64 64">
            <circle
              className="text-slate-100 dark:text-slate-800 stroke-current"
              strokeWidth="6"
              cx="32"
              cy="32"
              r={radius}
              fill="transparent"
            />
            <circle
              className={`${passed ? 'text-emerald-500' : 'text-red-500'} stroke-current transition-all duration-1000 ease-out`}
              strokeWidth="6"
              strokeLinecap="round"
              cx="32"
              cy="32"
              r={radius}
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center flex-col">
            <span className={`text-[13px] font-bold ${passed ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
              {Math.round(percentage)}%
            </span>
          </div>
        </div>

        <div className="flex-1 flex justify-between items-center gap-4">
          <div>
            <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100 flex items-center gap-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1">
              {result.exams?.title || 'Unknown Exam'}
              {result.exams?.allow_multiple && (
                <span className="text-[9px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border border-emerald-200 dark:border-emerald-800">
                  Best Attempt
                </span>
              )}
            </h3>
            
            <div className="flex items-center gap-4 mt-2 text-sm text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                {formatDateForHydration(result.end_time || result.completedAt)}
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <Target className="w-3.5 h-3.5" />
                {result.score} / {result.exams?.total_marks || result.totalMarks} marks
              </span>
            </div>
          </div>
          
          <div className="shrink-0 text-right">
            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide border ${
              passed 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200/50 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/50' 
                : 'bg-red-50 text-red-700 border-red-200/50 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/50'
            }`}>
              {passed ? <Trophy className="w-3.5 h-3.5" /> : null}
              {passed ? 'Passed' : 'Failed'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
