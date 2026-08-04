'use server';

import { prisma } from '@/lib/db/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { revalidatePath } from 'next/cache';
import { generateUploadUrl, getPublicUrl } from '@/lib/storage/minio-client';

function getTenantId(session: any) {
  return session?.user?.tenantId || session?.user?.tenant_id;
}

export async function getPresignedUploadUrl(type: 'logo' | 'favicon', fileName: string, mimeType: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['admin', 'super_admin'].includes(session.user.role)) {
      return { uploadUrl: null, publicUrl: null, useBase64: true, error: 'Unauthorized' };
    }

    const tenantId = getTenantId(session);
    const ext = fileName.split('.').pop() || 'png';
    const finalFileName = `${tenantId}/${type}_${Date.now()}.${ext}`;
    
    const uploadUrl = await generateUploadUrl(finalFileName, mimeType);
    const publicUrl = getPublicUrl(finalFileName);

    return { uploadUrl, publicUrl, useBase64: false };
  } catch (error) {
    console.warn('S3/MinIO upload URL generation failed, falling back to base64 data URL:', error);
    return { uploadUrl: null, publicUrl: null, useBase64: true };
  }
}

export async function updateBranding(data: any) {
  const session = await getServerSession(authOptions);
  if (!session || !['admin', 'super_admin'].includes(session.user.role)) {
    throw new Error('Unauthorized');
  }

  const tenantId = getTenantId(session);

  const allowedFields = [
    'name', 'logo_url', 'favicon_url', 'banner_url', 'primary_color',
    'secondary_color', 'accent_color', 'font_family', 'email_template',
    'sms_template', 'custom_css', 'login_background', 'header_bg_color',
    'footer_text', 'remove_branding', 'custom_domain', 'app_logo_url',
    'app_primary_color', 'app_splash_screen'
  ];

  const updateData: any = {};
  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      updateData[field] = data[field];
    }
  }

  const updated = await prisma.tenants.update({
    where: { id: tenantId },
    data: updateData
  });

  try {
    await prisma.audit_logs.create({
      data: {
        tenant_id: tenantId,
        user_id: session.user.id,
        action: 'BRANDING_UPDATED',
        resource_type: 'tenants',
        resource_id: tenantId,
        metadata: updateData,
      }
    });
  } catch (e) {
    console.warn('Audit log creation failed during branding update:', e);
  }

  try {
    const { invalidateWhiteLabelCache } = await import('@/lib/services/white-label');
    await invalidateWhiteLabelCache(tenantId);
  } catch (e) {
    console.warn('Cache invalidation failed:', e);
  }

  revalidatePath('/admin/branding');
  revalidatePath('/teacher');
  revalidatePath('/student');
  return { success: true, tenant: updated };
}

export async function resetBranding() {
  const session = await getServerSession(authOptions);
  if (!session || !['admin', 'super_admin'].includes(session.user.role)) {
    throw new Error('Unauthorized');
  }

  const tenantId = getTenantId(session);

  const defaults = {
    primary_color: '#2563EB',
    secondary_color: '#7C3AED',
    accent_color: null,
    font_family: 'Inter',
    email_template: null,
    sms_template: null,
    logo_url: null,
    favicon_url: null,
    custom_css: null,
    login_background: null,
    header_bg_color: null,
    footer_text: null,
    remove_branding: false,
    custom_domain: null,
    app_logo_url: null,
    app_primary_color: null,
    app_splash_screen: null,
  };

  const updated = await prisma.tenants.update({
    where: { id: tenantId },
    data: defaults
  });

  await prisma.audit_logs.create({
    data: {
      tenant_id: tenantId,
      user_id: session.user.id,
      action: 'BRANDING_RESET',
      resource_type: 'tenants',
      resource_id: tenantId,
      metadata: { action: 'reset_to_defaults' },
    }
  });

  const { invalidateWhiteLabelCache } = await import('@/lib/services/white-label');
  await invalidateWhiteLabelCache(tenantId);

  revalidatePath('/admin/branding');
  revalidatePath('/teacher');
  revalidatePath('/student');
  return { success: true, tenant: updated };
}
