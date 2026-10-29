import Papa from 'papaparse';
import {
  CurriculumImportRow,
  ImportValidationResult,
  ImportValidationItem,
  ExamImportValidationResult,
  ExamImportValidationItem,
  LessonDifficulty,
  SubjectWithUnits,
  Exam,
} from '@/lib/types/database';

export interface ColumnMapping {
  subject_name: string;
  unit_name: string;
  lesson_title: string;
  difficulty: string;
  estimated_minutes: string;
  revision_target: string;
  semester: string;
  notes: string;
}

/**
 * Normalizes difficulty text from French or English inputs
 */
export function normalizeDifficulty(input?: string): LessonDifficulty {
  if (!input) return 'Moyen';
  const clean = input.trim().toLowerCase();
  if (
    clean.includes('très') ||
    clean.includes('tres') ||
    clean.includes('expert') ||
    clean.includes('hardest') ||
    clean.includes('tres difficile')
  ) {
    return 'Très Difficile';
  }
  if (clean.includes('diff') || clean.includes('hard') || clean.includes('complexe')) {
    return 'Difficile';
  }
  if (clean.includes('facil') || clean.includes('easy') || clean.includes('simple')) {
    return 'Facile';
  }
  return 'Moyen';
}

/**
 * Inspects raw headers and auto-maps them to internal fields
 */
export function autoDetectColumnMapping(headers: string[]): ColumnMapping {
  const findMatch = (candidates: string[]): string => {
    for (const c of candidates) {
      const match = headers.find(
        (h) => h.toLowerCase().trim().replace(/[\s_-]+/g, '_') === c.toLowerCase()
      );
      if (match) return match;
    }
    for (const c of candidates) {
      const partial = headers.find((h) => h.toLowerCase().includes(c.toLowerCase()));
      if (partial) return partial;
    }
    return '';
  };

  return {
    subject_name: findMatch(['subject_name', 'matiere', 'matière', 'module', 'subject', 'discipline']),
    unit_name: findMatch(['unit_name', 'unit_title', 'unite', 'unité', 'ue', 'chapitre', 'theme', 'thème', 'unit']),
    lesson_title: findMatch(['lesson_title', 'cours', 'titre', 'lesson', 'title', 'seance', 'séance']),
    difficulty: findMatch(['difficulty', 'difficulte', 'difficulté', 'niveau', 'level']),
    estimated_minutes: findMatch(['estimated_minutes', 'estimated_duration_min', 'duree_minutes', 'duree', 'durée', 'duration', 'temps']),
    revision_target: findMatch(['revision_target', 'target', 'objectif_revisions', 'tours', 'passes', 'cible']),
    semester: findMatch(['semester', 'semestre', 'periode']),
    notes: findMatch(['notes', 'remarques', 'objectifs', 'description', 'commentaires']),
  };
}

/**
 * Parses raw CSV/TSV text and returns raw headers plus row data
 */
export function parseRawCSVHeadersAndRows(csvText: string): { headers: string[]; rows: Record<string, any>[] } {
  const result = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: 'greedy',
  });

  const headers = result.meta.fields || [];
  const rows = (result.data as Record<string, any>[]).filter((r) =>
    Object.values(r).some((v) => String(v || '').trim().length > 0)
  );

  return { headers, rows };
}

/**
 * Parses CSV or tab-delimited text into structured CurriculumImportRow objects with full validation,
 * customizable column mapping, and duplicate detection.
 */
export function parseCurriculumCSV(
  csvText: string,
  customMapping?: Partial<ColumnMapping>,
  existingCurriculum?: SubjectWithUnits[]
): ImportValidationResult {
  const { headers, rows } = parseRawCSVHeadersAndRows(csvText);
  const mapping: ColumnMapping = {
    ...autoDetectColumnMapping(headers),
    ...(customMapping || {}),
  };

  const validationItems: ImportValidationItem[] = [];
  const subjectsSet = new Set<string>();
  const unitsSet = new Set<string>();
  const lessonsSet = new Set<string>();

  // Map to track duplicates within this file batch
  const seenLessonKeys = new Map<string, number>();

  // Flatten existing lessons for external duplicate detection
  const existingLessonsMap = new Set<string>();
  if (existingCurriculum) {
    existingCurriculum.forEach((s) => {
      s.units.forEach((u) => {
        u.lessons.forEach((l) => {
          existingLessonsMap.add(
            `${s.name.trim().toLowerCase()}|||${u.title.trim().toLowerCase()}|||${l.title.trim().toLowerCase()}`
          );
        });
      });
    });
  }

  let duplicateCount = 0;

  rows.forEach((row, idx) => {
    const rowNumber = idx + 2; // Header is line 1
    const errors: string[] = [];

    const subjectName = (
      (mapping.subject_name ? row[mapping.subject_name] : '') ||
      row.subject_name ||
      row.matiere ||
      row.module ||
      ''
    ).trim();

    const unitTitle = (
      (mapping.unit_name ? row[mapping.unit_name] : '') ||
      row.unit_name ||
      row.unit_title ||
      row.unite ||
      row.chapitre ||
      'Unité Générale'
    ).trim();

    const lessonTitle = (
      (mapping.lesson_title ? row[mapping.lesson_title] : '') ||
      row.lesson_title ||
      row.cours ||
      row.titre ||
      ''
    ).trim();

    const difficultyRaw = (
      (mapping.difficulty ? row[mapping.difficulty] : '') ||
      row.difficulty ||
      row.difficulte ||
      'Moyen'
    ).trim();

    const durationRaw = (mapping.estimated_minutes ? row[mapping.estimated_minutes] : '') ||
      row.estimated_minutes ||
      row.estimated_duration_min ||
      row.duree ||
      60;

    const revisionTargetRaw = (mapping.revision_target ? row[mapping.revision_target] : '') ||
      row.revision_target ||
      3;

    const semester = (
      (mapping.semester ? row[mapping.semester] : '') ||
      row.semester ||
      row.semestre ||
      'S1'
    ).trim();

    const notes = (
      (mapping.notes ? row[mapping.notes] : '') ||
      row.notes ||
      row.remarques ||
      ''
    ).trim();

    // 1. Required field validations
    if (!subjectName) {
      errors.push('Le nom du module/matière est obligatoire.');
    }
    if (!lessonTitle) {
      errors.push('Le titre du cours/séance est obligatoire.');
    }

    // 2. Duration validation
    const durationNum = parseInt(String(durationRaw).replace(/\D+/g, ''), 10);
    if (isNaN(durationNum) || durationNum <= 0) {
      errors.push('La durée estimée doit être un nombre positif en minutes (ex: 60, 90).');
    }

    // 3. Revision Target validation
    const revNum = parseInt(String(revisionTargetRaw).replace(/\D+/g, ''), 10);
    const validRevTarget = isNaN(revNum) || revNum <= 0 ? 3 : Math.min(revNum, 10);

    // 4. Duplicate checks
    let isDuplicate = false;
    const lessonCompoundKey = `${subjectName.toLowerCase()}|||${unitTitle.toLowerCase()}|||${lessonTitle.toLowerCase()}`;

    if (subjectName && lessonTitle) {
      if (seenLessonKeys.has(lessonCompoundKey)) {
        isDuplicate = true;
        duplicateCount++;
        errors.push(`Doublon détecté : Ce cours apparaît déjà à la ligne #${seenLessonKeys.get(lessonCompoundKey)}.`);
      } else {
        seenLessonKeys.set(lessonCompoundKey, rowNumber);
      }

      if (existingLessonsMap.has(lessonCompoundKey)) {
        isDuplicate = true;
        // Non-blocking note or warning
        errors.push('Attention : Ce cours existe déjà dans le curriculum actuel (il sera mis à jour).');
      }
    }

    const difficulty = normalizeDifficulty(difficultyRaw);

    const importRow: CurriculumImportRow = {
      subject_name: subjectName,
      unit_name: unitTitle,
      unit_title: unitTitle,
      lesson_title: lessonTitle,
      difficulty,
      estimated_minutes: isNaN(durationNum) ? 60 : durationNum,
      estimated_duration_min: isNaN(durationNum) ? 60 : durationNum,
      revision_target: validRevTarget,
      semester,
      notes,
    };

    if (subjectName) subjectsSet.add(subjectName);
    if (unitTitle) unitsSet.add(`${subjectName} > ${unitTitle}`);
    if (lessonTitle) lessonsSet.add(lessonTitle);

    validationItems.push({
      rowNumber,
      data: importRow,
      isValid: errors.length === 0 || (errors.length === 1 && errors[0].startsWith('Attention :')),
      isDuplicate,
      errors,
    });
  });

  const validRows = validationItems.filter((i) => i.isValid).length;
  const invalidRows = validationItems.length - validRows;

  return {
    totalRows: validationItems.length,
    validRows,
    invalidRows,
    duplicateRows: duplicateCount,
    items: validationItems,
    detectedSubjects: Array.from(subjectsSet),
    detectedUnits: Array.from(unitsSet),
    detectedLessons: Array.from(lessonsSet),
  };
}

/**
 * Parses and validates an Exam CSV/TSV file
 */
export function parseExamsCSV(csvText: string): ExamImportValidationResult {
  const result = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (header: string) => header.trim().toLowerCase().replace(/[\s_-]+/g, '_'),
  });

  const rawRows = result.data as Record<string, any>[];
  const validationItems: ExamImportValidationItem[] = [];

  rawRows.forEach((row, idx) => {
    const rowNumber = idx + 2;
    const errors: string[] = [];

    const title = (row.title || row.titre || row.nom || row.examen || row.epreuve || '').trim();
    const examTypeRaw = (row.exam_type || row.type || row.nature || 'Contrôle Continu').trim();
    const dateRaw = (row.exam_date || row.date || row.date_examen || '').trim();
    const location = (row.location || row.salle || row.amphi || row.lieu || 'Amphithéâtre').trim();
    const coeffRaw = row.coefficient || row.coeff || 1.5;
    const subjectsCovered = (row.subjects_covered || row.matieres || row.modules || row.matiere || '').trim();

    if (!title) {
      errors.push("L'intitulé de l'épreuve est obligatoire.");
    }

    if (!dateRaw) {
      errors.push('La date de l\'examen est obligatoire.');
    } else {
      const parsedDate = new Date(dateRaw);
      if (isNaN(parsedDate.getTime())) {
        errors.push('Format de date invalide (utilisez AAAA-MM-JJ ou JJ/MM/AAAA).');
      }
    }

    const coeff = parseFloat(String(coeffRaw));
    if (isNaN(coeff) || coeff <= 0) {
      errors.push('Le coefficient doit être un nombre positif (ex: 1, 1.5, 2).');
    }

    let examType = 'Contrôle Continu';
    const lowerType = examTypeRaw.toLowerCase();
    if (lowerType.includes('final') || lowerType.includes('partiel') || lowerType.includes('synthèse')) {
      examType = 'Examen Final';
    } else if (lowerType.includes('rattrapage')) {
      examType = 'Rattrapage';
    } else if (lowerType.includes('tp') || lowerType.includes('stage')) {
      examType = 'TP/Stage';
    }

    validationItems.push({
      rowNumber,
      data: {
        title,
        exam_type: examType,
        exam_date: dateRaw,
        location,
        coefficient: isNaN(coeff) ? 1.5 : coeff,
        subjects_covered: subjectsCovered,
      },
      isValid: errors.length === 0,
      errors,
    });
  });

  const validRows = validationItems.filter((i) => i.isValid).length;

  return {
    totalRows: validationItems.length,
    validRows,
    invalidRows: validationItems.length - validRows,
    items: validationItems,
  };
}

/**
 * Generates sample CSV template for downloadable medical curriculum
 */
export function generateCurriculumCSVTemplate(): string {
  return `subject_name,unit_name,lesson_title,difficulty,estimated_minutes,revision_target,semester,notes
Cardiologie & Vasculaire,Physiopathologie Cardiovasculaire,Insuffisance Cardiaque Aiguë et Chronique,Difficile,90,3,S1,Classification NYHA et critères de Framingham
Cardiologie & Vasculaire,Physiopathologie Cardiovasculaire,Hypertension Artérielle de l'adulte (HTA),Moyen,60,3,S1,Recommandations ESC/ESH et complications cibles
Cardiologie & Vasculaire,Physiopathologie Cardiovasculaire,Syndromes Coronariens Aigus (SCA ST+ et ST-),Très Difficile,120,4,S1,ECG en urgence et cinétique troponine
Cardiologie & Vasculaire,Rythmologie & Valvulopathies,Fibrillation Atriale (FA) et Flutter,Difficile,75,3,S1,Score CHA2DS2-VASc et anticoagulation
Pneumologie,Pathologies Obstructives,Asthme aigu grave et traitement de fond,Moyen,60,3,S1,Paliers GINA et crise sévère
Pneumologie,Pathologies Obstructives,Bronchopneumopathie Chronique Obstructive (BPCO),Difficile,80,3,S1,EFR et classification GOLD
Neurologie,Urgences Cérébro-vasculaires,Accidents Vasculaires Cérébraux (AVC),Très Difficile,110,4,S1,Filière d'alerte et thrombolyse
Pharmacologie Médicale,Classes Majeures,Antibiothérapie et Résistances Bactériennes,Difficile,90,3,S1,Bêta-lactamines et toxicité rénale
`;
}

/**
 * Generates sample CSV template for downloadable exams
 */
export function generateExamsCSVTemplate(): string {
  return `title,exam_type,exam_date,location,coefficient,subjects_covered
Contrôle Continu Cardiologie (QCM + Cas Clinique),Contrôle Continu,2026-11-15,Amphithéâtre Pasteur,1.5,Cardiologie & Vasculaire
Épreuve Écrite de Pneumologie,Contrôle Continu,2026-11-28,Hall des Examens B,1.5,Pneumologie
Examen Final de Synthèse Clinique S1,Examen Final,2027-01-18,Grand Amphithéâtre,3.0,Cardiologie & Vasculaire; Pneumologie; Neurologie
Épreuve Pratique / TP Pharmacologie,TP/Stage,2027-01-22,Laboratoire Central,1.0,Pharmacologie Médicale
`;
}

/**
 * Serializes the current curriculum tree into standard CSV format for export
 */
export function exportCurriculumToCSV(subjects: SubjectWithUnits[]): string {
  const rows: string[][] = [
    ['subject_name', 'unit_name', 'lesson_title', 'difficulty', 'estimated_minutes', 'revision_target', 'semester', 'notes'],
  ];

  subjects.forEach((s) => {
    s.units.forEach((u) => {
      u.lessons.forEach((l) => {
        rows.push([
          `"${s.name.replace(/"/g, '""')}"`,
          `"${u.title.replace(/"/g, '""')}"`,
          `"${l.title.replace(/"/g, '""')}"`,
          `"${l.difficulty}"`,
          String(l.estimated_duration_min || 60),
          String(l.revision_target || 3),
          `"${s.semester || 'S1'}"`,
          `"${(l.notes || '').replace(/"/g, '""')}"`,
        ]);
      });
    });
  });

  return rows.map((r) => r.join(',')).join('\n');
}

/**
 * Serializes exams into CSV format for export
 */
export function exportExamsToCSV(exams: Exam[]): string {
  const rows: string[][] = [
    ['title', 'exam_type', 'exam_date', 'location', 'coefficient', 'subjects_covered'],
  ];

  exams.forEach((e) => {
    rows.push([
      `"${e.title.replace(/"/g, '""')}"`,
      `"${e.exam_type}"`,
      e.exam_date ? e.exam_date.split('T')[0] : '',
      `"${(e.location || '').replace(/"/g, '""')}"`,
      String(e.coefficient || 1.0),
      `"${(e.subject_name || '').replace(/"/g, '""')}"`,
    ]);
  });

  return rows.map((r) => r.join(',')).join('\n');
}
