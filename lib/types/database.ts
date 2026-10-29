export type UserRole = 'admin' | 'student';

export type LessonDifficulty = 'Facile' | 'Moyen' | 'Difficile' | 'Très Difficile';

export type LessonStatus = 'not_started' | 'in_progress' | 'completed' | 'needs_revision';

export type ExamType = 'Examen Final' | 'Contrôle Continu' | 'Rattrapage' | 'TP/Stage';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  cohort_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Cohort {
  id: string;
  name: string;
  academic_year: string;
  study_year: string;
  semester: string;
  invite_code: string;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  member_count?: number;
}

export interface CohortMember {
  id: string;
  cohort_id: string;
  user_id: string;
  role: UserRole;
  joined_at: string;
  profile?: Profile;
}

export interface CohortInvite {
  id: string;
  cohort_id: string;
  code: string;
  max_uses: number | null;
  uses_count: number;
  expires_at: string | null;
  is_active: boolean;
  created_by?: string | null;
  created_at: string;
}

export interface Subject {
  id: string;
  cohort_id: string;
  name: string;
  code?: string;
  color: string;
  semester: string;
  display_order: number;
  is_archived?: boolean;
  created_at?: string;
  units_count?: number;
  lessons_count?: number;
}

export interface Unit {
  id: string;
  subject_id: string;
  title: string;
  display_order: number;
  is_archived?: boolean;
  created_at?: string;
  lessons_count?: number;
}

export interface Lesson {
  id: string;
  unit_id: string;
  title: string;
  display_order: number;
  difficulty: LessonDifficulty;
  estimated_duration_min: number;
  revision_target: number;
  notes?: string;
  is_archived?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Exam {
  id: string;
  cohort_id: string;
  subject_id?: string | null;
  subject_name?: string;
  subject_color?: string;
  title: string;
  exam_type: ExamType;
  exam_date: string; // ISO string
  location?: string;
  coefficient: number;
  is_archived?: boolean;
  created_at?: string;
  exam_subjects?: ExamSubject[];
  subject_ids?: string[]; // Multiple subjects covered
}

export interface ExamSubject {
  id: string;
  exam_id: string;
  subject_id: string;
  created_at?: string;
  subject?: Subject;
}

export interface LessonProgress {
  id: string;
  student_id: string;
  lesson_id: string;
  status: LessonStatus;
  confidence_score: number; // 1 to 5
  last_studied_at?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface StudySession {
  id: string;
  student_id: string;
  lesson_id: string;
  lesson_title?: string;
  subject_name?: string;
  session_date: string;
  duration_min: number;
  session_type: string;
  confidence_rating: number; // 1 to 5
  notes?: string | null;
  created_at?: string;
}

// Backwards-compatibility aliases
export type StudentLessonProgress = LessonProgress;
export type StudentRevisionSession = StudySession;

export interface LessonWithProgress extends Lesson {
  progress?: LessonProgress;
  unit_title?: string;
  subject_name?: string;
  subject_color?: string;
}

export interface UnitWithLessons extends Unit {
  lessons: LessonWithProgress[];
}

export interface SubjectWithUnits extends Subject {
  units: UnitWithLessons[];
}

export interface CurriculumImportRow {
  subject_name: string;
  unit_name?: string;
  unit_title?: string;
  lesson_title: string;
  difficulty?: string;
  estimated_minutes?: number | string;
  estimated_duration_min?: number | string;
  revision_target?: number | string;
  semester?: string;
  notes?: string;
}

export interface ExamImportRow {
  title: string;
  exam_type: string;
  exam_date: string;
  location?: string;
  coefficient?: number | string;
  subjects_covered?: string;
}

export interface ImportValidationItem {
  rowNumber: number;
  data: CurriculumImportRow;
  isValid: boolean;
  isDuplicate?: boolean;
  errors: string[];
}

export interface ImportValidationResult {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
  items: ImportValidationItem[];
  detectedSubjects: string[];
  detectedUnits: string[];
  detectedLessons: string[];
}

export interface ExamImportValidationItem {
  rowNumber: number;
  data: ExamImportRow;
  isValid: boolean;
  errors: string[];
}

export interface ExamImportValidationResult {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  items: ExamImportValidationItem[];
}
