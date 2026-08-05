'use client';

import { ReactNode } from 'react';

export function StatCard({ label, value, icon, color }: {
  label: string;
  value: string | number;
  icon: ReactNode;
  color: string;
}) {
  const iconBgColors: Record<string, string> = {
    blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 dark:border-blue-800/30',
    green: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 dark:border-emerald-800/30',
    purple: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 dark:border-purple-800/30',
    orange: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 dark:border-amber-800/30',
  };

  const bottomAccents: Record<string, string> = {
    blue: 'from-blue-500 to-indigo-600',
    green: 'from-emerald-400 to-teal-600',
    purple: 'from-purple-500 to-violet-600',
    orange: 'from-amber-400 to-orange-600',
  };

  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 group">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</p>
          <p className="text-2xl lg:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {value}
          </p>
        </div>
        <div className={`p-3 rounded-xl border ${iconBgColors[color] || iconBgColors.blue} transition-transform duration-300 group-hover:scale-110 shadow-xs`}>
          {icon}
        </div>
      </div>
      <div className={`absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r ${bottomAccents[color] || bottomAccents.blue} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left`} />
    </div>
  );
}
