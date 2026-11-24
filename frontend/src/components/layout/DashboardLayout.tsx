import React, { useState } from 'react';
import { ChevronRight, Menu, ScanLine } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { ROUTE_TITLES } from '../../data/navigation';
import { Button } from '../common/Button';
import { Sidebar } from './Sidebar';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const isAnalysisDetail = location.pathname.startsWith('/analysis/');
  const routeMeta = isAnalysisDetail
    ? { title: 'Product Analysis', parent: 'History' }
    : ROUTE_TITLES[location.pathname] || { title: 'NutriLens' };

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#1F1A17] flex">
      <Sidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 bg-white border-b border-[#E8E1D5] px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden p-2 -ml-1 rounded-[8px] text-[#5C534A] hover:bg-[#F3EDE2] hover:text-[#1F1A17] cursor-pointer"
            >
              <Menu className="w-5 h-5" strokeWidth={1.75} />
            </button>

            <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[13px] min-w-0">
              {routeMeta.parent && (
                <>
                  <Link
                    to={routeMeta.parent === 'History' ? '/history' : '/dashboard'}
                    className="text-[#6A6057] hover:text-[#1F1A17] transition-colors whitespace-nowrap hidden sm:inline"
                  >
                    {routeMeta.parent}
                  </Link>
                  <ChevronRight
                    className="w-3.5 h-3.5 text-[#B5A999] shrink-0 hidden sm:inline"
                    strokeWidth={1.75}
                  />
                </>
              )}
              <span className="font-display text-[15px] font-bold text-[#1F1A17] truncate">
                {routeMeta.title}
              </span>
            </nav>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {location.pathname !== '/scan' && (
              <Link to="/scan">
                <Button variant="primary" size="sm">
                  <ScanLine className="w-4 h-4" strokeWidth={2} />
                  <span>Scan Product</span>
                </Button>
              </Link>
            )}
          </div>
        </header>

        <main className="flex-1 w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
