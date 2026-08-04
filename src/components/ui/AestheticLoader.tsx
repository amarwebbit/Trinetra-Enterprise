'use client';

import { useState, useEffect } from 'react';
import { Loader2, Sparkles } from 'lucide-react';

const LOADING_SLOGANS = [
  "Securing your assessment environment...",
  "Calculating scores and detailed response metrics...",
  "Encrypting answers for safe submission...",
  "Evaluating responses with precision...",
  "Preparing your personalized performance insights...",
  "Verifying anti-cheat integrity & audit logs...",
  "Generating question-by-question analysis..."
];

interface AestheticLoaderProps {
  title?: string;
  subtitle?: string;
  fullScreen?: boolean;
}

export function AestheticLoader({
  title = "Processing...",
  subtitle,
  fullScreen = true,
}: AestheticLoaderProps) {
  const [sloganIndex, setSloganIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setSloganIndex((prev) => (prev + 1) % LOADING_SLOGANS.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  const content = (
    <div className="flex flex-col items-center justify-center text-center p-8 max-w-md w-full animate-in fade-in zoom-in duration-300">
      <div className="relative mb-6">
        <div className="w-16 h-16 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin" />
        </div>
        <div className="absolute -top-1 -right-1 bg-amber-400 rounded-full p-1 shadow-md">
          <Sparkles className="w-3.5 h-3.5 text-slate-900" />
        </div>
      </div>

      <h3 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2">
        {title}
      </h3>

      <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-4 h-6 flex items-center justify-center transition-all duration-500">
        {subtitle || LOADING_SLOGANS[sloganIndex]}
      </p>

      <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full w-1/2 rounded-full animate-pulse"></div>
      </div>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[300] flex items-center justify-center p-4 select-none">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800">
          {content}
        </div>
      </div>
    );
  }

  return content;
}
