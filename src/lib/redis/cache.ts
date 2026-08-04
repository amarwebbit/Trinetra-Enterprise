import { redis } from './client';

export const CacheService = {
  async get(key: string): Promise<any | null> {
    try {
      const data = await redis.get(key);
      if (!data) return null;
      return JSON.parse(data);
    } catch (e) {
      console.error('Cache get error:', e);
      return null;
    }
  },

  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    try {
      const data = JSON.stringify(value);
      if (ttlSeconds) {
        await redis.set(key, data, 'EX', ttlSeconds);
      } else {
        await redis.set(key, data);
      }
    } catch (e) {
      console.error('Cache set error:', e);
    }
  },

  async delete(key: string): Promise<void> {
    try {
      await redis.del(key);
    } catch (e) {
      console.error('Cache delete error:', e);
    }
  }
};
