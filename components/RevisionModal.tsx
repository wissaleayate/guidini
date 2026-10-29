'use client';

import React, { useState, useEffect } from 'react';
import { X, Clock, Award, FileText, CheckCircle, Calendar, Lock, BookOpen } from 'lucide-react';
import { Lesson, SubjectWithUnits } from '@/lib/types/database';

interface RevisionModalProps {
  lesson?: Lesson | null;
  subjectName?: string;
  availableSubjects?: SubjectWithUnits[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    lessonId: string,
    durationMin: number,
    sessionType: string,
    confidenceRating: number,
    notes: string,
    sessionDate?: string
  ) => Promise<void>;
}

const SESSION_TYPES = [
  'Tour 1 • Lecture active & Compréhension',
  'Tour 2 • Fiche de synthèse & Schémas',
  'Tour 3 • QCM & Cas Cliniques (Annales)',
  'Tour 4 • Flashcards / Répétition espacée (Anki)',
  'Tour 5+ • Révision transversale / Groupe oral',
];

export function RevisionModal({
  lesson: initialLesson,
  subjectName: initialSubjectName,
  availableSubjects = [],
  isOpen,
  onClose,
  onSave,
}: RevisionModalProps) {
  // Today's date as YYYY-MM-DD
  const todayStr = new Date().toISOString().split('T')[0];

  const [selectedLessonId, setSelectedLessonId] = useState<string>(initialLesson?.id || '');
  const [selectedSubjectName, setSelectedSubjectName] = useState<string>(initialSubjectName || '');
  const [sessionDate, setSessionDate] = useState<string>(todayStr);
  const [durationMin, setDurationMin] = useState<number>(45);
  const [sessionType, setSessionType] = useState<string>(SESSION_TYPES[0]);
  const [confidenceRating, setConfidenceRating] = useState<number>(3);
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialLesson) {
      setSelectedLessonId(initialLesson.id);
      setSelectedSubjectName(initialSubjectName || '');
    } else if (availableSubjects.length > 0 && !selectedLessonId) {
      const firstSub = availableSubjects[0];
      const firstUnit = firstSub.units[0];
      const firstLes = firstUnit?.lessons[0];
      if (firstLes) {
        setSelectedLessonId(firstLes.id);
        setSelectedSubjectName(firstSub.name);
      }
    }
  }, [initialLesson, initialSubjectName, availableSubjects, selectedLessonId]);

  if (!isOpen) return null;

  // Flatten lessons for selector if no lesson was passed upfront
  const allLessonsList: { id: string; title: string; subject: string }[] = [];
  availableSubjects.forEach((s) => {
    s.units.forEach((u) => {
      u.lessons.forEach((l) => {
        allLessonsList.push({ id: l.id, title: l.title, subject: s.name });
      });
    });
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLessonId) {
      setError('Veuillez sélectionner un cours.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSave(
        selectedLessonId,
        durationMin,
        sessionType,
        confidenceRating,
        notes.trim(),
        sessionDate
      );
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Erreur lors de l'enregistrement");
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeLessonTitle =
    initialLesson?.title ||
    allLessonsList.find((l) => l.id === selectedLessonId)?.title ||
    'Cours sélectionné';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div>
            <span className="text-[11px] font-bold text-teal-700 uppercase tracking-wider block">
              {selectedSubjectName || 'Module Médical'}
            </span>
            <h3 className="font-bold text-slate-900 text-lg leading-tight">
              Enregistrer une séance de révision
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
              {error}
            </div>
          )}

          {/* Lesson selector (if not opened from an explicit lesson) */}
          {!initialLesson && availableSubjects.length > 0 ? (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-teal-600" />
                Sélectionner le cours révisé
              </label>
              <select
                value={selectedLessonId}
                onChange={(e) => {
                  setSelectedLessonId(e.target.value);
                  const found = allLessonsList.find((l) => l.id === e.target.value);
                  if (found) setSelectedSubjectName(found.subject);
                }}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-teal-500 bg-white"
              >
                {availableSubjects.map((s) => (
                  <optgroup key={s.id} label={s.name}>
                    {s.units.map((u) =>
                      u.lessons.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.title}
                        </option>
                      ))
                    )}
                  </optgroup>
                ))}
              </select>
            </div>
          ) : (
            <div className="p-3 bg-teal-50/80 rounded-2xl border border-teal-200 text-xs text-teal-950 flex items-start gap-2.5">
              <BookOpen className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block text-slate-900">Cours révisé :</span>
                <span>{activeLessonTitle}</span>
              </div>
            </div>
          )}

          {/* Date Picker */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-teal-600" />
              Date de la séance d'étude
            </label>
            <input
              type="date"
              required
              value={sessionDate}
              onChange={(e) => setSessionDate(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-teal-500 bg-white"
            />
          </div>

          {/* Duration Chips */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-teal-600" />
              Durée de révision ({durationMin} min)
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[30, 45, 60, 90].map((mins) => (
                <button
                  type="button"
                  key={mins}
                  onClick={() => setDurationMin(mins)}
                  className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                    durationMin === mins
                      ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {mins} min
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <input
                type="number"
                min={5}
                max={480}
                value={durationMin}
                onChange={(e) => setDurationMin(Math.max(5, Number(e.target.value)))}
                className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                placeholder="Autre durée personnalisée (min)..."
              />
              <span className="text-xs text-slate-500 shrink-0 font-medium">min</span>
            </div>
          </div>

          {/* Session Type / Tour Number */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Tour de révision & Type de séance
            </label>
            <select
              value={sessionType}
              onChange={(e) => setSessionType(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-teal-500 bg-white font-medium"
            >
              {SESSION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Confidence Rating (1-5 stars) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-teal-600" />
                Niveau d'assimilation (1 à 5)
              </span>
              <span className="text-[11px] font-bold text-teal-700">
                {confidenceRating} / 5
              </span>
            </label>
            <div className="grid grid-cols-5 gap-1.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onClick={() => setConfidenceRating(star)}
                  className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                    confidenceRating === star
                      ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {star} ★
                </button>
              ))}
            </div>
            <span className="text-[11px] text-slate-500 mt-1.5 block">
              {confidenceRating <= 2
                ? '🔴 Difficultés persistantes (À replanifier au plus vite)'
                : confidenceRating === 3
                ? '🟡 Notions acquises, consolidation nécessaire'
                : confidenceRating === 4
                ? '🟢 Bien maîtrisé (Objectif validé)'
                : '🌟 Excellente maîtrise (Annales maîtrisées)'}
            </span>
          </div>

          {/* Personal Private Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-teal-600" />
                Notes personnelles d'étude (facultatif)
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                <Lock className="w-3 h-3" />
                Privé
              </span>
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
              placeholder="Pièges récurrents d'annales, mnémotechniques, points d'anatomie à revoir..."
            />
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 active:bg-teal-800 rounded-xl shadow-xs transition-colors disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4" />
              {isSubmitting ? 'Enregistrement...' : 'Enregistrer la séance'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
