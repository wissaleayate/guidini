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
  description: string;
  source_file: string;
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
 * Strips file extensions (.pdf, .pptx, etc.) and extracts canonical title and source file reference.
 * Prevents PDF, PPT, DOCX versions of the same lesson from being treated as separate lessons.
 */
export function cleanLessonTitleAndSource(
  rawTitle: string,
  rawSource?: string
): { title: string; sourceFile?: string } {
  if (!rawTitle) return { title: '', sourceFile: rawSource };

  let title = rawTitle.trim();
  let detectedSource = rawSource?.trim() || '';

  // Match file extension at end of title: .pdf, .pptx, .ppt, .docx, .doc, .odt, .zip
  const extensionMatch = title.match(/\.(pdf|pptx?|docx?|odt|zip)$/i);
  if (extensionMatch) {
    if (!detectedSource) {
      detectedSource = title;
    }
    title = title.replace(/\.(pdf|pptx?|docx?|odt|zip)$/i, '').trim();
  }

  // Strip leading list numbers like "1. ", "01 - ", "1) " if present
  const numberedPrefix = title.match(/^\d+[\s.)\-–—]+\s*(.*)$/);
  if (numberedPrefix && numberedPrefix[1]) {
    title = numberedPrefix[1].trim();
  }

  // Normalize quotes and apostrophes to standard unicode
  title = title.replace(/[`´']/g, '’');

  return {
    title,
    sourceFile: detectedSource || undefined,
  };
}

/**
 * Normalized key for duplicate detection (preserves accent semantics, ignores case & punctuation spacing)
 */
export function getNormalizedLessonKey(subject: string, unit: string, title: string): string {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .trim()
      .replace(/[`´']/g, '’')
      .replace(/[\s\-_–—]+/g, ' ')
      .normalize('NFC');
  return `${norm(subject)}|||${norm(unit)}|||${norm(title)}`;
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
    unit_name: findMatch(['unit_name', 'unit_title', 'subcategory', 'sous_categorie', 'sous_catégorie', 'unite', 'unité', 'ue', 'chapitre', 'theme', 'thème', 'unit']),
    lesson_title: findMatch(['lesson_title', 'cours', 'titre', 'lesson', 'title', 'seance', 'séance']),
    difficulty: findMatch(['difficulty', 'difficulte', 'difficulté', 'niveau', 'level']),
    estimated_minutes: findMatch(['estimated_minutes', 'estimated_duration_min', 'duree_minutes', 'duree', 'durée', 'duration', 'temps']),
    revision_target: findMatch(['revision_target', 'target', 'objectif_revisions', 'tours', 'passes', 'cible']),
    semester: findMatch(['semester', 'semestre', 'periode']),
    notes: findMatch(['notes', 'remarques', 'objectifs', 'commentaires']),
    description: findMatch(['description', 'resume', 'résumé', 'details', 'détails']),
    source_file: findMatch(['source_file', 'source_file_ref', 'fichier', 'support', 'document', 'file', 'source']),
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

  // Map to track seen lessons within this file batch: key -> { rowNumber, rawTitle, sourceFile }
  const seenLessons = new Map<string, { rowNumber: number; rawTitle: string; sourceFile?: string }>();

  // Flatten existing lessons for external duplicate detection
  const existingLessonsMap = new Set<string>();
  if (existingCurriculum) {
    existingCurriculum.forEach((s) => {
      s.units.forEach((u) => {
        u.lessons.forEach((l) => {
          existingLessonsMap.add(getNormalizedLessonKey(s.name, u.title, l.title));
        });
      });
    });
  }

  let duplicateCount = 0;

  rows.forEach((row, idx) => {
    const rowNumber = idx + 2; // Header is line 1
    const errors: string[] = [];

    const rawSubject = (
      (mapping.subject_name ? row[mapping.subject_name] : '') ||
      row.subject_name ||
      row.matiere ||
      row.module ||
      ''
    ).trim();

    const rawUnit = (
      (mapping.unit_name ? row[mapping.unit_name] : '') ||
      row.unit_name ||
      row.unit_title ||
      row.subcategory ||
      row.unite ||
      row.chapitre ||
      'Générale'
    ).trim();

    const rawLessonTitle = (
      (mapping.lesson_title ? row[mapping.lesson_title] : '') ||
      row.lesson_title ||
      row.cours ||
      row.titre ||
      ''
    ).trim();

    const rawSourceFile = (
      (mapping.source_file ? row[mapping.source_file] : '') ||
      row.source_file ||
      row.source_file_ref ||
      row.fichier ||
      row.support ||
      ''
    ).trim();

    // Clean title and handle file extensions (e.g., .pdf, .pptx)
    const { title: lessonTitle, sourceFile } = cleanLessonTitleAndSource(rawLessonTitle, rawSourceFile);

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

    const description = (
      (mapping.description ? row[mapping.description] : '') ||
      row.description ||
      row.resume ||
      ''
    ).trim();

    // 1. Required field validations
    if (!rawSubject) {
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

    // 4. Duplicate checks & File Variant Detection
    let isDuplicate = false;
    const compoundKey = getNormalizedLessonKey(rawSubject, rawUnit, lessonTitle);

    if (rawSubject && lessonTitle) {
      if (seenLessons.has(compoundKey)) {
        isDuplicate = true;
        duplicateCount++;
        const prev = seenLessons.get(compoundKey)!;
        if (sourceFile && prev.sourceFile && sourceFile !== prev.sourceFile) {
          errors.push(
            `Variante de fichier détectée : Version ${sourceFile} vs ${prev.sourceFile} (ligne #${prev.rowNumber}). Ce cours sera consolidé sans créer de doublon.`
          );
        } else {
          errors.push(`Doublon détecté : Ce cours apparaît déjà à la ligne #${prev.rowNumber}.`);
        }
      } else {
        seenLessons.set(compoundKey, { rowNumber, rawTitle: lessonTitle, sourceFile });
      }

      if (existingLessonsMap.has(compoundKey)) {
        isDuplicate = true;
        errors.push('Attention : Ce cours existe déjà dans le curriculum actuel (il sera mis à jour de façon idempotente).');
      }
    }

    const difficulty = normalizeDifficulty(difficultyRaw);

    const importRow: CurriculumImportRow = {
      subject_name: rawSubject,
      unit_name: rawUnit,
      unit_title: rawUnit,
      subcategory: rawUnit,
      lesson_title: lessonTitle,
      difficulty,
      estimated_minutes: isNaN(durationNum) ? 60 : durationNum,
      estimated_duration_min: isNaN(durationNum) ? 60 : durationNum,
      revision_target: validRevTarget,
      semester,
      notes: notes || description,
      description: description || notes,
      source_file_ref: sourceFile,
      source_file: sourceFile,
      is_available: true,
    };

    if (rawSubject) subjectsSet.add(rawSubject);
    if (rawUnit) unitsSet.add(`${rawSubject} > ${rawUnit}`);
    if (lessonTitle) lessonsSet.add(lessonTitle);

    const isNonBlockingWarning = errors.every(
      (err) =>
        err.startsWith('Attention :') ||
        err.startsWith('Variante de fichier')
    );

    validationItems.push({
      rowNumber,
      data: importRow,
      isValid: errors.length === 0 || isNonBlockingWarning,
      isDuplicate,
      errors,
    });
  });

  const validRows = validationItems.filter((i) => i.isValid).length;

  return {
    totalRows: rows.length,
    validRows,
    invalidRows: rows.length - validRows,
    duplicateRows: duplicateCount,
    items: validationItems,
    detectedSubjects: Array.from(subjectsSet),
    detectedUnits: Array.from(unitsSet),
    detectedLessons: Array.from(lessonsSet),
  };
}

/**
 * Parses CSV text for exams
 */
export function parseExamsCSV(csvText: string): ExamImportValidationResult {
  const { rows } = parseRawCSVHeadersAndRows(csvText);
  const items: ExamImportValidationItem[] = [];

  rows.forEach((row, idx) => {
    const rowNumber = idx + 2;
    const errors: string[] = [];

    const title = (row.title || row.titre || row.nom || '').trim();
    const examTypeRaw = (row.exam_type || row.type || 'Contrôle Continu').trim();
    const examDateRaw = (row.exam_date || row.date || '').trim();
    const location = (row.location || row.salle || row.lieu || '').trim();
    const coeffRaw = row.coefficient || row.coeff || 1.5;
    const subjectsCovered = (row.subjects_covered || row.matieres || row.modules || '').trim();

    if (!title) errors.push('Le titre de l\'épreuve est obligatoire.');
    if (!examDateRaw) {
      errors.push('La date de l\'examen est obligatoire (format AAAA-MM-JJ).');
    } else {
      const parsedDate = new Date(examDateRaw);
      if (isNaN(parsedDate.getTime())) {
        errors.push('Date invalide. Utilisez le format AAAA-MM-JJ.');
      }
    }

    const coeffNum = parseFloat(String(coeffRaw).replace(',', '.'));
    const validCoeff = isNaN(coeffNum) || coeffNum <= 0 ? 1.0 : coeffNum;

    let validExamType: any = 'Contrôle Continu';
    const lowerType = examTypeRaw.toLowerCase();
    if (lowerType.includes('final') || lowerType.includes('partiel')) validExamType = 'Examen Final';
    else if (lowerType.includes('rattrapage')) validExamType = 'Rattrapage';
    else if (lowerType.includes('tp') || lowerType.includes('stage') || lowerType.includes('pratique')) validExamType = 'TP/Stage';

    const examRow: any = {
      title,
      exam_type: validExamType,
      exam_date: examDateRaw,
      location,
      coefficient: validCoeff,
      subjects_covered: subjectsCovered,
    };

    items.push({
      rowNumber,
      data: examRow,
      isValid: errors.length === 0,
      errors,
    });
  });

  const validRows = items.filter((i) => i.isValid).length;

  return {
    totalRows: rows.length,
    validRows,
    invalidRows: rows.length - validRows,
    items,
  };
}

/**
 * Official CSV content for Unit 01: Cardiovasculo-Pulmonaire (37 lessons across 5 modules)
 */
export function generateUnit01CurriculumCSV(): string {
  return `subject_name,unit_name,lesson_title,difficulty,estimated_minutes,revision_target,source_file,notes
Biochimie,Générale,Biochimie de l’homme sain,Moyen,60,3,Biochimie_Homme_Sain.pdf,Bases métaboliques et équilibre énergétique
Biochimie,Générale,Biomarqueurs cardiaques,Difficile,75,3,Biomarqueurs_Cardiaques.pdf,Troponines I et T, CPK-MB, BNP/NT-proBNP
Biochimie,Générale,Exploration des lipides et lipoprotéines – athérogenèse,Difficile,90,3,Exploration_Lipides_Atherogenese.pdf,Bilan lipidique et plaque d'athérome
Physiopathologie,Générale,Physiopathologie des troubles hydrosodés,Difficile,75,3,Physiopath_Troubles_Hydrosodes.pdf,Déshydratation et hyperhydratation intra et extracellulaire
Physiopathologie,Générale,Physiopathologie de la thermorégulation,Moyen,60,3,Physiopath_Thermoregulation.pdf,Thermolyse, thermogenèse, fièvre vs hyperthermie
Physiopathologie,Générale,Physiopathologie de la dénutrition,Moyen,60,3,Physiopath_Denutrition.pdf,Marasme, kwashiorkor et balance azotée négative
Physiopathologie,Cardio,État de choc hypovolémique,Difficile,80,3,Choc_Hypovolemique.pdf,Diminution du retour veineux et réponse sympathique
Physiopathologie,Cardio,Insuffisance cardiaque aiguë,Très Difficile,90,3,Insuffisance_Cardiaque_Aigue.pdf,OAP cardiogénique et pressions de remplissage
Physiopathologie,Cardio,Choc anaphylactique,Difficile,60,3,Choc_Anaphylactique.pdf,Hypersensibilité immédiate IgE, histamine et collapsus
Physiopathologie,Cardio,Choc septique,Très Difficile,90,3,Choc_Septique.pdf,Orage cytokinique et dysfonction d'organe
Radiologie,Générale,Généralités et principes de l’imagerie par rayons X,Moyen,60,3,Rayons_X_Principes.pdf,Production rayons X et les 4 densités fondamentales
Radiologie,Générale,Généralités et principes de l’imagerie ultrasonographique : échographie et écho-Doppler,Moyen,75,3,Echographie_EchoDoppler.pdf,Propagation ultrasons et Doppler vasculaire
Radiologie,Pneumo,Explorations en imagerie thoracique,Difficile,80,3,Imagerie_Thoracique.pdf,Radiographie pulmonaire et scanner thoracique
Radiologie,Pneumo,Syndromes thoraciques,Très Difficile,90,3,Syndromes_Thoraciques.pdf,Syndrome alvéolaire, atélectasie et épanchements
Sémiologie,Générale,Sémantique médicale,Facile,45,2,Semantique_Medicale.pdf,Vocabulaire sémiologique et signes fonctionnels
Sémiologie,Générale,Rédiger une observation médicale,Moyen,60,3,Observation_Medicale.pdf,Structure canonique de l'observation d'admission
Sémiologie,Générale,Raisonnement clinique,Moyen,60,3,Raisonnement_Clinique.pdf,Démarche diagnostique et regroupement syndromique
Sémiologie,Générale,Abord et examen clinique,Moyen,60,3,Abord_Examen_Clinique.pdf,Inspection, palpation, percussion et auscultation
Sémiologie,Générale,Sémiologie pondérale,Facile,45,2,Semiologie_Ponderale.pdf,IMC, dénutrition, œdèmes et variations pondérales
Sémiologie,Générale,Équilibre hydroélectrolytique,Difficile,75,3,Equilibre_Hydroelectrolytique.pdf,Signes cliniques de déshydratation
Sémiologie,Générale,Troubles hydroélectrolytiques – œdème,Difficile,80,3,Troubles_Hydroelectrolytiques_Oedeme.pdf,Œdèmes godet, causes cardiaques, hépatiques et rénales
Sémiologie,Cardio,Douleurs thoraciques,Difficile,75,3,Douleurs_Thoraciques_Cardio.pdf,Douleur angineuse et urgences vitales
Sémiologie,Cardio,Syncopes et lipothymies,Moyen,60,3,Syncopes_Lipothymies.pdf,Syncopes vagales vs d'origine cardiaque
Sémiologie,Cardio,SCA,Très Difficile,90,3,SCA_Semiologie.pdf,Syndromes coronariens aigus et corrélation clinique
Sémiologie,Cardio,Sémiologie vasculaire pathologique,Moyen,60,3,Semiologie_Vasculaire.pdf,AOMI et thrombose veineuse profonde
Sémiologie,Cardio,Examen cardiaque,Difficile,75,3,Examen_Cardiaque.pdf,Foyers d'auscultation, B1, B2 et souffles
Sémiologie,Cardio,ECG,Très Difficile,120,4,ECG_Bases_et_Pathologies.pdf,Interprétation méthodique de l'électrocardiogramme
Sémiologie,Pneumo,Douleurs thoraciques, vomique, dysphonie,Difficile,75,3,Douleurs_Thoraciques_Pneumo.pdf,Douleurs pleurales, vomique et dysphonie
Sémiologie,Pneumo,La toux – L’expectoration,Moyen,60,3,Toux_Expectoration.pdf,Toux sèche vs productive et expectorations
Psychologie Médicale,Générale,Psychologie de la prescription,Facile,45,2,Psycho_Prescription.pdf,Effets placebo/nocebo et observance
Psychologie Médicale,Générale,Examen clinique,Moyen,60,2,Examen_Clinique_Relation.pdf,Dimension relationnelle et pudeur du patient
Psychologie Médicale,Générale,Aspects communicationnels de la rencontre,Facile,45,2,Communication_Medecin_Malade.pdf,Écoute active et relation médecin-malade
Psychologie Médicale,Générale,Stress et maladies psychosomatiques,Moyen,60,3,Stress_Psychosomatique.pdf,Modèle de Selye et axe corticotrope
Psychologie Médicale,Générale,Fonctionnement de la personnalité,Moyen,60,3,Fonctionnement_Personnalite.pdf,Traits de personnalité et mécanismes de défense
Psychologie Médicale,Générale,Psychologie de la douleur,Moyen,60,3,Psychologie_Douleur.pdf,Composantes sensorielle et émotionnelle de la douleur
Psychologie Médicale,Générale,Problèmes particuliers de l’entrevue,Moyen,60,2,Entrevue_Difficile.pdf,Gestion des entretiens difficiles
Psychologie Médicale,Générale,L’annonce d’une maladie grave,Difficile,75,3,Annonce_Maladie_Grave.pdf,Protocole SPIKES et étapes du deuil
`;
}

/**
 * Generates sample CSV template for downloadable medical curriculum
 */
export function generateCurriculumCSVTemplate(): string {
  return generateUnit01CurriculumCSV();
}

/**
 * Generates sample CSV template for downloadable exams
 */
export function generateExamsCSVTemplate(): string {
  return `title,exam_type,exam_date,location,coefficient,subjects_covered
Contrôle Continu Sémiologie (Cardio-Pneumo),Contrôle Continu,2026-11-24,Amphithéâtre Laennec,2.0,Sémiologie
Épreuve Écrite Physiopathologie & Biochimie,Contrôle Continu,2026-12-05,Amphithéâtre Bichat,2.0,Physiopathologie; Biochimie
Examen Synthèse Intégrée Unité 01 (Écrit + ECOS),Examen Final,2026-12-19,Hall des Examens,4.0,Sémiologie; Physiopathologie; Radiologie; Biochimie; Psychologie Médicale
`;
}

/**
 * Serializes the current curriculum tree into standard CSV format for export
 */
export function exportCurriculumToCSV(subjects: SubjectWithUnits[]): string {
  const rows: string[][] = [
    ['subject_name', 'unit_name', 'lesson_title', 'difficulty', 'estimated_minutes', 'revision_target', 'semester', 'source_file', 'notes'],
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
          `"${(l.source_file_ref || '').replace(/"/g, '""')}"`,
          `"${(l.notes || l.description || '').replace(/"/g, '""')}"`,
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
    ['title', 'target_type', 'exam_type', 'exam_date', 'exam_time', 'location', 'coefficient', 'subjects_covered', 'notes'],
  ];

  exams.forEach((e) => {
    rows.push([
      `"${e.title.replace(/"/g, '""')}"`,
      `"${e.target_type || (e.academic_unit_id ? 'unit' : 'independent_module')}"`,
      `"${e.exam_type}"`,
      e.exam_date ? e.exam_date.split('T')[0] : '',
      `"${(e.exam_time || '').replace(/"/g, '""')}"`,
      `"${(e.location || '').replace(/"/g, '""')}"`,
      String(e.coefficient || 1.0),
      `"${(e.subject_name || e.academic_unit_name || '').replace(/"/g, '""')}"`,
      `"${(e.notes || '').replace(/"/g, '""')}"`,
    ]);
  });

  return rows.map((r) => r.join(',')).join('\n');
}
