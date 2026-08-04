'use client';

import React, { useState, useCallback, useTransition } from 'react';
import { formatDateForHydration } from '@/lib/utils/date';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  Search, MoreHorizontal, BookOpen, Clock, Calendar, CheckCircle2, 
  Trash2, FileCheck, CheckCircle, XCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';

import { 
  publishExam, unpublishExam, deleteExam
} from '@/app/actions/exam-actions';

type ExamData = {
  id: string;
  title: string;
  exam_type: string;
  is_published: boolean;
  start_time: string;
  end_time: string;
  computedStatus: string;
  teacher: { name: string };
  metrics: { totalQuestions: number; attempts: number };
};

type ExamsUIProps = {
  exams: ExamData[];
  total: number;
  page: number;
  pageSize: number;
  pendingQuestionBanks?: number;
  examTypes: string[];
  filters: Record<string, string | undefined>;
};

export default function ExamsUI({ 
  exams, total, page, pageSize, pendingQuestionBanks, examTypes, filters 
}: ExamsUIProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // URL State Updates
  const updateQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== 'all') {
        params.set(name, value);
      } else {
        params.delete(name);
      }
      if (name !== 'page') {
        params.set('page', '1');
      }
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [searchParams, pathname, router]
  );

  // Actions
  const handleTogglePublish = async (examId: string, isPublished: boolean) => {
    try {
      if (isPublished) {
        await unpublishExam(examId);
        toast.success("Exam unpublished and reverted to Draft.");
      } else {
        await publishExam(examId);
        toast.success("Exam published successfully.");
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to update exam status");
    }
  };

  const handleDelete = async (examId: string) => {
    if (!confirm("Are you sure you want to delete this exam? This action cannot be undone.")) return;
    try {
      await deleteExam(examId);
      toast.success("Exam deleted successfully");
    } catch (e: any) {
      toast.error(e.message || "Failed to delete exam");
    }
  };

  // Status Badge Helper
  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'Ongoing': return <Badge className="bg-green-500 hover:bg-green-600">Ongoing</Badge>;
      case 'Upcoming': return <Badge className="bg-blue-500 hover:bg-blue-600">Upcoming</Badge>;
      case 'Completed': return <Badge variant="secondary">Completed</Badge>;
      case 'Draft': return <Badge variant="outline" className="text-muted-foreground border-muted-foreground">Draft</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  // Tabs for status
  const tabs = ['all', 'ongoing', 'upcoming', 'completed', 'draft'];
  const currentTab = filters.status || 'all';

  return (
    <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
      
      {/* Top Bar: Search & Actions */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search exams by title..." 
            className="pl-8 rounded-none border-muted"
            defaultValue={filters.search || ''}
            onChange={(e) => {
              const val = e.target.value;
              setTimeout(() => updateQueryString('search', val), 500);
            }}
          />
        </div>
      </div>

      {/* Tabs & Filters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-muted pb-2 gap-4">
        <div className="flex gap-6 overflow-x-auto pb-1 w-full md:w-auto">
          {tabs.map(tab => (
            <button 
              key={tab}
              onClick={() => updateQueryString('status', tab)}
              className={`text-sm font-medium capitalize pb-2 border-b-2 whitespace-nowrap transition-colors ${currentTab === tab ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex gap-2 w-full md:w-auto shrink-0">
          <select 
            className="text-sm bg-background border-muted border px-2 py-1.5 focus:outline-none w-full md:w-auto"
            value={filters.type || 'all'}
            onChange={(e) => updateQueryString('type', e.target.value)}
          >
            <option value="all">All Types</option>
            {examTypes.map(type => (
              <option key={type} value={type} className="capitalize">{type}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Data Table */}
      <Card className="rounded-none border-muted">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Exam Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Teacher</TableHead>
                <TableHead>Timeline</TableHead>
                <TableHead>Metrics</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {exams.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No exams found matching your criteria.
                  </TableCell>
                </TableRow>
              ) : (
                exams.map((exam) => (
                  <TableRow key={exam.id}>
                    <TableCell>
                      <div className="font-medium text-foreground">{exam.title}</div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">{exam.exam_type}</div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(exam.computedStatus)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {exam.teacher.name}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      <div className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {formatDateForHydration(exam.start_time)}</div>
                      <div className="flex items-center gap-1 mt-1"><Clock className="h-3 w-3" /> {new Date(exam.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs text-muted-foreground flex flex-col gap-0.5">
                        <span>{exam.metrics.totalQuestions} Questions</span>
                        <span>{exam.metrics.attempts} Attempts</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-none">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem 
                            onClick={() => handleTogglePublish(exam.id, exam.is_published)}
                          >
                            {exam.is_published ? (
                              <><XCircle className="mr-2 h-4 w-4" /> Unpublish (Draft)</>
                            ) : (
                              <><CheckCircle className="mr-2 h-4 w-4" /> Publish Exam</>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleDelete(exam.id)}
                            className="text-red-500 focus:text-red-500"
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Delete Exam
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination Controls */}
      {total > pageSize && (
        <div className="flex justify-between items-center mt-4 text-sm text-muted-foreground">
          <div>
            Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, total)} of {total} entries
          </div>
          <div className="flex gap-1">
            <Button 
              variant="outline" 
              size="sm" 
              className="rounded-none h-8"
              disabled={page <= 1}
              onClick={() => updateQueryString('page', String(page - 1))}
            >
              Previous
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="rounded-none h-8"
              disabled={page * pageSize >= total}
              onClick={() => updateQueryString('page', String(page + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      )}

    </div>
  );
}
