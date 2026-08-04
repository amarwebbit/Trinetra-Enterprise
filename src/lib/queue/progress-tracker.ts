import { redis } from '@/lib/redis/client';

export interface ImportError {
  row: number;
  field: string;
  message: string;
  value: string;
}

export interface ProgressData {
  total: number;
  processed: number;
  success: number;
  failed: number;
  errors: ImportError[];
  status: 'processing' | 'completed' | 'failed';
  startedAt: string;
  updatedAt?: string;
  completedAt?: string;
  error?: string;
}

export class ProgressTracker {
  private readonly keyPrefix = 'import:progress:';
  
  async start(jobId: string, total: number): Promise<void> {
    await redis.setex(`${this.keyPrefix}${jobId}`, 3600, JSON.stringify({
      total,
      processed: 0,
      success: 0,
      failed: 0,
      errors: [],
      status: 'processing',
      startedAt: new Date().toISOString(),
    }));
  }
  
  async update(jobId: string, data: Partial<ProgressData>): Promise<void> {
    const current = await this.get(jobId);
    if (current) {
      await redis.setex(`${this.keyPrefix}${jobId}`, 3600, JSON.stringify({
        ...current,
        ...data,
        updatedAt: new Date().toISOString(),
      }));
    }
  }
  
  async get(jobId: string): Promise<ProgressData | null> {
    const data = await redis.get(`${this.keyPrefix}${jobId}`);
    return data ? JSON.parse(data) : null;
  }
  
  async addError(jobId: string, error: ImportError): Promise<void> {
    const current = await this.get(jobId);
    if (current) {
      if (current.errors.length < 500) {
        current.errors.push(error);
      }
      current.failed += 1;
      await this.update(jobId, { errors: current.errors, failed: current.failed });
    }
  }
  
  async complete(jobId: string, successCount: number): Promise<void> {
    await this.update(jobId, {
      status: 'completed',
      success: successCount,
      completedAt: new Date().toISOString(),
    });
  }
  
  async fail(jobId: string, error: string): Promise<void> {
    await this.update(jobId, {
      status: 'failed',
      error,
      completedAt: new Date().toISOString(),
    });
  }
}
