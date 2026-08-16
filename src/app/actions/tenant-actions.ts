'use server';

import { prisma } from '@/lib/db/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

// Validation schemas
const CreateTenantSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  slug: z.string().min(2, 'Slug must be at least 2 characters').regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
  domain: z.string().optional(),
  adminEmail: z.string().email('Invalid email address'),
  adminName: z.string().min(2, 'Admin name must be at least 2 characters'),
  adminPassword: z.string().min(8, 'Password must be at least 8 characters').optional(),
});

const UpdateTenantSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  domain: z.string().optional(),
});

// Secure random password generator
function generateSecurePassword(length: number = 14): string {
  const charset = {
    uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    lowercase: 'abcdefghijklmnopqrstuvwxyz',
    numbers: '0123456789',
    special: '!@#$%^&*()_+-=',
  };
  
  const allChars = Object.values(charset).join('');
  let password = '';
  
  // Ensure at least one of each type
  password += charset.uppercase[Math.floor(Math.random() * charset.uppercase.length)];
  password += charset.lowercase[Math.floor(Math.random() * charset.lowercase.length)];
  password += charset.numbers[Math.floor(Math.random() * charset.numbers.length)];
  password += charset.special[Math.floor(Math.random() * charset.special.length)];
  
  // Fill remaining with random characters
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

// Helper function to safely write audit logs without aborting main actions if user_id or FK checks fail
async function safeAuditLog(data: {
  tenant_id: string;
  user_id?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  new_values?: any;
  metadata?: any;
}, tx?: any) {
  try {
    let validUserId = data.user_id;
    if (validUserId) {
      const db = tx || prisma;
      const userExists = await db.users.findUnique({
        where: { id: validUserId },
        select: { id: true },
      });
      if (!userExists) {
        validUserId = undefined;
      }
    }

    const db = tx || prisma;
    await db.audit_logs.create({
      data: {
        tenant_id: data.tenant_id,
        user_id: validUserId || null,
        action: data.action,
        resource_type: data.resource_type,
        resource_id: data.resource_id,
        new_values: data.new_values,
        metadata: data.metadata,
      },
    });
  } catch (e) {
    console.warn('Audit log creation skipped/failed:', e);
  }
}

export async function createTenant(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'super_admin') {
    throw new Error('Unauthorized');
  }
  
  const validated = CreateTenantSchema.parse({
    name: formData.get('name'),
    slug: formData.get('slug'),
    domain: formData.get('domain') || undefined,
    subscriptionPlan: formData.get('subscriptionPlan'),
    adminEmail: formData.get('adminEmail'),
    adminName: formData.get('adminName'),
    adminPassword: formData.get('adminPassword') || undefined,
  });
  
  // Check if slug or domain is unique
  const existing = await prisma.tenants.findFirst({
    where: {
      OR: [
        { slug: validated.slug },
        ...(validated.domain ? [{ domain: validated.domain }] : [])
      ]
    }
  });
  
  if (existing) {
    throw new Error('A tenant with this slug or domain already exists');
  }
  
  const tempPassword = validated.adminPassword || generateSecurePassword();
  const passwordHash = await bcrypt.hash(tempPassword, 10);
  
  // Create tenant with transaction
  const result = await prisma.$transaction(async (tx) => {
    // 1. Create tenant
    const tenant = await tx.tenants.create({
      data: {
        name: validated.name,
        slug: validated.slug,
        domain: validated.domain || null,
        subscription_plan: 'basic',
        is_active: true,
      },
    });
    
    // 2. Create admin user
    const admin = await tx.users.create({
      data: {
        tenant_id: tenant.id,
        email: validated.adminEmail,
        full_name: validated.adminName,
        password_hash: passwordHash,
        role: 'admin',
        is_active: true,
        email_verified: true,
      },
    });
    
    // 3. Enable core modules (Assuming 'core' is a module code in `modules` table)
    const coreModule = await tx.modules.findUnique({
      where: { code: 'core' }
    });
    
    if (coreModule) {
      await tx.tenant_modules.create({
        data: {
          tenant_id: tenant.id,
          module_id: coreModule.id,
          is_enabled: true
        }
      });
    }
    
    // 4. Log audit safely
    await safeAuditLog({
      tenant_id: tenant.id,
      user_id: session.user.id,
      action: 'TENANT_CREATED',
      resource_type: 'tenant',
      metadata: { name: tenant.name, slug: tenant.slug },
    }, tx);
    
    return { 
      tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug },
      admin: { id: admin.id, email: admin.email, fullName: admin.full_name || '' },
      temporaryPassword: tempPassword
    };
  });
  
  revalidatePath('/super/tenants');
  return { success: true, ...result };
}

export async function updateTenant(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'super_admin') {
    throw new Error('Unauthorized');
  }

  const validated = UpdateTenantSchema.parse({
    id: formData.get('id'),
    name: formData.get('name'),
    domain: formData.get('domain') || undefined,
    subscriptionPlan: formData.get('subscriptionPlan'),
  });

  const tenant = await prisma.tenants.update({
    where: { id: validated.id },
    data: {
      name: validated.name,
      domain: validated.domain || null,
    }
  });

  await safeAuditLog({
    tenant_id: tenant.id,
    user_id: session.user.id,
    action: 'TENANT_UPDATED',
    resource_type: 'tenant',
    resource_id: tenant.id,
    metadata: { name: tenant.name, slug: tenant.slug },
  });

  revalidatePath('/super/tenants');
  return { success: true, tenant };
}

import minioClient, { ensureBrandingBucket, getPublicUrl } from '@/lib/storage/minio-client';

export async function uploadTenantImage(tenantId: string, formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'super_admin') {
    throw new Error('Unauthorized');
  }
  
  const file = formData.get('file') as File;
  const type = formData.get('type') as 'logo' | 'favicon' | 'banner' | 'name_image';
  
  if (!file) {
    throw new Error('No file provided');
  }
  
  const allowedTypes = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/x-icon', 'image/vnd.microsoft.icon', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error(`Invalid file type: ${file.type}. Allowed: PNG, JPG, SVG, ICO, WEBP`);
  }
  
  // Max file size: 5MB
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('File size exceeds 5MB limit');
  }
  
  const extension = file.name.split('.').pop();
  const filename = `${tenantId}_${type}_${Date.now()}.${extension}`;
  const key = `tenants/${tenantId}/${filename}`;
  
  const buffer = Buffer.from(await file.arrayBuffer());
  
  // Ensure bucket exists
  await ensureBrandingBucket();
  
  await minioClient.putObject('branding', key, buffer, buffer.length, {
    'Content-Type': file.type,
  });
  
  const url = getPublicUrl(key);
  
  // Update tenant record
  const updateData: any = {};
  updateData[`${type}_url`] = url;
  
  await prisma.tenants.update({
    where: { id: tenantId },
    data: updateData,
  });
  
  await safeAuditLog({
    tenant_id: tenantId,
    user_id: session.user.id,
    action: `TENANT_${type.toUpperCase()}_UPLOADED`,
    resource_type: 'tenant',
    resource_id: tenantId,
    new_values: { url },
  });
  
  revalidatePath('/super/tenants');
  revalidatePath(`/super/tenants/${tenantId}`);
  return { success: true, url };
}

export async function updateTenantColor(tenantId: string, field: string, value: string) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'super_admin') {
    throw new Error('Unauthorized');
  }

  if (field !== 'primary_color' && field !== 'secondary_color' && field !== 'font_family') {
    throw new Error('Invalid branding field');
  }

  await prisma.tenants.update({
    where: { id: tenantId },
    data: { [field]: value }
  });

  await safeAuditLog({
    tenant_id: tenantId,
    user_id: session.user.id,
    action: field === 'font_family' ? 'TENANT_FONT_UPDATED' : 'TENANT_COLOR_UPDATED',
    resource_type: 'tenant',
    resource_id: tenantId,
    new_values: { [field]: value },
  });

  revalidatePath('/super/tenants');
  revalidatePath(`/super/tenants/${tenantId}`);
  return { success: true };
}

export async function suspendTenant(id: string) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'super_admin') {
    throw new Error('Unauthorized');
  }
  
  const tenant = await prisma.tenants.update({
    where: { id },
    data: { is_active: false },
  });
  
  await safeAuditLog({
    tenant_id: id,
    user_id: session.user.id,
    action: 'TENANT_SUSPENDED',
    resource_type: 'tenant',
    metadata: { is_active: false },
  });
  
  revalidatePath('/super/tenants');
  return { success: true, data: tenant };
}

export async function activateTenant(id: string) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'super_admin') {
    throw new Error('Unauthorized');
  }
  
  const tenant = await prisma.tenants.update({
    where: { id },
    data: { is_active: true },
  });
  
  await safeAuditLog({
    tenant_id: id,
    user_id: session.user.id,
    action: 'TENANT_ACTIVATED',
    resource_type: 'tenant',
    metadata: { is_active: true },
  });
  
  revalidatePath('/super/tenants');
  return { success: true, data: tenant };
}

export async function deleteTenant(id: string) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'super_admin') {
    throw new Error('Unauthorized');
  }
  
  const existing = await prisma.tenants.findUnique({ where: { id } });
  if (!existing) {
    throw new Error('Tenant not found');
  }

  // Soft delete - set inactive and modify slug so it can be reused
  const deletedSlug = `${existing.slug}_deleted_${Date.now()}`;
  
  const tenant = await prisma.tenants.update({
    where: { id },
    data: { 
      is_active: false,
      slug: deletedSlug
    },
  });
  
  await safeAuditLog({
    tenant_id: id,
    user_id: session.user.id,
    action: 'TENANT_DELETED',
    resource_type: 'tenant',
    metadata: { deleted: true, oldSlug: existing.slug, newSlug: deletedSlug },
  });
  
  revalidatePath('/super/tenants');
  return { success: true, data: tenant };
}
