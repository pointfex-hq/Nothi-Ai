'use client';

import { useState, useEffect, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useLang } from '@/lib/lang';
import {
  serverApi,
  ServerAdminUser,
  ServerAccessEvent,
  ServerAuditLog,
  ServerLegalCollectionStatus,
} from '@/lib/api';
import { SignInModal } from '@/components/auth/SignInModal';

const emptySubscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;
const entryPageSize = 50;

export default function AdminPanelPage() {
  const router = useRouter();
  const { lang } = useLang();
  const { user } = useAuth();
  const [signInModalOpen, setSignInModalOpen] = useState(false);
  const mounted = useSyncExternalStore(emptySubscribe, getClientSnapshot, getServerSnapshot);

  // Live Backend Health States
  const [healthStatus, setHealthStatus] = useState<{ status: string; version?: string; service?: string } | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthTimestamp, setHealthTimestamp] = useState<string>('');
  const [healthLatency, setHealthLatency] = useState<number | null>(null);
  const [ragStatus, setRagStatus] = useState<ServerLegalCollectionStatus | null>(null);

  // User Directory States
  const [users, setUsers] = useState<ServerAdminUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState<'all' | 'active' | 'suspended' | 'banned'>('all');

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
  const [entryLogPage, setEntryLogPage] = useState<{ entries: ServerAccessEvent[]; total: number }>({ entries: [], total: 0 });
  const [entryPageIndex, setEntryPageIndex] = useState(0);
  const [entryLogsLoading, setEntryLogsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Authentication & Role Route Guard
  useEffect(() => {
    if (!mounted) return;
    if (user && user.role !== 'admin') {
      router.replace('/dashboard');
    }
  }, [mounted, user, router]);

  // Load the directory and event history once for the authenticated administrator.
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

      // Fetch the complete user directory with daily quota usage.
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

      // Fetch administrative and account-entry logs independently.
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

      try {
        const page = await serverApi.admin.getEntryLogs(entryPageSize, 0);
        if (!isCancelled) setEntryLogPage(page);
      } catch (err: unknown) {
        if (!isCancelled) console.warn('Could not load account entry logs:', err);
      } finally {
        if (!isCancelled) setEntryLogsLoading(false);
      }

      try {
        const status = await serverApi.admin.getRagStatus();
        if (!isCancelled) setRagStatus(status);
      } catch {
        if (!isCancelled) setRagStatus(null);
      }

    }

    loadData();
    return () => {
      isCancelled = true;
    };
  }, [mounted, user]);

  useEffect(() => {
    if (!mounted || !user || user.role !== 'admin') return;
    const timer = window.setInterval(() => {
      serverApi.admin.getEntryLogs(entryPageSize, entryPageIndex * entryPageSize)
        .then(setEntryLogPage)
        .catch(() => {});
    }, 30000);
    return () => window.clearInterval(timer);
  }, [entryPageIndex, mounted, user]);

  const refreshEntryLogs = async () => {
    setEntryLogsLoading(true);
    try {
      setEntryLogPage(await serverApi.admin.getEntryLogs(entryPageSize, entryPageIndex * entryPageSize));
    } catch (error) {
      setStatusMessage({ type: 'error', text: error instanceof Error ? error.message : 'Could not refresh entry logs.' });
    } finally {
      setEntryLogsLoading(false);
    }
  };

  const changeEntryPage = async (pageIndex: number) => {
    setEntryLogsLoading(true);
    try {
      setEntryLogPage(await serverApi.admin.getEntryLogs(entryPageSize, pageIndex * entryPageSize));
      setEntryPageIndex(pageIndex);
    } catch (error) {
      setStatusMessage({ type: 'error', text: error instanceof Error ? error.message : 'Could not load entry logs.' });
    } finally {
      setEntryLogsLoading(false);
    }
  };

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
          text: `Account ${target.username} has been ${target.status === 'banned' ? 'unbanned' : 'reactivated'}.`,
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

  // Filtered Users
  const filteredUsers = users.filter((u) => {
    const matchesQuery =
      u.username.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      (u.name && u.name.toLowerCase().includes(userSearchQuery.toLowerCase())) ||
      u.role.toLowerCase().includes(userSearchQuery.toLowerCase());

    const matchesStatus =
      userStatusFilter === 'all' ||
      (userStatusFilter === 'active' && u.status === 'active') ||
      (userStatusFilter === 'suspended' && u.status === 'suspended') ||
      (userStatusFilter === 'banned' && u.status === 'banned');

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

          {/* RAG Index Status Card */}
          <div className="p-6 rounded-2xl bg-paper-light border border-border shadow-xs space-y-3">
            <span className="text-xs font-mono uppercase tracking-wider text-ink-muted">RAG Knowledge Index</span>
            <div className="flex items-center gap-2.5">
              <span className={`w-3 h-3 rounded-full ${ragStatus?.exists ? 'bg-emerald-600' : 'bg-amber-500'}`} />
              <span className="font-heading text-xl font-bold text-green-deep">
                {ragStatus?.exists ? `${ragStatus.points.toLocaleString()} passages` : 'Not seeded'}
              </span>
            </div>
            <Link href="/admin/settings" className="text-xs font-semibold text-green-deep hover:underline">
              {ragStatus?.collection || 'Check connection and seed knowledge'} · Manage settings
            </Link>
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
                onChange={(e) => setUserStatusFilter(e.target.value as 'all' | 'active' | 'suspended' | 'banned')}
                className="px-3 py-1.5 rounded-full border border-border bg-paper text-ink text-xs font-sans focus:outline-hidden focus:border-brass"
              >
                <option value="all">{lang === 'bn' ? 'সকল স্ট্যাটাস' : 'All Statuses'}</option>
                <option value="active">{lang === 'bn' ? 'সক্রিয় (Active)' : 'Active Only'}</option>
                <option value="suspended">{lang === 'bn' ? 'স্থগিত (Suspended)' : 'Suspended Only'}</option>
                <option value="banned">Banned</option>
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
                    <th className="py-3 px-4">Usage Today</th>
                    <th className="py-3 px-4">Private Chats</th>
                    <th className="py-3 px-4">Created Date</th>
                    <th className="py-3 px-4 text-right">Lifecycle Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredUsers.map((u) => {
                    const isCurrentAdmin = u.id === user?.id;
                    const isProtectedAdmin = u.isSuperAdmin || u.role === 'admin';

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
                              u.status === 'banned'
                                ? 'bg-rose-100 text-rose-900 border-rose-300'
                                : u.status === 'suspended'
                                ? 'bg-amber-100 text-amber-900 border-amber-300'
                                : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                u.status === 'banned' ? 'bg-vermillion' : u.status === 'suspended' ? 'bg-amber-500' : 'bg-emerald-600'
                              }`}
                            />
                            {u.status || 'active'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 font-mono">
                          <div className="font-semibold text-ink">{u.usage.tokensUsed.toLocaleString()} tokens</div>
                          <div className="text-[10px] text-ink-muted">
                            {u.usage.questionsUsed} / {u.usage.questionsLimit} questions · reset {new Date(u.usage.resetAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })} UTC
                          </div>
                        </td>

                        <td className="py-3.5 px-4 font-mono">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-paper border border-border">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                            {u.chatCount} {u.chatCount === 1 ? 'chat' : 'chats'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 font-mono text-ink-muted">
                          {u.createdAt ? new Date(u.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          {isCurrentAdmin || isProtectedAdmin ? (
                            <span className="text-[11px] font-mono text-ink-muted italic">
                              {u.isSuperAdmin ? 'Protected Super Admin' : 'Protected Admin'}
                            </span>
                          ) : (
                            <div className="flex items-center justify-end gap-2">
                              {u.status === 'banned' ? (
                                user?.isSuperAdmin ? (
                                  <button
                                    type="button"
                                    onClick={() => setConfirmModal({ isOpen: true, type: 'reactivate', targetUser: u })}
                                    className="px-2.5 py-1 rounded-full border border-emerald-300 bg-emerald-50 text-emerald-900 text-[11px] font-semibold hover:bg-emerald-100 cursor-pointer"
                                  >
                                    Unban
                                  </button>
                                ) : <span className="text-[10px] text-ink-muted">Super Admin required</span>
                              ) : u.status === 'suspended' ? (
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
                                  className="px-2.5 py-1 rounded-full border border-rose-300 bg-rose-50 text-rose-900 text-[11px] font-semibold hover:bg-rose-100 cursor-pointer"
                                >
                                  Ban
                                </button>
                              )}

                              {!u.isEnvAccount && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setConfirmModal({
                                      isOpen: true,
                                      type: 'delete',
                                      targetUser: u,
                                    })
                                  }
                                  className="px-2.5 py-1 rounded-full border border-rose-300 bg-rose-50 text-rose-900 text-[11px] font-semibold hover:bg-rose-100 transition-colors cursor-pointer"
                                >
                                  Delete
                                </button>
                              )}
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

        {/* ── RECENT ADMINISTRATIVE ACTIVITY AUDIT TRAIL ──────────── */}
        <div className="p-6 sm:p-8 rounded-2xl bg-paper-light border border-border shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-border/80 pb-3">
            <div>
              <h2 className="font-heading text-xl font-bold text-green-deep">
                {lang === 'bn' ? 'সাম্প্রতিক প্রশাসনিক অডিট ট্রেইল' : 'Recent Administrative Audit Trail'}
              </h2>
              <p className="text-xs text-ink-muted font-sans">
                Recent administrative changes; login and registration events are shown separately below.
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
                      : log.action === 'USER_BANNED'
                      ? 'bg-rose-100 text-rose-900 border-rose-300'
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

        <section className="p-6 sm:p-8 rounded-2xl bg-paper-light border border-border shadow-xs space-y-4" aria-labelledby="entry-log-title">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 pb-3">
            <div>
              <h2 id="entry-log-title" className="font-heading text-xl font-bold text-green-deep">User Entry Log</h2>
              <p className="text-xs text-ink-muted">Successful registrations and sign-ins, newest first.</p>
            </div>
            <button
              type="button"
              onClick={refreshEntryLogs}
              disabled={entryLogsLoading}
              className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:bg-paper-dark disabled:opacity-50"
            >
              {entryLogsLoading ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
          {entryLogsLoading && entryLogPage.entries.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-muted">Loading entry history…</p>
          ) : entryLogPage.total === 0 ? (
            <p className="py-6 text-center text-sm text-ink-muted">No successful sign-ins or registrations recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-[10px] font-mono uppercase text-ink-muted">
                    <th className="py-3 px-3">Account</th>
                    <th className="py-3 px-3">Event</th>
                    <th className="py-3 px-3">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {entryLogPage.entries.map((entry) => (
                    <tr key={entry.id}>
                      <td className="py-3 px-3 font-mono">{entry.username}</td>
                      <td className="py-3 px-3">{entry.event === 'LOGIN' ? 'Sign in' : 'Registration'}</td>
                      <td className="py-3 px-3 font-mono text-ink-muted" title={new Date(entry.timestamp).toISOString()}>
                        {new Date(entry.timestamp).toLocaleString([], { dateStyle: 'medium', timeStyle: 'medium' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {entryLogPage.total > entryPageSize && (
            <div className="flex items-center justify-between border-t border-border pt-3 text-xs text-ink-muted">
              <span>{entryPageIndex * entryPageSize + 1}–{Math.min((entryPageIndex + 1) * entryPageSize, entryLogPage.total)} of {entryLogPage.total}</span>
              <div className="flex gap-2">
                <button type="button" disabled={entryPageIndex === 0 || entryLogsLoading} onClick={() => void changeEntryPage(entryPageIndex - 1)} className="rounded-full border border-border px-3 py-1.5 disabled:opacity-40">Previous</button>
                <button type="button" disabled={(entryPageIndex + 1) * entryPageSize >= entryLogPage.total || entryLogsLoading} onClick={() => void changeEntryPage(entryPageIndex + 1)} className="rounded-full border border-border px-3 py-1.5 disabled:opacity-40">Next</button>
              </div>
            </div>
          )}
        </section>

      </div>

      {/* ── ACTION CONFIRMATION MODAL ─────────────────────────────── */}
      {confirmModal.isOpen && confirmModal.targetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-150">
          <div className="max-w-md w-full bg-paper p-6 sm:p-8 rounded-2xl border border-brass shadow-2xl space-y-5">
            <h3 className="font-heading text-lg font-bold text-green-deep">
              {confirmModal.type === 'suspend' && 'Confirm Account Suspension'}
              {confirmModal.type === 'ban' && 'Confirm Permanent Ban'}
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
                  Ban <strong className="text-ink">{confirmModal.targetUser.username}</strong>? This blocks sign-in and revokes every active session. Only a Super Admin can later lift the ban.
                </>
              )}
              {confirmModal.type === 'reactivate' && (
                <>
                  Are you sure you want to {confirmModal.targetUser.status === 'banned' ? 'unban' : 'reactivate'}{' '}
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
                  confirmModal.type === 'delete'
                    ? 'bg-vermillion hover:bg-rose-700'
                    : confirmModal.type === 'suspend' || confirmModal.type === 'ban'
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
