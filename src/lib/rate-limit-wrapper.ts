import { NextResponse } from 'next/server';
import { RateLimiterRedis } from 'rate-limiter-flexible';

export async function withRateLimit(
  req: Request,
  limiter: RateLimiterRedis,
  handler: (req: Request, ...args: any[]) => Promise<Response>,
  identifierGenerator?: (req: Request) => string | Promise<string>
): Promise<Response> {
  try {
    // Determine identifier (IP by default)
    let identifier = 'anonymous';
    if (identifierGenerator) {
      identifier = await identifierGenerator(req);
    } else {
      const forwarded = req.headers.get('x-forwarded-for');
      identifier = forwarded ? forwarded.split(',')[0] : '127.0.0.1';
    }

    try {
      const rateLimiterRes = await limiter.consume(identifier, 1);
      
      const response = await handler(req);
      
      // Inject Rate Limit Headers
      response.headers.set('X-RateLimit-Limit', String(limiter.points));
      response.headers.set('X-RateLimit-Remaining', String(rateLimiterRes.remainingPoints));
      response.headers.set('X-RateLimit-Reset', new Date(Date.now() + rateLimiterRes.msBeforeNext).toISOString());
      
      return response;
    } catch (rateLimiterRes: any) {
      // 429 Too Many Requests
      // rateLimiterRes is usually a RateLimiterRes object if rejected by rate limiter
      const msBeforeNext = rateLimiterRes.msBeforeNext || 60000;
      
      return NextResponse.json(
        { 
          error: 'Too many requests. Please try again later.',
          retryAfter: Math.ceil(msBeforeNext / 1000)
        },
        { 
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil(msBeforeNext / 1000)),
            'X-RateLimit-Limit': String(limiter.points),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(Date.now() + msBeforeNext).toISOString()
          }
        }
      );
    }
  } catch (error: any) {
    console.error('Rate limiting internal error:', error);
    // Fail open if Redis is down
    return handler(req);
  }
}
