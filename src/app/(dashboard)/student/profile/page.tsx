'use client';

import React, { useState } from 'react';
import { User, Mail, Shield, BookOpen, Save, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function StudentProfilePage() {
  const [name, setName] = useState('Ananya Sharma');
  const [email, setEmail] = useState('ananya.sharma@institution.ac.in');
  const [rollNo, setRollNo] = useState('CS2023001');
  const [department, setDepartment] = useState('Computer Science & Engineering');
  const [semester, setSemester] = useState('6th Semester');

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Student profile details updated successfully!');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="border-b border-border pb-4">
        <h1 className="text-2xl font-extrabold text-foreground tracking-tight">Student Profile Settings</h1>
        <p className="text-xs text-muted-foreground mt-1">Manage your institutional identity, contact info, and course enrollment credentials.</p>
      </div>

      <form onSubmit={handleSaveProfile} className="bg-card border border-border p-6 rounded-none space-y-4 text-xs shadow-sm">
        <div>
          <label className="block font-semibold text-foreground mb-1">Full Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-background border border-input p-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary rounded-none font-bold"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-foreground mb-1">Institutional Email</label>
            <input
              type="email"
              disabled
              value={email}
              className="w-full bg-muted border border-input p-2.5 text-muted-foreground rounded-none font-mono"
            />
          </div>
          <div>
            <label className="block font-semibold text-foreground mb-1">Roll Number</label>
            <input
              type="text"
              disabled
              value={rollNo}
              className="w-full bg-muted border border-input p-2.5 text-muted-foreground rounded-none font-mono font-bold"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-foreground mb-1">Department</label>
            <input
              type="text"
              disabled
              value={department}
              className="w-full bg-muted border border-input p-2.5 text-muted-foreground rounded-none"
            />
          </div>
          <div>
            <label className="block font-semibold text-foreground mb-1">Academic Term</label>
            <input
              type="text"
              disabled
              value={semester}
              className="w-full bg-muted border border-input p-2.5 text-muted-foreground rounded-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-end pt-3 border-t border-border">
          <Button type="submit" className="rounded-none bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-xs flex items-center gap-1.5">
            <Save className="h-4 w-4" />
            Save Profile Changes
          </Button>
        </div>
      </form>
    </div>
  );
}
