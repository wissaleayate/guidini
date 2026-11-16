'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { SubjectDetailView } from '@/components/SubjectDetailView';
import { LoadingState } from '@/components/LoadingState';
import { ErrorState } from '@/components/ErrorState';
import { CohortService } from '@/lib/services/cohort-service';
import { SubjectWithUnits } from '@/lib/types/database';
import { useAuth } from '@/lib/context/auth-context';

export function SubjectPageClient() {
  const params = useParams();
  const subjectId = params?.id as string;
  const { user } = useAuth();

  const [subject, setSubject] = useState<SubjectWithUnits | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadSubject = useCallback(async (silent = false) => {
    if (!subjectId) return;
    try {
      if (!silent) setLoading(true);
      setError(null);
      const studentId = user?.id || 'demo-student-id';
      const data = await CohortService.getSubjectById(subjectId, studentId);
      if (!data) {
        setError('Matière / Module introuvable');
      } else {
        setSubject(data);
      }
    } catch (err: any) {
      console.error('Error loading subject:', err);
      if (!silent) setError(err?.message || 'Erreur lors du chargement du module');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [subjectId, user]);

  useEffect(() => {
    loadSubject(false);
  }, [loadSubject]);

  if (loading) {
    return <LoadingState message="Chargement du module et des cours..." />;
  }

  if (error || !subject) {
    return (
      <ErrorState
        title="Module introuvable"
        message={error || 'Ce module n\'existe pas dans le programme officiel.'}
        onRetry={() => loadSubject(false)}
      />
    );
  }

  return <SubjectDetailView initialSubject={subject} onRefresh={() => loadSubject(true)} />;
}
