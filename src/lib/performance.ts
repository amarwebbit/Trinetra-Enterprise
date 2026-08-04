'use client';

export function trackWebVitals() {
  if (typeof window === 'undefined') return;
  if (process.env.NODE_ENV !== 'production') return;

  try {
    window.addEventListener('load', () => {
      const perf = window.performance;
      if (!perf) return;

      const timing = perf.timing;
      const paintEntries = perf.getEntriesByType('paint');
      const firstPaint = paintEntries.find(entry => entry.name === 'first-paint')?.startTime || 0;
      const firstContentfulPaint = paintEntries.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0;

      const metrics = {
        loadTime: timing.loadEventEnd - timing.navigationStart,
        domReady: timing.domContentLoadedEventEnd - timing.navigationStart,
        ttfb: timing.responseStart - timing.requestStart,
        firstPaint: Math.round(firstPaint),
        fcp: Math.round(firstContentfulPaint),
      };

      const body = JSON.stringify(metrics);

      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/performance', body);
      } else {
        fetch('/api/performance', {
          method: 'POST',
          body,
          headers: { 'Content-Type': 'application/json' },
          keepalive: true,
        }).catch(() => {});
      }
    });
  } catch (error) {
    // Silently handle performance API limitations
  }
}
