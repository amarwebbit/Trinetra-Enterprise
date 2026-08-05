export interface PerformanceContext {
  operation: string;
  duration?: number;
  success?: boolean;
  error?: Error;
  metadata?: Record<string, any>;
}

function getSentry() {
  try {
    return eval('require')('@sentry/nextjs');
  } catch {
    return null;
  }
}

export class MonitoringService {
  private static instance: MonitoringService;
  private isInitialized: boolean = false;

  private constructor() {
    this.isInitialized = !!process.env.SENTRY_DSN;
  }

  static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService();
    }
    return MonitoringService.instance;
  }

  // ============================================
  // Error Tracking
  // ============================================
  captureException(error: Error, context?: Record<string, any>) {
    if (this.isInitialized) {
      try {
        const Sentry = getSentry();
        if (Sentry) {
          Sentry.withScope((scope: any) => {
            if (context) {
              scope.setContext('context', context);
            }
            Sentry.captureException(error);
          });
        }
      } catch (err) {
        console.error('[Monitoring] Error sending to Sentry:', err);
      }
    }
    if (process.env.NODE_ENV === 'development') {
      console.error('[Monitoring] Exception:', error.message, context);
    }
  }

  captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info', context?: Record<string, any>) {
    if (this.isInitialized) {
      try {
        const Sentry = getSentry();
        if (Sentry) {
          Sentry.withScope((scope: any) => {
            if (context) {
              scope.setContext('context', context);
            }
            Sentry.captureMessage(message, level);
          });
        }
      } catch (err) {
        console.error('[Monitoring] Error sending message to Sentry:', err);
      }
    }
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Monitoring] ${level}:`, message, context);
    }
  }

  // ============================================
  // Performance Tracking
  // ============================================
  async trackPerformance<T>(
    operation: string,
    fn: () => Promise<T>,
    context?: Record<string, any>
  ): Promise<T> {
    const start = Date.now();

    try {
      const result = await fn();
      const duration = Date.now() - start;

      // Log slow operations
      if (duration > 2000) {
        this.captureMessage(`Slow operation: ${operation} took ${duration}ms`, 'warning', {
          ...context,
          duration,
        });
      }

      return result;

    } catch (error) {
      const duration = Date.now() - start;

      this.captureException(error as Error, {
        operation,
        duration,
        ...context,
      });

      throw error;
    }
  }

  // ============================================
  // User Context Tracking
  // ============================================
  setUserContext(user: { id: string; email?: string | null; role?: string | null; tenantId?: string | null }) {
    if (this.isInitialized) {
      try {
        const Sentry = getSentry();
        if (Sentry) {
          Sentry.setUser({
            id: user.id,
            email: user.email || undefined,
            role: user.role || undefined,
            tenantId: user.tenantId || undefined,
          });
        }
      } catch (err) {
        console.error('[Monitoring] Failed to set user context:', err);
      }
    }
  }

  clearUserContext() {
    if (this.isInitialized) {
      try {
        const Sentry = getSentry();
        if (Sentry) {
          Sentry.setUser(null);
        }
      } catch (err) {
        console.error('[Monitoring] Failed to clear user context:', err);
      }
    }
  }

  // ============================================
  // Breadcrumb Tracking
  // ============================================
  addBreadcrumb(message: string, category: string, data?: Record<string, any>) {
    if (this.isInitialized) {
      try {
        const Sentry = getSentry();
        if (Sentry) {
          Sentry.addBreadcrumb({
            message,
            category,
            data,
            level: 'info',
          });
        }
      } catch (err) {
        console.error('[Monitoring] Failed to add breadcrumb:', err);
      }
    }
  }

  // ============================================
  // Database Query Tracing
  // ============================================
  async traceQuery<T>(
    query: string,
    params: any[],
    fn: () => Promise<T>
  ): Promise<T> {
    const start = Date.now();

    try {
      const result = await fn();
      const duration = Date.now() - start;

      if (duration > 1000) {
        this.captureMessage(`Slow query detected: ${query}`, 'warning', {
          query,
          params,
          duration,
        });
      }

      return result;
    } catch (error) {
      this.captureException(error as Error, {
        query,
        params,
      });
      throw error;
    }
  }
}

export const monitoring = MonitoringService.getInstance();

export function trackPerformance(operation: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const start = Date.now();

      try {
        const result = await originalMethod.apply(this, args);
        const duration = Date.now() - start;

        if (duration > 2000) {
          console.warn(`[Performance] ${operation}: ${duration}ms - SLOW`);
        }

        return result;
      } catch (error) {
        const duration = Date.now() - start;
        console.error(`[Performance] ${operation}: ${duration}ms - FAILED`);
        throw error;
      }
    };

    return descriptor;
  };
}
