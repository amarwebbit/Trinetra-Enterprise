'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { FileText, ArrowLeft, Plus, Edit3, Eye, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export interface EmailTemplateItem {
  id: string;
  key: string;
  title: string;
  channel: string;
  subject: string;
  variables: string[];
}

const TEMPLATES: EmailTemplateItem[] = [
  {
    id: 'tpl-1',
    key: 'exam_results',
    title: 'Exam Results Available Notification',
    channel: 'Email & WhatsApp',
    subject: 'Exam Results: {{exam_title}} is Available',
    variables: ['{{student_name}}', '{{exam_title}}', '{{score}}', '{{total_marks}}', '{{percentage}}', '{{download_link}}']
  },
  {
    id: 'tpl-2',
    key: 'exam_reminder',
    title: 'Scheduled Assessment Reminder',
    channel: 'Email & SMS',
    subject: 'Reminder: {{exam_title}} Starts at {{start_time}}',
    variables: ['{{student_name}}', '{{exam_title}}', '{{start_time}}', '{{duration}}']
  }
];

export default function NotificationTemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplateItem[]>(TEMPLATES);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4">
        <div>
          <Link href="/admin/notifications" className="text-xs text-primary hover:underline flex items-center gap-1 font-semibold mb-1">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Notification Suite
          </Link>
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight">Notification Template Library</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Customize email/SMS templates and merge field tags.</p>
        </div>
      </div>

      <div className="space-y-4">
        {templates.map((tpl) => (
          <div key={tpl.id} className="bg-card border border-border p-5 rounded-none space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 font-bold uppercase">
                {tpl.key}
              </span>
              <span className="text-[10px] font-bold text-muted-foreground">{tpl.channel}</span>
            </div>

            <h2 className="font-bold text-foreground text-sm">{tpl.title}</h2>
            <p className="text-xs font-mono text-muted-foreground">Subject: {tpl.subject}</p>

            <div className="pt-2 border-t border-border/60">
              <span className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">Supported Merge Tags:</span>
              <div className="flex flex-wrap gap-1.5">
                {tpl.variables.map((v) => (
                  <span key={v} className="bg-muted px-2 py-0.5 font-mono text-[10px] font-bold text-foreground">
                    {v}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
