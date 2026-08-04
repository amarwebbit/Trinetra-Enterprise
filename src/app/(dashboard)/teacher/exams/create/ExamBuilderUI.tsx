'use client';

import React, { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { createExam } from '@/app/actions/exam-actions';
import { getQuestionsByBank } from '@/app/actions/question-actions';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { QuestionPreview } from '@/components/teacher/QuestionPreview';
import { TopicManager } from '@/components/teacher/TopicManager';
import { InstructionsEditor } from '@/components/teacher/InstructionsEditor';
import { 
  AlertCircle, ArrowLeft, ArrowRight, Save, Play, ShieldAlert, Monitor, 
  CopyX, EyeOff, LayoutGrid, Trash2, Edit, Plus, Loader2, FileText, CheckCircle, Link
} from 'lucide-react';

interface ExamBuilderUIProps {
  questionBanks: any[];
  teacherDefaults: any;
  availableModules: any[];
  teacherId: string;
  tenantId: string;
}

const DEFAULT_INSTRUCTIONS = `<h3>General Instructions</h3><p>Please read the following carefully before starting the assessment.</p><ol><li>The countdown timer shows the time remaining. The assessment is submitted automatically when time expires.</li><li>Answer one question at a time and use the question palette to review your progress.</li><li>Use <strong>Save &amp; Next</strong> to record an answer before moving forward.</li><li>Follow the examination rules configured for this assessment. Leaving full screen, switching tabs, or using restricted clipboard actions may be recorded as violations.</li><li>Ensure a stable internet connection. Your responses are saved automatically while you work.</li></ol>`;
const DEFAULT_INSTRUCTIONS_TEXT = 'General Instructions\n\nPlease read the following carefully before starting the assessment.\n1. The countdown timer shows the time remaining. The assessment is submitted automatically when time expires.\n2. Answer one question at a time and use the question palette to review your progress.\n3. Use Save & Next to record an answer before moving forward.\n4. Follow the examination rules configured for this assessment.\n5. Ensure a stable internet connection. Your responses are saved automatically while you work.';

export default function ExamBuilderUI({
  questionBanks,
  teacherDefaults,
  availableModules,
}: ExamBuilderUIProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState(1);

  // Section Modal State
  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
  const [editingSectionIndex, setEditingSectionIndex] = useState<number | null>(null);
  const [sectionForm, setSectionForm] = useState({
    name: '',
    shuffle_questions: true,
  });

  // Invite Modal State
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [inviteLinkData, setInviteLinkData] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  // Question Selector State
  const [selectedSectionIdx, setSelectedSectionIdx] = useState(0);
  const [selectedBankId, setSelectedBankId] = useState('');
  const [bankQuestions, setBankQuestions] = useState<any[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [selectedTopicFilter, setSelectedTopicFilter] = useState<string | null>(null);

  // Instructions State
  const [instructions, setInstructions] = useState(DEFAULT_INSTRUCTIONS_TEXT);
  const [instructionsHtml, setInstructionsHtml] = useState(DEFAULT_INSTRUCTIONS);
  const [showInstructions, setShowInstructions] = useState(true);
  const [requireAcknowledgement, setRequireAcknowledgement] = useState(true);
  const [sectionInstructions, setSectionInstructions] = useState<Record<string, { text: string; html: string }>>({});

  // Helper to format local ISO datetime string (YYYY-MM-DDTHH:mm)
  const getNowLocalISO = (addMinutes = 0) => {
    const d = new Date(Date.now() + addMinutes * 60000);
    const offset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - offset).toISOString().slice(0, 16);
  };

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    exam_type: 'general',
    max_attempts: 1,
    allow_multiple: false,
    mode: 'live' as 'live' | 'assignment',
    due_date: '',
    target_branch: 'all',
    target_year: 0,
    pattern: 'custom',
    duration_minutes: 60,
    total_marks: 0,
    passing_percentage: teacherDefaults.default_passing_percentage ?? 40,

    // Convert to string for datetime-local (defaults to current time)
    start_time: getNowLocalISO(0),
    end_time: getNowLocalISO(60),

    // Start with empty sections
    sections: [] as any[],

    // Proctoring & Rules
    violation_threshold: teacherDefaults.default_violation_threshold ?? 3,
    auto_submit_seconds: teacherDefaults.default_auto_submit_seconds ?? 15,
    require_webcam: false, // webcam not supported
    full_screen_required: teacherDefaults.default_full_screen_required ?? true,
    disable_copy_paste: teacherDefaults.default_disable_copy_paste ?? true,

    // Results
    show_results_immediately: teacherDefaults.default_show_results_immediately ?? false,

    // Navigation
    shuffle_questions: true,
    shuffle_options: true,
  });

  // Watch for Pattern changes (GATE Auto-config)
  useEffect(() => {
    if (formData.pattern === 'GATE') {
      toast.info('GATE pattern selected. Applying strict proctoring rules.');
      setFormData(prev => ({
        ...prev,
        violation_threshold: 3,
        auto_submit_seconds: 10,
        full_screen_required: true,
        disable_copy_paste: true,
        show_results_immediately: false,
        require_webcam: false, // User explicitly requested this for GATE
        shuffle_questions: true,
        shuffle_options: true,
        allow_back_navigation: true, // GATE allows back navigation
      }));
    }
  }, [formData.pattern]);

  // Auto-calculate end time helper
  const autoCalculateEndTime = (start: string, durationMinutes: number) => {
    if (!start || !durationMinutes) return;
    
    const startDate = new Date(start);
    const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);
    
    const offset = endDate.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(endDate.getTime() - offset)).toISOString().slice(0, 16);
    
    setFormData(prev => ({ ...prev, end_time: localISOTime }));
  };

  const handleNext = () => {
    if (step === 1 && !formData.title) return toast.error('Title is required');
    if (step === 2 && formData.sections.length === 0) return toast.error('At least one section is required');
    setStep(s => s + 1);
  };

  const handleBack = () => setStep(s => s - 1);

  // Section CRUD Helpers
  const handleOpenAddSection = () => {
    setEditingSectionIndex(null);
    setSectionForm({
      name: '',
      shuffle_questions: true,
    });
    setIsSectionModalOpen(true);
  };

  const handleOpenEditSection = (index: number) => {
    const sec = formData.sections[index];
    setEditingSectionIndex(index);
    setSectionForm({
      name: sec.name,
      shuffle_questions: sec.shuffle_questions,
    });
    setIsSectionModalOpen(true);
  };

  const handleSaveSection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sectionForm.name) {
      toast.error('Section name is required');
      return;
    }

    if (editingSectionIndex !== null) {
      setFormData(prev => {
        const updated = [...prev.sections];
        updated[editingSectionIndex] = {
          ...updated[editingSectionIndex],
          name: sectionForm.name,
          shuffle_questions: sectionForm.shuffle_questions,
        };
        return { ...prev, sections: updated };
      });
    } else {
      setFormData(prev => ({
        ...prev,
        sections: [
          ...prev.sections,
          {
            name: sectionForm.name,
            order_index: prev.sections.length,
            question_ids: [],
            shuffle_questions: sectionForm.shuffle_questions,
          }
        ]
      }));
    }
    setIsSectionModalOpen(false);
  };

  const handleDeleteSection = (index: number) => {
    setFormData(prev => {
      const updated = prev.sections.filter((_, i) => i !== index).map((sec, i) => ({
        ...sec,
        order_index: i
      }));
      return { ...prev, sections: updated };
    });
    if (selectedSectionIdx >= formData.sections.length - 1 && selectedSectionIdx > 0) {
      setSelectedSectionIdx(formData.sections.length - 2);
    }
  };

  // Question Selector Helpers
  const handleBankChange = async (bankId: string) => {
    setSelectedBankId(bankId);
    if (!bankId) {
      setBankQuestions([]);
      return;
    }
    setIsLoadingQuestions(true);
    try {
      const res = await getQuestionsByBank(bankId);
      if (res.success) {
        setBankQuestions(res.questions || []);
      } else {
        toast.error('Failed to load questions');
      }
    } catch (e: any) {
      toast.error(e.message || 'Error loading questions');
    } finally {
      setIsLoadingQuestions(false);
    }
  };

  const handleToggleQuestion = (questionId: string) => {
    setFormData(prev => {
      const updatedSections = [...prev.sections];
      const activeSec = updatedSections[selectedSectionIdx];
      if (!activeSec) return prev;

      const exists = activeSec.question_ids.includes(questionId);
      let newIds = [];
      if (exists) {
        newIds = activeSec.question_ids.filter((id: string) => id !== questionId);
      } else {
        newIds = [...activeSec.question_ids, questionId];
      }

      updatedSections[selectedSectionIdx] = {
        ...activeSec,
        question_ids: newIds,
      };

      return { ...prev, sections: updatedSections };
    });
  };

  const selectedMarks = formData.sections.reduce((total, section) => total + (section.question_ids || []).reduce((sectionTotal: number, questionId: string) => {
    const question = bankQuestions.find((item) => item.id === questionId);
    return sectionTotal + Number(question?.marks ?? 1);
  }, 0), 0);

  useEffect(() => {
    setFormData((previous) => previous.total_marks === selectedMarks ? previous : { ...previous, total_marks: selectedMarks });
  }, [selectedMarks]);

  const handleSubmit = (action: 'draft' | 'publish') => {
    // Only validate time for live tests
    if (formData.mode === 'live') {
      const start = new Date(formData.start_time);
      const end = new Date(formData.end_time);
      if (end <= start) {
        toast.error('End time must be after start time');
        return;
      }
    }

    startTransition(async () => {
      try {
        const data = new FormData();
        data.append('action', action);

        data.append('title', formData.title);
        data.append('description', formData.description);
        data.append('exam_type', formData.exam_type);
        data.append('max_attempts', formData.max_attempts.toString());
        data.append('allow_multiple', String(formData.allow_multiple));
        data.append('mode', formData.mode);
        data.append('due_date', formData.due_date);
        data.append('pattern', formData.pattern);
        data.append('duration_minutes', formData.duration_minutes.toString());
        data.append('total_marks', formData.total_marks.toString());
        data.append('passing_percentage', formData.passing_percentage.toString());

        if (formData.mode === 'live') {
          // Live test: use teacher-specified start/end times
          data.append('start_time', new Date(formData.start_time).toISOString());
          data.append('end_time', new Date(formData.end_time).toISOString());
        } else {
          // Assignment: always-available window
          data.append('start_time', new Date().toISOString());
          data.append('end_time', new Date('2099-12-31T23:59:59Z').toISOString());
        }

        data.append('target_branch', formData.target_branch);
        data.append('target_year', formData.target_year.toString());

        data.append('violation_threshold', formData.violation_threshold.toString());
        data.append('auto_submit_seconds', formData.auto_submit_seconds.toString());
        data.append('require_webcam', 'false'); // webcam not supported
        data.append('full_screen_required', String(formData.full_screen_required));
        data.append('disable_copy_paste', String(formData.disable_copy_paste));
        data.append('show_results_immediately', String(formData.show_results_immediately));
        data.append('show_instructions', String(showInstructions));
        data.append('require_acknowledgement', String(requireAcknowledgement));
        data.append('instructions', instructions);
        data.append('instructions_html', instructionsHtml);
        data.append('section_instructions', JSON.stringify(sectionInstructions));

        data.append('shuffle_questions', String(formData.shuffle_questions));
        data.append('shuffle_options', String(formData.shuffle_options));

        data.append('sections', JSON.stringify(formData.sections));

        const res = await createExam(data);

        toast.success(action === 'publish' ? 'Exam published successfully!' : 'Exam saved as draft.');
        
        if (action === 'publish' && res?.examId) {
          try {
            const inviteRes = await fetch('/api/teacher/exams/invite/generate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ examId: res.examId, maxUses: 0, expiresInHours: 72 })
            });
            const inviteData = await inviteRes.json();
            if (inviteData.success) {
              setInviteLink(inviteData.data.inviteUrl);
              setInviteLinkData(inviteData.data);
              setShowInviteModal(true);
            } else {
              router.push('/teacher/exams');
            }
          } catch (e) {
            router.push('/teacher/exams');
          }
        } else {
          router.push('/teacher/exams');
        }
      } catch (err: any) {
        toast.error(err.message || 'Failed to save exam');
      }
    });
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    toast.success('Invite link copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">

      {/* Wizard Progress */}
      <div className="flex items-center justify-between border-b border-muted pb-4">
        {[
          { num: 1, title: 'Details' },
          { num: 2, title: 'Sections' },
          { num: 3, title: 'Questions' },
          { num: 4, title: 'Instructions' },
          { num: 5, title: 'Advanced Settings' },
        ].map((s) => (
          <div key={s.num} className={`flex items-center gap-2 ${step === s.num ? 'text-primary font-bold' : step > s.num ? 'text-muted-foreground' : 'text-muted/50'}`}>
        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step === s.num ? 'bg-primary text-primary-foreground' : step > s.num ? 'bg-muted-foreground text-background' : 'bg-muted text-muted-foreground'}`}>
        {s.num}
      </div>
      <span className="hidden sm:inline">{s.title}</span>
    </div>
  ))
}
      </div >

  <Card className="rounded-none border-muted">
    <CardContent className="p-6">

      {step === 1 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">

          {/* Mode Selection */}
          <div className="space-y-3">
            <Label className="font-bold text-base">Exam Mode</Label>
            <div className="grid grid-cols-2 gap-4">
              <div
                className={`p-4 border-2 cursor-pointer transition-all ${
                  formData.mode === 'live'
                    ? 'border-primary bg-primary/5'
                    : 'border-muted hover:border-primary/40'
                }`}
                onClick={() => setFormData(prev => ({ ...prev, mode: 'live', exam_type: 'general', max_attempts: 1, allow_multiple: false }))}
              >
                <div className="text-2xl mb-2">📝</div>
                <p className="font-bold text-sm">Live Test</p>
                <p className="text-xs text-muted-foreground mt-1">Timed, proctored, strict rules.</p>
              </div>
              <div
                className={`p-4 border-2 cursor-pointer transition-all ${
                  formData.mode === 'assignment'
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20'
                    : 'border-muted hover:border-emerald-400/50'
                }`}
                onClick={() => setFormData(prev => ({ ...prev, mode: 'assignment', exam_type: 'assignment', max_attempts: 3, allow_multiple: true }))}
              >
                <div className="text-2xl mb-2">📄</div>
                <p className="font-bold text-sm">Assignment</p>
                <p className="text-xs text-muted-foreground mt-1">Practice, no time limit, flexible.</p>
              </div>
            </div>
            
            {formData.mode === 'assignment' && (
              <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 p-3 space-y-3">
                <p className="text-xs text-emerald-700 dark:text-emerald-300">
                  📄 Assignments are always available to students. Set an optional due date below.
                </p>
                <div className="flex-1">
                  <Label className="block text-sm font-medium text-emerald-800 dark:text-emerald-200 mb-1">
                    Max Attempts
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    value={formData.max_attempts}
                    onChange={(e) => {
                      const val = Math.max(1, parseInt(e.target.value) || 1);
                      setFormData(prev => ({ ...prev, max_attempts: val, allow_multiple: val > 1 }));
                    }}
                    className="w-full bg-white dark:bg-black border-emerald-200 focus-visible:ring-emerald-500"
                  />
                  <p className="text-xs text-emerald-700/70 dark:text-emerald-400/70 mt-1">
                    Students can take this assignment up to {formData.max_attempts} times. Best attempt will be recorded.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Exam Title</Label>
            <Input
              className="rounded-none focus-visible:ring-1"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="e.g. Midterm Computer Science"
            />
          </div>
          <div className="space-y-2">
            <Label>Description (Optional)</Label>
            <Textarea
              className="rounded-none focus-visible:ring-1"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {formData.mode === 'live' ? (
              <>
                <div className="space-y-2">
                  <Label>Start Time</Label>
                  <Input
                    type="datetime-local"
                    className="rounded-none focus-visible:ring-1"
                    value={formData.start_time}
                    onChange={(e) => {
                      const newStartTime = e.target.value;
                      setFormData(prev => ({ ...prev, start_time: newStartTime }));
                      if (formData.duration_minutes) {
                        autoCalculateEndTime(newStartTime, formData.duration_minutes);
                      }
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Duration (Minutes)</Label>
                  <Input
                    type="number"
                    className="rounded-none focus-visible:ring-1"
                    value={formData.duration_minutes}
                    onChange={(e) => {
                      const newDuration = parseInt(e.target.value) || 0;
                      setFormData(prev => ({ ...prev, duration_minutes: newDuration }));
                      if (formData.start_time && newDuration > 0) {
                        autoCalculateEndTime(formData.start_time, newDuration);
                      }
                    }}
                    placeholder="e.g., 60, 120, 180"
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Time (Auto-calculated)</Label>
                  <Input
                    type="datetime-local"
                    className="rounded-none bg-gray-100 dark:bg-zinc-900 text-muted-foreground focus-visible:ring-0 cursor-not-allowed"
                    value={formData.end_time}
                    readOnly
                  />
                  <p className="text-xs text-muted-foreground">
                    Automatically calculated from start time + duration
                  </p>
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <Label>Due Date (Optional)</Label>
                <Input
                  type="datetime-local"
                  className="rounded-none focus-visible:ring-1"
                  value={formData.due_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  If set, students will see the due date. No automatic locking.
                </p>
              </div>
            )}
            {/* Target Audience Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="space-y-2">
                <Label>Target Branch</Label>
                <select
                  className="w-full bg-background border border-muted p-2.5 rounded-none text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  value={formData.target_branch}
                  onChange={(e) => setFormData(prev => ({ ...prev, target_branch: e.target.value }))}
                >
                  <option value="all">All Branches</option>
                  <option value="CSE">CSE</option>
                  <option value="AIML">AIML</option>
                  <option value="ECE">ECE</option>
                  <option value="ME">ME</option>
                  <option value="CE">CE</option>
                  <option value="EE">EE</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Passing Year</Label>
                <select
                  className="w-full bg-background border border-muted p-2.5 rounded-none text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  value={formData.target_year}
                  onChange={(e) => setFormData(prev => ({ ...prev, target_year: parseInt(e.target.value) }))}
                >
                  <option value={0}>All Years</option>
                  <option value={2024}>2024</option>
                  <option value={2025}>2025</option>
                  <option value={2026}>2026</option>
                  <option value={2027}>2027</option>
                  <option value={2028}>2028</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold text-foreground">Exam Sections</h3>
              <p className="text-sm text-muted-foreground">Add sections to organize your exam questions.</p>
            </div>
            <Button 
              type="button" 
              onClick={handleOpenAddSection} 
              className="rounded-none bg-primary text-primary-foreground font-bold text-xs"
            >
              <Plus className="w-4 h-4 mr-2" /> Add Section
            </Button>
          </div>

          {formData.sections.length === 0 ? (
            <div className="p-12 border-2 border-dashed border-muted text-center flex flex-col items-center">
              <LayoutGrid className="w-8 h-8 text-muted-foreground mb-4 opacity-50" />
              <p className="font-medium">No sections added yet.</p>
              <p className="text-sm text-muted-foreground">Click "Add Section" to create your first section.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {formData.sections.map((section, index) => (
                <Card key={index} className="rounded-none border-muted bg-card hover:border-primary/50 transition-colors">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-md font-bold text-foreground flex justify-between items-start">
                      <span>{section.name}</span>
                      <span className="text-xs font-mono text-muted-foreground font-normal bg-muted px-2 py-0.5 border border-muted">
                        Index: {section.order_index}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 pb-4">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Shuffle Questions:</span>
                      <span className="font-semibold text-foreground">{section.shuffle_questions ? 'Yes' : 'No'}</span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Questions Linked:</span>
                      <span className="font-semibold text-primary">{section.question_ids.length} Selected</span>
                    </div>
                  </CardContent>
                  <CardFooter className="pt-2 pb-4 bg-muted/10 flex justify-end gap-2 border-t border-muted">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => handleOpenEditSection(index)}
                      className="h-8 rounded-none border-muted text-xs font-bold px-3"
                    >
                      <Edit className="w-3.5 h-3.5 mr-1" /> Edit
                    </Button>
                    <Button 
                      type="button" 
                      variant="destructive" 
                      onClick={() => handleDeleteSection(index)}
                      className="h-8 rounded-none text-xs font-bold px-3"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {step === 3 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
          <div>
            <h3 className="text-lg font-bold text-foreground">Select Section Questions</h3>
            <p className="text-sm text-muted-foreground">Select questions from your banks to add to your sections.</p>
          </div>

          {formData.sections.length === 0 ? (
            <div className="p-8 border border-muted text-center text-muted-foreground">
              Please go back to Step 2 and add at least one section before picking questions.
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-wrap gap-2 border-b border-muted pb-2">
                {formData.sections.map((sec, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedSectionIdx(idx)}
                    className={`px-4 py-2 border text-xs font-bold transition-all ${
                      selectedSectionIdx === idx
                        ? 'bg-primary border-primary text-primary-foreground'
                        : 'bg-background border-muted text-muted-foreground hover:bg-muted/30'
                    }`}
                  >
                    {sec.name} ({sec.question_ids.length} Selected)
                  </button>
                ))}
              </div>

              {formData.sections[selectedSectionIdx] && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-muted/20 p-4 border border-muted">
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        Configure questions for: {formData.sections[selectedSectionIdx].name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formData.sections[selectedSectionIdx].question_ids.length} questions selected for this section.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Label className="text-xs font-bold text-foreground whitespace-nowrap">Select Bank:</Label>
                      <select
                        value={selectedBankId}
                        onChange={(e) => handleBankChange(e.target.value)}
                        className="bg-background border border-muted p-2 rounded-none text-xs focus:outline-none focus:ring-1 focus:ring-primary min-w-[200px]"
                      >
                        <option value="">Select Question Bank...</option>
                        {questionBanks.map((bank) => (
                          <option key={bank.id} value={bank.id}>
                            {bank.name} ({bank._count?.questions || 0} Questions)
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {selectedBankId === '' ? (
                    <div className="p-12 border-2 border-dashed border-muted text-center text-muted-foreground text-sm">
                      Choose a Question Bank from the dropdown above to browse and link questions.
                    </div>
                  ) : isLoadingQuestions ? (
                    <div className="p-12 text-center flex flex-col items-center justify-center gap-2 text-muted-foreground">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                      <p className="text-sm">Loading bank questions...</p>
                    </div>
                  ) : bankQuestions.length === 0 ? (
                    <div className="p-12 border border-muted text-center text-muted-foreground text-sm bg-muted/10">
                      No questions found in this question bank.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      <div className="col-span-1">
                        <div className="bg-background rounded-xl border border-muted p-4">
                          <TopicManager
                            onTopicSelect={setSelectedTopicFilter}
                            selectedTopicId={selectedTopicFilter}
                          />
                        </div>
                      </div>
                      <div className="col-span-1 md:col-span-3">
                        <div className="border border-muted divide-y divide-muted max-h-[600px] overflow-y-auto bg-card">
                          {bankQuestions
                            .filter((q) => selectedTopicFilter ? q.topic_id === selectedTopicFilter : true)
                            .map((q) => {
                            const isChecked = formData.sections[selectedSectionIdx].question_ids.includes(q.id);
                            return (
                              <div 
                                key={q.id} 
                                onClick={() => handleToggleQuestion(q.id)}
                                className={`p-4 flex gap-3 items-start cursor-pointer transition-colors ${
                                  isChecked ? 'bg-primary/5' : 'hover:bg-muted/20'
                                }`}
                              >
                                <Checkbox 
                                  checked={isChecked}
                                  onCheckedChange={() => handleToggleQuestion(q.id)} 
                                  className="mt-1"
                                />
                                <div className="flex-1 space-y-1">
                                  <QuestionPreview 
                                    question={q} 
                                    showAnswer={false}
                                    showMetadata={false}
                                  />
                                  <div className="flex gap-2 text-[10px]">
                                    <span className="capitalize px-1.5 py-0.5 bg-muted font-mono border border-muted text-muted-foreground">
                                      {q.type.replace('_', ' ')}
                                    </span>
                                    <span className="capitalize px-1.5 py-0.5 bg-muted font-mono border border-muted text-muted-foreground">
                                      Difficulty: {q.difficulty}
                                    </span>
                                    {q.topics?.name && (
                                      <span className="px-1.5 py-0.5 bg-muted font-mono border border-muted text-muted-foreground">
                                        Topic: {q.topics.name}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                          {bankQuestions.filter((q) => selectedTopicFilter ? q.topic_id === selectedTopicFilter : true).length === 0 && (
                            <div className="p-12 text-center text-muted-foreground text-sm">
                              No questions match the selected topic.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {step === 4 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-muted pb-4">
            <div>
              <h3 className="text-lg font-bold flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Exam Instructions
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Customize instructions that students will see before starting the exam
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-end sm:items-center gap-4">
              <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer">
                <Checkbox
                  checked={showInstructions}
                  onCheckedChange={(c) => setShowInstructions(!!c)}
                />
                Show Instructions
              </label>
              <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer">
                <Checkbox
                  checked={requireAcknowledgement}
                  onCheckedChange={(c) => setRequireAcknowledgement(!!c)}
                />
                Require Acknowledgement
              </label>
            </div>
          </div>

          {showInstructions && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div className="space-y-3">
                <Label className="text-base font-semibold text-foreground">General Instructions</Label>
                <InstructionsEditor
                  value={instructions}
                  onChange={(html, text) => {
                    setInstructionsHtml(html);
                    setInstructions(text);
                  }}
                  placeholder="Enter exam instructions here. Include details about duration, marking scheme, etc."
                />
              </div>

              {formData.sections.length > 1 && (
                <div className="space-y-4">
                  <h4 className="font-semibold text-foreground border-b border-muted pb-2">
                    Section-Specific Instructions (Optional)
                  </h4>
                  <div className="grid gap-4 md:grid-cols-2">
                    {formData.sections.map((section, index) => (
                      <div key={index} className="border border-muted bg-card rounded-lg p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                          <h5 className="font-bold text-sm text-primary">
                            Section {index + 1}: {section.name}
                          </h5>
                          <span className="text-xs font-semibold bg-muted px-2 py-1 rounded text-muted-foreground">
                            {section.question_ids.length} questions
                          </span>
                        </div>
                        <InstructionsEditor
                          value={sectionInstructions[index]?.text || ''}
                          onChange={(html, text) => {
                            setSectionInstructions(prev => ({
                              ...prev,
                              [index]: { html, text },
                            }));
                          }}
                          placeholder="Add specific rules for this section..."
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {step === 5 && (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">

          {/* Proctoring Rules Panel */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-muted pb-2">
              <ShieldAlert className="w-5 h-5 text-primary" />
              <h3 className="font-bold text-lg">Proctoring Rules</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div className={`p-4 border ${formData.full_screen_required ? 'border-primary bg-primary/5' : 'border-muted'} cursor-pointer hover:border-primary/50 transition-colors`}
                onClick={() => setFormData(prev => ({ ...prev, full_screen_required: !prev.full_screen_required }))}>
                <div className="flex items-center gap-2 mb-2">
                  <Checkbox checked={formData.full_screen_required} />
                  <Label className="font-semibold cursor-pointer flex items-center gap-1"><Monitor className="w-3 h-3" /> Full Screen</Label>
                </div>
                <p className="text-xs text-muted-foreground pl-6">Forces browser into full-screen mode during assessment.</p>
              </div>

              <div className={`p-4 border ${formData.disable_copy_paste ? 'border-primary bg-primary/5' : 'border-muted'} cursor-pointer hover:border-primary/50 transition-colors`}
                onClick={() => setFormData(prev => ({ ...prev, disable_copy_paste: !prev.disable_copy_paste }))}>
                <div className="flex items-center gap-2 mb-2">
                  <Checkbox checked={formData.disable_copy_paste} />
                  <Label className="font-semibold cursor-pointer flex items-center gap-1"><CopyX className="w-3 h-3" /> Disable Copy/Paste</Label>
                </div>
                <p className="text-xs text-muted-foreground pl-6">Prevents clipboard operations & keyboard shortcuts.</p>
              </div>
            </div>

            <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/50 p-4 space-y-4">
              <div className="flex items-center gap-2 text-orange-700 dark:text-orange-400 font-bold mb-2">
                <AlertCircle className="w-4 h-4" />
                Violation Settings
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-orange-900 dark:text-orange-200">Maximum Violations Allowed</Label>
                  <Input
                    type="number"
                    min="1"
                    className="rounded-none border-orange-200 bg-white dark:bg-black focus-visible:ring-1 focus-visible:ring-orange-500"
                    value={formData.violation_threshold}
                    onChange={(e) => setFormData(prev => ({ ...prev, violation_threshold: parseInt(e.target.value) || 3 }))}
                  />
                  <p className="text-xs text-orange-700/70 dark:text-orange-400/70">
                    Tracks tab switches, window blur, and application changes.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-orange-900 dark:text-orange-200">Auto-Submit Grace Period (Seconds)</Label>
                  <Input
                    type="number"
                    min="0"
                    className="rounded-none border-orange-200 bg-white dark:bg-black focus-visible:ring-1 focus-visible:ring-orange-500"
                    value={formData.auto_submit_seconds}
                    onChange={(e) => setFormData(prev => ({ ...prev, auto_submit_seconds: parseInt(e.target.value) || 15 }))}
                  />
                  <p className="text-xs text-orange-700/70 dark:text-orange-400/70">
                    If a user leaves the tab, auto-submit countdown triggers.
                  </p>
                </div>
              </div>
            </div>
          </div>

{/* Results & Navigation */ }
<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
  <div className="space-y-4">
    <div className="flex items-center gap-2 border-b border-muted pb-2">
      <EyeOff className="w-5 h-5 text-primary" />
      <h3 className="font-bold text-lg">Results Publishing</h3>
    </div>
    <div className="flex items-start gap-3 pt-2">
      <Checkbox
        id="pub_results"
        checked={formData.show_results_immediately}
        onCheckedChange={(c) => setFormData(prev => ({ ...prev, show_results_immediately: !!c }))}
      />
      <div>
        <Label htmlFor="pub_results" className="font-semibold cursor-pointer">Publish Results Immediately</Label>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          Students will see their score as soon as they submit. If disabled, you can manually publish results from the dashboard later.
        </p>
      </div>
    </div>
  </div>

  {/* Instructions Toggle */}
  <div className="space-y-4">
    <div className="flex items-center gap-2 border-b border-muted pb-2">
      <FileText className="w-5 h-5 text-primary" />
      <h3 className="font-bold text-lg">Student Instructions</h3>
    </div>
    <div className="flex items-start gap-3 pt-2">
      <Checkbox
        id="show_instructions"
        checked={showInstructions}
        onCheckedChange={(c) => setShowInstructions(!!c)}
      />
      <div>
        <Label htmlFor="show_instructions" className="font-semibold cursor-pointer">Show Instructions Before Exam</Label>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          Students will see a pre-exam instructions and system readiness page before starting. Disable for practice tests or quick assessments where instructions are not needed.
        </p>
      </div>
    </div>
  </div>

  <div className="space-y-4">
    <div className="flex items-center gap-2 border-b border-muted pb-2">
      <LayoutGrid className="w-5 h-5 text-primary" />
      <h3 className="font-bold text-lg">Navigation Rules</h3>
    </div>
    <div className="space-y-3 pt-2">
      <div className="flex items-center gap-2">
        <Checkbox
          id="shuff_q"
          checked={formData.shuffle_questions}
          onCheckedChange={(c) => setFormData(prev => ({ ...prev, shuffle_questions: !!c }))}
        />
        <Label htmlFor="shuff_q" className="cursor-pointer">Shuffle Questions</Label>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox
          id="shuff_opt"
          checked={formData.shuffle_options}
          onCheckedChange={(c) => setFormData(prev => ({ ...prev, shuffle_options: !!c }))}
        />
        <Label htmlFor="shuff_opt" className="cursor-pointer">Shuffle Options</Label>
      </div>
    </div>
  </div>
</div>

            </div >
          )}
          
        </CardContent >
  <CardFooter className="p-4 bg-muted/10 border-t border-muted flex justify-between items-center">
    <Button
      variant="outline"
      className="rounded-none"
      onClick={step === 1 ? () => router.push('/teacher/exams') : handleBack}
      disabled={isPending}
    >
      {step === 1 ? 'Cancel' : <><ArrowLeft className="w-4 h-4 mr-2" /> Back</>}
    </Button>

    <div className="flex gap-3">
      {step < 5 ? (
        <Button className="rounded-none" onClick={handleNext}>
          Continue <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      ) : (
        <>
          <Button
            variant="outline"
            className="rounded-none"
            disabled={isPending}
            onClick={() => handleSubmit('draft')}
          >
            <Save className="w-4 h-4 mr-2" /> Save Draft
          </Button>
          <Button
            className="rounded-none bg-green-600 hover:bg-green-700 text-white"
            disabled={isPending}
            onClick={() => handleSubmit('publish')}
          >
            {isPending ? 'Processing...' : <><Play className="w-4 h-4 mr-2" /> Publish Exam</>}
          </Button>
        </>
      )}
    </div>
  </CardFooter>
      </Card >

      <Dialog open={isSectionModalOpen} onOpenChange={setIsSectionModalOpen}>
        <DialogContent className="rounded-none border-muted bg-card max-w-md animate-in fade-in zoom-in-95">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">
              {editingSectionIndex !== null ? 'Edit Section' : 'Add Section'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveSection} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-foreground">Section Name *</Label>
              <Input
                value={sectionForm.name}
                onChange={(e) => setSectionForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. Quantitative Aptitude"
                className="rounded-none border-muted"
              />
            </div>
            
            <div className="flex items-center gap-2 pt-2">
              <Checkbox
                id="shuff_sec"
                checked={sectionForm.shuffle_questions}
                onCheckedChange={(c) => setSectionForm(prev => ({ ...prev, shuffle_questions: !!c }))}
              />
              <Label htmlFor="shuff_sec" className="cursor-pointer text-xs font-semibold">
                Shuffle questions within this section
              </Label>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-muted">
              <Button type="button" variant="outline" onClick={() => setIsSectionModalOpen(false)} className="rounded-none border-muted text-xs font-bold">
                Cancel
              </Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-none text-xs">
                Save Section
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showInviteModal} onOpenChange={(open) => {
        if (!open) {
          setShowInviteModal(false);
          router.push('/teacher/exams');
        }
      }}>
        <DialogContent className="rounded-none border-muted bg-card max-w-md animate-in fade-in zoom-in-95">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <CheckCircle className="w-6 h-6 text-green-500" />
              Exam Published!
            </DialogTitle>
            <DialogDescription>
              Your exam has been created and published successfully. Share this invite link with your students.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex gap-2">
              <Input 
                value={inviteLink} 
                readOnly 
                className="rounded-none bg-muted font-mono text-xs" 
              />
              <Button onClick={handleCopyLink} variant="outline" className="rounded-none w-24">
                {copied ? 'Copied!' : 'Copy'}
              </Button>
            </div>
            <div className="bg-muted/30 p-3 rounded-none border border-muted text-xs space-y-1">
              <p><strong>Expires:</strong> {inviteLinkData?.expiresAt ? new Date(inviteLinkData.expiresAt).toLocaleString() : 'Never'}</p>
              <p><strong>Limit:</strong> {inviteLinkData?.maxUses ? `${inviteLinkData.maxUses} uses` : 'Unlimited'}</p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => {
              setShowInviteModal(false);
              router.push('/teacher/exams');
            }} className="rounded-none w-full bg-primary hover:bg-primary/90">
              Go to Dashboard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div >
  );
}
