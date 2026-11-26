import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { BrandMark } from '../common/BrandMark';
import { Button } from '../common/Button';

export function PublicLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#1F1A17] flex flex-col">
      <header className="bg-white border-b border-[#E8E1D5] sticky top-0 z-30">
        <div className="max-w-[1280px] mx-auto h-16 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-8">
          <Link to="/" className="focus:outline-none whitespace-nowrap shrink-0">
            <BrandMark />
          </Link>

          <nav
            aria-label="Public navigation"
            className="hidden md:flex items-center gap-7 text-[14px] font-medium text-[#5C534A]"
          >
            <a
              href="/#how-it-works"
              className="hover:text-[#1F1A17] transition-colors whitespace-nowrap shrink-0"
            >
              How It Works
            </a>
            <a
              href="/#capabilities"
              className="hover:text-[#1F1A17] transition-colors whitespace-nowrap shrink-0"
            >
              Capabilities
            </a>
            <Link
              to="/support"
              className="hover:text-[#1F1A17] transition-colors whitespace-nowrap shrink-0"
            >
              Support
            </Link>
            {!isAuthenticated && (
              <Link
                to="/login"
                className="hover:text-[#1F1A17] transition-colors whitespace-nowrap shrink-0"
              >
                Sign In
              </Link>
            )}
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <Link to={isAuthenticated ? '/dashboard' : '/register'} className="hidden sm:block">
              <Button variant="primary" size="sm">
                {isAuthenticated ? 'Open Dashboard' : 'Get Started'}
              </Button>
            </Link>
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label="Toggle menu"
              className="md:hidden p-2 rounded-[8px] text-[#5C534A] hover:bg-[#F3EDE2] cursor-pointer"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" strokeWidth={1.75} />
              ) : (
                <Menu className="w-5 h-5" strokeWidth={1.75} />
              )}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-[#E8E1D5] px-4 py-4 space-y-2">
            <a
              href="/#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-[8px] text-[14px] font-medium text-[#1F1A17] hover:bg-[#F3EDE2]"
            >
              How It Works
            </a>
            <a
              href="/#capabilities"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-[8px] text-[14px] font-medium text-[#1F1A17] hover:bg-[#F3EDE2]"
            >
              Capabilities
            </a>
            <Link
              to="/support"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-[8px] text-[14px] font-medium text-[#1F1A17] hover:bg-[#F3EDE2]"
            >
              Support
            </Link>
            <div className="pt-2 border-t border-[#E8E1D5] flex flex-col gap-2">
              {isAuthenticated ? (
                <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="primary" fullWidth>
                    Open Dashboard
                  </Button>
                </Link>
              ) : (
                <>
                  <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="outline" fullWidth>
                      Sign In
                    </Button>
                  </Link>
                  <Link to="/register" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="primary" fullWidth>
                      Get Started
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="bg-white border-t border-[#E8E1D5]">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <BrandMark />
            <span className="text-[13px] text-[#6A6057]">
              Clear ingredient &amp; nutrition intelligence for everyday food choices.
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-6 text-[13px] text-[#5C534A]">
            <Link to="/login" className="hover:text-[#1F1A17] transition-colors">
              Sign In
            </Link>
            <Link to="/register" className="hover:text-[#1F1A17] transition-colors">
              Create Account
            </Link>
            <Link to="/support" className="hover:text-[#1F1A17] transition-colors">
              Support &amp; FAQ
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
