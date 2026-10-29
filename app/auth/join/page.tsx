'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/context/auth-context';
import { CohortService } from '@/lib/services/cohort-service';
import { Stethoscope, KeyRound, CheckCircle2, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';
import Link from 'next/link';

function JoinCohortForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successCohort, setSuccessCohort] = useState<string | null>(null);

  useEffect(() => {
    const codeParam = searchParams.get('code');
    if (codeParam) {
      setInviteCode(codeParam.toUpperCase());
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;

    setLoading(true);
    setError(null);

    const res = await CohortService.joinCohortWithCode(
      inviteCode.trim(),
      user?.id || 'demo-student-id'
    );
    setLoading(false);

    if (res.success) {
      setSuccessCohort(res.cohortName || 'Cohorte Médicale');
      setTimeout(() => {
        router.push('/');
      }, 1500);
    } else {
      setError(res.error || 'Code invalide');
    }
  };

  return (
    <div className="max-w-md mx-auto my-12 bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-500 mx-auto flex items-center justify-center text-white shadow-md shadow-teal-500/20">
          <Stethoscope className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Rejoindre votre promotion</h1>
        <p className="text-xs text-slate-500">
          Saisissez le code d'invitation communiqué par votre délégué de cohorte
        </p>
      </div>

      {successCohort && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-900 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <div>
            <span className="font-bold block">Félicitations !</span>
            Vous avez rejoint la promotion <span className="font-semibold">{successCohort}</span>.
            Redirection vers le programme...
          </div>
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Code d'accès promotion
          </label>
          <div className="relative">
            <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              required
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              placeholder="MED-2026-ALG"
              className="w-full font-mono font-bold tracking-wider pl-10 pr-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || Boolean(successCohort)}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 active:bg-teal-800 transition-colors shadow-sm disabled:opacity-50"
        >
          {loading ? 'Vérification...' : 'Valider et accéder aux cours'}
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>

      <div className="text-center pt-2 border-t border-slate-100 text-xs text-slate-500">
        <Link href="/" className="text-teal-700 hover:underline">
          Retour au tableau de bord
        </Link>
      </div>
    </div>
  );
}

export default function JoinCohortPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
        </div>
      }
    >
      <JoinCohortForm />
    </Suspense>
  );
}
