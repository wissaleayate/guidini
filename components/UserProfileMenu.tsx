'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/context/auth-context';
import {
  User,
  ShieldCheck,
  Settings,
  LogOut,
  ChevronDown,
  Sparkles,
  BookOpen,
} from 'lucide-react';

export function UserProfileMenu() {
  const router = useRouter();
  const { user, role, actualRole, switchRole, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSignOut = async () => {
    setIsOpen(false);
    await signOut();
    router.push('/auth/login');
  };

  if (!user) {
    return (
      <Link
        href="/auth/login"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 transition-colors shadow-xs"
      >
        <span>Connexion</span>
      </Link>
    );
  }

  const initials = user.full_name
    ? user.full_name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'EM';

  const isAdmin = actualRole === 'admin';

  return (
    <div className="relative" ref={menuRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        className="flex items-center gap-2 p-1.5 rounded-2xl hover:bg-slate-100 transition-all border border-transparent hover:border-slate-200"
      >
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-500 text-white font-bold text-xs flex items-center justify-center shadow-xs">
          {initials}
        </div>
        <div className="hidden sm:flex flex-col text-left">
          <span className="text-xs font-bold text-slate-900 leading-tight truncate max-w-[120px]">
            {user.full_name || 'Étudiant'}
          </span>
          <span className="text-[10px] text-slate-500 truncate max-w-[120px]">
            {isAdmin ? 'Délégué Admin' : 'Étudiant Troisième Année'}
          </span>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-3xl shadow-xl border border-slate-200 z-50 p-2 overflow-hidden animate-in fade-in slide-in-from-top-2 select-none">
          {/* Identity Header */}
          <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-100 mb-1 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 truncate">
                {user.full_name || 'Utilisateur'}
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  isAdmin
                    ? 'bg-amber-100 text-amber-800 border border-amber-300/80'
                    : 'bg-teal-50 text-teal-700 border border-teal-200'
                }`}
              >
                {isAdmin ? 'Admin' : 'Étudiant'}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 truncate">{user.email}</div>
            <div className="text-[10px] text-teal-700 font-semibold flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-teal-600" />
              Faculté de Médecine - Constantine (Troisième Année)
            </div>
          </div>

          {/* Links */}
          <div className="space-y-0.5 text-xs text-slate-700 font-medium">
            <Link
              href="/student/profile"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <User className="w-4 h-4 text-slate-400" />
              <span>Mon Profil Étudiant</span>
            </Link>

            <Link
              href="/student/progress"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <BookOpen className="w-4 h-4 text-slate-400" />
              <span>Suivi & Révisions</span>
            </Link>

            {isAdmin && (
              <>
                <div className="my-1 border-t border-slate-100" />
                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Outils Administrateur
                </div>
                <Link
                  href="/admin/cohort"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <Settings className="w-4 h-4 text-slate-400" />
                  <span>Paramètres Promotion</span>
                </Link>

                <button
                  onClick={() => {
                    switchRole(role === 'admin' ? 'student' : 'admin');
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors text-left text-xs font-semibold text-teal-700"
                >
                  <span className="flex items-center gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-teal-600" />
                    Vue {role === 'admin' ? 'Étudiant' : 'Administrateur'}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Bascule</span>
                </button>
              </>
            )}

            <div className="my-1 border-t border-slate-100" />

            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-rose-50 hover:text-rose-700 transition-colors text-left text-slate-700 font-semibold"
            >
              <LogOut className="w-4 h-4 text-rose-500" />
              <span>Se déconnecter</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
