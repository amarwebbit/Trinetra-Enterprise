interface Metric {
  name: string;
  value: number;
  timestamp: number;
  tags?: Record<string, string>;
}

interface MetricBatch {
  metrics: Metric[];
  timestamp: number;
  source: string;
}

class MetricsService {
  private static instance: MetricsService;
  private metrics: Metric[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private isFlushing = false;
  private maxBatchSize = 100;
  private flushIntervalMs = 30000;

  private constructor() {
    // Only set up interval on server side
    if (typeof window === 'undefined') {
      this.flushInterval = setInterval(() => this.flush(), this.flushIntervalMs);
    }

    // Handle graceful shutdown
    if (typeof process !== 'undefined' && process.on) {
      process.on('SIGTERM', () => {
        this.flush();
      });
    }
  }

  static getInstance(): MetricsService {
    if (!MetricsService.instance) {
      MetricsService.instance = new MetricsService();
    }
    return MetricsService.instance;
  }

  record(name: string, value: number, tags?: Record<string, string>) {
    this.metrics.push({
      name,
      value,
      timestamp: Date.now(),
      tags: tags || {},
    });

    // Auto-flush if buffer exceeds limit
    if (this.metrics.length >= this.maxBatchSize) {
      this.flush();
    }
  }

  // ============================================
  // Convenience methods
  // ============================================
  increment(name: string, value: number = 1, tags?: Record<string, string>) {
    this.record(name, value, tags);
  }

  timing(name: string, duration: number, tags?: Record<string, string>) {
    this.record(`${name}_duration_ms`, duration, tags);
  }

  gauge(name: string, value: number, tags?: Record<string, string>) {
    this.record(`${name}_gauge`, value, tags);
  }

  histogram(name: string, value: number, tags?: Record<string, string>) {
    this.record(`${name}_histogram`, value, tags);
  }

  // ============================================
  // Flush metrics to backend
  // ============================================
  private async flush() {
    if (this.isFlushing || this.metrics.length === 0) {
      return;
    }

    this.isFlushing = true;
    const batch = [...this.metrics];
    this.metrics = [];

    try {
      if (typeof window !== 'undefined') {
        // Client-side: send via beacon or fetch
        const payload: MetricBatch = {
          metrics: batch,
          timestamp: Date.now(),
          source: 'client',
        };

        if (navigator.sendBeacon) {
          const blob = new Blob([JSON.stringify(payload)], {
            type: 'application/json',
          });
          navigator.sendBeacon('/api/metrics', blob);
        } else {
          await fetch('/api/metrics', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            keepalive: true,
          });
        }
      } else {
        // Server-side: log or send to monitoring service
        const payload: MetricBatch = {
          metrics: batch,
          timestamp: Date.now(),
          source: 'server',
        };

        if (process.env.NODE_ENV === 'production') {
          console.log('[Metrics]', JSON.stringify(payload));
        } else {
          console.log('[Metrics]', JSON.stringify(payload));
        }
      }
    } catch (error) {
      console.error('Failed to flush metrics:', error);
      this.metrics = [...batch, ...this.metrics];
    } finally {
      this.isFlushing = false;
    }
  }

  // ============================================
  // Clean up
  // ============================================
  destroy() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    this.flush();
  }
}

export const metrics = MetricsService.getInstance();
