'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, BookOpen, Trophy, User, PlusCircle } from 'lucide-react';

interface NavItem {
  name: string;
  href: string;
  icon: any;
  label: string;
}

export function MobileBottomNav() {
  const pathname = usePathname();

  const isStudentPortal = pathname.startsWith('/student');
  const isTeacherPortal = pathname.startsWith('/teacher');
  const isAdminPortal = pathname.startsWith('/admin');

  let navItems: NavItem[] = [
    { name: 'Home', href: '/student', icon: Home, label: 'Home' },
    { name: 'Exams', href: '/student/exams', icon: BookOpen, label: 'Exams' },
    { name: 'Results', href: '/student/results', icon: Trophy, label: 'Results' },
  ];

  if (isTeacherPortal) {
    navItems = [
      { name: 'Dashboard', href: '/teacher', icon: Home, label: 'Home' },
      { name: 'Questions', href: '/teacher/questions', icon: BookOpen, label: 'Bank' },
      { name: 'Create', href: '/teacher/exams/create', icon: PlusCircle, label: 'Create' },
      { name: 'Analytics', href: '/teacher/results', icon: Trophy, label: 'Results' },
    ];
  } else if (isAdminPortal) {
    navItems = [
      { name: 'Dashboard', href: '/admin', icon: Home, label: 'Home' },
      { name: 'Exams', href: '/admin/exams', icon: BookOpen, label: 'Exams' },
      { name: 'Results', href: '/admin/results', icon: Trophy, label: 'Analytics' },
    ];
  }

  const isActive = (href: string) => pathname === href || pathname?.startsWith(href + '/');

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border flex items-center justify-around py-1.5 px-2 z-30 md:hidden shadow-lg">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`
            flex flex-col items-center gap-0.5 px-2 py-1 min-w-[48px] touch-target transition-colors
            ${isActive(item.href) ? 'text-primary font-bold' : 'text-muted-foreground'}
          `}
        >
          <item.icon className="h-5 w-5" />
          <span className="text-[10px] font-medium tracking-tight">{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}
