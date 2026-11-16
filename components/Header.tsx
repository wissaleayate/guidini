'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/context/auth-context';
import { NotificationsPopover } from './NotificationsPopover';
import { UserProfileMenu } from './UserProfileMenu';
import {
  Menu,
  Stethoscope,
  Info,
  ShieldCheck,
  UserCheck,
  Database,
  Sparkles,
} from 'lucide-react';

interface HeaderProps {
  onOpenMobileMenu: () => void;
}

export function Header({ onOpenMobileMenu }: HeaderProps) {
  const { user, role, isConfigured } = useAuth();
  const isAdmin = role === 'admin';

  return (
    <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-2xs select-none">
      {/* Top Demo Banner if Supabase not configured */}
      {!isConfigured && (
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/15 to-teal-500/10 border-b border-amber-200/70 px-4 py-1.5 text-xs text-amber-900 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 truncate">
            <Info className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span className="font-semibold text-amber-950">Mode Démonstration :</span>
            <span className="truncate">
              Données pédagogiques chargées (Troisième Année - Constantine). Les clés Supabase réelles peuvent être configurées dans .env.local.
            </span>
          </div>
          <span className="text-[11px] font-bold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-md border border-amber-300 shrink-0 hidden sm:inline">
            Non-Production
          </span>
        </div>
      )}

      {/* Main Header Bar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Left: Mobile Menu Button & Academic Title */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={onOpenMobileMenu}
              className="md:hidden p-2.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Ouvrir le menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Mobile Brand */}
            <Link href="/" className="md:hidden flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center text-white shadow-xs">
                <Stethoscope className="w-4 h-4" />
              </div>
              <span className="font-bold text-base text-slate-900 tracking-tight">Guidini</span>
              <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded-md border border-teal-200 shrink-0">
                3A Med
              </span>
            </Link>

            {/* Academic Information (Desktop / Tablet) */}
            <div className="hidden md:flex flex-col">
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-slate-900 tracking-tight">
                  Guidini • Faculté de Médecine - Constantine
                </h1>
                {isAdmin ? (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300">
                    Administration Cohorte
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-teal-600" />
                    Troisième Année
                  </span>
                )}
                <span className="hidden lg:inline text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                  Unité 01 : Cardiovasculo-Pulmonaire
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Année Universitaire 2026–2027 • Plateforme Universitaire
              </p>
            </div>
          </div>

          {/* Right: Status Indicators, Notifications, User Profile Menu */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Supabase status badge */}
            <div
              className={`hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                isConfigured
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}
            >
              <Database className="w-3.5 h-3.5 text-teal-600" />
              <span>{isConfigured ? 'Supabase' : 'Démo'}</span>
            </div>

            {/* Role indicator pill */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-800">
              {isAdmin ? (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                  <span>Délégué Admin</span>
                </>
              ) : (
                <>
                  <UserCheck className="w-3.5 h-3.5 text-teal-600" />
                  <span>Étudiant</span>
                </>
              )}
            </div>

            {/* Notifications Popover */}
            {user && <NotificationsPopover />}

            {/* User Profile Menu */}
            <UserProfileMenu />
          </div>
        </div>
      </div>
    </header>
  );
}
