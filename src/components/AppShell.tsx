import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Bookmark, BookOpen, Cloud, Compass, HardDrive } from 'lucide-react';
import { useApp } from '../context/AppContext';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { dataSource, bookmarks } = useApp();

  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#fafaf9] text-slate-900">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-[#fafaf9]/90 backdrop-blur-md border-b border-stone-200/80 pt-safe">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link
            to="/"
            className="flex items-center gap-2.5 group focus:outline-none"
            aria-label="Glance Home"
          >
            <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center shadow-sm group-hover:bg-emerald-700 transition-colors">
              <BookOpen className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-serif-editorial text-xl font-bold tracking-tight text-slate-900">
                Glance
              </span>
              <span className="text-[11px] font-medium text-stone-500 hidden sm:inline">
                Big ideas, distraction-free
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1" aria-label="Primary">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${
                  isActive
                    ? 'bg-slate-900 text-white'
                    : 'text-stone-600 hover:text-slate-900 hover:bg-stone-200/60'
                }`
              }
            >
              <Compass className="w-4 h-4" />
              Discover
            </NavLink>
            <NavLink
              to="/library"
              className={({ isActive }) =>
                `px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${
                  isActive
                    ? 'bg-slate-900 text-white'
                    : 'text-stone-600 hover:text-slate-900 hover:bg-stone-200/60'
                }`
              }
            >
              <Bookmark className="w-4 h-4" />
              My Library
              {bookmarks.length > 0 && (
                <span className="ml-0.5 text-xs px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 font-semibold">
                  {bookmarks.length}
                </span>
              )}
            </NavLink>
          </nav>

          {/* Data Source Indicator */}
          <div
            className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-stone-100 border border-stone-200/80 text-stone-600"
            title={
              dataSource === 'firestore'
                ? 'Connected to Firebase Cloud Firestore (with offline cache)'
                : 'Running in Local-First Mode with built-in sample library'
            }
          >
            {dataSource === 'firestore' ? (
              <>
                <Cloud className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden sm:inline">Cloud Sync</span>
              </>
            ) : (
              <>
                <HardDrive className="w-3.5 h-3.5 text-amber-600" />
                <span className="hidden sm:inline">Local Library</span>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 pt-6 pb-24 md:pb-12">
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav
        aria-label="Mobile navigation"
        className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur-md border-t border-stone-200 pb-safe"
      >
        <div className="grid grid-cols-2 h-16 max-w-md mx-auto">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 text-xs font-medium transition-colors min-h-[44px] ${
                isActive ? 'text-emerald-700' : 'text-stone-500'
              }`
            }
          >
            <Compass className="w-5 h-5" />
            <span>Discover</span>
          </NavLink>
          <NavLink
            to="/library"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 text-xs font-medium transition-colors min-h-[44px] relative ${
                isActive ? 'text-emerald-700' : 'text-stone-500'
              }`
            }
          >
            <div className="relative">
              <Bookmark className="w-5 h-5" />
              {bookmarks.length > 0 && (
                <span className="absolute -top-1 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center">
                  {bookmarks.length}
                </span>
              )}
            </div>
            <span>My Library</span>
          </NavLink>
        </div>
      </nav>
    </div>
  );
}
