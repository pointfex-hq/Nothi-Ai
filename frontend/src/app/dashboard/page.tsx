'use client';

import { useState, useEffect, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useLang } from '@/lib/lang';
import { serverApi, ServerChatSummary } from '@/lib/api';
import { SignInModal } from '@/components/auth/SignInModal';

const emptySubscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

interface UserQuotaData {
  questionsUsed: number;
  questionsLimit: number;
  tokensUsed: number;
  tokensLimit: number;
  questionsPerMinute: number;
  resetAt: string;
}

export default function UserDashboardPage() {
  const router = useRouter();
  const { lang } = useLang();
  const { user, signOut } = useAuth();
  const [signInModalOpen, setSignInModalOpen] = useState(false);
  const mounted = useSyncExternalStore(emptySubscribe, getClientSnapshot, getServerSnapshot);

  // Live Backend Data States
  const [quota, setQuota] = useState<UserQuotaData | null>(null);
  const [chats, setChats] = useState<ServerChatSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mounted || !user) return;

    let isCancelled = false;
    async function loadDashboardData() {
      setLoading(true);
      try {
        const [quotaData, chatList] = await Promise.all([
          serverApi.chats.getQuota().catch(() => ({
            questionsUsed: 0,
            questionsLimit: 10,
            tokensUsed: 0,
            tokensLimit: 50000,
            questionsPerMinute: 5,
            resetAt: new Date(Date.now() + 86400000).toISOString(),
          })),
          serverApi.chats.list().catch(() => []),
        ]);

        if (!isCancelled) {
          setQuota(quotaData);
          setChats(chatList);
          setLoading(false);
        }
      } catch (err: unknown) {
        if (!isCancelled) {
          setError(err instanceof Error ? err.message : 'Could not load dashboard data.');
          setLoading(false);
        }
      }
    }

    loadDashboardData();
    return () => {
      isCancelled = true;
    };
  }, [mounted, user]);

  // Authentication Route Guard
  if (mounted && !user) {
    return (
      <div suppressHydrationWarning className="min-h-screen bg-paper flex items-center justify-center p-6 text-center select-none">
        <div className="max-w-md w-full p-8 rounded-2xl bg-paper-light border border-brass/50 shadow-2xl space-y-5 animate-in fade-in duration-200">
          <div className="w-14 h-14 rounded-full bg-brass/15 text-green-deep mx-auto flex items-center justify-center">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <div className="space-y-2">
            <h2 className="font-heading text-2xl font-bold text-green-deep">
              {lang === 'bn' ? 'সাইন ইন আবশ্যক' : 'Authentication Required'}
            </h2>
            <p className="text-xs sm:text-sm text-ink-muted font-sans leading-relaxed">
              {lang === 'bn'
                ? 'ড্যাশবোর্ড ব্যবহারের জন্য আপনার নিবন্ধিত একাউন্টে সাইন ইন করুন।'
                : 'Sign in to access your advocate workspace, usage quota, and document records.'}
            </p>
          </div>
          <div className="pt-2 space-y-2">
            <button
              type="button"
              onClick={() => setSignInModalOpen(true)}
              className="w-full py-3 px-5 rounded-full bg-green-deep hover:bg-green-mid text-paper text-sm font-semibold transition-all shadow-md active:scale-95 cursor-pointer"
            >
              {lang === 'bn' ? 'সাইন ইন করুন' : 'Sign In to Continue'}
            </button>
            <Link
              href="/"
              className="block text-xs font-sans text-ink-muted hover:text-ink py-1.5 transition-colors"
            >
              {lang === 'bn' ? '← হোমপেজে ফিরে যান' : '← Return to Home'}
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

        {/* ── TOP HEADER / USER INFO CARD ──────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 sm:p-8 rounded-2xl bg-paper-light border border-border shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-green-deep text-paper flex items-center justify-center font-heading text-2xl font-bold shrink-0 shadow-md">
              {user?.name ? user.name[0].toUpperCase() : 'U'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-heading text-2xl sm:text-3xl font-bold text-green-deep tracking-tight">
                  {user?.name}
                </h1>
                <span className={`text-[11px] font-mono font-bold uppercase px-2.5 py-0.5 rounded-full border ${
                  user?.role === 'admin'
                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                    : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                }`}>
                  {user?.role}
                </span>
                {user?.role === 'admin' && (
                  <Link
                    href="/admin"
                    className="text-xs font-sans font-bold text-brass hover:underline ml-1"
                  >
                    {lang === 'bn' ? 'অ্যাডমিন প্যানেলে যান →' : 'Go to Admin Panel →'}
                  </Link>
                )}
              </div>
              <p className="text-xs sm:text-sm text-ink-muted font-sans mt-0.5">
                {user?.email} • {user?.chamber || (lang === 'bn' ? 'চেম্বার কাউন্সিল' : 'Chamber Counsel')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="px-4 py-2 rounded-full border border-border bg-paper hover:bg-paper-dark text-ink font-sans text-xs font-semibold transition-all shadow-2xs"
            >
              {lang === 'bn' ? 'হোমপেজ' : 'Public Site'}
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

        {error && (
          <div className="p-4 rounded-xl bg-rose-50 text-rose-900 border border-rose-300 text-xs sm:text-sm font-sans flex items-center gap-2">
            <span>⚠</span>
            <span>{error}</span>
          </div>
        )}

        {/* ── QUICK WORKSPACE ACTIONS ──────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Action 1: Statutory Chat */}
          <div className="p-6 sm:p-7 rounded-2xl bg-gradient-to-br from-green-deep/95 to-green-deep text-paper shadow-lg flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-paper/10 border border-paper/20 text-xs font-mono text-paper-light">
                <span className="w-2 h-2 rounded-full bg-brass animate-pulse" />
                <span>28 Verified Sections • Zero Fabrication</span>
              </div>
              <h2 className="font-heading text-2xl font-bold tracking-tight">
                {lang === 'bn' ? 'সংবিধিবদ্ধ আইনি সহকারী' : 'Statutory Legal Assistant'}
              </h2>
              <p className="text-xs sm:text-sm text-paper-dark/90 font-sans leading-relaxed">
                {lang === 'bn'
                  ? 'রেজিস্ট্রেশন আইন, সম্পত্তি হস্তান্তর আইন ও এনআইডি বিধিমালার ধারায় দলিল ও স্বত্বলিপি পরীক্ষা করুন।'
                  : 'Examine deed presentation deadlines, schedule plot continuity, and statutory NID compliance.'}
              </p>
            </div>
            <div>
              <Link
                href="/chat"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-brass hover:bg-brass-light text-desk-dark text-xs sm:text-sm font-bold tracking-wide transition-all shadow-md active:scale-95"
              >
                <span>{lang === 'bn' ? 'চ্যাট ওপেন করুন' : 'Launch Statutory Chat'}</span>
                <span>→</span>
              </Link>
            </div>
          </div>

          {/* Action 2: Audit Workspace */}
          <div className="p-6 sm:p-7 rounded-2xl bg-paper-light border-2 border-border shadow-md flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brass/15 border border-brass/30 text-xs font-mono text-ink">
                <span>Dual-Pane Triad Vetting</span>
              </div>
              <h2 className="font-heading text-2xl font-bold text-green-deep tracking-tight">
                {lang === 'bn' ? 'দলিল অডিট ওয়ার্কস্পেস' : 'Document Audit Workspace'}
              </h2>
              <p className="text-xs sm:text-sm text-ink-muted font-sans leading-relaxed">
                {lang === 'bn'
                  ? 'সাফ কবলা দলিল, আরএস/বিএস খতিয়ান ও এনআইডির ক্রস-ডকুমেন্ট প্যারিটি ও লাল/হলুদ/সবুজ ফ্ল্যাগ নিরীক্ষা।'
                  : 'Automated entity alignment, discrepancy inspection, and formal Vetting Memorandum generation.'}
              </p>
            </div>
            <div>
              <Link
                href="/audit"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-green-deep hover:bg-green-mid text-paper text-xs sm:text-sm font-bold tracking-wide transition-all shadow-md active:scale-95"
              >
                <span>{lang === 'bn' ? 'অডিট শুরু করুন' : 'Launch Audit Workspace'}</span>
                <span>→</span>
              </Link>
            </div>
          </div>
        </div>

        {/* ── LIVE USAGE LIMITS & QUOTA MONITOR ─────────────────────── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-xl font-bold text-green-deep">
              {lang === 'bn' ? 'ব্যবহার কোটা ও সীমা' : 'Live Usage Quotas & Limits'}
            </h2>
            <span className="text-xs font-mono text-ink-muted">
              Live from Backend ({quota?.resetAt ? `Reset: ${new Date(quota.resetAt).toLocaleTimeString()}` : 'UTC Day'})
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Metric 1 */}
            <div className="p-5 rounded-xl bg-paper-light border border-border shadow-2xs space-y-2">
              <div className="text-xs font-mono text-ink-muted uppercase">Daily Questions</div>
              <div className="font-heading text-2xl font-bold text-green-deep">
                {quota ? `${quota.questionsUsed} / ${quota.questionsLimit}` : '—'}
              </div>
              <div className="w-full bg-border/60 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-600 h-full rounded-full transition-all"
                  style={{
                    width: quota ? `${Math.min(100, (quota.questionsUsed / quota.questionsLimit) * 100)}%` : '0%',
                  }}
                />
              </div>
              <div className="text-[11px] text-ink-muted">Statutory questions permitted per UTC day</div>
            </div>

            {/* Metric 2 */}
            <div className="p-5 rounded-xl bg-paper-light border border-border shadow-2xs space-y-2">
              <div className="text-xs font-mono text-ink-muted uppercase">Daily Token Budget</div>
              <div className="font-heading text-2xl font-bold text-green-deep">
                {quota ? `${quota.tokensUsed.toLocaleString()} / ${quota.tokensLimit.toLocaleString()}` : '—'}
              </div>
              <div className="w-full bg-border/60 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-brass h-full rounded-full transition-all"
                  style={{
                    width: quota ? `${Math.min(100, (quota.tokensUsed / quota.tokensLimit) * 100)}%` : '0%',
                  }}
                />
              </div>
              <div className="text-[11px] text-ink-muted">Document and context token allowance</div>
            </div>

            {/* Metric 3 */}
            <div className="p-5 rounded-xl bg-paper-light border border-border shadow-2xs space-y-2">
              <div className="text-xs font-mono text-ink-muted uppercase">Rate Limit</div>
              <div className="font-heading text-2xl font-bold text-green-deep">
                {quota ? `${quota.questionsPerMinute} req/min` : '—'}
              </div>
              <div className="text-[11px] text-ink-muted pt-2">Max queries permitted in a rolling 60-second window</div>
            </div>

            {/* Metric 4 */}
            <div className="p-5 rounded-xl bg-paper-light border border-border shadow-2xs space-y-2">
              <div className="text-xs font-mono text-ink-muted uppercase">Account Tier</div>
              <div className="font-heading text-2xl font-bold text-green-deep">
                {user?.plan ? user.plan.toUpperCase() : 'BASIC'}
              </div>
              <div className="text-[11px] text-ink-muted pt-2">
                {user?.role === 'admin' ? 'Uncapped Administrative Privileges' : 'Standard Advocate Chamber Plan'}
              </div>
            </div>
          </div>
        </div>

        {/* ── RECENT EXAMINATION SESSIONS ──────────────────────────── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-xl font-bold text-green-deep">
              {lang === 'bn' ? 'সাম্প্রতিক আইনি পরীক্ষা সেশন' : 'Recent Examination Sessions'}
            </h2>
            <Link
              href="/chat"
              className="text-xs font-sans font-semibold text-green-deep hover:underline"
            >
              {lang === 'bn' ? 'নতুন চ্যাট শুরু করুন →' : 'Start New Session →'}
            </Link>
          </div>

          {loading ? (
            <div className="p-8 text-center text-sm font-mono text-ink-muted bg-paper-light rounded-xl border border-border">
              Loading recent sessions from server...
            </div>
          ) : chats.length === 0 ? (
            <div className="p-8 text-center rounded-xl bg-paper-light border border-border space-y-3">
              <p className="text-sm font-sans text-ink-muted">
                {lang === 'bn'
                  ? 'এখনও কোনো সেভ করা সেশন নেই। আপনার প্রথম আইনি পরীক্ষা শুরু করুন।'
                  : 'No saved examination sessions found yet. Launch a statutory chat session to begin.'}
              </p>
              <Link
                href="/chat"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-green-deep text-paper text-xs font-semibold hover:bg-green-mid"
              >
                <span>{lang === 'bn' ? 'চ্যাটে যান' : 'Open Statutory Chat'}</span>
                <span>→</span>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {chats.map((chat) => (
                <Link
                  key={chat.id}
                  href={`/chat?id=${chat.id}`}
                  className="p-5 rounded-xl bg-paper-light border border-border hover:border-brass/70 transition-all hover:shadow-md space-y-2 block"
                >
                  <div className="flex items-center justify-between text-xs font-mono text-ink-muted">
                    <span>Session</span>
                    <span>{new Date(chat.updatedAt).toLocaleDateString()}</span>
                  </div>
                  <h3 className="font-heading text-base font-bold text-green-deep line-clamp-1">
                    {chat.title || 'Untitled Examination'}
                  </h3>
                  <div className="text-xs font-sans text-brass flex items-center gap-1 pt-1">
                    <span>Resume inspection</span>
                    <span>→</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
