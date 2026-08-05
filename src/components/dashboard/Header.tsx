'use client';

import React, { useState } from 'react';
import { signOut, useSession } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { Button } from '@/components/ui/button';
import { Menu, LogOut, Bell, Search, User, Settings } from 'lucide-react';
import { toast } from 'sonner';
import ThemeToggle from '@/components/ui/theme-toggle';
import { NotificationBell } from '@/components/layout/NotificationBell';
import { useWhiteLabel } from '@/components/providers/WhiteLabelProvider';

export default function Header() {
  const [mounted, setMounted] = useState(false);
  const { toggleSidebar, theme } = useStore();
  const config = useWhiteLabel();
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const isAdminPortal = pathname.startsWith('/admin');

  const handleLogout = () => {
    signOut({ callbackUrl: '/login' });
  };

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!mounted) return;
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme, mounted]);

  const isDark = theme === 'dark';

  return (
    <header 
      className="sticky top-0 z-10 flex h-16 w-full items-center justify-between border-b border-border bg-card dark:bg-slate-900 text-foreground dark:text-slate-100 px-4 md:px-6 shadow-sm transition-colors"
      style={!isDark && config?.headerBgColor ? { backgroundColor: config.headerBgColor, borderColor: config.headerBgColor } : undefined}
      suppressHydrationWarning
    >
      <div className="flex items-center space-x-3 min-w-0" suppressHydrationWarning>
        <Button variant="ghost" size="icon" onClick={toggleSidebar} className="shrink-0 text-foreground dark:text-slate-200 hover:bg-muted dark:hover:bg-slate-800" suppressHydrationWarning>
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex items-center space-x-2 sm:space-x-4" suppressHydrationWarning>
        {mounted ? (
          <>
            {/* Reusable Theme Toggle */}
            <ThemeToggle />

            {/* Notifications badge */}
            <NotificationBell />

            {/* User profile avatar and custom dropdown wrapper */}
            <div className="relative" suppressHydrationWarning>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center focus:outline-none"
                aria-label="User menu"
                suppressHydrationWarning
              >
                <div 
                  className="flex items-center gap-2 px-2 py-1 rounded-full border hover:bg-muted/50 transition-colors cursor-pointer" 
                  style={config?.primaryColor ? { borderColor: config.primaryColor } : undefined}
                  suppressHydrationWarning
                >
                  {session?.user?.image ? (
                    <img 
                      src={session.user.image} 
                      alt={session.user.name || 'User'} 
                      className="h-8 w-8 rounded-full object-cover border"
                      style={config?.primaryColor ? { borderColor: config.primaryColor } : undefined}
                      suppressHydrationWarning
                    />
                  ) : (
                    <div 
                      className="h-8 w-8 text-white flex items-center justify-center text-xs font-bold rounded-full shadow-sm bg-primary"
                      style={config?.primaryColor ? { backgroundColor: config.primaryColor } : undefined}
                      suppressHydrationWarning
                    >
                      {session?.user?.name ? session.user.name.substring(0, 2).toUpperCase() : 'U'}
                    </div>
                  )}
                  <span className="text-xs font-semibold text-foreground hidden md:inline-block max-w-[120px] truncate" suppressHydrationWarning>
                    {session?.user?.name || 'User'}
                  </span>
                </div>
              </button>

              {dropdownOpen && (
                <>
                  {/* Overlay background to dismiss */}
                  <div 
                    className="fixed inset-0 z-20 cursor-default" 
                    onClick={() => setDropdownOpen(false)}
                  />
                  
                  <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-card border border-muted py-1 z-30 ring-1 ring-black ring-opacity-5 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="px-4 py-2 border-b border-muted">
                      <p className="text-xs font-semibold text-foreground truncate">{session?.user?.name || 'User Profile'}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{session?.user?.email}</p>
                    </div>
                    
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        router.push('/profile');
                      }}
                      className="flex w-full items-center space-x-2 px-4 py-2 text-left text-xs text-foreground hover:bg-muted/50"
                    >
                      <User className="h-4 w-4" />
                      <span>My Profile</span>
                    </button>
                    
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        toast.info('Redirecting to settings page...');
                      }}
                      className="flex w-full items-center space-x-2 px-4 py-2 text-left text-xs text-foreground hover:bg-muted/50"
                    >
                      <Settings className="h-4 w-4" />
                      <span>Branding Settings</span>
                    </button>
                    
                    <hr className="border-muted my-1" />
                    
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center space-x-2 px-4 py-2 text-left text-xs text-destructive hover:bg-destructive/10"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Logout</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </>
        ) : (
          <div className="h-8 w-28 bg-muted/40 animate-pulse rounded-full" />
        )}
      </div>
    </header>
  );
}
