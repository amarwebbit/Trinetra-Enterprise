'use client';

import React, { useState, useTransition } from 'react';
import { formatDateForHydration } from '@/lib/utils/date';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { copyToClipboard } from '@/lib/utils/clipboard';
import { deleteExam, duplicateExam } from '@/app/actions/exam-actions';
import { 
  FileText, Play, CheckCircle, CalendarDays, Clock, 
  Search, Plus, MoreVertical, Edit2, Copy, Trash2, FileOutput, Users
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Eye, Link as LinkIcon } from 'lucide-react';

interface ExamListUIProps {
  exams: any[];
  total: number;
  page: number;
  pageSize: number;
  currentFilter: string;
  counts: Record<string, number>;
  filters: any;
}

export default function ExamListUI({
  exams,
  total,
  page,
  pageSize,
  currentFilter,
  counts,
  filters,
}: ExamListUIProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [searchQuery, setSearchQuery] = useState(filters.search || '');

  const handleCopyInviteLink = async (examId: string) => {
    try {
      const response = await fetch('/api/teacher/exams/invite/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examId }),
      });
      const resData = await response.json();
      const inviteUrl = resData.inviteUrl || resData.data?.inviteUrl;
      if (resData.success && inviteUrl) {
        const success = await copyToClipboard(inviteUrl);
        if (success) {
          toast.success('Live Exam invite link copied to clipboard!');
        } else {
          toast.error('Failed to copy invite link to clipboard');
        }
      } else {
        toast.error(resData.error || 'Failed to generate invite link');
      }
    } catch (e) {
      toast.error('Failed to copy invite link');
    }
  };

  const handleFilterChange = (status: string) => {
    const params = new URLSearchParams(window.location.search);
    if (status !== 'all') {
      params.set('status', status);
    } else {
      params.delete('status');
    }
    params.delete('page'); // Reset to page 1
    router.push(`/teacher/exams?${params.toString()}`);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(window.location.search);
    if (searchQuery.trim()) {
      params.set('search', searchQuery.trim());
    } else {
      params.delete('search');
    }
    params.delete('page');
    router.push(`/teacher/exams?${params.toString()}`);
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(window.location.search);
    params.set('page', newPage.toString());
    router.push(`/teacher/exams?${params.toString()}`);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this exam?')) {
      startTransition(async () => {
        try {
          await deleteExam(id);
          toast.success('Exam deleted');
        } catch (e: any) {
          toast.error(e.message || 'Failed to delete');
        }
      });
    }
  };

  const handleDuplicate = (id: string) => {
    startTransition(async () => {
      try {
        await duplicateExam(id);
        toast.success('Exam duplicated');
        router.refresh();
      } catch (e: any) {
        toast.error(e.message || 'Failed to duplicate');
      }
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft': return <Badge variant="secondary" className="bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-none"><FileText className="w-3 h-3 mr-1"/> Draft</Badge>;
      case 'published': return <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-none"><CheckCircle className="w-3 h-3 mr-1"/> Published</Badge>;
      case 'ongoing': return <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border border-green-200 dark:border-green-800 rounded-none animate-pulse"><Play className="w-3 h-3 mr-1"/> Ongoing</Badge>;
      case 'upcoming': return <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-none"><CalendarDays className="w-3 h-3 mr-1"/> Upcoming</Badge>;
      case 'completed': return <Badge variant="secondary" className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-none"><CheckCircle className="w-3 h-3 mr-1"/> Completed</Badge>;
      default: return <Badge variant="outline" className="rounded-none">{status}</Badge>;
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  const tabs = [
    { id: 'all', label: 'All', count: counts.all, icon: <FileText className="w-4 h-4" /> },
    { id: 'draft', label: 'Draft', count: counts.draft, icon: <FileText className="w-4 h-4" /> },
    { id: 'published', label: 'Published', count: counts.published, icon: <CheckCircle className="w-4 h-4" /> },
    { id: 'ongoing', label: 'Ongoing', count: counts.ongoing, icon: <Play className="w-4 h-4" /> },
    { id: 'upcoming', label: 'Upcoming', count: counts.upcoming, icon: <CalendarDays className="w-4 h-4" /> },
    { id: 'completed', label: 'Completed', count: counts.completed, icon: <CheckCircle className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6">
      
      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <form onSubmit={handleSearch} className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search exams..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 rounded-none border-muted focus-visible:ring-1 focus-visible:ring-primary"
            />
          </div>
          <Button type="submit" variant="secondary" className="rounded-none">Search</Button>
        </form>
        
        <Button onClick={() => router.push('/teacher/exams/create')} className="rounded-none w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" /> Create New Exam
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto border-b border-muted pb-[1px] scrollbar-none">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => handleFilterChange(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              (currentFilter === tab.id || (!currentFilter && tab.id === 'all'))
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted'
            }`}
          >
            {tab.icon}
            {tab.label}
            <span className={`ml-1.5 px-2 py-0.5 text-xs rounded-full ${
              (currentFilter === tab.id || (!currentFilter && tab.id === 'all'))
                ? 'bg-primary/10 text-primary' 
                : 'bg-muted text-muted-foreground'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Exam List */}
      <div className="grid grid-cols-1 gap-4">
        {exams.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-muted">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground opacity-50 mb-4" />
            <h3 className="text-lg font-medium text-foreground">No exams found</h3>
            <p className="text-muted-foreground mt-1 text-sm">
              Try adjusting your filters or create a new exam.
            </p>
          </div>
        ) : (
          exams.map((exam: any) => (
            <Card key={exam.id} className="rounded-none border-muted hover:border-muted-foreground/30 transition-colors">
              <div className="flex flex-col sm:flex-row">
                <div className="flex-1 p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-foreground mb-1 flex items-center gap-3">
                        {exam.title}
                        {getStatusBadge(exam.status)}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1.5"><CalendarDays className="w-4 h-4"/> {formatDateForHydration(exam.start_time)}</span>
                        <span className="flex items-center gap-1.5"><Clock className="w-4 h-4"/> {exam.duration_minutes} mins</span>
                      </div>
                    </div>
                    
                    {/* Action Dropdown for mobile or clean look */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="rounded-none absolute top-4 right-4 sm:relative sm:top-auto sm:right-auto">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-none">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />

                        {exam.exam_type !== 'assignment' && (
                          <DropdownMenuItem className="cursor-pointer text-blue-700 dark:text-blue-400 font-semibold" onClick={() => handleCopyInviteLink(exam.id)}>
                            <LinkIcon className="w-4 h-4 mr-2" /> Copy Live Invite Link
                          </DropdownMenuItem>
                        )}

                        {exam.status === 'completed' && (
                          <DropdownMenuItem className="cursor-pointer" onClick={() => router.push(`/teacher/results/${exam.id}`)}>
                            <FileOutput className="w-4 h-4 mr-2" /> View Results
                          </DropdownMenuItem>
                        )}
                        
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="cursor-pointer" onClick={() => handleDuplicate(exam.id)}>
                          <Copy className="w-4 h-4 mr-2" /> Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer text-red-600 focus:text-red-600" onClick={() => handleDelete(exam.id)}>
                          <Trash2 className="w-4 h-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  
                  <div className="flex items-center gap-6 pt-4 border-t border-muted/50 text-sm">
                    <div className="flex flex-col">
                      <span className="text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-1">Submissions</span>
                      <span className="font-medium flex items-center gap-2"><Users className="w-4 h-4 text-muted-foreground"/> {exam._count?.exam_attempts || 0}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-1">Sections</span>
                      <span className="font-medium">{exam._count?.exam_sections || 0}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-1">Pattern</span>
                      <span className="font-medium capitalize">{exam.pattern}</span>
                    </div>
                  </div>
                </div>
                
                {/* Desktop Quick Actions Sidebar */}
                <div className="hidden sm:flex flex-col border-l border-muted bg-muted/10 p-4 gap-2 w-48 justify-center">
                  {/* Copy Invite Link for Live Exams ONLY */}
                  {exam.exam_type !== 'assignment' && (
                    <Button 
                      variant="outline" 
                      className="rounded-none w-full justify-start border-blue-300 bg-blue-50 text-blue-900 hover:bg-blue-100 font-semibold text-xs" 
                      onClick={() => handleCopyInviteLink(exam.id)}
                    >
                      <LinkIcon className="w-3.5 h-3.5 mr-1.5 text-blue-700" /> Copy Live Link
                    </Button>
                  )}

                  {exam.status === 'completed' && (
                    <Button className="rounded-none w-full justify-start bg-primary text-primary-foreground text-xs" onClick={() => router.push(`/teacher/results/${exam.id}`)}>
                      <FileOutput className="w-3.5 h-3.5 mr-1.5" /> Results
                    </Button>
                  )}
                  
                  <Button variant="ghost" className="rounded-none w-full justify-start text-muted-foreground text-xs" onClick={() => handleDuplicate(exam.id)} disabled={isPending}>
                    <Copy className="w-3.5 h-3.5 mr-1.5" /> Duplicate
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 pt-4 border-t border-muted">
          <Button 
            variant="outline" 
            className="rounded-none" 
            onClick={() => handlePageChange(page - 1)}
            disabled={page <= 1}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button 
            variant="outline" 
            className="rounded-none" 
            onClick={() => handlePageChange(page + 1)}
            disabled={page >= totalPages}
          >
            Next
          </Button>
        </div>
      )}
      
    </div>
  );
}
