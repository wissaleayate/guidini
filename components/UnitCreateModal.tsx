'use client';

import React, { useState, useEffect } from 'react';
import { X, Plus, Save, FolderPlus } from 'lucide-react';
import { SubjectWithUnits, Unit } from '@/lib/types/database';

interface UnitCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjects: SubjectWithUnits[];
  defaultSubjectId?: string;
  initialUnit?: Unit | null;
  onSave: (subjectId: string, title: string) => Promise<void>;
}

export function UnitCreateModal({
  isOpen,
  onClose,
  subjects,
  defaultSubjectId,
  initialUnit,
  onSave,
}: UnitCreateModalProps) {
  const [subjectId, setSubjectId] = useState<string>(defaultSubjectId || subjects[0]?.id || '');
  const [title, setTitle] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (initialUnit) {
      setTitle(initialUnit.title);
      setSubjectId(initialUnit.subject_id);
    } else {
      setTitle('');
      if (defaultSubjectId) {
        setSubjectId(defaultSubjectId);
      } else if (subjects[0]) {
        setSubjectId(subjects[0].id);
      }
    }
  }, [initialUnit, defaultSubjectId, subjects, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !subjectId) return;

    try {
      setIsSubmitting(true);
      await onSave(subjectId, title.trim());
      setTitle('');
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-teal-50 text-teal-700">
              <FolderPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-base leading-snug">
                {initialUnit ? "Modifier l'Unité" : 'Nouvelle Unité / Chapitre'}
              </h3>
              <p className="text-xs text-slate-500">Sous-division pédagogique d'un module</p>
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
              Module parent
            </label>
            <select
              value={subjectId}
              disabled={Boolean(initialUnit)}
              onChange={(e) => setSubjectId(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-teal-500 bg-white disabled:bg-slate-100 disabled:text-slate-500"
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.semester})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Titre de l'unité
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Pathologies Vasculaires et Athérome"
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
              {initialUnit ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {isSubmitting ? 'Enregistrement...' : initialUnit ? 'Mettre à jour' : "Créer l'unité"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
