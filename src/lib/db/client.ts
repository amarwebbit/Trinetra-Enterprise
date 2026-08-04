import { PrismaClient } from '@prisma/client';

const prismaClientSingleton = () => {
  const client = new PrismaClient();
  
  // Extend Prisma to support RLS safely across PgBouncer connections
  return client.$extends({
    client: {
      /**
       * Executes a Prisma transaction with Row-Level Security enforced.
       * This is safe for PgBouncer / Connection Pools because the context
       * is set locally within the transaction block.
       */
      async $withRLS<T>(
        tenantId: string, 
        role: string, 
        callback: (tx: any) => Promise<T>
      ): Promise<T> {
        return await client.$transaction(async (tx) => {
          // 1. Set the tenant ID local to this transaction
          await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`;
          
          // 2. Set the user role local to this transaction
          await tx.$executeRaw`SELECT set_config('app.current_user_role', ${role}, true)`;
          
          // 3. Execute the callback using the secured transaction context
          return await callback(tx);
        });
      }
    }
  });
};

type ExtendedPrismaClient = ReturnType<typeof prismaClientSingleton>;

declare global {
  var prisma: undefined | ExtendedPrismaClient;
}

export const prisma = globalThis.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}
