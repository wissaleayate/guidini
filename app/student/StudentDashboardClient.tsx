'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { StudentDashboardView } from '@/components/StudentDashboardView';
import { LoadingState } from '@/components/LoadingState';
import { ErrorState } from '@/components/ErrorState';
import { CohortService } from '@/lib/services/cohort-service';
import { SubjectWithUnits, Exam, StudySession, Cohort, AcademicUnit } from '@/lib/types/database';
import { useAuth } from '@/lib/context/auth-context';

export function StudentDashboardClient() {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<SubjectWithUnits[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [academicUnits, setAcademicUnits] = useState<AcademicUnit[]>([]);
  const [cohort, setCohort] = useState<Cohort | null>(null);
  const [examsLastUpdated, setExamsLastUpdated] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const studentId = user?.id || 'demo-student-id';

      const [curTree, examList, revSessions, cohortData, examMeta, units] = await Promise.all([
        CohortService.getCurriculumTree(studentId),
        CohortService.getExams(),
        CohortService.getStudentRevisionSessions(studentId),
        CohortService.getCohort(),
        CohortService.getExamsMetadata(),
        CohortService.getAcademicUnits(),
      ]);

      setSubjects(curTree);
      setExams(examList);
      setSessions(revSessions);
      setCohort(cohortData);
      setExamsLastUpdated(examMeta.lastUpdated);
      setAcademicUnits(units);
    } catch (err: any) {
      console.error('Error loading student dashboard:', err);
      setError(err?.message || 'Erreur lors du chargement de votre tableau de bord');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading || !cohort) {
    return <LoadingState message="Chargement de votre tableau de bord médical..." />;
  }

  if (error) {
    return (
      <ErrorState
        title="Erreur lors du chargement"
        message={error}
        onRetry={loadData}
      />
    );
  }

  return (
    <StudentDashboardView
      initialSubjects={subjects}
      initialExams={exams}
      initialSessions={sessions}
      academicUnits={academicUnits}
      cohort={cohort}
      examsLastUpdated={examsLastUpdated}
    />
  );
}
