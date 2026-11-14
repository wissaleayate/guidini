'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { AdminCurriculumManager } from '@/components/AdminCurriculumManager';
import { LoadingState } from '@/components/LoadingState';
import { ErrorState } from '@/components/ErrorState';
import { CohortService } from '@/lib/services/cohort-service';
import { SubjectWithUnits, AcademicUnit } from '@/lib/types/database';

export function AdminCurriculumClient() {
  const [subjects, setSubjects] = useState<SubjectWithUnits[]>([]);
  const [academicUnits, setAcademicUnits] = useState<AcademicUnit[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadCurriculum = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [data, units] = await Promise.all([
        CohortService.getCurriculumTree(),
        CohortService.getAcademicUnits(),
      ]);
      setSubjects(data);
      setAcademicUnits(units);
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

  return (
    <AdminCurriculumManager
      initialSubjects={subjects}
      academicUnits={academicUnits}
      onRefresh={loadCurriculum}
    />
  );
}
