import React from 'react';
import Link from 'next/link';
import { Stethoscope, Home } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6 space-y-5">
      <div className="w-16 h-16 rounded-3xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600 shadow-xs">
        <Stethoscope className="w-8 h-8" />
      </div>
      <div className="space-y-2 max-w-md">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          404 • Page Introuvable
        </h1>
        <p className="text-sm text-slate-600 leading-relaxed">
          Le document ou le module médical demandé n'existe pas ou a été déplacé.
        </p>
      </div>
      <Link
        href="/"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold shadow-xs transition-colors"
      >
        <Home className="w-4 h-4" />
        Retour à l'accueil
      </Link>
    </div>
  );
}
