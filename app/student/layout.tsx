'use client';

export const dynamic = 'force-dynamic';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/context/auth-context';
import { LoadingState } from '@/components/LoadingState';
import { CohortOnboardingGate } from '@/components/CohortOnboardingGate';
import { LogIn } from 'lucide-react';

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isConfigured } = useAuth();

  if (isLoading) {
    return <LoadingState message="Chargement de votre espace étudiant..." />;
  }

  // If live Supabase is configured and no authenticated session exists
  if (isConfigured && !user) {
    return (
      <div className="max-w-md mx-auto my-12 bg-white rounded-3xl p-8 border border-slate-200 shadow-sm text-center space-y-5">
        <div className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600 mx-auto">
          <LogIn className="w-6 h-6" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-xl font-bold text-slate-900">Connexion requise</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Pour accéder à votre suivi d'études et révisions personnalisées, veuillez vous connecter avec votre compte universitaire.
          </p>
        </div>
        <Link
          href="/auth/login"
          className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 transition-colors shadow-xs"
        >
          Se connecter
        </Link>
      </div>
    );
  }

  return <CohortOnboardingGate>{children}</CohortOnboardingGate>;
}
