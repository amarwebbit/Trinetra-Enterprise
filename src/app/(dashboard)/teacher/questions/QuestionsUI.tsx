'use client';

import React, { useState, useTransition } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Search, Plus, Trash2, Edit2, ChevronLeft, ChevronRight, Calculator, CheckSquare, List as ListIcon, Image as ImageIcon, Folder, FolderPlus, Edit3, Save, X } from 'lucide-react';
import { createQuestion, updateQuestion, deleteQuestion, importQuestionsFromJSON, createQuestionBank, updateQuestionBank, deleteQuestionBank } from '@/app/actions/question-actions';
import { RichTextEditor, compressImageFile } from '@/components/editor/RichTextEditor';
import { QuestionPreview } from '@/components/teacher/QuestionPreview';
import { TopicManager } from '@/components/teacher/TopicManager';
import { MathText } from '@/components/ui/MathText';

type QuestionType = {
  id: string;
  type: string;
  question_text: string;
  options: any;
  correct_answer: string | null;
  marks: number | any;
  negative_marks: number | any;
  difficulty: string | null;
  topic: string | null;
  topic_id?: string | null;
  bank_id?: string | null;
  question_banks?: { id: string; name: string } | null;
  metadata: any;
};

type QuestionBankType = {
  id: string;
  name: string;
  subject?: string | null;
  description?: string | null;
  _count?: { questions: number };
};

type QuestionsUIProps = {
  questions: QuestionType[];
  total: number;
  page: number;
  pageSize: number;
  topics: string[];
  dbTopics?: Array<{ id: string; name: string; color?: string | null }>;
  typeCounts: any[];
  difficulties: string[];
  questionBanks?: QuestionBankType[];
  filters: any;
  teacherSettings: any;
};

export default function QuestionsUI({
  questions,
  total,
  page,
  pageSize,
  topics,
  dbTopics = [],
  difficulties,
  questionBanks = [],
  filters,
  teacherSettings
}: QuestionsUIProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuestionType | null>(null);
  const [jsonModalOpen, setJsonModalOpen] = useState(false);
  const [previewData, setPreviewData] = useState<any[] | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState(filters.search || '');
  const [isCustomTopic, setIsCustomTopic] = useState(false);

  // Question Bank State
  const [isCreateBankOpen, setIsCreateBankOpen] = useState(false);
  const [newBankName, setNewBankName] = useState('');
  const [renamingBankId, setRenamingBankId] = useState<string | null>(null);
  const [renamingBankName, setRenamingBankName] = useState('');

  // Form State
  const defaultNegEnabled = teacherSettings.default_negative_marks_enabled ?? true;
  const defaultNegValue = teacherSettings.default_negative_marks_value ?? 0.25;

  const [formData, setFormData] = useState({
    type: 'mcq_single',
    question_text: '',
    options: { A: '', B: '', C: '', D: '' },
    correct_answer: 'A',
    marks: teacherSettings.default_marks || 1,
    negative_marks_enabled: defaultNegEnabled,
    negative_marks_value: defaultNegValue,
    difficulty: teacherSettings.default_difficulty || 'medium',
    topic: '',
    topic_id: null as string | null,
    bank_id: filters.bankId || (questionBanks[0]?.id || null) as string | null,
  });
  const [natAnswer, setNatAnswer] = useState<string>('');
  const [natTolerance, setNatTolerance] = useState<string>('0');

  // Open Edit Question Modal
  const handleOpenEdit = (q: QuestionType) => {
    setEditingQuestion(q);
    const negEnabled = (q.metadata as any)?.negative_marks_enabled ?? (Number(q.negative_marks) > 0);
    const negVal = (q.metadata as any)?.negative_marks_value ?? (Number(q.negative_marks) || defaultNegValue);
    const tolVal = (q.metadata as any)?.nat_tolerance ?? '0';

    let parsedOpts = { A: '', B: '', C: '', D: '' };
    if (q.options) {
      if (typeof q.options === 'string') {
        try { parsedOpts = JSON.parse(q.options); } catch (e) { parsedOpts = { A: q.options, B: '', C: '', D: '' }; }
      } else if (typeof q.options === 'object') {
        parsedOpts = { A: '', B: '', C: '', D: '', ...q.options };
      }
    }

    setFormData({
      type: q.type || 'mcq_single',
      question_text: q.question_text || '',
      options: parsedOpts,
      correct_answer: q.correct_answer || 'A',
      marks: Number(q.marks) || 1,
      negative_marks_enabled: negEnabled,
      negative_marks_value: negVal,
      difficulty: q.difficulty || 'medium',
      topic: q.topic || '',
      topic_id: q.topic_id || null,
      bank_id: q.bank_id || (questionBanks[0]?.id || null),
    });

    if (q.type === 'nat') {
      setNatAnswer(q.correct_answer || '');
      setNatTolerance(String(tolVal));
    }
    setIsCreateOpen(true);
  };

  const handleOpenCreate = () => {
    setEditingQuestion(null);
    setFormData({
      type: 'mcq_single',
      question_text: '',
      options: { A: '', B: '', C: '', D: '' },
      correct_answer: 'A',
      marks: teacherSettings.default_marks || 1,
      negative_marks_enabled: defaultNegEnabled,
      negative_marks_value: defaultNegValue,
      difficulty: teacherSettings.default_difficulty || 'medium',
      topic: filters.topic || '',
      topic_id: filters.topicId || null,
      bank_id: filters.bankId || (questionBanks[0]?.id || null),
    });
    setNatAnswer('');
    setNatTolerance('0');
    setIsCreateOpen(true);
  };

  const totalPages = Math.ceil(total / pageSize) || 1;

  const updateFilters = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
      if (key === 'bankId') {
        params.delete('topicId');
        params.delete('topic');
      } else if (key === 'topicId' || key === 'topic') {
        params.delete('bankId');
      }
    } else {
      params.delete(key);
    }
    if (key !== 'page') params.set('page', '1');
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters('search', searchTerm);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this question?')) return;
    startTransition(async () => {
      try {
        await deleteQuestion(id);
      } catch (e: any) {
        toast.error(e.message || 'Failed to delete question');
      }
    });
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.question_text) {
      toast.error('Question text is required');
      return;
    }
    
    startTransition(async () => {
      try {
        const data = new FormData();
        data.append('type', formData.type);
        data.append('question_text', formData.question_text);
        if (formData.type.startsWith('mcq')) {
          data.append('options', JSON.stringify(formData.options));
          data.append('correct_answer', formData.correct_answer);
        }
        if (formData.type === 'nat') {
          data.append('nat_answer', natAnswer);
          data.append('nat_tolerance', natTolerance);
        }
        data.append('marks', formData.marks.toString());
        data.append('negative_marks_enabled', String(formData.negative_marks_enabled));
        data.append('negative_marks_value', formData.negative_marks_value.toString());
        data.append('difficulty', formData.difficulty);
        data.append('topic', formData.topic);
        if (formData.topic_id) {
          data.append('topic_id', formData.topic_id);
        }
        if (formData.bank_id) {
          data.append('bank_id', formData.bank_id);
        }

        if (editingQuestion) {
          await updateQuestion(editingQuestion.id, data);
          toast.success('Question updated successfully!');
          router.refresh();
        } else {
          await createQuestion(data);
          toast.success('Question created successfully!');
          const params = new URLSearchParams();
          if (formData.bank_id) params.set('bankId', formData.bank_id);
          params.set('page', '1');
          router.push(`${pathname}?${params.toString()}`);
        }

        setIsCreateOpen(false);
        setEditingQuestion(null);
      } catch (err: any) {
        toast.error(err.message || `Failed to ${editingQuestion ? 'update' : 'create'} question`);
      }
    });
  };

  const handleCreateBank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBankName.trim()) return;
    startTransition(async () => {
      try {
        await createQuestionBank(newBankName.trim());
        toast.success('Question Bank created successfully!');
        setNewBankName('');
        setIsCreateBankOpen(false);
        router.refresh();
      } catch (e: any) {
        toast.error(e.message || 'Failed to create Question Bank');
      }
    });
  };

  const handleRenameBank = async (bankId: string) => {
    if (!renamingBankName.trim()) return;
    const newName = renamingBankName.trim();
    startTransition(async () => {
      try {
        await updateQuestionBank(bankId, newName);
        toast.success('Question Bank renamed successfully!');
        setRenamingBankId(null);
        // Optimistically update local array
        const target = questionBanks.find(b => b.id === bankId);
        if (target) target.name = newName;
        router.refresh();
      } catch (e: any) {
        toast.error(e.message || 'Failed to rename Question Bank');
      }
    });
  };

  const handleDeleteBank = async (bankId: string, bankName: string) => {
    if (!confirm(`Are you sure you want to delete Question Bank "${bankName}"? Questions inside will remain unlinked.`)) return;
    startTransition(async () => {
      try {
        await deleteQuestionBank(bankId);
        toast.success('Question Bank deleted!');
        if (filters.bankId === bankId) {
          updateFilters('bankId', null);
        } else {
          router.refresh();
        }
      } catch (e: any) {
        toast.error(e.message || 'Failed to delete Question Bank');
      }
    });
  };

  const downloadSampleJSON = () => {
    window.open('/sample-questions.json', '_blank');
  };

  const handleJSONUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const data = json.questions || json;
        setPreviewData(Array.isArray(data) ? data : []);
      } catch (err) {
        toast.error('Invalid JSON file format');
      }
    };
    reader.readAsText(file);
  };

  const handleJSONImport = async () => {
    const fileInput = document.getElementById('json-upload') as HTMLInputElement;
    const file = fileInput?.files?.[0];
    
    if (!file || !previewData) {
      toast.error('Please upload a valid JSON file first');
      return;
    }

    setIsImporting(true);
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append('file', file);
        
        const res = await importQuestionsFromJSON(formData);
        if (res.success) {
          toast.success(`Successfully imported ${res.count} questions`);
          setJsonModalOpen(false);
          setPreviewData(null);
          if (fileInput) fileInput.value = '';
        }
      } catch (err: any) {
        toast.error(err.message || 'Failed to import questions');
      } finally {
        setIsImporting(false);
      }
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-in fade-in zoom-in-95 duration-200">
      {/* Sidebar - Question Bank & Topic Manager */}
      <div className="col-span-1 space-y-4">
        {/* Question Banks Card */}
        <div className="bg-background rounded-xl border border-muted p-4">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-muted">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
              <Folder className="h-4 w-4 text-primary" /> Question Banks
            </h3>
            <Button 
              size="sm" 
              variant="outline" 
              className="h-7 text-xs px-2 rounded-none"
              onClick={() => setIsCreateBankOpen(true)}
            >
              <Plus className="h-3 w-3 mr-1" /> Bank
            </Button>
          </div>

          <div className="space-y-1">
            <button
              onClick={() => updateFilters('bankId', null)}
              className={`w-full text-left px-2.5 py-1.5 text-xs font-semibold rounded-none transition-colors flex items-center justify-between ${
                !filters.bankId ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted/30 hover:text-foreground'
              }`}
            >
              <span className="truncate">All Question Banks</span>
              <span className="text-[10px] opacity-75">{total}</span>
            </button>

            {questionBanks.map((bank) => {
              const isSelected = filters.bankId === bank.id;
              const isEditing = renamingBankId === bank.id;

              return (
                <div key={bank.id} className="group flex items-center justify-between gap-1">
                  {isEditing ? (
                    <form 
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleRenameBank(bank.id);
                      }}
                      className="flex items-center gap-1 w-full p-1 bg-muted/20"
                    >
                      <Input
                        value={renamingBankName}
                        onChange={(e) => setRenamingBankName(e.target.value)}
                        className="h-6 text-xs px-1 rounded-none border-muted font-semibold text-foreground bg-background"
                        autoFocus
                      />
                      <Button
                        type="submit"
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 text-green-600 hover:bg-green-100 dark:hover:bg-green-950/40 shrink-0"
                        title="Save Question Bank Name"
                        disabled={isPending}
                      >
                        <Save className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 text-muted-foreground hover:bg-muted/40 shrink-0"
                        title="Cancel"
                        onClick={() => setRenamingBankId(null)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </form>
                  ) : (
                    <>
                      <button
                        onClick={() => updateFilters('bankId', bank.id)}
                        className={`flex-1 text-left px-2.5 py-1.5 text-xs font-semibold rounded-none transition-colors flex items-center justify-between min-w-0 ${
                          isSelected ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted/30 hover:text-foreground'
                        }`}
                      >
                        <span className="truncate">{bank.name}</span>
                        <span className="text-[10px] opacity-75 ml-1">{bank._count?.questions ?? 0}</span>
                      </button>

                      <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                          title="Rename Question Bank"
                          onClick={() => {
                            setRenamingBankId(bank.id);
                            setRenamingBankName(bank.name);
                          }}
                        >
                          <Edit3 className="h-3 w-3" />
                        </Button>
                        {bank.name !== 'Default Question Bank' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                            title="Delete Question Bank"
                            onClick={() => handleDeleteBank(bank.id, bank.name)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal for Creating New Question Bank */}
        <Dialog open={isCreateBankOpen} onOpenChange={setIsCreateBankOpen}>
          <DialogContent className="max-w-md rounded-none">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FolderPlus className="h-5 w-5 text-primary" /> Create Question Bank
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateBank} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label className="font-semibold">Question Bank Name *</Label>
                <Input
                  value={newBankName}
                  onChange={(e) => setNewBankName(e.target.value)}
                  placeholder="e.g. Physics Midterm 2026, GATE CSE Questions"
                  className="rounded-none border-muted"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-muted">
                <Button type="button" variant="outline" className="rounded-none" onClick={() => setIsCreateBankOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending} className="rounded-none">
                  Create Bank
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Topic Manager */}
        <div className="bg-background rounded-xl border border-muted p-4 sticky top-6">
          <TopicManager
            onTopicSelect={(topicId) => updateFilters('topicId', topicId)}
            selectedTopicId={filters.topicId || null}
          />
        </div>
      </div>

      {/* Main Content - Questions */}
      <div className="col-span-1 md:col-span-3 space-y-6">
        {/* Toolbar */}
        <Card className="rounded-none border-muted">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-end">
          <form onSubmit={handleSearch} className="flex-1 w-full relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search questions by text or topic..." 
              className="pl-9 rounded-none border-muted focus-visible:ring-1 focus-visible:ring-primary w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </form>

          <div className="flex gap-2 w-full md:w-auto overflow-x-auto">
            <select 
              className="bg-background border border-muted p-2 rounded-none text-sm focus:outline-none focus:ring-1 focus:ring-primary min-w-[120px]"
              value={filters.type || ''}
              onChange={(e) => updateFilters('type', e.target.value)}
            >
              <option value="">All Types</option>
              <option value="mcq_single">MCQ Single</option>
              <option value="mcq_multiple">MCQ Multiple</option>
              <option value="nat">NAT</option>
            </select>

            <select 
              className="bg-background border border-muted p-2 rounded-none text-sm focus:outline-none focus:ring-1 focus:ring-primary min-w-[120px]"
              value={filters.type || ''}
              onChange={(e) => updateFilters('type', e.target.value)}
            >
              <option value="">All Types</option>
              <option value="mcq_single">MCQ Single</option>
              <option value="mcq_multiple">MCQ Multiple</option>
              <option value="nat">NAT</option>
            </select>

            <Button onClick={() => setJsonModalOpen(true)} className="rounded-none whitespace-nowrap bg-indigo-600 hover:bg-indigo-700 text-white">
              📥 Import Questions (JSON / Excel)
            </Button>

            <Dialog open={jsonModalOpen} onOpenChange={setJsonModalOpen}>
              <DialogContent className="max-w-3xl rounded-none">
                <DialogHeader>
                  <DialogTitle>Import Questions (JSON or Excel)</DialogTitle>
                </DialogHeader>
                
                <div className="space-y-6 pt-4">
                  <div className="flex flex-wrap items-center gap-4">
                    <Button variant="outline" onClick={downloadSampleJSON} className="rounded-none text-xs">
                      📄 Download Sample JSON
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => window.open('/api/teacher/questions/template/excel', '_blank')} 
                      className="rounded-none text-xs bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100"
                    >
                      📊 Download Sample Excel (.xlsx)
                    </Button>
                  </div>
                  
                  <div className="border-2 border-dashed border-muted rounded-lg p-12 text-center bg-muted/5">
                    <input
                      type="file"
                      accept=".json,.xlsx,.xls"
                      onChange={handleJSONUpload}
                      className="hidden"
                      id="json-upload"
                    />
                    <label htmlFor="json-upload" className="cursor-pointer flex flex-col items-center justify-center">
                      <div className="text-4xl mb-4">📤</div>
                      <p className="font-semibold text-lg mb-1">Drop your JSON or Excel (.xlsx) file here or click to browse</p>
                      <p className="text-sm text-muted-foreground">Supports MCQ, MSQ, NAT with LaTeX formulas, option keys, and marks</p>
                    </label>
                  </div>
                  
                  {previewData && (
                    <div className="border border-muted">
                      <div className="bg-muted p-2 font-medium text-sm">
                        Preview ({previewData.length} questions found)
                      </div>
                      <div className="max-h-60 overflow-y-auto divide-y divide-muted">
                        {previewData.slice(0, 5).map((q, i) => (
                          <div key={i} className="p-3">
                            <MathText text={q.question_text} className="font-medium text-sm mb-1 block" />
                            <div className="flex gap-2">
                              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{q.type}</span>
                              <span className="text-xs text-muted-foreground">Marks: {q.marks || 1}</span>
                            </div>
                          </div>
                        ))}
                        {previewData.length > 5 && (
                          <div className="p-3 text-sm text-center text-muted-foreground italic bg-muted/20">
                            ... and {previewData.length - 5} more questions
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setJsonModalOpen(false)} className="rounded-none">
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleJSONImport} 
                      disabled={!previewData || isImporting}
                      className="rounded-none bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
                      {isImporting ? 'Importing...' : `Import ${previewData?.length || 0} Questions`}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button className="rounded-none whitespace-nowrap" onClick={handleOpenCreate}>
                  <Plus className="h-4 w-4 mr-2" /> Add Question
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-none">
                <DialogHeader>
                  <DialogTitle>{editingQuestion ? 'Edit Question' : 'Create New Question'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleFormSubmit} className="space-y-6 pt-4">
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>Question Bank</Label>
                      <select 
                        className="w-full bg-background border border-muted p-2 rounded-none text-sm focus:outline-none focus:ring-1 focus:ring-primary font-semibold"
                        value={formData.bank_id || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, bank_id: e.target.value || null }))}
                      >
                        {questionBanks.length === 0 ? (
                          <option value="">Default Question Bank</option>
                        ) : (
                          questionBanks.map(b => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                          ))
                        )}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>Question Type</Label>
                      <select 
                        className="w-full bg-background border border-muted p-2 rounded-none text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        value={formData.type}
                        onChange={(e) => {
                          const newType = e.target.value;
                          setFormData(prev => ({ 
                            ...prev, 
                            type: newType,
                            negative_marks_enabled: newType === 'nat' ? false : prev.negative_marks_enabled,
                            negative_marks_value: newType === 'nat' ? 0 : prev.negative_marks_value,
                          }));
                        }}
                      >
                        <option value="mcq_single">MCQ Single</option>
                        <option value="mcq_multiple">MCQ Multiple</option>
                        <option value="nat">Numerical Answer (NAT)</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>Difficulty</Label>
                      <select 
                        className="w-full bg-background border border-muted p-2 rounded-none text-sm focus:outline-none focus:ring-1 focus:ring-primary capitalize"
                        value={formData.difficulty}
                        onChange={(e) => setFormData(prev => ({ ...prev, difficulty: e.target.value }))}
                      >
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="font-semibold">Select Topic</Label>
                        {formData.topic && (
                          <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 border border-blue-200 dark:border-blue-800">
                            Topic: {formData.topic}
                          </span>
                        )}
                      </div>
                      <select
                        className="w-full bg-background border border-muted p-2 rounded-none text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        value={isCustomTopic ? '__custom__' : (formData.topic || '')}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '__custom__') {
                            setIsCustomTopic(true);
                            setFormData(prev => ({ ...prev, topic: '', topic_id: null }));
                          } else {
                            setIsCustomTopic(false);
                            const matchedDb = dbTopics.find(t => t.name === val);
                            setFormData(prev => ({ 
                              ...prev, 
                              topic: val,
                              topic_id: matchedDb ? matchedDb.id : null 
                            }));
                          }
                        }}
                      >
                        <option value="">-- Select a Created Topic --</option>
                        {topics.map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                        <option value="__custom__">➕ Enter New Topic Name...</option>
                      </select>

                      {isCustomTopic && (
                        <Input 
                          placeholder="Type new topic (e.g. Data Structures)..." 
                          className="rounded-none border-primary focus-visible:ring-1 focus-visible:ring-primary mt-1"
                          value={formData.topic}
                          onChange={(e) => setFormData(prev => ({ ...prev, topic: e.target.value, topic_id: null }))}
                          autoFocus
                        />
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Marks</Label>
                      <Input 
                        type="number" 
                        step="0.5"
                        min="0"
                        className="rounded-none border-muted focus-visible:ring-1 focus-visible:ring-primary"
                        value={formData.marks}
                        onChange={(e) => setFormData(prev => ({ ...prev, marks: parseFloat(e.target.value) || 0 }))}
                      />
                    </div>
                  </div>

                  {/* Negative Marks Configuration */}
                  <div className="bg-muted/10 p-4 border border-muted space-y-4">
                    <div className="flex items-center gap-2">
                      <Checkbox 
                        id="neg_marks_toggle" 
                        checked={formData.negative_marks_enabled}
                        onCheckedChange={(c) => setFormData(prev => ({ ...prev, negative_marks_enabled: !!c }))}
                      />
                      <Label htmlFor="neg_marks_toggle" className="cursor-pointer font-semibold flex items-center gap-2">
                        Enable Negative Marks
                        {formData.type === 'nat' && <span className="text-xs text-muted-foreground font-normal bg-orange-100 dark:bg-orange-900/30 text-orange-600 px-2 py-0.5 ml-2">NAT typically has 0 negative marks</span>}
                      </Label>
                    </div>
                    
                    {formData.negative_marks_enabled && (
                      <div className="pl-6 space-y-2">
                        <Label>Negative Marks Value</Label>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">-</span>
                          <Input 
                            type="number" 
                            step="0.01"
                            min="0"
                            className="rounded-none border-muted focus-visible:ring-1 focus-visible:ring-primary w-32"
                            value={formData.negative_marks_value}
                            onChange={(e) => setFormData(prev => ({ ...prev, negative_marks_value: parseFloat(e.target.value) || 0 }))}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Question Text & Image</Label>
                      <span className="text-xs text-muted-foreground">Use the <b>Upload Image</b> button in the toolbar below to embed question diagrams or math images.</span>
                    </div>
                    <RichTextEditor 
                      value={formData.question_text} 
                      onChange={(v) => setFormData(prev => ({ ...prev, question_text: v }))} 
                    />
                  </div>

                  {formData.type.startsWith('mcq') && (
                    <div className="space-y-4">
                      <Label className="text-base font-bold">Options (Text or Image)</Label>
                      {['A', 'B', 'C', 'D'].map((opt) => (
                        <div key={opt} className="p-3 border border-muted bg-muted/5 space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-sm text-foreground">Option {opt}</span>
                            <label className="cursor-pointer inline-flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold bg-blue-50 dark:bg-blue-950/40 px-2 py-1 border border-blue-200 dark:border-blue-800">
                              <ImageIcon className="h-3.5 w-3.5" />
                              <span>Attach Image to Option {opt}</span>
                              <input 
                                type="file" 
                                accept="image/*" 
                                className="hidden" 
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  if (file.size > 15 * 1024 * 1024) {
                                    toast.error('Image must be less than 15MB');
                                    return;
                                  }
                                  try {
                                    const dataUrl = await compressImageFile(file);
                                    if (dataUrl) {
                                      const currentVal = (formData.options as any)[opt] || '';
                                      const updatedVal = currentVal 
                                        ? `${currentVal}<br/><img src="${dataUrl}" alt="Option ${opt} Image" class="max-h-32 my-1 border rounded border-gray-300" />`
                                        : `<img src="${dataUrl}" alt="Option ${opt} Image" class="max-h-32 my-1 border rounded border-gray-300" />`;
                                      
                                      setFormData(prev => ({
                                        ...prev,
                                        options: { ...prev.options, [opt]: updatedVal }
                                      }));
                                      toast.success(`Image attached to Option ${opt}!`);
                                    }
                                  } catch (err) {
                                    toast.error('Failed to process image');
                                  }
                                  e.target.value = '';
                                }}
                              />
                            </label>
                          </div>
                          
                          <div className="flex gap-4 items-start">
                            <div className="flex-1">
                              <RichTextEditor 
                                value={(formData.options as any)[opt]} 
                                onChange={(v) => setFormData(prev => ({ 
                                  ...prev, 
                                  options: { ...prev.options, [opt]: v } 
                                }))} 
                              />
                            </div>
                            <div className="pt-2">
                              <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold bg-background px-3 py-2 border border-muted shadow-xs hover:border-primary">
                                <input 
                                  type={formData.type === 'mcq_single' ? 'radio' : 'checkbox'} 
                                  name="correct_answer" 
                                  checked={formData.correct_answer.includes(opt)}
                                  onChange={(e) => {
                                    if (formData.type === 'mcq_single') {
                                      setFormData(prev => ({ ...prev, correct_answer: opt }));
                                    } else {
                                      setFormData(prev => {
                                        const current = prev.correct_answer.split(',').filter(Boolean);
                                        if (e.target.checked) current.push(opt);
                                        else current.splice(current.indexOf(opt), 1);
                                        return { ...prev, correct_answer: current.sort().join(',') };
                                      });
                                    }
                                  }}
                                  className="w-4 h-4 text-primary focus:ring-primary"
                                />
                                Correct
                              </label>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* NAT Answer & Tolerance Fields */}
                  {formData.type === 'nat' && (
                    <div className="space-y-4 border-l-4 border-blue-400 pl-4 bg-blue-50/30 dark:bg-blue-950/10 p-4">
                      <div className="space-y-2">
                        <Label className="font-semibold">Correct Answer <span className="text-red-500">*</span></Label>
                        <Input
                          type="number"
                          step="any"
                          value={natAnswer}
                          onChange={(e) => setNatAnswer(e.target.value)}
                          className="rounded-none border-muted focus-visible:ring-1 focus-visible:ring-primary w-64"
                          placeholder="e.g. 42, 3.14, -5"
                          required
                        />
                        <p className="text-xs text-muted-foreground">
                          The exact numerical value students must answer.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label className="font-semibold">Tolerance</Label>
                        <Input
                          type="number"
                          step="0.001"
                          min="0"
                          value={natTolerance}
                          onChange={(e) => setNatTolerance(e.target.value)}
                          className="rounded-none border-muted focus-visible:ring-1 focus-visible:ring-primary w-64"
                          placeholder="e.g. 0.01"
                        />
                        <p className="text-xs text-muted-foreground">
                          Answers within ±tolerance will be accepted. Set to 0 for exact match only.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-3 pt-4 border-t border-muted">
                    <Button type="button" variant="outline" className="rounded-none" onClick={() => setIsCreateOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isPending} className="rounded-none">
                      Save Question
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Questions List */}
      <div className="space-y-4">
        {questions.length === 0 ? (
          <div className="text-center p-12 border border-muted bg-muted/5 text-muted-foreground">
            No questions found matching your criteria.
          </div>
        ) : (
          questions.map(q => (
            <Card key={q.id} className="rounded-none border-muted hover:border-primary/50 transition-colors">
              <CardHeader className="p-4 bg-muted/10 border-b border-muted flex flex-row justify-between items-center space-y-0">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 text-primary text-xs font-bold px-2 py-1 uppercase tracking-wider flex items-center gap-1">
                    {q.type === 'mcq_single' ? <CheckSquare className="h-3 w-3" /> : q.type === 'mcq_multiple' ? <ListIcon className="h-3 w-3" /> : <Calculator className="h-3 w-3" />}
                    {q.type.replace('_', ' ')}
                  </div>
                  {q.difficulty && (
                    <span className={`text-xs font-medium capitalize px-2 py-1 border ${
                      q.difficulty === 'easy' ? 'text-green-600 border-green-200 bg-green-50 dark:bg-green-950/30' :
                      q.difficulty === 'hard' ? 'text-red-600 border-red-200 bg-red-50 dark:bg-red-950/30' :
                      'text-orange-600 border-orange-200 bg-orange-50 dark:bg-orange-950/30'
                    }`}>
                      {q.difficulty}
                    </span>
                  )}
                  {q.topic && <span className="text-sm text-muted-foreground font-medium">Topic: {q.topic}</span>}
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30" 
                    title="Edit Question"
                    onClick={() => handleOpenEdit(q)}
                    disabled={isPending}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30" 
                    onClick={() => handleDelete(q.id)}
                    disabled={isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <QuestionPreview 
                  question={q} 
                  showAnswer={false}
                  showMetadata={true}
                />
                {q.type === 'nat' && (
                  <div className="mt-4 p-3 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 inline-flex gap-6">
                    <span className="text-sm"><span className="font-semibold">Correct Answer:</span> {q.correct_answer ?? <span className="text-muted-foreground italic">Not set</span>}</span>
                    {(q.metadata as any)?.nat_tolerance !== undefined && (q.metadata as any).nat_tolerance !== 0 && (
                      <span className="text-sm"><span className="font-semibold">Tolerance:</span> ±{(q.metadata as any).nat_tolerance}</span>
                    )}
                  </div>
                )}
              </CardContent>
              <CardFooter className="p-4 bg-muted/5 border-t border-muted flex items-center justify-between text-sm">
                <div className="flex gap-4">
                  <div className="font-medium">Marks: {q.marks?.toString()}</div>
                  <div className={`flex items-center gap-1 ${q.negative_marks > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-muted-foreground'}`}>
                    <span className="font-semibold">Negative:</span> 
                    {q.negative_marks?.toString() || '0'}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  ID: {q.id.split('-')[0]}
                </div>
              </CardFooter>
            </Card>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <div className="text-sm text-muted-foreground">
            Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total} questions
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="rounded-none h-8 w-8 p-0"
              onClick={() => updateFilters('page', String(page - 1))}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm px-2">Page {page} of {totalPages}</span>
            <Button 
              variant="outline" 
              size="sm" 
              className="rounded-none h-8 w-8 p-0"
              onClick={() => updateFilters('page', String(page + 1))}
              disabled={page >= totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}






