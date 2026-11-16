'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import {
  SubjectWithUnits,
  AcademicUnit,
  LessonDifficulty,
  LessonStatus,
  Lesson,
} from '@/lib/types/database';
import { useAuth } from '@/lib/context/auth-context';
import {
  Clock,
  Plus,
  Trash2,
  Flame,
  BookmarkPlus,
  Layers,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  FolderOpen,
  ChevronDown,
  ChevronUp,
  Search,
  CheckCircle2,
  Edit2,
  CircleDashed,
  PlayCircle,
  RotateCw,
  Calendar,
} from 'lucide-react';
import { LessonStatusSelector } from './LessonStatusSelector';
import { RevisionModal } from './RevisionModal';
import { LessonEditModal } from './LessonEditModal';
import { SubjectCreateModal } from './SubjectCreateModal';
import { CohortService } from '@/lib/services/cohort-service';
import { INITIAL_ACADEMIC_UNITS } from '@/lib/data/sample-data';

interface CurriculumViewProps {
  initialSubjects: SubjectWithUnits[];
  initialAcademicUnits?: AcademicUnit[];
  onReload?: () => Promise<void>;
}

export function CurriculumView({
  initialSubjects,
  initialAcademicUnits,
  onReload,
}: CurriculumViewProps) {
  const { role, user } = useAuth();
  const [subjects, setSubjects] = useState<SubjectWithUnits[]>(initialSubjects);
  const [academicUnits, setAcademicUnits] = useState<AcademicUnit[]>(
    initialAcademicUnits && initialAcademicUnits.length > 0
      ? initialAcademicUnits
      : INITIAL_ACADEMIC_UNITS
  );

  // Hierarchical Navigation State:
  // selectedUnitId: null => Initial Overview (8 Categories: 4 Units + 4 Independent Modules)
  // selectedUnitId: string => Dedicated Unit Page (Only displays modules belonging to this unit)
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);

  // Collapsed modules state (default is empty, meaning all modules are EXPANDED by default)
  const [collapsedModuleIds, setCollapsedModuleIds] = useState<Record<string, boolean>>({});

  // Unit-level search filter for quick lookup
  const [unitSearchQuery, setUnitSearchQuery] = useState('');

  // Toast feedback
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modals state
  const [revisionLesson, setRevisionLesson] = useState<{ lesson: Lesson; subjectName: string } | null>(null);
  const [editingLesson, setEditingLesson] = useState<{ lesson: Lesson | null; defaultUnitId?: string } | null>(null);
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);

  // Sync props changes
  useEffect(() => {
    setSubjects(initialSubjects);
  }, [initialSubjects]);

  useEffect(() => {
    if (initialAcademicUnits && initialAcademicUnits.length > 0) {
      setAcademicUnits(initialAcademicUnits);
    }
  }, [initialAcademicUnits]);

  // Check URL search params for direct unit deep-linking (?unit=...)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const unitParam = params.get('unit');
      if (unitParam) {
        setSelectedUnitId(unitParam);
      }
    }
  }, []);

  // Status mapping
  const statusLabels: Record<LessonStatus, { label: string; bg: string; text: string; border: string }> = {
    not_started: { label: 'Non commencé', bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300' },
    in_progress: { label: 'En cours', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    completed: { label: 'Validé', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    needs_revision: { label: 'À réviser', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  };

  const statusIcons: Record<LessonStatus, React.ComponentType<{ className?: string }>> = {
    not_started: CircleDashed,
    in_progress: PlayCircle,
    completed: CheckCircle2,
    needs_revision: RotateCw,
  };

  const difficultyColors: Record<LessonDifficulty, string> = {
    Facile: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Moyen: 'bg-sky-50 text-sky-700 border-sky-200',
    Difficile: 'bg-orange-50 text-orange-700 border-orange-200',
    'Très Difficile': 'bg-rose-50 text-rose-700 border-rose-200',
  };

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 3000);
  };

  // Safe shallow unit navigation that syncs URL without triggering a full page reload
  const handleSelectUnit = (unitId: string | null) => {
    setSelectedUnitId(unitId);
    setUnitSearchQuery('');
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (unitId) {
        url.searchParams.set('unit', unitId);
      } else {
        url.searchParams.delete('unit');
      }
      window.history.replaceState(null, '', url.toString());
    }
  };

  const toggleModuleCollapse = (moduleId: string) => {
    setCollapsedModuleIds((prev) => ({
      ...prev,
      [moduleId]: !prev[moduleId],
    }));
  };

  const expandAllModules = () => {
    setCollapsedModuleIds({});
  };

  const collapseAllModules = (moduleIds: string[]) => {
    const allCollapsed: Record<string, boolean> = {};
    moduleIds.forEach((id) => {
      allCollapsed[id] = true;
    });
    setCollapsedModuleIds(allCollapsed);
  };

  // Student progress handler - Zero page reload, purely optimistic in-place update
  const handleStatusChange = async (lessonId: string, newStatus: LessonStatus) => {
    // 1. Instant local optimistic update (no page reload, no view reset)
    setSubjects((prev) =>
      prev.map((s) => ({
        ...s,
        units: s.units.map((u) => ({
          ...u,
          lessons: u.lessons.map((l) =>
            l.id === lessonId
              ? {
                  ...l,
                  progress: {
                    ...(l.progress || {
                      id: `prog-${Date.now()}`,
                      student_id: user?.id || 'demo-student-id',
                      lesson_id: lessonId,
                      confidence_score: 3,
                    }),
                    status: newStatus,
                  },
                }
              : l
          ),
        })),
      }))
    );
    showFeedback('success', `Statut mis à jour : ${statusLabels[newStatus].label}`);

    // 2. Persist to Supabase / local storage asynchronously
    try {
      const studentId = user?.id || 'demo-student-id';
      await CohortService.updateStudentProgress(studentId, lessonId, newStatus);
      if (onReload) {
        onReload().catch((err) => console.warn('Background sync notice:', err));
      }
    } catch (err: any) {
      console.error('Error updating progress:', err);
      showFeedback('error', err?.message || 'Erreur lors de la sauvegarde du statut.');
      if (onReload) await onReload();
    }
  };

  // Admin handlers
  const handleSaveLesson = async (data: any) => {
    if (editingLesson?.lesson) {
      await CohortService.updateLesson(editingLesson.lesson.id, {
        title: data.title,
        difficulty: data.difficulty,
        estimated_duration_min: data.durationMin,
        revision_target: data.revisionTarget,
        notes: data.notes,
        description: data.description,
        source_file_ref: data.sourceFileRef,
        is_available: data.isAvailable,
      });
    } else {
      await CohortService.createLesson(
        data.unitId,
        data.title,
        data.difficulty,
        data.durationMin,
        data.revisionTarget || 3,
        data.notes,
        data.description,
        data.sourceFileRef,
        data.isAvailable
      );
    }
    const studentId = user?.id || 'demo-student-id';
    const updated = await CohortService.getCurriculumTree(studentId);
    setSubjects(updated);
    if (onReload) await onReload();
  };

  const handleDeleteLesson = async (lessonId: string) => {
    if (confirm('Voulez-vous supprimer ce cours du programme partagé ?')) {
      await CohortService.deleteLesson(lessonId);
      const studentId = user?.id || 'demo-student-id';
      const updated = await CohortService.getCurriculumTree(studentId);
      setSubjects(updated);
      if (onReload) await onReload();
    }
  };

  const handleCreateSubject = async (
    name: string,
    code: string,
    color: string,
    semester: string,
    academicUnitId?: string | null,
    isIndependent?: boolean
  ) => {
    await CohortService.createSubject(name, code, color, semester, academicUnitId, isIndependent);
    const studentId = user?.id || 'demo-student-id';
    const updated = await CohortService.getCurriculumTree(studentId);
    setSubjects(updated);
    if (onReload) await onReload();
  };


  // Grouped Categories
  // 1. Four Main Academic Units
  const mainUnits = useMemo(() => {
    return academicUnits.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
  }, [academicUnits]);

  // 2. Four Independent Modules (NOT attached to any academic unit)
  const independentModules = useMemo(() => {
    return subjects.filter((s) => s.is_independent === true || !s.academic_unit_id);
  }, [subjects]);

  // Active selected main unit (if any)
  const currentSelectedUnit = useMemo(() => {
    if (!selectedUnitId) return null;
    return mainUnits.find((u) => u.id === selectedUnitId) || null;
  }, [selectedUnitId, mainUnits]);

  // Modules belonging strictly to the selected main unit
  const modulesInSelectedUnit = useMemo(() => {
    if (!selectedUnitId) return [];
    return subjects.filter((s) => s.academic_unit_id === selectedUnitId);
  }, [selectedUnitId, subjects]);


  // Metrics calculation
  const totalLessons = useMemo(() => {
    let count = 0;
    subjects.forEach((s) =>
      s.units.forEach((u) => {
        count += u.lessons.length;
      })
    );
    return count;
  }, [subjects]);

  const totalCompletedLessons = useMemo(() => {
    let count = 0;
    subjects.forEach((s) =>
      s.units.forEach((u) =>
        u.lessons.forEach((l) => {
          if (l.progress?.status === 'completed') count++;
        })
      )
    );
    return count;
  }, [subjects]);

  const completionPercentage = totalLessons > 0 ? Math.round((totalCompletedLessons / totalLessons) * 100) : 0;

  // Helper to compute progress for a specific unit
  const getUnitProgress = (unitId: string) => {
    const childSubs = subjects.filter((s) => s.academic_unit_id === unitId);
    let lessonsCount = 0;
    let completedCount = 0;
    childSubs.forEach((s) =>
      s.units.forEach((u) =>
        u.lessons.forEach((l) => {
          lessonsCount++;
          if (l.progress?.status === 'completed') completedCount++;
        })
      )
    );
    const percent = lessonsCount > 0 ? Math.round((completedCount / lessonsCount) * 100) : 0;
    return { lessonsCount, completedCount, percent };
  };

  // Helper to compute progress for a specific module
  const getModuleProgress = (subject: SubjectWithUnits) => {
    let lessonsCount = 0;
    let completedCount = 0;
    subject.units.forEach((u) =>
      u.lessons.forEach((l) => {
        lessonsCount++;
        if (l.progress?.status === 'completed') completedCount++;
      })
    );
    const percent = lessonsCount > 0 ? Math.round((completedCount / lessonsCount) * 100) : 0;
    return { lessonsCount, completedCount, percent };
  };

  // =========================================================================
  // VIEW 1: INITIAL CURRICULUM PAGE (8 TOP-LEVEL ACADEMIC CATEGORIES ONLY)
  // No lessons displayed immediately on this page!
  // =========================================================================
  if (!selectedUnitId) {
    return (
      <div className="space-y-8 select-none">
        {/* Academic Header Banner */}
        <div className="bg-gradient-to-r from-teal-900 via-slate-900 to-slate-950 rounded-3xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-semibold border border-teal-400/30 flex-wrap">
                <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                Faculté / Promotion : Faculté de Médecine - Constantine
                <span>•</span>
                <span className="text-[11px] font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-400/30">
                  Niveau d'Études : Troisième Année
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Curriculum & Référentiel des Cours
              </h1>
              <p className="text-xs sm:text-sm text-teal-100/90 max-w-2xl leading-relaxed">
                Navigation hiérarchique du programme médical officiel : sélectionnez une des 4 Grandes Unités Intégrées ou un des 4 Modules Indépendants autonomes pour accéder à leurs modules et cours respectifs.
              </p>
            </div>

            {/* Quick Metrics */}
            <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 self-start md:self-auto shrink-0">
              <div className="text-center">
                <span className="block text-2xl font-black text-white">{totalLessons}</span>
                <span className="text-[10px] text-teal-200 uppercase font-bold tracking-wider">
                  Cours Total
                </span>
              </div>
              <div className="w-px h-8 bg-white/20" />
              <div className="text-center">
                <span className="block text-2xl font-black text-amber-300">4</span>
                <span className="text-[10px] text-teal-200 uppercase font-bold tracking-wider">
                  Grandes Unités
                </span>
              </div>
              <div className="w-px h-8 bg-white/20" />
              <div className="text-center">
                <span className="block text-2xl font-black text-indigo-300">4</span>
                <span className="text-[10px] text-teal-200 uppercase font-bold tracking-wider">
                  Modules Indép.
                </span>
              </div>
              {role === 'student' && (
                <>
                  <div className="w-px h-8 bg-white/20" />
                  <div className="text-center">
                    <span className="block text-2xl font-black text-emerald-300">
                      {completionPercentage}%
                    </span>
                    <span className="text-[10px] text-teal-200 uppercase font-bold tracking-wider">
                      Validé
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Admin Quick Action Bar */}
        {role === 'admin' && (
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-teal-50 border border-teal-200 rounded-2xl">
            <div className="flex items-center gap-2 text-teal-950 font-semibold text-xs sm:text-sm">
              <Flame className="w-4 h-4 text-teal-600" />
              <span>Outils d'administration du curriculum (Délégué Admin)</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsSubjectModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white text-teal-800 border border-teal-300 shadow-xs hover:bg-teal-100 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Nouveau Module
              </button>
            </div>
          </div>
        )}

        {/* =========================================================================
            SECTION 1: 4 GRANDES UNITÉS INTÉGRÉES
           ========================================================================= */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-slate-200">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-teal-50 text-teal-700 border border-teal-200">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
                  1. Les 4 Grandes Unités Intégrées (Unités Pédagogiques)
                </h2>
                <p className="text-xs text-slate-500">
                  Chaque grande unité regroupe ses modules médicaux et fait l'objet d'un contrôle semestriel unique.
                </p>
              </div>
            </div>
            <span className="text-xs font-bold text-teal-700 bg-teal-50 px-3 py-1 rounded-full border border-teal-200 self-start sm:self-auto">
              4 unités officielles
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {mainUnits.map((unit) => {
              const childModules = subjects.filter((s) => s.academic_unit_id === unit.id);
              const progress = getUnitProgress(unit.id);
              const isInProgress = unit.status === 'in_progress';

              return (
                <div
                  key={unit.id}
                  onClick={() => handleSelectUnit(unit.id)}
                  className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs hover:border-teal-400 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-5 group"
                >
                  <div>
                    {/* Card Header */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 border border-teal-200">
                          {unit.code || 'UE'}
                        </span>
                        <h3 className="font-extrabold text-slate-900 text-base sm:text-lg group-hover:text-teal-700 transition-colors mt-2">
                          {unit.name}
                        </h3>
                      </div>
                      <span
                        className={`text-[11px] font-bold px-2.5 py-1 rounded-full shrink-0 border ${
                          isInProgress
                            ? 'bg-amber-50 text-amber-900 border-amber-300'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {isInProgress ? 'En cours' : 'À venir'}
                      </span>
                    </div>

                    {/* Modules tags preview */}
                    {childModules.length > 0 ? (
                      <div className="space-y-2 mt-3">
                        <span className="text-xs font-semibold text-slate-500 block">
                          Modules inclus ({childModules.length}) :
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {childModules.map((mod) => (
                            <span
                              key={mod.id}
                              className="text-xs px-2.5 py-1 rounded-lg bg-slate-50 text-slate-700 border border-slate-200 font-medium"
                            >
                              {mod.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 p-3 bg-slate-50 rounded-2xl text-xs text-slate-500 border border-dashed border-slate-200">
                        0 module configuré pour l'instant • Géré via l'administration
                      </div>
                    )}
                  </div>

                  {/* Progress & Bottom Bar */}
                  <div className="pt-4 border-t border-slate-100 space-y-3">
                    {progress.lessonsCount > 0 ? (
                      <div>
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-1.5">
                          <span>
                            {progress.completedCount} / {progress.lessonsCount} cours validés
                          </span>
                          <span className="text-teal-700 font-bold">{progress.percent}%</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full bg-teal-600 rounded-full transition-all duration-500"
                            style={{ width: `${progress.percent}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 block">
                        Programme en cours d'alimentation.
                      </span>
                    )}

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs font-semibold text-teal-700 group-hover:underline flex items-center gap-1">
                        Accéder aux modules de l'unité
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium">
                        1 contrôle semestriel unique
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* =========================================================================
            SECTION 2: 4 MODULES INDÉPENDANTS (DISCIPLINES AUTONOMES)
           ========================================================================= */}
        <div className="space-y-4 pt-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-slate-200">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200">
                <BookmarkPlus className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
                  2. Les 4 Modules Indépendants (Contrôles Dédiés)
                </h2>
                <p className="text-xs text-slate-500">
                  Ces modules constituent des matières indépendantes et ne sont rattachés à aucune des 4 grandes unités. Chacun dispose de son propre contrôle dédié.
                </p>
              </div>
            </div>
            <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200 self-start sm:self-auto">
              4 modules autonomes
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {independentModules.map((module) => {
              const progress = getModuleProgress(module);

              return (
                <Link
                  key={module.id}
                  href={`/student/subjects/${module.id}`}
                  className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs hover:border-indigo-400 hover:shadow-md transition-all flex flex-col justify-between space-y-5 group"
                >
                  <div>
                    {/* Card Header */}
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="w-3.5 h-3.5 rounded-full shrink-0 shadow-2xs"
                          style={{ backgroundColor: module.color || '#6366f1' }}
                        />
                        <div>
                          <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-800 border border-indigo-200">
                            {module.code || 'MOD'}
                          </span>
                          <h3 className="font-extrabold text-slate-900 text-base sm:text-lg group-hover:text-indigo-700 transition-colors mt-2">
                            {module.name}
                          </h3>
                        </div>
                      </div>
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">
                        Discipline Autonome
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                      Matière transversale évaluée séparément. Ses cours et examens sont strictement indépendants du cursus des 4 grandes unités.
                    </p>
                  </div>

                  {/* Progress & Bottom Bar */}
                  <div className="pt-4 border-t border-slate-100 space-y-3">
                    {progress.lessonsCount > 0 ? (
                      <div>
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-1.5">
                          <span>
                            {progress.completedCount} / {progress.lessonsCount} cours validés
                          </span>
                          <span className="text-indigo-700 font-bold">{progress.percent}%</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                            style={{ width: `${progress.percent}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 block">
                        Programme en attente de publication des cours.
                      </span>
                    )}

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs font-semibold text-indigo-700 group-hover:underline flex items-center gap-1">
                        Consulter les cours du module
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium">
                        Contrôle dédié
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Modals for admin */}
        {isSubjectModalOpen && (
          <SubjectCreateModal
            isOpen={isSubjectModalOpen}
            onClose={() => setIsSubjectModalOpen(false)}
            academicUnits={academicUnits}
            onSave={handleCreateSubject}
          />
        )}
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: DEDICATED MAIN UNIT DETAIL VIEW
  // Displays modules belonging to this unit with lessons DIRECTLY underneath!
  // =========================================================================
  const unitProgress = currentSelectedUnit ? getUnitProgress(currentSelectedUnit.id) : { lessonsCount: 0, completedCount: 0, percent: 0 };

  return (
    <div className="space-y-6 select-none">
      {/* Top Back Navigation Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => handleSelectUnit(null)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:text-teal-800 hover:border-teal-300 transition-colors shadow-2xs cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-teal-600" />
          <span>Retour à l'ensemble du curriculum (8 catégories)</span>
        </button>

        <span className="text-xs text-slate-500 font-medium hidden sm:inline">
          Faculté de Médecine - Constantine • Troisième Année
        </span>
      </div>

      {/* Toast Feedback */}
      {feedback && (
        <div
          className={`p-3.5 rounded-2xl border text-xs font-semibold flex items-center gap-2 animate-in fade-in shadow-xs ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-rose-50 text-rose-900 border-rose-200'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Unit Detail Banner */}
      <div className="bg-gradient-to-r from-teal-800 via-teal-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-200 text-xs font-semibold border border-teal-400/30 flex-wrap">
              <Layers className="w-3.5 h-3.5" />
              Grande Unité Intégrée • {currentSelectedUnit?.code || 'UE'}
              <span>•</span>
              <span className="text-[11px] font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-400/30">
                {currentSelectedUnit?.status === 'in_progress' ? 'En cours' : 'À venir'}
              </span>
              <span>•</span>
              <span className="text-[11px] font-medium text-teal-200">
                1 seul contrôle semestriel commun
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {currentSelectedUnit?.name || 'Unité Pédagogique'}
            </h1>
            <p className="text-xs sm:text-sm text-teal-100/90 max-w-2xl leading-relaxed">
              Consultez les modules et leurs cours respectifs directement ci-dessous. Validez votre progression sans rechargement de page.
            </p>
          </div>

          {/* Unit Stats & Progress */}
          <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 shrink-0 self-start md:self-auto">
            <div className="text-center">
              <span className="block text-2xl font-black">{modulesInSelectedUnit.length}</span>
              <span className="text-[10px] text-teal-200 uppercase font-bold">Modules</span>
            </div>
            <div className="w-px h-8 bg-white/20" />
            <div className="text-center">
              <span className="block text-2xl font-black">{unitProgress.lessonsCount}</span>
              <span className="text-[10px] text-teal-200 uppercase font-bold">Cours Total</span>
            </div>
            <div className="w-px h-8 bg-white/20" />
            <div className="text-center">
              <span className="block text-2xl font-black text-emerald-300">
                {unitProgress.percent}%
              </span>
              <span className="text-[10px] text-teal-200 uppercase font-bold">Validé</span>
            </div>
          </div>
        </div>
      </div>

      {/* Unit Toolbar: Filter, Search, Expand All */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={unitSearchQuery}
              onChange={(e) => setUnitSearchQuery(e.target.value)}
              placeholder="Filtrer un cours dans cette unité..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
            />
          </div>
          {unitSearchQuery && (
            <button
              onClick={() => setUnitSearchQuery('')}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 shrink-0"
            >
              Effacer
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={expandAllModules}
            className="text-xs font-semibold text-slate-600 hover:text-teal-700 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Tout développer
          </button>
          <button
            onClick={() => collapseAllModules(modulesInSelectedUnit.map((m) => m.id))}
            className="text-xs font-semibold text-slate-600 hover:text-teal-700 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Tout réduire
          </button>
          {role === 'admin' && (
            <button
              onClick={() => setIsSubjectModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 transition-colors shadow-2xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Nouveau Module
            </button>
          )}
        </div>
      </div>

      {/* Modules List Belonging to This Main Unit (With lessons DIRECTLY displayed) */}
      {modulesInSelectedUnit.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8 space-y-3">
          <FolderOpen className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">
            Aucun module configuré pour cette unité
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            Les modules et cours de cette unité n'ont pas encore été publiés. L'administrateur peut les ajouter directement via le tableau de bord de gestion.
          </p>
          {role === 'admin' && (
            <button
              onClick={() => setIsSubjectModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Créer le premier module
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {modulesInSelectedUnit.map((mod) => {
            const isCollapsed = Boolean(collapsedModuleIds[mod.id]);
            const progress = getModuleProgress(mod);
            const searchFilter = unitSearchQuery.trim().toLowerCase();

            return (
              <div
                key={mod.id}
                className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden transition-all"
                style={{ borderTop: `4px solid ${mod.color || '#0d9488'}` }}
              >
                {/* Module Header Bar */}
                <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-50/90 to-white border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: mod.color || '#0d9488' }}
                      />
                      <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {mod.code || 'MOD'}
                      </span>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-800">
                        {mod.semester || 'S1'}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">
                        {progress.lessonsCount} cours au programme
                      </span>
                    </div>
                    <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
                      {mod.name}
                    </h3>
                  </div>

                  {/* Module Progress & Action Buttons */}
                  <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
                    {progress.lessonsCount > 0 && (
                      <div className="flex items-center gap-3 bg-white px-3.5 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
                        <div className="text-right">
                          <span className="text-xs font-bold text-slate-700 block">
                            {progress.completedCount} / {progress.lessonsCount}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            cours validés
                          </span>
                        </div>
                        <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-teal-600 rounded-full transition-all duration-300"
                            style={{ width: `${progress.percent}%` }}
                          />
                        </div>
                        <span className="text-xs font-black text-teal-700">{progress.percent}%</span>
                      </div>
                    )}

                    <Link
                      href={`/student/subjects/${mod.id}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-teal-700 bg-white border border-slate-200 hover:border-teal-300 transition-colors shadow-2xs"
                    >
                      <span>Fiche complète</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>

                    <button
                      onClick={() => toggleModuleCollapse(mod.id)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 transition-colors cursor-pointer"
                    >
                      {isCollapsed ? (
                        <>
                          <ChevronDown className="w-4 h-4 text-teal-600" />
                          <span>Afficher les cours</span>
                        </>
                      ) : (
                        <>
                          <ChevronUp className="w-4 h-4 text-teal-600" />
                          <span>Réduire</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Module Lessons Directly Underneath (Visible by default) */}
                {!isCollapsed && (
                  <div className="p-4 sm:p-6 space-y-5">
                    {mod.units.map((unitCategory) => {
                      const filteredLessons = searchFilter
                        ? unitCategory.lessons.filter(
                            (l) =>
                              l.title.toLowerCase().includes(searchFilter) ||
                              (l.description && l.description.toLowerCase().includes(searchFilter))
                          )
                        : unitCategory.lessons;

                      if (searchFilter && filteredLessons.length === 0) {
                        return null;
                      }

                      return (
                        <div
                          key={unitCategory.id}
                          className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs"
                        >
                          <div className="bg-slate-50/80 px-4 sm:px-5 py-2.5 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
                            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                              {unitCategory.title} ({filteredLessons.length} cours)
                            </span>
                            {role === 'admin' && (
                              <button
                                onClick={() => setEditingLesson({ lesson: null, defaultUnitId: unitCategory.id })}
                                className="text-xs font-bold text-teal-700 hover:underline inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Plus className="w-3 h-3" /> Ajouter cours
                              </button>
                            )}
                          </div>

                          <div className="divide-y divide-slate-100">
                            {filteredLessons.length === 0 ? (
                              <div className="p-4 text-center text-xs text-slate-400">
                                {searchFilter
                                  ? 'Aucun cours ne correspond à la recherche dans cette section.'
                                  : 'Aucun cours dans cette catégorie.'}
                              </div>
                            ) : (
                              filteredLessons.map((lesson) => {
                                const currentStatus = lesson.progress?.status || 'not_started';
                                const statusConfig = statusLabels[currentStatus];
                                const StatusIcon = statusIcons[currentStatus] || CircleDashed;

                                return (
                                  <div
                                    key={lesson.id}
                                    className="p-4 sm:p-5 hover:bg-slate-50/70 transition-all duration-200 flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-l-4"
                                    style={{
                                      borderLeftColor:
                                        currentStatus === 'completed'
                                          ? '#10b981'
                                          : currentStatus === 'in_progress'
                                          ? '#3b82f6'
                                          : currentStatus === 'needs_revision'
                                          ? '#9333ea'
                                          : '#cbd5e1',
                                    }}
                                  >
                                    <div className="space-y-2 flex-1 min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        {/* Status badge pill */}
                                        <span
                                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}
                                        >
                                          <StatusIcon className="w-3 h-3" />
                                          {statusConfig.label}
                                        </span>

                                        <h4 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                                          {lesson.title}
                                        </h4>

                                        <span
                                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                            difficultyColors[lesson.difficulty as LessonDifficulty] ||
                                            'bg-slate-100 text-slate-600 border-slate-200'
                                          }`}
                                        >
                                          {lesson.difficulty}
                                        </span>

                                        {lesson.estimated_duration_min && (
                                          <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                                            <Clock className="w-3 h-3 text-slate-400" />
                                            {lesson.estimated_duration_min} min
                                          </span>
                                        )}
                                      </div>

                                      {lesson.description && (
                                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                                          {lesson.description}
                                        </p>
                                      )}

                                      {/* Extra indicators */}
                                      <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap pt-0.5">
                                        {lesson.progress?.last_studied_at ? (
                                          <span className="flex items-center gap-1 text-slate-700 font-medium bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                                            <Calendar className="w-3 h-3 text-teal-600" />
                                            Dernière révision : {new Date(lesson.progress.last_studied_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                                          </span>
                                        ) : (
                                          <span className="text-slate-400 italic">Pas encore étudié</span>
                                        )}

                                        {lesson.revision_target && (
                                          <span className="font-medium text-slate-500">
                                            🎯 Objectif : {lesson.revision_target} révisions
                                          </span>
                                        )}

                                        {lesson.source_file_ref && (
                                          <span className="text-slate-400 font-mono text-[10px] truncate max-w-[200px]">
                                            Réf: {lesson.source_file_ref}
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    {/* Student Status & Actions */}
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 shrink-0 pt-2 xl:pt-0 border-t xl:border-t-0 border-slate-100">
                                      <LessonStatusSelector
                                        currentStatus={currentStatus}
                                        onChange={(newStatus) =>
                                          handleStatusChange(lesson.id, newStatus)
                                        }
                                      />

                                      <div className="flex items-center gap-2 self-end sm:self-auto">
                                        <button
                                          onClick={() =>
                                            setRevisionLesson({
                                              lesson,
                                              subjectName: mod.name,
                                            })
                                          }
                                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-teal-800 px-3 py-2 rounded-xl border border-slate-200 hover:border-teal-300 bg-white hover:bg-teal-50/50 shadow-2xs transition-colors cursor-pointer"
                                          title="Enregistrer une séance de révision"
                                        >
                                          <Plus className="w-3.5 h-3.5 text-teal-600" />
                                          <span>Révision</span>
                                        </button>

                                        {role === 'admin' && (
                                          <>
                                            <button
                                              onClick={() =>
                                                setEditingLesson({ lesson, defaultUnitId: unitCategory.id })
                                              }
                                              className="p-2 text-slate-400 hover:text-teal-600 rounded-lg hover:bg-teal-50 transition-colors cursor-pointer"
                                              title="Modifier le cours"
                                            >
                                              <Edit2 className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                              onClick={() => handleDeleteLesson(lesson.id)}
                                              className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                                              title="Supprimer le cours"
                                            >
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modals for revision and editing */}
      {revisionLesson && (
        <RevisionModal
          isOpen={Boolean(revisionLesson)}
          onClose={() => setRevisionLesson(null)}
          lesson={revisionLesson.lesson}
          subjectName={revisionLesson.subjectName}
          onSave={async (lessonId, durationMin, sessionType, rating, notes, sessionDate) => {
            const studentId = user?.id || 'demo-student-id';
            await CohortService.logRevisionSession(
              studentId,
              lessonId,
              durationMin,
              sessionType,
              rating,
              notes,
              sessionDate
            );
            const updated = await CohortService.getCurriculumTree(studentId);
            setSubjects(updated);
            if (onReload) await onReload();
          }}
        />
      )}

      {editingLesson && (
        <LessonEditModal
          isOpen={Boolean(editingLesson)}
          onClose={() => setEditingLesson(null)}
          initialLesson={editingLesson.lesson}
          defaultUnitId={editingLesson.defaultUnitId}
          subjects={subjects}
          onSave={handleSaveLesson}
        />
      )}

      {isSubjectModalOpen && (
        <SubjectCreateModal
          isOpen={isSubjectModalOpen}
          onClose={() => setIsSubjectModalOpen(false)}
          academicUnits={academicUnits}
          onSave={handleCreateSubject}
        />
      )}
    </div>
  );
}
