'use client';

import { useState, useRef, useEffect, useCallback, useSyncExternalStore } from 'react';
import { useAuth } from '@/lib/auth';
import { useLang } from '@/lib/lang';
import { serverApi } from '@/lib/api';

const emptySubscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

export function UserMenu() {
  const { user, signOut, updateProfile } = useAuth();
  const { lang, setLang } = useLang();
  const mounted = useSyncExternalStore(emptySubscribe, getClientSnapshot, getServerSnapshot);

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sessionOpen, setSessionOpen] = useState(false);

  // Profile Edit State
  const [editName, setEditName] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Session Quota State
  const [quotaData, setQuotaData] = useState<{
    questionsUsed: number;
    questionsLimit: number;
    tokensUsed: number;
    tokensLimit: number;
  } | null>(null);
  const [cacheCleared, setCacheCleared] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const triggerButtonRef = useRef<HTMLButtonElement>(null);

  const handleOpenSettings = useCallback(() => {
    setDropdownOpen(false);
    setEditName(user?.name || '');
    setSaveStatus('idle');
    setSettingsOpen(true);
  }, [user]);

  const handleOpenSession = useCallback(() => {
    setDropdownOpen(false);
    setCacheCleared(false);
    setSessionOpen(true);
  }, []);

  // Load real quota data when Session modal opens
  useEffect(() => {
    if (!sessionOpen || !user) return;
    serverApi.chats
      .getQuota()
      .then((data) => {
        if (data) {
          setQuotaData({
            questionsUsed: data.questionsUsed ?? 0,
            questionsLimit: data.questionsLimit ?? 10,
            tokensUsed: data.tokensUsed ?? 0,
            tokensLimit: data.tokensLimit ?? 50000,
          });
        }
      })
      .catch(() => {
        setQuotaData({
          questionsUsed: 0,
          questionsLimit: 10,
          tokensUsed: 0,
          tokensLimit: 50000,
        });
      });
  }, [sessionOpen, user]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      return () => document.removeEventListener('mousedown', handleOutsideClick);
    }
  }, [dropdownOpen]);

  // Keyboard navigation for dropdown & modals (Escape key closes)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (settingsOpen) {
          setSettingsOpen(false);
          triggerButtonRef.current?.focus();
        } else if (sessionOpen) {
          setSessionOpen(false);
          triggerButtonRef.current?.focus();
        } else if (dropdownOpen) {
          setDropdownOpen(false);
          triggerButtonRef.current?.focus();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dropdownOpen, settingsOpen, sessionOpen]);

  // Handle Logout cleanly
  const handleLogout = useCallback(async () => {
    setDropdownOpen(false);
    try {
      await signOut();
    } catch {
      // fallback
    } finally {
      if (typeof window !== 'undefined') {
        window.location.replace('/');
      }
    }
  }, [signOut]);

  // Handle saving profile name
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) return;
    setSaveStatus('saving');
    try {
      await updateProfile({ name: editName.trim() });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2500);
    } catch {
      setSaveStatus('error');
    }
  };

  // Clear chat cache
  const handleClearChatCache = () => {
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('nothi_ai_chat_v1');
        localStorage.removeItem('nothi_ai_sessions_v4');
        localStorage.removeItem('nothi_ai_active_session_v4');
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const key = localStorage.key(i);
          if (key && (key.startsWith('nothi_ai_sessions_') || key.startsWith('nothi_ai_active_session_'))) {
            localStorage.removeItem(key);
          }
        }
      }
      setCacheCleared(true);
    } catch {
      // ignore
    }
  };

  if (!mounted || !user) return null;

  const initials = user.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

  return (
    <div ref={menuRef} className="relative inline-block text-left">
      {/* User Avatar Button */}
      <button
        ref={triggerButtonRef}
        type="button"
        onClick={() => setDropdownOpen((prev) => !prev)}
        aria-expanded={dropdownOpen}
        aria-haspopup="true"
        aria-label="User menu"
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-paper-dark/70 hover:bg-paper-dark text-ink font-sans text-xs font-semibold shadow-2xs hover:border-brass/70 transition-all cursor-pointer min-h-[36px]"
      >
        <span className="w-5 h-5 rounded-full bg-green-deep text-paper font-mono text-[10px] flex items-center justify-center font-bold">
          {initials || 'U'}
        </span>
        <span className="max-w-[100px] truncate text-ink">{user.name.replace('Advocate ', 'Adv. ')}</span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          className={`text-ink-muted transition-transform duration-150 ${dropdownOpen ? 'rotate-180' : ''}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Dropdown Menu (Strictly 3 items: Settings, Session, Logout) */}
      {dropdownOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          className="absolute right-0 mt-2 w-56 rounded-xl border border-border bg-paper p-1.5 shadow-xl z-50 text-ink divide-y divide-border/50 animate-in fade-in slide-in-from-top-2 duration-150"
        >
          {/* User Identity Header */}
          <div className="px-3 py-2">
            <p className="text-xs font-bold text-ink truncate">{user.name}</p>
            <p className="text-[11px] font-mono text-ink-muted truncate">{user.email}</p>
          </div>

          {/* Working Items */}
          <div className="py-1">
            {/* 1. Settings */}
            <button
              type="button"
              role="menuitem"
              onClick={handleOpenSettings}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-sans text-ink hover:bg-paper-dark hover:text-green-deep transition-colors text-left cursor-pointer"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-brass">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              <span>{lang === 'bn' ? 'সেটিংস' : 'Settings'}</span>
            </button>

            {/* 2. Session */}
            <button
              type="button"
              role="menuitem"
              onClick={handleOpenSession}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-sans text-ink hover:bg-paper-dark hover:text-green-deep transition-colors text-left cursor-pointer"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-deep">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
              <span>{lang === 'bn' ? 'সেশন তথ্য' : 'Session'}</span>
            </button>
          </div>

          {/* 3. Logout */}
          <div className="py-1">
            <button
              type="button"
              role="menuitem"
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-sans text-vermillion hover:bg-rose-50 transition-colors text-left cursor-pointer font-semibold"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span>{lang === 'bn' ? 'লগআউট' : 'Logout'}</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Working Settings Modal ─────────────────────────────── */}
      {settingsOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="settings-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setSettingsOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-border bg-paper p-6 shadow-2xl text-ink space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border/80 pb-3">
              <div>
                <h3 id="settings-dialog-title" className="font-heading text-lg font-bold text-ink">
                  {lang === 'bn' ? 'ব্যবহারকারী সেটিংস' : 'User Settings'}
                </h3>
                <p className="font-sans text-xs text-ink-muted">
                  {lang === 'bn' ? 'ভাষা ও প্রোফাইল নাম পরিচালনা করুন' : 'Manage language and profile display name'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                className="p-1 rounded-md text-ink-muted hover:text-ink hover:bg-paper-dark transition-colors cursor-pointer"
                aria-label="Close settings"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              {/* Display Name Input */}
              <div className="space-y-1.5">
                <label htmlFor="settings-profile-name" className="block font-sans text-xs font-semibold text-ink">
                  {lang === 'bn' ? 'প্রদর্শিত নাম:' : 'Display Name:'}
                </label>
                <input
                  id="settings-profile-name"
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg border border-border bg-paper-light text-ink font-sans text-sm focus:border-brass focus:outline-hidden"
                  placeholder="Your full name"
                />
              </div>

              {/* Language Switcher */}
              <div className="space-y-1.5">
                <span className="block font-sans text-xs font-semibold text-ink">
                  {lang === 'bn' ? 'ইন্টারফেস ভাষা:' : 'Interface Language:'}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setLang('en')}
                    className={`flex-1 py-2 px-3 rounded-lg border text-xs font-sans font-semibold transition-colors cursor-pointer ${
                      lang === 'en'
                        ? 'border-green-deep bg-green-deep text-paper'
                        : 'border-border bg-paper-dark/60 text-ink hover:bg-paper-dark'
                    }`}
                  >
                    English (EN)
                  </button>
                  <button
                    type="button"
                    onClick={() => setLang('bn')}
                    className={`flex-1 py-2 px-3 rounded-lg border text-xs font-sans font-semibold transition-colors cursor-pointer ${
                      lang === 'bn'
                        ? 'border-green-deep bg-green-deep text-paper'
                        : 'border-border bg-paper-dark/60 text-ink hover:bg-paper-dark'
                    }`}
                  >
                    বাংলা (BN)
                  </button>
                </div>
              </div>

              {/* Status Notice */}
              {saveStatus === 'saved' && (
                <p className="text-xs font-sans text-emerald-700 bg-emerald-50 p-2 rounded-md border border-emerald-200">
                  {lang === 'bn' ? 'প্রোফাইল সফলভাবে আপডেট করা হয়েছে।' : 'Profile display name updated successfully.'}
                </p>
              )}
              {saveStatus === 'error' && (
                <p className="text-xs font-sans text-vermillion bg-rose-50 p-2 rounded-md border border-rose-200">
                  {lang === 'bn' ? 'আপডেট ব্যর্থ হয়েছে। আবার চেষ্টা করুন।' : 'Failed to update profile. Please try again.'}
                </p>
              )}

              {/* Actions */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-border/80">
                <button
                  type="button"
                  onClick={() => setSettingsOpen(false)}
                  className="px-4 py-2 rounded-lg border border-border text-ink font-sans text-xs font-medium hover:bg-paper-dark transition-colors cursor-pointer"
                >
                  {lang === 'bn' ? 'বন্ধ করুন' : 'Close'}
                </button>
                <button
                  type="submit"
                  disabled={saveStatus === 'saving' || !editName.trim()}
                  className="px-5 py-2 rounded-lg bg-green-deep hover:bg-green-mid disabled:opacity-50 text-paper font-sans text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  {saveStatus === 'saving'
                    ? (lang === 'bn' ? 'সংরক্ষণ হচ্ছে...' : 'Saving...')
                    : (lang === 'bn' ? 'সংরক্ষণ করুন' : 'Save Changes')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Working Session Modal ─────────────────────────────── */}
      {sessionOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="session-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setSessionOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-border bg-paper p-6 shadow-2xl text-ink space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border/80 pb-3">
              <div>
                <h3 id="session-dialog-title" className="font-heading text-lg font-bold text-ink">
                  {lang === 'bn' ? 'বর্তমান সেশন ও কোটা তথ্য' : 'Current Session & Quota'}
                </h3>
                <p className="font-sans text-xs text-ink-muted">
                  {lang === 'bn' ? 'প্রামাণিক ব্যবহারকারী ও সিস্টেম ডাটা' : 'Live authenticated account and quota limits'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSessionOpen(false)}
                className="p-1 rounded-md text-ink-muted hover:text-ink hover:bg-paper-dark transition-colors cursor-pointer"
                aria-label="Close session info"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 font-mono text-xs">
              {/* Account Details */}
              <div className="p-3.5 rounded-xl border border-border bg-paper-dark/60 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-ink-muted">User ID:</span>
                  <span className="font-bold text-ink truncate max-w-[180px]">{user.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-muted">Email:</span>
                  <span className="text-ink truncate max-w-[180px]">{user.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-muted">Role:</span>
                  <span className="text-brass font-bold uppercase">{user.role}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-muted">Chamber:</span>
                  <span className="text-ink">{user.chamber || 'Chamber Counsel'}</span>
                </div>
              </div>

              {/* Real Quota Details */}
              {quotaData && (
                <div className="p-3.5 rounded-xl border border-border bg-paper-dark/60 space-y-2">
                  <div className="text-[10px] uppercase font-bold text-brass tracking-wider">
                    {lang === 'bn' ? 'দৈনিক ব্যবহার কোটা' : 'Daily Usage Quota'}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-muted">Questions:</span>
                    <span className="text-ink font-bold">{quotaData.questionsUsed} / {quotaData.questionsLimit}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-muted">Tokens:</span>
                    <span className="text-ink font-bold">{quotaData.tokensUsed.toLocaleString()} / {quotaData.tokensLimit.toLocaleString()}</span>
                  </div>
                </div>
              )}

              {/* Clear Session / Chat Cache Action */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleClearChatCache}
                  className="w-full py-2.5 px-3 rounded-lg border border-border hover:border-vermillion/60 text-ink-muted hover:text-vermillion hover:bg-rose-50/50 font-sans text-xs font-semibold transition-colors text-center cursor-pointer"
                >
                  {cacheCleared
                    ? (lang === 'bn' ? '✓ ক্যাশ সফলভাবে মুছে ফেলা হয়েছে' : '✓ Chat Cache & Sessions Cleared')
                    : (lang === 'bn' ? 'লোকাল চ্যাট হিস্ট্রি ও ক্যাশ মুছুন' : 'Clear Local Chat & Session Cache')}
                </button>
              </div>
            </div>

            <div className="pt-2 flex justify-end border-t border-border/80">
              <button
                type="button"
                onClick={() => setSessionOpen(false)}
                className="px-4 py-2 rounded-lg bg-green-deep text-paper font-sans text-xs font-semibold hover:bg-green-mid transition-colors cursor-pointer"
              >
                {lang === 'bn' ? 'ঠিক আছে' : 'Done'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
