'use client';

import React, { useState, useEffect } from 'react';
import { X, Save, Clock, BookOpen, RotateCw, FileText, ToggleLeft, ToggleRight } from 'lucide-react';
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
      description?: string;
      sourceFileRef?: string;
      isAvailable?: boolean;
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
  const [description, setDescription] = useState<string>('');
  const [sourceFileRef, setSourceFileRef] = useState<string>('');
  const [isAvailable, setIsAvailable] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (initialLesson) {
      setTitle(initialLesson.title);
      setDifficulty(initialLesson.difficulty);
      setDurationMin(initialLesson.estimated_duration_min || 60);
      setRevisionTarget(initialLesson.revision_target || 3);
      setNotes(initialLesson.notes || '');
      setDescription(initialLesson.description || '');
      setSourceFileRef(initialLesson.source_file_ref || '');
      setIsAvailable(initialLesson.is_available !== false);
      setSelectedUnitId(initialLesson.unit_id);
    } else {
      setTitle('');
      setDifficulty('Moyen');
      setDurationMin(60);
      setRevisionTarget(3);
      setNotes('');
      setDescription('');
      setSourceFileRef('');
      setIsAvailable(true);
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
        notes: notes.trim() || undefined,
        description: description.trim() || undefined,
        sourceFileRef: sourceFileRef.trim() || undefined,
        isAvailable,
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
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-teal-50 text-teal-700">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base leading-snug">
                {initialLesson ? 'Modifier le cours' : 'Ajouter un cours au curriculum'}
              </h3>
              <p className="text-xs text-slate-500">
                Programme partagé de la promotion médicale
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Module & Unit selector (allows moving lessons across modules/units) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Module & Sous-catégorie de rattachement
            </label>
            <select
              value={selectedUnitId}
              onChange={(e) => setSelectedUnitId(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-teal-500 bg-white"
            >
              {subjects.map((sub) => (
                <optgroup key={sub.id} label={`${sub.name} (${sub.code || sub.semester})`}>
                  {sub.units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {sub.name} &gt; {u.title}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <p className="text-[11px] text-slate-400 mt-1">
              Vous pouvez déplacer ce cours vers un autre module ou une autre sous-catégorie sans impacter la progression des étudiants.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Intitulé du cours
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Insuffisance Cardiaque Aiguë"
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Difficulté
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as LessonDifficulty)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-teal-500 bg-white"
              >
                {DIFFICULTIES.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
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
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1" title="Nombre de passes / tours de révision recommandés">
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
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-teal-600" />
              Référence du fichier source / archive (Optionnel)
            </label>
            <input
              type="text"
              value={sourceFileRef}
              onChange={(e) => setSourceFileRef(e.target.value)}
              placeholder="Ex: Support_Insuffisance_Cardiaque.pdf"
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Description & Résumé pédagogique (Optionnel)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Définition de l'OAP cardiogénique, pressions capillaires pulmonaires..."
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Consignes pédagogiques & Notes d'études
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Insister sur les critères diagnostiques et les posologies..."
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Availability status toggle */}
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-800 block">
                Disponibilité pour les étudiants
              </span>
              <span className="text-[11px] text-slate-500">
                {isAvailable
                  ? 'Le cours est actif et accessible dans le programme des étudiants.'
                  : 'Le cours est marqué comme temporairement indisponible (en attente d’archive).'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsAvailable(!isAvailable)}
              className={`p-1.5 rounded-xl border flex items-center gap-1.5 text-xs font-bold transition-all ${
                isAvailable
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                  : 'bg-amber-50 text-amber-800 border-amber-300'
              }`}
            >
              {isAvailable ? (
                <>
                  <ToggleRight className="w-4 h-4 text-emerald-600" />
                  <span>Disponible</span>
                </>
              ) : (
                <>
                  <ToggleLeft className="w-4 h-4 text-amber-600" />
                  <span>Indisponible</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-slate-950 bg-teal-400 hover:bg-teal-300 active:bg-teal-500 rounded-xl shadow-xs transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4 text-slate-950" />
              {isSubmitting ? 'Enregistrement...' : 'Enregistrer le cours'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
