'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Settings, AlertTriangle, CheckCircle2, ShieldAlert, Link as LinkIcon } from 'lucide-react';
import { toast } from 'sonner';

type ModuleData = {
  id: string;
  code: string;
  name: string;
  description: string;
  price: number;
  dependsOn: string[];
  isCore: boolean;
  isEnabled: boolean;
  customLimits: any;
  usageCount: any;
  tenantOverageLimits: any;
};

type ModulesUIProps = {
  tenantId: string;
  tenantName: string;
  modules: ModuleData[];
  toggleModule: (tenantId: string, moduleId: string, enable: boolean) => Promise<{ success: boolean; error?: string }>;
  updateModuleLimits: (tenantId: string, moduleId: string, limits: any) => Promise<{ success: boolean; error?: string }>;
  resetModuleUsage: (tenantId: string, moduleId: string) => Promise<{ success: boolean; error?: string }>;
};

export default function ModulesUI({
  tenantId,
  tenantName,
  modules,
  toggleModule,
  updateModuleLimits,
  resetModuleUsage
}: ModulesUIProps) {
  
  const [loadingIds, setLoadingIds] = useState<Record<string, boolean>>({});
  const [editLimitsModal, setEditLimitsModal] = useState<ModuleData | null>(null);
  const [customLimitsDraft, setCustomLimitsDraft] = useState<string>('');

  const handleToggle = async (moduleId: string, currentStatus: boolean, isCore: boolean) => {
    if (isCore && currentStatus) {
      toast.error("Core modules cannot be disabled.");
      return;
    }

    setLoadingIds(prev => ({ ...prev, [moduleId]: true }));
    try {
      const res = await toggleModule(tenantId, moduleId, !currentStatus);
      if (res.success) {
        toast.success(`Module ${!currentStatus ? 'enabled' : 'disabled'} successfully.`);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to toggle module.');
    } finally {
      setLoadingIds(prev => ({ ...prev, [moduleId]: false }));
    }
  };

  const openLimitsModal = (mod: ModuleData) => {
    setEditLimitsModal(mod);
    setCustomLimitsDraft(JSON.stringify(mod.customLimits, null, 2));
  };

  const handleSaveLimits = async () => {
    if (!editLimitsModal) return;
    
    let parsedLimits;
    try {
      parsedLimits = JSON.parse(customLimitsDraft);
    } catch (e) {
      toast.error("Invalid JSON format");
      return;
    }

    setLoadingIds(prev => ({ ...prev, ['save_limits']: true }));
    try {
      const res = await updateModuleLimits(tenantId, editLimitsModal.id, parsedLimits);
      if (res.success) {
        toast.success("Limits updated successfully.");
        setEditLimitsModal(null);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to update limits.');
    } finally {
      setLoadingIds(prev => ({ ...prev, ['save_limits']: false }));
    }
  };

  // Helper to render usage progress bars
  const renderUsageBars = (mod: ModuleData) => {
    if (!mod.isEnabled) return null;

    // We look for usage keys, e.g., "ai_questions_used" or whatever is in usageCount
    const usageKeys = Object.keys(mod.usageCount || {});
    if (usageKeys.length === 0) {
      return (
        <div className="text-xs text-muted-foreground italic mt-2">
          No usage metrics tracked for this module yet.
        </div>
      );
    }

    return (
      <div className="mt-4 space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Usage Tracking</h4>
        {usageKeys.map(key => {
          const used = mod.usageCount[key] || 0;
          // Determine the limit: Priority is customLimits -> tenantOverageLimits
          // Note: This expects the limit key to drop the "_used" suffix if applicable, or be identical.
          // For generic matching, we'll try matching exact keys first.
          const limitKey = key.replace('_used', '');
          const limit = mod.customLimits?.[limitKey] || mod.tenantOverageLimits?.[limitKey] || 1000; // Fallback 1000
          
          const percentage = Math.min((used / limit) * 100, 100);
          const isOverage = used > limit;

          return (
            <div key={key} className="space-y-1">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-foreground capitalize">{key.replace(/_/g, ' ')}</span>
                <span className={isOverage ? 'text-red-500 font-bold' : 'text-primary'}>
                  {used} / {limit}
                </span>
              </div>
              <div className="w-full bg-muted/30 h-2 rounded-full overflow-hidden border border-muted">
                <div 
                  className={`h-full ${isOverage ? 'bg-red-500' : 'bg-primary'}`} 
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
              {isOverage && (
                <div className="flex items-center text-[10px] text-red-500 mt-1">
                  <AlertTriangle className="h-3 w-3 mr-1" /> Limit exceeded
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="animate-in fade-in zoom-in-95 duration-200">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {modules.map((mod) => (
          <Card key={mod.id} className={`border bg-card rounded-none transition-all duration-200 ${mod.isEnabled ? 'border-primary/50 shadow-sm' : 'border-muted opacity-80'}`}>
            <CardHeader className="pb-3 border-b border-muted">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    {mod.name}
                    {mod.isCore && (
                      <span className="px-1.5 py-0.5 bg-blue-500/10 text-blue-500 text-[9px] uppercase tracking-wider rounded-sm border border-blue-500/20">
                        Core
                      </span>
                    )}
                  </CardTitle>
                  <CardDescription className="text-xs mt-1">{mod.description}</CardDescription>
                </div>
                
                {/* Toggle Switch Replacement (Input Checkbox styled as toggle) */}
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer"
                    checked={mod.isEnabled}
                    disabled={loadingIds[mod.id] || (mod.isCore && mod.isEnabled)}
                    onChange={() => handleToggle(mod.id, mod.isEnabled, mod.isCore)}
                  />
                  <div className="w-9 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>

              {mod.dependsOn && mod.dependsOn.length > 0 && (
                <div className="flex items-center gap-1 mt-3 text-[10px] text-muted-foreground">
                  <LinkIcon className="h-3 w-3" />
                  <span>Requires: <span className="font-bold text-foreground">{mod.dependsOn.join(', ')}</span></span>
                </div>
              )}
            </CardHeader>
            
            <CardContent className="p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-muted-foreground uppercase">Status</span>
                {mod.isEnabled ? (
                  <span className="flex items-center gap-1 text-xs font-bold text-green-500">
                    <CheckCircle2 className="h-4 w-4" /> Active
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs font-bold text-muted-foreground">
                    Inactive
                  </span>
                )}
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-muted-foreground uppercase">Pricing</span>
                <span className="text-xs font-bold text-foreground">
                  {mod.price > 0 ? `\$${mod.price.toFixed(2)}/mo` : 'Included'}
                </span>
              </div>

              {renderUsageBars(mod)}
            </CardContent>

            <CardFooter className="p-4 border-t border-muted bg-muted/10 flex justify-between">
              <Button 
                variant="outline" 
                size="sm" 
                className="text-xs rounded-none"
                onClick={() => openLimitsModal(mod)}
                disabled={!mod.isEnabled}
              >
                <Settings className="h-3 w-3 mr-2" />
                Configure Limits
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* Edit Limits Modal */}
      {editLimitsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <Card className="w-full max-w-md border border-muted bg-card rounded-none shadow-2xl animate-in fade-in zoom-in-95">
            <CardHeader className="border-b border-muted">
              <CardTitle className="text-lg font-bold">Custom Limits</CardTitle>
              <CardDescription>
                Override default limits for <strong>{editLimitsModal.name}</strong> on {tenantName}.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground">Limits Configuration (JSON)</label>
                <textarea 
                  className="flex min-h-[150px] w-full rounded-none border border-muted bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 font-mono"
                  value={customLimitsDraft}
                  onChange={(e) => setCustomLimitsDraft(e.target.value)}
                  placeholder='{"ai_evaluations": 5000}'
                />
                <p className="text-[10px] text-muted-foreground">Ensure the keys match the usage keys exactly (e.g. <code>ai_evaluations</code> limit matches <code>ai_evaluations_used</code> tracking).</p>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-2 border-t border-muted p-4">
              <Button variant="outline" onClick={() => setEditLimitsModal(null)} className="rounded-none">
                Cancel
              </Button>
              <Button onClick={handleSaveLimits} disabled={loadingIds['save_limits']} className="rounded-none bg-primary hover:bg-primary/90">
                {loadingIds['save_limits'] ? 'Saving...' : 'Save Limits'}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}
