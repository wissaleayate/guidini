'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { StudentProgressView } from '@/components/StudentProgressView';
import { LoadingState } from '@/components/LoadingState';
import { ErrorState } from '@/components/ErrorState';
import { CohortService } from '@/lib/services/cohort-service';
import { SubjectWithUnits } from '@/lib/types/database';
import { useAuth } from '@/lib/context/auth-context';

export function StudentProgressClient() {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<SubjectWithUnits[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadProgressData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const studentId = user?.id || 'demo-student-id';
      const tree = await CohortService.getCurriculumTree(studentId);
      setSubjects(tree);
    } catch (err: any) {
      console.error('Error loading progress:', err);
      setError(err?.message || 'Erreur lors du chargement de votre progression');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadProgressData();
  }, [loadProgressData]);

  if (loading) {
    return <LoadingState message="Chargement de vos révisions..." />;
  }

  if (error) {
    return (
      <ErrorState
        title="Erreur lors du chargement"
        message={error}
        onRetry={loadProgressData}
      />
    );
  }

  return <StudentProgressView initialSubjects={subjects} />;
}
