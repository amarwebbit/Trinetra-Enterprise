'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MathText } from '@/components/ui/MathText';
import { AlertTriangle, CheckCircle, ShieldAlert, Play, RefreshCw, XCircle, Award } from 'lucide-react';
import { toast } from 'sonner';

interface Question {
  id: string;
  question_text: string;
  type: string;
  options: any;
  correct_answer: string;
  marks?: number;
  negative_marks?: number;
}

interface ExamSection {
  id: string;
  name: string;
  exam_questions: {
    questions: Question;
  }[];
}

interface ExamDetails {
  id: string;
  title: string;
  duration_minutes: number;
  total_marks: number;
  passing_percentage: number;
  full_screen_required: boolean;
  disable_copy_paste: boolean;
  metadata?: any;
  exam_sections: ExamSection[];
}

interface PilotExamModalProps {
  isOpen: boolean;
  onClose: () => void;
  exam: ExamDetails | null;
}

export const PilotExamModal: React.FC<PilotExamModalProps> = ({
  isOpen,
  onClose,
  exam,
}) => {
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [violationCount, setViolationCount] = useState(0);
  const [enableProctoringTest, setEnableProctoringTest] = useState(true);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [scoreResult, setScoreResult] = useState<{ score: number; totalPossible: number; percentage: number } | null>(null);

  const violationThreshold = exam?.metadata?.violation_threshold ?? 5;
  const autoSubmitSeconds = exam?.metadata?.auto_submit_seconds ?? 10;

  // Flatten questions from current section or all sections
  const allSections = exam?.exam_sections || [];
  const currentSection = allSections[currentSectionIndex] || null;
  const currentQuestions = (currentSection?.exam_questions || []).map(eq => eq.questions).filter(Boolean);
  const currentQuestion = currentQuestions[currentQuestionIndex] || null;

  // Reset state on open
  useEffect(() => {
    if (isOpen) {
      setCurrentSectionIndex(0);
      setCurrentQuestionIndex(0);
      setUserAnswers({});
      setViolationCount(0);
      setIsSubmitted(false);
      setScoreResult(null);
    }
  }, [isOpen]);

  if (!exam) return null;

  const handleOptionSelect = (questionId: string, value: string) => {
    if (isSubmitted) return;
    setUserAnswers(prev => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const triggerSimulatedViolation = (reason: string) => {
    if (!enableProctoringTest || isSubmitted) return;
    const nextCount = violationCount + 1;
    setViolationCount(nextCount);

    if (nextCount >= violationThreshold) {
      toast.error(`[PILOT PROCTORING] Threshold Reached (${nextCount}/${violationThreshold}): Simulated Auto-Submission triggered!`);
      calculateAndSubmit();
    } else {
      toast.warning(`[PILOT PROCTORING] ${reason} Warning ${nextCount}/${violationThreshold}! Grace period: ${autoSubmitSeconds}s.`);
    }
  };

  const calculateAndSubmit = () => {
    let totalScore = 0;
    let maxMarks = 0;

    allSections.forEach(section => {
      section.exam_questions.forEach(eq => {
        const q = eq.questions;
        if (!q) return;
        const qMarks = Number(q.marks || 1);
        const negMarks = Number(q.negative_marks || 0);
        maxMarks += qMarks;

        const ans = (userAnswers[q.id] || '').trim();
        const correct = (q.correct_answer || '').trim();

        if (ans) {
          if (ans.toLowerCase() === correct.toLowerCase()) {
            totalScore += qMarks;
          } else {
            totalScore -= negMarks;
          }
        }
      });
    });

    const percentage = maxMarks > 0 ? (totalScore / maxMarks) * 100 : 0;
    setScoreResult({ score: totalScore, totalPossible: maxMarks, percentage });
    setIsSubmitted(true);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl h-[85vh] flex flex-col p-0 rounded-none overflow-hidden">
        {/* Header */}
        <DialogHeader className="p-4 border-b border-muted bg-muted/20 flex flex-row items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                Pilot Test Mode
              </span>
              <DialogTitle className="text-lg font-bold">{exam.title}</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              Preview exam taking experience without creating database attempt logs.
            </DialogDescription>
          </div>

          {/* Flexible Proctoring Controls for Teacher */}
          <div className="flex items-center gap-2 bg-background p-2 border border-muted text-xs">
            <ShieldAlert className="w-4 h-4 text-orange-500" />
            <label className="flex items-center gap-1.5 cursor-pointer font-medium">
              <input 
                type="checkbox" 
                checked={enableProctoringTest} 
                onChange={(e) => setEnableProctoringTest(e.target.checked)}
                className="rounded border-muted"
              />
              Test Violation Logic (Max: {violationThreshold})
            </label>
          </div>
        </DialogHeader>

        {/* Main Body */}
        <div className="flex-1 flex overflow-hidden">
          {isSubmitted ? (
            /* Result Preview Screen */
            <div className="flex-1 p-8 overflow-y-auto flex flex-col items-center justify-center text-center space-y-6">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                <Award className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-2xl font-bold">Pilot Exam Completed</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Here is the instant evaluation of your test run.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-6 w-full max-w-lg bg-muted/20 p-6 border border-muted">
                <div>
                  <div className="text-xs text-muted-foreground uppercase font-bold">Score</div>
                  <div className="text-2xl font-bold text-primary">
                    {scoreResult?.score} / {scoreResult?.totalPossible}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase font-bold">Percentage</div>
                  <div className="text-2xl font-bold text-indigo-600">
                    {scoreResult?.percentage.toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase font-bold">Violations</div>
                  <div className="text-2xl font-bold text-orange-600">
                    {violationCount} / {violationThreshold}
                  </div>
                </div>
              </div>

              <Button 
                onClick={() => {
                  setIsSubmitted(false);
                  setUserAnswers({});
                  setViolationCount(0);
                }}
                className="rounded-none bg-primary text-primary-foreground gap-2"
              >
                <RefreshCw className="w-4 h-4" /> Restart Pilot Test
              </Button>
            </div>
          ) : (
            /* Live Exam Interface Simulator */
            <>
              {/* Question Navigation Sidebar */}
              <div className="w-64 border-r border-muted p-4 bg-muted/10 overflow-y-auto space-y-4">
                <div>
                  <h4 className="text-xs font-bold text-muted-foreground uppercase mb-2">Sections</h4>
                  <div className="space-y-1">
                    {allSections.map((sec, idx) => (
                      <button
                        key={sec.id || idx}
                        onClick={() => {
                          setCurrentSectionIndex(idx);
                          setCurrentQuestionIndex(0);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs font-medium border transition-colors ${
                          idx === currentSectionIndex
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-background hover:bg-muted border-muted'
                        }`}
                      >
                        {sec.name} ({sec.exam_questions?.length || 0})
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-muted-foreground uppercase mb-2">Question Grid</h4>
                  <div className="grid grid-cols-4 gap-1.5">
                    {currentQuestions.map((q, qIdx) => {
                      const isAnswered = !!userAnswers[q.id];
                      return (
                        <button
                          key={q.id || qIdx}
                          onClick={() => setCurrentQuestionIndex(qIdx)}
                          className={`h-8 text-xs font-bold border transition-colors ${
                            qIdx === currentQuestionIndex
                              ? 'ring-2 ring-primary border-primary font-black'
                              : ''
                          } ${
                            isAnswered
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-background text-foreground border-muted hover:bg-muted'
                          }`}
                        >
                          {qIdx + 1}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Violation Simulator Box */}
                {enableProctoringTest && (
                  <div className="pt-4 border-t border-muted space-y-2">
                    <div className="text-xs font-bold text-orange-600 uppercase flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> Violation Simulator
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Violations: <span className="font-bold text-foreground">{violationCount} / {violationThreshold}</span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => triggerSimulatedViolation('Tab Switch')}
                      className="w-full text-xs text-orange-700 border-orange-300 bg-orange-50 hover:bg-orange-100 rounded-none"
                    >
                      Simulate Tab Switch
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => triggerSimulatedViolation('Fullscreen Exit')}
                      className="w-full text-xs text-orange-700 border-orange-300 bg-orange-50 hover:bg-orange-100 rounded-none"
                    >
                      Simulate Fullscreen Exit
                    </Button>
                  </div>
                )}
              </div>

              {/* Main Question View */}
              <div className="flex-1 flex flex-col p-6 overflow-y-auto">
                {currentQuestion ? (
                  <div className="space-y-6 flex-1">
                    <div className="flex justify-between items-start border-b border-muted pb-3">
                      <div className="flex items-center gap-2">
                        <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-0.5 uppercase">
                          Question {currentQuestionIndex + 1} of {currentQuestions.length}
                        </span>
                        <span className="text-xs text-muted-foreground uppercase font-medium">
                          Type: {currentQuestion.type}
                        </span>
                      </div>
                      <div className="text-xs font-medium text-muted-foreground">
                        Marks: <span className="text-emerald-600 font-bold">+{currentQuestion.marks || 1}</span> / Negative: <span className="text-red-500 font-bold">-{currentQuestion.negative_marks || 0}</span>
                      </div>
                    </div>

                    {/* Question Stem with MathText */}
                    <div className="text-base leading-relaxed">
                      <MathText text={currentQuestion.question_text} className="block text-foreground font-medium" />
                    </div>

                    {/* Options or NAT Input */}
                    {currentQuestion.type === 'nat' ? (
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-muted-foreground">Enter Numerical Answer:</label>
                        <input
                          type="text"
                          value={userAnswers[currentQuestion.id] || ''}
                          onChange={(e) => handleOptionSelect(currentQuestion.id, e.target.value)}
                          placeholder="e.g. 42 or 3.14"
                          className="w-48 px-3 py-2 border border-muted bg-background text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                    ) : currentQuestion.options ? (
                      <div className="space-y-2 pt-2">
                        {Object.entries(currentQuestion.options).map(([key, val]) => {
                          const isSelected = userAnswers[currentQuestion.id] === key || userAnswers[currentQuestion.id] === String(val);
                          return (
                            <div
                              key={key}
                              onClick={() => handleOptionSelect(currentQuestion.id, key)}
                              className={`p-3 border cursor-pointer transition-colors flex items-start gap-3 ${
                                isSelected
                                  ? 'bg-primary/10 border-primary text-primary font-medium'
                                  : 'bg-background hover:bg-muted/40 border-muted'
                              }`}
                            >
                              <span className="w-6 h-6 rounded-full border border-current flex items-center justify-center text-xs font-bold flex-shrink-0">
                                {key}
                              </span>
                              <div className="flex-1 pt-0.5">
                                <MathText text={val as string} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                    No questions available in this section.
                  </div>
                )}

                {/* Footer Controls */}
                <div className="mt-auto pt-4 border-t border-muted flex items-center justify-between">
                  <Button
                    variant="outline"
                    disabled={currentQuestionIndex === 0}
                    onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
                    className="rounded-none text-xs"
                  >
                    Previous
                  </Button>

                  <Button
                    variant="outline"
                    disabled={currentQuestionIndex === currentQuestions.length - 1}
                    onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                    className="rounded-none text-xs"
                  >
                    Next Question
                  </Button>

                  <Button
                    onClick={calculateAndSubmit}
                    className="rounded-none text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                  >
                    Submit Pilot Test
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
