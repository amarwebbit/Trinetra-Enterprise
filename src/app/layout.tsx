import '@/lib/env-validator';
import React from 'react';
import type { Metadata } from 'next';
import './globals.css';
import 'katex/dist/katex.min.css';
import Providers from './providers';
import { WhiteLabelProvider } from '@/components/providers/WhiteLabelProvider';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db/client';
import { getWhiteLabelConfig } from '@/lib/services/white-label';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';

export const metadata: Metadata = {
  title: 'TrinetraEdu-AI Platform',
  description: 'AI-First Multi-Tenant Examination Platform',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  let whiteLabelConfig = null;
  
  // ✅ Skip for Super Admin, check active tenant status for all tenant users
  if (session?.user?.role !== 'super_admin' && session?.user?.tenantId) {
    const tenantCheck = await prisma.tenants.findUnique({
      where: { id: session.user.tenantId },
      select: { is_active: true }
    });

    if (tenantCheck && !tenantCheck.is_active) {
      redirect('/login?error=TenantSuspended');
    }

    whiteLabelConfig = await getWhiteLabelConfig(session.user.tenantId);
  }
  
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {whiteLabelConfig?.faviconUrl && (
          <link rel="icon" href={whiteLabelConfig.faviconUrl} />
        )}
        {whiteLabelConfig?.fontFamily && (
          <>
            <link 
              href={`https://fonts.googleapis.com/css2?family=${whiteLabelConfig.fontFamily.replace(/ /g, '+')}&display=swap`} 
              rel="stylesheet" 
            />
            <style dangerouslySetInnerHTML={{ __html: `
              body, button, input, select, textarea, [class*="font-sans"], .font-sans {
                font-family: '${whiteLabelConfig.fontFamily}', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
              }
            `}} />
          </>
        )}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof window !== 'undefined') {
                window.addEventListener('load', () => {
                  const perfData = {
                    loadTime: performance.timing.loadEventEnd - performance.timing.navigationStart,
                    domReady: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
                    firstPaint: performance.getEntriesByType('paint')[0]?.startTime || 0,
                  };
                  if (navigator.sendBeacon) {
                    navigator.sendBeacon('/api/performance', JSON.stringify(perfData));
                  }
                });
              }
            `,
          }}
        />
      </head>
      <body style={{ fontFamily: whiteLabelConfig?.fontFamily || 'Inter' }} suppressHydrationWarning>
        <Providers>
          <WhiteLabelProvider config={whiteLabelConfig}>
            {children}
          </WhiteLabelProvider>
        </Providers>
      </body>
    </html>
  );
}
