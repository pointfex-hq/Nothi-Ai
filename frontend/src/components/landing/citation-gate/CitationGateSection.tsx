'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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

export function CitationGateSection() {
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

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (runTimerRef.current) clearTimeout(runTimerRef.current);
    };
  }, []);

  // Run Checkpoint Evaluation Sequence
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
        setVerifiedCount(localVerified);
        setStrippedCount(localStripped);
        setLiveAnnouncement(
          `Checkpoint complete: ${localVerified} citations verified against corpus, ${localStripped} fabricated citations stripped.`
        );
        return;
      }

      setActiveCheckIndex(currentIndex);
      const card = cards[currentIndex];
      const canonical = resolveCanonicalId(card.id);
      const isVerified = isValidCitationId(canonical);

      // 1. Mark as checking
      setCards((prev) =>
        prev.map((c, idx) => (idx === currentIndex ? { ...c, status: 'checking' } : c))
      );

      // 2. Evaluate and stamp after brief scanning pause (650ms)
      runTimerRef.current = setTimeout(() => {
        if (isVerified) {
          localVerified++;
          setVerifiedCount(localVerified);
          setCards((prev) =>
            prev.map((c, idx) => (idx === currentIndex ? { ...c, status: 'verified' } : c))
          );
          setLiveAnnouncement(`${card.id} verified against verified statutory corpus.`);
        } else {
          localStripped++;
          setStrippedCount(localStripped);
          setCards((prev) =>
            prev.map((c, idx) => (idx === currentIndex ? { ...c, status: 'stripped' } : c))
          );
          const time = new Date().toLocaleTimeString();
          setLogEntries((prev) => [
            { id: card.id, time, reason: 'not found in laws_corpus.json' },
            ...prev,
          ]);
          setLiveAnnouncement(`${card.id} rejected and removed: not found in laws_corpus.json.`);
        }

        // 3. Move to next card
        runTimerRef.current = setTimeout(() => {
          currentIndex++;
          step();
        }, 650);
      }, 650);
    }

    step();
  }, [cards, isRunning]);

  // Reset to initial clean state
  const handleReset = () => {
    if (runTimerRef.current) clearTimeout(runTimerRef.current);
    setIsRunning(false);
    setHasRun(false);
    setActiveCheckIndex(null);
    setVerifiedCount(0);
    setStrippedCount(0);
    setCards(INITIAL_CARDS.map((c) => ({ ...c, status: 'pending' })));
    setLogEntries([]);
    setLiveAnnouncement('Checkpoint reset. All citation cards returned to initial state.');
  };

  // Add custom ID slip
  const handleAddCustomId = (idToAdd: string) => {
    const trimmed = idToAdd.trim();
    if (!trimmed) return;
    if (cards.some((c) => c.id === trimmed)) {
      setLiveAnnouncement(`Citation ID ${trimmed} already exists in the checkpoint.`);
      return;
    }

    const canonical = resolveCanonicalId(trimmed);
    const corpusRecord = getCorpusSectionById(canonical);

    const newCard: CitationCardItem = {
      id: trimmed,
      act: corpusRecord?.act || 'Custom Legal Query',
      section: corpusRecord?.section || 'Query Section',
      title: corpusRecord?.title || (corpusRecord ? 'Verified Section' : 'Unregistered Input Citation'),
      status: 'pending',
      corpusRecord: corpusRecord,
    };

    setCards((prev) => [...prev, newCard]);
    setCustomInput('');
    setLiveAnnouncement(`Added citation card for ${trimmed}. Ready to check.`);
  };

  const handleSelectCard = (card: CitationCardItem) => {
    if (card.status !== 'verified') return;
    const canonical = resolveCanonicalId(card.id);
    const record = getCorpusSectionById(canonical) || card.corpusRecord || null;
    setSelectedRecord({ section: record, id: card.id });
  };

  return (
    <section
      id="citations"
      className="py-24 border-b border-border bg-paper scroll-mt-24"
      aria-labelledby="citations-main-heading"
    >
      {/* Invisible live region for screen-reader announcements */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {liveAnnouncement}
      </div>

      <div className="max-w-[1280px] mx-auto px-6 sm:px-8 lg:px-12">
        {/* ── 1. SECTION HEADER (MODERN, CONFIDENT, MINIMAL) ── */}
        <div className="space-y-4 max-w-3xl">
          <h2
            id="citations-main-heading"
            className="font-heading text-green-deep tracking-tight text-[clamp(2.5rem,5vw,4.5rem)] leading-[1.08] font-bold"
          >
            {lang === 'bn'
              ? 'উদ্ধৃতি নির্ভরযোগ্যতা ও সংবিধিবদ্ধ গেট'
              : 'Why citations can be trusted'}
          </h2>

          <p className="text-base sm:text-lg text-ink-muted font-sans leading-relaxed">
            In property title vetting, fabricated statutory citations create fatal title liabilities.
            Nothi AI checks citations against source-verified corpus entries and excludes placeholder text before displaying a citation.
          </p>
        </div>

        {/* ── 2. THE STAR: THE DARK INK CHECKPOINT PANEL ── */}
        <div className="mt-10 sm:mt-12 rounded-[20px] bg-[#1a1a18] border border-white/10 shadow-2xl p-6 sm:p-10 lg:p-12 min-h-[540px] text-paper relative overflow-hidden flex flex-col justify-between">
          {/* Subtle warm atmospheric glow */}
          <div
            className="absolute inset-0 pointer-events-none opacity-40"
            style={{
              background:
                'radial-gradient(ellipse at 50% 15%, rgba(176, 141, 87, 0.12) 0%, rgba(27, 67, 50, 0.08) 50%, transparent 80%)',
            }}
          />

          {/* Top Panel Bar */}
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-brass animate-pulse" />
              <span className="font-sans text-sm sm:text-base font-semibold tracking-wide text-paper">
                Statutory Checkpoint
              </span>
              <span className="text-xs text-brass-light font-mono px-2 py-0.5 rounded-xs bg-brass/15 border border-brass/30">
                Verified sources only
              </span>
            </div>

            {/* Live Counters */}
            <div className="flex items-center gap-3 font-mono text-xs sm:text-sm">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-sm bg-green-deep/80 text-green-light border border-green-light/30">
                <span className="font-bold">✓ Verified:</span>
                <span className="text-paper font-semibold">{verifiedCount}</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-sm bg-vermillion/80 text-vermillion-light border border-vermillion-light/30">
                <span className="font-bold">▲ Removed:</span>
                <span className="text-paper font-semibold">{strippedCount}</span>
              </div>
            </div>
          </div>

          {/* ── 3. CITATION CARDS THROUGH THE CHECKPOINT (3D FANNED STAGE) ── */}
          <div className="relative z-10 my-8 py-4 sm:py-6" style={{ perspective: '1200px' }}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {cards.map((card, idx) => {
                const isChecking = activeCheckIndex === idx;
                const isVerified = card.status === 'verified';
                const isStripped = card.status === 'stripped';

                // Initial 3D tilt angles for fanned physical desk appearance
                const baseRotateY = idx === 0 ? -4 : idx === 1 ? -1.5 : idx === 2 ? 1.5 : 4;
                const baseRotateZ = idx === 0 ? -1 : idx === 1 ? -0.4 : idx === 2 ? 0.4 : 1;

                return (
                  <motion.div
                    key={card.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      rotateY: isChecking ? 0 : baseRotateY,
                      rotateZ: isChecking ? 0 : baseRotateZ,
                      scale: isChecking ? 1.04 : 1,
                    }}
                    transition={{ duration: 0.35, ease: 'easeOut' }}
                    whileHover={
                      !isRunning && isVerified
                        ? { y: -10, scale: 1.03, zIndex: 30 }
                        : !isRunning
                        ? { y: -6, scale: 1.02, zIndex: 20 }
                        : undefined
                    }
                    onClick={() => handleSelectCard(card)}
                    className={`relative rounded-sm transition-shadow duration-200 select-none ${
                      isVerified ? 'cursor-pointer' : 'cursor-default'
                    }`}
                  >
                    {/* The Physical Paper Card */}
                    <div
                      className={`relative rounded-sm p-5 sm:p-6 bg-[#fdfbf7] text-[#1a1a18] shadow-xl border-2 transition-colors duration-300 flex flex-col justify-between min-h-[220px] overflow-hidden ${
                        isVerified
                          ? 'border-green-deep/70 ring-2 ring-green-mid/40 shadow-green-deep/20'
                          : isStripped
                          ? 'border-vermillion/70 bg-[#faf3f2] opacity-75'
                          : isChecking
                          ? 'border-brass ring-2 ring-brass/50 shadow-brass/30'
                          : 'border-[#b08d57]/40 hover:border-brass hover:shadow-2xl'
                      }`}
                    >
                      {/* Brass corner accent lines */}
                      <div className="absolute top-0 right-0 w-8 h-8 pointer-events-none">
                        <div className="absolute top-1.5 right-1.5 w-4 h-[1px] bg-brass/50" />
                        <div className="absolute top-1.5 right-1.5 h-4 w-[1px] bg-brass/50" />
                      </div>

                      {/* Card Content Header */}
                      <div className="space-y-2">
                        {/* Monospace Citation ID */}
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-sm sm:text-base font-bold text-ink">
                            {card.id}
                          </span>
                          {isVerified && (
                            <span className="text-[11px] font-mono text-green-deep font-semibold">
                              [CORPUS]
                            </span>
                          )}
                        </div>

                        {/* Serif Section Title */}
                        <h3 className="font-heading text-base sm:text-lg text-ink font-bold leading-snug">
                          {card.section ? `${card.section} • ` : ''}
                          {card.title}
                        </h3>
                      </div>

                      {/* Card Bottom: Act Label */}
                      <div className="pt-4 border-t border-border/60 flex items-center justify-between text-xs text-ink-muted">
                        <span className="font-sans font-medium truncate max-w-[170px]" title={card.act}>
                          {card.act}
                        </span>

                        {isVerified && (
                          <span className="text-[11px] font-mono text-green-deep font-semibold underline underline-offset-2">
                            View entry &rarr;
                          </span>
                        )}
                      </div>

                      {/* ── SCANLINE BEAM ANIMATION (WHILE CHECKING) ── */}
                      {isChecking && (
                        <motion.div
                          className="absolute left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-brass to-transparent pointer-events-none shadow-[0_0_12px_#b08d57]"
                          initial={{ top: '0%' }}
                          animate={{ top: ['0%', '100%', '0%'] }}
                          transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                        />
                      )}

                      {/* ── BOTTLE-GREEN VERIFIED SEAL STAMP ── */}
                      <AnimatePresence>
                        {isVerified && (
                          <motion.div
                            initial={{ scale: 2.2, opacity: 0, rotate: -15 }}
                            animate={{ scale: 1, opacity: 0.95, rotate: -4 }}
                            transition={{ type: 'spring', damping: 14, stiffness: 260 }}
                            className="absolute bottom-4 right-4 pointer-events-none"
                          >
                            <div className="px-3.5 py-1.5 rounded-xs border-2 border-green-deep bg-green-deep/10 text-green-deep font-mono text-xs font-black tracking-widest uppercase flex items-center gap-1.5 shadow-sm">
                              <span>✓</span>
                              <span>VERIFIED</span>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* ── VERMILLION NOT IN CORPUS STAMP ── */}
                      <AnimatePresence>
                        {isStripped && (
                          <motion.div
                            initial={{ scale: 2.2, opacity: 0, rotate: 12 }}
                            animate={{ scale: 1, opacity: 0.95, rotate: 3 }}
                            transition={{ type: 'spring', damping: 14, stiffness: 260 }}
                            className="absolute bottom-4 right-4 pointer-events-none"
                          >
                            <div className="px-3 py-1.5 rounded-xs border-2 border-vermillion bg-vermillion/10 text-vermillion font-mono text-xs font-black tracking-widest uppercase flex items-center gap-1.5 shadow-sm">
                              <span>▲</span>
                              <span>NOT IN CORPUS</span>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* ── CLEAN SHREDDER EFFECT (SPLIT STRIPS WHEN STRIPPED) ── */}
                      {isStripped && (
                        <div className="absolute inset-0 pointer-events-none flex">
                          {[0, 1, 2, 3].map((stripIdx) => (
                            <motion.div
                              key={stripIdx}
                              initial={{ y: 0, opacity: 0 }}
                              animate={{ y: [0, 4, 2], opacity: 1 }}
                              transition={{ duration: 0.4, delay: stripIdx * 0.06 }}
                              className={`flex-1 border-r border-dashed border-vermillion/40 ${
                                stripIdx % 2 === 0 ? 'bg-vermillion/5' : 'bg-transparent'
                              }`}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* ── 4. CHECKPOINT ACTIONS & INTERACTIVE CONTROLS ── */}
          <div className="relative z-10 pt-4 border-t border-white/10 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              {/* Primary Evaluation Trigger Button */}
              {!hasRun ? (
                <button
                  type="button"
                  disabled={isRunning}
                  onClick={handleRunCheck}
                  className="px-8 py-3.5 rounded-sm bg-green-deep hover:bg-green-mid text-paper font-sans text-base font-semibold transition-all duration-200 shadow-lg hover:shadow-xl active:scale-95 cursor-pointer disabled:opacity-50 flex items-center gap-2.5 focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 focus-visible:outline-hidden"
                >
                  <span>{isRunning ? 'Evaluating against corpus...' : 'Check these citations'}</span>
                  <span className="text-brass-light font-bold">→</span>
                </button>
              ) : (
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="px-6 py-3 rounded-sm border border-brass text-brass-light hover:bg-brass/20 font-sans text-sm font-semibold transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-brass focus-visible:outline-hidden"
                  >
                    ↺ Run again
                  </button>
                  <span className="text-sm font-mono text-green-light font-bold">
                    ✓ 3 verified statutes confirmed • 1 fabricated clause stripped
                  </span>
                </div>
              )}

              {/* Status Hint */}
              <div className="text-xs sm:text-sm font-mono text-paper-dark/70">
                {isRunning
                  ? 'Sequential lookup in laws_corpus.json...'
                  : hasRun
                  ? 'All entries cross-referenced'
                  : 'Initial state: identical unverified slips'}
              </div>
            </div>

            {/* "Try your own ID" Quick Testing Bar */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-4 text-xs font-mono text-paper-dark">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAddCustomId(customInput);
                }}
                className="flex flex-wrap sm:flex-nowrap items-center gap-2 max-w-md w-full"
              >
                <label htmlFor="checkpoint-custom-id" className="text-paper-dark/80 whitespace-nowrap">
                  Try your own ID:
                </label>
                <input
                  id="checkpoint-custom-id"
                  type="text"
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  placeholder="e.g. tpa_1882_s54"
                  className="flex-1 min-w-0 px-3 py-1.5 rounded-xs bg-[#241b16] border border-white/20 text-xs font-mono text-paper placeholder:text-paper-dark/40 focus-visible:ring-2 focus-visible:ring-brass focus-visible:outline-hidden"
                />
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-xs bg-brass/30 hover:bg-brass text-paper font-semibold border border-brass/50 transition-colors cursor-pointer"
                >
                  Add
                </button>
              </form>

              {/* Shortcut buttons */}
              <div className="flex items-center gap-3">
                <span className="text-paper-dark/60">Presets:</span>
                <button
                  type="button"
                  onClick={() => handleAddCustomId('tpa_1882_s54')}
                  className="text-green-light hover:underline font-semibold cursor-pointer"
                >
                  Try a real ID
                </button>
                <span className="text-white/20">•</span>
                <button
                  type="button"
                  onClick={() => handleAddCustomId('nid_rule_99_fabricated')}
                  className="text-vermillion-light hover:underline font-semibold cursor-pointer"
                >
                  Try a made-up ID
                </button>
              </div>
            </div>

            {/* Registry Discard Ledger Output */}
            {logEntries.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 p-3 rounded-xs bg-black/40 border border-vermillion/40 text-xs font-mono text-vermillion-light flex flex-wrap items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2">
                  <span className="font-bold text-vermillion">[DISCARD LOG]</span>
                  <span>[{logEntries[0].time}]</span>
                  <span className="font-bold text-paper">{logEntries[0].id}</span>
                  <span>&rarr;</span>
                  <span>{logEntries[0].reason}</span>
                </div>
                <span className="text-[11px] text-paper-dark/70">
                  SRS FR-4.2 Zero-Fabrication Invariant Enforced
                </span>
              </motion.div>
            )}
          </div>
        </div>

        {/* Required one-line caption under the dark panel */}
        <p className="mt-4 text-center text-sm text-ink-muted font-sans">
          Every citation is checked against the verified corpus before it is shown.
        </p>
      </div>

      {/* Archival Record Inspection Modal */}
      <DrawerDetailModal
        section={selectedRecord?.section || null}
        citationId={selectedRecord?.id || null}
        onClose={() => setSelectedRecord(null)}
      />
    </section>
  );
}
