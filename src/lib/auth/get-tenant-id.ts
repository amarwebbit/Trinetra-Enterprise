import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';

export async function getValidatedTenantId(session: any) {
  const tenantId = session?.user?.tenantId || session?.user?.tenant_id;
  const userRole = session?.user?.role;

  if (!tenantId) {
    return {
      errorResponse: NextResponse.json(
        { 
          error: 'Tenant ID not found in session', 
          message: 'Please re-authenticate or contact support.' 
        },
        { status: 400 }
      )
    };
  }

  const tenant = await prisma.tenants.findUnique({
    where: { id: tenantId },
    select: { id: true, is_active: true }
  });

  if (!tenant) {
    return {
      errorResponse: NextResponse.json(
        { 
          error: 'Invalid tenant.', 
          message: 'Please re-authenticate or contact support.' 
        },
        { status: 400 }
      )
    };
  }

  // Strictly block all tenant users if tenant is suspended
  if (!tenant.is_active && userRole !== 'super_admin') {
    return {
      errorResponse: NextResponse.json(
        { 
          error: 'Tenant Suspended', 
          message: 'Your institution access has been suspended by the administrator.' 
        },
        { status: 403 }
      )
    };
  }

  return { tenantId };
}
