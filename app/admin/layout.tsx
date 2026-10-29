'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/context/auth-context';
import { LoadingState } from '@/components/LoadingState';
import { ShieldAlert, ArrowLeft, UserCheck, Lock } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { role, isLoading, isConfigured, switchRole } = useAuth();

  if (isLoading) {
    return <LoadingState message="Vérification des accès administrateur..." />;
  }

  if (role !== 'admin') {
    return (
      <div className="max-w-xl mx-auto my-12 bg-white rounded-3xl p-8 border border-slate-200 shadow-sm text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mx-auto">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-900">
            Espace Réservé à l'Administration
          </h1>
          <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
            La gestion du curriculum partagé, des modules, des examens et des imports est strictement réservée au délégué de promotion et aux administrateurs.
          </p>
        </div>

        {!isConfigured ? (
          <div className="p-4 bg-teal-50 border border-teal-200 rounded-2xl text-xs text-teal-900 space-y-3">
            <span className="font-semibold block">Mode Démonstration Actif :</span>
            <p>
              Pour tester et gérer le programme complet de la promotion, vous pouvez basculer immédiatement en profil Administrateur ci-dessous :
            </p>
            <button
              onClick={() => switchRole('admin')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 transition-colors shadow-xs"
            >
              <UserCheck className="w-4 h-4" />
              Basculer en vue Administrateur
            </button>
          </div>
        ) : (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-700 space-y-2">
            <span className="font-semibold block text-slate-900 flex items-center justify-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-slate-500" />
              Sécurité Row Level Security (RLS) Active
            </span>
            <p>
              Votre compte actuel possède le rôle étudiant. Pour administrer la cohorte, connectez-vous avec vos identifiants administrateur.
            </p>
          </div>
        )}

        <div className="pt-2 flex items-center justify-center gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour à l'Espace Étudiant
          </Link>
          {isConfigured && (
            <Link
              href="/auth/login"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 transition-colors"
            >
              Connexion Délégué
            </Link>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
