'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createTenant, toggleTenantStatus, deleteTenant } from '@/app/actions/super';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import StatsCard from '@/components/dashboard/StatsCard';
import { Users, Server, Shield, Activity, Plus, Trash2, ShieldAlert, Cpu } from 'lucide-react';

interface TenantPanelProps {
  initialTenants: any[];
  studentCount: number;
  activeExamsCount: number;
}

const MODULES = [
  { code: 'core', name: 'Core Engine (Mandatory)' },
  { code: 'advanced_questions', name: 'Advanced Question Types' },
  { code: 'exam_patterns', name: 'Exam Patterns (GATE/Univ)' },
  { code: 'code_execution', name: 'Code Execution' },
  { code: 'live_proctoring', name: 'Live Proctoring' },
  { code: 'ai_questions', name: 'AI Question Generator' },
  { code: 'ai_evaluations', name: 'AI Answer Evaluation' },
  { code: 'notifications', name: 'Notification Suite' },
  { code: 'analytics', name: 'Advanced Analytics' },
  { code: 'compliance', name: 'Compliance & Reports' },
  { code: 'white_label', name: 'Advanced White-Label' },
  { code: 'api_integration', name: 'API & Integration' },
  { code: 'bulk_ops', name: 'Bulk Operations' },
];

const PLAN_MODULES: Record<string, string[]> = {
  starter: ['core', 'advanced_questions', 'bulk_ops'],
  gate: ['core', 'advanced_questions', 'exam_patterns', 'ai_questions', 'bulk_ops', 'notifications'],
  college: [
    'core',
    'advanced_questions',
    'exam_patterns',
    'ai_questions',
    'ai_evaluations',
    'code_execution',
    'analytics',
    'notifications',
    'compliance',
    'white_label',
  ],
  enterprise: [
    'core',
    'advanced_questions',
    'exam_patterns',
    'ai_questions',
    'ai_evaluations',
    'code_execution',
    'live_proctoring',
    'analytics',
    'notifications',
    'compliance',
    'white_label',
    'api_integration',
    'bulk_ops',
  ],
};

export default function TenantPanel({ initialTenants, studentCount, activeExamsCount }: TenantPanelProps) {
  const router = useRouter();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('starter');
  const [enabledModules, setEnabledModules] = useState<string[]>(['core', 'advanced_questions', 'bulk_ops']);

  // Sync checkboxes when the plan select changes
  useEffect(() => {
    const modules = PLAN_MODULES[selectedPlan] || PLAN_MODULES.starter;
    setEnabledModules(modules);
  }, [selectedPlan]);

  const handleModuleToggle = (code: string) => {
    if (code === 'core') return; // Cannot toggle core
    setEnabledModules(prev => 
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  const handleCreateTenant = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    // Explicitly add enabled modules as list entries
    formData.delete('modules');
    enabledModules.forEach(mod => formData.append('modules', mod));

    try {
      const res = await createTenant(formData);
      if (res.success) {
        toast.success('Tenant successfully provisioned!');
        setShowCreateModal(false);
        router.refresh();
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to create tenant');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      const res = await toggleTenantStatus(id, currentStatus);
      if (res.success) {
        toast.success(`Tenant status successfully ${currentStatus ? 'suspended' : 'activated'}!`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to toggle tenant status');
    }
  };

  const handleDeleteTenant = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this tenant? This action will destroy all associated users, courses, and data, and cannot be undone.')) {
      return;
    }

    try {
      const res = await deleteTenant(id);
      if (res.success) {
        toast.success('Tenant deleted successfully!');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete tenant');
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header and Page Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-xs text-muted-foreground mt-1">Platform management and provisioning console</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} className="flex items-center space-x-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
          <Plus className="h-4 w-4" />
          <span>Provision Tenant</span>
        </Button>
      </div>

      {/* 2. Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatsCard title="Total Tenants" value={initialTenants.length} description="Active & suspended domains" icon={Server} />
        <StatsCard title="Total Active Exams" value={activeExamsCount} description="Exams created across all tenants" icon={Activity} />
        <StatsCard title="Total Students" value={studentCount} description="Across all onboarded tenants" icon={Users} />
        
        {/* System CPU/Memory gauge summary */}
        <Card className="border border-muted bg-card">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">System Health</p>
              <div className="flex items-center space-x-2">
                <Cpu className="h-4 w-4 text-secondary" />
                <span className="text-sm font-bold text-foreground">CPU: 24%</span>
              </div>
              <div className="flex items-center space-x-2">
                <Server className="h-4 w-4 text-primary" />
                <span className="text-sm font-bold text-foreground">RAM: 3.2 GB</span>
              </div>
            </div>
            <div className="h-10 w-10 bg-secondary/10 flex items-center justify-center text-secondary">
              <Activity className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Tenant Directory */}
      <Card className="border border-muted bg-card">
        <CardHeader>
          <CardTitle className="text-lg font-bold">Onboarded Institutes</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">List of all customer database tenants and their configuration states</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-muted bg-muted/20 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  <th className="px-6 py-3">Institute Name</th>
                  <th className="px-6 py-3">Subdomain (Slug)</th>
                  <th className="px-6 py-3">Subscription</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Enabled Modules</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-muted">
                {initialTenants.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-muted-foreground">
                      No tenants onboarded yet. Click "Provision Tenant" to start.
                    </td>
                  </tr>
                ) : (
                  initialTenants.map((tenant) => (
                    <tr key={tenant.id} className="hover:bg-muted/10 text-foreground">
                      <td className="px-6 py-4 font-bold">{tenant.name}</td>
                      <td className="px-6 py-4 text-xs font-semibold text-primary">{tenant.slug}.localhost</td>
                      <td className="px-6 py-4 text-xs uppercase font-bold">{tenant.subscription_plan}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-0.5 text-[10px] font-bold uppercase ${
                          tenant.is_active ? 'bg-secondary/15 text-secondary' : 'bg-destructive/15 text-destructive'
                        }`}>
                          {tenant.is_active ? 'Active' : 'Suspended'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {tenant.modules_enabled.map((mod: string) => (
                            <span key={mod} className="px-1.5 py-0.5 bg-muted text-muted-foreground text-[10px] font-medium border border-border">
                              {mod}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleStatus(tenant.id, tenant.is_active)}
                          className="text-xs py-1"
                        >
                          {tenant.is_active ? 'Suspend' : 'Activate'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteTenant(tenant.id)}
                          className="text-destructive hover:bg-destructive/15 hover:text-destructive h-8 w-8"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 4. Creation Modal / slide-over form */}
      {showCreateModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <Card className="w-full max-w-2xl border-2 border-muted shadow-2xl bg-card overflow-hidden">
            <CardHeader className="border-b border-muted bg-muted/10 pb-4">
              <CardTitle className="text-xl font-bold flex items-center space-x-2">
                <Server className="h-5 w-5 text-primary" />
                <span>Provision New Institute Database Tenant</span>
              </CardTitle>
              <CardDescription className="text-xs">Setup isolated schema credentials and active features packages</CardDescription>
            </CardHeader>
            <form onSubmit={handleCreateTenant}>
              <CardContent className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                {/* Basic info section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Institute Name</label>
                    <Input type="text" name="name" required placeholder="e.g. Allenhouse Institute" disabled={isSubmitting} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Subdomain Slug</label>
                    <Input type="text" name="slug" required placeholder="e.g. allenhouse" disabled={isSubmitting} />
                  </div>
                </div>

                {/* Admin credentials */}
                <div className="border-t border-muted pt-4 space-y-4">
                  <h4 className="text-sm font-bold text-foreground">Initial Admin Account Credentials</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Admin Full Name</label>
                      <Input type="text" name="adminFullName" required placeholder="Dr. Sanjay Singh" disabled={isSubmitting} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Admin Email</label>
                      <Input type="email" name="adminEmail" required placeholder="admin@allenhouse.in" disabled={isSubmitting} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Admin Password</label>
                      <Input type="password" name="adminPassword" required placeholder="••••••••" disabled={isSubmitting} />
                    </div>
                  </div>
                </div>

                {/* Sub Plan Selection */}
                <div className="border-t border-muted pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Subscription Plan</label>
                    <select
                      name="plan"
                      value={selectedPlan}
                      onChange={(e) => setSelectedPlan(e.target.value)}
                      disabled={isSubmitting}
                      className="flex h-9 w-full border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="starter">Starter Plan (MCQ Core)</option>
                      <option value="gate">GATE Coaching Pack</option>
                      <option value="college">Engineering College Suite</option>
                      <option value="enterprise">Full Enterprise Package</option>
                    </select>
                  </div>
                </div>

                {/* White-Label Settings */}
                <div className="border-t border-muted pt-4 space-y-4">
                  <h4 className="text-sm font-bold text-foreground">Institute White-Label & Branding Configurations</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Logo URL</label>
                      <Input type="text" name="logoUrl" placeholder="https://example.com/logo.png" disabled={isSubmitting} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Favicon URL</label>
                      <Input type="text" name="faviconUrl" placeholder="https://example.com/favicon.ico" disabled={isSubmitting} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Primary Theme Color</label>
                      <Input type="text" name="primaryColor" defaultValue="#2563EB" placeholder="#2563EB" disabled={isSubmitting} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Secondary Theme Color</label>
                      <Input type="text" name="secondaryColor" defaultValue="#7C3AED" placeholder="#7C3AED" disabled={isSubmitting} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Custom CSS overrides</label>
                    <textarea
                      name="customCss"
                      placeholder="/* Custom CSS overrides here */"
                      disabled={isSubmitting}
                      className="flex min-h-[60px] w-full border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Custom Email Template</label>
                      <textarea
                        name="emailTemplate"
                        placeholder="Thank you for taking the exam..."
                        disabled={isSubmitting}
                        className="flex min-h-[60px] w-full border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Custom SMS Template</label>
                      <textarea
                        name="smsTemplate"
                        placeholder="Your OTP is {otp}"
                        disabled={isSubmitting}
                        className="flex min-h-[60px] w-full border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </div>
                  </div>
                </div>

                {/* Modules Toggle checkboxes */}
                <div className="border-t border-muted pt-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Module Registry Configuration</label>
                    <span className="text-[10px] text-primary font-bold">Plan pre-selections applied</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {MODULES.map((mod) => {
                      const isCore = mod.code === 'core';
                      const isChecked = enabledModules.includes(mod.code);
                      return (
                        <div
                          key={mod.code}
                          onClick={() => !isCore && handleModuleToggle(mod.code)}
                          className={`flex items-center space-x-3 p-2.5 border transition-all cursor-pointer select-none ${
                            isChecked ? 'border-primary/50 bg-primary/5' : 'border-muted bg-transparent'
                          } ${isCore ? 'opacity-80 cursor-not-allowed' : ''}`}
                        >
                          <input
                            type="checkbox"
                            disabled={isCore || isSubmitting}
                            checked={isChecked}
                            onChange={() => {}} // Controlled via click handler
                            className="h-4 w-4 text-primary border-input bg-transparent focus:ring-primary accent-primary"
                          />
                          <span className="text-xs font-semibold text-foreground">{mod.name}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t border-muted bg-muted/10 p-4 flex justify-end space-x-2">
                <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
                  {isSubmitting ? 'Provisioning...' : 'Provision Tenant'}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
