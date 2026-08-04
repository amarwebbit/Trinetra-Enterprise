'use client';

import React, { useState, useTransition, useEffect } from 'react';
import { formatDateForHydration } from '@/lib/utils/date';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { publishResults, unpublishResults } from '@/app/actions/teacher-actions';
import { 
  FileText, CheckCircle, Clock, Users, Trophy, Download, 
  BarChart as BarChartIcon, Target, Lock, Eye, RefreshCw
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';

interface TeacherResultsUIProps {
  completedExams: any[];
  assignmentExams: any[];
  selectedExamId?: string;
  analytics: any;
}

export default function TeacherResultsUI({
  completedExams,
  assignmentExams,
  selectedExamId,
  analytics
}: TeacherResultsUIProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [activeFilter, setActiveFilter] = useState<'all' | 'live' | 'assignment'>('all');

  // Compute the filtered exam list for the dropdown
  const allExams = [
    ...completedExams.map(e => ({ ...e, _mode: 'live' })),
    ...assignmentExams.map(e => ({ ...e, _mode: 'assignment' })),
  ];
  const filteredExams = activeFilter === 'all'
    ? allExams
    : allExams.filter(e => e._mode === activeFilter);

  // Auto-refresh for real-time results
  useEffect(() => {
    // Only poll if an exam is actually selected to view
    if (!selectedExamId) return;
    
    const interval = setInterval(() => {
      router.refresh();
    }, 5000); // Refresh every 5 seconds
    
    return () => clearInterval(interval);
  }, [router, selectedExamId]);

  // Show New Results with Toast
  const [previousTotal, setPreviousTotal] = useState(analytics?.totalStudents || 0);

  useEffect(() => {
    if (analytics?.totalStudents && analytics.totalStudents > previousTotal) {
      const diff = analytics.totalStudents - previousTotal;
      toast.success(`${diff} new submission${diff > 1 ? 's' : ''} received!`);
      setPreviousTotal(analytics.totalStudents);
    }
  }, [analytics?.totalStudents, previousTotal]);

  const handleExamChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const params = new URLSearchParams(searchParams.toString());
    if (e.target.value) {
      params.set('examId', e.target.value);
    } else {
      params.delete('examId');
    }
    router.push(`/teacher/results?${params.toString()}`);
  };

  const handlePublishToggle = (publish: boolean) => {
    if (!selectedExamId) return;
    startTransition(async () => {
      try {
        if (publish) {
          await publishResults(selectedExamId);
          toast.success('Results published successfully');
        } else {
          await unpublishResults(selectedExamId);
          toast.success('Results unpublished successfully');
        }
        router.refresh();
      } catch (err: any) {
        toast.error(err.message || 'Failed to update publish status');
      }
    });
  };

  return (
    <div className="space-y-6">
      
      {/* Filter Tabs */}
      <div className="flex gap-1 border-b border-muted">
        {(['all', 'live', 'assignment'] as const).map(filter => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`px-4 py-2 text-xs font-bold capitalize transition-colors border-b-2 -mb-[2px] ${
              activeFilter === filter
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {filter === 'all' ? 'All Results' : filter === 'live' ? '📝 Live Tests' : '📄 Assignments'}
          </button>
        ))}
      </div>

      {/* Top Bar: Selector & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-muted/10 p-4 border border-muted">
        <div className="flex-1 w-full sm:max-w-md">
          <select
            className="w-full bg-background border border-muted p-2.5 rounded-none text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            value={selectedExamId || ''}
            onChange={handleExamChange}
          >
            <option value="">-- Select an Exam --</option>
            {filteredExams.map(exam => (
              <option key={exam.id} value={exam.id}>
                {exam._mode === 'assignment' ? '📄 ' : '📝 '}{exam.title}
                {exam._mode === 'live' ? ` (${formatDateForHydration(exam.end_time)})` : ' [Assignment]'}
                {' '}- {exam._count.exam_attempts} submissions
              </option>
            ))}
          </select>
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
          {selectedExamId && (
            <Button
              variant="outline"
              className="rounded-none w-full sm:w-auto hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200"
              onClick={() => {
                router.refresh();
                toast.success('Refreshing results...');
              }}
            >
              <RefreshCw className="w-4 h-4 mr-2" /> Refresh Now
            </Button>
          )}
          <Button 
            variant="outline" 
            className="rounded-none w-full sm:w-auto hover:bg-red-50 hover:text-red-600 hover:border-red-200" 
            disabled={!selectedExamId}
            onClick={() => {
              window.open(`/api/teacher/results/download/pdf?examId=${selectedExamId}`);
            }}
          >
            <Download className="w-4 h-4 mr-2" /> Download PDF
          </Button>
          <Button 
            variant="outline" 
            className="rounded-none w-full sm:w-auto hover:bg-green-50 hover:text-green-600 hover:border-green-200" 
            disabled={!selectedExamId}
            onClick={() => {
              window.open(`/api/teacher/results/download/excel?examId=${selectedExamId}`);
            }}
          >
            <Download className="w-4 h-4 mr-2" /> Download Excel
          </Button>
        </div>
      </div>

      {/* Live Status Indicator */}
      {selectedExamId && analytics && (
        <div className="flex items-center gap-2 text-sm bg-green-50 text-green-800 p-3 border border-green-200">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
          <span className="font-bold">Live Updates</span>
          <span className="text-green-600/50">|</span>
          <span className="text-green-700">Auto-refreshing every 5s</span>
        </div>
      )}

      {!analytics && selectedExamId && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading analytics...</p>
        </div>
      )}

      {!analytics && !selectedExamId && (
        <div className="text-center py-20 border-2 border-dashed border-muted">
          <BarChartIcon className="mx-auto h-12 w-12 text-muted-foreground opacity-50 mb-4" />
          <h3 className="text-lg font-medium text-foreground">No Exam Selected</h3>
          <p className="text-muted-foreground mt-1 text-sm">
            Please select an exam from the dropdown above to view results and analytics.
          </p>
        </div>
      )}

      {analytics && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="rounded-none border-muted bg-primary/5 border-primary/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Pass Rate</h3>
                  <Target className="w-4 h-4 text-primary" />
                </div>
                <div className="text-3xl font-bold text-foreground">{analytics.passRate}%</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {analytics.passedCount} passed out of {analytics.totalStudents}
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-none border-muted">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Avg Score</h3>
                  <BarChartIcon className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="text-3xl font-bold text-foreground">
                  {analytics.avgScore} <span className="text-lg text-muted-foreground font-normal">/ {analytics.exam.total_marks}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Across all {analytics.totalStudents} submissions
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-none border-muted">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Students</h3>
                  <Users className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="text-3xl font-bold text-foreground">{analytics.totalStudents}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Submitted or Evaluated
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-none border-muted">
              <CardContent className="p-6 flex flex-col justify-between h-full">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Publish Status</h3>
                  {analytics.isPublished ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <Lock className="w-4 h-4 text-red-500" />
                  )}
                </div>
                
                {analytics.isPublished ? (
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 w-fit text-sm rounded-none border-green-200 dark:border-green-800">
                    <CheckCircle className="w-3.5 h-3.5 mr-1.5"/> Published
                  </Badge>
                ) : (
                  <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 w-fit text-sm rounded-none border-red-200 dark:border-red-800">
                    <Lock className="w-3.5 h-3.5 mr-1.5"/> Hidden
                  </Badge>
                )}
                
                <p className="text-xs text-muted-foreground mt-2">
                  {analytics.isPublished ? 'Students can view their results' : 'Results are hidden from students'}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Histogram */}
            <Card className="rounded-none border-muted lg:col-span-2">
              <CardHeader className="border-b border-muted bg-muted/5 pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChartIcon className="w-4 h-4" /> Score Distribution
                </CardTitle>
                <CardDescription>Number of students scoring within specific percentage ranges</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="h-[300px] w-full mt-4">
                  {analytics.distribution.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analytics.distribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                        <XAxis 
                          dataKey="range" 
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                          dy={10}
                        />
                        <YAxis 
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                          allowDecimals={false}
                        />
                        <Tooltip 
                          cursor={{ fill: 'hsl(var(--muted))', opacity: 0.2 }}
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--background))', 
                            borderColor: 'hsl(var(--border))',
                            borderRadius: '0px',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                          }}
                          itemStyle={{ color: 'hsl(var(--foreground))' }}
                        />
                        <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                          {analytics.distribution.map((entry: any, index: number) => {
                            // Highlight the ranges that are passing
                            const minRange = parseInt(entry.range.split('-')[0]);
                            const isPassing = minRange >= (analytics.exam.passing_percentage || 40);
                            return (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={isPassing ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))'} 
                                className="opacity-80 hover:opacity-100 transition-opacity"
                              />
                            );
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                      Not enough data to generate distribution
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Top Performers Table */}
            <Card className="rounded-none border-muted">
              <CardHeader className="border-b border-muted bg-muted/5 pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-500" /> Top Performers
                </CardTitle>
                <CardDescription>Highest scoring students in this exam</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {analytics.topPerformers.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-muted-foreground uppercase bg-muted/10 border-b border-muted">
                        <tr>
                          <th className="px-4 py-3 font-semibold">Rank</th>
                          <th className="px-4 py-3 font-semibold">Student</th>
                          <th className="px-4 py-3 font-semibold text-right">Score</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-muted">
                        {analytics.topPerformers.map((student: any, index: number) => (
                          <tr key={index} className="hover:bg-muted/5 transition-colors">
                            <td className="px-4 py-3 font-medium">
                              {index === 0 && <span className="text-amber-500 font-bold">1st</span>}
                              {index === 1 && <span className="text-slate-400 font-bold">2nd</span>}
                              {index === 2 && <span className="text-amber-700 font-bold">3rd</span>}
                              {index > 2 && <span className="text-muted-foreground">#{index + 1}</span>}
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-medium text-foreground">{student.name}</div>
                              <div className="text-xs text-muted-foreground">{student.rollNumber}</div>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="font-bold text-foreground">{student.score}</div>
                              <div className="text-xs text-muted-foreground">{student.percentage.toFixed(1)}%</div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-8 text-center text-muted-foreground text-sm">
                    No submissions evaluated yet
                  </div>
                )}
              </CardContent>
            </Card>

          </div>

          {/* Action Bar */}
          <div className="flex justify-end pt-4 border-t border-muted">
            {analytics.isPublished ? (
              <Button 
                variant="destructive" 
                className="rounded-none bg-red-600 hover:bg-red-700 text-white"
                onClick={() => handlePublishToggle(false)}
                disabled={isPending}
              >
                {isPending ? 'Processing...' : <><Lock className="w-4 h-4 mr-2" /> Unpublish Results</>}
              </Button>
            ) : (
              <Button 
                className="rounded-none bg-green-600 hover:bg-green-700 text-white"
                onClick={() => handlePublishToggle(true)}
                disabled={isPending}
              >
                {isPending ? 'Processing...' : <><Eye className="w-4 h-4 mr-2" /> Publish Results</>}
              </Button>
            )}
          </div>
          
        </div>
      )}

    </div>
  );
}
