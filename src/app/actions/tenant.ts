'use server';

import { prisma } from '@/lib/db/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

const TenantSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  slug: z.string().min(2, 'Slug must be at least 2 characters').regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
  domain: z.string().optional(),
  adminEmail: z.string().email('Invalid email address'),
  adminName: z.string().min(2, 'Admin name must be at least 2 characters'),
  adminPassword: z.string().min(8, 'Password must be at least 8 characters'),
  plan: z.enum(['starter', 'pro', 'enterprise']),
});

export type TenantFormData = z.infer<typeof TenantSchema>;

export async function createTenant(data: TenantFormData) {
  try {
    const session = await getServerSession(authOptions);
    
    // Strict Role Enforcement
    if (!session || session.user.role !== 'super_admin') {
      throw new Error('Unauthorized. Only Super Admins can create tenants.');
    }

    // Zod Validation
    const parsedData = TenantSchema.safeParse(data);
    if (!parsedData.success) {
      throw new Error(parsedData.error.issues[0].message);
    }

    const { name, slug, domain, adminEmail, adminName, adminPassword, plan } = parsedData.data;

    // Check for existing slug or domain
    const existingTenant = await prisma.tenants.findFirst({
      where: {
        OR: [
          { slug: slug },
          ...(domain ? [{ domain: domain }] : [])
        ]
      }
    });

    if (existingTenant) {
      throw new Error('A tenant with this slug or domain already exists.');
    }

    const passwordHash = await bcrypt.hash(adminPassword, 10);

    // Atomic Transaction to guarantee data integrity across 4 tables
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the Tenant
      const newTenant = await tx.tenants.create({
        data: {
          name,
          slug,
          domain: domain || null,
          subscription_plan: plan || 'starter',
          is_active: true,
        }
      });

      // 2. Create the Primary Admin User
      await tx.users.create({
        data: {
          tenant_id: newTenant.id,
          email: adminEmail,
          full_name: adminName,
          password_hash: passwordHash,
          role: 'admin',
          is_active: true,
          email_verified: true,
        }
      });

      // 3. Enable Core Modules
      const coreModule = await tx.modules.findUnique({
        where: { code: 'core' }
      });

      if (coreModule) {
        await tx.tenant_modules.create({
          data: {
            tenant_id: newTenant.id,
            module_id: coreModule.id,
            is_enabled: true
          }
        });
      }

      // 4. Log the action securely
      await tx.audit_logs.create({
        data: {
          tenant_id: newTenant.id, // Binds log to the new tenant
          user_id: session.user.id,
          action: `Provisioned new institution: ${name} (${slug})`,
          resource_type: 'tenant_management',
          metadata: { plan, domain }
        }
      });

      return newTenant.id;
    });

    revalidatePath('/super');
    return { success: true, tenantId: result };
    
  } catch (error: any) {
    console.error('Tenant Creation Transaction Failed:', error);
    return { success: false, error: error.message || 'Failed to create tenant' };
  }
}
