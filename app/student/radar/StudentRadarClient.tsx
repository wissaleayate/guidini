'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { CohortService } from '@/lib/services/cohort-service';
import { AcademicWorkloadItem } from '@/lib/types/database';
import { useAuth } from '@/lib/context/auth-context';
import { LoadingState } from '@/components/LoadingState';
import { ErrorState } from '@/components/ErrorState';
import {
  Compass,
  Layers,
  Clock,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';

export function StudentRadarClient() {
  const { user } = useAuth();
  const [unitsWorkload, setUnitsWorkload] = useState<AcademicWorkloadItem[]>([]);
  const [independentWorkload, setIndependentWorkload] = useState<AcademicWorkloadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const studentId = user?.id || 'demo-student-id';
      const data = await CohortService.getAcademicWorkload(studentId);
      setUnitsWorkload(data.unitsWorkload || []);
      setIndependentWorkload(data.independentWorkload || []);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Erreur lors du calcul de la charge d'étude");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return <LoadingState message="Calcul de votre charge d'étude et radar de rattrapage..." />;
  }

  if (error) {
    return <ErrorState title="Erreur du radar" message={error} onRetry={loadData} />;
  }

  const allItems = [...unitsWorkload, ...independentWorkload];
  const totalLessons = allItems.reduce((acc, w) => acc + (w.totalLessons || 0), 0);
  const totalCompleted = allItems.reduce((acc, w) => acc + (w.completedLessons || 0), 0);
  const totalRemainingHours = allItems.reduce((acc, w) => acc + (w.remainingHours || 0), 0);
  const overallPercentage = totalLessons > 0 ? Math.round((totalCompleted / totalLessons) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 text-teal-700 text-xs font-semibold mb-2 border border-teal-200">
            <Compass className="w-3.5 h-3.5 text-teal-600" />
            Planification & Priorités Médicales
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Radar de Rattrapage & Charge d'Étude
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Calcul hermétique et séparé de la charge de travail entre les 4 Grandes Unités Intégrées et les 4 Modules Indépendants. Vos cours transversaux ne sont jamais comptabilisés dans le volume d'une grande unité.
          </p>
        </div>

        {/* Global Progress Dial */}
        <div className="flex items-center gap-4 bg-teal-50/70 p-4 rounded-2xl border border-teal-100 self-start sm:self-auto shrink-0">
          <div className="text-right">
            <span className="text-3xl font-black text-teal-700 leading-none block">
              {overallPercentage}%
            </span>
            <span className="text-xs text-teal-900 font-semibold block mt-1">
              Progression Globale
            </span>
          </div>
          <div className="h-10 w-px bg-teal-200" />
          <div>
            <span className="text-lg font-bold text-slate-900 leading-tight block">
              {totalRemainingHours} h
            </span>
            <span className="text-[11px] text-slate-500 block">
              Restantes estimées
            </span>
          </div>
        </div>
      </div>

      {/* SECTION 1: 4 Grandes Unités Intégrées */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-teal-600" />
            <h2 className="text-lg font-bold text-slate-900">
              1. Les 4 Grandes Unités Intégrées (Contrôles d'Unités)
            </h2>
          </div>
          <span className="text-xs text-slate-500 font-medium hidden sm:inline">
            1 contrôle semestriel unifié par grande unité
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {unitsWorkload.map((item) => {
            const hasStarted = item.totalLessons > 0;
            return (
              <div
                key={item.id}
                className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs hover:border-teal-300 transition-all flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-snug">
                      {item.title}
                    </h3>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 shrink-0">
                      Unité Intégrée
                    </span>
                  </div>

                  {item.coveredModules && item.coveredModules.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 my-2.5">
                      {item.coveredModules.map((m) => (
                        <span
                          key={m.id}
                          className="text-[11px] px-2 py-0.5 rounded-md bg-slate-50 text-slate-600 border border-slate-200"
                        >
                          {m.name} ({m.lessonsCount})
                        </span>
                      ))}
                    </div>
                  )}

                  {hasStarted ? (
                    <div className="space-y-2 mt-3">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-slate-600">
                          {item.completedLessons} / {item.totalLessons} cours étudiés
                        </span>
                        <span className="text-teal-700 font-bold">{item.percentCompleted}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full bg-teal-600 rounded-full transition-all duration-500"
                          style={{ width: `${item.percentCompleted}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 p-3 bg-slate-50 rounded-2xl text-xs text-slate-500">
                      Programme en attente de publication par l'administration.
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {item.remainingHours} h d'étude restantes
                  </span>
                  <Link
                    href="/"
                    className="inline-flex items-center gap-1 text-teal-700 hover:text-teal-800 font-semibold"
                  >
                    Voir le programme <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 2: 4 Modules Indépendants */}
      <div className="space-y-4 pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-900">
              2. Les 4 Modules Indépendants (Contrôles Dédiés)
            </h2>
          </div>
          <span className="text-xs text-slate-500 font-medium hidden sm:inline">
            Non rattachés aux 4 unités • 1 contrôle distinct par module
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {independentWorkload.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs hover:border-indigo-300 transition-all flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-snug">
                    {item.title}
                  </h3>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">
                    Module Indépendant
                  </span>
                </div>

                <div className="mt-3 p-3 bg-slate-50 rounded-2xl text-xs text-slate-500">
                  Évaluation propre séparée. Cours et chapitres isolés du cursus des 4 grandes unités.
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  Contrôle dédié
                </span>
                <Link
                  href="/student/exams"
                  className="inline-flex items-center gap-1 text-indigo-700 hover:text-indigo-800 font-semibold"
                >
                  Détails du contrôle <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
