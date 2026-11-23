import React, { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Bookmark,
  BookOpen,
  Check,
  ChevronDown,
  Cloud,
  CloudOff,
  Compass,
  Loader2,
  LogOut,
  Moon,
  Sun,
  Sunset,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { GoogleLogo } from './GoogleLogo';
import type { ReaderTheme } from '../types/book';

const THEME_OPTIONS: Array<{ value: ReaderTheme; label: string; icon: typeof Sun }> = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'sepia', label: 'Sepia', icon: Sunset },
  { value: 'dark', label: 'Dark', icon: Moon },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const {
    bookmarks,
    preferences,
    updatePreferences,
    isAuthAvailable,
    user,
    authLoading,
    authBusy,
    authError,
    clearAuthError,
    syncStatus,
    signInWithGoogle,
    signOutUser,
  } = useApp();
  const location = useLocation();
  const showMobileBack = location.pathname.startsWith('/book/');

  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const themeDropdownRef = useRef<HTMLDivElement | null>(null);
  const accountDropdownRef = useRef<HTMLDivElement | null>(null);

  const currentTheme =
    THEME_OPTIONS.find((t) => t.value === preferences.theme) ?? THEME_OPTIONS[0];
  const CurrentThemeIcon = currentTheme.icon;

  useEffect(() => {
    setAvatarError(false);
  }, [user?.photoURL]);

  useEffect(() => {
    if (!themeMenuOpen && !accountMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        themeMenuOpen &&
        themeDropdownRef.current &&
        !themeDropdownRef.current.contains(e.target as Node)
      ) {
        setThemeMenuOpen(false);
      }
      if (
        accountMenuOpen &&
        accountDropdownRef.current &&
        !accountDropdownRef.current.contains(e.target as Node)
      ) {
        setAccountMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setThemeMenuOpen(false);
        setAccountMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [themeMenuOpen, accountMenuOpen]);

  const userInitial = (
    user?.displayName?.trim()?.[0] ||
    user?.email?.trim()?.[0] ||
    'G'
  ).toUpperCase();

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

          {/* Right Controls: Theme Dropdown + Optional Google Account */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Global Theme Dropdown */}
            <div ref={themeDropdownRef} className="relative shrink-0">
              <button
                type="button"
                onClick={() => {
                  setAccountMenuOpen(false);
                  setThemeMenuOpen((prev) => !prev);
                }}
                aria-haspopup="listbox"
                aria-expanded={themeMenuOpen}
                aria-label={`Theme: ${currentTheme.label}`}
                style={{
                  backgroundColor: 'var(--reader-surface-muted)',
                  borderColor: 'var(--reader-border)',
                  color: 'var(--reader-text)',
                }}
                className="h-10 px-2.5 sm:px-3.5 rounded-full border text-xs sm:text-sm font-medium inline-flex items-center gap-1.5 sm:gap-2 transition-colors cursor-pointer"
              >
                <CurrentThemeIcon
                  style={{ color: 'var(--reader-accent)' }}
                  className="w-4 h-4 shrink-0"
                />
                <span className="hidden sm:inline">{currentTheme.label}</span>
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

            {/* Optional Google OAuth Account Control */}
            {isAuthAvailable && (
              <div ref={accountDropdownRef} className="relative shrink-0">
                {authLoading ? (
                  <div
                    style={{
                      backgroundColor: 'var(--reader-surface-muted)',
                      borderColor: 'var(--reader-border)',
                    }}
                    className="w-10 h-10 rounded-full border animate-pulse"
                    aria-hidden="true"
                  />
                ) : !user ? (
                  <button
                    type="button"
                    disabled={authBusy}
                    onClick={() => {
                      void signInWithGoogle();
                    }}
                    aria-label="Sign in with Google"
                    style={{
                      backgroundColor: 'var(--reader-surface)',
                      borderColor: 'var(--reader-border)',
                      color: 'var(--reader-text)',
                    }}
                    className="h-10 px-3 sm:px-3.5 rounded-full border text-xs sm:text-sm font-semibold inline-flex items-center gap-2 shadow-2xs hover:shadow-xs disabled:opacity-60 transition-all cursor-pointer"
                  >
                    {authBusy ? (
                      <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                    ) : (
                      <GoogleLogo className="w-4 h-4 shrink-0" />
                    )}
                    <span>Sign in</span>
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setThemeMenuOpen(false);
                        setAccountMenuOpen((prev) => !prev);
                      }}
                      aria-haspopup="menu"
                      aria-expanded={accountMenuOpen}
                      aria-label={`Account menu for ${user.displayName || user.email || 'user'}`}
                      style={{
                        borderColor: 'var(--reader-border)',
                        backgroundColor: 'var(--reader-surface-muted)',
                      }}
                      className="relative w-10 h-10 rounded-full border p-0.5 flex items-center justify-center hover:opacity-90 transition-opacity cursor-pointer"
                    >
                      {user.photoURL && !avatarError ? (
                        <img
                          src={user.photoURL}
                          alt={user.displayName || 'Google profile'}
                          referrerPolicy="no-referrer"
                          onError={() => setAvatarError(true)}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <span
                          style={{ backgroundColor: 'var(--reader-accent)' }}
                          className="w-full h-full rounded-full text-white text-sm font-bold flex items-center justify-center"
                        >
                          {userInitial}
                        </span>
                      )}
                      <span
                        title={
                          syncStatus === 'syncing'
                            ? 'Syncing library...'
                            : syncStatus === 'error'
                            ? 'Cloud sync issue — saved locally'
                            : 'Library synced'
                        }
                        className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 ${
                          syncStatus === 'syncing'
                            ? 'bg-amber-400 animate-pulse'
                            : syncStatus === 'error'
                            ? 'bg-rose-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ borderColor: 'var(--reader-surface)' }}
                      />
                    </button>

                    {accountMenuOpen && (
                      <div
                        role="menu"
                        aria-label="Account menu"
                        style={{
                          backgroundColor: 'var(--reader-surface)',
                          borderColor: 'var(--reader-border)',
                          color: 'var(--reader-text)',
                        }}
                        className="absolute right-0 mt-2 w-64 rounded-2xl border shadow-xl p-2 z-50"
                      >
                        <div
                          style={{ borderColor: 'var(--reader-border)' }}
                          className="px-3 py-2.5 border-b mb-1.5"
                        >
                          <p className="text-sm font-semibold truncate">
                            {user.displayName || 'Google Account'}
                          </p>
                          {user.email && (
                            <p
                              style={{ color: 'var(--reader-muted)' }}
                              className="text-xs truncate mt-0.5"
                            >
                              {user.email}
                            </p>
                          )}
                          <div className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-medium">
                            {syncStatus === 'syncing' ? (
                              <>
                                <Loader2
                                  style={{ color: 'var(--reader-accent)' }}
                                  className="w-3.5 h-3.5 animate-spin"
                                />
                                <span style={{ color: 'var(--reader-muted)' }}>
                                  Syncing library...
                                </span>
                              </>
                            ) : syncStatus === 'error' ? (
                              <>
                                <CloudOff className="w-3.5 h-3.5 text-rose-500" />
                                <span className="text-rose-500">
                                  Sync paused — saved locally
                                </span>
                              </>
                            ) : (
                              <>
                                <Cloud
                                  style={{ color: 'var(--reader-accent)' }}
                                  className="w-3.5 h-3.5"
                                />
                                <span style={{ color: 'var(--reader-accent)' }}>
                                  Library synced across devices
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          role="menuitem"
                          disabled={authBusy}
                          onClick={() => {
                            setAccountMenuOpen(false);
                            void signOutUser();
                          }}
                          className="w-full px-3 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2.5 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 disabled:opacity-50 transition-colors cursor-pointer"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Sign out</span>
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Non-intrusive Auth Error Banner (if sign-in fails from any route) */}
      {authError && (
        <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 pt-3">
          <div
            role="alert"
            style={{
              backgroundColor: 'var(--reader-surface)',
              borderColor: 'var(--reader-border)',
            }}
            className="rounded-2xl border px-4 py-3 flex items-start justify-between gap-3 text-xs sm:text-sm shadow-xs"
          >
            <div className="flex items-start gap-2.5 min-w-0">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <p className="leading-snug">{authError}</p>
            </div>
            <button
              type="button"
              onClick={clearAuthError}
              aria-label="Dismiss sign-in error"
              style={{ color: 'var(--reader-muted)' }}
              className="p-1 rounded-lg hover:bg-black/5 shrink-0 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

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
