'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useLang } from '@/lib/lang';
import { DrawerDetailModal } from './DrawerDetailModal';
import type { CorpusSection } from '@/types';
import {
  resolveCanonicalId,
  getCorpusSectionById,
  isValidCitationId,
} from '@/lib/citations';

export interface CitationCardItem {
  id: string;
  act: string;
  section: string;
  title: string;
  status: 'pending' | 'checking' | 'verified' | 'stripped';
  corpusRecord?: CorpusSection;
}

const INITIAL_CARDS: CitationCardItem[] = [
  {
    id: 'reg_1908_sec23',
    act: 'Registration Act, 1908',
    section: 'Section 23',
    title: 'Time for presenting documents',
    status: 'pending',
  },
  {
    id: 'tp_1882_sec52',
    act: 'Transfer of Property Act, 1882',
    section: 'Section 52',
    title: 'Transfer of property pending suit',
    status: 'pending',
  },
  {
    id: 'reg_1908_sec999_fake_clause',
    act: 'Registration Act, 1908',
    section: 'Section 999',
    title: 'Fabricated Hallucination',
    status: 'pending',
  },
  {
    id: 'land_crime_2023_sec4',
    act: 'Land Crime Prevention & Remedy Act, 2023',
    section: 'Section 4',
    title: 'Penalties for forged deeds',
    status: 'pending',
  },
];

export function LiteCitationGate() {
  const { lang } = useLang();

  // Cards and sequence state
  const [cards, setCards] = useState<CitationCardItem[]>(() =>
    INITIAL_CARDS.map((c) => ({ ...c }))
  );
  const [isRunning, setIsRunning] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const [activeCheckIndex, setActiveCheckIndex] = useState<number | null>(null);
  const [verifiedCount, setVerifiedCount] = useState(0);
  const [strippedCount, setStrippedCount] = useState(0);

  // User input and modal inspection
  const [customInput, setCustomInput] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<{
    section: CorpusSection | null;
    id: string | null;
  } | null>(null);
  const [logEntries, setLogEntries] = useState<{ id: string; time: string; reason: string }[]>([]);
  const [liveAnnouncement, setLiveAnnouncement] = useState('');

  const runTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (runTimerRef.current) clearTimeout(runTimerRef.current);
    };
  }, []);

  const handleRunCheck = useCallback(() => {
    if (isRunning) return;
    setIsRunning(true);
    setHasRun(false);
    setActiveCheckIndex(0);
    setLiveAnnouncement('Starting citation verification checkpoint.');

    let currentIndex = 0;
    let localVerified = 0;
    let localStripped = 0;

    function step() {
      if (currentIndex >= cards.length) {
        setIsRunning(false);
        setHasRun(true);
        setActiveCheckIndex(null);
        setLiveAnnouncement(
          `Verification complete. ${localVerified} citations verified. ${localStripped} citations stripped.`
        );
        return;
      }

      setActiveCheckIndex(currentIndex);
      const card = cards[currentIndex];
      const canonical = resolveCanonicalId(card.id);
      const isValid = isValidCitationId(card.id);
      const record = getCorpusSectionById(canonical);

      setCards((prev) =>
        prev.map((c, idx) =>
          idx === currentIndex
            ? {
                ...c,
                status: isValid ? 'verified' : 'stripped',
                corpusRecord: record ?? undefined,
              }
            : c
        )
      );

      if (isValid) {
        localVerified += 1;
        setVerifiedCount(localVerified);
      } else {
        localStripped += 1;
        setStrippedCount(localStripped);
        setLogEntries((prev) => [
          {
            id: card.id,
            time: new Date().toLocaleTimeString(),
            reason: 'Section ID not found in laws_corpus.json (28 verified statutory sections)',
          },
          ...prev,
        ]);
      }

      currentIndex += 1;
      runTimerRef.current = setTimeout(step, 450);
    }

    runTimerRef.current = setTimeout(step, 200);
  }, [isRunning, cards]);

  const handleReset = useCallback(() => {
    if (runTimerRef.current) clearTimeout(runTimerRef.current);
    setIsRunning(false);
    setHasRun(false);
    setActiveCheckIndex(null);
    setVerifiedCount(0);
    setStrippedCount(0);
    setLogEntries([]);
    setCards(INITIAL_CARDS.map((c) => ({ ...c })));
    setLiveAnnouncement('Citation verification reset.');
  }, []);

  const handleCustomTest = (e: React.FormEvent) => {
    e.preventDefault();
    const query = customInput.trim();
    if (!query) return;

    const canonical = resolveCanonicalId(query);
    const isValid = isValidCitationId(query);
    const record = getCorpusSectionById(canonical);

    const newCard: CitationCardItem = {
      id: query,
      act: record?.act || 'Custom Submission',
      section: record?.section || query,
      title: record?.title || (isValid ? 'Corpus Match' : 'Unverified Section'),
      status: isValid ? 'verified' : 'stripped',
      corpusRecord: record ?? undefined,
    };

    setCards((prev) => [newCard, ...prev]);
    setCustomInput('');

    if (isValid) {
      setVerifiedCount((prev) => prev + 1);
    } else {
      setStrippedCount((prev) => prev + 1);
      setLogEntries((prev) => [
        {
          id: query,
          time: new Date().toLocaleTimeString(),
          reason: 'Custom citation not in statutory corpus',
        },
        ...prev,
      ]);
    }
  };

  return (
    <section id="citations" className="py-16 sm:py-24 border-b border-border bg-paper scroll-mt-20">
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8 lg:px-10">
        {/* Section Header */}
        <div className="max-w-2xl text-left space-y-3">
          <div className="text-xs font-mono uppercase tracking-widest text-brass font-bold">
            {lang === 'bn' ? 'সংবিধিবদ্ধ নিশ্চয়তা • শূন্য বিভ্রান্তি' : 'Statutory Integrity • Zero Fabrication'}
          </div>
          <h2 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-bold text-ink">
            {lang === 'bn' ? 'আইনি রেফারেন্স গেট ও সত্যতা যাচাই' : 'Deterministic Citation Gate'}
          </h2>
          <p className="font-sans text-sm sm:text-base text-ink-muted leading-relaxed">
            {lang === 'bn'
              ? 'আমাদের এআই শুধুমাত্র প্রণীত ২৮টি সংবিধিবদ্ধ ধারা থেকে উত্তর দেয়। যেকোনো অপ্রমাণিত বা মনগড়া ধারা তাৎক্ষণিকভাবে ফিল্টার হয়ে বাদ পড়ে।'
              : 'Nothi AI answers strictly from 28 verified sections of Bangladeshi property law. Any unverified citation is immediately intercepted and stripped.'}
          </p>
        </div>

        {/* Live Accessibility Announcement */}
        <div className="sr-only" aria-live="polite">{liveAnnouncement}</div>

        {/* Controls & Metrics Bar */}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl border border-border bg-paper-dark">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleRunCheck}
              disabled={isRunning}
              className="px-5 py-2.5 rounded-full bg-green-deep hover:bg-green-mid disabled:opacity-50 text-paper font-sans text-xs font-semibold shadow-xs transition-all cursor-pointer min-h-[44px]"
            >
              {isRunning
                ? (lang === 'bn' ? 'যাচাই করা হচ্ছে...' : 'Checking...')
                : (lang === 'bn' ? 'গেট পরীক্ষা শুরু করুন' : 'Run Checkpoint')}
            </button>

            <button
              type="button"
              onClick={handleReset}
              disabled={isRunning || (!hasRun && cards.length === INITIAL_CARDS.length)}
              className="px-4 py-2.5 rounded-full border border-border hover:border-brass text-ink font-sans text-xs font-medium transition-colors cursor-pointer min-h-[44px]"
            >
              {lang === 'bn' ? 'রিসেট' : 'Reset'}
            </button>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <span className="flex items-center gap-1.5 text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-600" />
              <span>Verified: <strong>{verifiedCount}</strong></span>
            </span>
            <span className="flex items-center gap-1.5 text-vermillion bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
              <span className="w-2 h-2 rounded-full bg-vermillion" />
              <span>Stripped: <strong>{strippedCount}</strong></span>
            </span>
          </div>
        </div>

        {/* Citation Cards Grid */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((card, idx) => {
            const isChecking = activeCheckIndex === idx;
            const isVerified = card.status === 'verified';
            const isStripped = card.status === 'stripped';

            return (
              <div
                key={`${card.id}-${idx}`}
                className={`p-4 rounded-xl border transition-all duration-200 flex flex-col justify-between min-h-[170px] ${
                  isChecking
                    ? 'border-brass bg-brass/5 shadow-md scale-[1.02]'
                    : isVerified
                    ? 'border-emerald-300 bg-emerald-50/40 shadow-xs'
                    : isStripped
                    ? 'border-rose-300 bg-rose-50/30 opacity-75'
                    : 'border-border bg-paper shadow-2xs hover:border-border/80'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between text-[11px] font-mono text-ink-muted mb-1.5">
                    <span className="truncate max-w-[140px]">{card.act}</span>
                    {isVerified && (
                      <span className="text-emerald-700 font-bold bg-emerald-100 px-1.5 py-0.5 rounded text-[10px]">
                        ✓ VERIFIED
                      </span>
                    )}
                    {isStripped && (
                      <span className="text-vermillion font-bold bg-rose-100 px-1.5 py-0.5 rounded text-[10px]">
                        ✕ STRIPPED
                      </span>
                    )}
                    {isChecking && (
                      <span className="text-brass font-bold animate-pulse text-[10px]">
                        CHECKING...
                      </span>
                    )}
                    {card.status === 'pending' && (
                      <span className="text-ink-muted text-[10px]">PENDING</span>
                    )}
                  </div>

                  <h3 className={`font-heading text-base font-semibold text-ink leading-snug ${isStripped ? 'line-through text-ink-muted' : ''}`}>
                    {card.section}
                  </h3>
                  <p className="font-sans text-xs text-ink-muted mt-1 leading-normal line-clamp-2">
                    {card.title}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-border/60 flex items-center justify-between">
                  <span className="font-mono text-[10px] text-ink-muted truncate max-w-[120px]">
                    {card.id}
                  </span>
                  {card.corpusRecord && (
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedRecord({
                          section: card.corpusRecord || null,
                          id: card.id,
                        })
                      }
                      className="text-[11px] font-sans font-medium text-green-deep hover:underline cursor-pointer"
                    >
                      {lang === 'bn' ? 'বিবরণ দেখুন' : 'Inspect'} →
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Custom Test Form */}
        <div className="mt-8 p-5 rounded-xl border border-border bg-paper-dark/60 max-w-xl">
          <form onSubmit={handleCustomTest} className="space-y-3">
            <label htmlFor="custom-citation-input" className="block text-xs font-mono font-medium text-ink">
              {lang === 'bn' ? 'কাস্টম ধারা আইডি দিয়ে টেস্ট করুন:' : 'Test with custom citation ID:'}
            </label>
            <div className="flex gap-2">
              <input
                id="custom-citation-input"
                type="text"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                placeholder="e.g. reg_1908_sec23 or fake_sec_999"
                className="flex-1 px-3.5 py-2 rounded-lg border border-border bg-paper text-ink font-mono text-xs focus:outline-hidden focus:border-brass"
              />
              <button
                type="submit"
                disabled={!customInput.trim()}
                className="px-4 py-2 rounded-lg bg-green-deep hover:bg-green-mid disabled:opacity-40 text-paper font-sans text-xs font-semibold cursor-pointer min-h-[40px]"
              >
                {lang === 'bn' ? 'যাচাই' : 'Verify'}
              </button>
            </div>
          </form>
        </div>

        {/* Stripped Audit Log */}
        {logEntries.length > 0 && (
          <div className="mt-6 p-4 rounded-xl border border-rose-200 bg-rose-50/50 space-y-2">
            <div className="text-xs font-mono font-bold text-vermillion uppercase">
              {lang === 'bn' ? 'ফিল্টার লগ (মনগড়া ধারা অপসারিত)' : 'Filter Log (Hallucinated Citations Intercepted)'}
            </div>
            <div className="space-y-1">
              {logEntries.slice(0, 3).map((entry, idx) => (
                <div key={idx} className="font-mono text-xs text-ink-muted flex items-start gap-2">
                  <span className="text-vermillion font-bold">[{entry.time}]</span>
                  <span className="font-semibold text-ink line-through">{entry.id}:</span>
                  <span>{entry.reason}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Drawer Inspection Modal */}
      {selectedRecord && (
        <DrawerDetailModal
          section={selectedRecord.section}
          citationId={selectedRecord.id}
          onClose={() => setSelectedRecord(null)}
        />
      )}
    </section>
  );
}
