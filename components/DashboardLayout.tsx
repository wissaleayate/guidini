'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Breadcrumbs } from './Breadcrumbs';
import { MobileBottomNav } from './MobileBottomNav';

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Authentication pages render with a dedicated focused layout
  const isAuthPage = pathname.startsWith('/auth');

  if (isAuthPage) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-teal-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 selection:bg-teal-500 selection:text-white">
        <div className="w-full max-w-md mx-auto">
          {children}
        </div>
        <footer className="mt-8 text-center text-xs text-slate-400 space-y-1">
          <p>
            Guidini • Faculté de Médecine - Constantine • Troisième Année (2026–2027)
          </p>
          <p className="text-[11px] text-teal-400/80 font-medium tracking-wide">
            Made by Belala Wissale Ayate Rrahmane
          </p>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex overflow-x-hidden">
      {/* Sidebar Navigation */}
      <Sidebar
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:pl-64 min-w-0 transition-all">
        <Header onOpenMobileMenu={() => setMobileMenuOpen(true)} />

        <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-6 pb-20 md:pb-6">
          <Breadcrumbs />
          {children}
        </main>

        <footer className="border-t border-slate-200 bg-white py-4 pb-20 md:pb-4 px-4 sm:px-6 text-center text-xs text-slate-500 space-y-1">
          <p>
            Guidini • Faculté de Médecine - Constantine • Troisième Année (2026–2027)
          </p>
          <p className="text-[11px] text-slate-400 font-medium">
            Made by Belala Wissale Ayate Rrahmane
          </p>
        </footer>

        {/* Mobile App Bottom Navigation Bar */}
        <MobileBottomNav />
      </div>
    </div>
  );
}
