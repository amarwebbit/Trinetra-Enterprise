'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { 
  Send, XCircle, Eye, FileText, Mail, 
  MessageSquare, Smartphone, Bell, History
} from 'lucide-react';

export default function NotificationsUI({
  notifications,
  stats,
  courses,
  departments,
  templates
}: any) {
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  
  // Form State
  const [recipientType, setRecipientType] = useState('all');
  const [targetId, setTargetId] = useState('');
  const [channel, setChannel] = useState('app');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const handleSendNotification = async () => {
    if (!message.trim() || !subject.trim()) {
      toast.error('Subject and message are required');
      return;
    }

    if (recipientType !== 'all' && !targetId) {
      toast.error('Please select a specific target');
      return;
    }

    setIsSending(true);
    try {
      const res = await fetch('/api/admin/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientType,
          targetId,
          channel,
          subject,
          message,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const count = data.recipientCount || 0;
        toast.success(count > 0 ? `Notification sent to ${count} student${count > 1 ? 's' : ''}!` : 'No matching recipients found');
        setIsSendModalOpen(false);
        setSubject('');
        setMessage('');
      } else {
        const error = await res.json();
        toast.error(error.error || error.message || 'Failed to send notifications');
      }
    } catch (e) {
      toast.error('An error occurred while sending');
    } finally {
      setIsSending(false);
    }
  };

  const getChannelIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'email': return <Mail size={16} className="text-blue-500" />;
      case 'sms': return <Smartphone size={16} className="text-green-500" />;
      case 'whatsapp': return <MessageSquare size={16} className="text-emerald-500" />;
      default: return <Bell size={16} className="text-purple-500" />;
    }
  };

  return (
    <div className="p-6 space-y-8">
      {/* ===== HEADER ===== */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground mt-1">
            Manage and send communications to students and staff
          </p>
        </div>
        
        <Dialog open={isSendModalOpen} onOpenChange={setIsSendModalOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              <Send size={16} className="mr-2" />
              New Notification
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Send New Notification</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Recipient Group</label>
                  <Select value={recipientType} onValueChange={setRecipientType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Students</SelectItem>
                      <SelectItem value="department">By Department</SelectItem>
                      <SelectItem value="course">By Course</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {recipientType === 'department' && (
                  <div>
                    <label className="text-sm font-medium mb-1 block">Select Department</label>
                    <Select value={targetId} onValueChange={setTargetId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map((d: any) => (
                          <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {recipientType === 'course' && (
                  <div>
                    <label className="text-sm font-medium mb-1 block">Select Course</label>
                    <Select value={targetId} onValueChange={setTargetId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        {courses.map((c: any) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium mb-1 block">Channel</label>
                  <Select value={channel} onValueChange={setChannel}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="app">In-App Push</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-1 block">Subject / Title</label>
                <Input 
                  placeholder="Important update regarding exams"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Message Body</label>
                <Textarea 
                  placeholder="Type your message here..."
                  rows={6}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>
              
              <Button 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white mt-4" 
                onClick={handleSendNotification}
                disabled={isSending}
              >
                {isSending ? 'Sending...' : 'Send Notification'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* ===== STATS CARDS ===== */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6 flex items-center space-x-4">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-600 dark:text-blue-400">
            <Send size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Total Sent</p>
            <h3 className="text-2xl font-bold">{stats.sent}</h3>
          </div>
        </Card>
        
        <Card className="p-6 flex items-center space-x-4">
          <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full text-red-600 dark:text-red-400">
            <XCircle size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Failed Delivery</p>
            <h3 className="text-2xl font-bold">{stats.failed}</h3>
          </div>
        </Card>

        <Card className="p-6 flex items-center space-x-4">
          <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full text-green-600 dark:text-green-400">
            <Eye size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Opened / Read</p>
            <h3 className="text-2xl font-bold">{stats.read}</h3>
          </div>
        </Card>

        <Card className="p-6 flex items-center space-x-4">
          <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full text-purple-600 dark:text-purple-400">
            <FileText size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Saved Templates</p>
            <h3 className="text-2xl font-bold">{stats.templateCount}</h3>
          </div>
        </Card>
      </div>

      {/* ===== HISTORY TABLE ===== */}
      <Card className="p-6">
        <div className="flex items-center gap-2 border-b pb-4 mb-4">
          <History className="text-gray-500" />
          <h2 className="text-xl font-semibold">Notification History</h2>
        </div>
        
        {notifications.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No notifications sent yet.
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notifications.map((notif: any) => (
                  <TableRow key={notif.id}>
                    <TableCell>
                      {notif.created_at ? new Date(notif.created_at).toLocaleString() : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getChannelIcon(notif.channel || 'in_app')}
                        <span className="capitalize">{notif.channel || 'In App'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{notif.users?.full_name || 'Unknown'}</div>
                      <div className="text-xs text-muted-foreground">{notif.users?.email || ''}</div>
                    </TableCell>
                    <TableCell>
                      {notif.title}
                    </TableCell>
                    <TableCell>
                      {notif.is_sent ? (
                        <Badge variant="secondary" className="bg-green-100 text-green-700">Sent</Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-red-100 text-red-700">Failed</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}
