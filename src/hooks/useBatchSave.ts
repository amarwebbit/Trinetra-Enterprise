'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface QueuedAnswer {
  questionId: string;
  selectedOption: string | null;
  markedForReview: boolean;
  timeSpent: number;
  clientUpdatedAt: string;
}

export function useBatchSave(attemptId: string, saveInterval: number = 5000) {
  const [queue, setQueue] = useState<QueuedAnswer[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [hasPendingChanges, setHasPendingChanges] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const queueRef = useRef<QueuedAnswer[]>([]);

  // Keep ref in sync with state
  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  // Flush queue to server
  const flushQueue = useCallback(async () => {
    if (queueRef.current.length === 0 || isSaving) return;

    setIsSaving(true);
    setHasPendingChanges(false);

    try {
      const payload = queueRef.current.map(answer => ({
        ...answer,
        clientUpdatedAt: answer.clientUpdatedAt || new Date().toISOString(),
      }));

      const response = await fetch('/api/student/exams/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attemptId,
          answers: payload,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Remove successfully synced items
        const successfulIds = data.results
          .filter((r: any) => r.status === 'success')
          .map((r: any) => r.questionId);

        setQueue(prev => prev.filter(q => !successfulIds.includes(q.questionId)));
        setLastSyncTime(new Date());

        // Handle conflicts (stale updates)
        const conflicts = data.results.filter((r: any) => r.status === 'conflict');
        if (conflicts.length > 0) {
          console.warn('Stale updates detected:', conflicts);
        }
      } else {
        // Keep items in queue for retry
        setHasPendingChanges(true);
        console.error('Save failed:', data.error);
      }
    } catch (error) {
      console.error('Batch save error:', error);
      setHasPendingChanges(true);
    } finally {
      setIsSaving(false);
    }
  }, [attemptId, isSaving]);

  // Auto-flush on interval
  useEffect(() => {
    const interval = setInterval(() => {
      if (queueRef.current.length > 0) {
        flushQueue();
      }
    }, saveInterval);

    return () => clearInterval(interval);
  }, [flushQueue, saveInterval]);

  // Flush on unmount
  useEffect(() => {
    return () => {
      if (queueRef.current.length > 0) {
        flushQueue();
      }
    };
  }, [flushQueue]);

  // Add answer to queue
  const enqueueAnswer = useCallback((answer: Omit<QueuedAnswer, 'clientUpdatedAt'>) => {
    setQueue(prev => {
      // Remove existing answer for same question
      const filtered = prev.filter(q => q.questionId !== answer.questionId);
      return [...filtered, {
        ...answer,
        clientUpdatedAt: new Date().toISOString(),
      }];
    });
    setHasPendingChanges(true);
  }, []);

  // Force immediate sync
  const syncNow = useCallback(async () => {
    if (queueRef.current.length > 0) {
      await flushQueue();
    }
  }, [flushQueue]);

  return {
    enqueueAnswer,
    syncNow,
    isSaving,
    hasPendingChanges,
    queueSize: queue.length,
    lastSyncTime,
  };
}
