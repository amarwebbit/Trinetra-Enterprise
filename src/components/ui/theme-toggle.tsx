'use client';

import React from 'react';
import { useStore } from '@/store/useStore';
import { Button } from '@/components/ui/button';
import { Sun, Moon } from 'lucide-react';
import { toast } from 'sonner';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useStore();

  const handleToggle = () => {
    toggleTheme();
    toast.success(`Switched to ${theme === 'light' ? 'Dark' : 'Light'} Mode`, {
      duration: 1500
    });
  };

  return (
    <Button 
      variant="ghost" 
      size="icon" 
      onClick={handleToggle}
      className="rounded-none shrink-0"
      aria-label="Toggle theme mode"
    >
      {theme === 'light' ? (
        <Moon className="h-5 w-5 text-muted-foreground hover:text-foreground" />
      ) : (
        <Sun className="h-5 w-5 text-yellow-100 hover:text-white" />
      )}
    </Button>
  );
}
