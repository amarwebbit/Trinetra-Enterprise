import { Queue } from 'bullmq';
import { redis } from '../redis/client';

export const bulkQueue = new Queue('bulk-operations', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: {
      age: 24 * 3600, // keep for 24 hours
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // keep for 7 days
    },
  },
});
