'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface InstructionsUIProps {
  exam: any;
  tenant: any;
  totalQuestions: number;
  totalMarks: number;
  studentId: string;
}

export function InstructionsUI({
  exam,
  tenant,
  totalQuestions,
  totalMarks,
  studentId,
}: InstructionsUIProps) {
  const router = useRouter();
  const [isStarting, setIsStarting] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [timeLeft, setTimeLeft] = useState(exam.duration_minutes * 60);
  
  // Timer countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);
  
  // Format time
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };
  
  // Start exam
  const startExam = async () => {
    setIsStarting(true);
    try {
      // Browser security requires fullscreen to be requested from this user gesture.
      // Starting it here makes the teacher's fullscreen setting enforceable without a later prompt.
      if (exam.full_screen_required && !document.fullscreenElement) {
        await document.documentElement.requestFullscreen?.();
      }
      const response = await fetch('/api/student/exams/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examId: exam.id }),
      });
      
      const data = await response.json();
      if (data.attemptId) {
        router.push(`/student/exams/${data.attemptId}/take`);
      }
    } catch (error) {
      console.error('Failed to start exam:', error);
      setIsStarting(false);
    }
  };
  
  const firstSection = exam.sections?.[0];
  const firstQuestionType = firstSection?.exam_questions?.[0]?.question?.type || 'mcq_single';
  
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 font-sans flex flex-col justify-between">
      <div>
        {/* ===== HEADER - White-label ===== */}
        <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-6 py-4 shadow-sm relative z-10">
          <div className="max-w-4xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-4">
              {/* Logo */}
              {tenant?.logo_url ? (
                <Image
                  src={tenant.logo_url}
                  alt={tenant.name || 'Institution'}
                  width={40}
                  height={40}
                  className="h-10 w-auto object-contain"
                  style={{ width: 'auto' }}
                />
              ) : (
                <div className="w-10 h-10 bg-blue-600 rounded-md flex items-center justify-center text-white font-bold text-xl">
                  {tenant?.name?.charAt(0) || 'E'}
                </div>
              )}
              <div>
                <span className="text-xl font-extrabold tracking-tight block leading-tight" style={{ color: tenant?.primary_color || '#2563EB' }}>
                  {tenant?.name || 'TrinetraEdu-AI'}
                </span>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-wider">ASSESSMENT PORTAL</span>
              </div>
            </div>
            
            {/* Duration Display */}
            <div className="text-right bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Exam Duration</div>
              <div className="text-base font-mono font-bold text-slate-700 dark:text-slate-200 leading-none">
                {exam.duration_minutes} Minutes
              </div>
            </div>
          </div>
        </header>
        
        {/* ===== MAIN CONTENT ===== */}
        <main className="max-w-4xl mx-auto px-6 py-8">
          <div className="bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="bg-slate-100/50 dark:bg-slate-900/50 px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <h1 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                📝 {exam.title}
              </h1>
            </div>
            
            <div className="p-6">
              {/* Instructions Text - Only teacher instructions */}
              <div className="prose prose-sm dark:prose-invert max-w-none text-slate-700 dark:text-slate-200 leading-relaxed">
                {exam.instructions_html ? (
                  <div className="space-y-4" dangerouslySetInnerHTML={{ __html: exam.instructions_html }} />
                ) : exam.instructions ? (
                  <div className="whitespace-pre-wrap space-y-4">{exam.instructions}</div>
                ) : (
                  <p className="italic text-slate-400">No specific instructions provided for this exam.</p>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
      
      {/* ===== ACTION BUTTONS ===== */}
      <footer className="bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 p-4 shadow-md sticky bottom-0 z-10">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="flex items-center">
            {exam.require_acknowledgement && (
              <label className="flex items-center gap-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={acknowledged} 
                  onChange={(e) => setAcknowledged(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300 font-semibold selection:bg-transparent">
                  I have read and understood the instructions
                </span>
              </label>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={startExam}
              disabled={isStarting || (exam.require_acknowledgement && !acknowledged)}
              className="px-8 py-3 text-sm font-extrabold bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isStarting ? 'Loading...' : (
                <>
                  Start Assessment
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                </>
              )}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
