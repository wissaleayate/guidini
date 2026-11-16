'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/context/auth-context';
import { CohortService } from '@/lib/services/cohort-service';
import { Cohort, StudySession } from '@/lib/types/database';
import { LoadingState } from '@/components/LoadingState';
import {
  Mail,
  Lock,
  Sparkles,
  CheckCircle2,
  Clock,
  Check,
  AlertCircle,
  Copy,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export function StudentProfileClient() {
  const router = useRouter();
  const { user, actualRole, updatePassword, signOut } = useAuth();
  const [cohort, setCohort] = useState<Cohort | null>(null);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [loading, setLoading] = useState(true);

  // Password update form
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMessage, setPwMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  useEffect(() => {
    async function loadProfileData() {
      try {
        setLoading(true);
        const [cohortData, sessionData] = await Promise.all([
          CohortService.getCohort(),
          CohortService.getStudentRevisionSessions(user?.id || 'demo-student-id'),
        ]);
        setCohort(cohortData);
        setSessions(sessionData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadProfileData();
  }, [user]);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMessage(null);

    if (newPassword.length < 6) {
      setPwMessage({ type: 'error', text: 'Le mot de passe doit comporter au moins 6 caractères.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPwMessage({ type: 'error', text: 'Les deux mots de passe ne correspondent pas.' });
      return;
    }

    setPwLoading(true);
    const res = await updatePassword(newPassword);
    setPwLoading(false);

    if (res.success) {
      setPwMessage({ type: 'success', text: 'Votre mot de passe a été mis à jour avec succès.' });
      setNewPassword('');
      setConfirmPassword('');
    } else {
      setPwMessage({ type: 'error', text: res.error || 'Erreur lors de la mise à jour.' });
    }
  };

  const handleCopyId = () => {
    if (user?.id) {
      navigator.clipboard.writeText(user.id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/auth/login');
  };

  if (loading) {
    return <LoadingState message="Chargement de votre profil..." />;
  }

  const totalStudyMinutes = sessions.reduce((acc, s) => acc + (s.duration_min || 0), 0);
  const totalStudyHours = (totalStudyMinutes / 60).toFixed(1);

  return (
    <div className="space-y-6">
      {/* Header Profile Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-teal-600 to-emerald-500 text-white font-extrabold text-xl flex items-center justify-center shadow-md shadow-teal-500/20 shrink-0">
            {user?.full_name ? user.full_name.slice(0, 2).toUpperCase() : 'EM'}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                {user?.full_name || 'Étudiant en Médecine'}
              </h1>
              <span
                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                  actualRole === 'admin'
                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                    : 'bg-teal-50 text-teal-700 border border-teal-200'
                }`}
              >
                {actualRole === 'admin' ? 'Délégué Admin' : 'Étudiant'}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              {user?.email}
            </p>
          </div>
        </div>

        <button
          onClick={handleSignOut}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors self-start sm:self-auto"
        >
          <LogOut className="w-3.5 h-3.5" />
          Se déconnecter
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Study Stats & Cohort Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Study Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-1">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                <span>Séances Enregistrées</span>
                <Clock className="w-4 h-4 text-teal-600" />
              </div>
              <div className="text-2xl font-black text-slate-900">{sessions.length}</div>
              <p className="text-[11px] text-slate-400">Historique d'étude personnel</p>
            </div>

            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-1">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                <span>Temps Total Révisé</span>
                <Clock className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-black text-slate-900">{totalStudyHours} h</div>
              <p className="text-[11px] text-slate-400">Cumul de travail validé</p>
            </div>

            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-1">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                <span>Statut du Compte</span>
                <CheckCircle2 className="w-4 h-4 text-teal-600" />
              </div>
              <div className="text-sm font-bold text-emerald-600 flex items-center gap-1.5 mt-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Actif & Sécurisé
              </div>
              <p className="text-[11px] text-slate-400">Row Level Security (RLS)</p>
            </div>
          </div>

          {/* Academic Cohort Card */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-teal-600" />
              Informations Académiques & Promotion
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <span className="text-slate-400 font-medium block">Faculté / Promotion :</span>
                <span className="font-bold text-slate-900 block text-sm">
                  {cohort?.name || 'Faculté de Médecine'}
                </span>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <span className="text-slate-400 font-medium block">Niveau d'Études :</span>
                <span className="font-bold text-slate-900 block text-sm">
                  {cohort?.study_year || 'Troisième Année'}
                </span>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <span className="text-slate-400 font-medium block">Année Universitaire :</span>
                <span className="font-bold text-slate-900 block text-sm">
                  {cohort?.academic_year || '2026 - 2027'}
                </span>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <span className="text-slate-400 font-medium block">Unité d'Enseignement Active :</span>
                <span className="font-bold text-teal-700 block text-sm">
                  {cohort?.current_unit_name || 'Unité 01 – Cardiovasculo-Pulmonaire'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Security & Password Update */}
        <div className="space-y-6">
          {/* Security & Password Form */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center gap-2">
              <Lock className="w-4 h-4 text-teal-600" />
              Sécurité & Mot de Passe
            </h2>

            {pwMessage && (
              <div
                className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
                  pwMessage.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}
              >
                {pwMessage.type === 'success' ? (
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{pwMessage.text}</span>
              </div>
            )}

            <form onSubmit={handleUpdatePassword} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nouveau mot de passe
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min. 6 caractères"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Confirmer le nouveau mot de passe
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <button
                type="submit"
                disabled={pwLoading}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 transition-colors shadow-xs disabled:opacity-50"
              >
                {pwLoading ? 'Mise à jour...' : 'Modifier mon mot de passe'}
              </button>
            </form>
          </div>

          {/* User ID Box */}
          <div className="bg-slate-50 rounded-3xl p-5 border border-slate-200 text-xs text-slate-600 space-y-2">
            <div className="flex items-center justify-between font-bold text-slate-900">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-teal-600" />
                Identifiant Étudiant Supabase
              </span>
              <button
                onClick={handleCopyId}
                className="p-1 text-slate-400 hover:text-slate-900"
                title="Copier mon ID"
              >
                {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <p className="font-mono text-[11px] bg-white p-2 rounded-xl border border-slate-200 break-all">
              {user?.id || 'demo-student-id'}
            </p>
            <p className="text-[10px] text-slate-400">
              Cet identifiant unique garantit l'isolation cryptographique de vos révisions via Supabase RLS.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
