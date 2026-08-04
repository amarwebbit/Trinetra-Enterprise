import { NextResponse } from 'next/server';
import { cache } from './cache';

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export class OptimizedAPI {
  static async get<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: { ttl?: number; tags?: string[] } = { ttl: 60 }
  ): Promise<NextResponse> {
    try {
      const data = await cache.getOrSet(key, fetcher, {
        ttl: options.ttl,
        tags: options.tags,
      });
      return NextResponse.json({ success: true, data });
    } catch (error) {
      console.error(`[API Error] ${key}:`, error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch data' },
        { status: 500 }
      );
    }
  }

  static async paginatedQuery<T>(
    model: any,
    options: {
      where?: any;
      select?: any;
      include?: any;
      orderBy?: any;
      page?: number;
      limit?: number;
      cacheKey?: string;
      ttl?: number;
      tags?: string[];
    }
  ): Promise<PaginatedResult<T>> {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const cacheKey = options.cacheKey || `${model.name || 'query'}:${JSON.stringify(options)}`;

    return cache.getOrSet(
      cacheKey,
      async () => {
        const [data, total] = await Promise.all([
          model.findMany({
            where: options.where,
            select: options.select,
            include: options.include,
            orderBy: options.orderBy || { created_at: 'desc' },
            take: limit,
            skip: skip,
          }),
          model.count({ where: options.where }),
        ]);

        return {
          data,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            hasMore: page * limit < total,
          },
        };
      },
      { ttl: options.ttl || 60, tags: options.tags }
    );
  }

  static async batchGet<T>(
    ids: string[],
    fetcher: (ids: string[]) => Promise<T[]>,
    keyPrefix: string,
    options: { ttl?: number } = { ttl: 300 }
  ): Promise<T[]> {
    if (!ids.length) return [];

    const cacheKeys = ids.map(id => `${keyPrefix}:${id}`);
    const cached = await Promise.all(cacheKeys.map(key => cache.get<T>(key)));
    
    const missingIndices: number[] = [];
    const results: (T | null)[] = [];
    
    cached.forEach((item, index) => {
      if (item === null) {
        missingIndices.push(index);
        results.push(null);
      } else {
        results.push(item);
      }
    });

    if (missingIndices.length > 0) {
      const missingIds = missingIndices.map(i => ids[i]);
      const fetched = await fetcher(missingIds);
      
      await Promise.all(
        fetched.map((item) => {
          const id = (item as any).id;
          if (id) {
            return cache.set(`${keyPrefix}:${id}`, item, { ttl: options.ttl });
          }
          return Promise.resolve();
        })
      );
      
      missingIndices.forEach((index, i) => {
        results[index] = fetched[i];
      });
    }

    return results.filter((item): item is T => item !== null);
  }
}
