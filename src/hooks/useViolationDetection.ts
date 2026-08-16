'use client';

import { useEffect, useRef, useCallback } from 'react';
import { ViolationType } from '@/lib/proctoring/violation-types';

interface UseViolationDetectionProps {
  examId: string;
  isActive: boolean;
  fullscreenRequired?: boolean;
  onViolation: (type: ViolationType, data?: any) => void;
}

export function useViolationDetection({
  examId,
  isActive,
  fullscreenRequired = true,
  onViolation,
}: UseViolationDetectionProps) {
  const violationRef = useRef<{ [key: string]: number }>({});
  const wasFullscreenRef = useRef(false);

  // Log violation with debounce (client-side only sends event)
  const logViolation = useCallback((type: ViolationType, metadata?: any) => {
    const now = Date.now();
    const lastViolation = violationRef.current[type] || 0;
    
    // Debounce: prevent spam (2-second cooldown)
    if (now - lastViolation < 2000) {
      return;
    }
    
    violationRef.current[type] = now;
    onViolation(type, metadata);
  }, [onViolation]);

  // Fullscreen detection
  useEffect(() => {
    if (!isActive || !fullscreenRequired) return;

    const handleFullscreenChange = () => {
      const isFullscreen = !!document.fullscreenElement;
      
      if (!isFullscreen && wasFullscreenRef.current) {
        logViolation('fullscreen_exit', {
          exitedAt: new Date().toISOString(),
        });
      }
      wasFullscreenRef.current = isFullscreen;
    };

    wasFullscreenRef.current = !!document.fullscreenElement;
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [isActive, fullscreenRequired, logViolation]);

  // Tab/Window blur detection
  useEffect(() => {
    if (!isActive) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        logViolation('tab_switch', {
          hiddenAt: new Date().toISOString(),
          visibilityState: document.visibilityState,
        });
      }
    };

    const handleWindowBlur = () => {
      logViolation('window_blur', {
        blurredAt: new Date().toISOString(),
      });
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [isActive, logViolation]);

  // Copy/Paste prevention (client-side only - server will also log)
  useEffect(() => {
    if (!isActive) return;

    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      logViolation('copy_attempt', {
        timestamp: new Date().toISOString(),
      });
    };

    const handlePaste = (e: ClipboardEvent) => {
      e.preventDefault();
      logViolation('paste_attempt', {
        timestamp: new Date().toISOString(),
      });
    };

    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);

    return () => {
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('paste', handlePaste);
    };
  }, [isActive, logViolation]);

  // Screenshot detection
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'PrintScreen') {
        e.preventDefault();
        logViolation('screenshot_attempt', {
          timestamp: new Date().toISOString(),
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, logViolation]);

  // DevTools detection
  useEffect(() => {
    if (!isActive) return;

    const checkDevTools = () => {
      const element = new Image();
      Object.defineProperty(element, 'id', {
        get: function() {
          logViolation('devtools_open', {
            timestamp: new Date().toISOString(),
          });
          return 'devtools-detected';
        }
      });
      console.log('%c', element);
    };

    const interval = setInterval(checkDevTools, 3000);
    return () => clearInterval(interval);
  }, [isActive, logViolation]);

  // Context menu prevention
  useEffect(() => {
    if (!isActive) return;

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      logViolation('context_menu', {
        timestamp: new Date().toISOString(),
        x: e.clientX,
        y: e.clientY,
      });
    };

    document.addEventListener('contextmenu', handleContextMenu);
    return () => document.removeEventListener('contextmenu', handleContextMenu);
  }, [isActive, logViolation]);

  return { logViolation };
}
