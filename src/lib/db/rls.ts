import { prisma } from './client';

/**
 * WARNING: Setting RLS context directly like this is unsafe in a PgBouncer / Serverless 
 * connection pooled environment because the session variables may persist to other 
 * requests using the same connection if not explicitly cleared.
 * 
 * USE `withRLS` (or `prisma.$withRLS`) FOR API ROUTES AND SERVER ACTIONS.
 * 
 * This is provided strictly for isolated environments or specific middleware constraints.
 */
export async function setRLSContext(tenantId: string, role: string) {
  await prisma.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, false)`;
  await prisma.$executeRaw`SELECT set_config('app.current_user_role', ${role}, false)`;
}

export async function clearRLSContext() {
  await prisma.$executeRaw`SELECT set_config('app.current_tenant_id', '', false)`;
  await prisma.$executeRaw`SELECT set_config('app.current_user_role', '', false)`;
}

/**
 * Wrapper for API routes and Server Actions using the Prisma Client Extension.
 * This is the SAFE way to execute RLS queries in a pooled environment.
 */
export async function withRLS<T>(
  tenantId: string, 
  role: string, 
  callback: (tx: any) => Promise<T>
): Promise<T> {
  return await prisma.$withRLS(tenantId, role, callback);
}
