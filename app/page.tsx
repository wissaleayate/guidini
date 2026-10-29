'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { CurriculumView } from '@/components/CurriculumView';
import { LoadingState } from '@/components/LoadingState';
import { ErrorState } from '@/components/ErrorState';
import { CohortService } from '@/lib/services/cohort-service';
import { SubjectWithUnits } from '@/lib/types/database';
import { useAuth } from '@/lib/context/auth-context';

export default function HomePage() {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<SubjectWithUnits[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadCurriculum = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await CohortService.getCurriculumTree(user?.id);
      setSubjects(data);
    } catch (err: any) {
      console.error('Error loading curriculum:', err);
      setError(err?.message || 'Erreur lors de la récupération du curriculum');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadCurriculum();
  }, [loadCurriculum]);

  if (loading) {
    return <LoadingState message="Chargement du curriculum médical..." />;
  }

  if (error) {
    return (
      <ErrorState
        title="Erreur lors du chargement du curriculum"
        message={error}
        onRetry={loadCurriculum}
      />
    );
  }

  return <CurriculumView initialSubjects={subjects} />;
}
