'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useState, useCallback } from 'react';
import { ExamsList } from '@/components/ExamsList';
import { LoadingState } from '@/components/LoadingState';
import { ErrorState } from '@/components/ErrorState';
import { CohortService } from '@/lib/services/cohort-service';
import { Exam, SubjectWithUnits } from '@/lib/types/database';

export default function StudentExamsPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [subjects, setSubjects] = useState<SubjectWithUnits[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadExams = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [ex, sub] = await Promise.all([
        CohortService.getExams(),
        CohortService.getCurriculumTree(),
      ]);
      setExams(ex);
      setSubjects(sub);
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
    return <LoadingState message="Chargement des dates d'examens..." />;
  }

  if (error) {
    return (
      <ErrorState
        title="Erreur lors du chargement du calendrier"
        message={error}
        onRetry={loadExams}
      />
    );
  }

  return <ExamsList initialExams={exams} subjects={subjects} />;
}
