import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const globalForRedis = global as unknown as { redis: Redis };

export const redis =
  globalForRedis.redis ||
  new Redis(REDIS_URL, {
    maxRetriesPerRequest: null, // Required for BullMQ
    retryStrategy(times) {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
  });

redis.on('error', (err) => {
  console.error('Redis connection error:', err);
});

if (process.env.NODE_ENV !== 'production') globalForRedis.redis = redis;
