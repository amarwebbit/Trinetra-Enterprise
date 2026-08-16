import { prisma } from '@/lib/db/client';

export class TimeService {
  private static instance: TimeService;

  private constructor() {}

  static getInstance(): TimeService {
    if (!TimeService.instance) {
      TimeService.instance = new TimeService();
    }
    return TimeService.instance;
  }

  /**
   * Validate that a student's attempt is still within their individual time limit
   */
  async validateAttemptTime(attemptId: string, graceMinutes: number = 2): Promise<{
    valid: boolean;
    remainingSeconds: number;
    elapsedSeconds: number;
    totalSeconds: number;
    error?: string;
  }> {
    const attempt = await prisma.exam_attempts.findUnique({
      where: { id: attemptId },
      include: {
        exams: {
          select: {
            duration_minutes: true,
            start_time: true,
            end_time: true,
          },
        },
      },
    });

    if (!attempt) {
      return { valid: false, remainingSeconds: 0, elapsedSeconds: 0, totalSeconds: 0, error: 'Attempt not found' };
    }

    if (!attempt.start_time) {
      return { valid: false, remainingSeconds: 0, elapsedSeconds: 0, totalSeconds: 0, error: 'Attempt not started' };
    }

    const now = Date.now();
    const startTime = new Date(attempt.start_time).getTime();

    const metadata = attempt.metadata as any || {};
    const timeAdjustmentSeconds = Number(metadata.time_adjustment_seconds || 0);
    const timeAdjustmentMs = timeAdjustmentSeconds * 1000;

    const durationMs = attempt.exams.duration_minutes * 60 * 1000;
    const endTime = startTime + durationMs + timeAdjustmentMs + (graceMinutes * 60 * 1000); // Add grace period and adjustment

    const elapsedSeconds = Math.floor((now - startTime) / 1000);
    const totalSeconds = attempt.exams.duration_minutes * 60;
    const remainingSeconds = Math.max(0, Math.floor((endTime - now) / 1000));

    // Check if beyond individual deadline
    if (now > endTime) {
      return {
        valid: false,
        remainingSeconds: 0,
        elapsedSeconds,
        totalSeconds,
        error: 'Time limit exceeded for this attempt',
      };
    }

    // Also check global exam window
    const examStart = new Date(attempt.exams.start_time).getTime();
    const examEnd = new Date(attempt.exams.end_time).getTime();

    if (now < examStart) {
      return { valid: false, remainingSeconds, elapsedSeconds, totalSeconds, error: 'Exam not started yet' };
    }

    if (now > examEnd) {
      return { valid: false, remainingSeconds, elapsedSeconds, totalSeconds, error: 'Exam window closed' };
    }

    return {
      valid: true,
      remainingSeconds,
      elapsedSeconds,
      totalSeconds,
    };
  }

  /**
   * Get remaining time for an attempt
   */
  async getRemainingTime(attemptId: string): Promise<number> {
    const result = await this.validateAttemptTime(attemptId);
    return result.valid ? result.remainingSeconds : 0;
  }
}

export const timeService = TimeService.getInstance();
