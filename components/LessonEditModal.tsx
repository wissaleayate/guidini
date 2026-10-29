'use client';

import React, { useState, useEffect } from 'react';
import { X, Save, Clock, BookOpen, RotateCw } from 'lucide-react';
import { Lesson, LessonDifficulty, SubjectWithUnits } from '@/lib/types/database';

interface LessonEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjects: SubjectWithUnits[];
  initialLesson?: Lesson | null;
  defaultUnitId?: string;
  onSave: (
    lessonData: {
      id?: string;
      unitId: string;
      title: string;
      difficulty: LessonDifficulty;
      durationMin: number;
      revisionTarget: number;
      notes?: string;
    }
  ) => Promise<void>;
}

const DIFFICULTIES: LessonDifficulty[] = ['Facile', 'Moyen', 'Difficile', 'Très Difficile'];

export function LessonEditModal({
  isOpen,
  onClose,
  subjects,
  initialLesson,
  defaultUnitId,
  onSave,
}: LessonEditModalProps) {
  const [selectedUnitId, setSelectedUnitId] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [difficulty, setDifficulty] = useState<LessonDifficulty>('Moyen');
  const [durationMin, setDurationMin] = useState<number>(60);
  const [revisionTarget, setRevisionTarget] = useState<number>(3);
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (initialLesson) {
      setTitle(initialLesson.title);
      setDifficulty(initialLesson.difficulty);
      setDurationMin(initialLesson.estimated_duration_min || 60);
      setRevisionTarget(initialLesson.revision_target || 3);
      setNotes(initialLesson.notes || '');
      setSelectedUnitId(initialLesson.unit_id);
    } else {
      setTitle('');
      setDifficulty('Moyen');
      setDurationMin(60);
      setRevisionTarget(3);
      setNotes('');
      if (defaultUnitId) {
        setSelectedUnitId(defaultUnitId);
      } else {
        const firstUnit = subjects[0]?.units[0];
        if (firstUnit) setSelectedUnitId(firstUnit.id);
      }
    }
  }, [initialLesson, defaultUnitId, subjects]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !selectedUnitId) return;

    try {
      setIsSubmitting(true);
      await onSave({
        id: initialLesson?.id,
        unitId: selectedUnitId,
        title: title.trim(),
        difficulty,
        durationMin,
        revisionTarget,
        notes: notes.trim(),
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-teal-50 text-teal-700">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-base leading-snug">
                {initialLesson ? 'Modifier le cours' : 'Ajouter un cours au curriculum'}
              </h3>
              <p className="text-xs text-slate-500">
                Visible par l'ensemble de la promotion médicale
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Unité / Chapitre de rattachement
            </label>
            <select
              value={selectedUnitId}
              onChange={(e) => setSelectedUnitId(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-teal-500 bg-white"
            >
              {subjects.map((sub) => (
                <optgroup key={sub.id} label={`${sub.name} (${sub.semester})`}>
                  {sub.units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.title}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Intitulé du cours
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Insuffisance Cardiaque Aiguë et Chronique"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Difficulté
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as LessonDifficulty)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-teal-500 bg-white"
              >
                {DIFFICULTIES.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-teal-600" />
                Durée (min)
              </label>
              <input
                type="number"
                min={15}
                max={480}
                step={15}
                required
                value={durationMin}
                onChange={(e) => setDurationMin(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1" title="Nombre de passes / tours de révision recommandés">
                <RotateCw className="w-3.5 h-3.5 text-teal-600" />
                Objectif tours
              </label>
              <input
                type="number"
                min={1}
                max={10}
                step={1}
                required
                value={revisionTarget}
                onChange={(e) => setRevisionTarget(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Consignes pédagogiques & Références
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Recommandations ESC/ESH, items R2C associés..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 active:bg-teal-800 rounded-lg shadow-xs transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isSubmitting ? 'Enregistrement...' : 'Enregistrer le cours'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
