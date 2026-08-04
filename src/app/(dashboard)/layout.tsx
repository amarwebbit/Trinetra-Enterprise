'use client';

import React from 'react';
import Sidebar from '@/components/dashboard/Sidebar';
import Header from '@/components/dashboard/Header';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils/helpers';
import { useWhiteLabel } from '@/components/providers/WhiteLabelProvider';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { sidebarOpen, setSidebarOpen } = useStore();
  const config = useWhiteLabel();

  return (
    <div className="min-h-screen bg-muted/10 relative">
      {/* Mobile Backdrop Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-30 lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main panel container */}
      <div
        className={cn(
          'flex flex-col min-h-screen transition-all duration-300',
          sidebarOpen ? 'lg:pl-64 pl-0' : 'pl-0'
        )}
      >
        {/* Header bar */}
        <Header />

        {/* Content body */}
        <main className="flex-1 p-6 md:p-8">
          <div className="max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
        
        {/* ✅ White-label Footer */}
        <footer 
          className="border-t px-6 py-3 text-center text-sm"
          style={{ 
            borderColor: config?.primaryColor ? `${config.primaryColor}40` : 'var(--border)',
          }}
        >
          <span style={{ color: config?.secondaryColor || 'currentColor' }}>
            {config?.footerText || `${config?.tenantName || 'Institution'} - All rights reserved`}
          </span>
          {!config?.removeBranding && (
            <span className="ml-2 text-muted-foreground">| Powered by TrinetraEdu-AI</span>
          )}
        </footer>
      </div>
    </div>
  );
}
