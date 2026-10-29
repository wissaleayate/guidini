'use client';

import React, { useState, useMemo } from 'react';
import {
  SubjectWithUnits,
  Subject,
  Unit,
  Lesson,
  LessonDifficulty,
} from '@/lib/types/database';
import {
  Search,
  BookOpen,
  Clock,
  Plus,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronRight,
  Filter,
  ArrowUp,
  ArrowDown,
  Download,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  FolderPlus,
  Layers,
  HelpCircle,
} from 'lucide-react';
import { LessonEditModal } from './LessonEditModal';
import { SubjectCreateModal } from './SubjectCreateModal';
import { UnitCreateModal } from './UnitCreateModal';
import { CohortService } from '@/lib/services/cohort-service';
import { exportCurriculumToCSV } from '@/lib/services/import-parser';

interface AdminCurriculumManagerProps {
  initialSubjects: SubjectWithUnits[];
  onRefresh?: () => Promise<void>;
}

export function AdminCurriculumManager({ initialSubjects, onRefresh }: AdminCurriculumManagerProps) {
  const [subjects, setSubjects] = useState<SubjectWithUnits[]>(initialSubjects);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSemester, setSelectedSemester] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Expanded tree states
  const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    initialSubjects.forEach((s) => (map[s.id] = true));
    return map;
  });

  const [expandedUnits, setExpandedUnits] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    initialSubjects.forEach((s) => s.units.forEach((u) => (map[u.id] = true)));
    return map;
  });

  // Modals state
  const [editingSubject, setEditingSubject] = useState<{ isOpen: boolean; subject?: Subject | null }>({
    isOpen: false,
    subject: null,
  });

  const [editingUnit, setEditingUnit] = useState<{ isOpen: boolean; defaultSubjectId?: string; unit?: Unit | null }>({
    isOpen: false,
    unit: null,
  });

  const [editingLesson, setEditingLesson] = useState<{
    isOpen: boolean;
    lesson?: Lesson | null;
    defaultUnitId?: string;
  }>({
    isOpen: false,
    lesson: null,
  });

  // Safety confirmation modal for deletion
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    type: 'subject' | 'unit' | 'lesson';
    id: string;
    title: string;
    progressCount?: number;
    subDetails?: string;
  } | null>(null);

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  const reloadData = async () => {
    if (onRefresh) {
      await onRefresh();
    }
    const fresh = await CohortService.getCurriculumTree();
    setSubjects(fresh);
  };

  // =========================================================================
  // SUBJECT ACTIONS
  // =========================================================================

  const handleSaveSubject = async (name: string, code: string, color: string, semester: string) => {
    try {
      if (editingSubject.subject) {
        await CohortService.updateSubject(editingSubject.subject.id, {
          name,
          code,
          color,
          semester,
        });
        showFeedback('success', `Module "${name}" mis à jour avec succès.`);
      } else {
        await CohortService.createSubject(name, code, color, semester);
        showFeedback('success', `Nouveau module "${name}" créé avec succès.`);
      }
      await reloadData();
    } catch (err: any) {
      showFeedback('error', err?.message || 'Erreur lors de l\'enregistrement du module.');
    }
  };

  const handlePromptDeleteSubject = (subject: SubjectWithUnits) => {
    const lessonCount = subject.units.reduce((acc, u) => acc + u.lessons.length, 0);
    setDeleteConfirmation({
      type: 'subject',
      id: subject.id,
      title: subject.name,
      subDetails: `${subject.units.length} unité(s) et ${lessonCount} cours associés`,
    });
  };

  const handleMoveSubject = async (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= subjects.length) return;

    const reordered = [...subjects];
    const temp = reordered[index];
    reordered[index] = reordered[newIndex];
    reordered[newIndex] = temp;

    setSubjects(reordered);
    await CohortService.reorderSubjects(reordered.map((s) => s.id));
    showFeedback('success', 'Ordre des modules mis à jour.');
  };

  // =========================================================================
  // UNIT ACTIONS
  // =========================================================================

  const handleSaveUnit = async (subjectId: string, title: string) => {
    try {
      if (editingUnit.unit) {
        await CohortService.updateUnit(editingUnit.unit.id, { title });
        showFeedback('success', `Unité "${title}" mise à jour.`);
      } else {
        await CohortService.createUnit(subjectId, title);
        showFeedback('success', `Nouvelle unité "${title}" créée.`);
      }
      await reloadData();
    } catch (err: any) {
      showFeedback('error', err?.message || 'Erreur lors de l\'enregistrement de l\'unité.');
    }
  };

  const handlePromptDeleteUnit = (unit: Unit, lessonCount: number) => {
    setDeleteConfirmation({
      type: 'unit',
      id: unit.id,
      title: unit.title,
      subDetails: `${lessonCount} cours rattaché(s)`,
    });
  };

  const handleMoveUnit = async (subject: SubjectWithUnits, unitIndex: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? unitIndex - 1 : unitIndex + 1;
    if (newIndex < 0 || newIndex >= subject.units.length) return;

    const reorderedUnits = [...subject.units];
    const temp = reorderedUnits[unitIndex];
    reorderedUnits[unitIndex] = reorderedUnits[newIndex];
    reorderedUnits[newIndex] = temp;

    setSubjects((prev) =>
      prev.map((s) => (s.id === subject.id ? { ...s, units: reorderedUnits } : s))
    );

    await CohortService.reorderUnits(subject.id, reorderedUnits.map((u) => u.id));
    showFeedback('success', 'Ordre des unités mis à jour.');
  };

  // =========================================================================
  // LESSON ACTIONS
  // =========================================================================

  const handleSaveLesson = async (data: {
    id?: string;
    unitId: string;
    title: string;
    difficulty: LessonDifficulty;
    durationMin: number;
    revisionTarget: number;
    notes?: string;
  }) => {
    try {
      if (data.id) {
        await CohortService.updateLesson(data.id, {
          title: data.title,
          difficulty: data.difficulty,
          estimated_duration_min: data.durationMin,
          revision_target: data.revisionTarget,
          notes: data.notes,
        });
        showFeedback('success', `Cours "${data.title}" mis à jour (la progression des étudiants reste préservée).`);
      } else {
        await CohortService.createLesson(
          data.unitId,
          data.title,
          data.difficulty,
          data.durationMin,
          data.revisionTarget,
          data.notes
        );
        showFeedback('success', `Nouveau cours "${data.title}" ajouté au cursus.`);
      }
      await reloadData();
    } catch (err: any) {
      showFeedback('error', err?.message || 'Erreur lors de l\'enregistrement du cours.');
    }
  };

  const handlePromptDeleteLesson = async (lesson: Lesson) => {
    const progressCount = await CohortService.checkLessonHasStudentProgress(lesson.id);
    setDeleteConfirmation({
      type: 'lesson',
      id: lesson.id,
      title: lesson.title,
      progressCount,
      subDetails: progressCount > 0
        ? `⚠️ ${progressCount} étudiant(s) ont déjà validé ou révisé ce cours.`
        : 'Aucune progression étudiante enregistrée sur ce cours.',
    });
  };

  const handleMoveLesson = async (unit: Unit, lessonIndex: number, direction: 'up' | 'down') => {
    // Find target unit in subjects
    for (const sub of subjects) {
      const u = sub.units.find((item) => item.id === unit.id);
      if (u) {
        const newIndex = direction === 'up' ? lessonIndex - 1 : lessonIndex + 1;
        if (newIndex < 0 || newIndex >= u.lessons.length) return;

        const reorderedLessons = [...u.lessons];
        const temp = reorderedLessons[lessonIndex];
        reorderedLessons[lessonIndex] = reorderedLessons[newIndex];
        reorderedLessons[newIndex] = temp;

        setSubjects((prev) =>
          prev.map((s) =>
            s.id === sub.id
              ? {
                  ...s,
                  units: s.units.map((unitItem) =>
                    unitItem.id === u.id ? { ...unitItem, lessons: reorderedLessons } : unitItem
                  ),
                }
              : s
          )
        );

        await CohortService.reorderLessons(u.id, reorderedLessons.map((l) => l.id));
        showFeedback('success', 'Ordre des cours mis à jour.');
        break;
      }
    }
  };

  // =========================================================================
  // EXECUTE CONFIRMED DELETE
  // =========================================================================

  const handleConfirmDelete = async () => {
    if (!deleteConfirmation) return;

    try {
      if (deleteConfirmation.type === 'subject') {
        await CohortService.deleteSubject(deleteConfirmation.id);
        showFeedback('success', `Module "${deleteConfirmation.title}" supprimé.`);
      } else if (deleteConfirmation.type === 'unit') {
        await CohortService.deleteUnit(deleteConfirmation.id);
        showFeedback('success', `Unité "${deleteConfirmation.title}" supprimée.`);
      } else if (deleteConfirmation.type === 'lesson') {
        await CohortService.deleteLesson(deleteConfirmation.id);
        showFeedback('success', `Cours "${deleteConfirmation.title}" supprimé.`);
      }
      setDeleteConfirmation(null);
      await reloadData();
    } catch (err: any) {
      showFeedback('error', err?.message || 'Erreur lors de la suppression.');
    }
  };

  // =========================================================================
  // EXPORT TO CSV
  // =========================================================================

  const handleExportCSV = () => {
    const csv = exportCurriculumToCSV(subjects);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `curriculum_medecine_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showFeedback('success', 'Curriculum exporté au format CSV avec succès.');
  };

  // =========================================================================
  // FILTERING & SEARCH
  // =========================================================================

  const filteredSubjects = useMemo(() => {
    return subjects
      .filter((s) => (selectedSemester === 'all' ? true : s.semester === selectedSemester))
      .map((s) => {
        const filteredUnits = s.units.map((u) => {
          const filteredLessons = u.lessons.filter((l) => {
            const matchSearch =
              searchQuery.trim() === '' ||
              s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              u.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
              l.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
              (l.notes && l.notes.toLowerCase().includes(searchQuery.toLowerCase()));

            const matchDiff =
              selectedDifficulty === 'all' || l.difficulty === selectedDifficulty;

            return matchSearch && matchDiff;
          });

          return { ...u, lessons: filteredLessons };
        });

        return {
          ...s,
          units: filteredUnits.filter((u) => u.lessons.length > 0 || searchQuery.trim() === ''),
        };
      })
      .filter((s) => s.units.length > 0 || searchQuery.trim() === '');
  }, [subjects, searchQuery, selectedSemester, selectedDifficulty]);

  // Overall metrics
  const totalUnits = subjects.reduce((acc, s) => acc + s.units.length, 0);
  const totalLessons = subjects.reduce(
    (acc, s) => acc + s.units.reduce((uAcc, u) => uAcc + u.lessons.length, 0),
    0
  );
  const totalMinutes = subjects.reduce(
    (acc, s) =>
      acc +
      s.units.reduce(
        (uAcc, u) => uAcc + u.lessons.reduce((lAcc, l) => lAcc + (l.estimated_duration_min || 60), 0),
        0
      ),
    0
  );
  const totalHours = Math.round(totalMinutes / 60);

  const difficultyColors: Record<LessonDifficulty, string> = {
    Facile: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Moyen: 'bg-sky-50 text-sky-700 border-sky-200',
    Difficile: 'bg-orange-50 text-orange-700 border-orange-200',
    'Très Difficile': 'bg-rose-50 text-rose-700 border-rose-200',
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-teal-800 via-slate-900 to-slate-950 rounded-3xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 border border-teal-400/30 text-teal-200 text-xs font-semibold mb-3">
              <Layers className="w-3.5 h-3.5" />
              Espace Administrateur • Gestionnaire Complet du Cursus
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Gestionnaire du Curriculum Médical
            </h1>
            <p className="text-teal-100/90 text-xs sm:text-sm max-w-2xl mt-1.5 leading-relaxed">
              Créez, modifiez, réorganisez et supprimez en toute sécurité les modules, unités d'enseignement et cours officiels de la cohorte.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-4 gap-3 bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 text-center">
            <div>
              <span className="block text-xl sm:text-2xl font-bold">{subjects.length}</span>
              <span className="text-[10px] text-teal-200 uppercase font-semibold">Modules</span>
            </div>
            <div className="border-l border-white/20 pl-3">
              <span className="block text-xl sm:text-2xl font-bold">{totalUnits}</span>
              <span className="text-[10px] text-teal-200 uppercase font-semibold">Unités</span>
            </div>
            <div className="border-l border-white/20 pl-3">
              <span className="block text-xl sm:text-2xl font-bold text-teal-300">{totalLessons}</span>
              <span className="text-[10px] text-teal-200 uppercase font-semibold">Cours</span>
            </div>
            <div className="border-l border-white/20 pl-3">
              <span className="block text-xl sm:text-2xl font-bold">{totalHours}h</span>
              <span className="text-[10px] text-teal-200 uppercase font-semibold">Volume</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setEditingSubject({ isOpen: true, subject: null })}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nouveau Module
          </button>
          <button
            onClick={() => setEditingUnit({ isOpen: true, unit: null })}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-teal-900 bg-teal-50 hover:bg-teal-100 border border-teal-200 transition-colors"
          >
            <FolderPlus className="w-4 h-4 text-teal-600" />
            Nouvelle Unité
          </button>
          <button
            onClick={() => setEditingLesson({ isOpen: true, lesson: null })}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            <BookOpen className="w-4 h-4 text-slate-600" />
            Ajouter un Cours
          </button>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors"
          title="Exporter l'ensemble du curriculum au format CSV"
        >
          <Download className="w-4 h-4 text-slate-600" />
          Exporter CSV
        </button>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl border text-sm font-semibold flex items-center gap-2 animate-in fade-in ${
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

      {/* Search & Filters */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher par matière, unité, cours ou consigne..."
              className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-teal-500 bg-slate-50/50"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
              >
                Effacer
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-slate-400 hidden sm:block" />
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              className="px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-slate-50 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
            >
              <option value="all">Tous les semestres</option>
              <option value="S1">Semestre 1 (S1)</option>
              <option value="S2">Semestre 2 (S2)</option>
              <option value="Annuel">Annuel</option>
            </select>

            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-slate-50 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
            >
              <option value="all">Toutes difficultés</option>
              <option value="Facile">Facile</option>
              <option value="Moyen">Moyen</option>
              <option value="Difficile">Difficile</option>
              <option value="Très Difficile">Très Difficile</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Hierarchical Tree */}
      <div className="space-y-4">
        {filteredSubjects.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200">
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-800">Aucun élément trouvé</h3>
            <p className="text-xs text-slate-500 mt-1">
              Modifiez votre recherche ou utilisez les boutons ci-dessus pour ajouter des modules et cours.
            </p>
          </div>
        ) : (
          filteredSubjects.map((subject, subIdx) => {
            const isSubExpanded = expandedSubjects[subject.id] ?? true;
            const lessonCount = subject.units.reduce((acc, u) => acc + u.lessons.length, 0);

            return (
              <div
                key={subject.id}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden transition-all"
              >
                {/* Subject Header */}
                <div
                  className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-4 bg-slate-50/60"
                  style={{ borderLeft: `6px solid ${subject.color || '#0d9488'}` }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      onClick={() =>
                        setExpandedSubjects((prev) => ({ ...prev, [subject.id]: !isSubExpanded }))
                      }
                      className="p-1 rounded text-slate-400 hover:text-slate-700 transition-colors"
                      title={isSubExpanded ? 'Réduire le module' : 'Déplier le module'}
                    >
                      {isSubExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                    </button>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono font-bold text-slate-400">#{subIdx + 1}</span>
                        <h2 className="text-base font-bold text-slate-900 truncate">{subject.name}</h2>
                        {subject.code && (
                          <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-200/70 text-slate-700 font-medium">
                            {subject.code}
                          </span>
                        )}
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-teal-100/70 text-teal-800">
                          {subject.semester}
                        </span>
                      </div>
                      <span className="text-xs text-slate-500 block mt-0.5">
                        {subject.units.length} unité(s) • {lessonCount} cours
                      </span>
                    </div>
                  </div>

                  {/* Subject Controls: Reorder, Add Unit, Edit, Delete */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Reorder Arrows */}
                    <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-white">
                      <button
                        disabled={subIdx === 0}
                        onClick={() => handleMoveSubject(subIdx, 'up')}
                        className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-white"
                        title="Monter le module"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        disabled={subIdx === subjects.length - 1}
                        onClick={() => handleMoveSubject(subIdx, 'down')}
                        className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-white border-l border-slate-200"
                        title="Descendre le module"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <button
                      onClick={() => setEditingUnit({ isOpen: true, defaultSubjectId: subject.id, unit: null })}
                      className="hidden sm:flex items-center gap-1 text-xs font-medium text-teal-800 bg-teal-50 hover:bg-teal-100 px-2.5 py-1.5 rounded-lg border border-teal-200 transition-colors"
                      title="Ajouter une unité dans ce module"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Ajouter Unité
                    </button>

                    <button
                      onClick={() => setEditingSubject({ isOpen: true, subject })}
                      className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                      title="Modifier ce module"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handlePromptDeleteSubject(subject)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Supprimer ce module"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Units List */}
                {isSubExpanded && (
                  <div className="divide-y divide-slate-100">
                    {subject.units.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-400 italic">
                        Aucune unité dans ce module.{' '}
                        <button
                          onClick={() => setEditingUnit({ isOpen: true, defaultSubjectId: subject.id, unit: null })}
                          className="text-teal-700 font-semibold underline not-italic hover:text-teal-900"
                        >
                          Créer la première unité
                        </button>
                      </div>
                    ) : (
                      subject.units.map((unit, unitIdx) => {
                        const isUnitExpanded = expandedUnits[unit.id] ?? true;

                        return (
                          <div key={unit.id} className="p-4 sm:p-5">
                            {/* Unit Title Bar */}
                            <div className="flex items-center justify-between gap-3 mb-3 bg-slate-50/40 p-2.5 rounded-xl border border-slate-100">
                              <div className="flex items-center gap-2 min-w-0">
                                <button
                                  onClick={() =>
                                    setExpandedUnits((prev) => ({ ...prev, [unit.id]: !isUnitExpanded }))
                                  }
                                  className="p-1 text-slate-400 hover:text-slate-700"
                                >
                                  {isUnitExpanded ? (
                                    <ChevronDown className="w-4 h-4" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4" />
                                  )}
                                </button>
                                <span className="text-xs font-mono font-semibold text-slate-400">
                                  {subIdx + 1}.{unitIdx + 1}
                                </span>
                                <h3 className="font-semibold text-sm text-slate-800 truncate">
                                  {unit.title}
                                </h3>
                                <span className="text-xs text-slate-400 shrink-0">
                                  ({unit.lessons.length} cours)
                                </span>
                              </div>

                              {/* Unit Controls: Reorder, Add Lesson, Edit, Delete */}
                              <div className="flex items-center gap-1 shrink-0">
                                <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-white">
                                  <button
                                    disabled={unitIdx === 0}
                                    onClick={() => handleMoveUnit(subject, unitIdx, 'up')}
                                    className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-white"
                                    title="Monter l'unité"
                                  >
                                    <ArrowUp className="w-3 h-3" />
                                  </button>
                                  <button
                                    disabled={unitIdx === subject.units.length - 1}
                                    onClick={() => handleMoveUnit(subject, unitIdx, 'down')}
                                    className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-white border-l border-slate-200"
                                    title="Descendre l'unité"
                                  >
                                    <ArrowDown className="w-3 h-3" />
                                  </button>
                                </div>

                                <button
                                  onClick={() =>
                                    setEditingLesson({
                                      isOpen: true,
                                      defaultUnitId: unit.id,
                                      lesson: null,
                                    })
                                  }
                                  className="flex items-center gap-1 text-[11px] font-medium text-teal-800 bg-teal-50 hover:bg-teal-100 px-2 py-1 rounded-lg border border-teal-200 transition-colors"
                                  title="Ajouter un cours dans cette unité"
                                >
                                  <Plus className="w-3 h-3" />
                                  <span className="hidden sm:inline">Cours</span>
                                </button>

                                <button
                                  onClick={() => setEditingUnit({ isOpen: true, unit })}
                                  className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100"
                                  title="Modifier le titre de l'unité"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  onClick={() => handlePromptDeleteUnit(unit, unit.lessons.length)}
                                  className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50"
                                  title="Supprimer cette unité"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Lessons inside unit */}
                            {isUnitExpanded && (
                              <div className="space-y-2 pl-2 sm:pl-6">
                                {unit.lessons.length === 0 ? (
                                  <p className="text-xs text-slate-400 italic py-2">
                                    Aucun cours dans cette unité.{' '}
                                    <button
                                      onClick={() =>
                                        setEditingLesson({
                                          isOpen: true,
                                          defaultUnitId: unit.id,
                                          lesson: null,
                                        })
                                      }
                                      className="text-teal-700 font-semibold underline not-italic hover:text-teal-900"
                                    >
                                      Ajouter le premier cours
                                    </button>
                                  </p>
                                ) : (
                                  unit.lessons.map((lesson, lesIdx) => (
                                    <div
                                      key={lesson.id}
                                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border border-slate-200/80 bg-white hover:border-slate-300 transition-all shadow-2xs"
                                    >
                                      {/* Left Details */}
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap mb-1">
                                          <span className="text-xs font-mono text-slate-400">
                                            #{lesIdx + 1}
                                          </span>
                                          <h4 className="font-semibold text-sm text-slate-900 truncate">
                                            {lesson.title}
                                          </h4>
                                          <span
                                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                                              difficultyColors[lesson.difficulty]
                                            }`}
                                          >
                                            {lesson.difficulty}
                                          </span>
                                          <span className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                                            <Clock className="w-3 h-3 text-slate-400" />
                                            {lesson.estimated_duration_min} min
                                          </span>
                                          <span className="flex items-center gap-1 text-[11px] text-teal-800 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200 font-medium">
                                            <RotateCw className="w-3 h-3 text-teal-600" />
                                            Cible: {lesson.revision_target || 3} tours
                                          </span>
                                        </div>
                                        {lesson.notes && (
                                          <p className="text-xs text-slate-500 line-clamp-1 pl-4 border-l border-slate-200">
                                            {lesson.notes}
                                          </p>
                                        )}
                                      </div>

                                      {/* Right Controls: Reorder, Edit, Delete */}
                                      <div className="flex items-center gap-1 justify-end shrink-0">
                                        {/* Reorder Arrows */}
                                        <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                                          <button
                                            disabled={lesIdx === 0}
                                            onClick={() => handleMoveLesson(unit, lesIdx, 'up')}
                                            className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 disabled:opacity-30 disabled:hover:bg-slate-50"
                                            title="Monter le cours"
                                          >
                                            <ArrowUp className="w-3 h-3" />
                                          </button>
                                          <button
                                            disabled={lesIdx === unit.lessons.length - 1}
                                            onClick={() => handleMoveLesson(unit, lesIdx, 'down')}
                                            className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 disabled:opacity-30 disabled:hover:bg-slate-50 border-l border-slate-200"
                                            title="Descendre le cours"
                                          >
                                            <ArrowDown className="w-3 h-3" />
                                          </button>
                                        </div>

                                        <button
                                          onClick={() =>
                                            setEditingLesson({
                                              isOpen: true,
                                              lesson,
                                              defaultUnitId: unit.id,
                                            })
                                          }
                                          className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
                                          title="Modifier ce cours"
                                        >
                                          <Edit2 className="w-3.5 h-3.5" />
                                        </button>

                                        <button
                                          onClick={() => handlePromptDeleteLesson(lesson)}
                                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                                          title="Supprimer ce cours"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Safety Deletion Confirmation Modal */}
      {deleteConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-lg font-bold text-slate-900">
                Confirmer la suppression
              </h3>
              <p className="text-xs text-slate-600">
                Vous êtes sur le point de supprimer :{' '}
                <strong className="text-slate-900 block mt-1 font-semibold">
                  "{deleteConfirmation.title}"
                </strong>
              </p>
              {deleteConfirmation.subDetails && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 text-left">
                  {deleteConfirmation.subDetails}
                </div>
              )}
            </div>

            <div className="p-3 bg-slate-50 rounded-xl text-[11px] text-slate-500 flex items-start gap-2">
              <HelpCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <span>
                Conseil : Si vous souhaitez seulement corriger l'intitulé ou la difficulté sans perturber le programme, préférez le bouton "Modifier".
              </span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmation(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors"
              >
                Confirmer la suppression
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Subject Create / Edit Modal */}
      {editingSubject.isOpen && (
        <SubjectCreateModal
          isOpen={editingSubject.isOpen}
          initialSubject={editingSubject.subject}
          onClose={() => setEditingSubject({ isOpen: false, subject: null })}
          onSave={handleSaveSubject}
        />
      )}

      {/* Unit Create / Edit Modal */}
      {editingUnit.isOpen && (
        <UnitCreateModal
          isOpen={editingUnit.isOpen}
          subjects={subjects}
          defaultSubjectId={editingUnit.defaultSubjectId}
          initialUnit={editingUnit.unit}
          onClose={() => setEditingUnit({ isOpen: false, unit: null })}
          onSave={handleSaveUnit}
        />
      )}

      {/* Lesson Create / Edit Modal */}
      {editingLesson.isOpen && (
        <LessonEditModal
          isOpen={editingLesson.isOpen}
          subjects={subjects}
          initialLesson={editingLesson.lesson}
          defaultUnitId={editingLesson.defaultUnitId}
          onClose={() => setEditingLesson({ isOpen: false, lesson: null })}
          onSave={handleSaveLesson}
        />
      )}
    </div>
  );
}
