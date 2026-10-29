import { createClient } from '@/lib/supabase/client';
import {
  Cohort,
  Subject,
  Unit,
  Lesson,
  Exam,
  LessonProgress,
  StudySession,
  SubjectWithUnits,
  CurriculumImportRow,
  ExamImportRow,
  LessonStatus,
  LessonDifficulty,
} from '@/lib/types/database';
import {
  INITIAL_COHORT,
  INITIAL_SUBJECTS,
  INITIAL_EXAMS,
  INITIAL_STUDENT_PROGRESS,
  INITIAL_REVISION_SESSIONS,
} from '@/lib/data/sample-data';

// Helper to prevent requests from hanging indefinitely
function withTimeout<T = any>(promise: PromiseLike<T> | Promise<T>, ms = 4000): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Supabase request timed out')), ms)
    ),
  ]);
}

// In-memory / session store when Supabase keys are not set up yet
let localCohort: Cohort = { ...INITIAL_COHORT };
let localSubjects: SubjectWithUnits[] = JSON.parse(JSON.stringify(INITIAL_SUBJECTS));
let localExams: Exam[] = JSON.parse(JSON.stringify(INITIAL_EXAMS));
const localProgress: Record<string, LessonProgress> = JSON.parse(JSON.stringify(INITIAL_STUDENT_PROGRESS));
const localRevisions: StudySession[] = JSON.parse(JSON.stringify(INITIAL_REVISION_SESSIONS));
const studentProgressStore: Record<string, Record<string, LessonProgress>> = {
  'demo-student-id': JSON.parse(JSON.stringify(INITIAL_STUDENT_PROGRESS)),
};

export class CohortService {
  /**
   * Fetch current cohort information with member count
   */
  static async getCohort(): Promise<Cohort> {
    const supabase = createClient();
    if (supabase) {
      try {
        const { data, error } = await withTimeout(
          supabase.from('cohorts').select('*').limit(1).single()
        );
        if (data && !error) {
          let memberCount = 0;
          try {
            const countMembers = await withTimeout(
              supabase.from('cohort_members').select('*', { count: 'exact', head: true }).eq('cohort_id', data.id)
            );
            if (countMembers.count !== null && countMembers.count !== undefined) {
              memberCount = countMembers.count;
            } else {
              const countProfiles = await withTimeout(
                supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('cohort_id', data.id)
              );
              memberCount = countProfiles.count || 0;
            }
          } catch {
            memberCount = 1;
          }

          return { ...data, member_count: memberCount };
        }
      } catch (err) {
        console.warn('Supabase fetch failed or timed out, using fallback cohort:', err);
      }
    }
    return localCohort;
  }

  /**
   * Update cohort metadata (Admin only)
   */
  static async updateCohort(updates: Partial<Cohort>): Promise<Cohort> {
    const supabase = createClient();
    if (supabase) {
      try {
        const { data, error } = await withTimeout(
          supabase
            .from('cohorts')
            .update(updates)
            .eq('id', localCohort.id)
            .select()
            .single()
        );
        if (data && !error) {
          localCohort = { ...localCohort, ...data };
          return localCohort;
        }
      } catch (err) {
        console.warn('Supabase update cohort failed:', err);
      }
    }
    localCohort = { ...localCohort, ...updates, updated_at: new Date().toISOString() };
    return localCohort;
  }

  /**
   * Fetch complete shared curriculum tree (Subjects -> Units -> Lessons)
   * with individual student progress attached if studentId is provided.
   */
  static async getCurriculumTree(studentId?: string): Promise<SubjectWithUnits[]> {
    const supabase = createClient();
    if (supabase) {
      try {
        const { data: subjectsData, error: subErr } = await withTimeout(
          supabase
            .from('subjects')
            .select('*, units(*, lessons(*))')
            .eq('is_archived', false)
            .order('display_order', { ascending: true })
        );

        if (subjectsData && !subErr && subjectsData.length > 0) {
          const progressMap: Record<string, LessonProgress> = {};
          if (studentId) {
            try {
              let progData: any[] | null = null;
              const res1 = await withTimeout(
                supabase
                  .from('lesson_progress')
                  .select('*')
                  .eq('student_id', studentId)
              );
              if (res1.data) {
                progData = res1.data;
              } else {
                const res2 = await withTimeout(
                  supabase
                    .from('student_lesson_progress')
                    .select('*')
                    .eq('student_id', studentId)
                );
                progData = res2.data;
              }

              if (progData) {
                progData.forEach((p: any) => {
                  progressMap[p.lesson_id] = p;
                });
              }
            } catch {
              // Ignore progress timeout, proceed with empty progress
            }
          }

          return subjectsData.map((s: any) => ({
            ...s,
            units: (s.units || [])
              .filter((u: any) => !u.is_archived)
              .sort((a: any, b: any) => a.display_order - b.display_order)
              .map((u: any) => ({
                ...u,
                lessons: (u.lessons || [])
                  .filter((l: any) => !l.is_archived)
                  .sort((a: any, b: any) => a.display_order - b.display_order)
                  .map((l: any) => ({
                    ...l,
                    revision_target: l.revision_target || 3,
                    subject_name: s.name,
                    subject_color: s.color,
                    unit_title: u.title,
                    progress: progressMap[l.id] || {
                      id: `temp-${l.id}`,
                      student_id: studentId || 'guest',
                      lesson_id: l.id,
                      status: 'not_started',
                      confidence_score: 3,
                    },
                  })),
              })),
          }));
        }
      } catch (err) {
        console.warn('Supabase curriculum fetch error or timeout, falling back:', err);
      }
    }

    // Fallback in-memory tree with student-isolated progress mapping
    const activeStudentId = studentId || 'demo-student-id';
    const sMap = studentProgressStore[activeStudentId] || (activeStudentId === 'demo-student-id' ? localProgress : {});

    return localSubjects
      .filter((s) => !s.is_archived)
      .map((s) => ({
        ...s,
        units: s.units
          .filter((u) => !u.is_archived)
          .map((u) => ({
            ...u,
            lessons: u.lessons
              .filter((l) => !l.is_archived)
              .map((l) => ({
                ...l,
                revision_target: l.revision_target || 3,
                subject_name: s.name,
                subject_color: s.color,
                unit_title: u.title,
                progress: sMap[l.id] || {
                  id: `temp-${l.id}`,
                  student_id: activeStudentId,
                  lesson_id: l.id,
                  status: 'not_started',
                  confidence_score: 3,
                },
              })),
          })),
      }));
  }

  /**
   * Fetch a single subject with units and lessons in order,
   * with the authenticated student's progress attached.
   */
  static async getSubjectById(subjectId: string, studentId?: string): Promise<SubjectWithUnits | null> {
    const fullTree = await this.getCurriculumTree(studentId);
    return fullTree.find((s) => s.id === subjectId) || null;
  }

  // =========================================================================
  // SUBJECT CRUD & REORDER
  // =========================================================================

  /**
   * Add a new subject (Admin only)
   */
  static async createSubject(name: string, code: string, color: string, semester: string): Promise<Subject> {
    const supabase = createClient();
    const displayOrder = localSubjects.length + 1;

    if (supabase) {
      try {
        const { data, error } = await withTimeout(
          supabase
            .from('subjects')
            .insert({
              cohort_id: localCohort.id,
              name: name.trim(),
              code: code?.trim() || null,
              color: color || '#0d9488',
              semester: semester || 'S1',
              display_order: displayOrder,
            })
            .select()
            .single()
        );
        if (data && !error) {
          const newSub: SubjectWithUnits = { ...data, units: [] };
          localSubjects.push(newSub);
          return data;
        }
      } catch (err) {
        console.warn('Supabase createSubject error:', err);
      }
    }

    const newSubject: SubjectWithUnits = {
      id: `sub-${Date.now()}`,
      cohort_id: localCohort.id,
      name: name.trim(),
      code: code?.trim(),
      color: color || '#0d9488',
      semester: semester || 'S1',
      display_order: displayOrder,
      units: [],
    };
    localSubjects.push(newSubject);
    return newSubject;
  }

  /**
   * Edit an existing subject (Admin only)
   */
  static async updateSubject(
    subjectId: string,
    updates: Partial<Pick<Subject, 'name' | 'code' | 'color' | 'semester' | 'display_order'>>
  ): Promise<void> {
    const supabase = createClient();
    if (supabase) {
      try {
        await withTimeout(
          supabase.from('subjects').update(updates).eq('id', subjectId)
        );
      } catch (err) {
        console.warn('Supabase updateSubject error:', err);
      }
    }

    const sub = localSubjects.find((s) => s.id === subjectId);
    if (sub) {
      Object.assign(sub, updates);
    }
  }

  /**
   * Delete a subject (Admin only)
   */
  static async deleteSubject(subjectId: string): Promise<void> {
    const supabase = createClient();
    if (supabase) {
      try {
        await withTimeout(supabase.from('subjects').delete().eq('id', subjectId));
      } catch (err) {
        console.warn('Supabase deleteSubject error:', err);
      }
    }
    localSubjects = localSubjects.filter((s) => s.id !== subjectId);
  }

  /**
   * Reorder subjects by given array of IDs
   */
  static async reorderSubjects(orderedIds: string[]): Promise<void> {
    const supabase = createClient();
    if (supabase) {
      try {
        await Promise.all(
          orderedIds.map((id, index) =>
            withTimeout(
              supabase.from('subjects').update({ display_order: index + 1 }).eq('id', id)
            )
          )
        );
      } catch (err) {
        console.warn('Supabase reorderSubjects error:', err);
      }
    }

    // Update local order
    const map = new Map(localSubjects.map((s) => [s.id, s]));
    const reordered: SubjectWithUnits[] = [];
    orderedIds.forEach((id, index) => {
      const s = map.get(id);
      if (s) {
        s.display_order = index + 1;
        reordered.push(s);
        map.delete(id);
      }
    });
    // Append any remaining
    map.forEach((s) => reordered.push(s));
    localSubjects = reordered;
  }

  // =========================================================================
  // UNIT CRUD & REORDER
  // =========================================================================

  /**
   * Add a new unit to a subject (Admin only)
   */
  static async createUnit(subjectId: string, title: string): Promise<Unit> {
    const supabase = createClient();
    const targetSubject = localSubjects.find((s) => s.id === subjectId);
    const displayOrder = (targetSubject?.units.length || 0) + 1;

    if (supabase) {
      try {
        const { data, error } = await withTimeout(
          supabase
            .from('units')
            .insert({
              subject_id: subjectId,
              title: title.trim(),
              display_order: displayOrder,
            })
            .select()
            .single()
        );
        if (data && !error) {
          if (targetSubject) {
            targetSubject.units.push({ ...data, lessons: [] });
          }
          return data;
        }
      } catch (err) {
        console.warn('Supabase createUnit error:', err);
      }
    }

    const newUnit: Unit = {
      id: `unit-${Date.now()}`,
      subject_id: subjectId,
      title: title.trim(),
      display_order: displayOrder,
    };

    if (targetSubject) {
      targetSubject.units.push({ ...newUnit, lessons: [] });
    }
    return newUnit;
  }

  /**
   * Update unit title or order (Admin only)
   */
  static async updateUnit(
    unitId: string,
    updates: Partial<Pick<Unit, 'title' | 'display_order'>>
  ): Promise<void> {
    const supabase = createClient();
    if (supabase) {
      try {
        await withTimeout(supabase.from('units').update(updates).eq('id', unitId));
      } catch (err) {
        console.warn('Supabase updateUnit error:', err);
      }
    }

    for (const sub of localSubjects) {
      const u = sub.units.find((u) => u.id === unitId);
      if (u) {
        Object.assign(u, updates);
        return;
      }
    }
  }

  /**
   * Delete a unit (Admin only)
   */
  static async deleteUnit(unitId: string): Promise<void> {
    const supabase = createClient();
    if (supabase) {
      try {
        await withTimeout(supabase.from('units').delete().eq('id', unitId));
      } catch (err) {
        console.warn('Supabase deleteUnit error:', err);
      }
    }

    for (const sub of localSubjects) {
      sub.units = sub.units.filter((u) => u.id !== unitId);
    }
  }

  /**
   * Reorder units inside a subject
   */
  static async reorderUnits(subjectId: string, orderedIds: string[]): Promise<void> {
    const supabase = createClient();
    if (supabase) {
      try {
        await Promise.all(
          orderedIds.map((id, index) =>
            withTimeout(
              supabase.from('units').update({ display_order: index + 1 }).eq('id', id)
            )
          )
        );
      } catch (err) {
        console.warn('Supabase reorderUnits error:', err);
      }
    }

    const targetSubject = localSubjects.find((s) => s.id === subjectId);
    if (targetSubject) {
      const map = new Map(targetSubject.units.map((u) => [u.id, u]));
      const reordered: any[] = [];
      orderedIds.forEach((id, index) => {
        const u = map.get(id);
        if (u) {
          u.display_order = index + 1;
          reordered.push(u);
          map.delete(id);
        }
      });
      map.forEach((u) => reordered.push(u));
      targetSubject.units = reordered;
    }
  }

  // =========================================================================
  // LESSON CRUD & REORDER
  // =========================================================================

  /**
   * Add a lesson to a unit (Admin only)
   */
  static async createLesson(
    unitId: string,
    title: string,
    difficulty: LessonDifficulty,
    durationMin: number,
    revisionTarget: number = 3,
    notes?: string
  ): Promise<Lesson> {
    const supabase = createClient();

    let displayOrder = 1;
    for (const sub of localSubjects) {
      const u = sub.units.find((u) => u.id === unitId);
      if (u) {
        displayOrder = u.lessons.length + 1;
        break;
      }
    }

    if (supabase) {
      try {
        const { data, error } = await withTimeout(
          supabase
            .from('lessons')
            .insert({
              unit_id: unitId,
              title: title.trim(),
              difficulty,
              estimated_duration_min: durationMin,
              revision_target: revisionTarget,
              notes: notes?.trim() || null,
              display_order: displayOrder,
            })
            .select()
            .single()
        );
        if (data && !error) return data;
      } catch (err) {
        console.warn('Supabase createLesson error:', err);
      }
    }

    const newLesson: Lesson = {
      id: `les-${Date.now()}`,
      unit_id: unitId,
      title: title.trim(),
      display_order: displayOrder,
      difficulty,
      estimated_duration_min: durationMin,
      revision_target: revisionTarget,
      notes: notes?.trim(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    for (const sub of localSubjects) {
      const u = sub.units.find((u) => u.id === unitId);
      if (u) {
        u.lessons.push(newLesson);
        break;
      }
    }

    return newLesson;
  }

  /**
   * Update lesson details (Admin only).
   * Persists without altering student progress!
   */
  static async updateLesson(
    lessonId: string,
    updates: Partial<Pick<Lesson, 'title' | 'difficulty' | 'estimated_duration_min' | 'revision_target' | 'notes' | 'display_order'>>
  ): Promise<void> {
    const supabase = createClient();
    if (supabase) {
      try {
        await withTimeout(
          supabase
            .from('lessons')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', lessonId)
        );
      } catch (err) {
        console.warn('Supabase updateLesson error:', err);
      }
    }

    for (const sub of localSubjects) {
      for (const u of sub.units) {
        const les = u.lessons.find((l) => l.id === lessonId);
        if (les) {
          Object.assign(les, updates, { updated_at: new Date().toISOString() });
          return;
        }
      }
    }
  }

  /**
   * Checks how many students have registered progress on a lesson before deletion
   */
  static async checkLessonHasStudentProgress(lessonId: string): Promise<number> {
    const supabase = createClient();
    if (supabase) {
      try {
        const { count, error } = await withTimeout(
          supabase
            .from('lesson_progress')
            .select('*', { count: 'exact', head: true })
            .eq('lesson_id', lessonId)
        );
        if (!error && count !== null) return count;
      } catch {
        // Fallback
      }
    }
    return localProgress[lessonId] ? 1 : 0;
  }

  /**
   * Delete a lesson (Admin only)
   */
  static async deleteLesson(lessonId: string): Promise<void> {
    const supabase = createClient();
    if (supabase) {
      try {
        await withTimeout(supabase.from('lessons').delete().eq('id', lessonId));
      } catch (err) {
        console.warn('Supabase deleteLesson error:', err);
      }
    }

    for (const sub of localSubjects) {
      for (const u of sub.units) {
        u.lessons = u.lessons.filter((l) => l.id !== lessonId);
      }
    }
  }

  /**
   * Reorder lessons inside a unit
   */
  static async reorderLessons(unitId: string, orderedIds: string[]): Promise<void> {
    const supabase = createClient();
    if (supabase) {
      try {
        await Promise.all(
          orderedIds.map((id, index) =>
            withTimeout(
              supabase.from('lessons').update({ display_order: index + 1 }).eq('id', id)
            )
          )
        );
      } catch (err) {
        console.warn('Supabase reorderLessons error:', err);
      }
    }

    for (const sub of localSubjects) {
      const u = sub.units.find((u) => u.id === unitId);
      if (u) {
        const map = new Map(u.lessons.map((l) => [l.id, l]));
        const reordered: any[] = [];
        orderedIds.forEach((id, index) => {
          const l = map.get(id);
          if (l) {
            l.display_order = index + 1;
            reordered.push(l);
            map.delete(id);
          }
        });
        map.forEach((l) => reordered.push(l));
        u.lessons = reordered;
        break;
      }
    }
  }

  // =========================================================================
  // EXAM CRUD & MULTI-SUBJECT
  // =========================================================================

  /**
   * Fetch all exams for the cohort with multiple subjects covered
   */
  static async getExams(): Promise<Exam[]> {
    const supabase = createClient();
    if (supabase) {
      try {
        const { data, error } = await withTimeout(
          supabase
            .from('exams')
            .select('*, subjects(name, color), exam_subjects(subject_id, subjects(name, color))')
            .order('exam_date', { ascending: true })
        );
        if (data && !error && data.length > 0) {
          return data.map((e: any) => {
            const coveredSubjects = (e.exam_subjects || [])
              .map((es: any) => es.subjects?.name)
              .filter(Boolean);
            const coveredIds = (e.exam_subjects || [])
              .map((es: any) => es.subject_id)
              .filter(Boolean);

            let subjectLabel = e.subjects?.name || 'Tronc Commun';
            if (coveredSubjects.length > 1) {
              subjectLabel = coveredSubjects.join(' + ');
            } else if (coveredSubjects.length === 1) {
              subjectLabel = coveredSubjects[0];
            }

            return {
              ...e,
              subject_name: subjectLabel,
              subject_color: e.subjects?.color || '#0d9488',
              subject_ids: coveredIds.length > 0 ? coveredIds : (e.subject_id ? [e.subject_id] : []),
            };
          });
        }
      } catch (err) {
        console.warn('Supabase getExams error:', err);
      }
    }
    return localExams.sort(
      (a, b) => new Date(a.exam_date).getTime() - new Date(b.exam_date).getTime()
    );
  }

  /**
   * Get metadata and last synchronization date for the shared curriculum exams
   */
  static async getExamsMetadata(): Promise<{
    lastUpdated: string;
    totalExams: number;
    upcomingCount: number;
    nextExam: Exam | null;
  }> {
    const exams = await this.getExams();
    const now = new Date().getTime();
    const upcoming = exams.filter((e) => new Date(e.exam_date).getTime() >= now);
    const nextExam = upcoming[0] || null;

    let latestUpdate = '';
    exams.forEach((e) => {
      const dt = e.created_at || e.exam_date;
      if (dt && (!latestUpdate || dt > latestUpdate)) {
        latestUpdate = dt;
      }
    });

    return {
      lastUpdated: latestUpdate || new Date().toISOString(),
      totalExams: exams.length,
      upcomingCount: upcoming.length,
      nextExam,
    };
  }

  /**
   * Create an exam with multiple covered subjects (Admin only)
   */
  static async createExam(
    examData: Omit<Exam, 'id' | 'cohort_id'>,
    coveredSubjectIds: string[] = []
  ): Promise<Exam> {
    const supabase = createClient();
    const primarySubjectId = coveredSubjectIds[0] || examData.subject_id || null;

    if (supabase) {
      try {
        const { data, error } = await withTimeout(
          supabase
            .from('exams')
            .insert({
              cohort_id: localCohort.id,
              subject_id: primarySubjectId,
              title: examData.title.trim(),
              exam_type: examData.exam_type,
              exam_date: examData.exam_date,
              location: examData.location?.trim() || null,
              coefficient: examData.coefficient,
            })
            .select()
            .single()
        );

        if (data && !error) {
          // Link all covered subjects
          const allSubjectIds = Array.from(new Set([...coveredSubjectIds, ...(primarySubjectId ? [primarySubjectId] : [])]));
          if (allSubjectIds.length > 0) {
            try {
              await supabase.from('exam_subjects').insert(
                allSubjectIds.map((sid) => ({
                  exam_id: data.id,
                  subject_id: sid,
                }))
              );
            } catch (linkErr) {
              console.warn('Failed linking exam subjects:', linkErr);
            }
          }
          return data;
        }
      } catch (err) {
        console.warn('Supabase createExam error:', err);
      }
    }

    const newExam: Exam = {
      id: `exam-${Date.now()}`,
      cohort_id: localCohort.id,
      ...examData,
      subject_id: primarySubjectId,
      subject_ids: coveredSubjectIds,
    };
    localExams.push(newExam);
    return newExam;
  }

  /**
   * Update an existing exam and its covered subjects (Admin only)
   */
  static async updateExam(
    examId: string,
    updates: Partial<Omit<Exam, 'id' | 'cohort_id'>>,
    coveredSubjectIds?: string[]
  ): Promise<Exam> {
    const supabase = createClient();
    const primarySubjectId = coveredSubjectIds?.[0] || updates.subject_id || null;

    if (supabase) {
      try {
        const { data, error } = await withTimeout(
          supabase
            .from('exams')
            .update({
              title: updates.title?.trim(),
              subject_id: primarySubjectId,
              exam_type: updates.exam_type,
              exam_date: updates.exam_date,
              location: updates.location?.trim(),
              coefficient: updates.coefficient,
            })
            .eq('id', examId)
            .select()
            .single()
        );

        if (data && !error && coveredSubjectIds) {
          // Refresh links in exam_subjects
          await supabase.from('exam_subjects').delete().eq('exam_id', examId);
          if (coveredSubjectIds.length > 0) {
            await supabase.from('exam_subjects').insert(
              coveredSubjectIds.map((sid) => ({
                exam_id: examId,
                subject_id: sid,
              }))
            );
          }
          return data;
        }
      } catch (err) {
        console.warn('Supabase updateExam error:', err);
      }
    }

    const exam = localExams.find((e) => e.id === examId);
    if (exam) {
      Object.assign(exam, updates);
      if (coveredSubjectIds) {
        exam.subject_ids = coveredSubjectIds;
      }
      return exam;
    }
    throw new Error('Examen introuvable');
  }

  /**
   * Delete an exam (Admin only)
   */
  static async deleteExam(examId: string): Promise<void> {
    const supabase = createClient();
    if (supabase) {
      try {
        await withTimeout(supabase.from('exams').delete().eq('id', examId));
      } catch (err) {
        console.warn('Supabase deleteExam error:', err);
      }
    }
    localExams = localExams.filter((e) => e.id !== examId);
  }

  // =========================================================================
  // BULK IMPORT & PERSISTENCE
  // =========================================================================

  /**
   * Bulk import curriculum rows from CSV/Excel (Admin only)
   * Supports Subject -> Unit -> Lesson hierarchy and persists directly to Supabase.
   */
  static async importCurriculumRows(rows: CurriculumImportRow[]): Promise<{ added: number }> {
    const supabase = createClient();
    let count = 0;

    if (supabase) {
      try {
        // Fetch existing tree from Supabase to avoid duplicating subjects or units
        const { data: dbSubjects } = await withTimeout(
          supabase.from('subjects').select('id, name, units(id, title)')
        );

        const subjectMap = new Map<string, { id: string; units: Map<string, string> }>();
        if (dbSubjects) {
          dbSubjects.forEach((s: any) => {
            const uMap = new Map<string, string>();
            (s.units || []).forEach((u: any) => uMap.set(u.title.trim().toLowerCase(), u.id));
            subjectMap.set(s.name.trim().toLowerCase(), { id: s.id, units: uMap });
          });
        }

        for (const row of rows) {
          const subKey = row.subject_name.trim().toLowerCase();
          const unitTitle = (row.unit_name || row.unit_title || 'Unité Générale').trim();
          const unitKey = unitTitle.toLowerCase();

          // 1. Resolve or create Subject
          let subInfo = subjectMap.get(subKey);
          if (!subInfo) {
            const { data: newSub } = await withTimeout(
              supabase
                .from('subjects')
                .insert({
                  cohort_id: localCohort.id,
                  name: row.subject_name.trim(),
                  color: '#0d9488',
                  semester: row.semester || 'S1',
                  display_order: subjectMap.size + 1,
                })
                .select()
                .single()
            );

            if (newSub) {
              subInfo = { id: newSub.id, units: new Map() };
              subjectMap.set(subKey, subInfo);
            }
          }

          if (!subInfo) continue;

          // 2. Resolve or create Unit
          let unitId = subInfo.units.get(unitKey);
          if (!unitId) {
            const { data: newUnit } = await withTimeout(
              supabase
                .from('units')
                .insert({
                  subject_id: subInfo.id,
                  title: unitTitle,
                  display_order: subInfo.units.size + 1,
                })
                .select()
                .single()
            );

            if (newUnit) {
              unitId = newUnit.id;
              subInfo.units.set(unitKey, newUnit.id);
            }
          }

          if (!unitId) continue;

          // 3. Insert Lesson
          const duration = Number(row.estimated_minutes || row.estimated_duration_min) || 60;
          const target = Number(row.revision_target) || 3;

          const { error: lesErr } = await withTimeout(
            supabase.from('lessons').insert({
              unit_id: unitId,
              title: row.lesson_title.trim(),
              difficulty: (row.difficulty as LessonDifficulty) || 'Moyen',
              estimated_duration_min: duration,
              revision_target: target,
              notes: row.notes?.trim() || null,
              display_order: 99,
            })
          );

          if (!lesErr) count++;
        }

        return { added: count };
      } catch (err) {
        console.warn('Supabase bulk import error, syncing locally:', err);
      }
    }

    // Fallback in-memory import
    for (const row of rows) {
      let sub = localSubjects.find(
        (s) => s.name.trim().toLowerCase() === row.subject_name.trim().toLowerCase()
      );
      if (!sub) {
        sub = {
          id: `sub-imp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          cohort_id: localCohort.id,
          name: row.subject_name.trim(),
          color: '#0d9488',
          semester: row.semester || 'S1',
          display_order: localSubjects.length + 1,
          units: [],
        };
        localSubjects.push(sub);
      }

      const unitTitle = (row.unit_name || row.unit_title || 'Unité Générale').trim();
      let unit = sub.units.find(
        (u) => u.title.trim().toLowerCase() === unitTitle.toLowerCase()
      );
      if (!unit) {
        unit = {
          id: `unit-imp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          subject_id: sub.id,
          title: unitTitle,
          display_order: sub.units.length + 1,
          lessons: [],
        };
        sub.units.push(unit);
      }

      const duration = Number(row.estimated_minutes || row.estimated_duration_min) || 60;
      const target = Number(row.revision_target) || 3;

      const newLesson: Lesson = {
        id: `les-imp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        unit_id: unit.id,
        title: row.lesson_title.trim(),
        difficulty: (row.difficulty as LessonDifficulty) || 'Moyen',
        estimated_duration_min: duration,
        revision_target: target,
        notes: row.notes,
        display_order: unit.lessons.length + 1,
      };
      unit.lessons.push(newLesson);
      count++;
    }

    return { added: count };
  }

  /**
   * Bulk import exams from CSV
   */
  static async importExams(rows: ExamImportRow[]): Promise<{ added: number }> {
    let count = 0;
    const subjects = await this.getCurriculumTree();

    for (const r of rows) {
      // Find matching covered subjects
      const coveredIds: string[] = [];
      if (r.subjects_covered) {
        const parts = r.subjects_covered.split(/[;,/]+/).map((p) => p.trim().toLowerCase());
        for (const sub of subjects) {
          if (parts.some((p) => sub.name.toLowerCase().includes(p) || p.includes(sub.name.toLowerCase()))) {
            coveredIds.push(sub.id);
          }
        }
      }

      await this.createExam(
        {
          title: r.title,
          exam_type: r.exam_type as any,
          exam_date: new Date(r.exam_date).toISOString(),
          location: r.location || 'Amphithéâtre',
          coefficient: Number(r.coefficient) || 1.5,
        },
        coveredIds
      );
      count++;
    }

    return { added: count };
  }

  // =========================================================================
  // STUDENT PROGRESS & SESSIONS
  // =========================================================================

  /**
   * Update student lesson status & confidence (Student feature)
   */
  static async updateStudentProgress(
    studentId: string,
    lessonId: string,
    status: LessonStatus,
    confidenceScore: number = 3,
    notes?: string
  ): Promise<LessonProgress> {
    const supabase = createClient();
    if (supabase) {
      try {
        const payload = {
          student_id: studentId,
          lesson_id: lessonId,
          status,
          confidence_score: confidenceScore,
          last_studied_at: new Date().toISOString(),
          notes,
          updated_at: new Date().toISOString(),
        };

        let result = await withTimeout(
          supabase
            .from('lesson_progress')
            .upsert(payload, { onConflict: 'student_id,lesson_id' })
            .select()
            .single()
        );

        if (result.error) {
          result = await withTimeout(
            supabase
              .from('student_lesson_progress')
              .upsert(payload, { onConflict: 'student_id,lesson_id' })
              .select()
              .single()
          );
        }

        if (result.data && !result.error) return result.data;
      } catch (err) {
        console.warn('Supabase updateStudentProgress error:', err);
      }
    }

    const updated: LessonProgress = {
      id: localProgress[lessonId]?.id || `prog-${Date.now()}`,
      student_id: studentId,
      lesson_id: lessonId,
      status,
      confidence_score: confidenceScore,
      last_studied_at: new Date().toISOString(),
      notes,
      updated_at: new Date().toISOString(),
    };

    if (!studentProgressStore[studentId]) {
      studentProgressStore[studentId] = {};
    }
    studentProgressStore[studentId][lessonId] = updated;

    if (studentId === 'demo-student-id') {
      localProgress[lessonId] = updated;
    }
    return updated;
  }

  /**
   * Log a new revision session (Student feature)
   */
  static async logRevisionSession(
    studentId: string,
    lessonId: string,
    durationMin: number,
    sessionType: string,
    confidenceRating: number,
    notes?: string,
    sessionDate?: string
  ): Promise<StudySession> {
    const supabase = createClient();
    const finalDate = sessionDate ? new Date(sessionDate).toISOString() : new Date().toISOString();

    if (supabase) {
      try {
        const payload = {
          student_id: studentId,
          lesson_id: lessonId,
          session_date: finalDate,
          duration_min: durationMin,
          session_type: sessionType,
          confidence_rating: confidenceRating,
          notes: notes?.trim() || null,
        };

        let result = await withTimeout(
          supabase.from('study_sessions').insert(payload).select().single()
        );

        if (result.error) {
          result = await withTimeout(
            supabase.from('student_revision_sessions').insert(payload).select().single()
          );
        }

        if (result.data && !result.error) return result.data;
      } catch (err) {
        console.warn('Supabase logRevisionSession error:', err);
      }
    }

    let lessonTitle = 'Séance de révision';
    let subjectName = 'Médecine Générale';
    for (const s of localSubjects) {
      for (const u of s.units) {
        const l = u.lessons.find((item) => item.id === lessonId);
        if (l) {
          lessonTitle = l.title;
          subjectName = s.name;
          break;
        }
      }
    }

    const session: StudySession = {
      id: `rev-${Date.now()}`,
      student_id: studentId,
      lesson_id: lessonId,
      lesson_title: lessonTitle,
      subject_name: subjectName,
      session_date: finalDate,
      duration_min: durationMin,
      session_type: sessionType,
      confidence_rating: confidenceRating,
      notes: notes?.trim(),
    };
    localRevisions.unshift(session);

    await this.updateStudentProgress(
      studentId,
      lessonId,
      confidenceRating >= 4 ? 'completed' : 'in_progress',
      confidenceRating
    );

    return session;
  }

  /**
   * Delete a student's personal revision session
   */
  static async deleteRevisionSession(sessionId: string, studentId: string): Promise<boolean> {
    const supabase = createClient();
    if (supabase) {
      try {
        await withTimeout(
          supabase
            .from('study_sessions')
            .delete()
            .eq('id', sessionId)
            .eq('student_id', studentId)
        );
      } catch (err) {
        console.warn('Supabase deleteRevisionSession error:', err);
      }
    }

    const idx = localRevisions.findIndex((r) => r.id === sessionId && r.student_id === studentId);
    if (idx !== -1) {
      localRevisions.splice(idx, 1);
    }
    return true;
  }

  /**
   * Fetch revision sessions for a student
   */
  static async getStudentRevisionSessions(studentId: string): Promise<StudySession[]> {
    const supabase = createClient();
    if (supabase) {
      try {
        let result = await withTimeout(
          supabase
            .from('study_sessions')
            .select('*, lessons(title, units(subjects(name)))')
            .eq('student_id', studentId)
            .order('session_date', { ascending: false })
        );

        if (result.error || !result.data) {
          result = await withTimeout(
            supabase
              .from('student_revision_sessions')
              .select('*, lessons(title, units(subjects(name)))')
              .eq('student_id', studentId)
              .order('session_date', { ascending: false })
          );
        }

        if (result.data && !result.error && result.data.length > 0) {
          return result.data.map((d: any) => ({
            ...d,
            lesson_title: d.lessons?.title || 'Cours',
            subject_name: d.lessons?.units?.subjects?.name || 'Matière',
          }));
        }
      } catch (err) {
        console.warn('Supabase getStudentRevisionSessions error:', err);
      }
    }

    // In local fallback mode: return only sessions belonging to this student
    return localRevisions.filter((r) => r.student_id === studentId);
  }

  /**
   * Validate invite code and securely join cohort (Calls PostgreSQL Security Definer RPC)
   */
  static async joinCohortWithCode(
    code: string,
    studentId: string
  ): Promise<{ success: boolean; cohortName?: string; error?: string }> {
    const cleanCode = code.trim().toUpperCase();

    if (cleanCode === localCohort.invite_code.toUpperCase()) {
      localCohort.member_count = (localCohort.member_count || 0) + 1;
      return { success: true, cohortName: localCohort.name };
    }

    const supabase = createClient();
    if (supabase) {
      try {
        const { data: rpcData, error: rpcErr } = await withTimeout(
          supabase.rpc('join_cohort_with_code', { code_input: cleanCode })
        );

        if (!rpcErr && rpcData) {
          if (rpcData.success) {
            return { success: true, cohortName: rpcData.cohort_name };
          } else {
            return { success: false, error: rpcData.error || 'Code invalide.' };
          }
        }

        const { data: cohortData, error: cohortErr } = await withTimeout(
          supabase
            .from('cohorts')
            .select('*')
            .ilike('invite_code', cleanCode)
            .single()
        );

        if (cohortData && !cohortErr) {
          await supabase.from('profiles').update({ cohort_id: cohortData.id }).eq('id', studentId);
          await supabase.from('cohort_members').upsert({
            cohort_id: cohortData.id,
            user_id: studentId,
            role: 'student',
          }, { onConflict: 'cohort_id,user_id' });

          return { success: true, cohortName: cohortData.name };
        }
      } catch {
        return { success: false, error: "Code d'invitation invalide ou expiré." };
      }
    }

    return {
      success: false,
      error: `Code "${cleanCode}" introuvable. Veuillez vérifier auprès de votre administrateur ou délégué.`,
    };
  }
}
