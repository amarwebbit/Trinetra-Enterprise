import { NextRequest, NextResponse } from 'next/server';
import { examApiLimiter, publicApiLimiter } from './rate-limit';

export type RateLimitConfig = {
  limiter: typeof examApiLimiter | typeof publicApiLimiter;
  key?: (req: NextRequest) => Promise<string> | string;
};

/**
 * Higher-order function to apply rate limiting to API handlers (general helper)
 */
export function withRateLimit(config: RateLimitConfig) {
  return function(handler: (req: NextRequest) => Promise<NextResponse>) {
    return async function(req: NextRequest) {
      try {
        const key = config.key 
          ? typeof config.key === 'function' 
            ? await config.key(req) 
            : config.key
          : req.headers.get('x-forwarded-for') || 
            req.headers.get('x-real-ip') || 
            'anonymous';

        const res = await config.limiter.consume(key, 1);

        const response = await handler(req);
        response.headers.set('X-RateLimit-Limit', String(config.limiter.points));
        response.headers.set('X-RateLimit-Remaining', String(res.remainingPoints));
        response.headers.set('X-RateLimit-Reset', new Date(Date.now() + res.msBeforeNext).toISOString());
        return response;
      } catch (rejRes: any) {
        const msBeforeNext = rejRes?.msBeforeNext || 60000;
        return NextResponse.json(
          { 
            error: 'Too many requests. Please try again later.',
            limit: config.limiter.points,
            reset: new Date(Date.now() + msBeforeNext).toISOString(),
          },
          { 
            status: 429,
            headers: {
              'X-RateLimit-Limit': String(config.limiter.points),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': new Date(Date.now() + msBeforeNext).toISOString(),
            },
          }
        );
      }
    };
  };
}

/**
 * Apply rate limiting to a Next.js API route handler specifically for Exams
 */
export function withExamRateLimit(handler: (req: NextRequest) => Promise<NextResponse>) {
  return async function(req: NextRequest) {
    const key = req.headers.get('x-forwarded-for') || 
                req.headers.get('x-real-ip') || 
                'anonymous';

    try {
      const res = await examApiLimiter.consume(key, 1);

      const response = await handler(req);
      response.headers.set('X-RateLimit-Limit', String(examApiLimiter.points));
      response.headers.set('X-RateLimit-Remaining', String(res.remainingPoints));
      response.headers.set('X-RateLimit-Reset', new Date(Date.now() + res.msBeforeNext).toISOString());
      return response;
    } catch (rejRes: any) {
      const msBeforeNext = rejRes?.msBeforeNext || 60000;
      return NextResponse.json(
        { 
          error: 'Too many exam requests. Please try again later.',
          limit: examApiLimiter.points,
          reset: new Date(Date.now() + msBeforeNext).toISOString(),
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': String(examApiLimiter.points),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(Date.now() + msBeforeNext).toISOString(),
          },
        }
      );
    }
  };
}
