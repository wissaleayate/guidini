'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/context/auth-context';
import {
  LayoutDashboard,
  BookOpen,
  Calendar,
  CheckCircle2,
  User,
  Users,
} from 'lucide-react';

export function MobileBottomNav() {
  const pathname = usePathname();
  const { role } = useAuth();
  const isAdmin = role === 'admin';

  const studentTabs = [
    { href: '/student', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/', label: 'Curriculum', icon: BookOpen },
    { href: '/student/exams', label: 'Contrôles', icon: Calendar },
    { href: '/student/progress', label: 'Révisions', icon: CheckCircle2 },
    { href: '/student/profile', label: 'Profil', icon: User },
  ];

  const adminTabs = [
    { href: '/admin', label: 'Admin', icon: LayoutDashboard },
    { href: '/', label: 'Curriculum', icon: BookOpen },
    { href: '/admin/exams', label: 'Examens', icon: Calendar },
    { href: '/admin/users', label: 'Étudiants', icon: Users },
    { href: '/student', label: 'Aperçu', icon: User },
  ];

  const tabs = isAdmin ? adminTabs : studentTabs;

  return (
    <nav
      aria-label="Navigation mobile"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-slate-200/90 shadow-xl px-2 py-1.5 flex items-center justify-around select-none"
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive =
          tab.href === '/admin'
            ? pathname === '/admin' || pathname === '/admin/curriculum'
            : tab.href === '/student'
            ? pathname === '/student'
            : tab.href === '/'
            ? pathname === '/' || pathname.startsWith('/student/subjects')
            : pathname === tab.href;

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all duration-150 min-w-[56px] min-h-[44px] ${
              isActive
                ? isAdmin
                  ? 'text-amber-700 font-bold bg-amber-500/15'
                  : 'text-teal-700 font-bold bg-teal-500/15'
                : 'text-slate-500 hover:text-slate-800 font-medium'
            }`}
          >
            <Icon
              className={`w-5 h-5 transition-transform duration-150 ${
                isActive ? 'scale-110' : ''
              }`}
            />
            <span className="text-[10px] mt-0.5 tracking-tight truncate max-w-[64px]">
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
