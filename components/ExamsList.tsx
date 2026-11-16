'use client';

import React, { useState, useMemo } from 'react';
import { Exam, SubjectWithUnits, ExamType, AcademicUnit, ExamTargetType } from '@/lib/types/database';
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
  Sparkles,
  Bookmark,
} from 'lucide-react';
import { CohortService } from '@/lib/services/cohort-service';
import { exportExamsToCSV } from '@/lib/services/import-parser';

interface ExamsListProps {
  initialExams: Exam[];
  subjects: SubjectWithUnits[];
  academicUnits?: AcademicUnit[];
  onRefresh?: () => Promise<void>;
}

const EXAM_TYPES: ExamType[] = ['Contrôle Continu', 'Examen Final', 'Rattrapage', 'TP/Stage'];

export function ExamsList({
  initialExams,
  subjects,
  academicUnits = [],
  onRefresh,
}: ExamsListProps) {
  const { role } = useAuth();
  const [exams, setExams] = useState<Exam[]>(initialExams);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<'all' | 'unit' | 'independent_module'>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedTimeframe, setSelectedTimeframe] = useState<'all' | 'scheduled' | 'tbd' | 'upcoming' | 'passed'>('all');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modal states for Create / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExamId, setEditingExamId] = useState<string | null>(null);

  // Form states
  const [targetType, setTargetType] = useState<ExamTargetType>('unit');
  const [academicUnitId, setAcademicUnitId] = useState<string>('');
  const [independentSubjectId, setIndependentSubjectId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [examType, setExamType] = useState<ExamType>('Contrôle Continu');
  const [examDate, setExamDate] = useState('');
  const [examTime, setExamTime] = useState('');
  const [location, setLocation] = useState('Amphithéâtre');
  const [coefficient, setCoefficient] = useState(1.5);
  const [notes, setNotes] = useState('');
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

  const getDaysRemaining = (dateStr: string | null | undefined) => {
    if (!dateStr) return null;
    const target = new Date(dateStr).getTime();
    const now = new Date().getTime();
    return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
  };

  const openCreateModal = () => {
    setEditingExamId(null);
    setTargetType('unit');
    setAcademicUnitId(academicUnits[0]?.id || 'unit-cardio-pulm-01');
    const firstInd = subjects.find((s) => s.is_independent || !s.academic_unit_id);
    setIndependentSubjectId(firstInd?.id || 'sub-ind-immu');
    setTitle('Contrôle Semestriel – ');
    setExamType('Contrôle Continu');
    setExamDate('');
    setExamTime('');
    setLocation('Amphithéâtre');
    setCoefficient(3.0);
    setNotes('');
    setIsModalOpen(true);
  };

  const openEditModal = (exam: Exam) => {
    setEditingExamId(exam.id);
    const resolvedTargetType = exam.target_type || (exam.academic_unit_id ? 'unit' : 'independent_module');
    setTargetType(resolvedTargetType);
    setAcademicUnitId(exam.academic_unit_id || academicUnits[0]?.id || 'unit-cardio-pulm-01');
    setIndependentSubjectId(exam.subject_id || 'sub-ind-immu');
    setTitle(exam.title);
    setExamType(exam.exam_type);
    setExamDate(exam.exam_date ? exam.exam_date.split('T')[0] : '');
    setExamTime(exam.exam_time || '');
    setLocation(exam.location || '');
    setCoefficient(exam.coefficient || 1.5);
    setNotes(exam.notes || '');
    setIsModalOpen(true);
  };

  // Sync title when changing target unit/module during creation
  const handleTargetTypeChange = (type: ExamTargetType) => {
    setTargetType(type);
    if (!editingExamId) {
      if (type === 'unit') {
        const u = academicUnits.find((item) => item.id === academicUnitId) || academicUnits[0];
        setTitle(u ? `Contrôle Semestriel – ${u.name}` : 'Contrôle Semestriel – Unité');
        setCoefficient(3.0);
      } else {
        const s = subjects.find((item) => item.id === independentSubjectId) || subjects.find((item) => item.is_independent);
        setTitle(s ? `Contrôle – ${s.name}` : 'Contrôle – Module Indépendant');
        setCoefficient(1.5);
      }
    }
  };

  const handleUnitSelect = (uId: string) => {
    setAcademicUnitId(uId);
    if (!editingExamId) {
      const u = academicUnits.find((item) => item.id === uId);
      if (u) setTitle(`Contrôle Semestriel – ${u.name}`);
    }
  };

  const handleIndependentSubjectSelect = (sId: string) => {
    setIndependentSubjectId(sId);
    if (!editingExamId) {
      const s = subjects.find((item) => item.id === sId);
      if (s) setTitle(`Contrôle – ${s.name}`);
    }
  };

  const handleSubmitExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      showFeedback('error', "Veuillez renseigner l'intitulé de l'épreuve.");
      return;
    }

    try {
      setIsSubmitting(true);
      const isUnit = targetType === 'unit';
      const selectedUnit = academicUnits.find((u) => u.id === academicUnitId);
      const selectedSubject = subjects.find((s) => s.id === independentSubjectId);

      const payload: Partial<Exam> = {
        title: title.trim(),
        target_type: targetType,
        academic_unit_id: isUnit ? academicUnitId : null,
        academic_unit_name: isUnit ? (selectedUnit?.name || 'Unité') : undefined,
        subject_id: !isUnit ? independentSubjectId : null,
        subject_name: !isUnit ? (selectedSubject?.name || 'Module Indépendant') : (selectedUnit?.name || 'Unité'),
        subject_color: !isUnit ? (selectedSubject?.color || '#8b5cf6') : (selectedUnit?.color || '#0d9488'),
        exam_type: examType,
        exam_date: examDate ? new Date(examDate).toISOString() : null,
        exam_time: examTime.trim() || null,
        location: location.trim(),
        coefficient,
        notes: notes.trim() || undefined,
      };

      if (editingExamId) {
        await CohortService.updateExam(editingExamId, payload);
        showFeedback('success', `Contrôle "${title}" modifié avec succès.`);
      } else {
        await CohortService.createExam(payload as any);
        showFeedback('success', `Nouveau contrôle "${title}" ajouté.`);
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
    showFeedback('success', 'Calendrier des contrôles exporté en CSV.');
  };

  // Filtered Exams
  const filteredExams = useMemo(() => {
    return exams.filter((exam) => {
      const daysLeft = getDaysRemaining(exam.exam_date);
      const isPassed = daysLeft !== null && daysLeft < 0;
      const isTbd = !exam.exam_date;

      const matchCategory =
        selectedCategoryTab === 'all' ||
        (selectedCategoryTab === 'unit' && (exam.target_type === 'unit' || exam.academic_unit_id)) ||
        (selectedCategoryTab === 'independent_module' && (exam.target_type === 'independent_module' || (!exam.academic_unit_id && exam.subject_id)));

      const matchSearch =
        searchQuery.trim() === '' ||
        exam.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (exam.subject_name && exam.subject_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (exam.academic_unit_name && exam.academic_unit_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (exam.location && exam.location.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (exam.notes && exam.notes.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchType = selectedType === 'all' || exam.exam_type === selectedType;

      const matchTimeframe =
        selectedTimeframe === 'all'
          ? true
          : selectedTimeframe === 'scheduled'
          ? !isTbd
          : selectedTimeframe === 'tbd'
          ? isTbd
          : selectedTimeframe === 'upcoming'
          ? !isPassed && !isTbd
          : isPassed;

      return matchCategory && matchSearch && matchType && matchTimeframe;
    });
  }, [exams, searchQuery, selectedCategoryTab, selectedType, selectedTimeframe]);

  const unitControlsCount = exams.filter((e) => e.target_type === 'unit' || e.academic_unit_id).length;
  const indControlsCount = exams.filter((e) => e.target_type === 'independent_module' || (!e.academic_unit_id && e.subject_id)).length;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-teal-900 via-slate-900 to-slate-950 rounded-3xl p-6 sm:p-8 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 border border-teal-400/30 text-teal-200 text-xs font-semibold mb-3 flex-wrap">
            <Calendar className="w-3.5 h-3.5" />
            Régime des Évaluations • Faculté de Médecine - Constantine (Troisième Année)
            <span className="text-[11px] font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-400/30">
              8 Contrôles Officiels
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Calendrier & Contrôles Académiques
          </h1>
          <p className="text-teal-100/90 text-xs sm:text-sm max-w-2xl mt-1.5 leading-relaxed">
            4 contrôles semestriels pour les grandes unités intégrées + 4 contrôles autonomes pour les modules indépendants (Immunologie, Microbiologie, Pharmacologie, Parasitologie).
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
              <Plus className="w-4 h-4 text-slate-950 stroke-[3]" />
              Ajouter un Contrôle
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

      {/* Two Academic Category Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 flex-wrap">
        <button
          onClick={() => setSelectedCategoryTab('all')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            selectedCategoryTab === 'all'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          Tous les contrôles ({exams.length})
        </button>
        <button
          onClick={() => setSelectedCategoryTab('unit')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            selectedCategoryTab === 'unit'
              ? 'bg-teal-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          Grandes Unités Intégrées ({unitControlsCount} contrôles)
        </button>
        <button
          onClick={() => setSelectedCategoryTab('independent_module')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            selectedCategoryTab === 'independent_module'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Bookmark className="w-3.5 h-3.5" />
          Modules Indépendants ({indControlsCount} contrôles)
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par intitulé, unité, module, salle ou note..."
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

        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
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
            <option value="all">Tous états</option>
            <option value="tbd">Date à définir (non fixée)</option>
            <option value="scheduled">Planifiés avec date</option>
            <option value="upcoming">À venir seulement</option>
            <option value="passed">Passés seulement</option>
          </select>
        </div>
      </div>

      {/* Grid of Exams */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {filteredExams.length === 0 ? (
          <div className="col-span-full bg-white rounded-3xl p-12 text-center border border-slate-200">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="font-semibold text-slate-800">Aucun contrôle correspondant</h3>
            <p className="text-xs text-slate-500 mt-1">
              Modifiez votre filtre ou ajoutez un nouveau contrôle.
            </p>
          </div>
        ) : (
          filteredExams.map((exam) => {
            const isUnit = exam.target_type === 'unit' || Boolean(exam.academic_unit_id);
            const daysLeft = getDaysRemaining(exam.exam_date);
            const hasDate = Boolean(exam.exam_date);
            const isUrgent = daysLeft !== null && daysLeft <= 7 && daysLeft >= 0;
            const isPassed = daysLeft !== null && daysLeft < 0;

            return (
              <div
                key={exam.id}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow relative"
              >
                {/* Top strip colored by entity */}
                <div
                  className="h-2 w-full"
                  style={{ backgroundColor: exam.subject_color || (isUnit ? '#0d9488' : '#8b5cf6') }}
                />

                <div className="p-5 flex-1 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    {/* Category & Badge */}
                    <span
                      className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-md truncate max-w-[70%]"
                      style={{
                        backgroundColor: `${exam.subject_color || (isUnit ? '#0d9488' : '#8b5cf6')}15`,
                        color: exam.subject_color || (isUnit ? '#0d9488' : '#8b5cf6'),
                      }}
                      title={exam.subject_name || exam.academic_unit_name || 'Contrôle'}
                    >
                      {isUnit ? '🏛️ Unité Pédagogique' : '⭐ Module Indépendant'}
                    </span>

                    {/* Countdown / Status Pill */}
                    {hasDate ? (
                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border shrink-0 ${
                          isPassed
                            ? 'bg-slate-100 text-slate-500 border-slate-200'
                            : isUrgent
                            ? 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse'
                            : 'bg-teal-50 text-teal-700 border-teal-200'
                        }`}
                      >
                        {isPassed ? 'Terminé' : daysLeft === 0 ? "Aujourd'hui !" : `J-${daysLeft}`}
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300 shrink-0">
                        Date à définir
                      </span>
                    )}
                  </div>

                  <h3 className="font-bold text-base text-slate-900 leading-snug">
                    {exam.title}
                  </h3>

                  <div className="space-y-1.5 text-xs text-slate-600 pt-1">
                    {/* Date / Time */}
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                      {hasDate ? (
                        <span>
                          {new Date(exam.exam_date!).toLocaleDateString('fr-FR', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                          {exam.exam_time && ` • ${exam.exam_time}`}
                        </span>
                      ) : (
                        <span className="italic text-amber-800 font-medium">
                          Non planifiée par l'administration
                        </span>
                      )}
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

                    {/* Unit or Independent info */}
                    <div className="text-[11px] p-2 rounded-xl bg-slate-50 border border-slate-100 space-y-1 mt-2">
                      <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                        {isUnit ? <Layers className="w-3.5 h-3.5 text-teal-600" /> : <Bookmark className="w-3.5 h-3.5 text-purple-600" />}
                        <span>Rattachement : {exam.academic_unit_name || exam.subject_name}</span>
                      </div>
                      {exam.notes && (
                        <p className="text-[11px] text-slate-500 italic leading-snug">
                          {exam.notes}
                        </p>
                      )}
                    </div>
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
                Supprimer ce contrôle ?
              </h3>
              <p className="text-xs text-slate-600">
                L'épreuve <strong className="text-slate-900 font-semibold block mt-1">"{deleteConfirmation.title}"</strong> sera retirée de l'agenda partagé.
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
                    {editingExamId ? "Modifier le contrôle" : 'Planifier un contrôle officiel'}
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
              {/* Target Type Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Type de structure académique
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleTargetTypeChange('unit')}
                    className={`p-3 rounded-xl border text-left text-xs font-medium transition-all ${
                      targetType === 'unit'
                        ? 'border-teal-500 bg-teal-50/70 text-teal-950 font-bold ring-2 ring-teal-500/30'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <Layers className="w-4 h-4 mb-1 text-teal-600" />
                    Grandes Unités (1 à 4)
                    <span className="block text-[10px] font-normal text-slate-500 mt-0.5">
                      Contrôle semestriel unique couvrant tous ses modules
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTargetTypeChange('independent_module')}
                    className={`p-3 rounded-xl border text-left text-xs font-medium transition-all ${
                      targetType === 'independent_module'
                        ? 'border-purple-500 bg-purple-50/70 text-purple-950 font-bold ring-2 ring-purple-500/30'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <Bookmark className="w-4 h-4 mb-1 text-purple-600" />
                    Module Indépendant
                    <span className="block text-[10px] font-normal text-slate-500 mt-0.5">
                      Immunologie, Microbiologie, Pharmacologie, Parasitologie
                    </span>
                  </button>
                </div>
              </div>

              {/* Dependent Select based on Target Type */}
              {targetType === 'unit' ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Sélectionner l'Unité d'Enseignement
                  </label>
                  <select
                    value={academicUnitId}
                    onChange={(e) => handleUnitSelect(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-teal-500 bg-white"
                  >
                    {academicUnits.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.code})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Sélectionner le Module Indépendant
                  </label>
                  <select
                    value={independentSubjectId}
                    onChange={(e) => handleIndependentSubjectSelect(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-purple-500 bg-white"
                  >
                    {subjects
                      .filter((s) => s.is_independent || !s.academic_unit_id)
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.code || 'MOD'})
                        </option>
                      ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Intitulé du contrôle
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Contrôle Semestriel – Unité 01 : Cardiovasculo-Pulmonaire"
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
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                    <span>Date d'examen</span>
                    <span className="text-[10px] text-slate-400 font-normal">Optionnel</span>
                  </label>
                  <input
                    type="date"
                    value={examDate}
                    onChange={(e) => setExamDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Laissez vide pour "Date à définir".
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Heure / Plage
                  </label>
                  <input
                    type="text"
                    value={examTime}
                    onChange={(e) => setExamTime(e.target.value)}
                    placeholder="Ex: 08h30 - 10h30"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                  />
                </div>

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
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
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
                    placeholder="Ex: Amphithéâtre Laennec"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Notes & Modalités (Optionnel)
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: Contrôle unifié couvrant Biochimie, Physiopathologie, Radiologie, Sémiologie et Psychologie Médicale (QCM + Cas Cliniques)."
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-teal-500 resize-none"
                />
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
                  {editingExamId ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4 stroke-[3]" />}
                  {isSubmitting ? 'Enregistrement...' : editingExamId ? 'Mettre à jour' : 'Ajouter le contrôle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
