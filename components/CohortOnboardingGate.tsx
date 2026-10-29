'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/context/auth-context';
import { CohortService } from '@/lib/services/cohort-service';
import { Stethoscope, KeyRound, CheckCircle2, AlertCircle, Loader2, ArrowRight } from 'lucide-react';

interface CohortOnboardingGateProps {
  children: React.ReactNode;
}

export function CohortOnboardingGate({ children }: CohortOnboardingGateProps) {
  const { user, refreshProfile, isConfigured } = useAuth();
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successCohort, setSuccessCohort] = useState<string | null>(null);

  // If student already has a cohort assigned, render children immediately
  if (user?.cohort_id) {
    return <>{children}</>;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await CohortService.joinCohortWithCode(
        inviteCode.trim(),
        user?.id || 'demo-student-id'
      );

      if (res.success) {
        setSuccessCohort(res.cohortName || 'Cohorte Médicale');
        await refreshProfile();
        // Give a brief moment for visual confirmation
        setTimeout(() => {
          setSuccessCohort(null);
        }, 1200);
      } else {
        setError(res.error || "Code d'invitation invalide ou expiré.");
      }
    } catch (err: any) {
      setError(err?.message || "Erreur de connexion lors de l'adhésion.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto my-12 bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-md space-y-6">
      <div className="text-center space-y-3">
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-teal-600 to-emerald-500 mx-auto flex items-center justify-center text-white shadow-lg shadow-teal-600/20">
          <Stethoscope className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-teal-600">
            Bienvenue sur Guidini
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Rejoindre votre promotion
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
            Pour synchroniser votre tableau de bord personnel avec le programme officiel de votre cohorte, veuillez renseigner le code d'invitation de promotion.
          </p>
        </div>
      </div>

      {successCohort && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-900 flex items-center gap-3 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <div>
            <span className="font-bold block text-sm">Félicitations !</span>
            Vous avez rejoint la promotion <strong className="font-semibold">{successCohort}</strong>.
            Chargement de votre programme médical...
          </div>
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Code d'invitation de la cohorte
          </label>
          <div className="relative">
            <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              required
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              placeholder="MED-2026-ALG"
              className="w-full font-mono font-bold tracking-wider pl-10 pr-3.5 py-3 text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
            />
          </div>
          {!isConfigured && (
            <p className="text-[11px] text-slate-500 mt-2">
              💡 Code de démonstration :{' '}
              <button
                type="button"
                onClick={() => setInviteCode('MED-2026-ALG')}
                className="font-mono text-teal-700 font-semibold hover:underline"
              >
                MED-2026-ALG
              </button>{' '}
              (cliquez pour renseigner)
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || Boolean(successCohort)}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 active:bg-teal-800 transition-colors shadow-sm disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Validation du code...
            </>
          ) : (
            <>
              Rejoindre ma promotion
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
