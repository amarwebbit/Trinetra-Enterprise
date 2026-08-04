// src/lib/redis/rate-limit.ts
import { RateLimiterRedis } from 'rate-limiter-flexible';
import { redis } from './client';

// Auth Rate Limiter - Progressive Lockout
export const authAccountLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'rl:auth:account',
  points: 5,
  duration: 15 * 60,
  blockDuration: 15 * 60,        // Base lockout: 15m
  inMemoryBlockOnConsumed: 6,    // ← CORRECT - capital 'M'
  inMemoryBlockDuration: 60,     // 60 seconds in-memory
});

// Public APIs (60 req/min)
export const publicApiLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'rl:public',
  points: 60,
  duration: 60,
});

// Admin Read (300 req/min)
export const adminReadLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'rl:admin:read',
  points: 300,
  duration: 60,
});

// Admin CRUD (60 req/min)
export const adminCrudLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'rl:admin:crud',
  points: 60,
  duration: 60,
});

// Exam API (300 req/min)
export const examApiLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'rl:exam',
  points: 300,
  duration: 60,
});

// AI API (20 req/min)
export const aiApiLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'rl:ai',
  points: 20,
  duration: 60,
});

// Bulk Operations (2 per 10 minutes)
export const bulkLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'rl:bulk',
  points: 2,
  duration: 10 * 60,
});