'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Image from 'next/image';
import { Calculator, ShieldAlert, Timer, RotateCcw } from 'lucide-react';
import { GATECalculator } from '@/components/student/GATECalculator';
import 'katex/dist/katex.min.css';
import katex from 'katex';
import { useWhiteLabel } from '@/components/providers/WhiteLabelProvider';
import { renderMath } from '@/components/ui/MathText';
import { AestheticLoader } from '@/components/ui/AestheticLoader';

function renderRichText(input: string) {
  if (!input) return { __html: '' };
  return { __html: renderMath(input) };
}

interface ExamInterfaceUIProps {
  attempt: any;
  exam: any;
  initialAnswers: any[];
  tenant: any;
  student: any;
  showCalculator: boolean;
  studentId: string;
}

export function ExamInterfaceUI({
  attempt,
  exam,
  initialAnswers,
  tenant,
  student,
  showCalculator,
  studentId,
}: ExamInterfaceUIProps) {
  const router = useRouter();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [markedForReview, setMarkedForReview] = useState<Record<string, boolean>>({});
  const [visited, setVisited] = useState<Record<string, boolean>>({});
  
  // Dynamic branding and user properties
  const whiteLabel = useWhiteLabel();
  const studentName = student?.full_name || 'Student';
  const rollNumber = student?.roll_number || 'N/A';
  const tenantName = tenant?.name || whiteLabel?.tenantName || 'TrinetraEdu-AI';
  const logoUrl = tenant?.logo_url || whiteLabel?.logoUrl || null;
  const primaryColor = tenant?.primary_color || whiteLabel?.primaryColor || '#2563EB';
  const headerBgColor = tenant?.header_bg_color || whiteLabel?.headerBgColor || '#ffffff';
  const footerText = tenant?.footer_text || whiteLabel?.footerText || null;
  const removeBranding = tenant?.remove_branding ?? whiteLabel?.removeBranding ?? false;
  
  // Flatten all questions from sections
  const allQuestions = exam.sections.flatMap((section: any) =>
    section.exam_questions.map((eq: any) => ({
      ...eq.question,
      sectionName: section.name,
      marks: eq.question?.marks || 1,
      negative_marks: eq.question?.negative_marks || 0,
      orderIndex: eq.order_index,
    }))
  );
  
  const totalQuestions = allQuestions.length;
  const currentQuestion = allQuestions[currentQuestionIndex];
  
  // Restore initial answers
  const userAnswersRef = useRef<Record<string, string>>({});
  const isSubmittingRef = useRef(false);
  const violationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastViolationTimeRef = useRef<number>(0);
  const lastViolationByEventRef = useRef<Record<string, number>>({});
  const isResumingRef = useRef<boolean>(false);

  // Restore initial answers
  useEffect(() => {
    if (initialAnswers && initialAnswers.length > 0) {
      const answersMap: Record<string, string> = {};
      initialAnswers.forEach((ans) => {
        answersMap[ans.question_id] = ans.answer_text;
      });
      setUserAnswers(answersMap);
      userAnswersRef.current = answersMap;
    }
  }, [initialAnswers]);

  // Calculate remaining test duration dynamically based on attempt.start_time & test duration_minutes
  const calculateTimeLeft = useCallback(() => {
    const now = new Date().getTime();
    const attemptStart = attempt.start_time ? new Date(attempt.start_time).getTime() : now;
    const durationMs = (exam.duration_minutes || 60) * 60 * 1000;
    
    // Attempt duration ends at attemptStart + duration_minutes, capped by overall due_date/end_time
    const examEndMs = exam.end_time ? new Date(exam.end_time).getTime() : attemptStart + durationMs;
    const attemptEndMs = Math.min(attemptStart + durationMs, examEndMs);
    
    const diff = Math.floor((attemptEndMs - now) / 1000);
    return Math.max(0, diff);
  }, [attempt.start_time, exam.duration_minutes, exam.end_time]);

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const pendingKey = `exam-pending-saves:${attempt.id}`;
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [showCalculatorModal, setShowCalculatorModal] = useState(false);
  
  // Security states
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [violationCount, setViolationCount] = useState(0);
  const [autoSubmitTimer, setAutoSubmitTimer] = useState<number | null>(null);
  const [showViolationWarning, setShowViolationWarning] = useState(false);
  const [violationThreshold, setViolationThreshold] = useState(3);
  const [autoSubmitSeconds, setAutoSubmitSeconds] = useState(15);

  const isFullScreenRequired = exam?.full_screen_required !== false;
  const isDisableCopyPaste = exam?.disable_copy_paste !== false;

  // Get violation settings from exam columns or metadata
  useEffect(() => {
    if (exam) {
      const meta = (exam.metadata as any) || {};
      const threshold = exam.violation_threshold ?? meta.violation_threshold ?? 3;
      const seconds = exam.auto_submit_seconds ?? meta.auto_submit_seconds ?? 15;
      setViolationThreshold(threshold);
      setAutoSubmitSeconds(seconds);
    }
  }, [exam]);

  // Track visited questions
  useEffect(() => {
    if (currentQuestion) {
      setVisited(prev => ({ ...prev, [currentQuestion.id]: true }));
    }
  }, [currentQuestionIndex, currentQuestion]);

  // Unified submit function — saves all answers and updates attempt status with retry loop
  const submitExam = useCallback(async (auto: boolean = false) => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);

    if (violationIntervalRef.current) {
      clearInterval(violationIntervalRef.current);
      violationIntervalRef.current = null;
    }

    const currentAnswers = { ...userAnswersRef.current };

    for (let attemptCount = 0; attemptCount < 3; attemptCount++) {
      try {
        const res = await fetch('/api/student/exams/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            attemptId: attempt.id,
            auto,
            answers: currentAnswers,
          }),
        });
        if (res.ok) break;
      } catch (error) {
        console.warn(`Submit attempt ${attemptCount + 1} failed:`, error);
        await new Promise(r => setTimeout(r, 500 * Math.pow(2, attemptCount)));
      }
    }

    localStorage.removeItem(pendingKey);

    if (document.exitFullscreen && document.fullscreenElement) {
      await document.exitFullscreen().catch(() => {});
    }

    // Hard replace browser history to prevent back navigation
    window.location.replace(`/student/results/${attempt.exam_id}`);
  }, [attempt.id, attempt.exam_id, pendingKey]);

  // Violation Timer Helpers
  const stopAutoSubmitTimer = useCallback(() => {
    if (violationIntervalRef.current) {
      clearInterval(violationIntervalRef.current);
      violationIntervalRef.current = null;
    }
    setAutoSubmitTimer(null);
  }, []);

  const startAutoSubmitTimer = useCallback(() => {
    if (violationIntervalRef.current) {
      clearInterval(violationIntervalRef.current);
      violationIntervalRef.current = null;
    }
    let seconds = autoSubmitSeconds;
    setAutoSubmitTimer(seconds);

    const interval = setInterval(() => {
      seconds -= 1;
      setAutoSubmitTimer(seconds);
      if (seconds <= 0) {
        clearInterval(interval);
        violationIntervalRef.current = null;
        submitExam(true);
      }
    }, 1000);
    violationIntervalRef.current = interval;
  }, [autoSubmitSeconds, submitExam]);

  // Centralized violation trigger with event-specific debouncing & resume-suppression
  const triggerSecurityViolation = useCallback((eventType: string) => {
    const now = Date.now();
    const lastTime = lastViolationByEventRef.current[eventType] || 0;
    const minInterval = eventType === 'keyboard_shortcut' ? 2000 : 1500;

    // Ignore repeated event within minInterval
    if (now - lastTime < minInterval) {
      return;
    }
    // Ignore events if user is currently resuming or if violation modal is already open
    if (isResumingRef.current || showViolationWarning) {
      return;
    }

    lastViolationByEventRef.current[eventType] = now;

    setViolationCount(prev => {
      const newCount = prev + 1;
      setShowViolationWarning(true);

      fetch('/api/student/exams/proctoring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attemptId: attempt.id,
          eventType,
          violationCount: newCount,
          violationThreshold,
          severity: newCount >= violationThreshold ? 'critical' : 'high',
        }),
      }).catch(console.error);

      // Always start auto-submit countdown timer so student sees countdown and auto-submits on 0s
      startAutoSubmitTimer();

      return newCount;
    });
  }, [attempt.id, violationThreshold, startAutoSubmitTimer, showViolationWarning]);

  // Resume exam from violation modal
  const handleResumeExam = useCallback(async () => {
    if (violationCount >= violationThreshold) {
      submitExam(true);
      return;
    }

    // Suppress violation re-triggering for 2s while re-entering fullscreen/window focus
    isResumingRef.current = true;
    setTimeout(() => {
      isResumingRef.current = false;
    }, 2000);

    try {
      if (isFullScreenRequired && !document.fullscreenElement) {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        }
      }
    } catch (e) {
      console.warn('Fullscreen re-entry:', e);
    }
    setIsFullScreen(true);
    stopAutoSubmitTimer();
    setShowViolationWarning(false);
  }, [violationCount, violationThreshold, isFullScreenRequired, stopAutoSubmitTimer, submitExam]);

  // Cleanup violation timer on unmount
  useEffect(() => () => {
    if (violationIntervalRef.current) clearInterval(violationIntervalRef.current);
  }, []);

  // Exam Duration Timer Countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          submitExam(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [submitExam]);

  // --- Save Progress (auto-save) ---
  const saveAllAnswersRef = useRef<(() => Promise<void>) | null>(null);

  const saveAllAnswers = async () => {
    const payload = { attemptId: attempt.id, answers: userAnswers, markedForReview };
    try {
      const response = await fetch('/api/student/exams/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error('Save rejected');
      localStorage.removeItem(pendingKey);
      setLastSaved(new Date());
    } catch (error) {
      console.error('Auto-save failed:', error);
      localStorage.setItem(pendingKey, JSON.stringify(payload));
    }
  };

  saveAllAnswersRef.current = saveAllAnswers;

  // Auto-save every 60 seconds
  useEffect(() => {
    const saveInterval = setInterval(() => {
      if (saveAllAnswersRef.current) {
        saveAllAnswersRef.current();
      }
    }, 60000);
    return () => clearInterval(saveInterval);
  }, []);

  useEffect(() => {
    const flushPendingSave = async () => {
      setIsOnline(navigator.onLine);
      const pending = localStorage.getItem(pendingKey);
      if (!pending || !navigator.onLine) return;
      try {
        const response = await fetch('/api/student/exams/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: pending });
        if (response.ok) { localStorage.removeItem(pendingKey); setLastSaved(new Date()); }
      } catch { /* Retain the local outbox until the next reconnect. */ }
    };
    void flushPendingSave();
    window.addEventListener('online', flushPendingSave);
    window.addEventListener('offline', () => setIsOnline(false));
    return () => window.removeEventListener('online', flushPendingSave);
  }, [pendingKey]);

  // --- Heartbeat Ping & Force Stop Check (every 5s) ---
  useEffect(() => {
    const heartbeatInterval = setInterval(() => {
      if (isSubmittingRef.current) return;
      fetch('/api/student/exams/proctoring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attemptId: attempt.id,
          eventType: 'heartbeat',
          severity: 'low',
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data?.forceStopped || (data?.status && data.status !== 'in_progress')) {
            if (isSubmittingRef.current) return;
            isSubmittingRef.current = true;
            setIsSubmitting(true);
            toast.error('Your exam session was ended by the invigilator.', { duration: 5000 });
            if (document.exitFullscreen && document.fullscreenElement) {
              document.exitFullscreen().catch(() => {});
            }
            setTimeout(() => {
              window.location.replace(`/student/results/${attempt.exam_id}`);
            }, 800);
          }
        })
        .catch(console.error);
    }, 5000);
    return () => clearInterval(heartbeatInterval);
  }, [attempt.id, attempt.exam_id]);

  // --- Tab Switch & Window Blur Detection ---
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        triggerSecurityViolation('tab_switch');
      }
    };
    const handleWindowBlur = () => {
      if (!document.hidden) {
        triggerSecurityViolation('window_blur');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [triggerSecurityViolation]);

  // --- Fullscreen: Enter on Mount ---
  useEffect(() => {
    if (!isFullScreenRequired) return;
    const enterFullScreen = async () => {
      try {
        if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
          await document.documentElement.requestFullscreen();
          setIsFullScreen(true);
        } else if (document.fullscreenElement) {
          setIsFullScreen(true);
        }
      } catch (error) {
        console.warn('Full screen not supported or blocked');
      }
    };
    enterFullScreen();
  }, [isFullScreenRequired]);

  // --- Detect Fullscreen Exit ---
  useEffect(() => {
    if (!isFullScreenRequired) return;
    const handleFullScreenChange = () => {
      const isFull = !!document.fullscreenElement;
      setIsFullScreen(isFull);
      if (!isFull) {
        triggerSecurityViolation('fullscreen_exit');
      }
    };
    document.addEventListener('fullscreenchange', handleFullScreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullScreenChange);
  }, [isFullScreenRequired, triggerSecurityViolation]);

  // --- Keyboard Security & Copy/Paste/Right-Click Blocker ---
  useEffect(() => {
    const handleKeySecurity = (e: KeyboardEvent) => {
      const isCtrl = e.ctrlKey || e.metaKey;
      const isShift = e.shiftKey;
      const key = e.key.toLowerCase();

      if (
        e.key === 'F12' ||
        e.key === 'F11' ||
        e.key === 'PrintScreen' ||
        e.key === 'Meta' ||
        (e.altKey && e.key === 'Tab') ||
        (isCtrl && isShift && (key === 'i' || key === 'j' || key === 'c')) ||
        (isCtrl && (key === 'c' || key === 'v' || key === 'x' || key === 'p' || key === 'u' || key === 's' || key === 'a'))
      ) {
        e.preventDefault();
        e.stopPropagation();
        triggerSecurityViolation('keyboard_shortcut');
      }
    };

    const blockEvent = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
    };

    window.addEventListener('keydown', handleKeySecurity, true);
    window.addEventListener('contextmenu', blockEvent, true);
    document.addEventListener('copy', blockEvent, true);
    document.addEventListener('cut', blockEvent, true);
    document.addEventListener('paste', blockEvent, true);
    document.addEventListener('dragstart', blockEvent, true);

    return () => {
      window.removeEventListener('keydown', handleKeySecurity, true);
      window.removeEventListener('contextmenu', blockEvent, true);
      document.removeEventListener('copy', blockEvent, true);
      document.removeEventListener('cut', blockEvent, true);
      document.removeEventListener('paste', blockEvent, true);
      document.removeEventListener('dragstart', blockEvent, true);
    };
  }, [triggerSecurityViolation]);

  // Beforeunload Warning Handler (Prevent Accidental Tab Close / Refresh)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isSubmittingRef.current) return;
      e.preventDefault();
      e.returnValue = 'Your exam is currently in progress. Submissions are auto-saved.';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);
  
  // Lock browser back-button navigation during exam
  useEffect(() => {
    window.history.pushState(null, '', window.location.href);

    const handlePopState = (e: PopStateEvent) => {
      window.history.pushState(null, '', window.location.href);
      triggerSecurityViolation('back_button_pressed');
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [triggerSecurityViolation]);
  
  // Handle individual answer save
  const saveAnswer = async (questionId: string, answerText: string) => {
    try {
      const response = await fetch('/api/student/exams/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attemptId: attempt.id,
          questionId,
          answerText,
        }),
      });
      
      if (response.ok) {
        setLastSaved(new Date());
      }
    } catch (error) {
      console.error('Failed to save answer:', error);
      const pending = JSON.parse(localStorage.getItem(pendingKey) || '{}');
      localStorage.setItem(pendingKey, JSON.stringify({ ...pending, attemptId: attempt.id, answers: { ...(pending.answers || {}), [questionId]: answerText } }));
    }
  };

  // Handle answer change
  const handleAnswerChange = (questionId: string, value: string) => {
    setUserAnswers((prev) => {
      const updated = { ...prev, [questionId]: value };
      userAnswersRef.current = updated;
      return updated;
    });
    
    // Save to database immediately
    saveAnswer(questionId, value);
  };

  // Clear Response for current question
  const handleClearResponse = (questionId: string) => {
    setUserAnswers((prev) => {
      const updated = { ...prev };
      delete updated[questionId];
      userAnswersRef.current = updated;
      return updated;
    });

    setMarkedForReview((prev) => ({
      ...prev,
      [questionId]: false,
    }));

    saveAnswer(questionId, '');
    toast.success('Response cleared');
  };

  // Mark for Review & Advance
  const handleMarkForReviewAndNext = () => {
    if (currentQuestion) {
      setMarkedForReview((prev) => ({
        ...prev,
        [currentQuestion.id]: true,
      }));
      // Save current state
      saveAllAnswers();
    }
    goToQuestion(currentQuestionIndex + 1);
  };
  
  const toggleMarkForReview = (questionId: string) => {
    setMarkedForReview((prev) => ({
      ...prev,
      [questionId]: !prev[questionId],
    }));
  };
  
  const goToQuestion = (index: number) => {
    if (index >= 0 && index < totalQuestions) {
      setCurrentQuestionIndex(index);
    }
  };
  
  const handleSaveAndNext = () => {
    if (currentQuestion) {
      saveAllAnswers();
    }
    goToQuestion(currentQuestionIndex + 1);
  };

  const getQuestionStatus = (index: number) => {
    const question = allQuestions[index];
    if (!question) return 'not_visited';
    const isAnswered = userAnswers[question.id] !== undefined && userAnswers[question.id] !== '';
    const isMarked = markedForReview[question.id] || false;
    const isVisited = visited[question.id] || false;
    
    if (isAnswered && isMarked) return 'answered_marked';
    if (isAnswered) return 'answered';
    if (isMarked) return 'marked';
    if (isVisited || index === currentQuestionIndex) return 'not_answered';
    return 'not_visited';
  };
  
  const counts = {
    answered: 0,
    notAnswered: 0,
    notVisited: 0,
    marked: 0,
    answeredMarked: 0
  };
  
  allQuestions.forEach((_: any, index: number) => {
    const status = getQuestionStatus(index);
    if (status === 'answered') counts.answered++;
    else if (status === 'not_answered') counts.notAnswered++;
    else if (status === 'not_visited') counts.notVisited++;
    else if (status === 'marked') counts.marked++;
    else if (status === 'answered_marked') counts.answeredMarked++;
  });
  
  const renderMCQ = () => {
    let options = currentQuestion.options || {};
    if (typeof options === 'string') {
      try {
        options = JSON.parse(options);
      } catch (e) {
        options = {};
      }
    }
    const currentAnswer = userAnswers[currentQuestion.id] || '';
    
    const handleOptionSelect = (key: string) => {
      handleAnswerChange(currentQuestion.id, key);
    };
    
    return (
      <div className="mt-4">
        <div className="flex flex-col space-y-3">
          {Object.entries(options).map(([key, value]) => (
            <label key={key} className="flex items-start gap-3 cursor-pointer group">
              <div className="flex-shrink-0 mt-0.5">
                <input
                  type="radio"
                  name={`question-${currentQuestion.id}`}
                  value={key}
                  checked={currentAnswer === key}
                  onChange={() => handleOptionSelect(key)}
                  className="w-4 h-4 text-blue-600 cursor-pointer"
                />
              </div>
              <div className="flex gap-2 text-[15px]">
                <span className="font-bold">{key}.</span>
                <div 
                  className="text-black font-medium leading-relaxed"
                  dangerouslySetInnerHTML={renderRichText(value as string)}
                />
              </div>
            </label>
          ))}
        </div>
      </div>
    );
  };
  
  const renderMSQ = () => {
    let options = currentQuestion.options || {};
    if (typeof options === 'string') {
      try {
        options = JSON.parse(options);
      } catch (e) {
        options = {};
      }
    }
    const currentAnswers = userAnswers[currentQuestion.id]?.split(',') || [];
    
    const handleOptionToggle = (key: string) => {
      const newAnswers = currentAnswers.includes(key)
        ? currentAnswers.filter((k: string) => k !== key)
        : [...currentAnswers, key];
      handleAnswerChange(currentQuestion.id, newAnswers.length > 0 ? newAnswers.join(',') : '');
    };
    
    return (
      <div className="mt-4">
        <div className="flex flex-col space-y-3">
          {Object.entries(options).map(([key, value]) => (
            <label key={key} className="flex items-start gap-3 cursor-pointer group">
              <div className="flex-shrink-0 mt-0.5">
                <input
                  type="checkbox"
                  name={`question-${currentQuestion.id}`}
                  value={key}
                  checked={currentAnswers.includes(key)}
                  onChange={() => handleOptionToggle(key)}
                  className="w-4 h-4 text-blue-600 cursor-pointer"
                />
              </div>
              <div className="flex gap-2 text-[15px]">
                <span className="font-bold">{key}.</span>
                <div 
                  className="text-black font-medium leading-relaxed"
                  dangerouslySetInnerHTML={renderRichText(value as string)}
                />
              </div>
            </label>
          ))}
        </div>
      </div>
    );
  };
  
  const renderNAT = () => {
    const currentAnswer = userAnswers[currentQuestion.id] || '';
    
    const handleKeypadInput = (key: string | number) => {
      handleAnswerChange(currentQuestion.id, currentAnswer + key);
    };
    
    const handleBackspace = () => {
      handleAnswerChange(currentQuestion.id, currentAnswer.slice(0, -1));
    };
    
    const handleClear = () => {
      handleAnswerChange(currentQuestion.id, '');
    };
    
    return (
      <div className="mt-4 inline-block">
        <div className="border border-gray-400 bg-white p-2 mb-6 w-72 h-10 flex items-center shadow-inner">
           <span className="text-black text-lg">{currentAnswer}</span>
        </div>
        <div className="bg-[#f0f0f0] p-3 inline-block border border-gray-300 rounded-sm">
          <div className="grid grid-cols-3 gap-1.5 w-[160px] mb-1.5">
            {[7, 8, 9, 4, 5, 6, 1, 2, 3, '.', 0, '-'].map(key => (
              <button
                key={key}
                onClick={() => handleKeypadInput(key)}
                className="bg-white border border-gray-300 py-1.5 text-center font-bold text-gray-800 hover:bg-gray-100"
              >
                {key}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5 w-[160px]">
            <button
              onClick={handleBackspace}
              className="flex-1 py-1.5 text-[11px] font-bold bg-white border border-gray-300 text-gray-800 hover:bg-gray-100"
            >
              Backspace
            </button>
            <button
              onClick={handleClear}
              className="flex-1 py-1.5 text-[11px] font-bold bg-white border border-gray-300 text-gray-800 hover:bg-gray-100"
            >
              Clear All
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderQuestion = () => {
    if (!currentQuestion) return <p className="text-slate-500">Loading question...</p>;
    
    switch (currentQuestion.type) {
      case 'mcq_single':
        return renderMCQ();
      case 'mcq_multiple':
        return renderMSQ();
      case 'nat':
        return renderNAT();
      default:
        return <p className="text-slate-500">Unsupported question type ({currentQuestion.type})</p>;
    }
  };
  
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };
  
  const getPaletteShape = (status: string) => {
    const base = "flex items-center justify-center text-[11px] font-bold cursor-pointer ";
    switch (status) {
      case 'answered': return base + 'w-8 h-7 rounded-t-[10px] rounded-b-[10px] bg-[#23b45a] text-white shadow-sm';
      case 'not_answered': return base + 'w-8 h-7 rounded-t-[10px] rounded-b-[10px] bg-[#d9444c] text-white shadow-sm';
      case 'not_visited': return base + 'w-8 h-7 rounded-t-[10px] rounded-b-[10px] bg-white border border-gray-400 text-gray-800 shadow-sm';
      case 'marked': return base + 'w-8 h-8 rounded-[50%] bg-[#7c2a90] text-white shadow-sm';
      case 'answered_marked': return base + 'w-8 h-8 rounded-[50%] bg-[#7c2a90] text-white shadow-sm relative after:content-[""] after:absolute after:bottom-0 after:right-0 after:w-2 after:h-2 after:bg-[#23b45a] after:rounded-full after:border after:border-white';
      default: return base + 'w-8 h-7 rounded-t-[10px] rounded-b-[10px] bg-white border border-gray-400 text-gray-800';
    }
  };
  
  const renderSubmitModal = () => {
    const total = totalQuestions;
    const answered = Object.keys(userAnswers).filter(id => userAnswers[id] !== '').length;
    const marked = Object.keys(markedForReview).filter(id => markedForReview[id]).length;
    const unattempted = total - answered;
    
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full overflow-hidden">
          <div className="bg-slate-50 dark:bg-slate-800 px-6 py-4 border-b border-slate-200 dark:border-slate-700">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Submit Exam?</h2>
          </div>
          
          <div className="p-6">
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-6">Are you sure you want to submit? You will not be able to return to the exam once submitted.</p>
            
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 grid grid-cols-2 gap-4 mb-6">
              <div>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">Total Questions</span>
                <span className="text-xl font-bold">{total}</span>
              </div>
              <div>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">Answered</span>
                <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{answered}</span>
              </div>
              <div>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">Unattempted</span>
                <span className="text-xl font-bold text-red-600 dark:text-red-400">{unattempted}</span>
              </div>
              <div>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">Marked</span>
                <span className="text-xl font-bold text-yellow-600 dark:text-yellow-500">{marked}</span>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowSubmitModal(false)}
                className="flex-1 px-4 py-2.5 font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Resume Exam
              </button>
              <button
                onClick={() => submitExam(false)}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2.5 font-bold bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? 'Submitting...' : 'Yes, Submit'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <div className="min-h-screen bg-white font-sans flex flex-col select-none text-black relative">
      {/* ===== CENTRAL FIXED WATERMARK OVERLAY (SINGLE LOGO + COMPLETE HORIZONTAL NAME) ===== */}
      <div className="fixed inset-0 pointer-events-none z-[1] flex flex-col items-center justify-center opacity-[0.06] select-none overflow-hidden gap-4">
        {logoUrl && (
          <img src={logoUrl} alt="Institute Watermark" className="h-44 w-auto grayscale object-contain max-w-[80vw]" />
        )}
        <p className="text-4xl md:text-5xl font-black uppercase tracking-wider text-black text-center whitespace-nowrap px-4">
          {tenantName}
        </p>
      </div>
      {/* ===== HEADER ===== */}
      <header 
        className="border-b border-gray-300 px-6 py-3 shrink-0"
        style={{ backgroundColor: headerBgColor }}
      >
        <div className="flex justify-between items-center max-w-full">
          <div className="flex items-center gap-3">
            {logoUrl && (
              <Image
                src={logoUrl}
                alt={tenantName}
                width={40}
                height={40}
                className="h-10 w-auto"
              />
            )}
            {!removeBranding && (
              <span className="text-xl font-bold tracking-wider uppercase" style={{ color: primaryColor }}>
                {tenantName}
              </span>
            )}
            <span className="text-sm font-bold text-gray-500 uppercase tracking-wider mt-1">EXAMS</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm font-bold" style={{ color: primaryColor }}>{studentName}</div>
              <div className="text-xs font-bold text-gray-500">Roll: {rollNumber}</div>
            </div>
            {student?.avatar_url || student?.profile_image ? (
              <img 
                src={student.avatar_url || student.profile_image} 
                alt={studentName}
                className="w-10 h-10 rounded-full object-cover border-2 shadow-sm"
                style={{ borderColor: primaryColor }}
              />
            ) : (
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm"
                style={{ backgroundColor: primaryColor }}
              >
                {studentName.substring(0, 2).toUpperCase()}
              </div>
            )}
          </div>
        </div>
      </header>
      
      {/* ===== MAIN CONTENT ===== */}
      <main className="flex-1 flex flex-col md:flex-row w-full min-h-0 relative overflow-y-auto md:overflow-hidden">
        
        {/* ===== LEFT: Question Area ===== */}
        <div className="flex-1 flex flex-col min-w-0 bg-white relative border-r border-gray-300">
          
          {/* Blue Info Bar */}
          <div className="bg-[#22487a] text-white px-4 py-1.5 flex justify-between items-center text-xs font-bold shrink-0">
            <div className="flex items-center gap-1.5 cursor-pointer">
              <span className="border border-white rounded-full w-4 h-4 flex items-center justify-center text-[10px]">i</span>
              Instructions
            </div>
            <div className="flex items-center gap-4">
              {lastSaved && (
                <span className="text-[10px] text-[#86efac] font-normal mr-2">
                  Saved {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
              <span>Time Left : {formatTime(timeLeft)}</span>
              <span className={isOnline ? 'text-emerald-600' : 'text-amber-600'}>{isOnline ? (lastSaved ? 'Saved' : 'Saving…') : 'Offline - responses queued'}</span>
              {showCalculator && (
                <button onClick={() => setShowCalculatorModal(!showCalculatorModal)} className="bg-[#f39c12] hover:bg-[#e67e22] p-1 rounded text-white shadow-sm">
                  <Calculator className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
          
          {/* Section Tabs */}
          <div className="bg-[#e4e4e4] flex px-4 pt-1.5 shrink-0 border-b border-gray-300 h-[34px]">
            <div className="bg-[#22487a] text-white px-4 py-1.5 text-xs font-bold rounded-t-sm h-full flex items-center">
              {currentQuestion?.sectionName || 'Default Section'}
            </div>
          </div>

          {/* Question Info Row */}
          <div className="px-4 py-2.5 flex justify-between items-center border-b border-gray-200 text-xs shrink-0 bg-white relative z-10">
            <div>
              <span className="font-bold">Question Type: </span>
              <span className="font-bold">{currentQuestion?.type?.toUpperCase().replace('_', ' ')}</span>
            </div>
            <div className="font-bold">
              <span>Marks for correct answer: </span>
              <span className="text-[#23b45a]">{currentQuestion?.marks || 1}</span>
              <span className="mx-2 text-gray-300">|</span>
              <span>Negative Marks: </span>
              <span className="text-[#d9444c]">{currentQuestion?.negative_marks || 0}</span>
            </div>
          </div>
          
          {/* Question Number Row */}
          <div className="px-4 py-2.5 flex justify-between items-center text-sm font-bold shrink-0 bg-white relative z-10">
            Question No. {currentQuestionIndex + 1}
          </div>
          
          {/* Question Content */}
          <div className="flex-1 overflow-y-auto px-6 py-2 relative">
            <div className="relative z-10">
              <div 
                className="prose prose-sm max-w-none text-black font-medium text-[15px] leading-relaxed mb-6 whitespace-pre-wrap [&_img]:max-h-64 [&_img]:border [&_img]:border-gray-200"
                dangerouslySetInnerHTML={renderRichText(currentQuestion?.question_text || 'Loading question...')}
              />
              
              <div className="max-w-3xl">
                {renderQuestion()}
              </div>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="border-t border-gray-300 p-3 shrink-0 flex flex-wrap gap-4 justify-between items-center bg-white relative z-10">
            <div className="flex gap-2.5">
              <button
                onClick={handleMarkForReviewAndNext}
                className="px-4 py-1.5 text-xs font-bold bg-white text-gray-800 border border-gray-400 rounded-sm hover:bg-gray-50"
              >
                Mark for Review & Next
              </button>
              <button
                onClick={() => currentQuestion && handleClearResponse(currentQuestion.id)}
                className="px-4 py-1.5 text-xs font-bold bg-white text-gray-800 border border-gray-400 rounded-sm hover:bg-gray-50"
              >
                Clear Response
              </button>
            </div>
            
            <div className="flex gap-2.5">
              <button
                onClick={handleSaveAndNext}
                disabled={currentQuestionIndex === totalQuestions - 1}
                className="px-8 py-1.5 text-xs font-bold bg-[#22487a] text-white rounded-sm hover:bg-[#1a3a63] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save & Next
              </button>
            </div>
          </div>
        </div>
        
        {/* ===== RIGHT: Question Palette ===== */}
        <div className="w-full md:w-[320px] shrink-0 flex flex-col bg-white border-t md:border-t-0 md:border-l border-gray-300">
          
          {/* Profile Section */}
          <div className="p-4 flex flex-col items-center justify-center border-b border-gray-200 shrink-0">
            <div className="w-20 h-20 bg-[#7c8b9a] text-white text-[32px] flex items-center justify-center border border-gray-400 mb-2 font-normal">
              {studentName.charAt(0).toUpperCase()}
            </div>
            <div className="text-sm font-bold text-gray-800 text-center">
              {studentName}
            </div>
          </div>
          
          {/* Legend Section */}
          <div className="p-3 border-b border-gray-200 shrink-0 text-[10px] font-bold text-gray-700">
            <div className="grid grid-cols-2 gap-y-3 gap-x-2">
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-5 rounded-t-[10px] rounded-b-[10px] bg-[#23b45a] text-white flex items-center justify-center shadow-sm">
                   {counts.answered}
                </div>
                <span>Answered</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-5 rounded-t-[10px] rounded-b-[10px] bg-[#d9444c] text-white flex items-center justify-center shadow-sm">
                   {counts.notAnswered}
                </div>
                <span>Not Answered</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-5 rounded-t-[10px] rounded-b-[10px] bg-white border border-gray-400 text-gray-800 flex items-center justify-center shadow-sm">
                   {counts.notVisited}
                </div>
                <span>Not Visited</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-5 rounded-[50%] bg-[#7c2a90] text-white flex items-center justify-center shadow-sm">
                   {counts.marked}
                </div>
                <span className="leading-tight">Marked for<br/>Review</span>
              </div>
              <div className="col-span-2 flex items-center gap-1.5 mt-1">
                <div className="w-6 h-5 rounded-[50%] bg-[#7c2a90] text-white flex items-center justify-center shadow-sm relative">
                   {counts.answeredMarked}
                   <div className="absolute bottom-0 right-0 w-1.5 h-1.5 bg-[#23b45a] rounded-full border border-white"></div>
                </div>
                <span className="leading-tight text-[9px] font-medium text-gray-600">Answered & Marked for Review (will also be<br/>evaluated)</span>
              </div>
            </div>
          </div>
          
          {/* Questions Header */}
          <div className="bg-[#22487a] text-white px-3 py-1.5 text-xs font-bold shrink-0">
            Questions
          </div>
          <div className="bg-[#e9ecef] px-3 py-1 text-[11px] font-bold text-gray-700 shrink-0 border-b border-gray-300">
            Choose a Question
          </div>
          
          {/* Palette Grid */}
          <div className="flex-1 overflow-y-auto p-4 bg-[#f0f4f7]">
            <div className="grid grid-cols-6 gap-2">
              {allQuestions.map((_: any, index: number) => {
                const status = getQuestionStatus(index);
                return (
                  <div key={index} className="flex justify-center items-center h-8">
                    <button
                      onClick={() => goToQuestion(index)}
                      className={getPaletteShape(status)}
                    >
                      {index + 1}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Submit Button */}
          <div className="p-3 bg-white shrink-0 border-t border-gray-200">
            <button
              onClick={() => setShowSubmitModal(true)}
              className="w-full py-2 bg-[#51b5c9] text-white font-bold text-sm rounded shadow-sm hover:bg-[#3fa0b3] transition-colors"
            >
              Submit
            </button>
          </div>
        </div>
      </main>

      {/* ===== FOOTER ===== */}
      {footerText && (
        <footer className="border-t border-gray-300 px-6 py-2 text-center text-[10px] text-gray-500 shrink-0 bg-white z-20">
          {footerText}
          {!removeBranding && <span className="ml-1">| Powered by TrinetraEdu-AI</span>}
        </footer>
      )}

      {/* ===== CALCULATOR MODAL ===== */}
      {showCalculatorModal && (
        <GATECalculator onClose={() => setShowCalculatorModal(false)} />
      )}
      
      {/* ===== SUBMIT MODAL ===== */}
      {showSubmitModal && renderSubmitModal()}

      {/* ===== SINGLE CLEAN CENTRAL VIOLATION MODAL ===== */}
      {(showViolationWarning || (isFullScreenRequired && !isFullScreen)) && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-2xl border border-red-200 animate-in fade-in zoom-in duration-200">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-200 shadow-inner">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <h2 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">
              {violationCount >= violationThreshold ? 'Maximum Violations Reached' : 'Security Violation Detected'}
            </h2>
            
            <p className="text-sm text-slate-600 mb-4 leading-relaxed">
              {violationCount >= violationThreshold
                ? `You have reached the maximum limit of ${violationThreshold} security violations. Your exam is now being automatically submitted.`
                : 'You attempted to switch tabs, applications, or exit full window mode. Please return to the exam screen immediately.'}
            </p>

            <div className="inline-flex items-center gap-2 bg-red-50 text-red-700 font-bold px-3 py-1.5 rounded-lg border border-red-200 text-xs mb-4">
              <span>Violation Count:</span>
              <span className="font-mono text-sm font-black">{violationCount} / {violationThreshold}</span>
            </div>

            {autoSubmitTimer !== null && (
              <div className="bg-slate-900 text-white p-3 rounded-xl mb-6 flex items-center justify-between border border-slate-800 shadow-inner">
                <div className="flex items-center gap-2">
                  <Timer className="w-4 h-4 text-red-400 animate-pulse" />
                  <span className="text-xs font-semibold text-slate-300">
                    {autoSubmitTimer <= 0 || isSubmitting ? 'Auto-submitting exam...' : 'Auto-submitting in'}
                  </span>
                </div>
                <span className="text-lg font-mono font-black text-red-400">
                  {autoSubmitTimer <= 0 || isSubmitting ? '0s' : `${autoSubmitTimer}s`}
                </span>
              </div>
            )}

            {violationCount < violationThreshold && (
              <button
                onClick={handleResumeExam}
                disabled={isSubmitting}
                className="w-full py-3.5 bg-[#1e4579] hover:bg-[#16355b] text-white text-sm font-black rounded-xl shadow-lg transition-all transform active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RotateCcw className="w-4 h-4" />
                <span>{isSubmitting ? 'Submitting...' : 'Resume Exam'}</span>
              </button>
            )}
          </div>
        </div>
      )}
      {/* ===== SUBMISSION LOADER ===== */}
      {isSubmitting && (
        <AestheticLoader
          title="Submitting Your Exam..."
          subtitle="Please wait a few seconds, your result is being evaluated..."
        />
      )}
    </div>
  );
}
