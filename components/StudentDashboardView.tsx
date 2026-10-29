'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  SubjectWithUnits,
  Exam,
  StudySession,
  Cohort,
} from '@/lib/types/database';
import { useAuth } from '@/lib/context/auth-context';
import { CohortService } from '@/lib/services/cohort-service';
import { RevisionModal } from '@/components/RevisionModal';
import {
  Calendar,
  CheckCircle2,
  Clock,
  BookOpen,
  TrendingUp,
  ArrowRight,
  Flame,
  Plus,
  Layers,
  Sparkles,
  AlertTriangle,
  History,
} from 'lucide-react';

interface StudentDashboardViewProps {
  initialSubjects: SubjectWithUnits[];
  initialExams: Exam[];
  initialSessions: StudySession[];
  cohort: Cohort;
  examsLastUpdated: string;
}

export function StudentDashboardView({
  initialSubjects,
  initialExams,
  initialSessions,
  cohort,
  examsLastUpdated,
}: StudentDashboardViewProps) {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<SubjectWithUnits[]>(initialSubjects);
  const [exams, setExams] = useState<Exam[]>(initialExams);
  const [sessions, setSessions] = useState<StudySession[]>(initialSessions);
  const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 3500);
  };

  const reloadData = async () => {
    const studentId = user?.id || 'demo-student-id';
    const [sub, ex, rev] = await Promise.all([
      CohortService.getCurriculumTree(studentId),
      CohortService.getExams(),
      CohortService.getStudentRevisionSessions(studentId),
    ]);
    setSubjects(sub);
    setExams(ex);
    setSessions(rev);
  };

  // Handle saving revision from global modal
  const handleSaveRevision = async (
    lessonId: string,
    durationMin: number,
    sessionType: string,
    confidenceRating: number,
    notes: string,
    sessionDate?: string
  ) => {
    try {
      await CohortService.logRevisionSession(
        user?.id || 'demo-student-id',
        lessonId,
        durationMin,
        sessionType,
        confidenceRating,
        notes,
        sessionDate
      );
      await reloadData();
      showFeedback('success', 'Séance de révision enregistrée avec succès !');
    } catch (err: any) {
      showFeedback('error', err?.message || 'Erreur lors de l\'enregistrement');
    }
  };

  // Compute curriculum metrics
  let totalLessons = 0;
  let completedCount = 0;
  let inProgressCount = 0;
  let needsRevisionCount = 0;
  let remainingMinutes = 0;

  subjects.forEach((s) => {
    s.units.forEach((u) => {
      u.lessons.forEach((l) => {
        totalLessons++;
        const duration = l.estimated_duration_min || 60;
        const st = l.progress?.status || 'not_started';
        if (st === 'completed') {
          completedCount++;
        } else if (st === 'in_progress') {
          inProgressCount++;
          remainingMinutes += duration * 0.5;
        } else if (st === 'needs_revision') {
          needsRevisionCount++;
          remainingMinutes += duration * 0.7;
        } else {
          remainingMinutes += duration;
        }
      });
    });
  });

  const percentCompleted = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
  const remainingLessons = totalLessons - completedCount;
  const remainingHours = Math.round(remainingMinutes / 60);

  // Revision sessions metrics
  const totalRevisionMinutes = sessions.reduce((acc, s) => acc + s.duration_min, 0);
  const totalRevisionHours = (totalRevisionMinutes / 60).toFixed(1);

  // Next upcoming exam
  const now = new Date().getTime();
  const upcomingExams = useMemo(() => {
    return exams.filter((e) => new Date(e.exam_date).getTime() >= now - 24 * 60 * 60 * 1000);
  }, [exams, now]);

  const nextExam = upcomingExams[0] || null;

  const getDaysRemaining = (dateStr: string) => {
    const target = new Date(dateStr).getTime();
    return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
  };

  // Format last updated date
  const formattedExamUpdate = useMemo(() => {
    try {
      const dt = new Date(examsLastUpdated);
      return dt.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return 'Récemment';
    }
  }, [examsLastUpdated]);

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl border text-sm font-semibold flex items-center gap-2 animate-in fade-in shadow-xs ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-rose-50 text-rose-900 border-rose-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Hero Welcome Banner */}
      <div className="bg-gradient-to-r from-teal-900 via-slate-900 to-slate-950 rounded-3xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-semibold border border-teal-400/30">
              <Sparkles className="w-3.5 h-3.5" />
              Espace Personnel d'Étude • Guidini
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Bonjour, {user?.full_name || 'Étudiant en Médecine'} 👋
            </h1>
            <p className="text-xs sm:text-sm text-teal-100/90 max-w-2xl leading-relaxed">
              {cohort.study_year || 'DFGSM 2 Médecine'} • {cohort.name || 'Promotion 2026–2027'} • {cohort.semester || 'Semestre 1'}.
              Retrouvez l'avancement officiel du programme et vos révisions personnelles.
            </p>
          </div>

          <button
            onClick={() => setIsRevisionModalOpen(true)}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm text-slate-950 bg-teal-400 hover:bg-teal-300 active:bg-teal-500 shadow-lg shadow-teal-500/25 transition-transform hover:scale-102 self-start md:self-auto shrink-0"
          >
            <Plus className="w-4 h-4 text-slate-950 stroke-[3]" />
            Enregistrer une révision
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Next Exam Card */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-teal-600" />
              Prochain Contrôle
            </span>
            {nextExam && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                {getDaysRemaining(nextExam.exam_date) <= 0
                  ? "Aujourd'hui"
                  : `Dans ${getDaysRemaining(nextExam.exam_date)} j`}
              </span>
            )}
          </div>

          {nextExam ? (
            <div className="space-y-1.5">
              <h3 className="font-bold text-slate-900 text-sm leading-snug line-clamp-2" title={nextExam.title}>
                {nextExam.title}
              </h3>
              <div className="text-xs text-slate-500 flex items-center gap-2">
                <span>📅 {new Date(nextExam.exam_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
                <span>•</span>
                <span>Coeff {nextExam.coefficient}</span>
              </div>
              <span className="inline-block text-[11px] font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                {nextExam.subject_name || 'Tronc Commun'}
              </span>
            </div>
          ) : (
            <div className="text-xs text-slate-400 italic py-2">
              Aucune épreuve planifiée prochainement.
            </div>
          )}

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-400" title={`Synchronisé le ${examsLastUpdated}`}>
              Mis à jour : {formattedExamUpdate}
            </span>
            <Link
              href="/student/exams"
              className="font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1"
            >
              Calendrier ({exams.length})
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Overall Curriculum Progress Card */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-teal-600" />
              Progression Cursus
            </span>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              {percentCompleted}%
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900 leading-none">
                {completedCount}
              </span>
              <span className="text-xs text-slate-500 font-semibold">
                / {totalLessons} cours validés
              </span>
            </div>

            {/* Segmented Progress Bar */}
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex">
              <div
                className="bg-emerald-500 h-full transition-all"
                style={{ width: `${percentCompleted}%` }}
                title={`Validés : ${completedCount}`}
              />
              <div
                className="bg-sky-400 h-full transition-all"
                style={{ width: `${totalLessons > 0 ? (inProgressCount / totalLessons) * 100 : 0}%` }}
                title={`En cours : ${inProgressCount}`}
              />
              <div
                className="bg-amber-400 h-full transition-all"
                style={{ width: `${totalLessons > 0 ? (needsRevisionCount / totalLessons) * 100 : 0}%` }}
                title={`À réviser : ${needsRevisionCount}`}
              />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>{inProgressCount} en cours</span>
            <span>•</span>
            <span className="text-amber-700 font-semibold">{needsRevisionCount} à réviser</span>
          </div>
        </div>

        {/* Remaining Lessons Card */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-teal-600" />
              Cours Restants
            </span>
            <span className="text-xs font-semibold text-slate-500">
              {remainingLessons} à valider
            </span>
          </div>

          <div className="space-y-1">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900 leading-none">
                ~{remainingHours}h
              </span>
              <span className="text-xs text-slate-500 font-medium">
                d'étude estimées
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-tight">
              Basé sur les durées préconisées par le programme officiel.
            </p>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <Link
              href="/"
              className="font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1"
            >
              Parcourir le programme
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Revision Sessions Card */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-teal-600" />
              Séances Réalisées
            </span>
            <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
              {sessions.length} séances
            </span>
          </div>

          <div className="space-y-1">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900 leading-none">
                {totalRevisionHours}h
              </span>
              <span className="text-xs text-slate-500 font-medium">
                consignées au total
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-tight">
              Tours de révision, QCM et synthèses mémorisées.
            </p>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <Link
              href="/student/progress"
              className="font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1"
            >
              Historique complet
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* Main Grid: Subjects Progress (Left) + Recent Sessions & Schedule (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Subjects breakdown */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-teal-600" />
              <h2 className="text-lg font-bold text-slate-900">
                Modules Médicaux du Semestre
              </h2>
            </div>
            <span className="text-xs text-slate-400 font-medium">
              {subjects.length} modules
            </span>
          </div>

          {/* Subjects Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {subjects.map((sub) => {
              let subLessons = 0;
              let subCompleted = 0;
              let subMinutes = 0;

              sub.units.forEach((u) => {
                u.lessons.forEach((l) => {
                  subLessons++;
                  subMinutes += l.estimated_duration_min || 60;
                  if (l.progress?.status === 'completed') subCompleted++;
                });
              });

              const subPercent = subLessons > 0 ? Math.round((subCompleted / subLessons) * 100) : 0;

              return (
                <Link
                  key={sub.id}
                  href={`/student/subjects/${sub.id}`}
                  className="group bg-white rounded-3xl p-5 border border-slate-200 hover:border-teal-400 hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                        {sub.code || 'MED'}
                      </span>
                      <span className="text-xs font-bold text-slate-700">
                        {subPercent}%
                      </span>
                    </div>

                    <h3 className="font-bold text-slate-900 text-base group-hover:text-teal-700 transition-colors leading-snug">
                      {sub.name}
                    </h3>

                    <div className="text-xs text-slate-500 flex items-center gap-2">
                      <span>{sub.units.length} unités</span>
                      <span>•</span>
                      <span>{subLessons} cours</span>
                      <span>•</span>
                      <span>{Math.round(subMinutes / 60)}h</span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${subPercent}%`,
                          backgroundColor: sub.color || '#0d9488',
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 group-hover:text-teal-600 transition-colors">
                      <span>{subCompleted} / {subLessons} validés</span>
                      <span className="flex items-center gap-0.5">
                        Consulter <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Right Column: Recent Sessions + Shared Calendar */}
        <div className="space-y-6">
          {/* Recent Revision Sessions Card */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-teal-600" />
                <h3 className="font-bold text-slate-900 text-sm">
                  Dernières Révisions
                </h3>
              </div>
              <Link
                href="/student/progress"
                className="text-xs font-semibold text-teal-600 hover:text-teal-700"
              >
                Voir tout
              </Link>
            </div>

            {sessions.length === 0 ? (
              <div className="p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center space-y-3">
                <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto">
                  <Flame className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-slate-800 text-xs">
                    Aucune révision enregistrée
                  </h4>
                  <p className="text-[11px] text-slate-500 leading-tight">
                    Commencez par consigner votre première session de travail.
                  </p>
                </div>
                <button
                  onClick={() => setIsRevisionModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 shadow-xs transition-colors"
                >
                  Lancer ma première séance
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {sessions.slice(0, 4).map((s) => (
                  <div
                    key={s.id}
                    className="p-3 bg-slate-50/80 rounded-2xl border border-slate-100 flex items-start justify-between gap-3 hover:bg-slate-50 transition-colors"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200 truncate">
                          {s.subject_name}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(s.session_date).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </span>
                      </div>
                      <h4 className="font-semibold text-xs text-slate-900 truncate" title={s.lesson_title}>
                        {s.lesson_title}
                      </h4>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500">
                        <span className="font-medium text-slate-600 truncate">{s.session_type}</span>
                        <span>•</span>
                        <span>{s.duration_min} min</span>
                        <span>•</span>
                        <span className="text-amber-600 font-bold">{s.confidence_rating}★</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming Exams Calendar Card */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-teal-600" />
                <h3 className="font-bold text-slate-900 text-sm">
                  Calendrier de Promotion
                </h3>
              </div>
              <Link
                href="/student/exams"
                className="text-xs font-semibold text-teal-600 hover:text-teal-700"
              >
                Tout voir
              </Link>
            </div>

            <div className="space-y-3">
              {upcomingExams.slice(0, 3).map((ex) => (
                <div
                  key={ex.id}
                  className="p-3 bg-teal-50/40 rounded-2xl border border-teal-100 flex items-start justify-between gap-3"
                >
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-teal-800 bg-teal-100/70 px-2 py-0.5 rounded-md">
                      {ex.exam_type}
                    </span>
                    <h4 className="font-bold text-xs text-slate-900 leading-snug">
                      {ex.title}
                    </h4>
                    <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>{new Date(ex.exam_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}</span>
                      {ex.location && (
                        <>
                          <span>•</span>
                          <span>{ex.location}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <span className="text-xs font-bold text-teal-700 bg-white px-2 py-1 rounded-xl border border-teal-200 shrink-0">
                    Coeff {ex.coefficient}
                  </span>
                </div>
              ))}
            </div>
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
