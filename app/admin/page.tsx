'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useState, useCallback } from 'react';
import { AdminCurriculumManager } from '@/components/AdminCurriculumManager';
import { LoadingState } from '@/components/LoadingState';
import { ErrorState } from '@/components/ErrorState';
import { CohortService } from '@/lib/services/cohort-service';
import { SubjectWithUnits } from '@/lib/types/database';

export default function AdminCurriculumPage() {
  const [subjects, setSubjects] = useState<SubjectWithUnits[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadCurriculum = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await CohortService.getCurriculumTree();
      setSubjects(data);
    } catch (err: any) {
      console.error('Error loading admin curriculum:', err);
      setError(err?.message || 'Erreur lors du chargement du programme');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCurriculum();
  }, [loadCurriculum]);

  if (loading) {
    return <LoadingState message="Chargement du gestionnaire de curriculum..." />;
  }

  if (error) {
    return (
      <ErrorState
        title="Erreur lors du chargement du programme"
        message={error}
        onRetry={loadCurriculum}
      />
    );
  }

  return <AdminCurriculumManager initialSubjects={subjects} onRefresh={loadCurriculum} />;
}
