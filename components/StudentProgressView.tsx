'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  StudentRevisionSession,
  SubjectWithUnits,
} from '@/lib/types/database';
import { useAuth } from '@/lib/context/auth-context';
import {
  CheckCircle2,
  Clock,
  Flame,
  BookOpen,
  Calendar,
  Layers,
  TrendingUp,
  ShieldAlert,
  Search,
  Trash2,
  Plus,
  Lock,
} from 'lucide-react';
import { CohortService } from '@/lib/services/cohort-service';
import { RevisionModal } from './RevisionModal';

interface StudentProgressViewProps {
  initialSubjects: SubjectWithUnits[];
}

export function StudentProgressView({ initialSubjects }: StudentProgressViewProps) {
  const { user, isConfigured } = useAuth();
  const [subjects, setSubjects] = useState<SubjectWithUnits[]>(initialSubjects);
  const [sessions, setSessions] = useState<StudentRevisionSession[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState('all');
  const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false);
  const [deleteConfirmationId, setDeleteConfirmationId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const studentId = user?.id || 'demo-student-id';
    const revs = await CohortService.getStudentRevisionSessions(studentId);
    const cur = await CohortService.getCurriculumTree(studentId);
    setSessions(revs);
    setSubjects(cur);
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Compute metrics
  let totalLessons = 0;
  let completedLessons = 0;
  let inProgressLessons = 0;
  let needsRevisionLessons = 0;

  subjects.forEach((s) =>
    s.units.forEach((u) =>
      u.lessons.forEach((l) => {
        totalLessons++;
        const status = l.progress?.status || 'not_started';
        if (status === 'completed') completedLessons++;
        else if (status === 'in_progress') inProgressLessons++;
        else if (status === 'needs_revision') needsRevisionLessons++;
      })
    )
  );

  const percentCompleted = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
  const totalRevisionMinutesLogged = sessions.reduce((acc, s) => acc + s.duration_min, 0);
  const totalHoursLogged = (totalRevisionMinutesLogged / 60).toFixed(1);

  // Filtered revision sessions
  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      const matchQuery =
        searchQuery.trim() === '' ||
        (s.lesson_title && s.lesson_title.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (s.subject_name && s.subject_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (s.notes && s.notes.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchSubject =
        selectedSubjectFilter === 'all' || s.subject_name === selectedSubjectFilter;

      return matchQuery && matchSubject;
    });
  }, [sessions, searchQuery, selectedSubjectFilter]);

  // Handle deleting a session
  const handleDeleteSession = async (sessionId: string) => {
    try {
      await CohortService.deleteRevisionSession(sessionId, user?.id || 'demo-student-id');
      setDeleteConfirmationId(null);
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  // Handle saving revision from modal
  const handleSaveRevision = async (
    lessonId: string,
    durationMin: number,
    sessionType: string,
    confidenceRating: number,
    notes: string,
    sessionDate?: string
  ) => {
    await CohortService.logRevisionSession(
      user?.id || 'demo-student-id',
      lessonId,
      durationMin,
      sessionType,
      confidenceRating,
      notes,
      sessionDate
    );
    await loadData();
  };

  return (
    <div className="space-y-6">
      {/* Explicit Demo Data Warning Banner */}
      {!isConfigured && (
        <div className="bg-amber-50 border border-amber-200/90 rounded-2xl p-4 text-xs text-amber-900 flex items-start gap-3 shadow-2xs">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-bold text-amber-950 text-sm">
              Données de démonstration pédagogique (Non réelles)
            </h4>
            <p className="leading-relaxed">
              Les statistiques et sessions ci-dessous illustrent le suivi personnel d'un étudiant.
              Chaque compte authentifié dispose d'un espace strictement isolé et garanti par les politiques de sécurité (RLS).
            </p>
          </div>
        </div>
      )}

      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 rounded-3xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-semibold border border-teal-400/30">
              <TrendingUp className="w-3.5 h-3.5" />
              Journal Personnel • Étudiant en Médecine
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Mon Avancement & Mes Révisions
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
              Vos données d'étude personnelles sont strictement isolées de vos camarades.
              La mise à jour d'un cours par le délégué préserve l'intégralité de votre historique.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto flex-wrap">
            <button
              onClick={() => setIsRevisionModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-400 text-slate-950 text-xs font-bold hover:bg-teal-300 shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              Nouvelle Séance
            </button>
            <Link
              href="/"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 text-white text-xs font-semibold hover:bg-white/20 border border-white/15 transition-colors"
            >
              <BookOpen className="w-4 h-4" />
              Programme
            </Link>
          </div>
        </div>
      </div>

      {/* Progress Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Progression</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-3xl font-black text-slate-900">{percentCompleted}%</div>
          <span className="text-xs text-slate-500 mt-1 block">
            {completedLessons} sur {totalLessons} cours validés
          </span>
          <div className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${percentCompleted}%` }}
            />
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Temps de Travail</span>
            <Clock className="w-4 h-4 text-teal-500" />
          </div>
          <div className="text-3xl font-black text-slate-900">{totalHoursLogged} h</div>
          <span className="text-xs text-slate-500 mt-1 block">
            {sessions.length} séances enregistrées
          </span>
          <div className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-teal-600 h-full rounded-full"
              style={{ width: `${Math.min(100, (Number(totalHoursLogged) / 50) * 100)}%` }}
            />
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">À Réviser</span>
            <Flame className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-3xl font-black text-amber-600">{needsRevisionLessons}</div>
          <span className="text-xs text-slate-500 mt-1 block">
            Notions nécessitant un renforcement
          </span>
          <div className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-amber-500 h-full rounded-full"
              style={{
                width: `${totalLessons > 0 ? (needsRevisionLessons / totalLessons) * 100 : 0}%`,
              }}
            />
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">En Cours</span>
            <Layers className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-3xl font-black text-blue-600">{inProgressLessons}</div>
          <span className="text-xs text-slate-500 mt-1 block">
            Cours entamés actuellement
          </span>
          <div className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-blue-500 h-full rounded-full"
              style={{
                width: `${totalLessons > 0 ? (inProgressLessons / totalLessons) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Main Two Columns: Breakdown by Subject & Revision Log */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Progress per Subject */}
        <div className="lg:col-span-1 bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-teal-600" />
              Progression par Module
            </span>
            <span className="text-xs text-slate-400 font-normal">
              {subjects.length} modules
            </span>
          </h2>

          <div className="space-y-4">
            {subjects.map((s) => {
              let subTotal = 0;
              let subCompleted = 0;
              s.units.forEach((u) =>
                u.lessons.forEach((l) => {
                  subTotal++;
                  if (l.progress?.status === 'completed') subCompleted++;
                })
              );
              const subPercent = subTotal > 0 ? Math.round((subCompleted / subTotal) * 100) : 0;

              return (
                <Link
                  key={s.id}
                  href={`/student/subjects/${s.id}`}
                  className="block group p-3 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all space-y-1.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800 group-hover:text-teal-700 transition-colors flex items-center gap-1.5 truncate">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: s.color || '#0d9488' }}
                      />
                      <span className="truncate">{s.name}</span>
                    </span>
                    <span className="font-bold text-slate-700 shrink-0">{subPercent}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${subPercent}%`,
                        backgroundColor: s.color || '#0d9488',
                      }}
                    />
                  </div>
                  <div className="text-[10px] text-slate-400 flex items-center justify-between">
                    <span>{subCompleted}/{subTotal} cours validés</span>
                    <span className="text-teal-600 font-semibold group-hover:underline">Voir les cours →</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Right: Revision History Timeline */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-teal-600" />
                Historique de Mes Révisions
              </h2>
              <p className="text-xs text-slate-500">
                Vos séances d'étude privées avec date, durée, méthode et notes personnelles.
              </p>
            </div>
            <span className="text-xs font-semibold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200 self-start sm:self-auto shrink-0">
              {filteredSessions.length} Séance(s)
            </span>
          </div>

          {/* Search & Subject Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filtrer les séances par cours ou mot-clé..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <select
              value={selectedSubjectFilter}
              onChange={(e) => setSelectedSubjectFilter(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700"
            >
              <option value="all">Tous les modules</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sessions List */}
          <div className="divide-y divide-slate-100">
            {filteredSessions.length === 0 ? (
              <div className="py-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto">
                  <Clock className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-slate-800">
                    {sessions.length === 0
                      ? 'Aucune séance enregistrée pour le moment'
                      : 'Aucune séance ne correspond aux filtres'}
                  </p>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                    {sessions.length === 0
                      ? 'Commencez par consigner votre première séance de travail pour suivre votre rythme et préparer vos contrôles continus.'
                      : 'Essayez de modifier votre recherche ou réinitialisez le filtre de module.'}
                  </p>
                </div>
                {sessions.length === 0 ? (
                  <button
                    onClick={() => setIsRevisionModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 shadow-xs transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Enregistrer ma première séance
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedSubjectFilter('all');
                    }}
                    className="text-xs font-semibold text-teal-600 hover:underline"
                  >
                    Réinitialiser les filtres
                  </button>
                )}
              </div>
            ) : (
              filteredSessions.map((session) => (
                <div key={session.id} className="py-4 flex items-start justify-between gap-4 group">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                        {session.subject_name || 'Module'}
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="text-xs text-slate-400">
                        {new Date(session.session_date).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900 leading-snug">
                      {session.lesson_title || 'Cours'}
                    </h4>

                    <div className="flex items-center gap-3 text-xs text-slate-500 pt-0.5 flex-wrap">
                      <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                        {session.session_type}
                      </span>
                      <span className="flex items-center gap-1 font-semibold text-teal-700">
                        <Clock className="w-3.5 h-3.5" />
                        {session.duration_min} min
                      </span>
                      <span className="font-bold text-amber-600">
                        {session.confidence_rating}★ / 5
                      </span>
                    </div>

                    {session.notes && (
                      <div className="p-2.5 bg-slate-50 rounded-xl mt-2 border border-slate-100 text-xs text-slate-700 flex items-start gap-2">
                        <Lock className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                        <span className="italic leading-relaxed">"{session.notes}"</span>
                      </div>
                    )}
                  </div>

                  {/* Delete button */}
                  <div className="shrink-0">
                    {deleteConfirmationId === session.id ? (
                      <div className="flex items-center gap-1.5 p-1 bg-rose-50 border border-rose-200 rounded-xl">
                        <span className="text-[10px] text-rose-800 font-semibold px-1">Supprimer ?</span>
                        <button
                          onClick={() => handleDeleteSession(session.id)}
                          className="px-2 py-0.5 text-[10px] font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-2xs"
                        >
                          Oui
                        </button>
                        <button
                          onClick={() => setDeleteConfirmationId(null)}
                          className="px-2 py-0.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-200 rounded-lg"
                        >
                          Non
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirmationId(session.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-all"
                        title="Supprimer cette séance"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Global Revision Modal */}
      {isRevisionModalOpen && (
        <RevisionModal
          isOpen={isRevisionModalOpen}
          availableSubjects={subjects}
          onClose={() => setIsRevisionModalOpen(false)}
          onSave={handleSaveRevision}
        />
      )}
    </div>
  );
}
