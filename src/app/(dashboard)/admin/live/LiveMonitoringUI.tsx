'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  AlertTriangle, CheckCircle2, AlertCircle, XCircle, 
  MessageSquare, MonitorOff, StopCircle, BellRing, Clock
} from 'lucide-react';
import { toast } from 'sonner';

import { forceSubmit, endExam, sendMessage, adjustAttemptTime } from '@/app/actions/live-actions';

type ExamOpt = {
  id: string;
  title: string;
};

type Flag = {
  type: string;
  severity: string;
  timestamp: string;
};

type StudentAttempt = {
  id: string;
  status: string;
  student: {
    id: string;
    name: string;
    email: string;
  };
  progress: number;
  flags: Flag[];
};

type ProctoringLog = {
  id: string;
  event_type: string;
  severity: string;
  timestamp: string;
  details: any;
  studentName: string;
};

type LiveMonitoringUIProps = {
  activeExams: ExamOpt[];
  selectedExamId: string | null;
  activeStudents: StudentAttempt[];
  proctoringLogs: ProctoringLog[];
};

export default function LiveMonitoringUI({
  activeExams,
  selectedExamId,
  activeStudents,
  proctoringLogs
}: LiveMonitoringUIProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [messageText, setMessageText] = useState('');

  // Auto-refresh polling every 10 seconds
  useEffect(() => {
    if (!selectedExamId) return;
    const interval = setInterval(() => {
      router.refresh();
    }, 10000);
    return () => clearInterval(interval);
  }, [selectedExamId, router]);

  // Actions
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

  const handleForceSubmit = async (attemptId: string, studentName: string) => {
    if (!confirm(`Are you sure you want to force submit the exam for ${studentName}?`)) return;
    try {
      await forceSubmit(attemptId);
      toast.success(`Exam submitted for ${studentName}`);
    } catch (e: any) {
      toast.error(e.message || "Failed to force submit");
    }
  };

  const handleAdjustTime = async (studentId: string, studentName: string) => {
    const amountStr = prompt(`Enter number of minutes to add or subtract for ${studentName} (e.g., 10 to add, -5 to subtract):`);
    if (amountStr === null) return;
    
    const minutes = parseInt(amountStr);
    if (isNaN(minutes) || minutes === 0) {
      toast.error('Please enter a valid non-zero number of minutes');
      return;
    }

    try {
      const result = await adjustAttemptTime(studentId, minutes);
      if (result?.success) {
        toast.success(`Adjusted ${studentName}'s exam time by ${minutes} minutes successfully.`);
      } else {
        toast.error('Failed to adjust exam time');
      }
    } catch (error: any) {
      console.error('Adjust time error:', error);
      toast.error(error.message || 'Failed to adjust exam time');
    }
  };

  const handleEndExam = async () => {
    if (!selectedExamId) return;
    if (!confirm("CRITICAL WARNING: This will immediately end the exam for ALL students. Are you absolutely sure?")) return;
    try {
      await endExam(selectedExamId);
      toast.success("Exam has been globally ended.");
    } catch (e: any) {
      toast.error(e.message || "Failed to end exam");
    }
  };

  const handleSendMessage = async () => {
    if (!selectedExamId || !messageText.trim()) return;
    try {
      const res = await sendMessage(selectedExamId, messageText);
      toast.success(`Announcement sent to ${res.count} active students.`);
      setMessageText('');
      setIsMessageModalOpen(false);
    } catch (e: any) {
      toast.error(e.message || "Failed to send message");
    }
  };

  // Flag rendering helpers
  const getSeverityColor = (severity: string) => {
    if (severity === 'high') return 'bg-red-500 text-white';
    if (severity === 'medium') return 'bg-yellow-500 text-white';
    return 'bg-blue-500 text-white';
  };

  const totalFlags = activeStudents.reduce((acc, student) => acc + student.flags.length, 0);

  if (activeExams.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-card border border-muted rounded-none shadow-sm mt-4">
        <MonitorOff className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold">No Active Exams</h3>
        <p className="text-muted-foreground text-sm mt-1">There are no exams currently running within their scheduled timeframes.</p>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in zoom-in-95 duration-200">
      
      {/* Top Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 p-4 bg-muted/20 border border-muted">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <label className="text-sm font-bold text-muted-foreground whitespace-nowrap">Monitor Exam:</label>
          <select 
            className="w-full md:w-80 bg-background border border-muted p-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            value={selectedExamId || ''}
            onChange={handleExamChange}
          >
            {activeExams.map(exam => (
              <option key={exam.id} value={exam.id}>{exam.title}</option>
            ))}
          </select>
        </div>
        
        {selectedExamId && (
          <div className="flex gap-2 w-full md:w-auto">
            <Button variant="outline" className="rounded-none w-full md:w-auto" onClick={() => setIsMessageModalOpen(true)}>
              <MessageSquare className="h-4 w-4 mr-2" /> Send Announcement
            </Button>
            <Button variant="destructive" className="rounded-none w-full md:w-auto" onClick={handleEndExam}>
              <StopCircle className="h-4 w-4 mr-2" /> End Exam Globally
            </Button>
          </div>
        )}
      </div>

      {!selectedExamId ? (
        <div className="text-center py-12 text-muted-foreground">Please select an exam to monitor.</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Main Grid: Students */}
          <div className="lg:col-span-3 space-y-4">
            
            {/* Stats Bar */}
            <div className="grid grid-cols-3 gap-4">
              <Card className="rounded-none border-muted bg-card">
                <CardContent className="p-4 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold">{activeStudents.length}</span>
                  <span className="text-xs uppercase font-bold tracking-wider text-muted-foreground mt-1">Active Students</span>
                </CardContent>
              </Card>
              <Card className="rounded-none border-muted bg-card">
                <CardContent className="p-4 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold text-yellow-500">{totalFlags}</span>
                  <span className="text-xs uppercase font-bold tracking-wider text-muted-foreground mt-1">Recent Flags</span>
                </CardContent>
              </Card>
              <Card className="rounded-none border-muted bg-card">
                <CardContent className="p-4 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold text-green-500">Live</span>
                  <span className="text-xs uppercase font-bold tracking-wider text-muted-foreground mt-1 text-center">Auto-sync active</span>
                </CardContent>
              </Card>
            </div>

            {/* Students Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeStudents.length === 0 ? (
                <div className="col-span-full text-center py-12 text-muted-foreground border border-dashed border-muted">
                  No students are currently taking this exam.
                </div>
              ) : (
                activeStudents.map(student => (
                  <Card key={student.id} className={`rounded-none border-l-4 ${student.flags.some(f => f.severity === 'high') ? 'border-l-red-500' : student.flags.some(f => f.severity === 'medium') ? 'border-l-yellow-500' : 'border-l-blue-500'}`}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-bold text-foreground">{student.student.name}</h4>
                          <span className="text-xs text-muted-foreground">{student.student.email}</span>
                        </div>
                        <div className="flex gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 px-2 text-xs text-orange-500 hover:text-orange-600 hover:bg-orange-500/10 rounded-none"
                            onClick={() => handleAdjustTime(student.id, student.student.name)}
                          >
                            <Clock className="w-3 h-3 mr-1" /> Adjust Time
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 px-2 text-xs text-red-500 hover:text-red-600 hover:bg-red-500/10 rounded-none"
                            onClick={() => handleForceSubmit(student.id, student.student.name)}
                          >
                            Force Submit
                          </Button>
                        </div>
                      </div>
                      
                      <div className="space-y-1.5 mb-4">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground font-medium">Progress</span>
                          <span className="font-bold">{student.progress}%</span>
                        </div>
                        <Progress value={student.progress} className="h-2 rounded-none" />
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {student.flags.length === 0 ? (
                          <Badge variant="outline" className="text-[10px] text-green-500 border-green-500/30 bg-green-500/10 font-normal">
                            <CheckCircle2 className="h-3 w-3 mr-1" /> Clear
                          </Badge>
                        ) : (
                          student.flags.map((flag, idx) => (
                            <Badge key={idx} className={`text-[10px] font-normal px-1.5 py-0 ${getSeverityColor(flag.severity)}`}>
                              {flag.type.replace(/_/g, ' ')}
                            </Badge>
                          ))
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>

          {/* Alert Sidebar */}
          <div className="lg:col-span-1">
            <Card className="rounded-none border-muted h-full flex flex-col max-h-[800px]">
              <CardHeader className="p-4 border-b border-muted bg-muted/10">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <BellRing className="h-4 w-4" /> Proctoring Alerts
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 overflow-y-auto flex-1">
                {proctoringLogs.length === 0 ? (
                  <div className="p-6 text-center text-xs text-muted-foreground">
                    No high-severity alerts in the last 5 minutes.
                  </div>
                ) : (
                  <div className="divide-y divide-muted">
                    {proctoringLogs.map(log => (
                      <div key={log.id} className="p-3 hover:bg-muted/10 transition-colors">
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-xs font-bold truncate pr-2">{log.studentName}</span>
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                            {new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Badge className={`text-[9px] px-1 py-0 uppercase tracking-wider ${getSeverityColor(log.severity)}`}>
                            {log.severity}
                          </Badge>
                          <span className="text-xs text-muted-foreground capitalize">
                            {log.event_type.replace(/_/g, ' ')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Send Message Modal */}
      {isMessageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <Card className="w-full max-w-md border border-muted bg-card rounded-none shadow-2xl animate-in fade-in zoom-in-95">
            <div className="p-6">
              <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
                <MessageSquare className="h-5 w-5 text-primary" /> Global Announcement
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                This message will appear on the screens of all {activeStudents.length} active students currently taking this exam.
              </p>
              
              <textarea 
                className="w-full h-32 bg-background border border-muted p-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none mb-4"
                placeholder="e.g., 'You have 15 minutes remaining. Please double-check your answers.'"
                value={messageText}
                onChange={e => setMessageText(e.target.value)}
              />

              <div className="flex justify-end gap-2">
                <Button variant="outline" className="rounded-none" onClick={() => setIsMessageModalOpen(false)}>
                  Cancel
                </Button>
                <Button className="rounded-none" onClick={handleSendMessage} disabled={!messageText.trim()}>
                  Send Alert
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

    </div>
  );
}
