'use client';

import React from 'react';
import { formatDateForHydration } from '@/lib/utils/date';
import { Sparkles, Clock } from 'lucide-react';

interface WelcomeBannerProps {
  name: string;
  description?: string;
  semester?: string;
  title?: string;
}

export default function WelcomeBanner({
  name,
  description = "Here's what's happening with your institution today.",
  semester = "Semester 2, 2026",
  title = "Institutional Console"
}: WelcomeBannerProps) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const formattedDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-primary to-secondary p-8 text-white rounded-none border border-primary/20 shadow-sm animate-in fade-in duration-300">
      {/* Decorative lines/patterns (rectangular/modern focus) */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute top-0 right-0 h-48 w-48 border border-white/20 translate-x-12 -translate-y-12 rotate-45" />
        <div className="absolute bottom-0 left-0 h-32 w-32 border border-white/20 -translate-x-6 translate-y-6 -rotate-12" />
      </div>
      
      <div className="relative z-10 space-y-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-yellow-100 animate-pulse shrink-0" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-white/90">{title}</span>
        </div>
        
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
          Welcome back, {name}!
        </h1>
        
        <p className="text-white/80 text-sm max-w-xl">
          {description}
        </p>
        
        <div className="mt-6 flex flex-wrap gap-2 pt-2">
          <span className="rounded-none bg-white/20 border border-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider">
            {semester}
          </span>
          <span className="rounded-none bg-white/20 border border-white/10 px-3 py-1 text-xs font-semibold flex items-center gap-1.5" suppressHydrationWarning>
            <Clock className="h-3.5 w-3.5" />
            {mounted ? formattedDate : 'Friday, July 24, 2026'}
          </span>
        </div>
      </div>
    </div>
  );
}
