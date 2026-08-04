'use client';

import React, { useTransition } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Download, TrendingUp, Users, Award, Target, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

import { publishResults } from '@/app/actions/results-actions';

type ExamOpt = { id: string; title: string };

type Performer = {
  id: string;
  name: string;
  department: string;
  score: number;
  percentage: number;
};

type AnalyticsData = {
  passRate: number;
  avgScore: number;
  totalStudents: number;
  totalMarks: number;
  topPerformers: Performer[];
  departmentBreakdown: { name: string; averageScore: number; studentCount: number }[];
  distribution: { range: string; count: number }[];
  isResultsPublished: boolean;
};

type ResultsUIProps = {
  completedExams: ExamOpt[];
  selectedExamId: string | null;
  analytics: AnalyticsData | null;
};

const COLORS = ['#2563EB', '#7C3AED', '#EC4899', '#10B981', '#F59E0B', '#3B82F6'];

export default function ResultsUI({
  completedExams,
  selectedExamId,
  analytics
}: ResultsUIProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const handleExamChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    const params = new URLSearchParams(searchParams.toString());
    if (val) {
      params.set('examId', val);
    } else {
      params.delete('examId');
    }
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const handleExport = () => {
    if (!selectedExamId) return;
    toast.info("Preparing Excel export...");
    window.location.href = `/api/admin/results/download?examId=${selectedExamId}`;
  };

  const handlePdfExport = () => {
    if (!selectedExamId) return;
    toast.info('Preparing white-label PDF export...');
    window.open(`/api/admin/results/download/pdf?examId=${selectedExamId}`, '_blank', 'noopener,noreferrer');
  };

  const handleTogglePublish = async () => {
    if (!selectedExamId || !analytics) return;
    try {
      await publishResults(selectedExamId, !analytics.isResultsPublished);
      toast.success(`Results ${!analytics.isResultsPublished ? 'published to students' : 'hidden from students'}`);
    } catch (e: any) {
      toast.error(e.message || "Action failed");
    }
  };

  if (completedExams.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-card border border-muted rounded-none shadow-sm mt-4">
        <Target className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold">No Completed Exams</h3>
        <p className="text-muted-foreground text-sm mt-1">Results and analytics will appear here once an exam has ended.</p>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in zoom-in-95 duration-200">
      
      {/* Top Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 p-4 bg-card border border-muted rounded-none">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <label className="text-sm font-bold text-muted-foreground whitespace-nowrap">Select Exam:</label>
          <select 
            className="w-full md:w-80 bg-background border border-muted p-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            value={selectedExamId || ''}
            onChange={handleExamChange}
          >
            {completedExams.map(exam => (
              <option key={exam.id} value={exam.id}>{exam.title}</option>
            ))}
          </select>
        </div>
        
        {selectedExamId && analytics && (
          <div className="flex gap-2 w-full md:w-auto">
             <Button 
              variant="outline" 
              className="rounded-none w-full md:w-auto" 
              onClick={handleTogglePublish}
            >
              {analytics.isResultsPublished ? (
                <><EyeOff className="h-4 w-4 mr-2" /> Hide Results</>
              ) : (
                <><Eye className="h-4 w-4 mr-2" /> Publish to Students</>
              )}
            </Button>
            <Button className="rounded-none w-full md:w-auto bg-green-600 hover:bg-green-700 text-white" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" /> Export to Excel
            </Button>
            <Button variant="outline" className="rounded-none w-full md:w-auto" onClick={handlePdfExport}>
              <Download className="h-4 w-4 mr-2" /> Download PDF
            </Button>
          </div>
        )}
      </div>

      {!analytics ? (
        <div className="text-center py-12 text-muted-foreground">Select an exam to view analytics.</div>
      ) : (
        <div className="space-y-6">
          
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="rounded-none border-muted">
              <CardContent className="p-6 flex flex-col justify-center items-center">
                <TrendingUp className="h-8 w-8 text-primary mb-2 opacity-80" />
                <span className="text-3xl font-bold">{analytics.passRate}%</span>
                <span className="text-xs uppercase font-bold tracking-wider text-muted-foreground mt-1">Pass Rate</span>
              </CardContent>
            </Card>
            
            <Card className="rounded-none border-muted">
              <CardContent className="p-6 flex flex-col justify-center items-center">
                <Target className="h-8 w-8 text-blue-500 mb-2 opacity-80" />
                <span className="text-3xl font-bold">{analytics.avgScore} <span className="text-base font-normal text-muted-foreground">/ {analytics.totalMarks}</span></span>
                <span className="text-xs uppercase font-bold tracking-wider text-muted-foreground mt-1">Avg Score</span>
              </CardContent>
            </Card>
            
            <Card className="rounded-none border-muted">
              <CardContent className="p-6 flex flex-col justify-center items-center">
                <Users className="h-8 w-8 text-green-500 mb-2 opacity-80" />
                <span className="text-3xl font-bold">{analytics.totalStudents}</span>
                <span className="text-xs uppercase font-bold tracking-wider text-muted-foreground mt-1">Total Submissions</span>
              </CardContent>
            </Card>
            
            <Card className="rounded-none border-muted">
              <CardContent className="p-6 flex flex-col justify-center items-center text-center">
                <Award className="h-8 w-8 text-yellow-500 mb-2 opacity-80" />
                <span className="text-lg font-bold leading-tight line-clamp-1 break-all">
                  {analytics.topPerformers[0]?.name || 'N/A'}
                </span>
                <span className="text-xs uppercase font-bold tracking-wider text-muted-foreground mt-1">Top Performer ({analytics.topPerformers[0]?.score || 0} marks)</span>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Score Distribution */}
            <Card className="rounded-none border-muted">
              <CardHeader className="border-b border-muted pb-4 bg-muted/10">
                <CardTitle className="text-base font-bold">Score Distribution (%)</CardTitle>
              </CardHeader>
              <CardContent className="p-6 h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.distribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.1} />
                    <XAxis dataKey="range" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                    <RechartsTooltip 
                      cursor={{ fill: 'currentColor', opacity: 0.1 }}
                      contentStyle={{ borderRadius: 0, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--foreground)' }}
                    />
                    <Bar dataKey="count" fill="var(--primary)" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Department Breakdown */}
            <Card className="rounded-none border-muted">
              <CardHeader className="border-b border-muted pb-4 bg-muted/10">
                <CardTitle className="text-base font-bold">Average Score by Department</CardTitle>
              </CardHeader>
              <CardContent className="p-6 h-[300px] flex items-center justify-center">
                {analytics.departmentBreakdown.length > 0 ? (
                   <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={analytics.departmentBreakdown} layout="vertical" margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                     <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="currentColor" opacity={0.1} />
                     <XAxis type="number" domain={[0, analytics.totalMarks]} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                     <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                     <RechartsTooltip 
                       cursor={{ fill: 'currentColor', opacity: 0.1 }}
                       contentStyle={{ borderRadius: 0, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--foreground)' }}
                       formatter={(value: any) => [`${value} / ${analytics.totalMarks}`, 'Average Score']}
                     />
                     <Bar dataKey="averageScore" fill="#8b5cf6" radius={[0, 2, 2, 0]} barSize={24} />
                   </BarChart>
                 </ResponsiveContainer>
                ) : (
                  <div className="text-muted-foreground text-sm">No department data available.</div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Top Performers Table */}
          <Card className="rounded-none border-muted">
             <CardHeader className="border-b border-muted pb-4 bg-muted/10">
                <CardTitle className="text-base font-bold">Top 10 Performers</CardTitle>
              </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16 text-center">Rank</TableHead>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead className="text-right">Score</TableHead>
                    <TableHead className="text-right">Percentage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analytics.topPerformers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No submissions yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    analytics.topPerformers.map((student, idx) => (
                      <TableRow key={student.id}>
                        <TableCell className="text-center">
                          {idx === 0 ? <Badge className="bg-yellow-500">1st</Badge> : 
                           idx === 1 ? <Badge className="bg-gray-400">2nd</Badge> : 
                           idx === 2 ? <Badge className="bg-amber-700">3rd</Badge> : 
                           <span className="text-muted-foreground font-medium">{idx + 1}</span>}
                        </TableCell>
                        <TableCell className="font-medium">{student.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{student.department}</TableCell>
                        <TableCell className="text-right font-bold">{student.score} <span className="text-xs font-normal text-muted-foreground">/ {analytics.totalMarks}</span></TableCell>
                        <TableCell className="text-right">
                          <span className={`font-medium ${student.percentage >= 80 ? 'text-green-500' : student.percentage >= 40 ? 'text-blue-500' : 'text-red-500'}`}>
                            {student.percentage}%
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

        </div>
      )}
    </div>
  );
}
