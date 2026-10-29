'use client';

import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Download,
  Check,
  RefreshCw,
  Layers,
  Calendar,
  SlidersHorizontal,
} from 'lucide-react';
import {
  parseCurriculumCSV,
  parseExamsCSV,
  parseRawCSVHeadersAndRows,
  autoDetectColumnMapping,
  generateCurriculumCSVTemplate,
  generateExamsCSVTemplate,
  exportCurriculumToCSV,
  exportExamsToCSV,
  ColumnMapping,
} from '@/lib/services/import-parser';
import {
  ImportValidationResult,
  ExamImportValidationResult,
  SubjectWithUnits,
  Exam,
} from '@/lib/types/database';
import { CohortService } from '@/lib/services/cohort-service';

export function CsvImportView() {
  const [activeTab, setActiveTab] = useState<'curriculum' | 'exams'>('curriculum');
  const [existingCurriculum, setExistingCurriculum] = useState<SubjectWithUnits[]>([]);
  const [existingExams, setExistingExams] = useState<Exam[]>([]);

  // Curriculum states
  const [csvContent, setCsvContent] = useState<string>('');
  const [detectedHeaders, setDetectedHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    subject_name: '',
    unit_name: '',
    lesson_title: '',
    difficulty: '',
    estimated_minutes: '',
    revision_target: '',
    semester: '',
    notes: '',
  });
  const [showMappingConfig, setShowMappingConfig] = useState<boolean>(false);
  const [validationResult, setValidationResult] = useState<ImportValidationResult | null>(null);
  const [filterPreview, setFilterPreview] = useState<'all' | 'valid' | 'invalid'>('all');

  // Exam import states
  const [examCsvContent, setExamCsvContent] = useState<string>('');
  const [examValidationResult, setExamValidationResult] = useState<ExamImportValidationResult | null>(null);

  // Status & Confirmation
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [importSuccessMessage, setImportSuccessMessage] = useState<string | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState<boolean>(false);

  useEffect(() => {
    Promise.all([
      CohortService.getCurriculumTree(),
      CohortService.getExams(),
    ]).then(([curriculum, exams]) => {
      setExistingCurriculum(curriculum);
      setExistingExams(exams);
    });
  }, []);

  // Update curriculum validation on content or mapping change
  const handleCurriculumTextChange = (text: string, customMap?: ColumnMapping) => {
    setCsvContent(text);
    setImportSuccessMessage(null);

    if (text.trim().length > 10) {
      const { headers } = parseRawCSVHeadersAndRows(text);
      setDetectedHeaders(headers);

      const mappingToUse = customMap || {
        ...autoDetectColumnMapping(headers),
        ...columnMapping,
      };
      setColumnMapping(mappingToUse);

      const res = parseCurriculumCSV(text, mappingToUse, existingCurriculum);
      setValidationResult(res);
    } else {
      setDetectedHeaders([]);
      setValidationResult(null);
    }
  };

  const handleUpdateMappingField = (field: keyof ColumnMapping, headerCol: string) => {
    const updated = { ...columnMapping, [field]: headerCol };
    setColumnMapping(updated);
    if (csvContent.trim().length > 10) {
      const res = parseCurriculumCSV(csvContent, updated, existingCurriculum);
      setValidationResult(res);
    }
  };

  // Exam text change
  const handleExamTextChange = (text: string) => {
    setExamCsvContent(text);
    setImportSuccessMessage(null);
    if (text.trim().length > 10) {
      const res = parseExamsCSV(text);
      setExamValidationResult(res);
    } else {
      setExamValidationResult(null);
    }
  };

  // File Upload Handlers
  const handleCurriculumFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      handleCurriculumTextChange(content);
    };
    reader.readAsText(file);
  };

  const handleExamFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      handleExamTextChange(content);
    };
    reader.readAsText(file);
  };

  // Template Downloads
  const handleDownloadCurriculumTemplate = () => {
    const template = generateCurriculumCSVTemplate();
    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'modele_curriculum_medecine.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadExamTemplate = () => {
    const template = generateExamsCSVTemplate();
    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'modele_examens_medecine.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Current Database Exports
  const handleExportCurrentCurriculum = () => {
    const csv = exportCurriculumToCSV(existingCurriculum);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `export_curriculum_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportCurrentExams = () => {
    const csv = exportExamsToCSV(existingExams);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `export_examens_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Samples
  const handleLoadSampleCurriculum = () => {
    const sample = generateCurriculumCSVTemplate();
    handleCurriculumTextChange(sample);
  };

  const handleLoadSampleExams = () => {
    const sample = generateExamsCSVTemplate();
    handleExamTextChange(sample);
  };

  // Execute Imports
  const handleExecuteCurriculumImport = async () => {
    if (!validationResult || validationResult.validRows === 0) return;

    try {
      setIsImporting(true);
      const validItems = validationResult.items
        .filter((item) => item.isValid)
        .map((item) => item.data);

      const res = await CohortService.importCurriculumRows(validItems);
      setImportSuccessMessage(
        `Importation réussie ! ${res.added} cours ont été intégrés ou mis à jour dans le curriculum partagé de la promotion.`
      );
      setCsvContent('');
      setValidationResult(null);
      setIsConfirmModalOpen(false);

      const fresh = await CohortService.getCurriculumTree();
      setExistingCurriculum(fresh);
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Erreur lors de l'importation");
    } finally {
      setIsImporting(false);
    }
  };

  const handleExecuteExamImport = async () => {
    if (!examValidationResult || examValidationResult.validRows === 0) return;

    try {
      setIsImporting(true);
      const validItems = examValidationResult.items
        .filter((item) => item.isValid)
        .map((item) => item.data);

      const res = await CohortService.importExams(validItems);
      setImportSuccessMessage(
        `Importation réussie ! ${res.added} épreuves ont été ajoutées au calendrier de la promotion.`
      );
      setExamCsvContent('');
      setExamValidationResult(null);
      setIsConfirmModalOpen(false);

      const freshEx = await CohortService.getExams();
      setExistingExams(freshEx);
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Erreur lors de l'importation des examens");
    } finally {
      setIsImporting(false);
    }
  };

  const filteredCurriculumItems = validationResult?.items.filter((item) => {
    if (filterPreview === 'valid') return item.isValid;
    if (filterPreview === 'invalid') return !item.isValid;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-800 via-slate-900 to-slate-950 rounded-3xl p-6 sm:p-8 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 border border-teal-400/30 text-teal-200 text-xs font-semibold mb-3">
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Module d'Administration • Importation & Exportation
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Importateur de Données Académiques
          </h1>
          <p className="text-teal-100/90 text-xs sm:text-sm max-w-2xl mt-1.5 leading-relaxed">
            Chargez en masse votre curriculum (Matières, Unités, Cours) ou vos dates d'examens depuis Excel, CSV ou tableau d'affichage avec détection de doublons et mapping personnalisé.
          </p>
        </div>

        {/* Global Export Buttons */}
        <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
          <button
            onClick={activeTab === 'curriculum' ? handleExportCurrentCurriculum : handleExportCurrentExams}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-200 bg-white/10 hover:bg-white/20 border border-white/15 transition-colors"
            title="Exporter les données actuelles de la base"
          >
            <Download className="w-4 h-4" />
            Exporter {activeTab === 'curriculum' ? 'le Curriculum' : 'les Examens'} (CSV)
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => {
            setActiveTab('curriculum');
            setImportSuccessMessage(null);
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'curriculum'
              ? 'bg-teal-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-4 h-4" />
          Import Curriculum (Matières, Unités, Cours)
        </button>
        <button
          onClick={() => {
            setActiveTab('exams');
            setImportSuccessMessage(null);
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'exams'
              ? 'bg-teal-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Import Calendrier Examens
        </button>
      </div>

      {/* Success Notification */}
      {importSuccessMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-900 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="text-sm font-semibold">{importSuccessMessage}</span>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 1: CURRICULUM IMPORT                                            */}
      {/* =================================================================== */}
      {activeTab === 'curriculum' && (
        <div className="space-y-6">
          {/* Action Row */}
          <div className="flex items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex-wrap">
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadCurriculumTemplate}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                Modèle CSV
              </button>
              <button
                onClick={handleLoadSampleCurriculum}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5 text-teal-600" />
                Charger Exemple Médical
              </button>
            </div>

            {detectedHeaders.length > 0 && (
              <button
                onClick={() => setShowMappingConfig(!showMappingConfig)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                  showMappingConfig
                    ? 'bg-teal-700 text-white'
                    : 'text-slate-700 bg-slate-100 hover:bg-slate-200'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                {showMappingConfig ? 'Masquer le mapping des colonnes' : 'Personnaliser le mapping des colonnes'}
              </button>
            )}
          </div>

          {/* Interactive Column Mapping Panel */}
          {showMappingConfig && detectedHeaders.length > 0 && (
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-teal-600" />
                    Correspondance des Colonnes Détectées
                  </h3>
                  <p className="text-xs text-slate-500">
                    Associez les colonnes de votre fichier aux champs attendus par Guidini.
                  </p>
                </div>
                <button
                  onClick={() => {
                    const auto = autoDetectColumnMapping(detectedHeaders);
                    handleCurriculumTextChange(csvContent, auto);
                  }}
                  className="text-xs text-teal-700 hover:underline font-semibold"
                >
                  Réinitialiser le mapping auto
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { field: 'subject_name', label: 'Nom du Module / Matière *' },
                  { field: 'unit_name', label: "Unité / Chapitre" },
                  { field: 'lesson_title', label: 'Titre du Cours *' },
                  { field: 'difficulty', label: 'Difficulté' },
                  { field: 'estimated_minutes', label: 'Durée (min)' },
                  { field: 'revision_target', label: 'Cible Révisions (Tours)' },
                  { field: 'semester', label: 'Semestre' },
                  { field: 'notes', label: 'Notes / Remarques' },
                ].map(({ field, label }) => (
                  <div key={field} className="bg-white p-2.5 rounded-xl border border-slate-200">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1 truncate">
                      {label}
                    </label>
                    <select
                      value={columnMapping[field as keyof ColumnMapping] || ''}
                      onChange={(e) =>
                        handleUpdateMappingField(field as keyof ColumnMapping, e.target.value)
                      }
                      className="w-full text-xs p-1.5 rounded-lg border border-slate-200 bg-slate-50 focus:outline-hidden focus:ring-1 focus:ring-teal-500"
                    >
                      <option value="">-- Ignorer / Non mappé --</option>
                      {detectedHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upload and Paste Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
              <div>
                <h3 className="font-semibold text-slate-900 text-sm mb-1">
                  Téléverser un fichier CSV ou TSV
                </h3>
                <p className="text-xs text-slate-500">
                  Accepte les exports Excel, Google Sheets, ou séparateurs virgule / point-virgule / tabulation.
                </p>
              </div>

              <label className="border-2 border-dashed border-slate-200 hover:border-teal-500 bg-slate-50 hover:bg-teal-50/30 rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors group">
                <Upload className="w-8 h-8 text-slate-400 group-hover:text-teal-600 mb-2 transition-colors" />
                <span className="text-xs font-semibold text-slate-700 group-hover:text-teal-800">
                  Glissez votre fichier ici ou cliquez
                </span>
                <span className="text-[11px] text-slate-400 mt-0.5">Formats .csv, .tsv, .txt</span>
                <input
                  type="file"
                  accept=".csv,.txt,.tsv"
                  onChange={handleCurriculumFileUpload}
                  className="hidden"
                />
              </label>

              <div className="p-3 bg-slate-50 rounded-xl text-[11px] text-slate-600 space-y-1">
                <span className="font-semibold block text-slate-800">Colonnes recommandées :</span>
                <div>• <code className="text-teal-700 font-mono">subject_name</code> (Matière / Module)</div>
                <div>• <code className="text-teal-700 font-mono">unit_name</code> (Unité / Chapitre)</div>
                <div>• <code className="text-teal-700 font-mono">lesson_title</code> (Titre du Cours)</div>
                <div>• <code className="text-teal-700 font-mono">difficulty</code> (Facile, Moyen, Difficile)</div>
                <div>• <code className="text-teal-700 font-mono">estimated_minutes</code> (ex: 60, 90)</div>
                <div>• <code className="text-teal-700 font-mono">revision_target</code> (ex: 3 tours)</div>
              </div>
            </div>

            {/* Direct Paste Area */}
            <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
              <div>
                <h3 className="font-semibold text-slate-900 text-sm mb-1">
                  Collage direct de données (Presse-papier)
                </h3>
                <p className="text-xs text-slate-500">
                  Copiez directement des cellules depuis Microsoft Excel ou Google Sheets et collez-les ci-dessous.
                </p>
              </div>

              <textarea
                rows={9}
                value={csvContent}
                onChange={(e) => handleCurriculumTextChange(e.target.value)}
                placeholder={`subject_name,unit_name,lesson_title,difficulty,estimated_minutes,revision_target,semester,notes\nCardiologie & Vasculaire,Physiopathologie,Insuffisance Cardiaque,Difficile,90,3,S1,Classification NYHA\nPneumologie,Infectieux,Pneumonie Franche Lobaire Aiguë,Moyen,60,3,S1,Score CRB65`}
                className="w-full font-mono text-xs p-3.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-teal-500 bg-slate-50/50"
              />

              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">
                  {csvContent.length > 0 ? `${csvContent.split('\n').length} lignes saisies` : 'En attente de données'}
                </span>
                {csvContent && (
                  <button
                    onClick={() => handleCurriculumTextChange('')}
                    className="text-xs text-slate-500 hover:text-slate-800 underline"
                  >
                    Vider le contenu
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Validation & Preview Report */}
          {validationResult && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Rapport de Validation & Prévisualisation
                  </h2>
                  <p className="text-xs text-slate-500">
                    Vérification ligne par ligne avant injection dans la base de données de production
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    {validationResult.validRows} Valides
                  </div>
                  {validationResult.invalidRows > 0 && (
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 text-xs font-bold">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                      {validationResult.invalidRows} Erreurs
                    </div>
                  )}
                  {validationResult.duplicateRows > 0 && (
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      {validationResult.duplicateRows} Doublons
                    </div>
                  )}
                </div>
              </div>

              {/* Hierarchy Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
                  <span className="text-slate-500 font-medium block mb-1">Modules détectés :</span>
                  <span className="font-bold text-slate-900 text-lg">
                    {validationResult.detectedSubjects.length}
                  </span>
                  <p className="text-[11px] text-slate-500 mt-1 truncate">
                    {validationResult.detectedSubjects.join(', ')}
                  </p>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
                  <span className="text-slate-500 font-medium block mb-1">Unités détectées :</span>
                  <span className="font-bold text-slate-900 text-lg">
                    {validationResult.detectedUnits.length}
                  </span>
                  <p className="text-[11px] text-slate-500 mt-1 truncate">
                    Divisions pédagogiques
                  </p>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
                  <span className="text-slate-500 font-medium block mb-1">Cours valides à importer :</span>
                  <span className="font-bold text-teal-700 text-lg">
                    {validationResult.validRows}
                  </span>
                  <p className="text-[11px] text-slate-500 mt-1 truncate">
                    Séances médicales
                  </p>
                </div>
              </div>

              {/* Table Filters */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-1 text-xs">
                  <button
                    onClick={() => setFilterPreview('all')}
                    className={`px-2.5 py-1 rounded-lg font-semibold ${
                      filterPreview === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    Toutes les lignes ({validationResult.totalRows})
                  </button>
                  <button
                    onClick={() => setFilterPreview('valid')}
                    className={`px-2.5 py-1 rounded-lg font-semibold ${
                      filterPreview === 'valid' ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    Valides seulement ({validationResult.validRows})
                  </button>
                  {validationResult.invalidRows > 0 && (
                    <button
                      onClick={() => setFilterPreview('invalid')}
                      className={`px-2.5 py-1 rounded-lg font-semibold ${
                        filterPreview === 'invalid' ? 'bg-rose-700 text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      Erreurs seulement ({validationResult.invalidRows})
                    </button>
                  )}
                </div>

                <span className="text-xs text-slate-400">
                  Affichage de {filteredCurriculumItems?.length || 0} lignes
                </span>
              </div>

              {/* Preview Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <div className="max-h-80 overflow-y-auto">
                  <table className="min-w-full text-xs text-left">
                    <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 font-semibold text-slate-700">
                      <tr>
                        <th className="py-2.5 px-3">Ligne</th>
                        <th className="py-2.5 px-3">Statut</th>
                        <th className="py-2.5 px-3">Module</th>
                        <th className="py-2.5 px-3">Unité</th>
                        <th className="py-2.5 px-3">Cours</th>
                        <th className="py-2.5 px-3">Difficulté</th>
                        <th className="py-2.5 px-3">Durée</th>
                        <th className="py-2.5 px-3">Cible</th>
                        <th className="py-2.5 px-3">Détails / Erreurs</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredCurriculumItems?.map((item) => (
                        <tr
                          key={item.rowNumber}
                          className={item.isValid ? 'hover:bg-slate-50/50' : 'bg-rose-50/40'}
                        >
                          <td className="py-2 px-3 font-mono text-slate-400">#{item.rowNumber}</td>
                          <td className="py-2 px-3 whitespace-nowrap">
                            {item.isValid ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                <Check className="w-3 h-3" /> Valide
                              </span>
                            ) : item.isDuplicate ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                <AlertTriangle className="w-3 h-3" /> Doublon
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                                <AlertTriangle className="w-3 h-3" /> Erreur
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 font-medium text-slate-800">
                            {item.data.subject_name || <span className="text-rose-500 italic">Manquant</span>}
                          </td>
                          <td className="py-2 px-3 text-slate-600">{item.data.unit_name || item.data.unit_title}</td>
                          <td className="py-2 px-3 font-semibold text-slate-900">
                            {item.data.lesson_title || <span className="text-rose-500 italic">Manquant</span>}
                          </td>
                          <td className="py-2 px-3 text-slate-600">{item.data.difficulty}</td>
                          <td className="py-2 px-3 text-slate-600">{item.data.estimated_minutes} min</td>
                          <td className="py-2 px-3 text-slate-600">{item.data.revision_target} tours</td>
                          <td className="py-2 px-3 text-xs">
                            {item.errors.length > 0 ? (
                              <span className={item.isValid ? 'text-amber-700' : 'text-rose-600 font-medium'}>
                                {item.errors.join(' | ')}
                              </span>
                            ) : (
                              <span className="text-slate-400">Prêt à importer</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => {
                    setCsvContent('');
                    setValidationResult(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100"
                >
                  Réinitialiser
                </button>
                <button
                  onClick={() => setIsConfirmModalOpen(true)}
                  disabled={isImporting || validationResult.validRows === 0}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 shadow-sm transition-colors disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Importer {validationResult.validRows} cours valides
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 2: EXAMS IMPORT                                                 */}
      {/* =================================================================== */}
      {activeTab === 'exams' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex-wrap">
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadExamTemplate}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                Modèle CSV Examens
              </button>
              <button
                onClick={handleLoadSampleExams}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5 text-teal-600" />
                Charger Exemple Épreuves
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
              <div>
                <h3 className="font-semibold text-slate-900 text-sm mb-1">
                  Téléverser un fichier Examens
                </h3>
                <p className="text-xs text-slate-500">
                  Accepte les exports Excel ou fichiers texte avec colonnes titre, date, type et coefficient.
                </p>
              </div>

              <label className="border-2 border-dashed border-slate-200 hover:border-teal-500 bg-slate-50 hover:bg-teal-50/30 rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors group">
                <Upload className="w-8 h-8 text-slate-400 group-hover:text-teal-600 mb-2 transition-colors" />
                <span className="text-xs font-semibold text-slate-700 group-hover:text-teal-800">
                  Glissez le fichier examens ici
                </span>
                <span className="text-[11px] text-slate-400 mt-0.5">Formats .csv, .tsv, .txt</span>
                <input
                  type="file"
                  accept=".csv,.txt,.tsv"
                  onChange={handleExamFileUpload}
                  className="hidden"
                />
              </label>

              <div className="p-3 bg-slate-50 rounded-xl text-[11px] text-slate-600 space-y-1">
                <span className="font-semibold block text-slate-800">Colonnes reconnues :</span>
                <div>• <code className="text-teal-700 font-mono">title</code> (Intitulé de l'épreuve)</div>
                <div>• <code className="text-teal-700 font-mono">exam_type</code> (Contrôle Continu, Examen Final)</div>
                <div>• <code className="text-teal-700 font-mono">exam_date</code> (AAAA-MM-JJ)</div>
                <div>• <code className="text-teal-700 font-mono">location</code> (Amphithéâtre, Salle)</div>
                <div>• <code className="text-teal-700 font-mono">coefficient</code> (ex: 1.5, 2.0)</div>
                <div>• <code className="text-teal-700 font-mono">subjects_covered</code> (Modules séparés par ;)</div>
              </div>
            </div>

            <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
              <div>
                <h3 className="font-semibold text-slate-900 text-sm mb-1">
                  Collage direct des examens
                </h3>
                <p className="text-xs text-slate-500">
                  Collez directement votre planning d'évaluations universitaires.
                </p>
              </div>

              <textarea
                rows={9}
                value={examCsvContent}
                onChange={(e) => handleExamTextChange(e.target.value)}
                placeholder={`title,exam_type,exam_date,location,coefficient,subjects_covered\nPartiel de Cardiologie,Contrôle Continu,2026-11-20,Amphi Pasteur,1.5,Cardiologie & Vasculaire\nExamen de Synthèse S1,Examen Final,2027-01-15,Hall B,3.0,Cardiologie & Vasculaire; Pneumologie`}
                className="w-full font-mono text-xs p-3.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-teal-500 bg-slate-50/50"
              />

              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">
                  {examCsvContent.length > 0 ? `${examCsvContent.split('\n').length} lignes saisies` : 'En attente de données'}
                </span>
                {examCsvContent && (
                  <button
                    onClick={() => handleExamTextChange('')}
                    className="text-xs text-slate-500 hover:text-slate-800 underline"
                  >
                    Vider le contenu
                  </button>
                )}
              </div>
            </div>
          </div>

          {examValidationResult && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Rapport de Validation des Examens
                  </h2>
                  <p className="text-xs text-slate-500">
                    {examValidationResult.validRows} épreuves valides sur {examValidationResult.totalRows}
                  </p>
                </div>
                <button
                  onClick={() => setIsConfirmModalOpen(true)}
                  disabled={isImporting || examValidationResult.validRows === 0}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 shadow-sm transition-colors disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Importer {examValidationResult.validRows} épreuves
                </button>
              </div>

              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="min-w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-700">
                    <tr>
                      <th className="py-2.5 px-3">Ligne</th>
                      <th className="py-2.5 px-3">Statut</th>
                      <th className="py-2.5 px-3">Intitulé</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Coeff.</th>
                      <th className="py-2.5 px-3">Modules couverts</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {examValidationResult.items.map((item) => (
                      <tr key={item.rowNumber} className={item.isValid ? '' : 'bg-rose-50/40'}>
                        <td className="py-2 px-3 font-mono text-slate-400">#{item.rowNumber}</td>
                        <td className="py-2 px-3">
                          {item.isValid ? (
                            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 font-semibold">
                              Valide
                            </span>
                          ) : (
                            <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200 font-semibold">
                              Erreur
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 font-semibold text-slate-900">{item.data.title}</td>
                        <td className="py-2 px-3 text-slate-600">{item.data.exam_type}</td>
                        <td className="py-2 px-3 text-slate-600">{item.data.exam_date}</td>
                        <td className="py-2 px-3 text-slate-600">{item.data.coefficient}</td>
                        <td className="py-2 px-3 text-slate-600">{item.data.subjects_covered || 'Tronc Commun'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Explicit Confirmation Modal */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-lg font-bold text-slate-900">
                Confirmer l'importation en base
              </h3>
              <p className="text-xs text-slate-600">
                Vous vous apprêtez à injecter ces données dans le curriculum officiel de la cohorte.
              </p>
            </div>

            <div className="p-4 bg-teal-50/80 border border-teal-200 rounded-2xl text-xs text-teal-950 space-y-1.5">
              <span className="font-bold block">Garantie d'intégrité étudiante :</span>
              <p>
                • Les cours existants sont mis à jour sans écraser leur identifiant.
              </p>
              <p>
                • La progression et les séances de révisions individuelles de chaque étudiant restent intactes.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={isImporting}
                onClick={
                  activeTab === 'curriculum'
                    ? handleExecuteCurriculumImport
                    : handleExecuteExamImport
                }
                className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-xs transition-colors disabled:opacity-50"
              >
                {isImporting ? 'Injection en cours...' : 'Confirmer et Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
