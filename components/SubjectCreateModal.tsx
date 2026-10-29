'use client';

import React, { useState, useEffect } from 'react';
import { X, Plus, Save, Sparkles } from 'lucide-react';
import { Subject } from '@/lib/types/database';

interface SubjectCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSubject?: Subject | null;
  onSave: (name: string, code: string, color: string, semester: string) => Promise<void>;
}

const PRESET_COLORS = [
  { name: 'Bleu Ciel', hex: '#0284c7' },
  { name: 'Teal Médical', hex: '#0d9488' },
  { name: 'Émeraude', hex: '#059669' },
  { name: 'Indigo', hex: '#4f46e5' },
  { name: 'Violet Neuro', hex: '#7c3aed' },
  { name: 'Rose Cardio', hex: '#e11d48' },
  { name: 'Ambre', hex: '#d97706' },
  { name: 'Gris Ardoise', hex: '#475569' },
];

export function SubjectCreateModal({ isOpen, onClose, initialSubject, onSave }: SubjectCreateModalProps) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0].hex);
  const [semester, setSemester] = useState('S1');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialSubject) {
      setName(initialSubject.name);
      setCode(initialSubject.code || '');
      setColor(initialSubject.color || PRESET_COLORS[0].hex);
      setSemester(initialSubject.semester || 'S1');
    } else {
      setName('');
      setCode('');
      setColor(PRESET_COLORS[0].hex);
      setSemester('S1');
    }
  }, [initialSubject, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setIsSubmitting(true);
      await onSave(name.trim(), code.trim(), color, semester);
      setName('');
      setCode('');
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
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-base leading-snug">
                {initialSubject ? 'Modifier le Module' : 'Nouveau Module / Matière'}
              </h3>
              <p className="text-xs text-slate-500">
                {initialSubject ? 'Modification du référentiel officiel' : 'Ajout au programme partagé de la promotion'}
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
              Intitulé du module
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Hépato-Gastro-Entérologie"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Code / Abréviation
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Ex: HGE-205"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Semestre
              </label>
              <select
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-teal-500 bg-white"
              >
                <option value="S1">Semestre 1 (S1)</option>
                <option value="S2">Semestre 2 (S2)</option>
                <option value="Annuel">Annuel</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Couleur distinctive
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {PRESET_COLORS.map((col) => (
                <button
                  type="button"
                  key={col.hex}
                  onClick={() => setColor(col.hex)}
                  className={`w-7 h-7 rounded-full border-2 transition-transform ${
                    color === col.hex ? 'scale-110 border-slate-900 shadow-xs' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: col.hex }}
                  title={col.name}
                />
              ))}
            </div>
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
              {initialSubject ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {isSubmitting ? 'Enregistrement...' : initialSubject ? 'Mettre à jour' : 'Créer le module'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
