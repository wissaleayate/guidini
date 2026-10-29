import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = 'Chargement en cours...' }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[45vh] p-8 text-center animate-in fade-in duration-200">
      <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600 mb-3 shadow-xs">
        <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
      </div>
      <h3 className="text-sm font-bold text-slate-800">{message}</h3>
      <p className="text-xs text-slate-400 mt-1 max-w-xs">
        Synchronisation des modules et des données de la promotion...
      </p>
    </div>
  );
}
