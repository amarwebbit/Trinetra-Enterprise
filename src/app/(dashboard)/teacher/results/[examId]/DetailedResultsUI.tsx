'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  BarChart3, 
  Award, 
  Download, 
  TrendingUp, 
  Users, 
  Search, 
  FileSpreadsheet, 
  FileText, 
  Globe, 
  Trophy,
  ArrowLeft,
  Target,
  AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

interface StudentResultItem {
  rank: number;
  name: string;
  rollNo: string;
  department: string;
  score: number;
  maxScore: number;
  percentage: number;
  status: 'passed' | 'failed';
  attemptsCount?: number;
  attempts?: {
    id: string;
    attemptNumber: number;
    isBestAttempt: boolean;
    score: number;
    percentage: number;
    startTime: Date;
    endTime: Date;
  }[];
}

interface QuestionAnalysisItem {
  qNo: number;
  type: string;
  statement: string;
  avgScore: number;
  maxScore: number;
  negativeMarks: number;
  correctPct: number;
}

interface DetailedResultsUIProps {
  exam: {
    id: string;
    title: string;
    pattern: string | null;
  };
  stats: {
    totalStudents: number;
    passRate: number;
    avgScore: number;
    medianScore: number;
    topPerformer: {
      name: string;
      rollNo: string;
      percentage: number;
    } | null;
  };
  histogramData: { range: string; count: number }[];
  questionAnalysis: QuestionAnalysisItem[];
  studentResults: StudentResultItem[];
}

export default function DetailedResultsUI({
  exam,
  stats,
  histogramData,
  questionAnalysis,
  studentResults,
}: DetailedResultsUIProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isExportOpen, setIsExportOpen] = useState(false);
  
  // Attempts Modal State
  const [selectedStudentForAttempts, setSelectedStudentForAttempts] = useState<StudentResultItem | null>(null);

  const filteredStudents = studentResults.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.rollNo.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleExport = (format: string) => {
    setIsExportOpen(false);
    toast.success(`Exporting exam result analytics as .${format.toUpperCase()}`);
    if (format === 'pdf') {
      window.open(`/api/teacher/results/download/pdf?examId=${exam.id}`);
    } else if (format === 'excel') {
      window.open(`/api/teacher/results/download/excel?examId=${exam.id}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4">
        <div>
          <Link href="/teacher/results" className="text-xs text-primary hover:underline flex items-center gap-1 font-semibold mb-1">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Class Analytics Overview
          </Link>
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight">{exam.title} Analytics</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Exam Code: {exam.pattern || 'CUSTOM'} • {stats.totalStudents} Evaluated Submissions</p>
        </div>

        <div className="relative shrink-0">
          <Button
            onClick={() => setIsExportOpen(!isExportOpen)}
            className="rounded-none bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold h-9 px-3 flex items-center gap-2 shadow-sm"
          >
            <Download className="h-4 w-4" />
            Export Class Report
          </Button>

          {isExportOpen && (
            <div className="absolute right-0 top-10 z-30 w-48 bg-card border border-border shadow-lg rounded-none py-1 text-left animate-in fade-in duration-150">
              <button
                onClick={() => handleExport('pdf')}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-muted text-left"
              >
                <FileText className="h-4 w-4 text-rose-500" />
                Download PDF Report
              </button>
              <button
                onClick={() => handleExport('excel')}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-muted text-left"
              >
                <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                Export Excel (.xlsx)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 4 Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-card border border-border rounded-none space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Pass Rate</span>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-foreground">{stats.passRate}%</p>
          <p className="text-[10px] text-emerald-600 font-semibold">Overall success rate</p>
        </div>

        <div className="p-4 bg-card border border-border rounded-none space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Class Avg Score</span>
            <Award className="h-4 w-4 text-secondary" />
          </div>
          <p className="text-2xl font-black text-foreground">{stats.avgScore}%</p>
          <p className="text-[10px] text-muted-foreground">Median: {stats.medianScore}%</p>
        </div>

        <div className="p-4 bg-card border border-border rounded-none space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Evaluated</span>
            <Users className="h-4 w-4 text-primary" />
          </div>
          <p className="text-2xl font-black text-foreground">{stats.totalStudents}</p>
          <p className="text-[10px] text-muted-foreground">100% autograded</p>
        </div>

        <div className="p-4 bg-card border border-border rounded-none space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Top Performer</span>
            <Trophy className="h-4 w-4 text-yellow-500" />
          </div>
          <p className="text-lg font-black text-foreground truncate">{stats.topPerformer?.name || 'N/A'}</p>
          <p className="text-[10px] text-yellow-600 dark:text-yellow-400 font-bold">
            {stats.topPerformer ? `${stats.topPerformer.percentage.toFixed(1)}% (${stats.topPerformer.rollNo})` : 'N/A'}
          </p>
        </div>
      </div>

      {/* Histogram & Question Analysis Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Score Distribution Chart */}
        <div className="lg:col-span-7 bg-card border border-border p-5 rounded-none space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <h2 className="text-sm font-bold text-foreground">Class Score Histogram</h2>
            </div>
            <span className="text-[10px] text-muted-foreground font-semibold">{stats.totalStudents} Submissions</span>
          </div>

          <div className="h-64 w-full pt-2">
            {stats.totalStudents === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                No submissions data to display distribution.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={histogramData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="range" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'var(--card)', 
                      borderColor: 'var(--border)', 
                      borderRadius: 0,
                      fontSize: '12px'
                    }} 
                  />
                  <Bar dataKey="count" fill="var(--primary)" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Question-wise Difficulty Analysis Table */}
        <div className="lg:col-span-5 bg-card border border-border p-5 rounded-none space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-secondary" />
              <h2 className="text-sm font-bold text-foreground">Question Difficulty Analysis</h2>
            </div>
          </div>

          <div className="space-y-3 text-xs max-h-[256px] overflow-y-auto">
            {questionAnalysis.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                No questions found in this exam.
              </div>
            ) : (
              questionAnalysis.map((qa) => (
                <div key={qa.qNo} className="p-3 bg-background border border-border space-y-1.5">
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-foreground">Q#{qa.qNo} ({qa.type.toUpperCase()})</span>
                    <span className={qa.correctPct >= 70 ? 'text-emerald-600 font-bold' : 'text-amber-600 font-bold'}>
                      {qa.correctPct}% Correct
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground line-clamp-1">{qa.statement}</p>
                  <div className="flex items-center gap-4 text-[10px] text-muted-foreground pt-1 border-t border-border/50">
                    <span>Marks: <strong>{qa.maxScore}</strong></span>
                    <span>Negative: <strong>{qa.negativeMarks}</strong></span>
                    <span className="ml-auto">Avg Score: <strong>{qa.avgScore}</strong></span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Student Rankers Table */}
      <div className="bg-card border border-border rounded-none overflow-hidden shadow-sm">
        <div className="p-4 bg-muted/20 border-b border-border flex items-center justify-between">
          <h3 className="font-bold text-foreground text-sm">Student Results & Marksheets</h3>
          <div className="relative w-64">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search student or roll no..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-background border border-input pl-8 pr-3 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary rounded-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-muted/50 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border">
                <th className="py-3 px-4 font-bold">Rank</th>
                <th className="py-3 px-4 font-bold">Student Name</th>
                <th className="py-3 px-4 font-bold">Roll Number</th>
                <th className="py-3 px-4 font-bold">Department</th>
                <th className="py-3 px-4 font-bold">Score / Total</th>
                <th className="py-3 px-4 font-bold">Percentage</th>
                <th className="py-3 px-4 font-bold text-center">Attempts</th>
                <th className="py-3 px-4 text-right font-bold">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 px-4 text-center text-muted-foreground">
                    No results found.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s) => (
                  <tr key={s.rollNo} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 font-bold text-foreground font-mono">
                      #{s.rank}
                    </td>
                    <td className="py-3 px-4 font-bold text-foreground">
                      {s.name}
                    </td>
                    <td className="py-3 px-4 font-mono text-muted-foreground">
                      {s.rollNo}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground font-medium">
                      {s.department}
                    </td>
                    <td className="py-3 px-4 font-bold text-foreground font-mono">
                      {s.score} <span className="font-normal text-muted-foreground">/ {s.maxScore}</span>
                    </td>
                    <td className="py-3 px-4 font-extrabold text-primary font-mono">
                      {s.percentage.toFixed(1)}%
                    </td>
                    <td className="py-3 px-4 text-center">
                      {s.attemptsCount && s.attemptsCount > 1 ? (
                        <button
                          onClick={() => setSelectedStudentForAttempts(s)}
                          className="bg-blue-50 text-blue-600 px-2 py-1 text-[10px] font-bold uppercase rounded-none border border-blue-200 hover:bg-blue-100 transition-colors"
                        >
                          {s.attemptsCount} Attempts
                        </button>
                      ) : (
                        <span className="text-muted-foreground">1</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className={s.status === 'passed' 
                        ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-2 py-0.5 text-[9px] font-bold uppercase"
                        : "bg-red-500/10 text-red-600 border border-red-500/20 px-2 py-0.5 text-[9px] font-bold uppercase"
                      }>
                        {s.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Student Attempts Modal */}
      {selectedStudentForAttempts && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-2xl border border-border shadow-xl">
            <div className="p-4 border-b border-border flex justify-between items-center bg-muted/20">
              <div>
                <h3 className="font-bold text-lg">Attempts History</h3>
                <p className="text-xs text-muted-foreground">
                  {selectedStudentForAttempts.name} ({selectedStudentForAttempts.rollNo})
                </p>
              </div>
              <button 
                onClick={() => setSelectedStudentForAttempts(null)}
                className="text-muted-foreground hover:text-foreground p-1"
              >
                ✕
              </button>
            </div>
            
            <div className="p-4 max-h-[60vh] overflow-y-auto">
              {selectedStudentForAttempts.attempts && selectedStudentForAttempts.attempts.length > 0 ? (
                <div className="space-y-3">
                  {selectedStudentForAttempts.attempts
                    .sort((a, b) => b.attemptNumber - a.attemptNumber)
                    .map((attempt) => (
                    <div 
                      key={attempt.id} 
                      className={`p-3 border flex flex-col sm:flex-row justify-between sm:items-center gap-2 ${
                        attempt.isBestAttempt 
                          ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20' 
                          : 'border-border'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm">Attempt #{attempt.attemptNumber}</span>
                          {attempt.isBestAttempt && (
                            <span className="text-[9px] font-bold bg-emerald-500 text-white px-1.5 py-0.5 rounded-sm uppercase tracking-wider">
                              Best Attempt
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(attempt.startTime).toLocaleString()}
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end">
                        <div className="font-bold text-lg">{attempt.percentage.toFixed(1)}%</div>
                        <div className="text-xs text-muted-foreground">
                          {attempt.score} / {selectedStudentForAttempts.maxScore} marks
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  No attempt details found.
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-border flex justify-end bg-muted/10">
              <Button onClick={() => setSelectedStudentForAttempts(null)} variant="outline" className="rounded-none">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
