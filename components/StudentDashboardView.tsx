'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  SubjectWithUnits,
  Exam,
  StudySession,
  Cohort,
  AcademicUnit,
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
  Bookmark,
  ChevronRight,
} from 'lucide-react';

interface StudentDashboardViewProps {
  initialSubjects: SubjectWithUnits[];
  initialExams: Exam[];
  initialSessions: StudySession[];
  academicUnits?: AcademicUnit[];
  cohort: Cohort;
  examsLastUpdated: string;
}

export function StudentDashboardView({
  initialSubjects,
  initialExams,
  initialSessions,
  academicUnits = [],
  examsLastUpdated,
}: StudentDashboardViewProps) {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<SubjectWithUnits[]>(initialSubjects);
  const [exams, setExams] = useState<Exam[]>(initialExams);
  const [sessions, setSessions] = useState<StudySession[]>(initialSessions);
  const [unitsList, setUnitsList] = useState<AcademicUnit[]>(academicUnits);
  const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 3500);
  };

  const reloadData = async () => {
    const studentId = user?.id || 'demo-student-id';
    const [sub, ex, rev, acUnits] = await Promise.all([
      CohortService.getCurriculumTree(studentId),
      CohortService.getExams(),
      CohortService.getStudentRevisionSessions(studentId),
      CohortService.getAcademicUnits(),
    ]);
    setSubjects(sub);
    setExams(ex);
    setSessions(rev);
    setUnitsList(acUnits);
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
      showFeedback('error', err?.message || "Erreur lors de l'enregistrement");
    }
  };

  // 1. COMPUTE OVERALL METRICS
  let totalLessons = 0;
  let completedCount = 0;
  let inProgressCount = 0;
  let needsRevisionCount = 0;
  let notStartedCount = 0;
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
          notStartedCount++;
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

  // 2. COMPUTE SEPARATED WORKLOAD (SECTION G: CATCH-UP RADAR)
  // A. Four Main Academic Units
  const unitsData = useMemo(() => {
    const list = unitsList.length > 0 ? unitsList : [
      { id: 'unit-cardio-pulm-01', name: 'Unité 01 – Cardiovasculo-Pulmonaire', code: 'UE-01', color: '#0d9488', status: 'in_progress' },
      { id: 'unit-neuro-hem-02', name: 'Unité 02 – Neuro / Hémato / Locomoteur', code: 'UE-02', color: '#6366f1', status: 'not_started' },
      { id: 'unit-endo-uro-03', name: 'Unité 03 – Endocrino / Uro-génital', code: 'UE-03', color: '#f59e0b', status: 'not_started' },
      { id: 'unit-gastro-hem-04', name: 'Unité 04 – Gastro / Hémato', code: 'UE-04', color: '#ef4444', status: 'not_started' },
    ];

    return list.map((u) => {
      const childSubjects = subjects.filter((s) => s.academic_unit_id === u.id);
      let uTotal = 0;
      let uCompleted = 0;
      let uInProgress = 0;
      let uNotStarted = 0;
      let uRemainingMin = 0;

      const modulesInfo = childSubjects.map((s) => {
        let sTotal = 0;
        let sComp = 0;
        s.units.forEach((un) => {
          un.lessons.forEach((l) => {
            sTotal++;
            uTotal++;
            const st = l.progress?.status || 'not_started';
            const dur = l.estimated_duration_min || 60;
            if (st === 'completed') {
              sComp++;
              uCompleted++;
            } else if (st === 'in_progress') {
              uInProgress++;
              uRemainingMin += dur * 0.5;
            } else if (st === 'needs_revision') {
              uInProgress++;
              uRemainingMin += dur * 0.7;
            } else {
              uNotStarted++;
              uRemainingMin += dur;
            }
          });
        });
        return {
          id: s.id,
          name: s.name,
          color: s.color,
          code: s.code,
          lessonsCount: sTotal,
          completedCount: sComp,
        };
      });

      const exam = exams.find(
        (e) =>
          e.academic_unit_id === u.id ||
          (e.target_type === 'unit' &&
            (e.title.toLowerCase().includes(u.code?.toLowerCase() || '') ||
              e.title.toLowerCase().includes(u.name.toLowerCase())))
      ) || null;

      const pct = uTotal > 0 ? Math.round((uCompleted / uTotal) * 100) : 0;

      return {
        unit: u,
        totalLessons: uTotal,
        completedLessons: uCompleted,
        inProgressLessons: uInProgress,
        notStartedLessons: uNotStarted,
        remainingHours: Math.round(uRemainingMin / 60),
        percent: pct,
        modules: modulesInfo,
        exam,
      };
    });
  }, [unitsList, subjects, exams]);

  // B. Four Independent Modules (Never mixed into any main unit)
  const independentData = useMemo(() => {
    const indSubjects = subjects.filter((s) => s.is_independent || !s.academic_unit_id);

    return indSubjects.map((s) => {
      let sTotal = 0;
      let sCompleted = 0;
      let sInProgress = 0;
      let sNotStarted = 0;
      let sRemainingMin = 0;

      s.units.forEach((un) => {
        un.lessons.forEach((l) => {
          sTotal++;
          const st = l.progress?.status || 'not_started';
          const dur = l.estimated_duration_min || 60;
          if (st === 'completed') {
            sCompleted++;
          } else if (st === 'in_progress') {
            sInProgress++;
            sRemainingMin += dur * 0.5;
          } else if (st === 'needs_revision') {
            sInProgress++;
            sRemainingMin += dur * 0.7;
          } else {
            sNotStarted++;
            sRemainingMin += dur;
          }
        });
      });

      const exam = exams.find(
        (e) =>
          e.subject_id === s.id ||
          (e.target_type === 'independent_module' &&
            e.title.toLowerCase().includes(s.name.toLowerCase()))
      ) || null;

      const pct = sTotal > 0 ? Math.round((sCompleted / sTotal) * 100) : 0;

      return {
        subject: s,
        totalLessons: sTotal,
        completedLessons: sCompleted,
        inProgressLessons: sInProgress,
        notStartedLessons: sNotStarted,
        remainingHours: Math.round(sRemainingMin / 60),
        percent: pct,
        exam,
      };
    });
  }, [subjects, exams]);

  const now = new Date().getTime();
  const getDaysRemaining = (dateStr: string | null | undefined) => {
    if (!dateStr) return null;
    const target = new Date(dateStr).getTime();
    return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
  };

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
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-semibold border border-teal-400/30 flex-wrap">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Faculté / Promotion : Faculté de Médecine - Constantine
              </span>
              <span>•</span>
              <span className="text-[11px] font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-400/30">
                Niveau d'Études : Troisième Année
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Bonjour, {user?.full_name || 'Étudiant en Médecine'} 👋
            </h1>
            <p className="text-xs sm:text-sm text-teal-100/90 max-w-2xl leading-relaxed">
              Faculté / Promotion : Faculté de Médecine - Constantine • Niveau d'Études : Troisième Année
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto flex-wrap">
            <button
              onClick={() => setIsRevisionModalOpen(true)}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm text-slate-950 bg-teal-400 hover:bg-teal-300 active:bg-teal-500 shadow-lg shadow-teal-500/25 transition-transform hover:scale-102 shrink-0"
            >
              <Plus className="w-4 h-4 text-slate-950 stroke-[3]" />
              Enregistrer une révision
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Controls Status Card */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-teal-600" />
              Contrôles du Régime
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
              8 contrôles
            </span>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900 leading-none">
                {exams.length}
              </span>
              <span className="text-xs text-slate-500 font-semibold">
                épreuves au total
              </span>
            </div>
            <div className="text-xs text-slate-500 space-y-0.5">
              <div className="flex items-center justify-between">
                <span>• 4 Contrôles d'Unités :</span>
                <span className="font-bold text-teal-700">4 / 4</span>
              </div>
              <div className="flex items-center justify-between">
                <span>• 4 Modules Indépendants :</span>
                <span className="font-bold text-purple-700">4 / 4</span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-400" title={`Synchronisé le ${examsLastUpdated}`}>
              Mis à jour : {formattedExamUpdate}
            </span>
            <Link
              href="/student/exams"
              className="font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1"
            >
              Calendrier complet
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
            <p className="text-[10px] text-slate-400 italic">
              Avancement calculé sur les cours actuellement disponibles.
            </p>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 flex-wrap gap-1">
            <span>{inProgressCount} en cours</span>
            <span>•</span>
            <span className="text-amber-700 font-semibold">{needsRevisionCount} à revoir</span>
            <span>•</span>
            <span>{notStartedCount} non commencés</span>
          </div>
        </div>

        {/* Workload Remaining Hours Card */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-teal-600" />
              Charge Restante
            </span>
            <span className="text-xs font-semibold text-slate-500">
              {remainingLessons} cours à valider
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
              Unité 01 en cours ({unitsData[0]?.remainingHours || 0}h restantes)
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



      {/* =========================================================================
          SECTION F.1 : CONTRÔLES DES GRANDES UNITÉS (UNIT CONTROLS)
         ========================================================================= */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-teal-600" />
            <h2 className="text-lg font-extrabold text-slate-900">
              1. Contrôles des Unités Pédagogiques (4 Unités Intégrées)
            </h2>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            1 contrôle semestriel par unité
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {unitsData.map((item) => {
            const hasExamDate = Boolean(item.exam?.exam_date);
            const daysLeft = getDaysRemaining(item.exam?.exam_date);

            return (
              <div
                key={item.unit.id}
                className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between space-y-5 hover:border-teal-400 hover:shadow-md transition-all relative overflow-hidden"
              >
                {/* Top strip */}
                <div
                  className="absolute top-0 left-0 right-0 h-2"
                  style={{ backgroundColor: item.unit.color || '#0d9488' }}
                />

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-teal-50 text-teal-800 border border-teal-200">
                      {item.unit.code || 'UE'} • Contrôle Semestriel
                    </span>
                    {hasExamDate ? (
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                        {daysLeft === 0 ? "Aujourd'hui" : `Dans ${daysLeft} j`}
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300">
                        Date à définir
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-extrabold text-slate-900 leading-snug">
                    {item.exam?.title || `Contrôle Semestriel – ${item.unit.name}`}
                  </h3>

                  {/* Modules Covered List */}
                  <div className="space-y-1.5 pt-1">
                    <div className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                      <span>Modules & cours couverts ({item.totalLessons} cours) :</span>
                      <span className="font-bold text-teal-700">{item.percent}%</span>
                    </div>

                    {item.modules.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {item.modules.map((m) => (
                          <span
                            key={m.id}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-50 text-slate-700 border border-slate-200"
                          >
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: m.color || '#0d9488' }}
                            />
                            {m.name} ({m.lessonsCount})
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-slate-400 italic">
                        Programme en attente d'ouverture
                      </div>
                    )}
                  </div>

                  {/* Date & Location Details */}
                  <div className="text-xs text-slate-500 space-y-1 pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        {hasExamDate ? (
                          new Date(item.exam!.exam_date!).toLocaleDateString('fr-FR', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                          })
                        ) : (
                          <span className="text-amber-800 font-medium">
                            Calendrier non fixé par l'administration
                          </span>
                        )}
                      </span>
                    </div>
                    {item.exam?.location && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{item.exam.location} • Coeff {item.exam.coefficient}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Remaining Workload Bar */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-600">
                    Charge restante : ~{item.remainingHours}h d'étude
                  </span>
                  <Link
                    href={`/student/exams`}
                    className="font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1"
                  >
                    Détails <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* =========================================================================
          SECTION F.2 : CONTRÔLES DES MODULES INDÉPENDANTS (INDEPENDENT MODULES)
         ========================================================================= */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-purple-600" />
            <h2 className="text-lg font-extrabold text-slate-900">
              2. Contrôles des Modules Indépendants (Disciplines Autonomes)
            </h2>
          </div>
          <span className="text-xs font-semibold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
            4 contrôles autonomes
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {independentData.map((item) => {
            const hasExamDate = Boolean(item.exam?.exam_date);
            const daysLeft = getDaysRemaining(item.exam?.exam_date);

            return (
              <div
                key={item.subject.id}
                className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between space-y-4 hover:border-purple-400 hover:shadow-md transition-all relative overflow-hidden"
              >
                {/* Top strip */}
                <div
                  className="absolute top-0 left-0 right-0 h-1.5"
                  style={{ backgroundColor: item.subject.color || '#8b5cf6' }}
                />

                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-md bg-purple-50 text-purple-800 border border-purple-200">
                      {item.subject.code || 'MOD'}
                    </span>
                    {hasExamDate ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-800 border border-purple-200">
                        {daysLeft === 0 ? "Aujourd'hui" : `J-${daysLeft}`}
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                        À définir
                      </span>
                    )}
                  </div>

                  <h3 className="font-extrabold text-slate-900 text-base leading-snug">
                    {item.subject.name}
                  </h3>

                  <p className="text-xs font-semibold text-purple-900">
                    {item.exam?.title || `Contrôle – ${item.subject.name}`}
                  </p>

                  <div className="text-xs text-slate-500 space-y-1 pt-1">
                    <div className="flex items-center justify-between">
                      <span>Cours répertoriés :</span>
                      <span className="font-bold text-slate-800">{item.totalLessons}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Charge estimée :</span>
                      <span className="font-bold text-slate-800">~{item.remainingHours}h</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Coefficient :</span>
                      <span className="font-bold text-slate-800">{item.exam?.coefficient || 1.5}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <Link
                    href={`/student/subjects/${item.subject.id}`}
                    className="font-bold text-purple-700 hover:text-purple-800 flex items-center gap-1"
                  >
                    Accéder au module <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* =========================================================================
          RECENT REVISION SESSIONS LOGS
         ========================================================================= */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-teal-600" />
            <h3 className="font-bold text-slate-900 text-sm">
              Dernières Révisions Consignées
            </h3>
          </div>
          <Link
            href="/student/progress"
            className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1"
          >
            Historique complet ({sessions.length}) <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {sessions.length === 0 ? (
          <div className="p-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center space-y-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto">
              <Flame className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-slate-800 text-xs">
                Aucune révision enregistrée
              </h4>
              <p className="text-[11px] text-slate-500 leading-tight">
                Consignez votre première séance de travail pour débuter votre suivi personnalisé.
              </p>
            </div>
            <button
              onClick={() => setIsRevisionModalOpen(true)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 shadow-xs transition-colors"
            >
              Enregistrer une première séance
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {sessions.slice(0, 4).map((s) => (
              <div
                key={s.id}
                className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-100 flex flex-col justify-between space-y-2 hover:bg-slate-50 transition-colors"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200 truncate max-w-[70%]">
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
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
                  <span className="font-medium">{s.duration_min} min</span>
                  <span className="text-amber-600 font-bold">{s.confidence_rating}★</span>
                </div>
              </div>
            ))}
          </div>
        )}
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
