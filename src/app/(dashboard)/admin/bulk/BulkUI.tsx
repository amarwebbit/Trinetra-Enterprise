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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { 
  Users, HelpCircle, FileText, Clock, Upload, 
  Download, FileSpreadsheet, History
} from 'lucide-react';

export default function BulkUI({
  recentImports,
  stats,
  exams,
  questionBanks
}: any) {
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  
  // Student Import State
  const [studentFile, setStudentFile] = useState<File | null>(null);
  const [isUploadingStudent, setIsUploadingStudent] = useState(false);
  
  // Question Import State
  const [questionFile, setQuestionFile] = useState<File | null>(null);
  const [selectedBankId, setSelectedBankId] = useState('');
  const [isUploadingQuestion, setIsUploadingQuestion] = useState(false);

  // Export State
  const [exportExamId, setExportExamId] = useState('');
  const [exportFormat, setExportFormat] = useState('csv');
  const [isExporting, setIsExporting] = useState(false);

  const handleStudentUpload = async () => {
    if (!studentFile) {
      toast.error('Please select a file first');
      return;
    }

    setIsUploadingStudent(true);
    const formData = new FormData();
    formData.append('file', studentFile);

    try {
      const response = await fetch('/api/admin/users/import', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Import failed');
      }

      const result = await response.json();
      toast.success(`✅ ${result.imported || 0} users imported successfully!`);
      setIsStudentModalOpen(false);
      setStudentFile(null);
    } catch (error: any) {
      console.error('Import error:', error);
      toast.error(error.message || 'Import failed. Please check your file format.');
    } finally {
      setIsUploadingStudent(false);
    }
  };

  const handleQuestionUpload = async () => {
    if (!questionFile || !selectedBankId) {
      toast.error('Please select a file and a question bank');
      return;
    }

    setIsUploadingQuestion(true);
    const formData = new FormData();
    formData.append('file', questionFile);
    formData.append('bankId', selectedBankId);

    try {
      const response = await fetch('/api/admin/questions/import', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Import failed');
      }

      const result = await response.json();
      toast.success(`✅ ${result.imported || 0} questions imported successfully!`);
      setIsQuestionModalOpen(false);
      setQuestionFile(null);
      setSelectedBankId('');
    } catch (error: any) {
      console.error('Import error:', error);
      toast.error(error.message || 'Import failed. Please check your file format.');
    } finally {
      setIsUploadingQuestion(false);
    }
  };

  const handleExport = async () => {
    if (!exportExamId) {
      toast.error('Please select an exam to export results');
      return;
    }

    setIsExporting(true);
    try {
      window.location.href = `/api/admin/bulk/export?examId=${exportExamId}&format=${exportFormat}`;
      toast.success('Export started');
    } catch (e) {
      toast.error('Failed to start export');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="p-6 space-y-8">
      {/* ===== HEADER ===== */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bulk Operations</h1>
          <p className="text-muted-foreground mt-1">
            Manage bulk imports and exports via background jobs
          </p>
        </div>
      </div>

      {/* ===== STATS CARDS ===== */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6 flex items-center space-x-4">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-600 dark:text-blue-400">
            <Users size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Total Students</p>
            <h3 className="text-2xl font-bold">{stats.studentCount}</h3>
          </div>
        </Card>
        
        <Card className="p-6 flex items-center space-x-4">
          <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full text-green-600 dark:text-green-400">
            <HelpCircle size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Total Questions</p>
            <h3 className="text-2xl font-bold">{stats.questionCount}</h3>
          </div>
        </Card>

        <Card className="p-6 flex items-center space-x-4">
          <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full text-purple-600 dark:text-purple-400">
            <FileText size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Total Exams</p>
            <h3 className="text-2xl font-bold">{stats.examCount}</h3>
          </div>
        </Card>

        <Card className="p-6 flex items-center space-x-4">
          <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-full text-orange-600 dark:text-orange-400">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Pending Imports</p>
            <h3 className="text-2xl font-bold">{stats.pendingCount}</h3>
          </div>
        </Card>
      </div>

      {/* ===== ACTIONS SECTION ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* IMPORT SECTION */}
        <Card className="p-6 space-y-6">
          <div className="flex items-center gap-2 border-b pb-4">
            <Upload className="text-blue-500" />
            <h2 className="text-xl font-semibold">Import Data</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Import Students Modal */}
            <Dialog open={isStudentModalOpen} onOpenChange={setIsStudentModalOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="h-24 flex flex-col gap-2 w-full">
                  <Users size={24} />
                  <span>Import Students (CSV)</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-lg">Import Students</h3>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          window.open('/sample-students.csv');
                        }}
                      >
                        📄 Download Sample CSV
                      </Button>
                    </div>
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="p-3 bg-gray-50 rounded-lg text-sm">
                    <p className="font-medium mb-1">Required CSV Format:</p>
                    <p className="font-mono text-xs text-gray-600">
                      Name,Email,Roll Number,Branch,Passing Year
                    </p>
                    <p className="font-mono text-xs text-gray-500 mt-1">
                      Amit Sharma,a.sharma@college.edu,CS2023001,CSE,2026
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-1 block">Upload CSV File</label>
                    <Input 
                      type="file" 
                      accept=".csv"
                      onChange={(e) => setStudentFile(e.target.files?.[0] || null)}
                    />
                  </div>
                  
                  <Button 
                    className="w-full" 
                    onClick={handleStudentUpload}
                    disabled={!studentFile || isUploadingStudent}
                  >
                    {isUploadingStudent ? 'Starting Import...' : 'Upload & Process'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Import Questions Modal */}
            <Dialog open={isQuestionModalOpen} onOpenChange={setIsQuestionModalOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="h-24 flex flex-col gap-2 w-full">
                  <HelpCircle size={24} />
                  <span>Import Questions (CSV/JSON)</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Import Questions</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Target Question Bank</label>
                    <Select value={selectedBankId} onValueChange={setSelectedBankId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a bank" />
                      </SelectTrigger>
                      <SelectContent>
                        {questionBanks.map((bank: any) => (
                          <SelectItem key={bank.id} value={bank.id}>{bank.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-1 block">Upload File</label>
                    <Input 
                      type="file" 
                      accept=".csv,.json"
                      onChange={(e) => setQuestionFile(e.target.files?.[0] || null)}
                    />
                  </div>
                  
                  <Button 
                    className="w-full" 
                    onClick={handleQuestionUpload}
                    disabled={!questionFile || !selectedBankId || isUploadingQuestion}
                  >
                    {isUploadingQuestion ? 'Starting Import...' : 'Upload & Process'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </Card>

        {/* EXPORT SECTION */}
        <Card className="p-6 space-y-6">
          <div className="flex items-center gap-2 border-b pb-4">
            <Download className="text-green-500" />
            <h2 className="text-xl font-semibold">Export Results</h2>
          </div>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Select Exam</label>
                <Select value={exportExamId} onValueChange={setExportExamId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an exam" />
                  </SelectTrigger>
                  <SelectContent>
                    {exams.map((exam: any) => (
                      <SelectItem key={exam.id} value={exam.id}>{exam.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-1 block">Format</label>
                <Select value={exportFormat} onValueChange={setExportFormat}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="csv">CSV Document</SelectItem>
                    <SelectItem value="excel">Excel Workbook</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <Button 
              className="w-full bg-green-600 hover:bg-green-700 text-white" 
              onClick={handleExport}
              disabled={!exportExamId || isExporting}
            >
              <FileSpreadsheet className="mr-2" size={16} />
              {isExporting ? 'Generating...' : 'Download Results'}
            </Button>
          </div>
        </Card>

      </div>

      {/* ===== RECENT IMPORTS TABLE ===== */}
      <Card className="p-6">
        <div className="flex items-center gap-2 border-b pb-4 mb-4">
          <History className="text-purple-500" />
          <h2 className="text-xl font-semibold">Recent Imports History</h2>
        </div>
        
        {recentImports.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No recent imports found.
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Operation Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentImports.map((log: any) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      {new Date(log.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{log.users?.full_name || 'System'}</p>
                        <p className="text-xs text-muted-foreground">{log.users?.email || 'N/A'}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {log.action.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="secondary"
                        className={
                          log.metadata?.status === 'completed' 
                            ? 'bg-green-100 text-green-700' 
                            : log.metadata?.status === 'failed'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }
                      >
                        {log.metadata?.status || 'completed'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {log.metadata?.recordsProcessed ? (
                        <span>{log.metadata.recordsProcessed} records processed</span>
                      ) : (
                        <span className="text-muted-foreground">No details</span>
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
