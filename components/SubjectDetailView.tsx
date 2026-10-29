'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  SubjectWithUnits,
  LessonStatus,
  LessonDifficulty,
  Lesson,
} from '@/lib/types/database';
import { useAuth } from '@/lib/context/auth-context';
import { CohortService } from '@/lib/services/cohort-service';
import { RevisionModal } from '@/components/RevisionModal';
import {
  ArrowLeft,
  Search,
  BookOpen,
  Clock,
  CheckCircle2,
  AlertCircle,
  RotateCw,
  ChevronDown,
} from 'lucide-react';

interface SubjectDetailViewProps {
  initialSubject: SubjectWithUnits;
  onRefresh?: () => Promise<void>;
}

export function SubjectDetailView({ initialSubject, onRefresh }: SubjectDetailViewProps) {
  const { user } = useAuth();
  const [subject, setSubject] = useState<SubjectWithUnits>(initialSubject);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');

  // Modal state for revision recording
  const [revisionLesson, setRevisionLesson] = useState<Lesson | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Status mapping
  const statusLabels: Record<LessonStatus, { label: string; bg: string; text: string; border: string }> = {
    not_started: { label: 'Non commencé', bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200' },
    in_progress: { label: 'En cours', bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200' },
    completed: { label: 'Validé', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    needs_revision: { label: 'À réviser', bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200' },
  };

  const difficultyColors: Record<LessonDifficulty, string> = {
    Facile: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Moyen: 'bg-sky-50 text-sky-700 border-sky-200',
    Difficile: 'bg-orange-50 text-orange-700 border-orange-200',
    'Très Difficile': 'bg-rose-50 text-rose-700 border-rose-200',
  };

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 3500);
  };

  // Status change handler
  const handleStatusChange = async (lessonId: string, newStatus: LessonStatus) => {
    try {
      await CohortService.updateStudentProgress(user?.id || 'demo-student-id', lessonId, newStatus);
      setSubject((prev) => ({
        ...prev,
        units: prev.units.map((u) => ({
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
      }));
      showFeedback('success', `Statut mis à jour : ${statusLabels[newStatus].label}`);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      showFeedback('error', err?.message || 'Erreur lors de la mise à jour');
    }
  };

  // Revision save handler
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
      // Automatically refresh subject tree to reflect new progress
      const fresh = await CohortService.getSubjectById(subject.id, user?.id);
      if (fresh) setSubject(fresh);
      showFeedback('success', 'Séance de révision enregistrée avec succès.');
      if (onRefresh) onRefresh();
    } catch (err: any) {
      showFeedback('error', err?.message || "Erreur lors de l'enregistrement de la séance");
    }
  };

  // Calculate subject progress metrics
  let totalLessons = 0;
  let completedCount = 0;
  let inProgressCount = 0;
  let needsRevisionCount = 0;
  let totalMinutes = 0;

  subject.units.forEach((u) => {
    u.lessons.forEach((l) => {
      totalLessons++;
      totalMinutes += l.estimated_duration_min || 60;
      const st = l.progress?.status || 'not_started';
      if (st === 'completed') completedCount++;
      else if (st === 'in_progress') inProgressCount++;
      else if (st === 'needs_revision') needsRevisionCount++;
    });
  });

  const percentCompleted = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
  const totalHours = (totalMinutes / 60).toFixed(1);

  // Filtered units & lessons
  const filteredUnits = useMemo(() => {
    return subject.units
      .map((u) => {
        const filteredLessons = u.lessons.filter((l) => {
          const matchQuery =
            searchQuery.trim() === '' ||
            l.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (l.notes && l.notes.toLowerCase().includes(searchQuery.toLowerCase()));

          const status = l.progress?.status || 'not_started';
          const matchStatus = selectedStatus === 'all' || status === selectedStatus;
          const matchDifficulty = selectedDifficulty === 'all' || l.difficulty === selectedDifficulty;

          return matchQuery && matchStatus && matchDifficulty;
        });

        return {
          ...u,
          lessons: filteredLessons,
        };
      })
      .filter((u) => u.lessons.length > 0 || searchQuery.trim() === '');
  }, [subject, searchQuery, selectedStatus, selectedDifficulty]);

  return (
    <div className="space-y-6">
      {/* Breadcrumb / Back link */}
      <div className="flex items-center justify-between">
        <Link
          href="/student"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour au Tableau de bord
        </Link>
        <span className="text-xs text-slate-400 font-medium">
          Promotion DFGSM 2 • {subject.semester || 'S1'}
        </span>
      </div>

      {/* Subject Header Banner */}
      <div
        className="rounded-3xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${subject.color || '#0d9488'}ee 0%, #0f172a 100%)`,
        }}
      >
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-md bg-white/20 backdrop-blur-md text-white font-mono text-xs font-bold uppercase tracking-wider border border-white/20">
                {subject.code || 'MED'}
              </span>
              <span className="px-2.5 py-0.5 rounded-md bg-white/10 text-teal-100 text-xs font-semibold">
                {subject.semester || 'Semestre 1'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {subject.name}
            </h1>
            <p className="text-xs sm:text-sm text-slate-200 max-w-xl leading-relaxed">
              Consultez les unités d'enseignement, validez votre avancement pas-à-pas et consignez vos révisions personnelles.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/15 shrink-0">
            <div className="text-center px-2">
              <span className="block text-2xl font-bold">{percentCompleted}%</span>
              <span className="text-[10px] text-teal-200 font-semibold uppercase">Validé</span>
            </div>
            <div className="border-l border-white/20 pl-4 text-center">
              <span className="block text-2xl font-bold">{completedCount}/{totalLessons}</span>
              <span className="text-[10px] text-teal-200 font-semibold uppercase">Cours</span>
            </div>
            <div className="border-l border-white/20 pl-4 text-center">
              <span className="block text-2xl font-bold">{totalHours}h</span>
              <span className="text-[10px] text-teal-200 font-semibold uppercase">Volume</span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-6 pt-4 border-t border-white/15">
          <div className="h-2 w-full bg-black/20 rounded-full overflow-hidden flex">
            <div
              className="bg-emerald-400 h-full transition-all duration-300"
              style={{ width: `${percentCompleted}%` }}
              title={`Validé : ${completedCount}`}
            />
            <div
              className="bg-sky-400 h-full transition-all duration-300"
              style={{ width: `${totalLessons > 0 ? (inProgressCount / totalLessons) * 100 : 0}%` }}
              title={`En cours : ${inProgressCount}`}
            />
            <div
              className="bg-amber-400 h-full transition-all duration-300"
              style={{ width: `${totalLessons > 0 ? (needsRevisionCount / totalLessons) * 100 : 0}%` }}
              title={`À réviser : ${needsRevisionCount}`}
            />
          </div>
        </div>
      </div>

      {/* Toast Feedback */}
      {feedback && (
        <div
          className={`p-3.5 rounded-2xl border text-xs font-semibold flex items-center gap-2 animate-in fade-in ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-rose-50 text-rose-900 border-rose-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher un cours dans ce module..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Status filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700"
          >
            <option value="all">Tous les statuts</option>
            <option value="completed">Validés uniquement</option>
            <option value="in_progress">En cours uniquement</option>
            <option value="needs_revision">À réviser uniquement</option>
            <option value="not_started">Non commencés</option>
          </select>

          {/* Difficulty filter */}
          <select
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700"
          >
            <option value="all">Toutes difficultés</option>
            <option value="Facile">Facile</option>
            <option value="Moyen">Moyen</option>
            <option value="Difficile">Difficile</option>
            <option value="Très Difficile">Très Difficile</option>
          </select>
        </div>
      </div>

      {/* Units & Lessons Hierarchy */}
      <div className="space-y-4">
        {filteredUnits.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 border border-slate-200 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
              <BookOpen className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-800 text-base">Aucun cours trouvé</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Aucun cours ne correspond aux filtres appliqués.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedStatus('all');
                setSelectedDifficulty('all');
              }}
              className="text-xs font-semibold text-teal-600 hover:underline"
            >
              Réinitialiser les filtres
            </button>
          </div>
        ) : (
          filteredUnits.map((unit, unitIdx) => (
            <div
              key={unit.id}
              className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs"
            >
              {/* Unit Header */}
              <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-lg bg-teal-100 text-teal-800 text-xs font-bold flex items-center justify-center shrink-0">
                    {unitIdx + 1}
                  </span>
                  <h3 className="text-sm font-bold text-slate-900">
                    {unit.title}
                  </h3>
                </div>
                <span className="text-[11px] font-semibold text-slate-500 bg-white px-2.5 py-0.5 rounded-full border border-slate-200">
                  {unit.lessons.length} cours
                </span>
              </div>

              {/* Lessons List in exact display order */}
              <div className="divide-y divide-slate-100">
                {unit.lessons.length === 0 ? (
                  <div className="p-4 text-xs text-slate-400 text-center italic">
                    Aucun cours disponible dans cette unité.
                  </div>
                ) : (
                  unit.lessons.map((lesson, lesIdx) => {
                    const currentStatus: LessonStatus = lesson.progress?.status || 'not_started';
                    const st = statusLabels[currentStatus];

                    return (
                      <div
                        key={lesson.id}
                        className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors"
                      >
                        {/* Lesson Info */}
                        <div className="flex items-start gap-3 flex-1">
                          <span className="text-xs font-bold text-slate-400 mt-0.5 w-5 shrink-0">
                            {lesIdx + 1}.
                          </span>
                          <div className="space-y-1">
                            <h4 className="text-sm font-semibold text-slate-900 leading-snug">
                              {lesson.title}
                            </h4>

                            <div className="flex items-center gap-2 flex-wrap text-xs">
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                                  difficultyColors[lesson.difficulty]
                                }`}
                              >
                                {lesson.difficulty}
                              </span>

                              <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                                <Clock className="w-3 h-3 text-slate-400" />
                                {lesson.estimated_duration_min || 60} min
                              </span>

                              <span className="text-[11px] font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                                🎯 Cible : {lesson.revision_target || 3} tours
                              </span>

                              {lesson.notes && (
                                <span className="text-[11px] text-slate-500 italic max-w-xs truncate" title={lesson.notes}>
                                  💡 {lesson.notes}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Student Actions */}
                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto flex-wrap">
                          {/* Status Picker */}
                          <div className="relative">
                            <select
                              value={currentStatus}
                              onChange={(e) => handleStatusChange(lesson.id, e.target.value as LessonStatus)}
                              className={`text-xs font-bold px-3 py-1.5 rounded-xl border appearance-none pr-7 cursor-pointer transition-colors shadow-2xs ${st.bg} ${st.text} ${st.border}`}
                            >
                              <option value="not_started">Non commencé</option>
                              <option value="in_progress">En cours</option>
                              <option value="completed">Validé</option>
                              <option value="needs_revision">À réviser</option>
                            </select>
                            <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                          </div>

                          {/* Quick Revision Logger */}
                          <button
                            onClick={() => setRevisionLesson(lesson)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 shadow-2xs transition-colors"
                          >
                            <RotateCw className="w-3 h-3" />
                            Réviser
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Revision Modal */}
      {revisionLesson && (
        <RevisionModal
          isOpen={Boolean(revisionLesson)}
          lesson={revisionLesson}
          subjectName={subject.name}
          onClose={() => setRevisionLesson(null)}
          onSave={handleSaveRevision}
        />
      )}
    </div>
  );
}
