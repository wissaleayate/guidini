'use client';

import React, { useState, useMemo } from 'react';
import { Exam, SubjectWithUnits, ExamType } from '@/lib/types/database';
import { useAuth } from '@/lib/context/auth-context';
import {
  Calendar,
  MapPin,
  Award,
  Plus,
  Trash2,
  Edit2,
  X,
  Download,
  CheckCircle2,
  AlertTriangle,
  Search,
  Filter,
  Check,
  Layers,
} from 'lucide-react';
import { CohortService } from '@/lib/services/cohort-service';
import { exportExamsToCSV } from '@/lib/services/import-parser';

interface ExamsListProps {
  initialExams: Exam[];
  subjects: SubjectWithUnits[];
  onRefresh?: () => Promise<void>;
}

const EXAM_TYPES: ExamType[] = ['Contrôle Continu', 'Examen Final', 'Rattrapage', 'TP/Stage'];

export function ExamsList({ initialExams, subjects, onRefresh }: ExamsListProps) {
  const { role } = useAuth();
  const [exams, setExams] = useState<Exam[]>(initialExams);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedTimeframe, setSelectedTimeframe] = useState<'all' | 'upcoming' | 'passed'>('all');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modal states for Create / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExamId, setEditingExamId] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [examType, setExamType] = useState<ExamType>('Contrôle Continu');
  const [examDate, setExamDate] = useState('');
  const [location, setLocation] = useState('Amphithéâtre');
  const [coefficient, setCoefficient] = useState(1.5);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete confirmation
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    id: string;
    title: string;
  } | null>(null);

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  const reloadExams = async () => {
    if (onRefresh) await onRefresh();
    const fresh = await CohortService.getExams();
    setExams(fresh);
  };

  const getDaysRemaining = (dateStr: string) => {
    const target = new Date(dateStr).getTime();
    const now = new Date().getTime();
    const diffDays = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const openCreateModal = () => {
    setEditingExamId(null);
    setTitle('');
    setExamType('Contrôle Continu');
    setExamDate('');
    setLocation('Amphithéâtre');
    setCoefficient(1.5);
    setSelectedSubjectIds([]);
    setIsModalOpen(true);
  };

  const openEditModal = (exam: Exam) => {
    setEditingExamId(exam.id);
    setTitle(exam.title);
    setExamType(exam.exam_type);
    setExamDate(exam.exam_date ? exam.exam_date.split('T')[0] : '');
    setLocation(exam.location || '');
    setCoefficient(exam.coefficient || 1.0);
    setSelectedSubjectIds(exam.subject_ids || (exam.subject_id ? [exam.subject_id] : []));
    setIsModalOpen(true);
  };

  const handleToggleSubject = (subId: string) => {
    setSelectedSubjectIds((prev) =>
      prev.includes(subId) ? prev.filter((id) => id !== subId) : [...prev, subId]
    );
  };

  const handleSubmitExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !examDate) {
      showFeedback('error', "Veuillez renseigner l'intitulé et la date de l'épreuve.");
      return;
    }

    try {
      setIsSubmitting(true);
      const primarySubject = subjects.find((s) => s.id === selectedSubjectIds[0]);

      if (editingExamId) {
        await CohortService.updateExam(
          editingExamId,
          {
            title: title.trim(),
            subject_id: selectedSubjectIds[0] || null,
            subject_name: primarySubject?.name || 'Tronc Commun',
            subject_color: primarySubject?.color || '#0d9488',
            exam_type: examType,
            exam_date: new Date(examDate).toISOString(),
            location: location.trim(),
            coefficient,
          },
          selectedSubjectIds
        );
        showFeedback('success', `Épreuve "${title}" modifiée avec succès.`);
      } else {
        await CohortService.createExam(
          {
            title: title.trim(),
            subject_id: selectedSubjectIds[0] || null,
            subject_name: primarySubject?.name || 'Tronc Commun',
            subject_color: primarySubject?.color || '#0d9488',
            exam_type: examType,
            exam_date: new Date(examDate).toISOString(),
            location: location.trim(),
            coefficient,
          },
          selectedSubjectIds
        );
        showFeedback('success', `Nouvelle épreuve "${title}" ajoutée au calendrier.`);
      }

      await reloadExams();
      setIsModalOpen(false);
    } catch (err: any) {
      showFeedback('error', err?.message || "Erreur lors de l'enregistrement de l'épreuve.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmation) return;
    try {
      await CohortService.deleteExam(deleteConfirmation.id);
      showFeedback('success', `Épreuve "${deleteConfirmation.title}" supprimée.`);
      setDeleteConfirmation(null);
      await reloadExams();
    } catch (err: any) {
      showFeedback('error', err?.message || 'Erreur lors de la suppression.');
    }
  };

  const handleExportCSV = () => {
    const csv = exportExamsToCSV(exams);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `calendrier_examens_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showFeedback('success', 'Calendrier des examens exporté en CSV.');
  };

  // Filtered Exams
  const filteredExams = useMemo(() => {
    return exams.filter((exam) => {
      const daysLeft = getDaysRemaining(exam.exam_date);
      const isPassed = daysLeft < 0;

      const matchSearch =
        searchQuery.trim() === '' ||
        exam.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (exam.subject_name && exam.subject_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (exam.location && exam.location.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchType = selectedType === 'all' || exam.exam_type === selectedType;

      const matchTimeframe =
        selectedTimeframe === 'all'
          ? true
          : selectedTimeframe === 'upcoming'
          ? !isPassed
          : isPassed;

      return matchSearch && matchType && matchTimeframe;
    });
  }, [exams, searchQuery, selectedType, selectedTimeframe]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-800 via-slate-900 to-slate-950 rounded-3xl p-6 sm:p-8 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 border border-teal-400/30 text-teal-200 text-xs font-semibold mb-3">
            <Calendar className="w-3.5 h-3.5" />
            Calendrier & Évaluations • Promotion DFGSM 2
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Gestionnaire des Examens & Contrôles
          </h1>
          <p className="text-teal-100/90 text-xs sm:text-sm max-w-2xl mt-1.5 leading-relaxed">
            Planifiez les partiels, contrôles continus et rattrapages. Définissez les modules couverts, coefficients et lieux d'épreuve.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto flex-wrap">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-200 bg-white/10 hover:bg-white/20 border border-white/15 transition-colors"
          >
            <Download className="w-4 h-4" />
            Exporter CSV
          </button>
          {role === 'admin' && (
            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-950 bg-teal-400 hover:bg-teal-300 shadow-md transition-colors"
            >
              <Plus className="w-4 h-4 text-slate-950" />
              Planifier une Épreuve
            </button>
          )}
        </div>
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

      {/* Search and Filters */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par titre d'épreuve, module ou salle..."
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
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-slate-50 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
          >
            <option value="all">Tous types d'épreuves</option>
            {EXAM_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <select
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value as any)}
            className="px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-slate-50 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
          >
            <option value="all">Toutes dates</option>
            <option value="upcoming">À venir seulement</option>
            <option value="passed">Passés seulement</option>
          </select>
        </div>
      </div>

      {/* Grid of Exams */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredExams.length === 0 ? (
          <div className="col-span-full bg-white rounded-3xl p-12 text-center border border-slate-200">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="font-semibold text-slate-800">Aucun examen correspondant</h3>
            <p className="text-xs text-slate-500 mt-1">
              Modifiez votre recherche ou utilisez le bouton "Planifier une Épreuve".
            </p>
          </div>
        ) : (
          filteredExams.map((exam) => {
            const daysLeft = getDaysRemaining(exam.exam_date);
            const isUrgent = daysLeft <= 7 && daysLeft >= 0;
            const isPassed = daysLeft < 0;

            return (
              <div
                key={exam.id}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow relative"
              >
                {/* Top strip colored by primary subject */}
                <div
                  className="h-2 w-full"
                  style={{ backgroundColor: exam.subject_color || '#0d9488' }}
                />

                <div className="p-5 flex-1 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-md truncate max-w-[70%]"
                      style={{
                        backgroundColor: `${exam.subject_color || '#0d9488'}15`,
                        color: exam.subject_color || '#0d9488',
                      }}
                      title={exam.subject_name || 'Tronc Commun'}
                    >
                      {exam.subject_name || 'Tronc Commun'}
                    </span>

                    {/* Countdown Pill */}
                    <span
                      className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border shrink-0 ${
                        isPassed
                          ? 'bg-slate-100 text-slate-500 border-slate-200'
                          : isUrgent
                          ? 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse'
                          : 'bg-teal-50 text-teal-700 border-teal-200'
                      }`}
                    >
                      {isPassed
                        ? 'Terminé'
                        : daysLeft === 0
                        ? "Aujourd'hui !"
                        : `J-${daysLeft}`}
                    </span>
                  </div>

                  <h3 className="font-bold text-base text-slate-900 leading-snug">
                    {exam.title}
                  </h3>

                  <div className="space-y-1.5 text-xs text-slate-600 pt-1">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>
                        {new Date(exam.exam_date).toLocaleDateString('fr-FR', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </span>
                    </div>

                    {exam.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                        <span>{exam.location}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <Award className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>
                        {exam.exam_type} • Coeff. {exam.coefficient}
                      </span>
                    </div>

                    {/* Multiple Covered Subjects Indicator */}
                    {exam.subject_ids && exam.subject_ids.length > 1 && (
                      <div className="flex items-center gap-1.5 text-[11px] text-teal-700 bg-teal-50/80 px-2 py-1 rounded-lg border border-teal-200/60 mt-2">
                        <Layers className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                        <span className="truncate">
                          Couvre {exam.subject_ids.length} modules médicaux
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {role === 'admin' && (
                  <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <button
                      onClick={() => openEditModal(exam)}
                      className="flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-teal-700 transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      Modifier
                    </button>
                    <button
                      onClick={() => setDeleteConfirmation({ id: exam.id, title: exam.title })}
                      className="flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-rose-600 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Supprimer
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Safety Deletion Modal */}
      {deleteConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-lg font-bold text-slate-900">
                Supprimer cette épreuve ?
              </h3>
              <p className="text-xs text-slate-600">
                L'épreuve <strong className="text-slate-900 font-semibold block mt-1">"{deleteConfirmation.title}"</strong> sera retirée du calendrier officiel de tous les étudiants.
              </p>
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

      {/* Exam Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-teal-50 text-teal-700">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 text-base leading-snug">
                    {editingExamId ? "Modifier l'épreuve" : 'Planifier une épreuve'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Sera immédiatement synchronisé avec l'agenda des étudiants
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitExam} className="p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Intitulé de l'épreuve
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Épreuve écrite de Cardiologie - Partiel S1"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Type d'évaluation
                  </label>
                  <select
                    value={examType}
                    onChange={(e) => setExamType(e.target.value as ExamType)}
                    className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-teal-500 bg-white"
                  >
                    {EXAM_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Date de l'épreuve
                  </label>
                  <input
                    type="date"
                    required
                    value={examDate}
                    onChange={(e) => setExamDate(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Coefficient
                  </label>
                  <input
                    type="number"
                    step={0.5}
                    min={0.5}
                    max={20}
                    required
                    value={coefficient}
                    onChange={(e) => setCoefficient(Number(e.target.value))}
                    className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Lieu / Salle
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Ex: Amphithéâtre Pasteur"
                    className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              {/* Multi-subject selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Modules / Matières couverts par cette épreuve (Multi-sélection)
                </label>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 max-h-40 overflow-y-auto">
                  {subjects.length === 0 ? (
                    <span className="text-xs text-slate-400 italic">Aucun module disponible</span>
                  ) : (
                    subjects.map((s) => {
                      const isChecked = selectedSubjectIds.includes(s.id);
                      return (
                        <label
                          key={s.id}
                          className={`flex items-center gap-2.5 p-2 rounded-lg cursor-pointer transition-colors text-xs font-medium ${
                            isChecked ? 'bg-teal-50 text-teal-900 border border-teal-200' : 'hover:bg-slate-100 text-slate-700'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleSubject(s.id)}
                            className="rounded text-teal-600 focus:ring-teal-500 w-4 h-4"
                          />
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: s.color || '#0d9488' }}
                          />
                          <span className="flex-1 truncate">{s.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{s.code || s.semester}</span>
                        </label>
                      );
                    })
                  )}
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Si aucun module n'est coché, l'épreuve sera catégorisée en "Tronc Commun / Synthèse".
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-xs transition-colors disabled:opacity-50"
                >
                  {editingExamId ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  {isSubmitting ? 'Publication...' : editingExamId ? 'Mettre à jour' : 'Ajouter au calendrier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
