'use client';

import React, { useState, useTransition } from 'react';
import { formatDateForHydration } from '@/lib/utils/date';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { IndianRupee, Building, TrendingUp, AlertCircle, Search, Edit2, XCircle, CheckCircle, Package } from 'lucide-react';
import { toast } from 'sonner';
import { updateTenantPlan, cancelTenantSubscription } from '@/app/actions/billing-actions';

interface BillingUIProps {
  tenants: any[];
  stats: {
    mrr: number;
    activeTenants: number;
    totalRevenue: number;
    growth: string;
  };
  plans: Record<string, number>;
}

export default function BillingUI({ tenants, stats, plans }: BillingUIProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isPending, startTransition] = useTransition();
  const [editTenant, setEditTenant] = useState<any>(null);
  const [selectedPlan, setSelectedPlan] = useState<string>('');
  
  // Format currency
  const formatINR = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const filteredTenants = tenants.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleUpdatePlan = () => {
    if (!editTenant || !selectedPlan) return;
    
    startTransition(async () => {
      const result = await updateTenantPlan(editTenant.id, selectedPlan);
      if (result.success) {
        toast.success(`Plan updated to ${selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1)}`);
        setEditTenant(null);
      } else {
        toast.error(result.error || 'Failed to update plan');
      }
    });
  };

  const handleCancelSubscription = (tenantId: string, name: string) => {
    if (!confirm(`Are you sure you want to cancel the subscription for ${name}? This will deactivate their account.`)) return;
    
    startTransition(async () => {
      const result = await cancelTenantSubscription(tenantId);
      if (result.success) {
        toast.success(`Subscription cancelled for ${name}`);
      } else {
        toast.error(result.error || 'Failed to cancel subscription');
      }
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Billing & Subscriptions</h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage tenant subscriptions, pricing plans, and view revenue metrics.
        </p>
      </div>

      {/* Revenue Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-green-200 dark:border-green-900 bg-green-50/50 dark:bg-green-900/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-green-600 dark:text-green-400 uppercase tracking-wider flex items-center gap-2">
              <IndianRupee className="w-4 h-4" /> Monthly Recurring Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-green-700 dark:text-green-300">
              {formatINR(stats.mrr)}
            </div>
            <p className="text-xs font-medium text-green-600 dark:text-green-500 mt-1">Estimated monthly run rate</p>
          </CardContent>
        </Card>

        <Card className="border border-purple-200 dark:border-purple-900 bg-purple-50/50 dark:bg-purple-900/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> Total ARR
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-purple-700 dark:text-purple-300">
              {formatINR(stats.totalRevenue)}
            </div>
            <p className="text-xs font-medium text-purple-600 dark:text-purple-500 mt-1">Annual Recurring Revenue</p>
          </CardContent>
        </Card>

        <Card className="border border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-900/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center gap-2">
              <Building className="w-4 h-4" /> Active Tenants
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-blue-700 dark:text-blue-300">
              {stats.activeTenants}
            </div>
            <p className="text-xs font-medium text-blue-600 dark:text-blue-500 mt-1">Currently paying customers</p>
          </CardContent>
        </Card>

        <Card className="border border-orange-200 dark:border-orange-900 bg-orange-50/50 dark:bg-orange-900/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider flex items-center gap-2">
              <Package className="w-4 h-4" /> MoM Growth
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-orange-700 dark:text-orange-300">
              {stats.growth}
            </div>
            <p className="text-xs font-medium text-orange-600 dark:text-orange-500 mt-1">Over previous 30 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Tenants Subscription Table */}
      <Card className="border border-slate-200 dark:border-slate-800">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="text-lg font-bold">Tenant Subscriptions</CardTitle>
              <CardDescription>Manage active tenant plans and billing cycles</CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
              <Input
                placeholder="Search tenants..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                <th className="px-6 py-3 font-semibold text-slate-700 dark:text-slate-300">Tenant Name</th>
                <th className="px-6 py-3 font-semibold text-slate-700 dark:text-slate-300">Current Plan</th>
                <th className="px-6 py-3 font-semibold text-slate-700 dark:text-slate-300">Status</th>
                <th className="px-6 py-3 font-semibold text-slate-700 dark:text-slate-300">Usage</th>
                <th className="px-6 py-3 font-semibold text-slate-700 dark:text-slate-300">Renews On</th>
                <th className="px-6 py-3 font-semibold text-slate-700 dark:text-slate-300 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredTenants.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    No tenants found matching your search.
                  </td>
                </tr>
              ) : (
                filteredTenants.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900 dark:text-white">{t.name}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{t.slug}</div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className={`font-semibold capitalize
                        ${t.subscription_plan === 'enterprise' ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800' : 
                          t.subscription_plan === 'professional' ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800' : 
                          'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300'}
                      `}>
                        {t.subscription_plan || 'Starter'}
                      </Badge>
                      <div className="text-[10px] text-slate-500 mt-1 font-medium">
                        {formatINR(plans[t.subscription_plan || 'starter'] || 0)} / yr
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {t.is_active ? (
                        <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                          <CheckCircle className="w-3.5 h-3.5" /> Active
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400 text-xs font-bold">
                          <XCircle className="w-3.5 h-3.5" /> Cancelled
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1 text-xs">
                        <div className="flex justify-between items-center gap-4">
                          <span className="text-slate-500">Users:</span>
                          <span className="font-semibold text-slate-700 dark:text-slate-300">{t._count.users}</span>
                        </div>
                        <div className="flex justify-between items-center gap-4">
                          <span className="text-slate-500">Exams:</span>
                          <span className="font-semibold text-slate-700 dark:text-slate-300">{t._count.exams}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-slate-600 dark:text-slate-400">
                      {t.subscription_end_date 
                        ? formatDateForHydration(t.subscription_end_date)
                        : 'Lifetime'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-8"
                          onClick={() => {
                            setEditTenant(t);
                            setSelectedPlan(t.subscription_plan || 'starter');
                          }}
                        >
                          <Edit2 className="w-3.5 h-3.5 mr-1.5" /> Update Plan
                        </Button>
                        {t.is_active && (
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            className="h-8"
                            onClick={() => handleCancelSubscription(t.id, t.name)}
                            disabled={isPending}
                          >
                            <XCircle className="w-3.5 h-3.5 mr-1.5" /> Cancel
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Edit Plan Dialog */}
      <Dialog open={!!editTenant} onOpenChange={(open) => !open && setEditTenant(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Subscription Plan</DialogTitle>
            <DialogDescription>
              Change the billing plan for {editTenant?.name}.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Select Plan</label>
              <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="starter">Starter ({formatINR(plans.starter)}/yr)</SelectItem>
                  <SelectItem value="professional">Professional ({formatINR(plans.professional)}/yr)</SelectItem>
                  <SelectItem value="enterprise">Enterprise ({formatINR(plans.enterprise)}/yr)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-4 border border-blue-100 dark:border-blue-900 text-sm text-blue-800 dark:text-blue-300 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
              <div>
                <p className="font-semibold mb-1">Billing Update Notice</p>
                <p>Updating the plan will immediately change the tenant's features and set a new renewal date 1 year from today. Make sure you have processed the payment offline if applicable.</p>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTenant(null)} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={handleUpdatePlan} disabled={isPending || !selectedPlan || selectedPlan === editTenant?.subscription_plan}>
              {isPending ? 'Updating...' : 'Confirm Update'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
