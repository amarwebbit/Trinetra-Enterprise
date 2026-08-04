'use client';

import React from 'react';
import { WhiteLabelConfig } from '@/lib/services/white-label';
import { Monitor, Phone, Tablet } from 'lucide-react';
import { cn } from '@/lib/utils/helpers';

interface LivePreviewProps {
  config: Partial<WhiteLabelConfig>;
  mode?: 'desktop' | 'tablet' | 'mobile';
  onModeChange?: (mode: 'desktop' | 'tablet' | 'mobile') => void;
}

export function LivePreview({ config, mode = 'desktop', onModeChange }: LivePreviewProps) {
  // Apply preview styles
  const previewStyle = {
    '--preview-primary': config.primaryColor || '#2563EB',
    '--preview-secondary': config.secondaryColor || '#7C3AED',
    '--preview-accent': config.accentColor || '#10B981',
    '--preview-header-bg': config.headerBgColor || '#ffffff',
    fontFamily: config.fontFamily || 'Inter',
  } as React.CSSProperties;

  return (
    <div className="flex flex-col h-full bg-slate-100 rounded-xl overflow-hidden border border-slate-200">
      {/* Device Toggle Bar */}
      <div className="flex items-center justify-between p-3 bg-white border-b border-slate-200">
        <h3 className="text-sm font-semibold text-slate-700">Live Preview</h3>
        {onModeChange && (
          <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => onModeChange('desktop')}
              className={cn('p-1.5 rounded-md text-slate-500', mode === 'desktop' && 'bg-white shadow-sm text-slate-900')}
            >
              <Monitor className="w-4 h-4" />
            </button>
            <button
              onClick={() => onModeChange('tablet')}
              className={cn('p-1.5 rounded-md text-slate-500', mode === 'tablet' && 'bg-white shadow-sm text-slate-900')}
            >
              <Tablet className="w-4 h-4" />
            </button>
            <button
              onClick={() => onModeChange('mobile')}
              className={cn('p-1.5 rounded-md text-slate-500', mode === 'mobile' && 'bg-white shadow-sm text-slate-900')}
            >
              <Phone className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Preview Container */}
      <div className="flex-1 p-4 flex items-center justify-center bg-slate-200 overflow-hidden relative">
        {/* Render custom CSS as a style tag inside the preview container only if we could scope it. 
            Since standard CSS applies globally, we'll skip injecting customCss in live preview to avoid side effects on the admin portal. */}
        
        <div 
          className={cn(
            'bg-white rounded-md shadow-lg overflow-hidden flex flex-col transition-all duration-300 transform scale-[0.85] transform-origin-top',
            mode === 'desktop' ? 'w-full h-full max-w-4xl' : '',
            mode === 'tablet' ? 'w-[768px] h-[1024px]' : '',
            mode === 'mobile' ? 'w-[375px] h-[812px]' : ''
          )}
          style={previewStyle}
        >
          {/* Header */}
          <div 
            className="h-14 border-b flex items-center px-4 justify-between shrink-0"
            style={{ backgroundColor: 'var(--preview-header-bg)', borderColor: 'rgba(0,0,0,0.1)' }}
          >
            <div className="flex items-center gap-3">
              {config.logoUrl ? (
                <img src={config.logoUrl} alt="Logo" className="h-8 max-w-[120px] object-contain" />
              ) : (
                <div className="w-8 h-8 rounded-md flex items-center justify-center font-bold text-white text-sm" style={{ backgroundColor: 'var(--preview-primary)' }}>
                  L
                </div>
              )}
              {!config.removeBranding && (
                <span className="font-bold text-lg text-slate-900" style={{ color: config.headerBgColor && config.headerBgColor !== '#ffffff' ? '#ffffff' : 'inherit' }}>
                  {config.tenantName || 'Institution'}
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-2 border px-2.5 py-1 rounded-full bg-slate-50/50" style={{ borderColor: 'var(--preview-primary)' }}>
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shadow-sm" style={{ backgroundColor: 'var(--preview-primary)' }}>
                JD
              </div>
              <span className="text-xs font-semibold text-slate-700 hidden sm:inline-block">
                John Doe
              </span>
            </div>
          </div>
          
          {/* Main Layout */}
          <div className="flex flex-1 overflow-hidden relative">
            {/* Sidebar */}
            <div className={cn('w-48 bg-slate-50 border-r border-slate-200 p-4 hidden sm:block', mode === 'mobile' && 'hidden')}>
              <div className="space-y-2">
                <div className="h-8 rounded-md flex items-center px-3" style={{ backgroundColor: 'var(--preview-primary)', color: 'white' }}>Dashboard</div>
                <div className="h-8 rounded-md flex items-center px-3 text-slate-600 hover:bg-slate-100">Exams</div>
                <div className="h-8 rounded-md flex items-center px-3 text-slate-600 hover:bg-slate-100">Students</div>
              </div>
            </div>
            
            {/* Content Area */}
            <div className="flex-1 p-6 overflow-y-auto relative">
              {/* Background Watermark (Logo + Name) */}
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center opacity-[0.04] select-none rotate-[-20deg]">
                {config.logoUrl && <img src={config.logoUrl} alt="Logo" className="h-20 max-w-[150px] object-contain grayscale mb-2" />}
                <p className="text-6xl font-black uppercase text-slate-900">{config.tenantName || 'Institution'}</p>
              </div>
              <h2 className="text-2xl font-bold mb-6 text-slate-800 relative z-10">Welcome back</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {[1, 2, 3].map(i => (
                  <div key={i} className="p-4 border border-slate-200 rounded-xl shadow-sm bg-white">
                    <div className="w-8 h-8 rounded-lg mb-3 flex items-center justify-center" style={{ backgroundColor: 'var(--preview-primary)', opacity: 0.1 }}></div>
                    <div className="h-4 w-1/2 bg-slate-200 rounded mb-2"></div>
                    <div className="h-6 w-3/4 bg-slate-800 rounded"></div>
                  </div>
                ))}
              </div>
              
              <button 
                className="px-4 py-2 rounded-lg font-medium text-white shadow-sm"
                style={{ backgroundColor: 'var(--preview-primary)' }}
              >
                Primary Action
              </button>
              
              <button 
                className="px-4 py-2 rounded-lg font-medium text-white shadow-sm ml-2"
                style={{ backgroundColor: 'var(--preview-secondary)' }}
              >
                Secondary
              </button>

              <button 
                className="px-4 py-2 rounded-lg font-medium text-white shadow-sm ml-2"
                style={{ backgroundColor: 'var(--preview-accent)' }}
              >
                Accent
              </button>
            </div>
          </div>

          {/* Footer */}
          {config.footerText && (
            <div className="h-10 border-t flex items-center justify-center text-xs text-slate-500 shrink-0 bg-white">
              {config.footerText} {!config.removeBranding && '| Powered by TrinetraEdu-AI'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
