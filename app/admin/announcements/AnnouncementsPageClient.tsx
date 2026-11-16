'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { CohortService } from '@/lib/services/cohort-service';
import { Announcement } from '@/lib/types/database';
import { LoadingState } from '@/components/LoadingState';
import {
  Megaphone,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Bookmark,
} from 'lucide-react';

export function AnnouncementsPageClient() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // New form fields
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<'general' | 'exam' | 'urgent' | 'course'>('general');
  const [isPinned, setIsPinned] = useState(false);

  const loadAnnouncements = useCallback(async () => {
    try {
      setLoading(true);
      const data = await CohortService.getAnnouncements();
      setAnnouncements(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnnouncements();
  }, [loadAnnouncements]);

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    try {
      setIsSubmitting(true);
      setFeedback(null);
      const created = await CohortService.createAnnouncement({
        title,
        content,
        category,
        is_pinned: isPinned,
        author_name: 'Délégué de Promotion (Admin)',
      });

      setAnnouncements((prev) => [created, ...prev]);
      setFeedback({ type: 'success', text: 'Annonce officielle publiée avec succès pour toute la promotion.' });
      setTitle('');
      setContent('');
      setIsPinned(false);
    } catch {
      setFeedback({ type: 'error', text: 'Erreur lors de la publication de l\'annonce.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette annonce ?')) return;

    try {
      await CohortService.deleteAnnouncement(id);
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
      setFeedback({ type: 'success', text: 'Annonce supprimée.' });
    } catch {
      setFeedback({ type: 'error', text: 'Erreur lors de la suppression.' });
    }
  };

  if (loading) {
    return <LoadingState message="Chargement des annonces de la cohorte..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-semibold mb-2 border border-amber-300">
            <Megaphone className="w-3.5 h-3.5 text-amber-600" />
            Communication Administrative
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Annonces Officielles de la Promotion
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Publiez des messages, consignes pédagogiques ou alertes d'examens visibles par tous les étudiants de la promotion DFGSM 2 dans leur tableau de bord et cloche de notification.
          </p>
        </div>

        <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-amber-50 border border-amber-200 self-start sm:self-auto">
          <div className="p-2.5 rounded-xl bg-amber-600 text-white shadow-xs">
            <Megaphone className="w-5 h-5" />
          </div>
          <div>
            <span className="text-2xl font-black text-slate-900 leading-none">
              {announcements.length}
            </span>
            <span className="text-xs font-semibold text-amber-900 block mt-0.5">
              Annonces Actives
            </span>
          </div>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-2xl border text-sm font-semibold flex items-center gap-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Grid: Create Form + Announcements List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Create Form */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center gap-2">
            <Plus className="w-4 h-4 text-teal-600" />
            Nouvelle Annonce
          </h2>

          <form onSubmit={handleCreateAnnouncement} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Titre de l'annonce
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Réunion de rentrée Unité 01"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Catégorie
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-teal-500 bg-white"
              >
                <option value="general">Générale (Information)</option>
                <option value="course">Cours & Enseignement</option>
                <option value="exam">Contrôles & Examens</option>
                <option value="urgent">Urgent / Important</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Contenu du message
              </label>
              <textarea
                required
                rows={4}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Détails du message pour les étudiants de la cohorte..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <label className="flex items-center gap-2 text-xs text-slate-700 font-semibold cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isPinned}
                onChange={(e) => setIsPinned(e.target.checked)}
                className="rounded text-teal-600 focus:ring-teal-500 w-4 h-4"
              />
              <span>Épingler cette annonce en haut du tableau de bord</span>
            </label>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 transition-colors shadow-xs disabled:opacity-50"
            >
              {isSubmitting ? 'Publication...' : 'Publier l\'annonce'}
            </button>
          </form>
        </div>

        {/* Right: Announcements List */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-teal-600" />
              Annonces en Ligne ({announcements.length})
            </span>
            <span className="text-xs text-slate-400 font-normal">
              Diffusé à 84 membres
            </span>
          </h2>

          <div className="space-y-3">
            {announcements.map((ann) => (
              <div
                key={ann.id}
                className={`p-4 rounded-2xl border transition-all ${
                  ann.is_pinned
                    ? 'bg-amber-50/50 border-amber-200'
                    : 'bg-slate-50/70 border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900 text-sm">{ann.title}</span>
                      {ann.is_pinned && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                          <Bookmark className="w-3 h-3" />
                          Épinglé
                        </span>
                      )}
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                        {ann.category === 'exam'
                          ? 'Examen'
                          : ann.category === 'urgent'
                          ? 'Urgent'
                          : ann.category === 'course'
                          ? 'Cours'
                          : 'Général'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed mt-1">
                      {ann.content}
                    </p>
                    <div className="text-[11px] text-slate-400 pt-1 flex items-center gap-3">
                      <span>Auteur : {ann.author_name || 'Admin'}</span>
                      <span>•</span>
                      <span>
                        {new Date(ann.created_at).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteAnnouncement(ann.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors shrink-0"
                    title="Supprimer l'annonce"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
