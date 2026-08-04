'use client';

import React from 'react';
import { cn } from '@/lib/utils/helpers';
import { Clock } from 'lucide-react';

export interface ActivityItem {
  id: string;
  user: string;
  action: string;
  resourceType: string;
  createdAt: string;
}

interface ActivityFeedProps {
  activities: ActivityItem[];
  maxHeight?: string;
}

export default function ActivityFeed({
  activities,
  maxHeight = "max-h-[280px]"
}: ActivityFeedProps) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const getInitials = (name: string) => {
    if (!name) return 'SA';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  const getResourceTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'department':
      case 'course':
        return 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20';
      case 'exam':
      case 'question_bank':
        return 'bg-[#D46D25]/10 text-[#D46D25] border border-[#D46D25]/20';
      case 'billing':
        return 'bg-amber-500/10 text-amber-600 border border-amber-500/20';
      default:
        return 'bg-primary/10 text-primary border border-primary/20';
    }
  };

  const formatTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      let hours = d.getHours();
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      return `${hours}:${minutes} ${ampm}`;
    } catch (e) {
      return '12:00 PM';
    }
  };

  return (
    <div className={cn("overflow-y-auto pr-1", maxHeight)}>
      {activities.length === 0 ? (
        <div className="text-center py-8 text-xs text-muted-foreground">
          No recent activity logged.
        </div>
      ) : (
        <ul className="divide-y divide-border space-y-4">
          {activities.map((activity, idx) => (
            <li key={activity.id} className={cn("pt-4 first:pt-0 flex items-start space-x-3 text-xs animate-in fade-in duration-300", idx > 0 && "border-t border-border")}>
              <div className="flex-shrink-0">
                <div className="h-9 w-9 rounded-none bg-primary/15 border border-primary/20 flex items-center justify-center font-bold text-primary">
                  {getInitials(activity.user)}
                </div>
              </div>
              
              <div className="min-w-0 flex-1 space-y-1">
                <p className="font-semibold text-foreground truncate">
                  {activity.user}
                </p>
                <p className="text-muted-foreground break-words leading-relaxed">
                  {activity.action}
                </p>
                <div className="flex items-center space-x-2 text-[10px] text-muted-foreground font-semibold pt-0.5">
                  <span className={cn("uppercase px-1.5 py-0.5 text-[8px] font-bold tracking-wider", getResourceTypeColor(activity.resourceType))}>
                    {activity.resourceType}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1 font-medium" suppressHydrationWarning>
                    <Clock className="h-3 w-3" />
                    {mounted ? formatTime(activity.createdAt) : '12:00 PM'}
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
