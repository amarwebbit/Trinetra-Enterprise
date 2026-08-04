'use client';

import React, { useState, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { updateTeacherSettings } from '@/app/actions/teacher-actions';

interface SettingsUIProps {
  metadata: any;
}

export default function SettingsUI({ metadata }: SettingsUIProps) {
  const [isPending, startTransition] = useTransition();

  const [formData, setFormData] = useState({
    // Exam & Proctoring
    default_violation_threshold: metadata.default_violation_threshold ?? 5,
    default_auto_submit_seconds: metadata.default_auto_submit_seconds ?? 10,
    default_require_webcam: false, // webcam not supported
    default_full_screen_required: metadata.default_full_screen_required ?? false,
    default_disable_copy_paste: metadata.default_disable_copy_paste ?? false,
    default_show_results_immediately: metadata.default_show_results_immediately ?? false,
    default_passing_percentage: metadata.default_passing_percentage ?? 40,
    
    // Questions
    default_negative_marks_enabled: metadata.default_negative_marks_enabled ?? true,
    default_negative_marks_value: metadata.default_negative_marks_value ?? 0.25,
    default_marks: metadata.default_marks ?? 1,
    default_difficulty: metadata.default_difficulty ?? 'medium',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        const data = new FormData();
        // Exam
        data.append('default_violation_threshold', formData.default_violation_threshold.toString());
        data.append('default_auto_submit_seconds', formData.default_auto_submit_seconds.toString());
        data.append('default_require_webcam', 'false'); // webcam not supported
        data.append('default_full_screen_required', String(formData.default_full_screen_required));
        data.append('default_disable_copy_paste', String(formData.default_disable_copy_paste));
        data.append('default_show_results_immediately', String(formData.default_show_results_immediately));
        data.append('default_passing_percentage', formData.default_passing_percentage.toString());
        
        // Questions
        data.append('default_negative_marks_enabled', String(formData.default_negative_marks_enabled));
        data.append('default_negative_marks_value', formData.default_negative_marks_value.toString());
        data.append('default_marks', formData.default_marks.toString());
        data.append('default_difficulty', formData.default_difficulty);

        await updateTeacherSettings(data);
        toast.success('Settings saved successfully');
      } catch (err: any) {
        toast.error(err.message || 'Failed to save settings');
      }
    });
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        
        <Card className="rounded-none border-muted">
          <CardHeader className="bg-muted/10 border-b border-muted">
            <CardTitle>📊 Exam Defaults</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Default Passing Percentage</Label>
                <Input 
                  type="number" 
                  step="1"
                  min="0"
                  max="100"
                  className="rounded-none border-muted focus-visible:ring-1 focus-visible:ring-primary w-32"
                  value={formData.default_passing_percentage}
                  onChange={(e) => setFormData(prev => ({ ...prev, default_passing_percentage: parseFloat(e.target.value) || 0 }))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-none border-muted">
          <CardHeader className="bg-muted/10 border-b border-muted">
            <CardTitle>🔒 Proctoring Defaults</CardTitle>
            <CardDescription>Configure security and anti-cheat mechanisms for exams.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Default Max Violations</Label>
                <Input 
                  type="number" 
                  min="1"
                  className="rounded-none border-muted focus-visible:ring-1 focus-visible:ring-primary"
                  value={formData.default_violation_threshold}
                  onChange={(e) => setFormData(prev => ({ ...prev, default_violation_threshold: parseInt(e.target.value) || 5 }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Default Auto-Submit Seconds</Label>
                <Input 
                  type="number" 
                  min="0"
                  className="rounded-none border-muted focus-visible:ring-1 focus-visible:ring-primary"
                  value={formData.default_auto_submit_seconds}
                  onChange={(e) => setFormData(prev => ({ ...prev, default_auto_submit_seconds: parseInt(e.target.value) || 10 }))}
                />
              </div>
            </div>
            
            <div className="space-y-3 pt-4 border-t border-muted">
              <div className="flex items-center gap-2">
                <Checkbox 
                  id="req_fullscreen" 
                  checked={formData.default_full_screen_required}
                  onCheckedChange={(c) => setFormData(prev => ({ ...prev, default_full_screen_required: !!c }))}
                />
                <Label htmlFor="req_fullscreen" className="cursor-pointer">Full Screen by Default</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox 
                  id="dis_copy" 
                  checked={formData.default_disable_copy_paste}
                  onCheckedChange={(c) => setFormData(prev => ({ ...prev, default_disable_copy_paste: !!c }))}
                />
                <Label htmlFor="dis_copy" className="cursor-pointer">Disable Copy/Paste by Default</Label>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-none border-muted">
          <CardHeader className="bg-muted/10 border-b border-muted">
            <CardTitle>📝 Question Defaults</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-6">
              <div className="space-y-4 bg-muted/5 border border-muted p-4">
                <div className="flex items-center gap-2">
                  <Checkbox 
                    id="default_neg_marks_toggle" 
                    checked={formData.default_negative_marks_enabled}
                    onCheckedChange={(c) => setFormData(prev => ({ ...prev, default_negative_marks_enabled: !!c }))}
                  />
                  <Label htmlFor="default_neg_marks_toggle" className="cursor-pointer font-semibold">
                    Enable Negative Marks by Default
                  </Label>
                </div>
                
                {formData.default_negative_marks_enabled && (
                  <div className="pl-6 space-y-2">
                    <Label>Default Negative Marks Value</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">-</span>
                      <Input 
                        type="number" 
                        step="0.01"
                        min="0"
                        className="rounded-none border-muted focus-visible:ring-1 focus-visible:ring-primary w-32"
                        value={formData.default_negative_marks_value}
                        onChange={(e) => setFormData(prev => ({ ...prev, default_negative_marks_value: parseFloat(e.target.value) || 0 }))}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Default Marks per Question</Label>
                  <Input 
                    type="number" 
                    step="0.5"
                    min="0"
                    className="rounded-none border-muted focus-visible:ring-1 focus-visible:ring-primary"
                    value={formData.default_marks}
                    onChange={(e) => setFormData(prev => ({ ...prev, default_marks: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Default Difficulty</Label>
                  <select 
                    className="w-full bg-background border border-muted p-2 rounded-none text-sm focus:outline-none focus:ring-1 focus:ring-primary capitalize"
                    value={formData.default_difficulty}
                    onChange={(e) => setFormData(prev => ({ ...prev, default_difficulty: e.target.value }))}
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-none border-muted">
          <CardHeader className="bg-muted/10 border-b border-muted">
            <CardTitle>📤 Results Defaults</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Checkbox 
                id="pub_immed" 
                checked={formData.default_show_results_immediately}
                onCheckedChange={(c) => setFormData(prev => ({ ...prev, default_show_results_immediately: !!c }))}
              />
              <Label htmlFor="pub_immed" className="cursor-pointer">Publish Results Immediately by Default</Label>
            </div>
          </CardContent>
        </Card>

        <Button type="submit" disabled={isPending} className="rounded-none" size="lg">
          {isPending ? 'Saving...' : 'Save Settings'}
        </Button>

      </form>
    </div>
  );
}
