import { prisma } from '@/lib/db/client';
import { CacheService } from '../redis/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { revalidatePath } from 'next/cache';
// Services

export interface WhiteLabelConfig {
  tenantId: string;
  tenantName: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string | null;
  fontFamily: string;
  customCss: string | null;
  loginBackground: string | null;
  headerBgColor: string | null;
  footerText: string | null;
  removeBranding: boolean;
  customDomain: string | null;
  appLogoUrl: string | null;
  appPrimaryColor: string | null;
  appSplashScreen: string | null;
}

export async function getWhiteLabelConfig(tenantId: string): Promise<WhiteLabelConfig | null> {
  const cacheKey = `whitelabel:${tenantId}`;
  
  // ✅ Check cache first
  const cached = await CacheService.get(cacheKey);
  if (cached) return cached as WhiteLabelConfig;
  
  // ✅ Fetch from database
  const tenant = (await prisma.tenants.findUnique({
    where: { id: tenantId },
  })) as any;
  
  if (!tenant) return null;
  
  const config: WhiteLabelConfig = {
    tenantId: tenant.id,
    tenantName: tenant.name,
    logoUrl: tenant.logo_url,
    faviconUrl: tenant.favicon_url,
    primaryColor: tenant.primary_color || '#2563EB',
    secondaryColor: tenant.secondary_color || '#7C3AED',
    accentColor: tenant.accent_color || null,
    fontFamily: tenant.font_family || 'Inter',
    customCss: tenant.custom_css || null,
    loginBackground: tenant.login_background || null,
    headerBgColor: tenant.header_bg_color || null,
    footerText: tenant.footer_text || null,
    removeBranding: tenant.remove_branding || false,
    customDomain: tenant.custom_domain || null,
    appLogoUrl: tenant.app_logo_url || null,
    appPrimaryColor: tenant.app_primary_color || null,
    appSplashScreen: tenant.app_splash_screen || null,
  };
  
  // ✅ Cache for 1 hour
  await CacheService.set(cacheKey, config, 3600);
  
  return config;
}

export async function invalidateWhiteLabelCache(tenantId: string) {
  await CacheService.delete(`whitelabel:${tenantId}`);
}

export async function updateWhiteLabelConfig(tenantId: string, data: Partial<WhiteLabelConfig>) {
  'use server';
  
  const session = await getServerSession(authOptions);
  if (!session || !['admin', 'super_admin'].includes(session.user.role)) {
    throw new Error('Unauthorized');
  }
  
  const updateData: any = {};
  
  // Map config fields to database fields
  const fieldMap: Record<string, string> = {
    logoUrl: 'logo_url',
    faviconUrl: 'favicon_url',
    bannerUrl: 'banner_url',
    primaryColor: 'primary_color',
    secondaryColor: 'secondary_color',
    accentColor: 'accent_color',
    fontFamily: 'font_family',
    customCss: 'custom_css',
    loginBackground: 'login_background',
    headerBgColor: 'header_bg_color',
    footerText: 'footer_text',
    removeBranding: 'remove_branding',
    customDomain: 'custom_domain',
    appLogoUrl: 'app_logo_url',
    appPrimaryColor: 'app_primary_color',
    appSplashScreen: 'app_splash_screen',
  };
  
  for (const [key, value] of Object.entries(data)) {
    if (fieldMap[key] && value !== undefined) {
      updateData[fieldMap[key]] = value;
    }
  }
  
  await prisma.tenants.update({
    where: { id: tenantId },
    data: updateData,
  });
  
  await invalidateWhiteLabelCache(tenantId);
  revalidatePath('/admin/branding');
  revalidatePath('/teacher');
  revalidatePath('/student');
  
  return { success: true };
}
