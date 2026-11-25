'use client';

import { useEffect, useState, useSyncExternalStore, type ChangeEvent, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { serverApi, type ServerLegalCollectionStatus, type ServerUsageLimits } from '@/lib/api';
import { useAuth } from '@/lib/auth';

const emptySubscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;
const defaultLimits: ServerUsageLimits = {
  questionsPerMinute: 5,
  questionsPerDay: 10,
  maxOutputTokens: 500,
  dailyTokenBudget: 50000,
};

export default function AdminSettingsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const mounted = useSyncExternalStore(emptySubscribe, getClientSnapshot, getServerSnapshot);
  const [limits, setLimits] = useState(defaultLimits);
  const [initialLimits, setInitialLimits] = useState(defaultLimits);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ragStatus, setRagStatus] = useState<ServerLegalCollectionStatus | null>(null);
  const [ragError, setRagError] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!mounted) return;
    if (user && user.role !== 'admin') router.replace('/dashboard');
  }, [mounted, router, user]);

  useEffect(() => {
    if (!mounted || user?.role !== 'admin') return;
    let cancelled = false;

    const ragStatusRequest = serverApi.admin.getRagStatus().catch((error: unknown) => {
      if (!cancelled) setRagError(error instanceof Error ? error.message : 'RAG status is unavailable.');
      return null;
    });

    Promise.all([serverApi.admin.getUsageLimits(), ragStatusRequest])
      .then(([nextLimits, nextRagStatus]) => {
        if (cancelled) return;
        setLimits(nextLimits);
        setInitialLimits(nextLimits);
        setRagStatus(nextRagStatus);
        if (nextRagStatus) setRagError(null);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setNotice({ type: 'error', text: error instanceof Error ? error.message : 'Could not load admin settings.' });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [mounted, user]);

  const isDirty = Object.keys(defaultLimits).some((key) =>
    limits[key as keyof ServerUsageLimits] !== initialLimits[key as keyof ServerUsageLimits]
  );

  async function saveLimits(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setNotice(null);
    try {
      const updated = await serverApi.admin.saveUsageLimits(limits);
      setLimits(updated);
      setInitialLimits(updated);
      setNotice({ type: 'success', text: 'Usage limits saved.' });
    } catch (error) {
      setNotice({ type: 'error', text: error instanceof Error ? error.message : 'Could not save usage limits.' });
    } finally {
      setSaving(false);
    }
  }

  async function seedCorpus(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      setNotice({ type: 'error', text: 'Corpus files must be 8 MB or smaller.' });
      return;
    }

    setSeeding(true);
    setNotice(null);
    try {
      const text = (await file.text()).replace(/^\uFEFF/u, '');
      const corpus: unknown = file.name.toLowerCase().endsWith('.jsonl')
        ? text.split(/\r?\n/u).filter(line => line.trim()).map(line => JSON.parse(line))
        : JSON.parse(text);
      if (!Array.isArray(corpus) || !corpus.length) throw new Error('Provide a non-empty JSON array or JSON Lines corpus.');

      const result = await serverApi.admin.seedLegalCorpus(corpus);
      setNotice({ type: 'success', text: `Indexed ${result.indexedPoints.toLocaleString()} legal passage records.` });
      try {
        setRagStatus(await serverApi.admin.getRagStatus());
        setRagError(null);
      } catch (error) {
        setRagError(error instanceof Error ? error.message : 'Index status is unavailable.');
      }
    } catch (error) {
      setNotice({ type: 'error', text: error instanceof Error ? error.message : 'Could not seed the legal knowledge index.' });
    } finally {
      setSeeding(false);
    }
  }

  async function seedDefaultCorpus() {
    setSeeding(true);
    setNotice(null);
    try {
      const result = await serverApi.admin.seedDefaultLegalCorpus();
      setNotice({ type: 'success', text: `Seeded ${result.indexedPoints} official passages into ${result.collection}.` });
      try {
        setRagStatus(await serverApi.admin.getRagStatus());
        setRagError(null);
      } catch (error) {
        setRagError(error instanceof Error ? error.message : 'Index status is unavailable.');
      }
    } catch (error) {
      setNotice({ type: 'error', text: error instanceof Error ? error.message : 'Could not seed the bundled legal corpus.' });
    } finally {
      setSeeding(false);
    }
  }

  if (mounted && (!user || user.role !== 'admin')) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-4 px-5 text-center">
        <h1 className="font-heading text-2xl font-bold text-green-deep">Administrator Access Required</h1>
        <p className="text-sm text-ink-muted">Sign in with an administrator account to change system settings.</p>
        <Link href="/admin" className="rounded-full bg-green-deep px-5 py-2.5 text-sm font-semibold text-paper">Admin sign in</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper px-4 py-8 text-ink sm:px-6 lg:px-12">
      <div className="mx-auto max-w-5xl space-y-7">
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-muted">Control room / Configuration</p>
            <h1 className="mt-2 font-heading text-3xl font-bold text-green-deep">Admin Settings</h1>
            <p className="mt-1 text-sm text-ink-muted">Usage policy and the legal retrieval knowledge index.</p>
          </div>
          <Link href="/admin" className="rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-paper-dark">Back to Admin</Link>
        </header>

        {notice && (
          <div role="status" className={`rounded-lg border p-4 text-sm ${notice.type === 'success' ? 'border-emerald-300 bg-emerald-50 text-emerald-900' : 'border-rose-300 bg-rose-50 text-rose-900'}`}>
            {notice.text}
          </div>
        )}

        <section className="rounded-xl border border-border bg-paper-light p-5 shadow-xs sm:p-7">
          <div className="mb-6 border-b border-border pb-4">
            <h2 className="font-heading text-xl font-bold text-green-deep">Usage Limits</h2>
            <p className="mt-1 text-sm text-ink-muted">Applied per account; daily counters reset at 00:00 UTC.</p>
          </div>
          {loading ? (
            <p className="py-8 text-center text-sm text-ink-muted">Loading settings…</p>
          ) : (
            <form onSubmit={saveLimits} className="space-y-6">
              <div className="grid gap-5 sm:grid-cols-2">
                {([
                  ['questionsPerMinute', 'Questions per minute', 1, 120, 1],
                  ['questionsPerDay', 'Questions per day', 1, 1000, 1],
                  ['maxOutputTokens', 'Maximum output tokens', 100, 4096, 50],
                  ['dailyTokenBudget', 'Daily token budget', 1000, 1000000, 5000],
                ] as const).map(([key, label, min, max, step]) => (
                  <label key={key} className="space-y-2 text-sm font-semibold">
                    <span>{label}</span>
                    <input
                      type="number"
                      min={min}
                      max={max}
                      step={step}
                      required
                      value={limits[key]}
                      onChange={(event) => setLimits(current => ({ ...current, [key]: Number(event.target.value) }))}
                      className="w-full rounded-lg border border-border bg-paper px-3 py-2.5 font-mono text-sm outline-none focus:border-brass focus:ring-2 focus:ring-brass/20"
                    />
                  </label>
                ))}
              </div>
              <div className="flex flex-wrap justify-end gap-3 border-t border-border pt-4">
                <button type="button" disabled={!isDirty || saving} onClick={() => setLimits(initialLimits)} className="rounded-full border border-border px-4 py-2 text-sm font-semibold disabled:opacity-40">
                  Discard
                </button>
                <button type="submit" disabled={!isDirty || saving} className="rounded-full bg-green-deep px-5 py-2 text-sm font-semibold text-paper disabled:opacity-40">
                  {saving ? 'Saving…' : 'Save settings'}
                </button>
              </div>
            </form>
          )}
        </section>

        <section className="rounded-xl border border-border bg-paper-light p-5 shadow-xs sm:p-7">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
            <div>
              <h2 className="font-heading text-xl font-bold text-green-deep">RAG Legal Knowledge</h2>
              <p className="mt-1 text-sm text-ink-muted">Seed Qdrant from an approved JSON or JSONL source corpus.</p>
            </div>
            <span className={`rounded-full border px-3 py-1 font-mono text-xs ${ragStatus?.exists ? 'border-emerald-300 bg-emerald-50 text-emerald-900' : 'border-amber-300 bg-amber-50 text-amber-900'}`}>
              {ragStatus ? `${ragStatus.points.toLocaleString()} indexed passages` : 'Index unavailable'}
            </span>
          </div>

          <p className="mb-4 text-sm text-ink-muted">
            Collection: <code className="rounded bg-paper px-1.5 py-0.5">{ragStatus?.collection ?? 'QDRANT_LEGAL_COLLECTION'}</code>
          </p>
          <button type="button" disabled={seeding || loading} onClick={() => void seedDefaultCorpus()} className="mb-4 rounded-full bg-green-deep px-4 py-2 text-sm font-semibold text-paper disabled:opacity-50">
            {seeding ? 'Seeding…' : 'Seed bundled verified starter (Sections 23–25)'}
          </button>
          <label className="block rounded-lg border-2 border-dashed border-border bg-paper p-5 text-sm">
            <span className="mb-2 block font-semibold text-ink">Choose legal corpus (.json or .jsonl, up to 8 MB)</span>
            <input type="file" accept=".json,.jsonl,application/json" disabled={seeding} onChange={seedCorpus} className="block w-full text-sm" />
          </label>
          <p className="mt-3 text-xs leading-relaxed text-ink-muted">
            The bundled starter includes verified Registration Act Sections 23–25, including the current three-month Section 23 period and Section 25 exception. For broader coverage, upload an approved JSON/JSONL corpus with verbatim text, law title, section, jurisdiction and official URLs. Placeholder text is rejected; the UI citation catalog is not a RAG source.
          </p>
          {ragError && <p role="alert" className="mt-3 text-sm text-rose-800">{ragError}</p>}
          {seeding && <p role="status" className="mt-3 text-sm text-ink-muted">Validating and indexing corpus…</p>}
          {!loading && !ragStatus && <p className="mt-3 text-xs text-amber-900">Configure `QDRANT_URL` and `QDRANT_API_KEY` on the backend to connect the knowledge index.</p>}
        </section>
      </div>
    </div>
  );
}
