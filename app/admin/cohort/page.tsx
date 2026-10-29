'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { CohortSettingsView } from '@/components/CohortSettingsView';
import { LoadingState } from '@/components/LoadingState';
import { ErrorState } from '@/components/ErrorState';
import { CohortService } from '@/lib/services/cohort-service';
import { Cohort } from '@/lib/types/database';

export default function AdminCohortPage() {
  const [cohort, setCohort] = useState<Cohort | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadCohort = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await CohortService.getCohort();
      setCohort(data);
    } catch (err: any) {
      console.error('Error loading cohort:', err);
      setError(err?.message || 'Erreur lors du chargement des paramètres de la cohorte');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCohort();
  }, [loadCohort]);

  if (loading || !cohort) {
    return <LoadingState message="Chargement des paramètres de la cohorte..." />;
  }

  if (error) {
    return (
      <ErrorState
        title="Erreur de configuration"
        message={error}
        onRetry={loadCohort}
      />
    );
  }

  return <CohortSettingsView initialCohort={cohort} />;
}
