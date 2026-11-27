'use client';

import { useState, useEffect, useSyncExternalStore, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useLang } from '@/lib/lang';
import {
  serverApi,
  ServerUsageLimits,
  ServerAdminUser,
  ServerAuditLog,
} from '@/lib/api';
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

  // Live Backend Health States
  const [healthStatus, setHealthStatus] = useState<{ status: string; version?: string; service?: string } | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthTimestamp, setHealthTimestamp] = useState<string>('');
  const [healthLatency, setHealthLatency] = useState<number | null>(null);

  // User Directory States
  const [users, setUsers] = useState<ServerAdminUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState<'all' | ServerAdminUser['status']>('all');

  // User Lifecycle Action Modals
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'suspend' | 'ban' | 'reactivate' | 'delete';
    targetUser: ServerAdminUser | null;
  }>({
    isOpen: false,
    type: 'suspend',
    targetUser: null,
  });
  const [actionLoading, setActionLoading] = useState(false);

  // Audit Logs States
  const [auditLogs, setAuditLogs] = useState<ServerAuditLog[]>([]);
  const [auditLogsLoading, setAuditLogsLoading] = useState(true);

  // Usage Limits States
  const [limits, setLimits] = useState<ServerUsageLimits>({
    questionsPerMinute: 5,
    questionsPerDay: 10,
    maxOutputTokens: 500,
    dailyTokenBudget: 50000,
  });
  const [initialLimits, setInitialLimits] = useState<ServerUsageLimits>({
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

  // Load live health, usage limits, user directory, and audit logs on mount
  useEffect(() => {
    if (!mounted || !user || user.role !== 'admin') return;

    let isCancelled = false;

    async function loadData() {
      // 1. Check live health & latency
      setHealthLoading(true);
      const startPing = Date.now();
      try {
        const res = await serverApi.health();
        if (!isCancelled) {
          setHealthStatus(res as { status: string; version?: string; service?: string });
          setHealthLatency(Date.now() - startPing);
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
          setInitialLimits(currentLimits);
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

      // 3. Fetch user directory
      setUsersLoading(true);
      try {
        const userList = await serverApi.admin.getUsers();
        if (!isCancelled) {
          setUsers(userList);
          setUsersLoading(false);
        }
      } catch (err: unknown) {
        if (!isCancelled) {
          console.warn('Could not load user directory:', err);
          setUsersLoading(false);
        }
      }

      // 4. Fetch audit logs
      setAuditLogsLoading(true);
      try {
        const logs = await serverApi.admin.getAuditLogs();
        if (!isCancelled) {
          setAuditLogs(logs);
          setAuditLogsLoading(false);
        }
      } catch (err: unknown) {
        if (!isCancelled) {
          console.warn('Could not load audit logs:', err);
          setAuditLogsLoading(false);
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
    const startPing = Date.now();
    try {
      const res = await serverApi.health();
      setHealthStatus(res as { status: string; version?: string; service?: string });
      setHealthLatency(Date.now() - startPing);
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
      setInitialLimits(updated);

      // Refresh audit logs
      serverApi.admin.getAuditLogs().then(setAuditLogs).catch(() => {});

      setStatusMessage({
        type: 'success',
        text: lang === 'bn' ? 'ব্যবহারের কোটা ও সীমাবদ্ধতা সফলভাবে আপডেট করা হয়েছে।' : 'Usage limits updated successfully and active across all vetting sessions.',
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

  const executeUserLifecycleAction = async () => {
    if (!confirmModal.targetUser) return;
    const target = confirmModal.targetUser;
    setActionLoading(true);
    try {
      if (confirmModal.type === 'suspend' || confirmModal.type === 'ban') {
        const status = confirmModal.type === 'ban' ? 'banned' : 'suspended';
        const updated = await serverApi.admin.updateUserStatus(target.id, status);
        setUsers((prev) => prev.map((u) => (u.id === target.id ? { ...u, status: updated.status } : u)));
        setStatusMessage({
          type: 'success',
          text: `Account ${target.username} has been ${status}. All active sessions have been revoked.`,
        });
      } else if (confirmModal.type === 'reactivate') {
        const updated = await serverApi.admin.updateUserStatus(target.id, 'active');
        setUsers((prev) => prev.map((u) => (u.id === target.id ? { ...u, status: updated.status } : u)));
        setStatusMessage({
          type: 'success',
          text: `Account ${target.username} has been reactivated.`,
        });
      } else if (confirmModal.type === 'delete') {
        await serverApi.admin.deleteUser(target.id);
        setUsers((prev) => prev.filter((u) => u.id !== target.id));
        setStatusMessage({
          type: 'success',
          text: `Account ${target.username} and its private examination records have been permanently deleted.`,
        });
      }

      // Refresh audit logs
      const updatedLogs = await serverApi.admin.getAuditLogs();
      setAuditLogs(updatedLogs);

      setConfirmModal({ isOpen: false, type: 'suspend', targetUser: null });
    } catch (err: unknown) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to execute user action.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const isLimitsDirty =
    limits.questionsPerMinute !== initialLimits.questionsPerMinute ||
    limits.questionsPerDay !== initialLimits.questionsPerDay ||
    limits.maxOutputTokens !== initialLimits.maxOutputTokens ||
    limits.dailyTokenBudget !== initialLimits.dailyTokenBudget;

  // Filtered Users
  const filteredUsers = users.filter((u) => {
    const matchesQuery =
      u.username.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      (u.name && u.name.toLowerCase().includes(userSearchQuery.toLowerCase())) ||
      u.role.toLowerCase().includes(userSearchQuery.toLowerCase());

    const matchesStatus =
      userStatusFilter === 'all' || userStatusFilter === u.status;

    return matchesQuery && matchesStatus;
  });

  // Route Guard Rendering
  if (mounted && (!user || user.role !== 'admin')) {
    return (
      <div suppressHydrationWarning className="min-h-screen bg-paper flex items-center justify-center p-6 text-center select-none">
        <div className="max-w-md w-full p-8 rounded-2xl bg-paper-light border border-vermillion/50 shadow-2xl space-y-5 animate-in fade-in duration-200">
          <div className="w-14 h-14 rounded-full bg-vermillion/15 text-vermillion mx-auto flex items-center justify-center shadow-xs">
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
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 sm:p-8 rounded-2xl bg-paper-light border-2 border-brass/50 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-700 text-paper flex items-center justify-center font-heading text-2xl font-bold shrink-0 shadow-md border-2 border-amber-500/50">
              A
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-heading text-2xl sm:text-3xl font-bold text-green-deep tracking-tight">
                  {lang === 'bn' ? 'নথি এআই অ্যাডমিন কন্ট্রোল রুম' : 'Nothi AI Administration Center'}
                </h1>
                <span className="text-[11px] font-mono font-bold uppercase px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
                  ADMINISTRATOR
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-paper border border-border text-ink-muted">
                  v1.2
                </span>
              </div>
              <p className="text-xs sm:text-sm text-ink-muted font-sans mt-1">
                {user?.email} • {lang === 'bn' ? 'সার্ভার কনফিগারেশন, ইউজার ডিরেক্টরি ও কোটা ব্যবস্থাপনা' : 'System Directory, Security Telemetry & Policy Controls'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
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

        {/* Global Notifications / Status Messages */}
        {statusMessage && (
          <div
            className={`p-4 rounded-xl text-xs sm:text-sm font-sans flex items-center justify-between animate-in fade-in duration-150 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border border-emerald-300'
                : 'bg-rose-50 text-rose-900 border border-rose-300'
            }`}
          >
            <span className="flex items-center gap-2">
              <span>{statusMessage.type === 'success' ? '✔' : '⚠'}</span>
              <span>{statusMessage.text}</span>
            </span>
            <button
              type="button"
              onClick={() => setStatusMessage(null)}
              className="text-xs font-mono font-bold hover:underline"
            >
              ✕
            </button>
          </div>
        )}

        {/* ── SYSTEM HEALTH & SECURITY KPI STRIP ────────────────────── */}
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
              Status: {healthStatus?.status ?? 'loading...'} • Latency: {healthLatency !== null ? `${healthLatency}ms` : '<10ms'} {healthTimestamp && `(${healthTimestamp})`}
            </div>
          </div>

          {/* Corpus Status Card */}
          <div className="p-6 rounded-2xl bg-paper-light border border-border shadow-xs space-y-3">
            <span className="text-xs font-mono uppercase tracking-wider text-ink-muted">Statutory Legal Corpus</span>
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
            <span className="text-xs font-mono uppercase tracking-wider text-ink-muted">Security Architecture</span>
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-emerald-600" />
              <span className="font-heading text-xl font-bold text-green-deep">
                RBAC & Isolation Active
              </span>
            </div>
            <div className="text-xs text-ink-muted font-sans">
              httpOnly Cookies • Scrypt Salts • Per-User Chat Partitioning
            </div>
          </div>
        </div>

        {/* ── USER DIRECTORY & LIFECYCLE MANAGEMENT TABLE ──────────── */}
        <div className="p-6 sm:p-8 rounded-2xl bg-paper-light border border-border shadow-sm space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/80 pb-4">
            <div>
              <h2 className="font-heading text-2xl font-bold text-green-deep">
                {lang === 'bn' ? 'ব্যবহারকারী ডিরেক্টরি ও লাইফসাইকেল নিয়ন্ত্রণ' : 'User Directory & Lifecycle Controls'}
              </h2>
              <p className="text-xs sm:text-sm text-ink-muted font-sans mt-0.5">
                {lang === 'bn'
                  ? 'নিবন্ধিত একাউন্টসমূহ, সক্রিয় স্ট্যাটাস, সেশন সংখ্যা ও অ্যাকাউন্ট স্থগিত/বাতিল ব্যবস্থা।'
                  : 'Manage advocate accounts, toggle suspension status with instant revocation, and view aggregate activity.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <input
                type="text"
                placeholder={lang === 'bn' ? 'ব্যবহারকারী খুঁজুন...' : 'Search accounts...'}
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                className="px-3 py-1.5 rounded-full border border-border bg-paper text-ink text-xs font-sans focus:outline-hidden focus:border-brass w-44 sm:w-52"
              />

              <select
                value={userStatusFilter}
                onChange={(e) => setUserStatusFilter(e.target.value as 'all' | ServerAdminUser['status'])}
                className="px-3 py-1.5 rounded-full border border-border bg-paper text-ink text-xs font-sans focus:outline-hidden focus:border-brass"
              >
                <option value="all">{lang === 'bn' ? 'সকল স্ট্যাটাস' : 'All Statuses'}</option>
                <option value="active">{lang === 'bn' ? 'সক্রিয় (Active)' : 'Active Only'}</option>
                <option value="suspended">{lang === 'bn' ? 'স্থগিত (Suspended)' : 'Suspended Only'}</option>
                <option value="banned">{lang === 'bn' ? 'নিষিদ্ধ (Banned)' : 'Banned Only'}</option>
              </select>
            </div>
          </div>

          {usersLoading ? (
            <div className="p-8 text-center text-sm font-mono text-ink-muted">
              Loading user directory...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-8 text-center text-sm text-ink-muted font-sans">
              No registered user accounts match the current filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-sans">
                <thead>
                  <tr className="border-b border-border/80 text-[11px] font-mono uppercase text-ink-muted">
                    <th className="py-3 px-4">Account Identifier</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Private Chats</th>
                    <th className="py-3 px-4">Recorded Tokens Today / Total</th>
                    <th className="py-3 px-4">Created Date</th>
                    <th className="py-3 px-4 text-right">Lifecycle Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredUsers.map((u) => {
                    const isCurrentAdmin = u.id === user?.id;

                    return (
                      <tr key={u.id} className="hover:bg-paper/60 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <span
                              className={`w-7 h-7 rounded-full flex items-center justify-center font-heading font-bold text-xs shrink-0 ${
                                u.role === 'admin'
                                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                  : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                              }`}
                            >
                              {(u.name || u.username)[0].toUpperCase()}
                            </span>
                            <div>
                              <div className="font-mono font-medium text-ink flex items-center gap-1.5">
                                <span>{u.username}</span>
                                {isCurrentAdmin && (
                                  <span className="text-[9px] font-mono font-bold bg-green-deep text-paper px-1 rounded">
                                    YOU
                                  </span>
                                )}
                                {u.isEnvAccount && (
                                  <span className="text-[9px] font-mono bg-paper-dark border border-border/70 text-ink-muted px-1 rounded">
                                    .ENV
                                  </span>
                                )}
                              </div>
                              {u.name && <div className="text-[11px] text-ink-muted font-sans">{u.name}</div>}
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full border ${
                              u.role === 'admin'
                                ? 'bg-amber-100 text-amber-900 border-amber-300'
                                : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full border ${
                              u.status !== 'active'
                                ? 'bg-rose-100 text-rose-900 border-rose-300'
                                : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                u.status !== 'active' ? 'bg-vermillion' : 'bg-emerald-600'
                              }`}
                            />
                            {u.status || 'active'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 font-mono">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-paper border border-border">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                            {u.chatCount} {u.chatCount === 1 ? 'chat' : 'chats'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 font-mono">
                          {u.recordedTokensToday.toLocaleString()} / {u.recordedTokensTotal.toLocaleString()}
                        </td>

                        <td className="py-3.5 px-4 font-mono text-ink-muted">
                          {u.createdAt ? new Date(u.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          {u.role === 'admin' ? (
                            <span className="text-[11px] font-mono text-ink-muted italic">
                              Protected Admin
                            </span>
                          ) : (
                            <div className="flex items-center justify-end gap-2">
                              {u.status !== 'active' ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setConfirmModal({
                                      isOpen: true,
                                      type: 'reactivate',
                                      targetUser: u,
                                    })
                                  }
                                  className="px-2.5 py-1 rounded-full border border-emerald-300 bg-emerald-50 text-emerald-900 text-[11px] font-semibold hover:bg-emerald-100 transition-colors cursor-pointer"
                                >
                                  Reactivate
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setConfirmModal({
                                      isOpen: true,
                                      type: 'suspend',
                                      targetUser: u,
                                    })
                                  }
                                  className="px-2.5 py-1 rounded-full border border-amber-300 bg-amber-50 text-amber-900 text-[11px] font-semibold hover:bg-amber-100 transition-colors cursor-pointer"
                                >
                                  Suspend
                                </button>
                              )}

                              {u.status !== 'banned' && (
                                <button
                                  type="button"
                                  onClick={() => setConfirmModal({ isOpen: true, type: 'ban', targetUser: u })}
                                  className="px-2.5 py-1 rounded-full border border-rose-300 bg-rose-50 text-rose-900 text-[11px] font-semibold hover:bg-rose-100 transition-colors cursor-pointer"
                                >
                                  Ban
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => setConfirmModal({ isOpen: true, type: 'delete', targetUser: u })}
                                className="px-2.5 py-1 rounded-full border border-rose-300 bg-rose-50 text-rose-900 text-[11px] font-semibold hover:bg-rose-100 transition-colors cursor-pointer"
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── SYSTEM QUOTAS & POLICY CONTROLS FORM ─────────────────── */}
        <div className="p-6 sm:p-8 rounded-2xl bg-paper-light border border-border shadow-md space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/80 pb-4">
            <div>
              <h2 className="font-heading text-2xl font-bold text-green-deep">
                {lang === 'bn' ? 'সিস্টেম ব্যবহার কোটা ও সীমাবদ্ধতা' : 'System Quotas & Policy Controls'}
              </h2>
              <p className="text-xs sm:text-sm text-ink-muted font-sans mt-0.5">
                {lang === 'bn'
                  ? 'এই মান পরিবর্তন করলে তা তাৎক্ষণিকভাবে সকল ব্যবহারকারীর জন্য কার্যকর হবে।'
                  : 'Modifying these settings immediately reconfigures rate limits across all active advocate sessions.'}
              </p>
            </div>
            <span className="text-xs font-mono text-ink-muted">
              Source: backend/usage-limit-settings.js
            </span>
          </div>

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
                  disabled={!isLimitsDirty}
                  onClick={() => {
                    setLimits(initialLimits);
                    setStatusMessage({ type: 'success', text: 'Discarded unsaved form changes.' });
                  }}
                  className="px-5 py-2.5 rounded-full border border-border text-ink hover:bg-paper-dark font-sans text-xs font-semibold transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Discard Changes
                </button>

                <button
                  type="submit"
                  disabled={savingLimits || !isLimitsDirty}
                  className="px-6 py-2.5 rounded-full bg-green-deep hover:bg-green-mid disabled:opacity-40 text-paper font-sans text-xs sm:text-sm font-semibold transition-all shadow-md active:scale-95 cursor-pointer disabled:cursor-not-allowed"
                >
                  {savingLimits ? 'Saving to Backend...' : 'Save Usage Limits'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* ── RECENT ADMINISTRATIVE ACTIVITY AUDIT TRAIL ──────────── */}
        <div className="p-6 sm:p-8 rounded-2xl bg-paper-light border border-border shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-border/80 pb-3">
            <div>
              <h2 className="font-heading text-xl font-bold text-green-deep">
                {lang === 'bn' ? 'সাম্প্রতিক প্রশাসনিক অডিট ট্রেইল' : 'Recent Administrative Audit Trail'}
              </h2>
              <p className="text-xs text-ink-muted font-sans">
                Immutable system event log of user lifecycle modifications and policy updates.
              </p>
            </div>
            <span className="text-xs font-mono text-ink-muted">
              GET /api/admin/audit-logs
            </span>
          </div>

          {auditLogsLoading ? (
            <div className="p-6 text-center text-xs font-mono text-ink-muted">
              Loading recent audit logs...
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="p-6 text-center text-xs text-ink-muted font-sans">
              No recorded administrative events yet. Actions such as quota updates and user status changes will appear here.
            </div>
          ) : (
            <div className="space-y-2.5">
              {auditLogs.slice(0, 10).map((log) => {
                const badgeColor =
                  log.action === 'USER_SUSPENDED'
                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                    : log.action === 'USER_DELETED'
                    ? 'bg-rose-100 text-rose-900 border-rose-300'
                    : log.action === 'USER_REACTIVATED'
                    ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                    : 'bg-blue-100 text-blue-900 border-blue-300';

                return (
                  <div
                    key={log.id}
                    className="p-3 rounded-xl bg-paper border border-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-sans"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full border ${badgeColor}`}>
                        {log.action}
                      </span>
                      <span className="font-medium text-ink">{log.details}</span>
                    </div>
                    <span className="font-mono text-[11px] text-ink-muted shrink-0">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* ── ACTION CONFIRMATION MODAL ─────────────────────────────── */}
      {confirmModal.isOpen && confirmModal.targetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-150">
          <div className="max-w-md w-full bg-paper p-6 sm:p-8 rounded-2xl border border-brass shadow-2xl space-y-5">
            <h3 className="font-heading text-lg font-bold text-green-deep">
              {confirmModal.type === 'suspend' && 'Confirm Account Suspension'}
              {confirmModal.type === 'ban' && 'Confirm Account Ban'}
              {confirmModal.type === 'reactivate' && 'Confirm Account Reactivation'}
              {confirmModal.type === 'delete' && 'Confirm Account Permanent Deletion'}
            </h3>

            <p className="text-xs sm:text-sm text-ink-muted font-sans leading-relaxed">
              {confirmModal.type === 'suspend' && (
                <>
                  Are you sure you want to suspend{' '}
                  <strong className="text-ink">{confirmModal.targetUser.username}</strong>? This user will be immediately logged out, active session tokens will be revoked, and further access to the examination suite will be blocked.
                </>
              )}
              {confirmModal.type === 'ban' && (
                <>
                  Ban <strong className="text-ink">{confirmModal.targetUser.username}</strong>?
                  All active sessions will be revoked and sign-in will be blocked until reactivation.
                </>
              )}
              {confirmModal.type === 'reactivate' && (
                <>
                  Are you sure you want to reactivate{' '}
                  <strong className="text-ink">{confirmModal.targetUser.username}</strong>? The user will be permitted to sign in and resume statutory inquiries.
                </>
              )}
              {confirmModal.type === 'delete' && (
                <>
                  Are you sure you want to permanently delete{' '}
                  <strong className="text-ink">{confirmModal.targetUser.username}</strong>? This will permanently remove the account credentials, revoke all active sessions, and purge all attached examination data. <span className="text-vermillion font-bold">This action cannot be undone.</span>
                </>
              )}
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setConfirmModal({ isOpen: false, type: 'suspend', targetUser: null })}
                className="px-4 py-2 rounded-full border border-border text-ink hover:bg-paper-dark font-sans text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={executeUserLifecycleAction}
                disabled={actionLoading}
                className={`px-5 py-2 rounded-full text-paper font-sans text-xs font-semibold shadow-sm transition-all cursor-pointer ${
                  (confirmModal.type === 'delete' || confirmModal.type === 'ban')
                    ? 'bg-vermillion hover:bg-rose-700'
                    : confirmModal.type === 'suspend'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-green-deep hover:bg-green-mid'
                }`}
              >
                {actionLoading ? 'Executing...' : 'Confirm Action'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
