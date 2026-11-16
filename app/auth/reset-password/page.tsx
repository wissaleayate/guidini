'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { KeyRound, Lock, Mail, AlertCircle, ArrowRight, CheckCircle2, ArrowLeft } from 'lucide-react';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const isConfigured = isSupabaseConfigured();

  useEffect(() => {
    if (!isConfigured) return;

    const supabase = createClient();
    if (!supabase) return;

    // Check if user reached this page via password recovery link
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecoveryMode(true);
      }
    });

    if (typeof window !== 'undefined' && window.location.hash.includes('type=recovery')) {
      setIsRecoveryMode(true);
    }

    return () => {
      subscription.unsubscribe();
    };
  }, [isConfigured]);

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    if (!isConfigured) {
      setLoading(false);
      setSuccessMessage(
        'Un lien de réinitialisation a été généré pour ' + email
      );
      return;
    }

    const supabase = createClient();
    if (!supabase) {
      setLoading(false);
      setError('Client Supabase non disponible.');
      return;
    }

    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${origin}/auth/reset-password`,
    });

    setLoading(false);

    if (resetError) {
      setError(resetError.message || 'Erreur lors de l\'envoi de l\'email de réinitialisation.');
    } else {
      setSuccessMessage(
        'Un lien sécurisé de réinitialisation vous a été envoyé par email. Veuillez vérifier votre boîte de réception universitaire ou personnelle.'
      );
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (newPassword !== confirmPassword) {
      setError('Les mots de passe saisis ne correspondent pas.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Le mot de passe doit comporter au moins 6 caractères.');
      return;
    }

    setLoading(true);

    if (!isConfigured) {
      setLoading(false);
      setSuccessMessage('Mot de passe mis à jour avec succès (simulation démo).');
      setTimeout(() => router.push('/auth/login'), 2000);
      return;
    }

    const supabase = createClient();
    if (!supabase) {
      setLoading(false);
      setError('Client Supabase non disponible.');
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    setLoading(false);

    if (updateError) {
      setError(updateError.message || 'Erreur lors de la mise à jour du mot de passe.');
    } else {
      setSuccessMessage('Votre mot de passe a été réinitialisé avec succès ! Redirection...');
      setTimeout(() => {
        router.push('/student');
      }, 2000);
    }
  };

  return (
    <div className="max-w-md mx-auto my-12 bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-500 mx-auto flex items-center justify-center text-white shadow-md shadow-teal-500/20">
          <KeyRound className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">
          {isRecoveryMode ? 'Nouveau mot de passe' : 'Mot de passe oublié'}
        </h1>
        <p className="text-xs text-slate-500">
          {isRecoveryMode
            ? 'Définissez votre nouveau mot de passe d\'accès'
            : 'Recevez un lien de réinitialisation sécurisé par email'}
        </p>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-900 space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-bold text-sm">Action validée</span>
          </div>
          <p>{successMessage}</p>
        </div>
      )}

      {isRecoveryMode ? (
        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Nouveau mot de passe
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Au moins 6 caractères"
                className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Confirmer le mot de passe
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 active:bg-teal-800 transition-colors shadow-sm disabled:opacity-50"
          >
            {loading ? 'Mise à jour en cours...' : 'Enregistrer le nouveau mot de passe'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      ) : (
        <form onSubmit={handleRequestReset} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Votre adresse email universitaire ou personnelle
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="etudiant@univ.dz"
                className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Entrez l'adresse email associée à votre compte Guidini.
            </span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 active:bg-teal-800 transition-colors shadow-sm disabled:opacity-50"
          >
            {loading ? 'Envoi en cours...' : 'Envoyer le lien de réinitialisation'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      )}

      <div className="text-center pt-2 border-t border-slate-100 text-xs text-slate-500">
        <Link
          href="/auth/login"
          className="inline-flex items-center gap-1.5 text-slate-600 hover:text-slate-900 font-semibold"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Retour à la page de connexion
        </Link>
      </div>
    </div>
  );
}
