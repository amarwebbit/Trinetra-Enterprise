import { redis } from './client';

export async function checkRedisHealth(): Promise<{ status: 'online' | 'offline'; latencyMs: number }> {
  try {
    const start = Date.now();
    
    // Use Promise.race to enforce a 2-second timeout
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Redis ping timeout')), 2000)
    );
    
    const pingPromise = redis.ping();
    
    await Promise.race([pingPromise, timeoutPromise]);
    
    const latencyMs = Date.now() - start;
    
    return {
      status: 'online',
      latencyMs
    };
  } catch (error) {
    console.error('Redis health check failed:', error);
    return {
      status: 'offline',
      latencyMs: 0
    };
  }
}
