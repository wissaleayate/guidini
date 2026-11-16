'use client';

import React from 'react';
import { LessonStatus } from '@/lib/types/database';
import {
  CircleDashed,
  PlayCircle,
  CheckCircle2,
  RotateCw,
  Check,
} from 'lucide-react';

interface LessonStatusSelectorProps {
  currentStatus: LessonStatus;
  onChange: (newStatus: LessonStatus) => void;
  disabled?: boolean;
  className?: string;
}

interface StatusOption {
  status: LessonStatus;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  selectedClass: string;
  unselectedClass: string;
  activeRing: string;
}

const STATUS_OPTIONS: StatusOption[] = [
  {
    status: 'not_started',
    label: 'Non commencé',
    icon: CircleDashed,
    selectedClass: 'bg-slate-700 text-white border-slate-800 shadow-sm font-bold',
    unselectedClass: 'bg-slate-50 text-slate-600 border-slate-200/90 hover:bg-slate-100 hover:text-slate-800',
    activeRing: 'ring-slate-400/40',
  },
  {
    status: 'in_progress',
    label: 'En cours',
    icon: PlayCircle,
    selectedClass: 'bg-blue-600 text-white border-blue-700 shadow-sm font-bold',
    unselectedClass: 'bg-blue-50/70 text-blue-700 border-blue-200 hover:bg-blue-100 hover:text-blue-900',
    activeRing: 'ring-blue-400/40',
  },
  {
    status: 'completed',
    label: 'Validé',
    icon: CheckCircle2,
    selectedClass: 'bg-emerald-600 text-white border-emerald-700 shadow-sm font-bold',
    unselectedClass: 'bg-emerald-50/70 text-emerald-700 border-emerald-200 hover:bg-emerald-100 hover:text-emerald-900',
    activeRing: 'ring-emerald-400/40',
  },
  {
    status: 'needs_revision',
    label: 'À réviser',
    icon: RotateCw,
    selectedClass: 'bg-purple-600 text-white border-purple-700 shadow-sm font-bold',
    unselectedClass: 'bg-purple-50/70 text-purple-700 border-purple-200 hover:bg-purple-100 hover:text-purple-900',
    activeRing: 'ring-purple-400/40',
  },
];

export function LessonStatusSelector({
  currentStatus,
  onChange,
  disabled = false,
  className = '',
}: LessonStatusSelectorProps) {
  return (
    <div
      role="group"
      aria-label="Statut du cours"
      className={`p-1 bg-slate-100/90 rounded-2xl border border-slate-200/80 shadow-2xs grid grid-cols-2 sm:flex sm:items-center sm:gap-1 w-full sm:w-auto ${className}`}
    >
      {STATUS_OPTIONS.map((opt) => {
        const isSelected = currentStatus === opt.status;
        const Icon = opt.icon;

        return (
          <button
            key={opt.status}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt.status)}
            aria-pressed={isSelected}
            className={`flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-xl text-xs transition-all duration-200 select-none cursor-pointer border ${
              isSelected
                ? `${opt.selectedClass} ring-2 ${opt.activeRing} scale-[1.02]`
                : `${opt.unselectedClass} active:scale-95`
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Icon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : ''}`} />
            <span className="font-medium whitespace-nowrap">{opt.label}</span>
            {isSelected && <Check className="w-3 h-3 ml-0.5 text-white/90 shrink-0 hidden sm:inline" />}
          </button>
        );
      })}
    </div>
  );
}
