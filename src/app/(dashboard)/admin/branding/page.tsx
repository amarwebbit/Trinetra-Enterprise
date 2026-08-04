import { prisma } from '@/lib/db/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { redirect, notFound } from 'next/navigation';
import BrandingUI from './BrandingUI';

export const dynamic = 'force-dynamic';

export default async function AdminBrandingPage() {
  const session = await getServerSession(authOptions);
  
  if (!session || !['admin', 'super_admin'].includes(session.user.role)) {
    redirect('/login');
  }
  
  const tenantId = session.user.tenantId || (session.user as any).tenant_id;
  if (!tenantId) {
    throw new Error("No tenant ID found in session.");
  }

  const tenant = (await prisma.tenants.findUnique({
    where: { id: tenantId },
  })) as any;
  
  if (!tenant) {
    notFound();
  }
  
  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Tenant Branding
        </h1>
        <p className="text-sm text-muted-foreground">
          Customize your institution's appearance, logos, and communication templates.
        </p>
      </div>

      <BrandingUI tenant={tenant} />
    </main>
  );
}
