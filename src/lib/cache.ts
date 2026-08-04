// In-memory fallback when Redis is not configured or fails
class InMemoryCache {
  private store: Map<string, { value: any; expiry: number }> = new Map();

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiry < Date.now()) {
      this.store.delete(key);
      return null;
    }
    return entry.value as T;
  }

  set(key: string, value: any, ttl: number = 60): void {
    this.store.set(key, {
      value,
      expiry: Date.now() + ttl * 1000,
    });
  }

  del(key: string): void {
    this.store.delete(key);
  }

  delPattern(pattern: string): void {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        this.store.delete(key);
      }
    }
  }
}

// Safely attempt Redis initialization with optional @upstash/redis or ioredis
const createRedisClient = () => {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  
  if (url && token) {
    try {
      // Dynamic require to prevent build errors if package is missing
      const { Redis } = require('@upstash/redis');
      return new Redis({ url, token });
    } catch (error) {
      console.warn('[Cache] Upstash Redis not loaded, using in-memory fallback');
    }
  }
  return null;
};

const redisClient = createRedisClient();
const memoryCache = new InMemoryCache();

export class CacheManager {
  private static instance: CacheManager;
  private useRedis: boolean;

  private constructor() {
    this.useRedis = redisClient !== null;
  }

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      if (this.useRedis && redisClient) {
        const data = await redisClient.get(key);
        if (!data) return null;
        return typeof data === 'string' ? (JSON.parse(data) as T) : (data as T);
      }
      return memoryCache.get<T>(key);
    } catch (error) {
      console.warn('[Cache] Read failed:', error);
      return memoryCache.get<T>(key);
    }
  }

  async set<T>(key: string, value: T, options: { ttl?: number } = { ttl: 60 }): Promise<void> {
    try {
      if (this.useRedis && redisClient) {
        await redisClient.set(key, JSON.stringify(value), {
          ex: options.ttl || 60,
        });
        return;
      }
      memoryCache.set(key, value, options.ttl || 60);
    } catch (error) {
      console.warn('[Cache] Write failed:', error);
      memoryCache.set(key, value, options.ttl || 60);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      if (this.useRedis && redisClient) {
        await redisClient.del(key);
        return;
      }
      memoryCache.del(key);
    } catch (error) {
      console.warn('[Cache] Delete failed:', error);
      memoryCache.del(key);
    }
  }

  async invalidateTag(tag: string): Promise<void> {
    const pattern = `tag:${tag}:*`;
    try {
      if (this.useRedis && redisClient) {
        const keys = await redisClient.keys(pattern);
        if (keys && keys.length > 0) {
          await redisClient.del(...keys);
        }
        return;
      }
      memoryCache.delPattern(pattern);
    } catch (error) {
      console.warn('[Cache] Invalidation failed:', error);
      memoryCache.delPattern(pattern);
    }
  }

  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: { ttl?: number; tags?: string[] } = { ttl: 60 }
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const data = await fetcher();
    await this.set(key, data, { ttl: options.ttl });

    if (options.tags?.length) {
      for (const tag of options.tags) {
        await this.set(`tag:${tag}:${key}`, true, { ttl: 3600 });
      }
    }

    return data;
  }
}

export const cache = CacheManager.getInstance();

export async function invalidateExamCache(examId: string) {
  await cache.invalidateTag(`exam:${examId}`);
  await cache.delete('exams:list');
}

export async function invalidateStudentCache(studentId: string) {
  await cache.invalidateTag(`student:${studentId}`);
}

export async function invalidateQuestionCache(questionId: string) {
  await cache.invalidateTag(`question:${questionId}`);
  await cache.delete('questions:list');
}
