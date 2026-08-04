'use client';

import React, { useTransition } from 'react';
import { formatDateForHydration } from '@/lib/utils/date';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { publishResults, publishAllResults } from '@/app/actions/teacher-actions';
import { 
  FileText, 
  Activity, 
  Users, 
  AlertCircle, 
  FileEdit, 
  BookOpen, 
  BarChart, 
  Download,
  Send,
  CheckCircle2,
  Clock,
  ArrowRight
} from 'lucide-react';

interface TeacherUIProps {
  stats: {
    totalExams: number;
    activeExams: number;
    totalStudents: number;
    pendingResults: number;
  };
  readyToPublishExams: Array<{
    id: string;
    title: string;
    end_time: Date;
    _count: { exam_attempts: number };
  }>;
  recentExams: Array<{
    id: string;
    title: string;
    is_active: boolean;
    created_at: Date;
    _count: { exam_attempts: number };
  }>;
  teacherName: string;
}

export default function TeacherUI({
  stats,
  readyToPublishExams,
  recentExams,
  teacherName
}: TeacherUIProps) {
  const [isPending, startTransition] = useTransition();

  const handlePublish = (examId: string) => {
    startTransition(async () => {
      try {
        await publishResults(examId);
        toast.success('Results published successfully!');
      } catch (error: any) {
        toast.error(error.message || 'Failed to publish results');
      }
    });
  };

  const handlePublishAll = () => {
    startTransition(async () => {
      try {
        const res = await publishAllResults();
        if (res.count > 0) {
          toast.success(`Successfully published ${res.count} exams!`);
        } else {
          toast.info('No exams pending to publish.');
        }
      } catch (error: any) {
        toast.error(error.message || 'Failed to publish all results');
      }
    });
  };

  const quickActions = [
    { label: 'Create Exam', icon: FileEdit, href: '/teacher/exams/create', color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400' },
    { label: 'Question Bank', icon: BookOpen, href: '/teacher/questions', color: 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400' },
    { label: 'View Results', icon: BarChart, href: '/teacher/results', color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400' },
    { label: 'Import Questions', icon: Download, href: '/teacher/questions?action=import', color: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-300">
      
      {/* 1. Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="rounded-none bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/50 shadow-sm transition-all hover:shadow-md">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-1">Total Exams</p>
              <h3 className="text-3xl font-bold text-blue-900 dark:text-blue-100">{stats.totalExams}</h3>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-full">
              <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-none bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800/50 shadow-sm transition-all hover:shadow-md">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600 dark:text-green-400 mb-1">Active Exams</p>
              <h3 className="text-3xl font-bold text-green-900 dark:text-green-100">{stats.activeExams}</h3>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/50 rounded-full">
              <Activity className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-none bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800/50 shadow-sm transition-all hover:shadow-md">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600 dark:text-purple-400 mb-1">Total Students</p>
              <h3 className="text-3xl font-bold text-purple-900 dark:text-purple-100">{stats.totalStudents}</h3>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900/50 rounded-full">
              <Users className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-none bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800/50 shadow-sm transition-all hover:shadow-md">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-600 dark:text-orange-400 mb-1">Pending Results</p>
              <h3 className="text-3xl font-bold text-orange-900 dark:text-orange-100">{stats.pendingResults}</h3>
            </div>
            <div className="p-3 bg-orange-100 dark:bg-orange-900/50 rounded-full">
              <AlertCircle className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column (Wider) */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* 2. Ready To Publish Queue */}
          <Card className="rounded-none border-muted">
            <CardHeader className="bg-muted/10 border-b border-muted flex flex-row items-center justify-between py-4">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Send className="h-5 w-5 text-orange-500" /> 
                  Results Ready to Publish
                </CardTitle>
                <CardDescription>Exams that have ended but results are hidden.</CardDescription>
              </div>
              {readyToPublishExams.length > 1 && (
                <Button 
                  onClick={handlePublishAll} 
                  disabled={isPending}
                  className="rounded-none bg-orange-600 hover:bg-orange-700 text-white"
                >
                  Publish All ({readyToPublishExams.length})
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-0">
              {readyToPublishExams.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground flex flex-col items-center justify-center">
                  <CheckCircle2 className="h-10 w-10 text-green-500/50 mb-3" />
                  <p className="font-medium text-foreground">✅ No pending results to publish</p>
                  <p className="text-sm">All completed exams have their results published.</p>
                </div>
              ) : (
                <div className="divide-y divide-muted">
                  {readyToPublishExams.map((exam) => (
                    <div key={exam.id} className="p-4 flex items-center justify-between hover:bg-muted/5 transition-colors">
                      <div className="space-y-1">
                        <p className="font-semibold">{exam.title}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" /> Ended {formatDateForHydration(exam.end_time)}
                          </span>
                          <span>•</span>
                          <span>
                            {exam._count.exam_attempts === 0 ? '0 students attempted' : `${exam._count.exam_attempts} submissions`}
                          </span>
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="rounded-none border-orange-200 text-orange-700 hover:bg-orange-50 dark:border-orange-900/50 dark:text-orange-400 dark:hover:bg-orange-900/20"
                        onClick={() => handlePublish(exam.id)}
                        disabled={isPending}
                      >
                        Publish Now
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 3. Recent Exams */}
          <Card className="rounded-none border-muted">
            <CardHeader className="bg-muted/10 border-b border-muted flex flex-row items-center justify-between py-4">
              <div>
                <CardTitle className="text-lg">Recent Exams</CardTitle>
              </div>
              <Link href="/teacher/exams" className="text-sm text-primary hover:underline flex items-center">
                View all <ArrowRight className="h-3 w-3 ml-1" />
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              {recentExams.length === 0 ? (
                 <div className="p-8 text-center text-muted-foreground">
                  <p>No exams created yet.</p>
                  <Link href="/teacher/exams/create">
                    <Button variant="link" className="mt-2">Create your first exam</Button>
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-muted">
                  {recentExams.map((exam) => (
                    <div key={exam.id} className="p-4 flex items-center justify-between hover:bg-muted/5 transition-colors">
                      <div>
                        <p className="font-medium">{exam.title}</p>
                        <p className="text-xs text-muted-foreground">
                          Created {formatDateForHydration(exam.created_at)} • {exam._count.exam_attempts} attempts
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={`text-xs px-2 py-1 uppercase tracking-wider font-mono ${
                          exam.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-muted text-muted-foreground'
                        }`}>
                          {exam.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

        </div>

        {/* Right Column (Narrower) */}
        <div className="space-y-6">
          
          {/* 4. Quick Actions */}
          <Card className="rounded-none border-muted">
            <CardHeader className="bg-muted/10 border-b border-muted">
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 gap-3">
                {quickActions.map((action, idx) => (
                  <Link key={idx} href={action.href}>
                    <div className="flex items-center gap-4 p-3 border border-muted hover:border-primary/50 hover:bg-muted/10 transition-all cursor-pointer group">
                      <div className={`p-2 rounded-none ${action.color}`}>
                        <action.icon className="h-5 w-5" />
                      </div>
                      <span className="font-medium group-hover:text-primary transition-colors">{action.label}</span>
                      <ArrowRight className="h-4 w-4 ml-auto text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-1" />
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>

        </div>

      </div>
    </div>
  );
}
