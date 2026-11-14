'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { ExamsList } from '@/components/ExamsList';
import { LoadingState } from '@/components/LoadingState';
import { ErrorState } from '@/components/ErrorState';
import { CohortService } from '@/lib/services/cohort-service';
import { Exam, SubjectWithUnits, AcademicUnit } from '@/lib/types/database';

export function ExamsPageClient() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [subjects, setSubjects] = useState<SubjectWithUnits[]>([]);
  const [academicUnits, setAcademicUnits] = useState<AcademicUnit[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadExams = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [ex, sub, units] = await Promise.all([
        CohortService.getExams(),
        CohortService.getCurriculumTree(),
        CohortService.getAcademicUnits(),
      ]);
      setExams(ex);
      setSubjects(sub);
      setAcademicUnits(units);
    } catch (err: any) {
      console.error('Error loading exams:', err);
      setError(err?.message || 'Erreur lors du chargement des examens');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadExams();
  }, [loadExams]);

  if (loading) {
    return <LoadingState message="Chargement des contrôles et examens..." />;
  }

  if (error) {
    return (
      <ErrorState
        title="Erreur lors du chargement"
        message={error}
        onRetry={loadExams}
      />
    );
  }

  return (
    <ExamsList
      initialExams={exams}
      subjects={subjects}
      academicUnits={academicUnits}
      onRefresh={loadExams}
    />
  );
}
