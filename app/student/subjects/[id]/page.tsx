'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { SubjectDetailView } from '@/components/SubjectDetailView';
import { LoadingState } from '@/components/LoadingState';
import { ErrorState } from '@/components/ErrorState';
import { CohortService } from '@/lib/services/cohort-service';
import { SubjectWithUnits } from '@/lib/types/database';
import { useAuth } from '@/lib/context/auth-context';

export default function SubjectPage() {
  const params = useParams();
  const subjectId = params?.id as string;
  const { user } = useAuth();
  const [subject, setSubject] = useState<SubjectWithUnits | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadSubject = useCallback(async () => {
    if (!subjectId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await CohortService.getSubjectById(subjectId, user?.id);
      if (!data) {
        setError('Module médical introuvable dans le programme de votre cohorte.');
      } else {
        setSubject(data);
      }
    } catch (err: any) {
      console.error('Error loading subject:', err);
      setError(err?.message || 'Erreur lors du chargement du module');
    } finally {
      setLoading(false);
    }
  }, [subjectId, user]);

  useEffect(() => {
    loadSubject();
  }, [loadSubject]);

  if (loading) {
    return <LoadingState message="Chargement du module et des cours..." />;
  }

  if (error || !subject) {
    return (
      <ErrorState
        title="Module introuvable"
        message={error || 'Ce module n\'existe pas ou a été déplacé.'}
        onRetry={loadSubject}
      />
    );
  }

  return <SubjectDetailView initialSubject={subject} onRefresh={loadSubject} />;
}
