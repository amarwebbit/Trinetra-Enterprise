'use client';

import React, { useState, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Upload, RefreshCw, Save, ImageIcon, Paintbrush } from 'lucide-react';
import { updateBranding, getPresignedUploadUrl, resetBranding } from '@/app/actions/branding-actions';
import { LivePreview } from '@/components/branding/LivePreview';

type TenantProps = {
  id: string;
  name: string;
  logo_url: string | null;
  favicon_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  accent_color: string | null;
  font_family: string | null;
  email_template: string | null;
  sms_template: string | null;
  custom_css: string | null;
  login_background: string | null;
  header_bg_color: string | null;
  footer_text: string | null;
  remove_branding: boolean | null;
  custom_domain: string | null;
  app_logo_url: string | null;
  app_primary_color: string | null;
  app_splash_screen: string | null;
};

export default function BrandingUI({ tenant }: { tenant: TenantProps }) {
  const [isPending, startTransition] = useTransition();
  const [previewMode, setPreviewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  
  const [formData, setFormData] = useState({
    logo_url: tenant.logo_url || '',
    favicon_url: tenant.favicon_url || '',
    primary_color: tenant.primary_color || '#2563EB',
    secondary_color: tenant.secondary_color || '#7C3AED',
    accent_color: tenant.accent_color || '#10B981',
    font_family: tenant.font_family || 'Inter',
    email_template: tenant.email_template || 'Hello {{name}},\n\nWelcome to {{institution_name}}!',
    sms_template: tenant.sms_template || 'Hi {{name}}, your OTP is {{otp}}',
    custom_css: tenant.custom_css || '',
    login_background: tenant.login_background || '',
    header_bg_color: tenant.header_bg_color || '#ffffff',
    footer_text: tenant.footer_text || '',
    remove_branding: tenant.remove_branding || false,
    custom_domain: tenant.custom_domain || '',
    app_logo_url: tenant.app_logo_url || '',
    app_primary_color: tenant.app_primary_color || '#2563EB',
    app_splash_screen: tenant.app_splash_screen || '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'favicon' | 'login_background' | 'app_logo' | 'app_splash') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fieldMap: Record<string, string> = {
      'logo': 'logo_url',
      'favicon': 'favicon_url',
      'login_background': 'login_background',
      'app_logo': 'app_logo_url',
      'app_splash': 'app_splash_screen'
    };

    const loadingToast = toast.loading(`Processing ${type}...`);

    try {
      let finalUrl = '';
      const presigned = await getPresignedUploadUrl(
        type === 'app_logo' || type === 'app_splash' ? 'logo' : (type === 'login_background' ? 'logo' : type),
        file.name,
        file.type
      );

      if (presigned?.uploadUrl && !presigned.useBase64) {
        const res = await fetch(presigned.uploadUrl, {
          method: 'PUT',
          body: file,
          headers: { 'Content-Type': file.type },
        });

        if (res.ok && presigned.publicUrl) {
          finalUrl = presigned.publicUrl;
        }
      }

      // Fallback to FileReader Base64 data URL if S3 is unavailable or failed
      if (!finalUrl) {
        finalUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = (err) => reject(err);
          reader.readAsDataURL(file);
        });
      }

      setFormData(prev => ({ ...prev, [fieldMap[type]]: finalUrl }));
      toast.dismiss(loadingToast);
      toast.success(`${type.replace('_', ' ')} updated! Remember to click Save Changes.`);
    } catch (error: any) {
      toast.dismiss(loadingToast);
      toast.error(error.message || 'Error processing file');
    }
  };

  const handleSave = () => {
    startTransition(async () => {
      try {
        await updateBranding(formData);
        toast.success('Branding updated successfully!');
      } catch (error: any) {
        toast.error(error.message || 'Failed to update branding');
      }
    });
  };

  const handleReset = () => {
    if (confirm("Are you sure you want to reset all branding to system defaults?")) {
      startTransition(async () => {
        try {
          const res = await resetBranding();
          setFormData({
            ...formData,
            primary_color: res.tenant.primary_color || '#2563EB',
            secondary_color: res.tenant.secondary_color || '#7C3AED',
            font_family: res.tenant.font_family || 'Inter',
            logo_url: res.tenant.logo_url || '',
            favicon_url: res.tenant.favicon_url || '',
          });
          toast.success('Branding reset to defaults.');
        } catch (error: any) {
          toast.error(error.message || 'Failed to reset branding');
        }
      });
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-5 gap-6 pb-20">
      {/* Configuration Column */}
      <div className="xl:col-span-3 space-y-6 max-h-[80vh] overflow-y-auto pr-2">
        
        {/* Colors & Typography */}
        <Card className="rounded-none border-muted">
          <CardHeader className="bg-muted/10 border-b border-muted">
            <CardTitle className="text-lg">Appearance</CardTitle>
            <CardDescription>Brand colors and typography</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Primary Color</Label>
                <div className="flex gap-2">
                  <Input type="color" name="primary_color" value={formData.primary_color} onChange={handleChange} className="w-12 h-10 p-1 cursor-pointer" />
                  <Input type="text" name="primary_color" value={formData.primary_color} onChange={handleChange} className="uppercase font-mono flex-1" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Secondary Color</Label>
                <div className="flex gap-2">
                  <Input type="color" name="secondary_color" value={formData.secondary_color} onChange={handleChange} className="w-12 h-10 p-1 cursor-pointer" />
                  <Input type="text" name="secondary_color" value={formData.secondary_color} onChange={handleChange} className="uppercase font-mono flex-1" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Accent Color</Label>
                <div className="flex gap-2">
                  <Input type="color" name="accent_color" value={formData.accent_color} onChange={handleChange} className="w-12 h-10 p-1 cursor-pointer" />
                  <Input type="text" name="accent_color" value={formData.accent_color} onChange={handleChange} className="uppercase font-mono flex-1" />
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Font Family</Label>
                <select name="font_family" value={formData.font_family} onChange={handleChange} className="w-full bg-background border border-muted p-2 rounded-none text-sm focus:outline-none focus:ring-1 focus:ring-primary">
                  <option value="Inter">Inter</option>
                  <option value="Roboto">Roboto</option>
                  <option value="Outfit">Outfit</option>
                  <option value="Montserrat">Montserrat</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Header Background Color</Label>
                <div className="flex gap-2">
                  <Input type="color" name="header_bg_color" value={formData.header_bg_color} onChange={handleChange} className="w-12 h-10 p-1 cursor-pointer" />
                  <Input type="text" name="header_bg_color" value={formData.header_bg_color} onChange={handleChange} className="uppercase font-mono flex-1" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Media */}
        <Card className="rounded-none border-muted">
          <CardHeader className="bg-muted/10 border-b border-muted">
            <CardTitle className="text-lg">Web Brand Assets</CardTitle>
            <CardDescription>Upload web logo, favicon, and login background</CardDescription>
          </CardHeader>
          <CardContent className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-3">
              <Label>Logo</Label>
              <div className="border-2 border-dashed border-muted p-4 flex flex-col items-center justify-center text-center relative group min-h-[120px] hover:bg-muted/10">
                {formData.logo_url ? <img src={formData.logo_url} alt="Logo" className="max-h-[60px] object-contain" /> : <ImageIcon className="h-8 w-8 text-muted-foreground opacity-50" />}
                <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity">
                  <Label htmlFor="logo_upload" className="cursor-pointer text-sm font-medium"><Upload className="h-4 w-4 mb-1 mx-auto" /> Upload</Label>
                  <input id="logo_upload" type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'logo')} />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Label>Favicon</Label>
              <div className="border-2 border-dashed border-muted p-4 flex flex-col items-center justify-center text-center relative group min-h-[120px] hover:bg-muted/10">
                {formData.favicon_url ? <img src={formData.favicon_url} alt="Favicon" className="max-h-[32px] max-w-[32px] object-contain" /> : <ImageIcon className="h-8 w-8 text-muted-foreground opacity-50" />}
                <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity">
                  <Label htmlFor="favicon_upload" className="cursor-pointer text-sm font-medium"><Upload className="h-4 w-4 mb-1 mx-auto" /> Upload</Label>
                  <input id="favicon_upload" type="file" accept="image/x-icon,image/png" className="hidden" onChange={(e) => handleFileUpload(e, 'favicon')} />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Label>Login Background</Label>
              <div className="border-2 border-dashed border-muted p-4 flex flex-col items-center justify-center text-center relative group min-h-[120px] hover:bg-muted/10">
                {formData.login_background ? <img src={formData.login_background} alt="Bg" className="max-h-[60px] object-cover" /> : <ImageIcon className="h-8 w-8 text-muted-foreground opacity-50" />}
                <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity">
                  <Label htmlFor="bg_upload" className="cursor-pointer text-sm font-medium"><Upload className="h-4 w-4 mb-1 mx-auto" /> Upload</Label>
                  <input id="bg_upload" type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'login_background')} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Advanced Styling */}
        <Card className="rounded-none border-muted">
          <CardHeader className="bg-muted/10 border-b border-muted">
             <CardTitle className="text-lg flex items-center gap-2"><Paintbrush className="w-5 h-5 text-primary" /> Advanced</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
             <div className="space-y-2">
              <Label>Custom Footer Text</Label>
              <Input type="text" name="footer_text" value={formData.footer_text} onChange={handleChange} placeholder="e.g. © 2026 University Name. All rights reserved." />
            </div>

            <div className="space-y-2 mt-4">
              <Label>Custom Domain</Label>
              <Input type="text" name="custom_domain" value={formData.custom_domain} onChange={handleChange} placeholder="e.g. exams.university.edu" />
            </div>

             <div className="space-y-2 mt-4">
              <Label>Custom CSS</Label>
              <Textarea 
                name="custom_css" 
                value={formData.custom_css} 
                onChange={handleChange} 
                placeholder="/* Add global CSS overrides here */"
                className="font-mono text-sm h-32"
              />
            </div>
          </CardContent>
        </Card>

        {/* Communication Templates */}
        <Card className="rounded-none border-muted">
          <CardHeader className="bg-muted/10 border-b border-muted">
             <CardTitle className="text-lg">Communication Templates</CardTitle>
             <CardDescription>Customize email and SMS messages sent to users</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
             <div className="space-y-2">
              <Label>Email Template</Label>
              <Textarea 
                name="email_template" 
                value={formData.email_template} 
                onChange={handleChange} 
                placeholder="Hello {{name}}, Welcome to {{institution_name}}!"
                className="text-sm h-32"
              />
            </div>
            <div className="space-y-2 mt-4">
              <Label>SMS Template</Label>
              <Textarea 
                name="sms_template" 
                value={formData.sms_template} 
                onChange={handleChange} 
                placeholder="Hi {{name}}, your OTP is {{otp}}"
                className="text-sm h-20"
              />
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex items-center gap-4 pt-4 pb-4">
          <Button className="rounded-none min-w-[120px]" onClick={handleSave} disabled={isPending}>
            {isPending ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />} Save Changes
          </Button>
          <Button variant="outline" className="rounded-none text-red-600" onClick={handleReset} disabled={isPending}>
            Reset to Defaults
          </Button>
        </div>
      </div>

      {/* Live Preview Sidebar */}
      <div className="xl:col-span-2 h-[80vh]">
         <LivePreview 
           config={{
             primaryColor: formData.primary_color,
             secondaryColor: formData.secondary_color,
             accentColor: formData.accent_color,
             headerBgColor: formData.header_bg_color,
             fontFamily: formData.font_family,
             logoUrl: formData.logo_url,
             tenantName: tenant.name,
             footerText: formData.footer_text,
             removeBranding: formData.remove_branding
           }}
           mode={previewMode}
           onModeChange={setPreviewMode}
         />
      </div>

    </div>
  );
}
