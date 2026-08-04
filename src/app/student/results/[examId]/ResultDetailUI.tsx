'use client';

import { useState } from 'react';
import Image from 'next/image';
import { formatDateForHydration } from '@/lib/utils/date';
import Link from 'next/link';
import { renderMath } from '@/components/ui/MathText';
import { CheckCircle2, XCircle, HelpCircle, Clock, BookOpen } from 'lucide-react';

function renderRichText(input: string) {
  if (!input) return { __html: '' };
  return { __html: renderMath(input) };
}

export function ResultDetailUI({
  attempt,
  tenant,
  sectionScores,
  stats,
  passed,
  passingPercentage,
  studentName,
  rollNumber,
  isPurged = false,
  detailedQuestions = [],
}: any) {
  const [filter, setFilter] = useState<'all' | 'correct' | 'incorrect' | 'unattempted'>('all');

  const filteredQuestions = detailedQuestions.filter((q: any) => {
    if (filter === 'correct') return q.status === 'correct';
    if (filter === 'incorrect') return q.status === 'incorrect';
    if (filter === 'unattempted') return q.status === 'unattempted';
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 font-sans">
      {/* Header - White-label */}
      <header className="bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 px-6 py-4 shadow-sm relative z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
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
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
                {tenant?.name?.charAt(0) || 'E'}
              </div>
            )}
            <span className="text-xl font-extrabold tracking-tight" style={{ color: tenant?.primary_color || '#2563EB' }}>
              {tenant?.name || 'TrinetraEdu-AI'}
            </span>
          </div>
          <div>
            <Link href="/student/results">
              <button className="text-sm font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-4 py-2 rounded-lg">
                ← Back to Results
              </button>
            </Link>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        
        <div className="bg-white dark:bg-slate-950 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-8">
          {/* Exam Title & Details */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-6 mb-6">
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2">{attempt.exams?.title}</h1>
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500 font-medium">
                <span className="flex items-center gap-1.5">
                  <span className="text-slate-400">Student:</span> 
                  <span className="text-slate-700 dark:text-slate-300">{studentName}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="text-slate-400">Roll No:</span> 
                  <span className="text-slate-700 dark:text-slate-300">{rollNumber}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="text-slate-400">Date:</span> 
                  <span className="text-slate-700 dark:text-slate-300">{formatDateForHydration(attempt.end_time)}</span>
                </span>
              </div>
            </div>
            
            {/* Pass/Fail Banner */}
            <div className={`px-6 py-3 rounded-xl border flex flex-col items-center justify-center shrink-0 min-w-[140px] ${
              passed
                ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/50'
                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/50'
            }`}>
              <span className={`text-xl font-extrabold uppercase tracking-wide ${
                passed ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
              }`}>
                {passed ? 'Passed' : 'Failed'}
              </span>
              <span className="text-[10px] font-bold text-slate-500 uppercase mt-1">
                Required: {passingPercentage}%
              </span>
            </div>
          </div>
          
          {/* Main Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-5 border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center text-center">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Total Score</div>
              <div className="text-3xl font-extrabold text-slate-900 dark:text-white">
                {attempt.score} <span className="text-lg text-slate-400">/ {attempt.exams?.total_marks}</span>
              </div>
            </div>
            
            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-5 border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center text-center relative overflow-hidden">
              <div className={`absolute bottom-0 left-0 h-1 w-full ${passed ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Percentage</div>
              <div className={`text-3xl font-extrabold ${passed ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                {attempt.percentage}%
              </div>
            </div>
            
            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-5 border border-emerald-100 dark:border-emerald-900/30 flex flex-col items-center justify-center text-center">
              <div className="text-xs font-bold text-emerald-600/80 dark:text-emerald-400/80 uppercase tracking-wider mb-2">Correct Answers</div>
              <div className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">{stats.correct}</div>
            </div>
            
            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-5 border border-red-100 dark:border-red-900/30 flex flex-col items-center justify-center text-center">
              <div className="text-xs font-bold text-red-600/80 dark:text-red-400/80 uppercase tracking-wider mb-2">Wrong Answers</div>
              <div className="text-3xl font-extrabold text-red-600 dark:text-red-400">{stats.wrong}</div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            {/* Section-wise Breakdown */}
            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 p-6">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                <span className="w-8 h-8 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center">📊</span>
                Section Performance
              </h2>
              <div className="space-y-5">
                {sectionScores.map((section: any, index: number) => (
                  <div key={index} className="group">
                    <div className="flex justify-between items-end mb-2">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{section.name}</span>
                      <div className="text-right">
                        <span className="font-bold text-slate-900 dark:text-white">{section.scored}</span>
                        <span className="text-slate-400 text-sm"> / {section.total}</span>
                        <span className="text-xs font-bold text-slate-500 ml-2 w-10 inline-block">{section.percentage}%</span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden flex">
                      <div
                        className="h-full transition-all duration-1000 ease-out rounded-full"
                        style={{
                          width: `${section.percentage}%`,
                          backgroundColor: tenant?.primary_color || '#2563EB',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Summary & Export */}
            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 p-6 flex flex-col">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                <span className="w-8 h-8 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-600 flex items-center justify-center">🎯</span>
                Attempt Accuracy
              </h2>
              
              <div className="flex-1 flex flex-col justify-center">
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                  <span className="text-slate-600 dark:text-slate-400 font-medium">Total Questions</span>
                  <span className="font-bold text-slate-900 dark:text-white">{stats.totalQuestions}</span>
                </div>
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                  <span className="text-slate-600 dark:text-slate-400 font-medium">Attempted</span>
                  <span className="font-bold text-slate-900 dark:text-white">{stats.correct + stats.wrong}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-400 font-medium">Unattempted</span>
                  <span className="font-bold text-slate-500">{stats.unattempted}</span>
                </div>
                
                <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
                  <div className="flex gap-4">
                    <button
                      onClick={() => window.open(`/api/student/results/download/pdf?examId=${attempt.exam_id}`)}
                      className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-900/50 rounded-lg font-bold hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors text-sm"
                    >
                      <span>📄</span> PDF Report
                    </button>
                    <button
                      onClick={() => window.open(`/api/student/results/download/excel?examId=${attempt.exam_id}`)}
                      className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50 rounded-lg font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors text-sm"
                    >
                      <span>📊</span> Excel Data
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ===== 7-DAY PURGE BANNER OR DETAILED QUESTION ANALYSIS ===== */}
          {isPurged ? (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-xl p-6 flex items-start gap-4">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 rounded-lg">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-amber-900 dark:text-amber-200 mb-1">
                  Detailed Question Analysis Expired
                </h3>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Question-by-question response breakdown is available for 7 days after submission for security and compliance purposes. Your overall score summary and performance breakdown remain saved above.
                </p>
              </div>
            </div>
          ) : (
            <div className="border-t border-slate-200 dark:border-slate-800 pt-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <BookOpen className="w-6 h-6 text-blue-600" />
                    Detailed Question Review
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Review your submitted answers against correct options to learn from mistakes. Available for 7 days post-submission.
                  </p>
                </div>

                {/* Filter Tabs */}
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold shrink-0">
                  <button
                    onClick={() => setFilter('all')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${filter === 'all' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-400'}`}
                  >
                    All ({detailedQuestions.length})
                  </button>
                  <button
                    onClick={() => setFilter('correct')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${filter === 'correct' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400'}`}
                  >
                    Correct ({stats.correct})
                  </button>
                  <button
                    onClick={() => setFilter('incorrect')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${filter === 'incorrect' ? 'bg-red-500 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400'}`}
                  >
                    Incorrect ({stats.wrong})
                  </button>
                  <button
                    onClick={() => setFilter('unattempted')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${filter === 'unattempted' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400'}`}
                  >
                    Unattempted ({stats.unattempted})
                  </button>
                </div>
              </div>

              {/* Questions List */}
              <div className="space-y-6">
                {filteredQuestions.map((q: any, index: number) => {
                  let parsedOptions: Record<string, string> = {};
                  if (typeof q.options === 'string') {
                    try { parsedOptions = JSON.parse(q.options); } catch (e) { parsedOptions = {}; }
                  } else if (typeof q.options === 'object' && q.options !== null) {
                    parsedOptions = q.options;
                  }

                  return (
                    <div
                      key={q.id || index}
                      className={`rounded-2xl border p-6 transition-all ${
                        q.status === 'correct'
                          ? 'border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/30 dark:bg-emerald-950/10'
                          : q.status === 'incorrect'
                          ? 'border-red-200 dark:border-red-900/40 bg-red-50/30 dark:bg-red-950/10'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/20'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-black uppercase px-2.5 py-1 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                            Q{index + 1}
                          </span>
                          <span className="text-xs font-bold text-slate-500">
                            [{q.sectionName || 'Section'}]
                          </span>
                          <span className="text-xs font-bold uppercase text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                            {q.type?.replace('_', ' ')}
                          </span>
                        </div>

                        {/* Status Badge */}
                        {q.status === 'correct' && (
                          <div className="flex items-center gap-1.5 text-xs font-black text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/40 px-3 py-1 rounded-full">
                            <CheckCircle2 className="w-4 h-4" /> Correct (+{q.marksAwarded})
                          </div>
                        )}
                        {q.status === 'incorrect' && (
                          <div className="flex items-center gap-1.5 text-xs font-black text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/40 px-3 py-1 rounded-full">
                            <XCircle className="w-4 h-4" /> Incorrect ({q.marksAwarded})
                          </div>
                        )}
                        {q.status === 'unattempted' && (
                          <div className="flex items-center gap-1.5 text-xs font-black text-slate-600 dark:text-slate-400 bg-slate-200 dark:bg-slate-800 px-3 py-1 rounded-full">
                            <HelpCircle className="w-4 h-4" /> Unattempted (0)
                          </div>
                        )}
                      </div>

                      {/* Question Text */}
                      <div
                        className="text-base font-bold text-slate-900 dark:text-white mb-4 leading-relaxed whitespace-pre-wrap"
                        dangerouslySetInnerHTML={renderRichText(q.questionText || '')}
                      />

                      {/* Options List */}
                      {Object.keys(parsedOptions).length > 0 && (
                        <div className="space-y-2 mb-4">
                          {Object.entries(parsedOptions).map(([optKey, optVal]) => {
                            const isSelected = q.studentAnswer === optKey || q.studentAnswer?.split(',').includes(optKey);
                            const isCorrectOpt = q.correctAnswer === optKey || q.correctAnswer?.split(',').includes(optKey);

                            let optStyle = 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300';
                            if (isCorrectOpt) {
                              optStyle = 'border-emerald-500 bg-emerald-100/60 dark:bg-emerald-900/40 text-emerald-900 dark:text-emerald-100 font-bold';
                            } else if (isSelected && !isCorrectOpt) {
                              optStyle = 'border-red-500 bg-red-100/60 dark:bg-red-900/40 text-red-900 dark:text-red-100 font-bold';
                            }

                            return (
                              <div
                                key={optKey}
                                className={`flex items-center justify-between p-3 rounded-xl border text-sm transition-all ${optStyle}`}
                              >
                                <div className="flex items-center gap-3">
                                  <span className="font-extrabold uppercase w-5">{optKey}.</span>
                                  <span dangerouslySetInnerHTML={renderRichText(optVal as string)} />
                                </div>
                                <div className="flex items-center gap-2 text-xs font-black shrink-0">
                                  {isCorrectOpt && <span className="text-emerald-600 dark:text-emerald-400">✓ Correct Answer</span>}
                                  {isSelected && !isCorrectOpt && <span className="text-red-600 dark:text-red-400">✗ Your Choice</span>}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* NAT Answer Display */}
                      {q.type === 'nat' && (
                        <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-sm font-medium space-y-1 mb-4">
                          <div>Your Entered Value: <span className="font-extrabold">{q.studentAnswer || 'None'}</span></div>
                          <div>Correct Numerical Answer: <span className="font-extrabold text-emerald-600">{q.correctAnswer}</span></div>
                        </div>
                      )}

                      {/* Explanation box */}
                      {q.explanation && (
                        <div className="mt-4 p-4 bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40 rounded-xl text-xs text-blue-900 dark:text-blue-200">
                          <span className="font-extrabold uppercase block mb-1">💡 Solution Explanation:</span>
                          <div dangerouslySetInnerHTML={renderRichText(q.explanation)} />
                        </div>
                      )}
                    </div>
                  );
                })}

                {filteredQuestions.length === 0 && (
                  <p className="text-slate-500 text-sm italic text-center py-8">
                    No questions found matching the selected filter.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
