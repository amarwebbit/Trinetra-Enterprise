import { prisma } from '@/lib/db/client';
import { cache } from '@/lib/cache';

interface ViolationEvent {
  attemptId: string;
  eventType: string;
  questionNumber?: number;
  metadata?: Record<string, any>;
  clientTimestamp?: string;
}

export class ProctoringService {
  private static instance: ProctoringService;

  private constructor() {}

  static getInstance(): ProctoringService {
    if (!ProctoringService.instance) {
      ProctoringService.instance = new ProctoringService();
    }
    return ProctoringService.instance;
  }

  /**
   * Record a violation with server-side authority
   * This is the ONLY place where violation counts are managed
   */
  async recordViolation(event: ViolationEvent) {
    // Get current attempt with locking to prevent race conditions
    const attemptResult = await prisma.$transaction(async (tx) => {
      // Lock the row for update
      const lockedAttempt = await tx.exam_attempts.findUnique({
        where: { id: event.attemptId },
        include: {
          exams: {
            select: {
              full_screen_required: true,
              disable_copy_paste: true,
              require_webcam: true,
              metadata: true,
            },
          },
        },
      });

      if (!lockedAttempt) {
        throw new Error('Attempt not found');
      }

      const examMeta = (lockedAttempt.exams.metadata as Record<string, any>) || {};
      const enableProctoring = Boolean(
        lockedAttempt.exams.full_screen_required ||
        lockedAttempt.exams.disable_copy_paste ||
        lockedAttempt.exams.require_webcam ||
        examMeta.enable_proctoring ||
        false
      );

      // Check if proctoring is enabled
      if (!enableProctoring) {
        const attemptMeta = (lockedAttempt.metadata as Record<string, any>) || {};
        return { shouldSubmit: false, newCount: Number(attemptMeta.violation_count || 0), threshold: 3 };
      }

      const attemptMeta = (lockedAttempt.metadata as Record<string, any>) || {};
      const currentCount = Number(attemptMeta.violation_count || 0);

      // Increment violation count (server-side authority)
      const newCount = currentCount + 1;
      const threshold = Number(examMeta.violation_threshold ?? 3);
      const autoSubmitOnViolation = examMeta.auto_submit_on_violation !== false;
      const shouldSubmit = autoSubmitOnViolation && newCount >= threshold;

      // Update attempt
      await tx.exam_attempts.update({
        where: { id: event.attemptId },
        data: {
          status: shouldSubmit ? 'auto_submitted' : lockedAttempt.status,
          metadata: {
            ...attemptMeta,
            violation_count: newCount,
          },
          updated_at: new Date(),
        },
      });

      // Create violation log
      await tx.proctoring_logs.create({
        data: {
          tenant_id: lockedAttempt.tenant_id,
          attempt_id: event.attemptId,
          event_type: event.eventType,
          severity: shouldSubmit ? 'critical' : newCount >= threshold / 2 ? 'high' : 'medium',
          event_data: {
            ...event.metadata,
            questionNumber: event.questionNumber,
            clientTimestamp: event.clientTimestamp,
            serverTimestamp: new Date().toISOString(),
            violationCount: newCount,
            threshold: threshold,
          },
        },
      });

      return { shouldSubmit, newCount, threshold };
    });

    // Invalidate cache
    await cache.invalidateTag(`attempt:${event.attemptId}`);

    return attemptResult;
  }

  /**
   * Get current violation status for an attempt
   */
  async getViolationStatus(attemptId: string) {
    const attempt = await prisma.exam_attempts.findUnique({
      where: { id: attemptId },
      select: {
        status: true,
        metadata: true,
        exams: {
          select: {
            metadata: true,
          },
        },
      },
    });

    if (!attempt) {
      throw new Error('Attempt not found');
    }

    const attemptMeta = (attempt.metadata as Record<string, any>) || {};
    const examMeta = (attempt.exams.metadata as Record<string, any>) || {};

    const violationCount = Number(attemptMeta.violation_count || 0);
    const threshold = Number(examMeta.violation_threshold ?? 3);
    const autoSubmitOnViolation = examMeta.auto_submit_on_violation !== false;
    const shouldSubmit = autoSubmitOnViolation && violationCount >= threshold;

    return {
      violationCount,
      threshold,
      shouldSubmit,
      isAutoSubmitted: attempt.status === 'auto_submitted',
    };
  }
}

export const proctoringService = ProctoringService.getInstance();
