import { prisma } from '@/lib/db/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { redirect } from 'next/navigation';
import ModulesUI from './ModulesUI';
import { toggleModule, updateModuleLimits, resetModuleUsage } from '@/app/actions/module-actions';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function TenantModulesPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'super_admin') {
    redirect('/login');
  }

  const tenantId = params.id;

  // Fetch tenant details
  const tenant = await prisma.tenants.findUnique({
    where: { id: tenantId },
    select: {
      id: true,
      name: true,
      slug: true,
      overage_limits: true,
    }
  });

  if (!tenant) {
    notFound();
  }

  // Fetch all modules available in the platform
  const allModules = await prisma.modules.findMany({
    where: { is_active: true },
    orderBy: { name: 'asc' }
  });

  // Fetch the specific tenant's module configuration and usage
  const tenantModules = await prisma.tenant_modules.findMany({
    where: { tenant_id: tenantId }
  });

  // Map the data together for the UI
  const mappedModules = allModules.map(module => {
    const tm = tenantModules.find(t => t.module_id === module.id);
    
    return {
      id: module.id,
      code: module.code,
      name: module.name,
      description: module.description || '',
      price: module.price ? parseFloat(module.price.toString()) : 0,
      dependsOn: module.depends_on,
      isCore: module.is_core || false,
      
      // Tenant specific data
      isEnabled: tm?.is_enabled || false,
      customLimits: tm?.custom_limits || {},
      usageCount: tm?.usage_count || {},
      
      // We also pass the tenant's global overage limits as a fallback
      tenantOverageLimits: tenant.overage_limits || {}
    };
  });

  return (
    <main className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Module Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Configure modules and billing limits for {tenant.name}
          </p>
        </div>
      </div>

      <ModulesUI 
        tenantId={tenant.id}
        tenantName={tenant.name}
        modules={mappedModules}
        toggleModule={toggleModule}
        updateModuleLimits={updateModuleLimits}
        resetModuleUsage={resetModuleUsage}
      />
    </main>
  );
}
