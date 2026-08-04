'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mail, CheckCircle2, XCircle, Calendar, Send, Clock, ChevronLeft, ChevronRight, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { sendGlobalNotification, retryNotification } from '@/app/actions/notification-actions';

interface NotificationsUIProps {
  adminsCount: number;
  tenants: { id: string; name: string }[];
  history: any[];
  totalHistory: number;
  page: number;
  pageSize: number;
  stats: {
    total: number;
    sent: number;
    failed: number;
    lastSevenDays: number;
  };
  templates: { id: string; name: string; subject: string; message: string }[];
}

export default function NotificationsUI({
  adminsCount,
  tenants,
  history,
  totalHistory,
  page,
  pageSize,
  stats,
  templates
}: NotificationsUIProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isSending, setIsSending] = useState(false);
  
  // Form state
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [channel, setChannel] = useState('email');
  const [recipientType, setRecipientType] = useState('all');
  const [selectedTenant, setSelectedTenant] = useState('all');
  const [scheduleType, setScheduleType] = useState('now');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');

  const totalPages = Math.ceil(totalHistory / pageSize);

  const handlePageChange = (newPage: number) => {
    startTransition(() => {
      router.push(`/super/notifications?page=${newPage}`);
    });
  };

  const handleApplyTemplate = (templateId: string) => {
    const tmpl = templates.find(t => t.id === templateId);
    if (tmpl) {
      setSubject(tmpl.subject);
      setMessage(tmpl.message);
      toast.success(`Applied template: ${tmpl.name}`);
    }
  };

  const handleSend = async () => {
    if (!subject.trim() || !message.trim()) {
      toast.error('Subject and message are required.');
      return;
    }

    let finalScheduleDate: Date | undefined = undefined;
    if (scheduleType === 'later') {
      if (!scheduleDate || !scheduleTime) {
        toast.error('Please select both date and time for scheduled notifications.');
        return;
      }
      finalScheduleDate = new Date(`${scheduleDate}T${scheduleTime}`);
      if (finalScheduleDate < new Date()) {
        toast.error('Scheduled time must be in the future.');
        return;
      }
    }

    setIsSending(true);
    try {
      const tenantIds = recipientType === 'specific' && selectedTenant !== 'all' 
        ? [selectedTenant] 
        : undefined;

      const result = await sendGlobalNotification({
        subject,
        message,
        channel,
        tenantIds,
        scheduleDate: finalScheduleDate,
      });

      if (result.success) {
        toast.success(`Notification successfully ${scheduleType === 'later' ? 'scheduled' : 'sent'} to ${result.recipientCount} recipients!`);
        // Reset form
        setSubject('');
        setMessage('');
        setScheduleType('now');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to send notification');
    } finally {
      setIsSending(false);
    }
  };

  const handleRetry = async (id: string) => {
    startTransition(async () => {
      try {
        const result = await retryNotification(id);
        if (result.success) {
          toast.success('Notification retry successful');
        }
      } catch (error: any) {
        toast.error(error.message || 'Failed to retry notification');
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Global Notifications</h1>
          <p className="text-sm text-slate-500 mt-1">
            Send announcements to tenant admins and monitor delivery history.
          </p>
        </div>
        <Button variant="outline" onClick={() => router.refresh()} className="flex items-center gap-2">
          Refresh Data
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-900/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center gap-2">
              <Mail className="w-4 h-4" /> Total Sent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-blue-700 dark:text-blue-300">
              {stats.total.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card className="border border-green-200 dark:border-green-900 bg-green-50/50 dark:bg-green-900/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-green-600 dark:text-green-400 uppercase tracking-wider flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> Successful
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-green-700 dark:text-green-300">
              {stats.sent.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card className="border border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-900/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider flex items-center gap-2">
              <XCircle className="w-4 h-4" /> Failed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-red-700 dark:text-red-300">
              {stats.failed.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card className="border border-purple-200 dark:border-purple-900 bg-purple-50/50 dark:bg-purple-900/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Last 7 Days
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-purple-700 dark:text-purple-300">
              {stats.lastSevenDays.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Left Column: Form & Templates */}
        <div className="xl:col-span-1 space-y-6">
          
          <Card className="border border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Templates</CardTitle>
              <CardDescription>Quickly pre-fill announcements</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {templates.map(t => (
                  <Button 
                    key={t.id} 
                    variant="secondary" 
                    size="sm"
                    className="text-xs"
                    onClick={() => handleApplyTemplate(t.id)}
                  >
                    {t.name}
                  </Button>
                ))}
                <Button 
                  variant="outline" 
                  size="sm"
                  className="text-xs border-dashed"
                  onClick={() => { setSubject(''); setMessage(''); }}
                >
                  Clear Fields
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-slate-200 dark:border-slate-800 shadow-md">
            <CardHeader className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Send className="w-5 h-5 text-blue-500" /> Send New Notification
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Subject</label>
                <Input 
                  placeholder="e.g., Scheduled Maintenance" 
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Message Body</label>
                <Textarea 
                  placeholder="Dear Admins..." 
                  className="min-h-[160px] font-mono text-sm"
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Recipients</label>
                  <Select value={recipientType} onValueChange={setRecipientType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Admins ({adminsCount})</SelectItem>
                      <SelectItem value="specific">Specific Tenant</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Channel</label>
                  <Select value={channel} onValueChange={setChannel}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="app">In-App</SelectItem>
                      <SelectItem value="both">Both</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {recipientType === 'specific' && (
                <div className="space-y-1.5 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Select Tenant</label>
                  <Select value={selectedTenant} onValueChange={setSelectedTenant}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Tenants</SelectItem>
                      {tenants.map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Schedule</label>
                <Select value={scheduleType} onValueChange={setScheduleType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="now">Send Immediately</SelectItem>
                    <SelectItem value="later">Schedule for Later</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {scheduleType === 'later' && (
                <div className="grid grid-cols-2 gap-4 p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-900">
                  <div>
                    <label className="text-xs font-semibold text-blue-600 dark:text-blue-400 block mb-1">Date</label>
                    <Input type="date" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} className="h-8 text-xs" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-blue-600 dark:text-blue-400 block mb-1">Time</label>
                    <Input type="time" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)} className="h-8 text-xs" />
                  </div>
                </div>
              )}

            </CardContent>
            <CardFooter className="bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 p-4">
              <Button 
                className="w-full font-bold" 
                onClick={handleSend}
                disabled={isSending || isPending}
              >
                {isSending ? (
                  <span className="flex items-center"><Clock className="w-4 h-4 mr-2 animate-spin" /> Processing...</span>
                ) : scheduleType === 'later' ? (
                  <span className="flex items-center"><Clock className="w-4 h-4 mr-2" /> Schedule Notification</span>
                ) : (
                  <span className="flex items-center"><Send className="w-4 h-4 mr-2" /> Send Notification Now</span>
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* Right Column: History Table */}
        <div className="xl:col-span-2">
          <Card className="border border-slate-200 dark:border-slate-800 h-full flex flex-col">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-slate-500" /> Notification History
              </CardTitle>
              <CardDescription>Recently sent and scheduled notifications</CardDescription>
            </CardHeader>
            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                    <th className="px-5 py-3 font-semibold text-slate-700 dark:text-slate-300">Timestamp</th>
                    <th className="px-5 py-3 font-semibold text-slate-700 dark:text-slate-300">Subject</th>
                    <th className="px-5 py-3 font-semibold text-slate-700 dark:text-slate-300">Recipient</th>
                    <th className="px-5 py-3 font-semibold text-slate-700 dark:text-slate-300">Channel</th>
                    <th className="px-5 py-3 font-semibold text-slate-700 dark:text-slate-300">Status</th>
                    <th className="px-5 py-3 font-semibold text-slate-700 dark:text-slate-300 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {history.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-12 text-center text-slate-500">
                        No notifications found.
                      </td>
                    </tr>
                  ) : (
                    history.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                        <td className="px-5 py-4 whitespace-nowrap text-xs text-slate-500 font-medium">
                          {new Date(item.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-medium text-slate-900 dark:text-white max-w-[200px] truncate" title={item.title}>
                            {item.title}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="text-xs text-slate-700 dark:text-slate-300">
                            {item.users?.full_name || item.users?.email || 'Unknown'}
                          </div>
                          {item.tenants?.name && (
                            <div className="text-[10px] text-slate-500">{item.tenants.name}</div>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <Badge variant="outline" className="text-[10px] uppercase font-mono">
                            {item.channel}
                          </Badge>
                        </td>
                        <td className="px-5 py-4">
                          {item.is_sent ? (
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800">
                              <CheckCircle2 className="w-3 h-3 mr-1" /> Sent
                            </Badge>
                          ) : item.error_message ? (
                            <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800">
                              <XCircle className="w-3 h-3 mr-1" /> Failed
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800">
                              <Clock className="w-3 h-3 mr-1" /> Pending
                            </Badge>
                          )}
                        </td>
                        <td className="px-5 py-4 text-right">
                          {!item.is_sent && item.error_message && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-7 text-xs"
                              onClick={() => handleRetry(item.id)}
                              disabled={isPending}
                            >
                              Retry
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50 mt-auto">
                <div className="text-xs text-slate-500 font-medium">
                  Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, totalHistory)} of {totalHistory}
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8 text-xs"
                    disabled={page <= 1 || isPending}
                    onClick={() => handlePageChange(page - 1)}
                  >
                    <ChevronLeft className="w-3 h-3 mr-1" /> Prev
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8 text-xs"
                    disabled={page >= totalPages || isPending}
                    onClick={() => handlePageChange(page + 1)}
                  >
                    Next <ChevronRight className="w-3 h-3 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
