import { ReactNode } from 'react';

export function StatCard({ label, value, icon, color }: {
  label: string;
  value: string | number;
  icon: ReactNode;
  color: string;
}) {
  const colors: Record<string, string> = {
    blue: 'from-blue-500/10 to-blue-600/10 border-blue-200/50 dark:border-blue-800/50 text-blue-700 dark:text-blue-300 shadow-blue-500/5',
    green: 'from-emerald-500/10 to-emerald-600/10 border-emerald-200/50 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-300 shadow-emerald-500/5',
    purple: 'from-purple-500/10 to-purple-600/10 border-purple-200/50 dark:border-purple-800/50 text-purple-700 dark:text-purple-300 shadow-purple-500/5',
    orange: 'from-orange-500/10 to-orange-600/10 border-orange-200/50 dark:border-orange-800/50 text-orange-700 dark:text-orange-300 shadow-orange-500/5',
  };
  
  const iconBgColors: Record<string, string> = {
    blue: 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400',
    green: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400',
    purple: 'bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400',
    orange: 'bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400',
  };
  
  return (
    <div className={`relative overflow-hidden rounded-xl border bg-gradient-to-br ${colors[color] || colors.blue} p-6 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-1 group`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{label}</p>
          <div className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            {value}
          </div>
        </div>
        <div className={`p-3 rounded-xl ${iconBgColors[color] || iconBgColors.blue} transition-transform duration-300 group-hover:scale-110`}>
          {icon}
        </div>
      </div>
      <div className={`absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r ${color === 'blue' ? 'from-blue-400 to-blue-600' : color === 'green' ? 'from-emerald-400 to-emerald-600' : color === 'purple' ? 'from-purple-400 to-purple-600' : 'from-orange-400 to-orange-600'} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left`} />
    </div>
  );
}
