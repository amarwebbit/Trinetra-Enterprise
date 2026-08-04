'use iron-session'; // Note: Server Action flag
'use server';

import { prisma } from '@/lib/db/client';
import bcrypt from 'bcryptjs';
import { revalidatePath } from 'next/cache';

// Quotas config mapped to subscription plans
const PLAN_CONFIGS: Record<string, { modules: string[]; limits: any }> = {
  starter: {
    modules: ['core', 'advanced_questions', 'bulk_ops'],
    limits: { max_students: 500, ai_questions: 0, ai_evaluations: 0 },
  },
  gate: {
    modules: ['core', 'advanced_questions', 'exam_patterns', 'ai_questions', 'bulk_ops', 'notifications'],
    limits: { max_students: 1000, ai_questions: 500, ai_evaluations: 0 },
  },
  college: {
    modules: [
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
    limits: { max_students: 3000, ai_questions: 1500, ai_evaluations: 3000 },
  },
  enterprise: {
    modules: [
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
    limits: { max_students: 10000, ai_questions: 10000, ai_evaluations: 10000 },
  },
};

export async function createTenant(formData: FormData) {
  const name = formData.get('name') as string;
  const slug = formData.get('slug') as string;
  const adminEmail = formData.get('adminEmail') as string;
  const adminFullName = formData.get('adminFullName') as string;
  const adminPassword = formData.get('adminPassword') as string;
  const plan = formData.get('plan') as string;
  const selectedModules = formData.getAll('modules') as string[];
  const primaryColor = formData.get('primaryColor') as string;
  const secondaryColor = formData.get('secondaryColor') as string;
  const logoUrl = formData.get('logoUrl') as string;
  const faviconUrl = formData.get('faviconUrl') as string;
  const customCss = formData.get('customCss') as string;
  const emailTemplate = formData.get('emailTemplate') as string;
  const smsTemplate = formData.get('smsTemplate') as string;

  if (!name || !slug || !adminEmail || !adminFullName || !adminPassword || !plan) {
    throw new Error('All fields are required');
  }

  // Basic slug validation
  const sanitizedSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '');
  if (sanitizedSlug !== slug) {
    throw new Error('Subdomain must only contain lowercase letters, numbers, and hyphens');
  }

  // Password hash
  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(adminPassword, salt);

  try {
    const planConfig = PLAN_CONFIGS[plan] || PLAN_CONFIGS.starter;

    // Use transaction to ensure both tenant and user are created atomically
    await prisma.$transaction(async (tx) => {
      // 1. Create Tenant record
      const tenant = await tx.tenants.create({
        data: {
          name,
          slug,
          subscription_plan: plan,
          modules_enabled: selectedModules.length > 0 ? selectedModules : planConfig.modules,
          module_settings: planConfig.limits,
          is_active: true,
          primary_color: primaryColor || '#2563EB',
          secondary_color: secondaryColor || '#7C3AED',
          logo_url: logoUrl || null,
          favicon_url: faviconUrl || null,
          custom_css: customCss || null,
          email_template: emailTemplate || null,
          sms_template: smsTemplate || null,
        },
      });

      // 2. Create initial Tenant Admin User
      await tx.users.create({
        data: {
          tenant_id: tenant.id,
          email: adminEmail,
          password_hash: passwordHash,
          full_name: adminFullName,
          role: 'admin',
          is_active: true,
          email_verified: true,
        },
      });

      // 3. Create Tenant Modules mappings
      const modulesToEnable = selectedModules.length > 0 ? selectedModules : planConfig.modules;
      
      // Fetch matching module IDs from catalog
      const dbModules = await tx.modules.findMany({
        where: {
          code: { in: modulesToEnable }
        }
      });

      const tenantModulesData = dbModules.map(mod => ({
        tenant_id: tenant.id,
        module_id: mod.id,
        is_enabled: true,
        custom_limits: planConfig.limits
      }));

      if (tenantModulesData.length > 0) {
        await tx.tenant_modules.createMany({
          data: tenantModulesData
        });
      }
    });

    revalidatePath('/super');
    return { success: true };
  } catch (error: any) {
    if (error.code === 'P2002') {
      throw new Error('Subdomain slug or admin email already exists');
    }
    throw new Error(error.message || 'Failed to create tenant');
  }
}

export async function toggleTenantStatus(tenantId: string, currentStatus: boolean) {
  try {
    await prisma.tenants.update({
      where: { id: tenantId },
      data: { is_active: !currentStatus }
    });
    revalidatePath('/super');
    return { success: true };
  } catch (error: any) {
    throw new Error(error.message || 'Failed to update tenant status');
  }
}

export async function deleteTenant(tenantId: string) {
  try {
    await prisma.tenants.delete({
      where: { id: tenantId }
    });
    revalidatePath('/super');
    return { success: true };
  } catch (error: any) {
    throw new Error(error.message || 'Failed to delete tenant');
  }
}
