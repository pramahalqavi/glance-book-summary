import React, { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  Bookmark,
  BookOpen,
  Check,
  ChevronDown,
  Compass,
  Moon,
  Sun,
  Sunset,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { ReaderTheme } from '../types/book';

const THEME_OPTIONS: Array<{ value: ReaderTheme; label: string; icon: typeof Sun }> = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'sepia', label: 'Sepia', icon: Sunset },
  { value: 'dark', label: 'Dark', icon: Moon },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { bookmarks, preferences, updatePreferences } = useApp();
  const location = useLocation();
  const showMobileBack = location.pathname.startsWith('/book/');

  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const currentTheme =
    THEME_OPTIONS.find((t) => t.value === preferences.theme) ?? THEME_OPTIONS[0];
  const CurrentThemeIcon = currentTheme.icon;

  useEffect(() => {
    if (!themeMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setThemeMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setThemeMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [themeMenuOpen]);

  return (
    <div
      style={{
        backgroundColor: 'var(--reader-bg)',
        color: 'var(--reader-text)',
      }}
      className="min-h-[100dvh] w-full overflow-x-clip flex flex-col transition-colors duration-200"
    >
      {/* Top Navigation Bar */}
      <header
        style={{
          backgroundColor: 'var(--reader-surface)',
          borderColor: 'var(--reader-border)',
        }}
        className="sticky top-0 z-30 border-b pt-safe transition-colors duration-200"
      >
        <div className="max-w-6xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {/* Mobile Back Button to the left of Glance Logo */}
            {showMobileBack && (
              <Link
                to="/"
                aria-label="Back to Home"
                style={{
                  color: 'var(--reader-text)',
                  backgroundColor: 'var(--reader-surface-muted)',
                }}
                className="md:hidden w-10 h-10 rounded-full flex items-center justify-center shrink-0 active:scale-95 transition-transform"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
            )}

            <Link
              to="/"
              className="flex items-center gap-2.5 group focus:outline-none min-w-0"
              aria-label="Glance Home"
            >
              <div
                style={{ backgroundColor: 'var(--reader-accent)' }}
                className="w-9 h-9 rounded-xl flex items-center justify-center shadow-xs shrink-0 transition-transform group-hover:scale-105"
              >
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col leading-none truncate">
                <span className="font-serif-editorial text-xl font-bold tracking-tight truncate">
                  Glance
                </span>
                <span
                  style={{ color: 'var(--reader-muted)' }}
                  className="text-[11px] font-medium hidden sm:inline"
                >
                  Big ideas, distraction-free
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1" aria-label="Primary">
            <NavLink
              to="/"
              end
              style={({ isActive }) => ({
                backgroundColor: isActive ? 'var(--reader-accent)' : 'transparent',
                color: isActive ? '#ffffff' : 'var(--reader-muted)',
              })}
              className="px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2"
            >
              <Compass className="w-4 h-4" />
              Discover
            </NavLink>
            <NavLink
              to="/library"
              style={({ isActive }) => ({
                backgroundColor: isActive ? 'var(--reader-accent)' : 'transparent',
                color: isActive ? '#ffffff' : 'var(--reader-muted)',
              })}
              className="px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2"
            >
              <Bookmark className="w-4 h-4" />
              My Library
              {bookmarks.length > 0 && (
                <span className="ml-0.5 text-xs px-1.5 py-0.5 rounded-full bg-black/15 font-semibold">
                  {bookmarks.length}
                </span>
              )}
            </NavLink>
          </nav>

          {/* Global Theme Dropdown */}
          <div ref={dropdownRef} className="relative shrink-0">
            <button
              type="button"
              onClick={() => setThemeMenuOpen((prev) => !prev)}
              aria-haspopup="listbox"
              aria-expanded={themeMenuOpen}
              aria-label={`Theme: ${currentTheme.label}`}
              style={{
                backgroundColor: 'var(--reader-surface-muted)',
                borderColor: 'var(--reader-border)',
                color: 'var(--reader-text)',
              }}
              className="h-10 px-3.5 rounded-full border text-xs sm:text-sm font-medium inline-flex items-center gap-2 transition-colors cursor-pointer"
            >
              <CurrentThemeIcon
                style={{ color: 'var(--reader-accent)' }}
                className="w-4 h-4 shrink-0"
              />
              <span>{currentTheme.label}</span>
              <ChevronDown
                style={{ color: 'var(--reader-muted)' }}
                className={`w-3.5 h-3.5 transition-transform ${themeMenuOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {themeMenuOpen && (
              <div
                role="listbox"
                aria-label="Select theme"
                style={{
                  backgroundColor: 'var(--reader-surface)',
                  borderColor: 'var(--reader-border)',
                  color: 'var(--reader-text)',
                }}
                className="absolute right-0 mt-2 w-40 rounded-2xl border shadow-xl p-1.5 z-50"
              >
                {THEME_OPTIONS.map(({ value, label, icon: Icon }) => {
                  const active = preferences.theme === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      role="option"
                      aria-selected={active}
                      onClick={() => {
                        updatePreferences({ theme: value });
                        setThemeMenuOpen(false);
                      }}
                      style={{
                        backgroundColor: active ? 'var(--reader-surface-muted)' : 'transparent',
                        color: active ? 'var(--reader-accent)' : 'var(--reader-text)',
                      }}
                      className="w-full px-3 py-2.5 rounded-xl text-sm font-medium flex items-center justify-between gap-2 hover:opacity-90 transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4" />
                        <span>{label}</span>
                      </span>
                      {active && <Check className="w-4 h-4" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 pt-6 pb-24 md:pb-12">
        {children}
      </main>

      {/* Sticky Mobile Bottom Navigation */}
      <nav
        aria-label="Mobile navigation"
        style={{
          backgroundColor: 'var(--reader-surface)',
          borderColor: 'var(--reader-border)',
        }}
        className="md:hidden fixed bottom-0 left-0 right-0 w-full z-40 border-t pb-safe shadow-lg"
      >
        <div className="grid grid-cols-2 h-16 max-w-md mx-auto">
          <NavLink
            to="/"
            end
            style={({ isActive }) => ({
              color: isActive ? 'var(--reader-accent)' : 'var(--reader-muted)',
            })}
            className="flex flex-col items-center justify-center gap-1 text-xs font-semibold transition-colors min-h-[44px]"
          >
            <Compass className="w-5 h-5" />
            <span>Discover</span>
          </NavLink>
          <NavLink
            to="/library"
            style={({ isActive }) => ({
              color: isActive ? 'var(--reader-accent)' : 'var(--reader-muted)',
            })}
            className="flex flex-col items-center justify-center gap-1 text-xs font-semibold transition-colors min-h-[44px] relative"
          >
            <div className="relative">
              <Bookmark className="w-5 h-5" />
              {bookmarks.length > 0 && (
                <span
                  style={{ backgroundColor: 'var(--reader-accent)' }}
                  className="absolute -top-1 -right-2.5 min-w-[16px] h-4 px-1 rounded-full text-white text-[10px] font-bold flex items-center justify-center"
                >
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
