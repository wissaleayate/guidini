'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/context/auth-context';
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  FileSpreadsheet,
  Settings,
  ShieldCheck,
  UserCheck,
  Stethoscope,
  Database,
  LayoutDashboard,
  Eye,
  X,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { role, switchRole, isConfigured } = useAuth();

  const studentLinks = [
    { href: '/student', label: 'Tableau de Bord', icon: LayoutDashboard },
    { href: '/', label: 'Curriculum & Modules', icon: BookOpen },
    { href: '/student/progress', label: 'Suivi & Révisions', icon: CheckCircle2 },
    { href: '/student/exams', label: 'Examens & Contrôles', icon: Calendar },
  ];

  const adminLinks = [
    { href: '/admin', label: 'Gestion Curriculum', icon: BookOpen },
    { href: '/admin/exams', label: 'Gestion des Examens', icon: Calendar },
    { href: '/admin/import', label: 'Import CSV / Excel', icon: FileSpreadsheet },
    { href: '/admin/cohort', label: 'Paramètres Cohorte', icon: Settings },
    { href: '/student', label: 'Aperçu Étudiant', icon: Eye },
  ];

  const links = role === 'admin' ? adminLinks : studentLinks;

  const sidebarContent = (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
        <Link href="/" onClick={onClose} className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-teal-500/25 group-hover:scale-105 transition-transform">
            <Stethoscope className="w-5 h-5 text-slate-950" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-lg text-white tracking-tight">Guidini</span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-teal-950 text-teal-300 border border-teal-700/60">
                Médical
              </span>
            </div>
            <span className="text-xs text-slate-400 font-medium">
              DFGSM 2 • 2026–2027
            </span>
          </div>
        </Link>
        {/* Mobile close button */}
        <button
          onClick={onClose}
          className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          aria-label="Fermer le menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 py-5 px-3 space-y-1.5 overflow-y-auto">
        <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
          {role === 'admin' ? 'Espace Administration' : 'Espace Étudiant'}
        </div>

        {links.map((link) => {
          const Icon = link.icon;
          const isActive =
            link.href === '/admin'
              ? pathname === '/admin' || pathname === '/admin/curriculum'
              : link.href === '/student'
              ? pathname === '/student' || pathname.startsWith('/student/subjects')
              : pathname === link.href;

          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={onClose}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-teal-500/15 text-teal-300 font-semibold border-l-4 border-teal-400 shadow-inner'
                  : 'text-slate-300 hover:text-white hover:bg-slate-900 border-l-4 border-transparent'
              }`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 ${
                  isActive ? 'text-teal-400' : 'text-slate-400'
                }`}
              />
              <span className="truncate">{link.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Role Switcher & Database Status (Bottom) */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-900/60 space-y-3">
        {/* Database indicator */}
        <div className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg bg-slate-950/80 border border-slate-800">
          <div className="flex items-center gap-2">
            <Database className="w-3.5 h-3.5 text-teal-400" />
            <span className="text-slate-300 font-medium">Base de données</span>
          </div>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              isConfigured
                ? 'bg-emerald-950 text-emerald-400 border border-emerald-700/60'
                : 'bg-amber-950 text-amber-300 border border-amber-700/60'
            }`}
          >
            {isConfigured ? 'Supabase' : 'Démo Locale'}
          </span>
        </div>

        {/* Role Toggle */}
        <div className="space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 px-1 block">
            Changer de profil :
          </span>
          <div className="grid grid-cols-2 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => switchRole('student')}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                role === 'student'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              Étudiant
            </button>
            <button
              onClick={() => switchRole('admin')}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                role === 'admin'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Admin
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <aside className="hidden md:block fixed inset-y-0 left-0 w-64 z-30 shadow-xl">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
            onClick={onClose}
          />
          <div className="relative w-72 max-w-[85vw] z-50 shadow-2xl">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
