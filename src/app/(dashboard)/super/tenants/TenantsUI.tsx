'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { formatDateForHydration } from '@/lib/utils/date';
import { 
  Plus, Search, Filter, MoreVertical, ShieldAlert,
  CheckCircle2, XCircle, Trash2, Edit, Building2, PlayCircle, PauseCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { copyToClipboard } from '@/lib/utils/clipboard';
import { useSearchParams } from 'next/navigation';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription 
} from '@/components/ui/dialog';

// Define the shape of data we get from the server component
type TenantData = {
  id: string;
  name: string;
  slug: string;
  domain: string;
  isActive: boolean;
  subscriptionPlan: string;
  createdAt: string;
  usersCount: number;
  examsCount: number;
  logo_url: string | null;
  favicon_url: string | null;
  banner_url: string | null;
  name_image_url?: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  font_family: string | null;
};

// Props definition
type TenantsUIProps = {
  tenants: TenantData[];
  createTenant: (formData: FormData) => Promise<{ 
    success: boolean; 
    error?: string; 
    data?: any;
    tenant?: { id: string; name: string; slug: string };
    admin?: { id: string; email: string; fullName: string };
    temporaryPassword?: string;
  }>;
  updateTenant: (formData: FormData) => Promise<{ success: boolean; error?: string; data?: any }>;
  suspendTenant: (id: string) => Promise<{ success: boolean; error?: string; data?: any }>;
  activateTenant: (id: string) => Promise<{ success: boolean; error?: string; data?: any }>;
  deleteTenant: (id: string) => Promise<{ success: boolean; error?: string; data?: any }>;
  uploadTenantImage: (tenantId: string, formData: FormData) => Promise<{ success: boolean; url?: string }>;
  updateTenantColor: (tenantId: string, field: string, value: string) => Promise<{ success: boolean }>;
};

const CreateTenantSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  slug: z.string().min(2, 'Slug must be at least 2 characters').regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
  domain: z.string().optional(),
  adminEmail: z.string().email('Invalid email address'),
  adminName: z.string().min(2, 'Admin name must be at least 2 characters'),
  adminPassword: z.string().min(8, 'Password must be at least 8 characters').optional(),
});

type CreateTenantFormValues = z.input<typeof CreateTenantSchema>;

export default function TenantsUI({
  tenants,
  createTenant,
  updateTenant,
  suspendTenant,
  activateTenant,
  deleteTenant,
  uploadTenantImage,
  updateTenantColor
}: TenantsUIProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const [planFilter, setPlanFilter] = useState<'all' | 'starter' | 'pro' | 'enterprise'>('all');
  
  const searchParams = useSearchParams();
  const shouldOpenCreate = searchParams.get('create') === 'true';

  useEffect(() => {
    if (shouldOpenCreate) {
      setIsCreateModalOpen(true);
    }
  }, [shouldOpenCreate]);
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<TenantData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [createdTenant, setCreatedTenant] = useState<{
    name: string;
    slug: string;
    adminEmail: string;
    adminName: string;
    temporaryPassword: string;
  } | null>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
    const file = e.target.files?.[0];
    if (!file || !selectedTenant) return;
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    
    try {
      const result = await uploadTenantImage(selectedTenant.id, formData);
      if (result.success) {
        toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} uploaded successfully!`);
        if (result.url) {
          setSelectedTenant(prev => prev ? { ...prev, [`${type}_url`]: result.url } : null);
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'Upload failed');
    }
  };

  const handleColorChange = async (field: string, value: string) => {
    if (!selectedTenant) return;
    
    try {
      await updateTenantColor(selectedTenant.id, field, value);
      toast.success('Color updated successfully!');
      setSelectedTenant(prev => prev ? { ...prev, [field]: value } : null);
    } catch (error: any) {
      toast.error('Failed to update color');
    }
  };

  const { register, handleSubmit, formState: { errors }, reset } = useForm<CreateTenantFormValues>({
    resolver: zodResolver(CreateTenantSchema),
    defaultValues: {
      adminPassword: 'ExaminAI@123'
    }
  });

  const filteredTenants = useMemo(() => {
    return tenants.filter(tenant => {
      const matchesSearch = tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            tenant.slug.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || 
                            (statusFilter === 'active' && tenant.isActive) || 
                            (statusFilter === 'suspended' && !tenant.isActive);
      const matchesPlan = planFilter === 'all' || tenant.subscriptionPlan === planFilter;
      return matchesSearch && matchesStatus && matchesPlan;
    });
  }, [tenants, searchTerm, statusFilter, planFilter]);

  const onSubmitCreate = async (data: CreateTenantFormValues) => {
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (value) formData.append(key, value);
      });

      const res = await createTenant(formData);
      
      if (res.success) {
        toast.success(`Tenant ${data.name} created successfully!`);
        setCreatedTenant({
          name: res.tenant?.name || data.name,
          slug: res.tenant?.slug || data.slug,
          adminEmail: res.admin?.email || data.adminEmail,
          adminName: res.admin?.fullName || data.adminName,
          temporaryPassword: res.temporaryPassword || data.adminPassword || 'ExaminAI@123',
        });
        setShowCredentialsModal(true);
        setIsCreateModalOpen(false);
        reset();
      } else {
        toast.error(res.error || 'Failed to create tenant');
      }
    } catch (error: any) {
      toast.error(error.message || 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (id: string, currentlyActive: boolean) => {
    try {
      const res = currentlyActive ? await suspendTenant(id) : await activateTenant(id);
      if (res.success) {
        toast.success(`Tenant ${currentlyActive ? 'suspended' : 'activated'} successfully.`);
      } else {
        toast.error(res.error || `Failed to ${currentlyActive ? 'suspend' : 'activate'} tenant.`);
      }
    } catch (error: any) {
      toast.error('An error occurred while updating status.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this tenant? This action is destructive.")) return;
    
    try {
      const res = await deleteTenant(id);
      if (res.success) {
        toast.success('Tenant deleted successfully.');
      } else {
        toast.error(res.error || 'Failed to delete tenant.');
      }
    } catch (error: any) {
      toast.error('An error occurred while deleting tenant.');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            Tenant Directory
          </h1>
          <p className="text-sm text-muted-foreground">Manage institutions, subscriptions, and platform access.</p>
        </div>
        <Button 
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-none"
        >
          <Plus className="mr-2 h-4 w-4" />
          Provision Tenant
        </Button>
      </div>

      <Card className="border border-muted bg-card rounded-none">
        <CardHeader className="border-b border-muted p-4">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by name or slug..."
                className="pl-9 rounded-none border-muted bg-background w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <select 
                className="flex h-10 w-full items-center justify-between rounded-none border border-muted bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-muted-foreground">
              <thead className="text-xs uppercase bg-muted/50 text-foreground border-b border-muted">
                <tr>
                  <th className="px-4 py-3 font-semibold">Institution</th>
                  <th className="px-4 py-3 font-semibold">Domain / Slug</th>
                  <th className="px-4 py-3 font-semibold text-center">Status</th>
                  <th className="px-4 py-3 font-semibold text-center">Users</th>
                  <th className="px-4 py-3 font-semibold text-center">Exams</th>
                  <th className="px-4 py-3 font-semibold text-center">Plan</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-muted">
                {filteredTenants.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                      No tenants found matching your filters.
                    </td>
                  </tr>
                ) : (
                  filteredTenants.map((t) => (
                    <tr key={t.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-bold text-foreground">{t.name}</div>
                        <div className="text-[10px]">Added: {formatDateForHydration(t.createdAt)}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-primary font-medium">{t.slug}.localhost</div>
                        {t.domain && <div className="text-[10px] text-muted-foreground">{t.domain}</div>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {t.isActive ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/10 text-green-500 text-[10px] font-bold uppercase rounded-sm border border-green-500/20">
                            <CheckCircle2 className="w-3 h-3" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-500/10 text-red-500 text-[10px] font-bold uppercase rounded-sm border border-red-500/20">
                            <XCircle className="w-3 h-3" /> Suspended
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-foreground">{t.usersCount}</td>
                      <td className="px-4 py-3 text-center font-bold text-foreground">{t.examsCount}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="px-2 py-1 bg-muted text-muted-foreground text-[10px] font-bold uppercase rounded-sm border border-muted-foreground/20">
                          Basic
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => {
                              setSelectedTenant(t);
                              setIsEditModalOpen(true);
                            }}
                            title="Edit Tenant"
                            className="h-8 w-8 text-blue-500 hover:bg-blue-500/10 rounded-none"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleToggleStatus(t.id, t.isActive)}
                            title={t.isActive ? "Suspend Tenant" : "Activate Tenant"}
                            className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-none"
                          >
                            {t.isActive ? <PauseCircle className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />}
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleDelete(t.id)}
                            title="Delete Tenant"
                            className="h-8 w-8 text-red-500 hover:bg-red-500/10 rounded-none"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Basic Create Modal Implementation */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <Card className="w-full max-w-lg border border-muted bg-card rounded-none shadow-2xl animate-in fade-in zoom-in-95">
            <CardHeader className="border-b border-muted flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl font-bold">Provision New Tenant</CardTitle>
                <CardDescription>Setup a new institution and primary admin account.</CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsCreateModalOpen(false)}>
                <XCircle className="h-5 w-5" />
              </Button>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleSubmit(onSubmitCreate)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-foreground">Institution Name *</label>
                    <Input {...register('name')} placeholder="e.g. Acme University" className="rounded-none border-muted" />
                    {errors.name && <p className="text-[10px] text-red-500">{errors.name.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-foreground">Subdomain Slug *</label>
                    <Input {...register('slug')} placeholder="acme-uni" className="rounded-none border-muted" />
                    {errors.slug && <p className="text-[10px] text-red-500">{errors.slug.message}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-foreground">Custom Domain (Optional)</label>
                  <Input {...register('domain')} placeholder="e.g. exams.acme.edu" className="rounded-none border-muted" />
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-muted">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-foreground">Admin Name *</label>
                    <Input {...register('adminName')} placeholder="John Doe" className="rounded-none border-muted" />
                    {errors.adminName && <p className="text-[10px] text-red-500">{errors.adminName.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-foreground">Admin Email *</label>
                    <Input {...register('adminEmail')} type="email" placeholder="admin@acme.edu" className="rounded-none border-muted" />
                    {errors.adminEmail && <p className="text-[10px] text-red-500">{errors.adminEmail.message}</p>}
                  </div>
                </div>

                <div className="pt-4 flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)} className="rounded-none border-muted">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting} className="bg-primary hover:bg-primary/90 rounded-none font-bold">
                    {isSubmitting ? 'Provisioning...' : 'Provision Tenant'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {showCredentialsModal && createdTenant && (
        <Dialog open={showCredentialsModal} onOpenChange={setShowCredentialsModal}>
          <DialogContent className="rounded-none border-muted bg-card max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center gap-2 text-foreground">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                Tenant Created Successfully
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-1">
                Please share these login credentials with the administrator. They should change their password on first login.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 pt-2">
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <p><strong>Institution:</strong> {createdTenant.name}</p>
                <p><strong>Login URL:</strong> https://{createdTenant.slug}.localhost/login</p>
                <p><strong>Admin Email:</strong> {createdTenant.adminEmail}</p>
                <p><strong>Temporary Password:</strong> 
                  <span className="font-mono font-bold text-blue-600 text-lg ml-2">
                    {createdTenant.temporaryPassword}
                  </span>
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  ⚠️ Share this password with the admin. They will be prompted to change it on first login.
                </p>
              </div>
              
              <div className="flex justify-end gap-2 pt-2 border-t border-muted">
                <Button variant="outline" onClick={() => setShowCredentialsModal(false)} className="rounded-none border-muted text-xs font-bold">
                  Close
                </Button>
                <Button
                  onClick={async () => {
                    const text = `Institution: ${createdTenant.name}\nLogin URL: https://${createdTenant.slug}.localhost/login\nEmail: ${createdTenant.adminEmail}\nPassword: ${createdTenant.temporaryPassword}`;
                    const success = await copyToClipboard(text);
                    if (success) {
                      toast.success('Credentials copied to clipboard!');
                    } else {
                      toast.error('Failed to copy credentials to clipboard');
                    }
                  }}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-none text-xs"
                >
                  Copy Credentials
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
      {isEditModalOpen && selectedTenant && (
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="rounded-none border-muted bg-card max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-foreground">
                Edit Tenant
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-1">
                Manage {selectedTenant.name} settings and branding.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-4 border-t">
              <h3 className="font-medium text-foreground">🎨 White-label Branding</h3>
              
              {/* Logo Upload */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground">Logo</label>
                <div className="flex items-center gap-4">
                  {selectedTenant.logo_url && (
                    <img
                      src={selectedTenant.logo_url}
                      alt="Logo"
                      className="h-12 w-auto object-contain"
                    />
                  )}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml"
                    onChange={(e) => handleImageUpload(e, 'logo')}
                    className="text-sm text-muted-foreground"
                  />
                  <span className="text-xs text-muted-foreground">PNG, JPG, SVG (max 5MB)</span>
                </div>
              </div>

              {/* Name Image Upload (styled wordmark / institute name graphic) */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground">Institute Name Image <span className="text-xs text-muted-foreground">(Wordmark / styled name graphic for sidebar)</span></label>
                <div className="flex items-start gap-4">
                  {(selectedTenant as any).name_image_url ? (
                    <div className="border rounded p-2 bg-muted/30">
                      <img
                        src={(selectedTenant as any).name_image_url}
                        alt="Name Image"
                        className="h-10 max-w-[160px] object-contain"
                      />
                      <p className="text-[10px] text-muted-foreground mt-1">Current name image</p>
                    </div>
                  ) : (
                    <div className="border border-dashed rounded p-3 text-xs text-muted-foreground w-32 text-center">
                      No name image yet
                    </div>
                  )}
                  <div className="space-y-1">
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/svg+xml,image/webp"
                      onChange={(e) => handleImageUpload(e, 'name_image')}
                      className="text-sm text-muted-foreground"
                    />
                    <p className="text-[10px] text-muted-foreground">PNG, SVG, WebP (transparent background recommended, max 2MB)</p>
                    <p className="text-[10px] text-blue-500">This image replaces the plain text name in the sidebar for all portal users of this tenant.</p>
                  </div>
                </div>
              </div>
              
              {/* Favicon Upload */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground">Favicon</label>
                <div className="flex items-center gap-4">
                  {selectedTenant.favicon_url && (
                    <img
                      src={selectedTenant.favicon_url}
                      alt="Favicon"
                      className="h-8 w-8 object-contain"
                    />
                  )}
                  <input
                    type="file"
                    accept="image/x-icon,image/png,image/vnd.microsoft.icon"
                    onChange={(e) => handleImageUpload(e, 'favicon')}
                    className="text-sm text-muted-foreground"
                  />
                  <span className="text-xs text-muted-foreground">ICO, PNG (max 1MB)</span>
                </div>
              </div>
              
              {/* Banner Upload */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground">Banner Image</label>
                <div className="flex items-center gap-4">
                  {selectedTenant.banner_url && (
                    <img
                      src={selectedTenant.banner_url}
                      alt="Banner"
                      className="h-16 w-32 object-cover rounded"
                    />
                  )}
                  <input
                    type="file"
                    accept="image/png,image/jpeg"
                    onChange={(e) => handleImageUpload(e, 'banner')}
                    className="text-sm text-muted-foreground"
                  />
                  <span className="text-xs text-muted-foreground">PNG, JPG (max 5MB)</span>
                </div>
              </div>
              
              {/* Colors */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-foreground">Primary Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={selectedTenant.primary_color || '#2563EB'}
                      onChange={(e) => handleColorChange('primary_color', e.target.value)}
                      className="h-10 w-10 p-1 border rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={selectedTenant.primary_color || '#2563EB'}
                      onChange={(e) => handleColorChange('primary_color', e.target.value)}
                      className="flex-1 px-3 py-2 border rounded-md font-mono text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-foreground">Secondary Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={selectedTenant.secondary_color || '#7C3AED'}
                      onChange={(e) => handleColorChange('secondary_color', e.target.value)}
                      className="h-10 w-10 p-1 border rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={selectedTenant.secondary_color || '#7C3AED'}
                      onChange={(e) => handleColorChange('secondary_color', e.target.value)}
                      className="flex-1 px-3 py-2 border rounded-md font-mono text-sm"
                    />
                  </div>
                </div>
              </div>
              
              {/* Font Family Selection */}
              <div className="space-y-2 mt-4">
                <label className="block text-sm font-medium text-foreground">Font Family</label>
                <select
                  value={selectedTenant.font_family || 'Inter'}
                  onChange={(e) => handleColorChange('font_family', e.target.value)}
                  className="w-full bg-background border border-muted p-2 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="Inter">Inter</option>
                  <option value="Roboto">Roboto</option>
                  <option value="Outfit">Outfit</option>
                  <option value="Montserrat">Montserrat</option>
                  <option value="Poppins">Poppins</option>
                  <option value="Lato">Lato</option>
                  <option value="Playfair Display">Playfair Display</option>
                  <option value="Merriweather">Merriweather</option>
                  <option value="Space Grotesk">Space Grotesk</option>
                  <option value="Plus Jakarta Sans">Plus Jakarta Sans</option>
                  <option value="Lora">Lora</option>
                  <option value="Fira Code">Fira Code</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t mt-4">
              <Button variant="outline" onClick={() => setIsEditModalOpen(false)} className="rounded-none border-muted text-xs font-bold">
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
