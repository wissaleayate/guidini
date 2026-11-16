'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home, Shield, Sparkles } from 'lucide-react';
import { useAuth } from '@/lib/context/auth-context';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function Breadcrumbs() {
  const pathname = usePathname();
  const { role } = useAuth();

  // If on auth routes, don't show breadcrumbs
  if (pathname.startsWith('/auth')) {
    return null;
  }

  const getBreadcrumbs = (): BreadcrumbItem[] => {
    const items: BreadcrumbItem[] = [];

    if (pathname.startsWith('/admin')) {
      items.push({ label: 'Administration', href: '/admin' });

      if (pathname === '/admin' || pathname === '/admin/curriculum') {
        items.push({ label: 'Gestion Curriculum' });
      } else if (pathname === '/admin/exams') {
        items.push({ label: 'Gestion des Examens' });
      } else if (pathname === '/admin/users') {
        items.push({ label: 'Gestion des Étudiants' });
      } else if (pathname === '/admin/cohort') {
        items.push({ label: 'Paramètres Cohorte' });
      } else if (pathname === '/admin/import') {
        items.push({ label: 'Import CSV & Excel' });
      } else if (pathname === '/admin/announcements') {
        items.push({ label: 'Annonces Officielles' });
      } else {
        const seg = pathname.replace('/admin/', '');
        items.push({ label: seg.charAt(0).toUpperCase() + seg.slice(1) });
      }
    } else {
      items.push({ label: 'Espace Étudiant', href: '/student' });

      if (pathname === '/student') {
        items.push({ label: 'Tableau de Bord' });
      } else if (pathname === '/') {
        items.push({ label: 'Curriculum & Modules' });
      } else if (pathname === '/student/exams') {
        items.push({ label: 'Examens & Contrôles' });
      } else if (pathname === '/student/progress') {
        items.push({ label: 'Suivi & Révisions' });
      } else if (pathname === '/student/radar') {
        items.push({ label: 'Radar de Rattrapage' });
      } else if (pathname === '/student/profile') {
        items.push({ label: 'Mon Profil Étudiant' });
      } else if (pathname.startsWith('/student/subjects/')) {
        items.push({ label: 'Curriculum', href: '/' });
        items.push({ label: 'Détail de la Matière' });
      } else {
        const seg = pathname.replace('/student/', '');
        items.push({ label: seg.charAt(0).toUpperCase() + seg.slice(1) });
      }
    }

    return items;
  };

  const breadcrumbs = getBreadcrumbs();
  const isAdmin = pathname.startsWith('/admin');

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4 mb-4 border-b border-slate-200/80 text-xs select-none"
    >
      {/* Path Crumbs */}
      <ol className="flex items-center gap-1.5 flex-wrap text-slate-500 font-medium">
        <li>
          <Link
            href={role === 'admin' ? '/admin' : '/student'}
            className="flex items-center gap-1 text-slate-500 hover:text-teal-700 transition-colors"
            title="Accueil"
          >
            <Home className="w-3.5 h-3.5" />
            <span className="sr-only">Accueil</span>
          </Link>
        </li>

        {breadcrumbs.map((item, idx) => {
          const isLast = idx === breadcrumbs.length - 1;
          return (
            <React.Fragment key={idx}>
              <li className="text-slate-300">
                <ChevronRight className="w-3 h-3" />
              </li>
              <li>
                {item.href && !isLast ? (
                  <Link
                    href={item.href}
                    className="hover:text-teal-700 transition-colors"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span
                    className={
                      isLast
                        ? 'font-bold text-slate-900'
                        : 'text-slate-600'
                    }
                  >
                    {item.label}
                  </span>
                )}
              </li>
            </React.Fragment>
          );
        })}
      </ol>

      {/* Cohort Identity Pill */}
      <div className="flex items-center gap-2 self-start sm:self-auto">
        {isAdmin ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-300/80">
            <Shield className="w-3 h-3 text-amber-600" />
            Portail Administration
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-50 text-teal-800 border border-teal-200/80">
            <Sparkles className="w-3 h-3 text-teal-600" />
            DFGSM 2 • 2026–2027
          </span>
        )}
      </div>
    </nav>
  );
}
