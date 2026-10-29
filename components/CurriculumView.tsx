'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  SubjectWithUnits,
  LessonDifficulty,
  LessonStatus,
  Lesson,
} from '@/lib/types/database';
import { useAuth } from '@/lib/context/auth-context';
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
  Flame,
  BookmarkPlus,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { RevisionModal } from './RevisionModal';
import { LessonEditModal } from './LessonEditModal';
import { SubjectCreateModal } from './SubjectCreateModal';
import { UnitCreateModal } from './UnitCreateModal';
import { CohortService } from '@/lib/services/cohort-service';

interface CurriculumViewProps {
  initialSubjects: SubjectWithUnits[];
}

export function CurriculumView({ initialSubjects }: CurriculumViewProps) {
  const { role, user } = useAuth();
  const [subjects, setSubjects] = useState<SubjectWithUnits[]>(initialSubjects);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [expandedUnits, setExpandedUnits] = useState<Record<string, boolean>>(() => {
    // Expand first few units by default
    const map: Record<string, boolean> = {};
    initialSubjects.forEach((s) => s.units.forEach((u) => (map[u.id] = true)));
    return map;
  });

  // Modal states
  const [revisionLesson, setRevisionLesson] = useState<{ lesson: Lesson; subjectName: string } | null>(null);
  const [editingLesson, setEditingLesson] = useState<{ lesson: Lesson | null; defaultUnitId?: string } | null>(null);
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);

  // Status mapping
  const statusLabels: Record<LessonStatus, { label: string; bg: string; text: string; border: string }> = {
    not_started: { label: 'Non commencé', bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200' },
    in_progress: { label: 'En cours', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    completed: { label: 'Validé', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    needs_revision: { label: 'À réviser', bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200' },
  };

  const difficultyColors: Record<LessonDifficulty, string> = {
    Facile: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Moyen: 'bg-sky-50 text-sky-700 border-sky-200',
    Difficile: 'bg-orange-50 text-orange-700 border-orange-200',
    'Très Difficile': 'bg-rose-50 text-rose-700 border-rose-200',
  };

  const toggleUnit = (unitId: string) => {
    setExpandedUnits((prev) => ({ ...prev, [unitId]: !prev[unitId] }));
  };

  // Handlers for Student
  const handleStatusChange = async (lessonId: string, newStatus: LessonStatus) => {
    try {
      await CohortService.updateStudentProgress(user?.id || 'demo-student-id', lessonId, newStatus);
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
    } catch (err) {
      console.error(err);
    }
  };

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
    // Refresh tree
    const updated = await CohortService.getCurriculumTree(user?.id);
    setSubjects(updated);
  };

  // Handlers for Admin
  const handleSaveLesson = async (data: {
    id?: string;
    unitId: string;
    title: string;
    difficulty: LessonDifficulty;
    durationMin: number;
    revisionTarget?: number;
    notes?: string;
  }) => {
    if (data.id) {
      await CohortService.updateLesson(data.id, {
        title: data.title,
        difficulty: data.difficulty,
        estimated_duration_min: data.durationMin,
        revision_target: data.revisionTarget || 3,
        notes: data.notes,
      });
    } else {
      await CohortService.createLesson(
        data.unitId,
        data.title,
        data.difficulty,
        data.durationMin,
        data.revisionTarget || 3,
        data.notes
      );
    }
    const updated = await CohortService.getCurriculumTree(user?.id);
    setSubjects(updated);
  };

  const handleDeleteLesson = async (lessonId: string) => {
    if (confirm('Voulez-vous supprimer ce cours du programme partagé ?')) {
      await CohortService.deleteLesson(lessonId);
      const updated = await CohortService.getCurriculumTree(user?.id);
      setSubjects(updated);
    }
  };

  const handleCreateSubject = async (name: string, code: string, color: string, semester: string) => {
    await CohortService.createSubject(name, code, color, semester);
    const updated = await CohortService.getCurriculumTree(user?.id);
    setSubjects(updated);
  };

  const handleCreateUnit = async (subjectId: string, title: string) => {
    await CohortService.createUnit(subjectId, title);
    const updated = await CohortService.getCurriculumTree(user?.id);
    setSubjects(updated);
  };

  const handleDeleteSubject = async (subjectId: string, subjectName: string) => {
    if (confirm(`Confirmez-vous la suppression du module "${subjectName}" et de toutes ses unités ?`)) {
      await CohortService.deleteSubject(subjectId);
      const updated = await CohortService.getCurriculumTree(user?.id);
      setSubjects(updated);
    }
  };

  // Filtering
  const filteredSubjects = subjects
    .filter((s) => (selectedSubjectId === 'all' ? true : s.id === selectedSubjectId))
    .map((s) => {
      const filteredUnits = s.units.map((u) => {
        const filteredLessons = u.lessons.filter((l) => {
          const matchQuery =
            searchQuery.trim() === '' ||
            l.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (l.notes && l.notes.toLowerCase().includes(searchQuery.toLowerCase()));
          const matchDifficulty =
            selectedDifficulty === 'all' || l.difficulty === selectedDifficulty;
          return matchQuery && matchDifficulty;
        });
        return { ...u, lessons: filteredLessons };
      });
      return {
        ...s,
        units: filteredUnits.filter((u) => u.lessons.length > 0 || searchQuery.trim() === ''),
      };
    });

  // Calculate cohort completion summary
  let totalLessons = 0;
  let completedCount = 0;
  subjects.forEach((s) =>
    s.units.forEach((u) =>
      u.lessons.forEach((l) => {
        totalLessons++;
        if (l.progress?.status === 'completed') completedCount++;
      })
    )
  );
  const completionPercentage = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Top Banner & Stats */}
      <div className="bg-gradient-to-r from-teal-700 via-teal-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-teal-500/20 to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 border border-teal-400/30 text-teal-200 text-xs font-semibold mb-3">
              <Layers className="w-3.5 h-3.5" />
              Programme Médical Partagé • Promotion 2026-2027
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Curriculum & Référentiel des Cours
            </h1>
            <p className="text-teal-100/90 text-sm max-w-2xl mt-1.5 leading-relaxed">
              Consultez l'ensemble des modules, unités d'enseignement et cours définis pour notre cohorte.
              {role === 'student'
                ? ' Marquez votre avancement personnel sans impacter le programme de vos camarades.'
                : ' En tant que délégué admin, vous pilotez le programme officiel de la promotion.'}
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15">
            <div className="text-center">
              <span className="block text-2xl font-bold">{totalLessons}</span>
              <span className="text-[11px] text-teal-200 uppercase font-semibold">Cours Total</span>
            </div>
            <div className="w-px h-8 bg-white/20" />
            <div className="text-center">
              <span className="block text-2xl font-bold">{subjects.length}</span>
              <span className="text-[11px] text-teal-200 uppercase font-semibold">Modules</span>
            </div>
            {role === 'student' && (
              <>
                <div className="w-px h-8 bg-white/20" />
                <div className="text-center">
                  <span className="block text-2xl font-bold text-emerald-300">{completionPercentage}%</span>
                  <span className="text-[11px] text-teal-200 uppercase font-semibold">Validé</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Admin Action Bar */}
      {role === 'admin' && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-teal-50/80 border border-teal-200 rounded-2xl">
          <div className="flex items-center gap-2 text-teal-950 font-semibold text-sm">
            <Flame className="w-4 h-4 text-teal-600" />
            <span>Outils d'édition de la promotion (Délégué Admin)</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSubjectModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-teal-800 border border-teal-300 shadow-xs hover:bg-teal-100/50 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Nouveau Module
            </button>
            <button
              onClick={() => setIsUnitModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-teal-800 border border-teal-300 shadow-xs hover:bg-teal-100/50 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Nouvelle Unité
            </button>
            <button
              onClick={() => setEditingLesson({ lesson: null })}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-teal-700 text-white shadow-xs hover:bg-teal-800 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Ajouter un Cours
            </button>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Search box */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher un cours, mot-clé, pathologie (ex: AVC, Asthme, Insuffisance)..."
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

          {/* Difficulty filter */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-slate-400 hidden sm:block" />
            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-slate-50 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
            >
              <option value="all">Toutes difficultés</option>
              <option value="Facile">Facile</option>
              <option value="Moyen">Moyen</option>
              <option value="Difficile">Difficile</option>
              <option value="Très Difficile">Très Difficile</option>
            </select>
          </div>
        </div>

        {/* Subject tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 no-scrollbar">
          <button
            onClick={() => setSelectedSubjectId('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
              selectedSubjectId === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Tous les modules ({subjects.length})
          </button>
          {subjects.map((sub) => {
            const isSelected = selectedSubjectId === sub.id;
            return (
              <button
                key={sub.id}
                onClick={() => setSelectedSubjectId(sub.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${
                  isSelected
                    ? 'text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
                style={isSelected ? { backgroundColor: sub.color || '#0d9488' } : {}}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: isSelected ? '#ffffff' : sub.color }}
                />
                <span>{sub.name}</span>
                <span className="text-[10px] opacity-75">
                  ({sub.units.reduce((acc, u) => acc + u.lessons.length, 0)})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Curriculum Subject Cards */}
      <div className="space-y-6">
        {filteredSubjects.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-8">
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-800">Aucun cours trouvé</h3>
            <p className="text-xs text-slate-500 mt-1">
              Essayez de modifier votre recherche ou vos filtres.
            </p>
          </div>
        ) : (
          filteredSubjects.map((subject) => (
            <div
              key={subject.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden"
            >
              {/* Subject Header */}
              <div
                className="px-6 py-4 border-b border-slate-100 flex items-center justify-between"
                style={{ borderLeft: `6px solid ${subject.color || '#0d9488'}` }}
              >
                <div className="flex items-center gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-slate-900">{subject.name}</h2>
                      {subject.code && (
                        <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                          {subject.code}
                        </span>
                      )}
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-teal-50 text-teal-700">
                        {subject.semester}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500 mt-0.5 block">
                      {subject.units.length} unités •{' '}
                      {subject.units.reduce((acc, u) => acc + u.lessons.length, 0)} cours au programme
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/student/subjects/${subject.id}`}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-xl border border-teal-200 transition-colors shadow-2xs"
                  >
                    <span>Fiche Module</span>
                    <ArrowRight className="w-3.5 h-3.5 text-teal-600" />
                  </Link>

                  {role === 'admin' && (
                    <>
                      <button
                        onClick={() => handleCreateUnit(subject.id, 'Nouvelle Unité')}
                        className="text-xs font-medium text-teal-700 hover:text-teal-900 px-2 py-1 rounded hover:bg-teal-50"
                      >
                        + Ajouter unité
                      </button>
                      <button
                        onClick={() => handleDeleteSubject(subject.id, subject.name)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors"
                        title="Supprimer ce module"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Units & Lessons */}
              <div className="divide-y divide-slate-100">
                {subject.units.map((unit) => {
                  const isExpanded = expandedUnits[unit.id] ?? true;
                  return (
                    <div key={unit.id} className="p-4 sm:p-5">
                      {/* Unit Title Bar */}
                      <div className="flex items-center justify-between mb-3">
                        <button
                          onClick={() => toggleUnit(unit.id)}
                          className="flex items-center gap-2 text-left group"
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-700" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700" />
                          )}
                          <h3 className="font-semibold text-sm text-slate-800 group-hover:text-teal-700 transition-colors">
                            {unit.title}
                          </h3>
                          <span className="text-xs text-slate-400">
                            ({unit.lessons.length} cours)
                          </span>
                        </button>

                        {role === 'admin' && (
                          <button
                            onClick={() =>
                              setEditingLesson({ lesson: null, defaultUnitId: unit.id })
                            }
                            className="flex items-center gap-1 text-xs text-teal-700 hover:text-teal-900 font-medium px-2 py-1 rounded hover:bg-teal-50"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Ajouter cours
                          </button>
                        )}
                      </div>

                      {/* Lessons List */}
                      {isExpanded && (
                        <div className="space-y-2.5 pl-2 sm:pl-6">
                          {unit.lessons.length === 0 ? (
                            <p className="text-xs text-slate-400 italic py-2">
                              Aucun cours dans cette unité pour le moment.
                            </p>
                          ) : (
                            unit.lessons.map((lesson) => {
                              const currentStatus: LessonStatus =
                                lesson.progress?.status || 'not_started';
                              const statusStyle = statusLabels[currentStatus];

                              return (
                                <div
                                  key={lesson.id}
                                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-slate-200/80 bg-white hover:border-slate-300 transition-all shadow-2xs"
                                >
                                  {/* Left Details */}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap mb-1">
                                      <h4 className="font-medium text-sm text-slate-900 truncate">
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
                                    </div>
                                    {lesson.notes && (
                                      <p className="text-xs text-slate-500 line-clamp-1">
                                        {lesson.notes}
                                      </p>
                                    )}
                                  </div>

                                  {/* Right Controls */}
                                  <div className="flex items-center gap-2 justify-end">
                                    {/* Student Progress selector */}
                                    <select
                                      value={currentStatus}
                                      onChange={(e) =>
                                        handleStatusChange(lesson.id, e.target.value as LessonStatus)
                                      }
                                      className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border} focus:outline-hidden cursor-pointer`}
                                    >
                                      <option value="not_started">Non commencé</option>
                                      <option value="in_progress">En cours</option>
                                      <option value="completed">Validé</option>
                                      <option value="needs_revision">À réviser</option>
                                    </select>

                                    {/* Student Revision Log Button */}
                                    <button
                                      onClick={() =>
                                        setRevisionLesson({
                                          lesson,
                                          subjectName: subject.name,
                                        })
                                      }
                                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 transition-colors"
                                      title="Enregistrer une séance de travail sur ce cours"
                                    >
                                      <BookmarkPlus className="w-3.5 h-3.5" />
                                      <span className="hidden sm:inline">Révision</span>
                                    </button>

                                    {/* Admin Controls */}
                                    {role === 'admin' && (
                                      <div className="flex items-center border-l border-slate-200 pl-2 gap-1">
                                        <button
                                          onClick={() =>
                                            setEditingLesson({ lesson, defaultUnitId: unit.id })
                                          }
                                          className="p-1.5 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100"
                                          title="Modifier ce cours"
                                        >
                                          <Edit2 className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          onClick={() => handleDeleteLesson(lesson.id)}
                                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50"
                                          title="Supprimer du curriculum"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Revision Modal */}
      {revisionLesson && (
        <RevisionModal
          isOpen={Boolean(revisionLesson)}
          onClose={() => setRevisionLesson(null)}
          lesson={revisionLesson.lesson}
          subjectName={revisionLesson.subjectName}
          onSave={handleSaveRevision}
        />
      )}

      {/* Lesson Edit/Create Modal (Admin) */}
      {editingLesson && (
        <LessonEditModal
          isOpen={Boolean(editingLesson)}
          onClose={() => setEditingLesson(null)}
          subjects={subjects}
          initialLesson={editingLesson.lesson}
          defaultUnitId={editingLesson.defaultUnitId}
          onSave={handleSaveLesson}
        />
      )}

      {/* Subject Create Modal (Admin) */}
      <SubjectCreateModal
        isOpen={isSubjectModalOpen}
        onClose={() => setIsSubjectModalOpen(false)}
        onSave={handleCreateSubject}
      />

      {/* Unit Create Modal (Admin) */}
      <UnitCreateModal
        isOpen={isUnitModalOpen}
        onClose={() => setIsUnitModalOpen(false)}
        subjects={subjects}
        onSave={handleCreateUnit}
      />
    </div>
  );
}
