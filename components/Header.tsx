'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/context/auth-context';
import {
  Menu,
  Stethoscope,
  Info,
  ShieldCheck,
  UserCheck,
  Database,
  LogOut,
  LogIn,
} from 'lucide-react';

interface HeaderProps {
  onOpenMobileMenu: () => void;
}

export function Header({ onOpenMobileMenu }: HeaderProps) {
  const router = useRouter();
  const { user, role, actualRole, switchRole, signOut, isConfigured } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    router.push('/auth/login');
  };

  return (
    <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-2xs">
      {/* Top Demo Banner if Supabase not configured */}
      {!isConfigured && (
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/15 to-teal-500/10 border-b border-amber-200/70 px-4 py-1.5 text-xs text-amber-900 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 truncate">
            <Info className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span className="font-semibold text-amber-950">Mode Démonstration :</span>
            <span className="truncate">
              Données pédagogiques factices chargées (DFGSM 2). Les données réelles Supabase ne sont pas encore reliées.
            </span>
          </div>
          <span className="text-[11px] font-bold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-md border border-amber-300 shrink-0 hidden sm:inline">
            Non-Production
          </span>
        </div>
      )}

      {/* Main Header Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Mobile Menu Button & Academic Title */}
          <div className="flex items-center gap-3">
            <button
              onClick={onOpenMobileMenu}
              className="md:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              aria-label="Ouvrir le menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Mobile Brand (visible only on mobile) */}
            <div className="md:hidden flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center text-white shadow-xs">
                <Stethoscope className="w-4 h-4" />
              </div>
              <span className="font-bold text-base text-slate-900 tracking-tight">Guidini</span>
            </div>

            {/* Academic Information (Desktop / Tablet) */}
            <div className="hidden md:flex flex-col">
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-slate-900 tracking-tight">
                  Guidini • Faculté de Médecine
                </h1>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                  DFGSM 2 Médecine
                </span>
                <span className="hidden lg:inline text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                  Unité 01 : Cardiovasculo-Pulmonaire
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Année Universitaire 2026–2027 • Plateforme de Cohorte
              </p>
            </div>
          </div>

          {/* Right: Actions, User Identity & Sign Out */}
          <div className="flex items-center gap-3">
            {/* Supabase status badge */}
            <div
              className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                isConfigured
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}
            >
              <Database className="w-3.5 h-3.5 text-teal-600" />
              <span>{isConfigured ? 'Supabase Connecté' : 'Données Démo'}</span>
            </div>

            {user ? (
              <div className="flex items-center gap-2 sm:gap-3">
                {/* Role indicator pill */}
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-800">
                  {role === 'admin' ? (
                    <>
                      <ShieldCheck className="w-4 h-4 text-teal-600" />
                      <span className="hidden sm:inline">Délégué Admin</span>
                    </>
                  ) : (
                    <>
                      <UserCheck className="w-4 h-4 text-teal-600" />
                      <span className="hidden sm:inline">Étudiant</span>
                    </>
                  )}
                </div>

                {/* User info on desktop */}
                <div className="hidden xl:flex flex-col text-right">
                  <span className="text-xs font-bold text-slate-900 leading-tight truncate max-w-[140px]">
                    {user.full_name || 'Utilisateur'}
                  </span>
                  <span className="text-[11px] text-slate-500 truncate max-w-[140px]">
                    {user.email}
                  </span>
                </div>

                {/* Admin-only preview switch */}
                {actualRole === 'admin' && (
                  <button
                    onClick={() => switchRole(role === 'admin' ? 'student' : 'admin')}
                    className="hidden lg:inline-flex text-xs font-medium text-slate-500 hover:text-teal-700 hover:underline px-2"
                  >
                    Vue {role === 'admin' ? 'Étudiant' : 'Admin'}
                  </button>
                )}

                {/* Sign Out Button */}
                <button
                  onClick={handleSignOut}
                  title="Se déconnecter"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 border border-slate-200 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Déconnexion</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/auth/login"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 transition-colors"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Connexion</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
