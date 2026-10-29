'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useState, useCallback } from 'react';
import { StudentProgressView } from '@/components/StudentProgressView';
import { LoadingState } from '@/components/LoadingState';
import { ErrorState } from '@/components/ErrorState';
import { CohortService } from '@/lib/services/cohort-service';
import { SubjectWithUnits } from '@/lib/types/database';
import { useAuth } from '@/lib/context/auth-context';

export default function ProgressPage() {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<SubjectWithUnits[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const cur = await CohortService.getCurriculumTree(user?.id);
      setSubjects(cur);
    } catch (err: any) {
      console.error('Error loading student progress:', err);
      setError(err?.message || 'Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return <LoadingState message="Chargement de votre suivi personnel..." />;
  }

  if (error) {
    return (
      <ErrorState
        title="Erreur lors du chargement de votre suivi"
        message={error}
        onRetry={loadData}
      />
    );
  }

  return <StudentProgressView initialSubjects={subjects} />;
}
