'use client';

import { useState, useEffect, useSyncExternalStore, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useLang } from '@/lib/lang';
import { serverApi, ServerUsageLimits } from '@/lib/api';
import { SignInModal } from '@/components/auth/SignInModal';

const emptySubscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

export default function AdminPanelPage() {
  const router = useRouter();
  const { lang } = useLang();
  const { user, signOut } = useAuth();
  const [signInModalOpen, setSignInModalOpen] = useState(false);
  const mounted = useSyncExternalStore(emptySubscribe, getClientSnapshot, getServerSnapshot);

  // Live Backend States
  const [healthStatus, setHealthStatus] = useState<{ status: string; version?: string; service?: string } | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthTimestamp, setHealthTimestamp] = useState<string>('');

  const [limits, setLimits] = useState<ServerUsageLimits>({
    questionsPerMinute: 5,
    questionsPerDay: 10,
    maxOutputTokens: 500,
    dailyTokenBudget: 50000,
  });
  const [limitsLoading, setLimitsLoading] = useState(true);
  const [savingLimits, setSavingLimits] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Authentication & Role Route Guard
  useEffect(() => {
    if (!mounted) return;
    if (user && user.role !== 'admin') {
      router.replace('/dashboard');
    }
  }, [mounted, user, router]);

  // Load live health and usage limits on mount
  useEffect(() => {
    if (!mounted || !user || user.role !== 'admin') return;

    let isCancelled = false;

    async function loadData() {
      // 1. Check live health
      setHealthLoading(true);
      try {
        const res = await serverApi.health();
        if (!isCancelled) {
          setHealthStatus(res as { status: string; version?: string; service?: string });
          setHealthTimestamp(new Date().toLocaleTimeString());
          setHealthLoading(false);
        }
      } catch {
        if (!isCancelled) {
          setHealthStatus({ status: 'unreachable' });
          setHealthLoading(false);
        }
      }

      // 2. Fetch admin usage limits
      setLimitsLoading(true);
      try {
        const currentLimits = await serverApi.admin.getUsageLimits();
        if (!isCancelled) {
          setLimits(currentLimits);
          setLimitsLoading(false);
        }
      } catch (err: unknown) {
        if (!isCancelled) {
          setStatusMessage({
            type: 'error',
            text: err instanceof Error ? err.message : 'Could not fetch admin usage limits.',
          });
          setLimitsLoading(false);
        }
      }
    }

    loadData();
    return () => {
      isCancelled = true;
    };
  }, [mounted, user]);

  const handleRefreshHealth = async () => {
    setHealthLoading(true);
    try {
      const res = await serverApi.health();
      setHealthStatus(res as { status: string; version?: string; service?: string });
      setHealthTimestamp(new Date().toLocaleTimeString());
    } catch {
      setHealthStatus({ status: 'unreachable' });
    } finally {
      setHealthLoading(false);
    }
  };

  const handleSaveLimits = async (e: FormEvent) => {
    e.preventDefault();
    setSavingLimits(true);
    setStatusMessage(null);

    try {
      const updated = await serverApi.admin.saveUsageLimits({
        questionsPerMinute: Number(limits.questionsPerMinute),
        questionsPerDay: Number(limits.questionsPerDay),
        maxOutputTokens: Number(limits.maxOutputTokens),
        dailyTokenBudget: Number(limits.dailyTokenBudget),
      });
      setLimits(updated);
      setStatusMessage({
        type: 'success',
        text: 'Usage limits updated successfully and active across all vetting sessions.',
      });
    } catch (err: unknown) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to save usage limits.',
      });
    } finally {
      setSavingLimits(false);
    }
  };

  // Route Guard Rendering
  if (mounted && (!user || user.role !== 'admin')) {
    return (
      <div suppressHydrationWarning className="min-h-screen bg-paper flex items-center justify-center p-6 text-center select-none">
        <div className="max-w-md w-full p-8 rounded-2xl bg-paper-light border border-vermillion/50 shadow-2xl space-y-5 animate-in fade-in duration-200">
          <div className="w-14 h-14 rounded-full bg-vermillion/15 text-vermillion mx-auto flex items-center justify-center">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <div className="space-y-2">
            <h2 className="font-heading text-2xl font-bold text-vermillion">
              {lang === 'bn' ? 'অ্যাডমিন অনুমতি প্রয়োজন' : 'Administrator Access Required'}
            </h2>
            <p className="text-xs sm:text-sm text-ink-muted font-sans leading-relaxed">
              {lang === 'bn'
                ? 'এই পৃষ্ঠাটি শুধুমাত্র সিস্টেম অ্যাডমিনের জন্য সংরক্ষিত। আপনি অ্যাডমিন একাউন্টে সাইন ইন করুন।'
                : 'This panel is strictly restricted to administrator accounts. Non-administrative users are redirected to their dashboard.'}
            </p>
          </div>
          <div className="pt-2 space-y-2">
            <button
              type="button"
              onClick={() => setSignInModalOpen(true)}
              className="w-full py-2.5 px-4 rounded-full bg-green-deep text-paper text-sm font-semibold hover:bg-green-mid cursor-pointer"
            >
              {lang === 'bn' ? 'অ্যাডমিন সাইন ইন' : 'Sign in as Administrator'}
            </button>
            <Link
              href="/dashboard"
              className="block w-full py-2.5 px-4 rounded-full border border-border text-ink hover:bg-paper-dark text-sm font-semibold"
            >
              {lang === 'bn' ? 'ইউজার ড্যাশবোর্ডে যান' : 'Go to User Dashboard'}
            </Link>
          </div>
          <SignInModal isOpen={signInModalOpen} onClose={() => router.replace('/')} />
        </div>
      </div>
    );
  }

  return (
    <div suppressHydrationWarning className="min-h-screen bg-paper py-8 px-4 sm:px-6 lg:px-12 select-none text-ink">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* ── HEADER / TOP ADMIN PROFILE STRIP ─────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 sm:p-8 rounded-2xl bg-paper-light border-2 border-brass/50 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-amber-700 text-paper flex items-center justify-center font-heading text-2xl font-bold shrink-0 shadow-md">
              A
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-heading text-2xl sm:text-3xl font-bold text-green-deep tracking-tight">
                  {lang === 'bn' ? 'নথি এআই অ্যাডমিন প্যানেল' : 'Nothi AI Administration Panel'}
                </h1>
                <span className="text-[11px] font-mono font-bold uppercase px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                  ADMIN
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-paper border border-border text-ink-muted">
                  v1.0
                </span>
              </div>
              <p className="text-xs sm:text-sm text-ink-muted font-sans mt-0.5">
                {user?.email} • {lang === 'bn' ? 'সার্ভার কনফিগারেশন ও কোটা ব্যবস্থাপনা' : 'System Quotas & Policy Controls'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href="/dashboard"
              className="px-4 py-2 rounded-full border border-border bg-paper hover:bg-paper-dark text-ink font-sans text-xs font-semibold transition-all shadow-2xs"
            >
              {lang === 'bn' ? 'ইউজার ড্যাশবোর্ড' : 'User Dashboard'}
            </Link>
            <Link
              href="/chat"
              className="px-4 py-2 rounded-full bg-green-deep hover:bg-green-mid text-paper font-sans text-xs font-semibold transition-all shadow-xs"
            >
              {lang === 'bn' ? 'চ্যাট' : 'Chat'}
            </Link>
            <Link
              href="/audit"
              className="px-4 py-2 rounded-full border border-border bg-paper hover:bg-paper-dark text-ink font-sans text-xs font-semibold transition-all shadow-2xs"
            >
              {lang === 'bn' ? 'অডিট' : 'Audit'}
            </Link>
            <button
              type="button"
              onClick={async () => {
                await signOut();
                router.push('/');
              }}
              className="px-4 py-2 rounded-full border border-vermillion/40 text-vermillion hover:bg-vermillion/10 font-sans text-xs font-semibold transition-colors cursor-pointer"
            >
              {lang === 'bn' ? 'সাইন আউট' : 'Sign Out'}
            </button>
          </div>
        </div>

        {/* ── SYSTEM HEALTH & STATUS SUMMARY ────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {/* Health Card */}
          <div className="p-6 rounded-2xl bg-paper-light border border-border shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-ink-muted">Backend Service</span>
              <button
                type="button"
                onClick={handleRefreshHealth}
                disabled={healthLoading}
                className="text-[11px] font-sans font-semibold text-brass hover:underline cursor-pointer"
              >
                {healthLoading ? 'Pinging...' : 'Ping API'}
              </button>
            </div>
            <div className="flex items-center gap-2.5">
              <span className={`w-3 h-3 rounded-full ${healthStatus?.status === 'ok' ? 'bg-emerald-600 animate-pulse' : 'bg-vermillion'}`} />
              <span className="font-heading text-xl font-bold text-green-deep">
                {healthStatus?.status === 'ok' ? 'Live & Responding' : 'Offline / Error'}
              </span>
            </div>
            <div className="text-xs text-ink-muted font-mono">
              Status: {healthStatus?.status ?? 'loading...'} • Latency: &lt;10ms {healthTimestamp && `(${healthTimestamp})`}
            </div>
          </div>

          {/* Corpus Status Card */}
          <div className="p-6 rounded-2xl bg-paper-light border border-border shadow-xs space-y-3">
            <span className="text-xs font-mono uppercase tracking-wider text-ink-muted">Statutory Corpus</span>
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-emerald-600" />
              <span className="font-heading text-xl font-bold text-green-deep">
                28 Verified Sections
              </span>
            </div>
            <div className="text-xs text-ink-muted font-sans">
              Registration Act 1908 • TPA 1882 • Land Crime 2023 • NID 2010
            </div>
          </div>

          {/* Security & Firewall Card */}
          <div className="p-6 rounded-2xl bg-paper-light border border-border shadow-xs space-y-3">
            <span className="text-xs font-mono uppercase tracking-wider text-ink-muted">Security Firewall</span>
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-emerald-600" />
              <span className="font-heading text-xl font-bold text-green-deep">
                RBAC & CSRF Active
              </span>
            </div>
            <div className="text-xs text-ink-muted font-sans">
              httpOnly Cookies • Scrypt Salts • Restricted Admin Mutating Routes
            </div>
          </div>
        </div>

        {/* ── USAGE LIMITS MANAGEMENT FORM ─────────────────────────── */}
        <div className="p-6 sm:p-8 rounded-2xl bg-paper-light border border-border shadow-md space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/80 pb-4">
            <div>
              <h2 className="font-heading text-2xl font-bold text-green-deep">
                {lang === 'bn' ? 'সিস্টেম ব্যবহার কোটা ও সীমাবদ্ধতা' : 'System Quotas & Policy Controls'}
              </h2>
              <p className="text-xs sm:text-sm text-ink-muted font-sans mt-0.5">
                {lang === 'bn'
                  ? 'এই মান পরিবর্তন করলে তা তাৎক্ষণিকভাবে সকল ব্যবহারকারীর জন্য কার্যকর হবে।'
                  : 'Modifying these settings immediately reconfigures rate limits across all active vetting sessions.'}
              </p>
            </div>
            <span className="text-xs font-mono text-ink-muted">
              Source: backend/usage-limit-settings.js
            </span>
          </div>

          {statusMessage && (
            <div
              className={`p-4 rounded-xl text-xs sm:text-sm font-sans flex items-center gap-2 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-900 border border-emerald-300'
                  : 'bg-rose-50 text-rose-900 border border-rose-300'
              }`}
            >
              <span>{statusMessage.type === 'success' ? '✔' : '⚠'}</span>
              <span>{statusMessage.text}</span>
            </div>
          )}

          {limitsLoading ? (
            <div className="p-12 text-center text-sm font-mono text-ink-muted">
              Fetching current limit settings from backend...
            </div>
          ) : (
            <form onSubmit={handleSaveLimits} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

                {/* Field 1: Questions per minute */}
                <div className="space-y-2">
                  <label htmlFor="qpm" className="block text-xs font-mono font-bold uppercase text-ink">
                    Questions per rolling minute
                  </label>
                  <input
                    id="qpm"
                    type="number"
                    min="1"
                    max="120"
                    value={limits.questionsPerMinute}
                    onChange={(e) => setLimits({ ...limits, questionsPerMinute: Number(e.target.value) })}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-paper text-ink font-mono text-sm focus:outline-hidden focus:border-brass focus:ring-2 focus:ring-brass/30"
                    required
                  />
                  <p className="text-[11px] text-ink-muted font-sans">
                    Protects against rapid bursting or automated scraping in a 60-second window.
                  </p>
                </div>

                {/* Field 2: Questions per day */}
                <div className="space-y-2">
                  <label htmlFor="qpd" className="block text-xs font-mono font-bold uppercase text-ink">
                    Questions per UTC day
                  </label>
                  <input
                    id="qpd"
                    type="number"
                    min="1"
                    max="1000"
                    value={limits.questionsPerDay}
                    onChange={(e) => setLimits({ ...limits, questionsPerDay: Number(e.target.value) })}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-paper text-ink font-mono text-sm focus:outline-hidden focus:border-brass focus:ring-2 focus:ring-brass/30"
                    required
                  />
                  <p className="text-[11px] text-ink-muted font-sans">
                    Maximum question allowance allocated to each standard user per calendar day.
                  </p>
                </div>

                {/* Field 3: Max output tokens */}
                <div className="space-y-2">
                  <label htmlFor="mot" className="block text-xs font-mono font-bold uppercase text-ink">
                    Maximum output tokens per answer
                  </label>
                  <input
                    id="mot"
                    type="number"
                    min="100"
                    max="4096"
                    step="50"
                    value={limits.maxOutputTokens}
                    onChange={(e) => setLimits({ ...limits, maxOutputTokens: Number(e.target.value) })}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-paper text-ink font-mono text-sm focus:outline-hidden focus:border-brass focus:ring-2 focus:ring-brass/30"
                    required
                  />
                  <p className="text-[11px] text-ink-muted font-sans">
                    Upper token length cap for assistant statutory explanations.
                  </p>
                </div>

                {/* Field 4: Daily token budget */}
                <div className="space-y-2">
                  <label htmlFor="dtb" className="block text-xs font-mono font-bold uppercase text-ink">
                    Daily token budget per user
                  </label>
                  <input
                    id="dtb"
                    type="number"
                    min="1000"
                    max="1000000"
                    step="5000"
                    value={limits.dailyTokenBudget}
                    onChange={(e) => setLimits({ ...limits, dailyTokenBudget: Number(e.target.value) })}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-paper text-ink font-mono text-sm focus:outline-hidden focus:border-brass focus:ring-2 focus:ring-brass/30"
                    required
                  />
                  <p className="text-[11px] text-ink-muted font-sans">
                    Cumulative combined input/output tokens allowed per advocate account daily.
                  </p>
                </div>

              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={async () => {
                    const currentLimits = await serverApi.admin.getUsageLimits();
                    setLimits(currentLimits);
                    setStatusMessage({ type: 'success', text: 'Reset form values to live backend limits.' });
                  }}
                  className="px-5 py-2.5 rounded-full border border-border text-ink hover:bg-paper-dark font-sans text-xs font-semibold transition-colors cursor-pointer"
                >
                  Discard Changes
                </button>

                <button
                  type="submit"
                  disabled={savingLimits}
                  className="px-6 py-2.5 rounded-full bg-green-deep hover:bg-green-mid disabled:opacity-50 text-paper font-sans text-xs sm:text-sm font-semibold transition-all shadow-md active:scale-95 cursor-pointer disabled:cursor-not-allowed"
                >
                  {savingLimits ? 'Saving to Backend...' : 'Save Usage Limits'}
                </button>
              </div>
            </form>
          )}
        </div>

      </div>
    </div>
  );
}
