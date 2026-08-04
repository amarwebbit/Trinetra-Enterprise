'use client';

import { createContext, useContext, useEffect, ReactNode } from 'react';
import { WhiteLabelConfig } from '@/lib/services/white-label';

const WhiteLabelContext = createContext<WhiteLabelConfig | null>(null);

export function useWhiteLabel() {
  const context = useContext(WhiteLabelContext);
  if (context === undefined) {
    throw new Error('useWhiteLabel must be used within WhiteLabelProvider');
  }
  return context; // Context can be null for super_admin or missing tenants
}

interface WhiteLabelProviderProps {
  children: ReactNode;
  config: WhiteLabelConfig | null;
}

export function WhiteLabelProvider({ children, config }: WhiteLabelProviderProps) {
  // ✅ Apply custom CSS
  useEffect(() => {
    let styleElement: HTMLStyleElement | null = null;
    
    if (config?.customCss) {
      styleElement = document.createElement('style');
      styleElement.id = 'whitelabel-custom-css';
      styleElement.textContent = config.customCss;
      document.head.appendChild(styleElement);
    }
    
    return () => {
      if (styleElement) {
        styleElement.remove();
      }
    };
  }, [config?.customCss]);

  // ✅ Set favicon
  useEffect(() => {
    if (config?.faviconUrl) {
      let link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
      if (link) {
        link.href = config.faviconUrl;
      } else {
        const newLink = document.createElement('link');
        newLink.rel = 'icon';
        newLink.href = config.faviconUrl;
        document.head.appendChild(newLink);
      }
    }
  }, [config?.faviconUrl]);

  // ✅ Apply font
  useEffect(() => {
    if (config?.fontFamily && config.fontFamily !== 'Inter') {
      document.documentElement.style.setProperty('--font-family', config.fontFamily);
      document.body.style.fontFamily = config.fontFamily;
    }
  }, [config?.fontFamily]);

  // ✅ Apply primary color as CSS variable
  useEffect(() => {
    if (config?.primaryColor) {
      document.documentElement.style.setProperty('--primary-color', config.primaryColor);
    }
    if (config?.secondaryColor) {
      document.documentElement.style.setProperty('--secondary-color', config.secondaryColor);
    }
    if (config?.accentColor) {
      document.documentElement.style.setProperty('--accent-color', config.accentColor);
    }
  }, [config?.primaryColor, config?.secondaryColor, config?.accentColor]);

  // Render provider unconditionally so useWhiteLabel can safely be called
  return (
    <WhiteLabelContext.Provider value={config}>
      {children}
    </WhiteLabelContext.Provider>
  );
}
