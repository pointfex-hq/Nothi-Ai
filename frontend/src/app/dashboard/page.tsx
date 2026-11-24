'use client';

import { useState, useEffect, useSyncExternalStore, FormEvent } from 'react';
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
  const { user, signOut, updateProfile } = useAuth();
  const [signInModalOpen, setSignInModalOpen] = useState(false);
  const mounted = useSyncExternalStore(emptySubscribe, getClientSnapshot, getServerSnapshot);

  // Live Backend Data States
  const [quota, setQuota] = useState<UserQuotaData | null>(null);
  const [chats, setChats] = useState<ServerChatSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingChatId, setDeletingChatId] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [chatSearchQuery, setChatSearchQuery] = useState('');

  // Profile Update Form States
  const [customDisplayName, setCustomDisplayName] = useState<string | null>(null);
  const displayName = customDisplayName !== null ? customDisplayName : (user?.name || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [profileNotice, setProfileNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Load private user data on mount & whenever user ID changes
  useEffect(() => {
    if (!mounted || !user) return;

    let isCancelled = false;
    async function loadDashboardData() {
      setLoading(true);
      setError(null);
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
          setError(err instanceof Error ? err.message : 'Could not load private dashboard data.');
          setLoading(false);
        }
      }
    }

    loadDashboardData();
    return () => {
      isCancelled = true;
    };
  }, [mounted, user]);

  const handleDeleteChat = async (id: string) => {
    try {
      await serverApi.chats.delete(id);
      setChats((prev) => prev.filter((c) => c.id !== id));
      setDeletingChatId(null);
      setActionNotice(lang === 'bn' ? 'সেশনটি সফলভাবে মুছে ফেলা হয়েছে।' : 'Session deleted successfully.');
      setTimeout(() => setActionNotice(null), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete chat session.');
      setDeletingChatId(null);
    }
  };

  const handleUpdateProfile = async (e: FormEvent) => {
    e.preventDefault();
    setProfileNotice(null);

    if (newPassword && newPassword !== confirmPassword) {
      setProfileNotice({
        type: 'error',
        message: lang === 'bn' ? 'নতুন পাসওয়ার্ড দুটি মিলছে না।' : 'New passwords do not match.',
      });
      return;
    }

    setUpdatingProfile(true);
    try {
      await updateProfile({
        name: displayName.trim() || undefined,
        currentPassword: currentPassword || undefined,
        newPassword: newPassword || undefined,
      });

      setProfileNotice({
        type: 'success',
        message: lang === 'bn' ? 'প্রোফাইল তথ্য সফলভাবে সংরক্ষিত হয়েছে।' : 'Profile details updated successfully.',
      });
      setCustomDisplayName(null);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setProfileNotice(null), 4000);
    } catch (err: unknown) {
      setProfileNotice({
        type: 'error',
        message: err instanceof Error ? err.message : 'Could not update profile.',
      });
    } finally {
      setUpdatingProfile(false);
    }
  };

  // Filtered Chats
  const filteredChats = chats.filter((c) =>
    (c.title || 'Untitled Property Inquiry').toLowerCase().includes(chatSearchQuery.toLowerCase())
  );

  // Authentication Route Guard
  if (mounted && !user) {
    return (
      <div suppressHydrationWarning className="min-h-screen bg-paper flex items-center justify-center p-6 text-center select-none">
        <div className="max-w-md w-full p-8 rounded-2xl bg-paper-light border border-brass/50 shadow-2xl space-y-5 animate-in fade-in duration-200">
          <div className="w-14 h-14 rounded-full bg-brass/15 text-green-deep mx-auto flex items-center justify-center shadow-xs">
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
                ? 'আইনি নথি অডিট, ব্যক্তিগত সেশন ও ব্যবহার কোটা ব্যবস্থাপনায় আপনার নিবন্ধিত একাউন্টে সাইন ইন করুন।'
                : 'Sign in to access your advocate workspace, usage quota, and private document examination records.'}
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

  const questionsPercent = quota
    ? Math.min(100, Math.round((quota.questionsUsed / Math.max(1, quota.questionsLimit)) * 100))
    : 0;

  const tokensPercent = quota
    ? Math.min(100, Math.round((quota.tokensUsed / Math.max(1, quota.tokensLimit)) * 100))
    : 0;

  return (
    <div suppressHydrationWarning className="min-h-screen bg-paper py-8 px-4 sm:px-6 lg:px-12 select-none text-ink">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* ── TOP WORKSPACE GREETING & HEADER STRIP ─────────────────────── */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 p-6 sm:p-8 rounded-2xl bg-paper-light border border-border shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-green-deep text-paper flex items-center justify-center font-heading text-2xl font-bold shrink-0 shadow-md border-2 border-brass/40">
              {user?.name ? user.name[0].toUpperCase() : 'U'}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-heading text-2xl sm:text-3xl font-bold text-green-deep tracking-tight">
                  {user?.name || 'Advocate Workspace'}
                </h1>
                <span className={`text-[11px] font-mono font-bold uppercase px-2.5 py-0.5 rounded-full border shadow-2xs ${
                  user?.role === 'admin'
                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                    : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                }`}>
                  {user?.role === 'admin' ? 'ADMINISTRATOR' : 'VERIFIED ADVOCATE'}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-paper border border-border text-ink-muted">
                  v1.2
                </span>
              </div>
              <p className="text-xs sm:text-sm text-ink-muted font-sans mt-1">
                {user?.email} • {user?.chamber || (lang === 'bn' ? 'চেম্বার কাউন্সিল' : 'Chamber Counsel')}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/chat"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-green-deep hover:bg-green-mid text-paper font-sans text-xs sm:text-sm font-semibold transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 5v14M5 12h14" />
              </svg>
              <span>{lang === 'bn' ? 'নতুন চ্যাট শুরু করুন' : 'New Statutory Chat'}</span>
            </Link>

            <Link
              href="/audit"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-border bg-paper hover:bg-paper-dark text-ink font-sans text-xs sm:text-sm font-semibold transition-all shadow-2xs hover:border-brass/70 cursor-pointer"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
              </svg>
              <span>{lang === 'bn' ? 'অডিট ওয়ার্কস্পেস' : 'Open Audit Workspace'}</span>
            </Link>

            {user?.role === 'admin' && (
              <Link
                href="/admin"
                className="px-4 py-2.5 rounded-full border border-amber-300 bg-amber-50 text-amber-900 font-sans text-xs sm:text-sm font-semibold hover:bg-amber-100 transition-colors shadow-2xs"
              >
                {lang === 'bn' ? 'অ্যাডমিন প্যানেল →' : 'Admin Panel →'}
              </Link>
            )}

            <button
              type="button"
              onClick={async () => {
                await signOut();
                router.push('/');
              }}
              className="px-4 py-2.5 rounded-full border border-vermillion/40 text-vermillion hover:bg-vermillion/10 font-sans text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
              title="Sign out of your account"
            >
              {lang === 'bn' ? 'সাইন আউট' : 'Sign Out'}
            </button>
          </div>
        </div>

        {/* Global Notifications / Error Banners */}
        {actionNotice && (
          <div className="p-4 rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-300 text-xs sm:text-sm font-sans flex items-center justify-between animate-in fade-in duration-150">
            <span className="flex items-center gap-2">
              <span>✔</span>
              <span>{actionNotice}</span>
            </span>
            <button type="button" onClick={() => setActionNotice(null)} className="text-xs font-mono font-bold hover:underline">
              ✕
            </button>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-rose-50 text-rose-900 border border-rose-300 text-xs sm:text-sm font-sans flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span>⚠</span>
              <span>{error}</span>
            </span>
            <button type="button" onClick={() => setError(null)} className="text-xs font-mono font-bold hover:underline">
              ✕
            </button>
          </div>
        )}

        {/* ── LIVE QUOTA & USAGE METRIC CARDS ──────────────────────────── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse" />
              <h2 className="font-heading text-xl font-bold text-green-deep">
                {lang === 'bn' ? 'দৈনিক ব্যবহার কোটা ও কার্যক্ষমতা' : 'Live Usage Quotas & Activity'}
              </h2>
            </div>
            <span className="text-xs font-mono text-ink-muted">
              {quota?.resetAt
                ? `${lang === 'bn' ? 'রিসেট হবে:' : 'Resets at:'} ${new Date(quota.resetAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} UTC`
                : 'Resets daily at 00:00 UTC'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Card 1: Daily Questions */}
            <div className="p-6 rounded-2xl bg-paper-light border border-border shadow-xs flex flex-col justify-between space-y-3">
              <div>
                <div className="text-xs font-mono text-ink-muted uppercase tracking-wider flex items-center justify-between">
                  <span>{lang === 'bn' ? 'দৈনিক প্রশ্ন কোটা' : 'Daily Questions'}</span>
                  <span className="font-mono text-[10px] text-ink-muted">{questionsPercent}% used</span>
                </div>
                <div className="font-heading text-2xl sm:text-3xl font-bold text-green-deep mt-1">
                  {loading ? (
                    <div className="h-8 w-24 bg-border/40 rounded animate-pulse" />
                  ) : quota ? (
                    `${quota.questionsUsed} / ${quota.questionsLimit}`
                  ) : (
                    '—'
                  )}
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="w-full bg-border/60 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      questionsPercent > 85 ? 'bg-vermillion' : 'bg-emerald-600'
                    }`}
                    style={{ width: `${questionsPercent}%` }}
                  />
                </div>
                <div className="text-[11px] text-ink-muted font-sans">
                  {lang === 'bn' ? 'প্রতি ক্যালেন্ডার দিনে অনুমোদিত আইনি অনুসন্ধান' : 'Statutory queries allowed per day'}
                </div>
              </div>
            </div>

            {/* Card 2: Daily Token Budget */}
            <div className="p-6 rounded-2xl bg-paper-light border border-border shadow-xs flex flex-col justify-between space-y-3">
              <div>
                <div className="text-xs font-mono text-ink-muted uppercase tracking-wider flex items-center justify-between">
                  <span>{lang === 'bn' ? 'দৈনিক টোকেন বাজেট' : 'Daily Token Budget'}</span>
                  <span className="font-mono text-[10px] text-ink-muted">{tokensPercent}% used</span>
                </div>
                <div className="font-heading text-2xl sm:text-3xl font-bold text-green-deep mt-1">
                  {loading ? (
                    <div className="h-8 w-32 bg-border/40 rounded animate-pulse" />
                  ) : quota ? (
                    `${quota.tokensUsed.toLocaleString()} / ${quota.tokensLimit.toLocaleString()}`
                  ) : (
                    '—'
                  )}
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="w-full bg-border/60 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      tokensPercent > 85 ? 'bg-vermillion' : 'bg-brass'
                    }`}
                    style={{ width: `${tokensPercent}%` }}
                  />
                </div>
                <div className="text-[11px] text-ink-muted font-sans">
                  {lang === 'bn' ? 'দলিল ও প্রম্পট বিশ্লেষণ বরাদ্দ' : 'Input extraction and statutory reasoning tokens'}
                </div>
              </div>
            </div>

            {/* Card 3: Rolling Rate Limit */}
            <div className="p-6 rounded-2xl bg-paper-light border border-border shadow-xs flex flex-col justify-between space-y-3">
              <div>
                <div className="text-xs font-mono text-ink-muted uppercase tracking-wider">
                  {lang === 'bn' ? 'রোলিং রেট লিমিট' : 'Rolling Rate Limit'}
                </div>
                <div className="font-heading text-2xl sm:text-3xl font-bold text-green-deep mt-1">
                  {loading ? (
                    <div className="h-8 w-20 bg-border/40 rounded animate-pulse" />
                  ) : quota ? (
                    `${quota.questionsPerMinute} req/min`
                  ) : (
                    '5 req/min'
                  )}
                </div>
              </div>
              <div className="text-[11px] text-ink-muted font-sans pt-3 border-t border-border/60">
                {lang === 'bn'
                  ? 'প্রতি মিনিটে স্প্যাম ও স্ক্র্যাপিং প্রতিরোধক সীমা'
                  : 'Automated burst protection per 60-second window'}
              </div>
            </div>

            {/* Card 4: Plan Tier & Security */}
            <div className="p-6 rounded-2xl bg-paper-light border border-border shadow-xs flex flex-col justify-between space-y-3">
              <div>
                <div className="text-xs font-mono text-ink-muted uppercase tracking-wider">
                  {lang === 'bn' ? 'প্ল্যান স্ট্যাটাস' : 'Account Tier'}
                </div>
                <div className="font-heading text-2xl sm:text-3xl font-bold text-green-deep mt-1">
                  {user?.role === 'admin' ? 'ADMIN PRO' : 'CHAMBER BASIC'}
                </div>
              </div>
              <div className="text-[11px] text-ink-muted font-sans pt-3 border-t border-border/60">
                {user?.role === 'admin'
                  ? (lang === 'bn' ? 'সম্পূর্ণ প্রশাসনিক ক্ষমতা ও কোটা পরিবর্তন' : 'Uncapped administrative & policy authority')
                  : (lang === 'bn' ? 'দলিল যাচাই ও সংবিধিবদ্ধ চ্যাট অন্তর্ভুক্ত' : 'Standard institutional title vetting license')}
              </div>
            </div>

          </div>
        </div>

        {/* ── SAVED PRIVATE CHAT SESSIONS MANAGER ───────────────────────── */}
        <div className="p-6 sm:p-8 rounded-2xl bg-paper-light border border-border shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-4">
            <div>
              <h2 className="font-heading text-xl font-bold text-green-deep">
                {lang === 'bn' ? 'আপনার ব্যক্তিগত আইনি পরীক্ষা সেশনসমূহ' : 'Your Private Examination Sessions'}
              </h2>
              <p className="text-xs text-ink-muted font-sans mt-0.5">
                {lang === 'bn'
                  ? 'এই সেশনগুলো শুধুমাত্র আপনার একাউন্টে সংরক্ষিত এবং অন্য কোনো ব্যবহারকারী বা অ্যাডমিন তা দেখতে পারে না।'
                  : 'These sessions are strictly isolated to your authenticated account with zero external or admin visibility.'}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <input
                  type="text"
                  placeholder={lang === 'bn' ? 'সেশন খুঁজুন...' : 'Search sessions...'}
                  value={chatSearchQuery}
                  onChange={(e) => setChatSearchQuery(e.target.value)}
                  className="px-3 py-1.5 pl-8 rounded-full border border-border bg-paper text-ink text-xs font-sans focus:outline-hidden focus:border-brass w-48 sm:w-60"
                />
                <svg
                  className="absolute left-2.5 top-2 text-ink-muted"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </div>

              <Link
                href="/chat"
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-green-deep hover:bg-green-mid text-paper text-xs font-semibold shadow-xs"
              >
                <span>{lang === 'bn' ? '+ নতুন সেশন' : '+ New Session'}</span>
              </Link>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-6 rounded-2xl bg-paper border border-border space-y-3 animate-pulse">
                  <div className="h-4 w-28 bg-border/50 rounded" />
                  <div className="h-6 w-3/4 bg-border/40 rounded" />
                  <div className="h-4 w-20 bg-border/30 rounded" />
                </div>
              ))}
            </div>
          ) : filteredChats.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-paper border border-dashed border-border space-y-4">
              <div className="w-12 h-12 rounded-full bg-paper-light border border-border mx-auto flex items-center justify-center text-ink-muted">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <div className="space-y-1">
                <h3 className="font-heading text-base font-bold text-green-deep">
                  {chatSearchQuery
                    ? (lang === 'bn' ? 'কোনো ফলাফল পাওয়া যায়নি' : 'No matching sessions found')
                    : (lang === 'bn' ? 'কোনো সেভ করা সেশন নেই' : 'No Saved Examination Sessions')}
                </h3>
                <p className="text-xs text-ink-muted font-sans max-w-md mx-auto">
                  {lang === 'bn'
                    ? 'আপনার সাফ কবলা দলিল, আরএস/বিএস খতিয়ান বা এনআইডি সংক্রান্ত আইনি পরীক্ষা শুরু করতে চ্যাট চালু করুন।'
                    : 'Start a new inquiry to verify deed presentation windows, schedule plot continuity, or statutory conformity.'}
                </p>
              </div>
              <Link
                href="/chat"
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-green-deep hover:bg-green-mid text-paper text-xs font-semibold shadow-xs"
              >
                <span>{lang === 'bn' ? 'চ্যাটে পরীক্ষা শুরু করুন' : 'Launch Examination Chat'}</span>
                <span>→</span>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredChats.map((chat) => (
                <div
                  key={chat.id}
                  className="p-5 rounded-2xl bg-paper border border-border hover:border-brass/70 transition-all hover:shadow-md flex flex-col justify-between space-y-4 group"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono text-ink-muted">
                      <span className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wider text-green-deep font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                        Private Session
                      </span>
                      <span>{new Date(chat.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>

                    <h3 className="font-heading text-base font-bold text-green-deep line-clamp-2 group-hover:text-brass transition-colors">
                      {chat.title || 'Untitled Property Inquiry'}
                    </h3>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-border/60">
                    <Link
                      href={`/chat?id=${chat.id}`}
                      className="inline-flex items-center gap-1 text-xs font-sans font-semibold text-green-deep hover:underline"
                    >
                      <span>{lang === 'bn' ? 'সেশন পুনরায় খুলুন' : 'Resume Session'}</span>
                      <span className="text-brass">→</span>
                    </Link>

                    {deletingChatId === chat.id ? (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleDeleteChat(chat.id)}
                          className="text-[11px] font-sans font-bold text-vermillion hover:underline cursor-pointer"
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingChatId(null)}
                          className="text-[11px] font-sans text-ink-muted hover:underline cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setDeletingChatId(chat.id)}
                        className="text-ink-muted hover:text-vermillion p-1 transition-colors cursor-pointer"
                        title="Delete this examination session"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── ADVOCATE PROFILE & SECURITY SETTINGS FORM ────────────────── */}
        <div className="p-6 sm:p-8 rounded-2xl bg-paper-light border border-border shadow-sm space-y-6">
          <div className="border-b border-border/80 pb-4">
            <h2 className="font-heading text-xl font-bold text-green-deep">
              {lang === 'bn' ? 'প্রোফাইল ও নিরাপত্তা সেটিংস' : 'Advocate Profile & Security Settings'}
            </h2>
            <p className="text-xs text-ink-muted font-sans mt-0.5">
              {lang === 'bn'
                ? 'আপনার প্রদর্শনীর নাম ও একাউন্ট পাসওয়ার্ড হালনাগাদ করুন।'
                : 'Update your display name and change your password with current password verification.'}
            </p>
          </div>

          {profileNotice && (
            <div
              className={`p-4 rounded-xl text-xs sm:text-sm font-sans flex items-center justify-between ${
                profileNotice.type === 'success'
                  ? 'bg-emerald-50 text-emerald-900 border border-emerald-300'
                  : 'bg-rose-50 text-rose-900 border border-rose-300'
              }`}
            >
              <span className="flex items-center gap-2">
                <span>{profileNotice.type === 'success' ? '✔' : '⚠'}</span>
                <span>{profileNotice.message}</span>
              </span>
              <button
                type="button"
                onClick={() => setProfileNotice(null)}
                className="text-xs font-mono font-bold hover:underline"
              >
                ✕
              </button>
            </div>
          )}

          <form onSubmit={handleUpdateProfile} className="space-y-6 max-w-2xl">
            <div className="space-y-2">
              <label htmlFor="displayName" className="block text-xs font-mono font-bold uppercase text-ink">
                {lang === 'bn' ? 'প্রদর্শনী নাম' : 'Display Name'}
              </label>
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setCustomDisplayName(e.target.value)}
                placeholder="Advocate Name"
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-paper text-ink font-sans text-sm focus:outline-hidden focus:border-brass focus:ring-2 focus:ring-brass/30"
              />
            </div>

            <div className="pt-2 border-t border-border/60 space-y-4">
              <h3 className="font-heading text-sm font-bold text-green-deep">
                {lang === 'bn' ? 'পাসওয়ার্ড পরিবর্তন (ঐচ্ছিক)' : 'Change Password (Optional)'}
              </h3>

              <div className="space-y-2">
                <label htmlFor="currentPassword" className="block text-xs font-mono text-ink-muted">
                  {lang === 'bn' ? 'বর্তমান পাসওয়ার্ড' : 'Current Password'}
                </label>
                <input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-paper text-ink font-mono text-sm focus:outline-hidden focus:border-brass focus:ring-2 focus:ring-brass/30"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="newPassword" className="block text-xs font-mono text-ink-muted">
                    {lang === 'bn' ? 'নতুন পাসওয়ার্ড' : 'New Password'}
                  </label>
                  <input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-paper text-ink font-mono text-sm focus:outline-hidden focus:border-brass focus:ring-2 focus:ring-brass/30"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="confirmPassword" className="block text-xs font-mono text-ink-muted">
                    {lang === 'bn' ? 'নতুন পাসওয়ার্ড নিশ্চিত করুন' : 'Confirm New Password'}
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-paper text-ink font-mono text-sm focus:outline-hidden focus:border-brass focus:ring-2 focus:ring-brass/30"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end">
              <button
                type="submit"
                disabled={updatingProfile}
                className="px-6 py-2.5 rounded-full bg-green-deep hover:bg-green-mid disabled:opacity-50 text-paper font-sans text-xs sm:text-sm font-semibold transition-all shadow-md active:scale-95 cursor-pointer"
              >
                {updatingProfile
                  ? (lang === 'bn' ? 'সংরক্ষণ হচ্ছে...' : 'Saving Changes...')
                  : (lang === 'bn' ? 'পরিবর্তন সংরক্ষণ করুন' : 'Save Profile Changes')}
              </button>
            </div>
          </form>
        </div>

        {/* ── ACCOUNT SUMMARY & SECURITY CARD ──────────────────────────── */}
        <div className="p-6 sm:p-8 rounded-2xl bg-paper-light border border-border shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h3 className="font-heading text-lg font-bold text-green-deep">
              {lang === 'bn' ? 'একাউন্ট নিরাপত্তা ও সেশন নিয়ন্ত্রণ' : 'Account Security & Isolation'}
            </h3>
            <p className="text-xs text-ink-muted font-sans leading-relaxed max-w-2xl">
              {lang === 'bn'
                ? 'আপনার সেশন ক্রিপ্টোগ্রাফিক সল্ট ও httpOnly কুকি দ্বারা সুরক্ষিত। সাইন আউট করলে সকল সেশন ও ব্রাউজার ক্যাশ অবিলম্বে মুছে যাবে।'
                : 'Your session is authenticated via secure scrypt hashing and httpOnly cookies. Signing out immediately flushes all local session keys and in-memory caches.'}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={async () => {
                await signOut();
                router.push('/');
              }}
              className="px-5 py-2.5 rounded-full bg-vermillion/10 hover:bg-vermillion/20 text-vermillion font-sans text-xs font-semibold transition-colors cursor-pointer border border-vermillion/30"
            >
              {lang === 'bn' ? 'এখনই সাইন আউট করুন' : 'Sign Out of Account'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
