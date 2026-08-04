'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, BookOpen, User, CalendarClock, Loader2 } from 'lucide-react';

interface WaitingRoomUIProps {
  exam: any;
  tenant: any;
  totalQuestions: number;
  studentName: string;
}

export function WaitingRoomUI({ exam, tenant, totalQuestions, studentName }: WaitingRoomUIProps) {
  const router = useRouter();
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [isReady, setIsReady] = useState(false);

  const primaryColor = tenant?.primary_color || '#1e4579';
  const tenantName = tenant?.name || 'TrinetraEdu-AI';

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date().getTime();
      const startTime = new Date(exam.start_time).getTime();
      const diff = startTime - now;

      if (diff <= 0) {
        setIsReady(true);
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
        // Auto-reload to enter instructions/exam flow
        setTimeout(() => {
          router.refresh();
        }, 1500);
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft({ hours, minutes, seconds });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [exam.start_time, router]);

  const pad = (n: number) => String(n).padStart(2, '0');

  const startDate = new Date(exam.start_time);
  const formattedDate = startDate.toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const formattedTime = startDate.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  if (isReady) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="text-center animate-in fade-in zoom-in duration-500">
          <div className="w-20 h-20 rounded-full bg-emerald-100 border-2 border-emerald-300 flex items-center justify-center mx-auto mb-6 shadow-lg">
            <BookOpen className="w-10 h-10 text-emerald-600" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">
            Exam is Starting!
          </h1>
          <p className="text-sm text-slate-500 mb-6">Redirecting you to the exam...</p>
          <Loader2 className="w-6 h-6 animate-spin text-emerald-600 mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4 relative overflow-hidden select-none">

      {/* Subtle background pattern */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.03] overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-[20deg] text-[10rem] font-black tracking-[0.3em] text-slate-900 uppercase whitespace-nowrap">
          {tenantName}
        </div>
      </div>

      {/* Card */}
      <div className="relative z-10 w-full max-w-lg">

        {/* Tenant Branding */}
        <div className="text-center mb-8">
          {tenant?.logo_url && (
            <img src={tenant.logo_url} alt={tenantName} className="h-12 mx-auto mb-3 object-contain" />
          )}
          <h2 className="text-sm font-bold tracking-[0.2em] uppercase" style={{ color: primaryColor }}>
            {tenantName}
          </h2>
        </div>

        <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl border border-slate-200/60 overflow-hidden">

          {/* Header strip */}
          <div className="px-6 py-4 text-center border-b border-slate-100" style={{ backgroundColor: `${primaryColor}08` }}>
            <div className="inline-flex items-center gap-2 bg-amber-50 text-amber-700 font-bold px-3 py-1 rounded-full border border-amber-200 text-xs mb-3">
              <CalendarClock className="w-3.5 h-3.5" />
              <span>Exam Not Started Yet</span>
            </div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight leading-snug">
              {exam.title}
            </h1>
          </div>

          {/* Countdown Timer */}
          <div className="px-6 py-8 text-center">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-5">
              Starts in
            </p>

            <div className="flex items-center justify-center gap-3 md:gap-4">
              {/* Hours */}
              <div className="flex flex-col items-center">
                <div
                  className="w-20 h-20 md:w-24 md:h-24 rounded-2xl flex items-center justify-center text-white text-3xl md:text-4xl font-black shadow-lg border border-white/20"
                  style={{ backgroundColor: primaryColor }}
                >
                  {pad(timeLeft.hours)}
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-2">Hours</span>
              </div>

              <span className="text-3xl font-black text-slate-300 mt-[-16px]">:</span>

              {/* Minutes */}
              <div className="flex flex-col items-center">
                <div
                  className="w-20 h-20 md:w-24 md:h-24 rounded-2xl flex items-center justify-center text-white text-3xl md:text-4xl font-black shadow-lg border border-white/20"
                  style={{ backgroundColor: primaryColor }}
                >
                  {pad(timeLeft.minutes)}
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-2">Minutes</span>
              </div>

              <span className="text-3xl font-black text-slate-300 mt-[-16px]">:</span>

              {/* Seconds */}
              <div className="flex flex-col items-center">
                <div
                  className="w-20 h-20 md:w-24 md:h-24 rounded-2xl flex items-center justify-center text-white text-3xl md:text-4xl font-black shadow-lg border border-white/20 relative overflow-hidden"
                  style={{ backgroundColor: primaryColor }}
                >
                  <span className="relative z-10">{pad(timeLeft.seconds)}</span>
                  {/* Pulse ring */}
                  <div className="absolute inset-0 rounded-2xl animate-ping opacity-10 bg-white" />
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-2">Seconds</span>
              </div>
            </div>
          </div>

          {/* Exam Details */}
          <div className="px-6 pb-6">
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-2.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-medium">Scheduled Start</span>
                <span className="font-bold text-slate-800">{formattedDate}, {formattedTime}</span>
              </div>
              <div className="border-t border-slate-100" />
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-medium">Duration</span>
                <span className="font-bold text-slate-800">{exam.duration_minutes} minutes</span>
              </div>
              <div className="border-t border-slate-100" />
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-medium">Total Questions</span>
                <span className="font-bold text-slate-800">{totalQuestions}</span>
              </div>
              {exam.total_marks && Number(exam.total_marks) > 0 && (
                <>
                  <div className="border-t border-slate-100" />
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-medium">Total Marks</span>
                    <span className="font-bold text-slate-800">{Number(exam.total_marks)}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Student info footer */}
          <div className="px-6 pb-5">
            <div className="flex items-center gap-3 bg-slate-900/5 rounded-xl px-4 py-3">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-black shrink-0"
                style={{ backgroundColor: primaryColor }}
              >
                {studentName.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">{studentName}</p>
                <p className="text-[10px] text-slate-500">Please wait here. The exam will start automatically.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom note */}
        <p className="text-center text-[10px] text-slate-400 mt-5">
          Do not close this tab. You will be redirected automatically when the exam begins.
        </p>
      </div>
    </div>
  );
}
