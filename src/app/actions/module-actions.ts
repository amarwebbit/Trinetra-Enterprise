'use server';

import { prisma } from '@/lib/db/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { revalidatePath } from 'next/cache';

export async function toggleModule(tenantId: string, moduleId: string, enable: boolean) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'super_admin') {
    throw new Error('Unauthorized');
  }

  const module = await prisma.modules.findUnique({
    where: { id: moduleId }
  });

  if (!module) {
    throw new Error('Module not found');
  }

  if (enable) {
    // Check if dependencies are enabled
    if (module.depends_on && module.depends_on.length > 0) {
      for (const depCode of module.depends_on) {
        // Find the dependency module by code
        const depModule = await prisma.modules.findUnique({
          where: { code: depCode }
        });
        
        if (!depModule) {
          throw new Error(`Required module ${depCode} does not exist in the platform.`);
        }

        // Check if the dependency is enabled for this tenant
        const isDepEnabled = await prisma.tenant_modules.findUnique({
          where: {
            tenant_id_module_id: {
              tenant_id: tenantId,
              module_id: depModule.id
            }
          }
        });

        if (!isDepEnabled || !isDepEnabled.is_enabled) {
          throw new Error(`Cannot enable: Dependency '${depModule.name}' must be enabled first.`);
        }
      }
    }
  } else {
    // Check if any enabled modules depend on THIS module before disabling
    const dependentModules = await prisma.modules.findMany({
      where: {
        depends_on: {
          has: module.code
        }
      }
    });

    for (const dep of dependentModules) {
      const isEnabled = await prisma.tenant_modules.findUnique({
        where: {
          tenant_id_module_id: {
            tenant_id: tenantId,
            module_id: dep.id
          }
        }
      });

      if (isEnabled && isEnabled.is_enabled) {
        throw new Error(`Cannot disable: Enabled module '${dep.name}' depends on this module.`);
      }
    }
  }

  // Upsert the tenant_module record
  await prisma.tenant_modules.upsert({
    where: {
      tenant_id_module_id: {
        tenant_id: tenantId,
        module_id: moduleId
      }
    },
    update: {
      is_enabled: enable
    },
    create: {
      tenant_id: tenantId,
      module_id: moduleId,
      is_enabled: enable,
      custom_limits: {},
      usage_count: {}
    }
  });

  // Log the action
  await prisma.audit_logs.create({
    data: {
      tenant_id: tenantId,
      user_id: session.user.id,
      action: enable ? 'MODULE_ENABLED' : 'MODULE_DISABLED',
      resource_type: 'module',
      resource_id: moduleId,
      metadata: { module_code: module.code, is_enabled: enable },
    }
  });

  revalidatePath(`/super/tenants/${tenantId}/modules`);
  return { success: true };
}

export async function updateModuleLimits(tenantId: string, moduleId: string, limits: any) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'super_admin') {
    throw new Error('Unauthorized');
  }

  const tenantModule = await prisma.tenant_modules.findUnique({
    where: {
      tenant_id_module_id: {
        tenant_id: tenantId,
        module_id: moduleId
      }
    }
  });

  if (!tenantModule) {
    throw new Error('Tenant module not found');
  }

  await prisma.tenant_modules.update({
    where: {
      tenant_id_module_id: {
        tenant_id: tenantId,
        module_id: moduleId
      }
    },
    data: {
      custom_limits: limits
    }
  });

  await prisma.audit_logs.create({
    data: {
      tenant_id: tenantId,
      user_id: session.user.id,
      action: 'MODULE_LIMITS_UPDATED',
      resource_type: 'module',
      resource_id: moduleId,
      metadata: { new_limits: limits },
    }
  });

  revalidatePath(`/super/tenants/${tenantId}/modules`);
  return { success: true };
}

export async function resetModuleUsage(tenantId: string, moduleId: string) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'super_admin') {
    throw new Error('Unauthorized');
  }

  await prisma.tenant_modules.update({
    where: {
      tenant_id_module_id: {
        tenant_id: tenantId,
        module_id: moduleId
      }
    },
    data: {
      usage_count: {}
    }
  });

  await prisma.audit_logs.create({
    data: {
      tenant_id: tenantId,
      user_id: session.user.id,
      action: 'MODULE_USAGE_RESET',
      resource_type: 'module',
      resource_id: moduleId,
    }
  });

  revalidatePath(`/super/tenants/${tenantId}/modules`);
  return { success: true };
}
