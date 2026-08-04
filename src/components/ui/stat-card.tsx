import React from 'react';
import { cn } from '@/lib/utils/helpers';

interface StatCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  trendValue: string | number;
  isPositive: boolean;
  onClick?: () => void;
}

export default function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trendValue,
  isPositive,
  onClick
}: StatCardProps) {
  return (
    <div 
      onClick={onClick}
      className={cn(
        "bg-card text-card-foreground p-6 shadow-sm border border-border transition-all duration-200 group rounded-none",
        onClick && "cursor-pointer hover:shadow hover:border-primary/40 hover:-translate-y-0.5 transform"
      )}
    >
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate">{title}</p>
          <p className="text-3xl font-extrabold tracking-tight text-foreground mt-1.5">{value}</p>
        </div>
        <div className="h-12 w-12 rounded-none bg-primary/10 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
          <Icon className="h-6 w-6 text-primary" />
        </div>
      </div>
      <div className="mt-4 flex items-center gap-1.5 text-xs">
        {trendValue && (
          <span className={cn("font-bold", isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400")}>
            {isPositive && typeof trendValue === 'string' && /^\d/.test(trendValue) ? `+${trendValue}` : trendValue}
          </span>
        )}
        <span className="text-muted-foreground truncate">{description}</span>
      </div>
    </div>
  );
}
