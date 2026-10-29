'use client';

import React, { useState } from 'react';
import { Cohort } from '@/lib/types/database';
import {
  Settings,
  Users,
  Copy,
  Check,
  Save,
  Link as LinkIcon,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { CohortService } from '@/lib/services/cohort-service';

interface CohortSettingsViewProps {
  initialCohort: Cohort;
}

export function CohortSettingsView({ initialCohort }: CohortSettingsViewProps) {
  const [cohort, setCohort] = useState<Cohort>(initialCohort);
  const [name, setName] = useState(initialCohort.name);
  const [academicYear, setAcademicYear] = useState(initialCohort.academic_year);
  const [studyYear, setStudyYear] = useState(initialCohort.study_year);
  const [semester, setSemester] = useState(initialCohort.semester);
  const [inviteCode, setInviteCode] = useState(initialCohort.invite_code);
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const inviteLink = typeof window !== 'undefined'
    ? `${window.location.origin}/auth/join?code=${cohort.invite_code}`
    : `https://guidini.app/auth/join?code=${cohort.invite_code}`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(cohort.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      const updated = await CohortService.updateCohort({
        name: name.trim(),
        academic_year: academicYear.trim(),
        study_year: studyYear.trim(),
        semester: semester.trim(),
        invite_code: inviteCode.trim().toUpperCase(),
      });
      setCohort(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 text-teal-700 text-xs font-semibold mb-2 border border-teal-200">
            <Settings className="w-3.5 h-3.5" />
            Configuration Administrative de la Cohorte
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Paramètres & Adhésion de la Promotion
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Gérez l'année universitaire, le semestre et les codes d'invitation pour vos camarades.
          </p>
        </div>

        {/* Member Count Badge */}
        <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-teal-50/80 border border-teal-200 self-start sm:self-auto">
          <div className="p-2.5 rounded-xl bg-teal-600 text-white shadow-xs">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-2xl font-black text-slate-900 leading-none">
              {cohort.member_count ?? 84}
            </span>
            <span className="text-xs font-semibold text-teal-800 block mt-0.5">
              Étudiants Inscrits
            </span>
          </div>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2 text-emerald-800 text-sm font-semibold animate-in fade-in">
          <Check className="w-5 h-5 text-emerald-600" />
          Modifications enregistrées avec succès pour toute la promotion !
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Form: Cohort Info */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs">
          <h2 className="text-base font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-teal-600" />
            Informations Officielles de la Cohorte
          </h2>

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Nom complet de la cohorte
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Faculté de Médecine - Promotion 2026-2032"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Année Universitaire
                </label>
                <input
                  type="text"
                  required
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  placeholder="2026 - 2027"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Niveau d'Études
                </label>
                <input
                  type="text"
                  required
                  value={studyYear}
                  onChange={(e) => setStudyYear(e.target.value)}
                  placeholder="DFGSM 2 (Deuxième Année)"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Semestre en cours
                </label>
                <select
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-teal-500 bg-white"
                >
                  <option value="Semestre 1">Semestre 1 (S1)</option>
                  <option value="Semestre 2">Semestre 2 (S2)</option>
                  <option value="Année Complète">Année Complète</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Code d'invitation (Majuscules)
                </label>
                <input
                  type="text"
                  required
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="MED-2026-ALG"
                  className="w-full font-mono font-bold tracking-wider px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 shadow-sm transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Enregistrement...' : 'Mettre à jour les paramètres'}
              </button>
            </div>
          </form>
        </div>

        {/* Right Card: Invite Share Link */}
        <div className="bg-gradient-to-br from-slate-900 to-teal-950 rounded-3xl p-6 sm:p-7 text-white shadow-md flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-center gap-2 text-teal-300 text-xs font-semibold mb-2">
              <Sparkles className="w-4 h-4" />
              Accès Étudiants
            </div>
            <h3 className="text-lg font-bold">Code & Lien d'Invitation</h3>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              Partagez ce code ou ce lien direct dans le groupe WhatsApp / Telegram de votre promotion médicale.
            </p>
          </div>

          {/* Large Code Display */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 text-center">
            <span className="text-xs text-teal-200 font-semibold uppercase tracking-wider block mb-1">
              Code Promotion
            </span>
            <div className="text-2xl sm:text-3xl font-mono font-black tracking-widest text-white selection:bg-teal-500">
              {cohort.invite_code}
            </div>
            <button
              onClick={handleCopyCode}
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold transition-colors shadow-xs"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Code copié !' : 'Copier le code'}
            </button>
          </div>

          {/* Shareable Link Box */}
          <div className="space-y-2">
            <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
              <LinkIcon className="w-3.5 h-3.5 text-teal-400" />
              Lien direct d'adhésion :
            </span>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={inviteLink}
                className="w-full text-xs font-mono bg-black/30 border border-white/20 rounded-xl px-3 py-2 text-teal-100 truncate focus:outline-hidden"
              />
              <button
                onClick={handleCopyLink}
                className="px-3 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-xs font-medium transition-colors shrink-0"
                title="Copier le lien"
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 border-t border-white/10 pt-3 flex items-center justify-between">
            <span>Isolation stricte RLS</span>
            <span className="text-emerald-400">● Données sécurisées</span>
          </div>
        </div>
      </div>
    </div>
  );
}
