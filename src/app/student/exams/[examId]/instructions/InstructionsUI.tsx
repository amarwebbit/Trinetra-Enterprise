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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 font-sans">
      {/* ===== HEADER - White-label ===== */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-6 py-4 shadow-sm relative z-10">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
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
          
          {/* Timer */}
          <div className="text-right bg-red-50 dark:bg-red-950/30 px-4 py-2 rounded-lg border border-red-100 dark:border-red-900/50">
            <div className="text-[10px] font-bold text-red-600/80 dark:text-red-400/80 uppercase tracking-wider mb-0.5">Time Left</div>
            <div className="text-2xl font-mono font-bold text-red-600 dark:text-red-500 leading-none">
              {formatTime(timeLeft)}
            </div>
          </div>
        </div>
      </header>
      
      {/* ===== MAIN CONTENT ===== */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* ===== LEFT COLUMN: Instructions & Question ===== */}
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="bg-slate-100/50 dark:bg-slate-900/50 px-6 py-4 border-b border-slate-200 dark:border-slate-800">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <span className="text-2xl">📋</span> Instructions
                </h2>
              </div>
              
              <div className="p-6">
                {/* Section Info */}
                <div className="mb-6">
                  <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Sections in this exam</h3>
                  <div className="flex flex-col gap-3">
                    {exam.sections.map((s: any) => (
                      <div key={s.id} className="bg-slate-100 dark:bg-slate-800 px-4 py-3 rounded-md text-sm font-medium border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center text-slate-800 dark:text-slate-200">
                          {s.name} <span className="text-slate-400 mx-1">•</span> {s._count?.exam_questions || s.exam_questions?.length || 0} Qs
                        </div>
                        {s.instructions_html ? (
                          <div className="mt-3 text-sm font-normal text-slate-600 dark:text-slate-400 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: s.instructions_html }} />
                        ) : s.instructions ? (
                          <div className="mt-3 text-sm font-normal text-slate-600 dark:text-slate-400 whitespace-pre-wrap">{s.instructions}</div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Question Type & Marks */}
                <div className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 rounded-lg p-5 mb-8">
                  <div className="flex flex-wrap gap-x-8 gap-y-4 text-sm">
                    <div>
                      <span className="block text-xs font-bold text-blue-600/70 dark:text-blue-400/70 uppercase tracking-wider mb-1">Question Type</span>
                      <span className="font-semibold">{exam.exam_type?.toUpperCase().replace('_', ' ') || 'MCQ'}</span>
                    </div>
                    <div>
                      <span className="block text-xs font-bold text-blue-600/70 dark:text-blue-400/70 uppercase tracking-wider mb-1">Total Marks</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">+{totalMarks}</span>
                    </div>
                    {firstSection?.negative_marks > 0 && (
                      <div>
                        <span className="block text-xs font-bold text-blue-600/70 dark:text-blue-400/70 uppercase tracking-wider mb-1">Negative Marks</span>
                        <span className="font-semibold text-red-600 dark:text-red-400">-{firstSection?.negative_marks}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Instructions Text */}
                <div className="prose prose-sm dark:prose-invert max-w-none text-slate-600 dark:text-slate-300">
                  {exam.instructions_html ? (
                    <div dangerouslySetInnerHTML={{ __html: exam.instructions_html }} />
                  ) : exam.instructions ? (
                    <div className="whitespace-pre-wrap">{exam.instructions}</div>
                  ) : (
                    <>
                      <p>Please read the following instructions carefully before starting the examination:</p>
                      <ol className="space-y-2 mt-4">
                        <li>The clock will be set at the server. The countdown timer in the top right corner of screen will display the remaining time available for you to complete the examination.</li>
                        <li>When the timer reaches zero, the examination will end by itself. You will not be required to end or submit your examination.</li>
                        <li>The Question Palette displayed on the right side of screen will show the status of each question using color codes.</li>
                        <li>You can click on the "&gt;" arrow to collapse the question palette, maximizing the question viewing window.</li>
                      </ol>
                    </>
                  )}
                </div>

              </div>
            </div>
          </div>
          
          {/* ===== RIGHT COLUMN: Question Palette ===== */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 sticky top-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold">Questions</h3>
                <span className="text-xs font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                  Choose a Question
                </span>
              </div>
              
              <div className="grid grid-cols-4 gap-2 mb-6">
                {Array.from({ length: Math.min(totalQuestions, 24) }).map((_, i) => {
                  const num = i + 1;
                  // Color based on status (simulated for instructions preview)
                  let bgColor = 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700';
                  
                  // Simulate statuses for preview
                  if (num === 1) {
                    bgColor = 'bg-blue-600 text-white border-blue-600'; // Current
                  } else if (num === 2) {
                    bgColor = 'bg-emerald-500 text-white border-emerald-500'; // Answered
                  } else if (num === 3) {
                    bgColor = 'bg-yellow-500 text-white border-yellow-500'; // Marked for Review
                  } else if (num === 4) {
                    bgColor = 'bg-orange-500 text-white border-orange-500'; // Answered & Marked
                  }
                  
                  return (
                    <button
                      key={num}
                      className={`${bgColor} border rounded-md aspect-square flex items-center justify-center text-sm font-bold shadow-sm`}
                      disabled
                    >
                      {num}
                    </button>
                  );
                })}
              </div>
              
              {/* Legend */}
              <div className="border-t border-slate-200 dark:border-slate-800 pt-5 space-y-2.5">
                <h4 className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Status Legend</h4>
                <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                  <span className="w-6 h-6 flex-shrink-0 bg-blue-600 rounded-md border border-blue-700 shadow-sm"></span>
                  <span className="font-medium">Current Question</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                  <span className="w-6 h-6 flex-shrink-0 bg-emerald-500 rounded-md border border-emerald-600 shadow-sm"></span>
                  <span className="font-medium">Answered</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                  <span className="w-6 h-6 flex-shrink-0 bg-yellow-500 rounded-md border border-yellow-600 shadow-sm"></span>
                  <span className="font-medium">Marked for Review</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                  <span className="w-6 h-6 flex-shrink-0 bg-orange-500 rounded-md border border-orange-600 shadow-sm"></span>
                  <span className="font-medium">Answered & Marked</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                  <span className="w-6 h-6 flex-shrink-0 bg-slate-200 dark:bg-slate-800 rounded-md border border-slate-300 dark:border-slate-700 shadow-sm"></span>
                  <span className="font-medium">Not Attempted</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* ===== ACTION BUTTONS ===== */}
        <div className="mt-6 bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 flex flex-wrap gap-4 justify-between items-center sticky bottom-6 z-10">
          <div className="flex gap-3">
            <button className="px-5 py-2.5 text-sm font-bold bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800/50 dark:hover:bg-blue-900/50 transition-colors">
              Mark for Review & Next
            </button>
            <button className="px-5 py-2.5 text-sm font-bold bg-slate-100 text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-700 transition-colors">
              Clear Response
            </button>
          </div>
          <div className="flex items-center gap-3">
            {exam.require_acknowledgement && (
              <label className="flex items-center gap-2 cursor-pointer mr-2">
                <input 
                  type="checkbox" 
                  checked={acknowledged} 
                  onChange={(e) => setAcknowledged(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">
                  I have read and understood the instructions
                </span>
              </label>
            )}
            <button 
              onClick={startExam}
              disabled={isStarting}
              className="px-8 py-2.5 text-sm font-bold bg-emerald-600 text-white rounded-lg shadow-sm hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed hidden"
            >
              {isStarting ? 'Starting...' : 'Save & Next'}
            </button>
            <button 
              onClick={startExam}
              disabled={isStarting || (exam.require_acknowledgement && !acknowledged)}
              className="px-8 py-2.5 text-sm font-bold bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isStarting ? 'Loading...' : (
                <>
                  Start Assessment
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                </>
              )}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
