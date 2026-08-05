import { prisma } from '@/lib/db';
import { cache } from '@/lib/cache';
import { monitoring } from '@/lib/monitoring';

export interface ServiceOptions {
  tenantId?: string;
  userId?: string;
  includeCache?: boolean;
  cacheTTL?: number;
  cacheTags?: string[];
}

export abstract class BaseService {
  protected prisma = prisma;
  protected cache = cache;
  protected monitoring = monitoring;

  protected async trackOperation<T>(
    operation: string,
    fn: () => Promise<T>,
    context?: Record<string, any>
  ): Promise<T> {
    return this.monitoring.trackPerformance(operation, fn, context);
  }

  protected async getCached<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: { ttl?: number; tags?: string[] } = { ttl: 60 }
  ): Promise<T> {
    return this.cache.getOrSet(key, fetcher, options);
  }

  protected async invalidateCache(tags: string[]): Promise<void> {
    for (const tag of tags) {
      await this.cache.invalidateTag(tag);
    }
  }

  protected getTenantId(options: ServiceOptions): string {
    if (!options.tenantId) {
      throw new Error('Tenant ID is required for this operation');
    }
    return options.tenantId;
  }

  protected validateAccess(
    resourceTenantId: string,
    userTenantId: string,
    userRole: string
  ): boolean {
    if (userRole === 'super_admin') return true;
    return resourceTenantId === userTenantId;
  }
}
