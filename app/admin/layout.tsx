'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/context/auth-context';
import { LoadingState } from '@/components/LoadingState';
import { ShieldAlert, ArrowLeft, Lock } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, actualRole, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingState message="Vérification des accès administrateur..." />;
  }

  // Deny access if not the authorized admin
  if (!user || actualRole !== 'admin') {
    return (
      <div className="max-w-xl mx-auto my-12 bg-white rounded-3xl p-8 border border-slate-200 shadow-sm text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mx-auto">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-900">
            Accès Refusé — Espace Administrateur
          </h1>
          <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
            La gestion du curriculum partagé, des unités, des examens et des comptes étudiants est strictement réservée au compte administrateur unique de la promotion.
          </p>
        </div>

        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-700 space-y-2">
          <span className="font-semibold block text-slate-900 flex items-center justify-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-slate-500" />
            Sécurité Serveur & Row Level Security (RLS) Active
          </span>
          <p>
            Votre compte actuel ne dispose pas des privilèges administrateur autorisés pour cette cohorte.
          </p>
        </div>

        <div className="pt-2 flex items-center justify-center gap-4">
          <Link
            href="/student"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 transition-colors shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            Retourner à mon Espace Étudiant
          </Link>
          <Link
            href="/auth/login"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            Se connecter avec un autre compte
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
