'use client';

import { useState, useEffect, useRef, useSyncExternalStore } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useLang } from '@/lib/lang';
import { ReducedMotionFallback } from './ReducedMotionFallback';
import { Reticle3DCursor } from './Reticle3DCursor';
import { DocumentInspectorCard } from './DocumentInspectorCard';

const subscribeReducedMotion = (callback: () => void) => {
  const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
  mql.addEventListener('change', callback);
  return () => mql.removeEventListener('change', callback);
};
const getReducedMotionSnapshot = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const getReducedMotionServerSnapshot = () => false;

const subscribeMobile = (callback: () => void) => {
  window.addEventListener('resize', callback);
  return () => window.removeEventListener('resize', callback);
};
const getMobileSnapshot = () => window.innerWidth < 768;
const getMobileServerSnapshot = () => false;

// Dynamically import Three.js canvas to avoid SSR hydration mismatch
const RegistryDeskCanvas = dynamic(
  () => import('./RegistryDeskCanvas').then((mod) => mod.RegistryDeskCanvas),
  { ssr: false }
);

export function Hero3DSection() {
  const { lang } = useLang();
  const containerRef = useRef<HTMLDivElement>(null);
  const heroViewportRef = useRef<HTMLDivElement>(null);

  // Scroll & Stage State
  const [scrollProgress, setScrollProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const prefersReducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot
  );
  const isMobile = useSyncExternalStore(
    subscribeMobile,
    getMobileSnapshot,
    getMobileServerSnapshot
  );

  // Interactive 3D States (Benchmark B: Planted defects examination)
  const [packet] = useState<'A' | 'B'>('B');
  const [activeDoc, setActiveDoc] = useState<'deed' | 'khatian' | 'nid' | null>(null);
  const [hoveredDoc, setHoveredDoc] = useState<'deed' | 'khatian' | 'nid' | null>(null);
  const [hoveredHotspot, setHoveredHotspot] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [replayCounter, setReplayCounter] = useState(0);

  // 400vh Scroll Pinning with Smooth Progress Interpolation
  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;
      const headerHeight = window.innerWidth >= 768 ? 72 : 60;
      const container = containerRef.current;
      const rect = container.getBoundingClientRect();
      const scrollDistance = container.offsetHeight - (window.innerHeight - headerHeight);
      if (scrollDistance <= 0) return;

      const scrolled = headerHeight - rect.top;
      const progress = Math.max(0, Math.min(1, scrolled / scrollDistance));
      setScrollProgress(progress);

      // Equal 25% stage ratio (0.00-0.25, 0.25-0.50, 0.50-0.75, 0.75-1.00)
      // Exactly synchronized with 3D paper animation transitions
      if (progress < 0.25) setCurrentStep(1);
      else if (progress < 0.50) setCurrentStep(2);
      else if (progress < 0.75) setCurrentStep(3);
      else setCurrentStep(4);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Smooth scroll jump to stage (exact equal 25% ratio centers)
  const scrollToStep = (stepNum: number) => {
    if (!containerRef.current) return;
    const targetPercentages = [0.05, 0.30, 0.55, 0.85];
    const targetP = targetPercentages[stepNum - 1];
    const headerHeight = window.innerWidth >= 768 ? 72 : 60;
    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    const currentScrollY = window.scrollY;
    const containerTop = currentScrollY + rect.top;
    const scrollDistance = container.offsetHeight - (window.innerHeight - headerHeight);
    const targetScrollY = containerTop - headerHeight + scrollDistance * targetP;

    window.scrollTo({
      top: Math.max(0, targetScrollY),
      behavior: 'smooth',
    });
  };

  const steps = [
    {
      num: 1,
      tag: '01 INGESTION',
      tagBn: '০১ গ্রহণ',
      titleEn: 'Triad Ingestion & Normalization',
      titleBn: 'নথিপত্র গ্রহণ ও স্বাভাবিককরণ',
      descEn: 'Physical sheets fan out on the registry desk: Saf Kabala deed, RS Khatian ledger, and National ID card.',
      descBn: 'রেজিস্ট্রি টেবিলে তিনটি মূল দলিল উন্মোচিত হয়: সাফ কবলা দলিল, আরএস খতিয়ান ও জাতীয় পরিচয়পত্র।',
      statusEn: '3 DOCUMENTS MOUNTED • PARITY READY',
      statusBn: '৩টি নথি সংযুক্ত • নিরীক্ষা প্রস্তুত',
      color: 'border-green-mid text-green-mid bg-green-deep/20',
    },
    {
      num: 2,
      tag: '02 EXTRACTION',
      tagBn: '০২ নিষ্কাশন',
      titleEn: 'Multimodal Precision Laser Scan',
      titleBn: 'বহুমাধ্যম সূক্ষ্ম লেজার স্ক্যান',
      descEn: 'A vermillion optical scan sweeps the sheets, indexing Dag numbers, Khatians, timestamps, and NID digits.',
      descBn: 'অপটিক্যাল লেজার স্ক্যান দলিলের ওপর দিয়ে চলে দাগ নম্বর, খতিয়ান এবং এনআইডি চিহ্নিত করে।',
      statusEn: packet === 'B' ? 'TAGGED: DAG 412, KHATIAN 1087, 9-DIGIT NID' : 'TAGGED: DAG 412, KHATIAN 1087, 10-DIGIT NID',
      statusBn: packet === 'B' ? 'চিহ্নিত: দাগ ৪১২, খতিয়ান ১০৮৭, ৯-সংখ্যা এনআইডি' : 'চিহ্নিত: দাগ ৪১২, খতিয়ান ১০৮৭, ১০-সংখ্যা এনআইডি',
      color: 'border-brass text-brass bg-brass/15',
    },
    {
      num: 3,
      tag: '03 CROSS-AUDIT',
      tagBn: '০৩ আন্তঃনিরীক্ষা',
      titleEn: 'Deterministic Cross-Document Audit',
      titleBn: 'নির্ণায়ক আন্তঃনথি পরীক্ষা',
      descEn:
        packet === 'B'
          ? 'Entity alignment vector flagged: Deed Dag 412 contradicts Khatian Dag 421 under Rule FR-3.1.'
          : 'Exact entity alignment: Deed Dag 412 matches Khatian Dag 412 with zero statutory defects.',
      descBn:
        packet === 'B'
          ? 'আইনি অসঙ্গতি সনাক্ত: দলিলের দাগ ৪১২ এবং খতিয়ানের দাগ ৪২১ মেলে না (FR-3.1)।'
          : 'সঠিক মিল: দলিলের দাগ ৪১২ এবং খতিয়ানের দাগ ৪১২ সম্পূর্ণ অভিন্ন।',
      statusEn: packet === 'B' ? 'CRITICAL DEFECT: DAG 412 ≠ DAG 421' : 'ALL GREEN: PERFECT PARITY',
      statusBn: packet === 'B' ? 'গুরুতর ত্রুটি: দাগ ৪১২ ≠ দাগ ৪২১' : 'সম্পূর্ণ নির্ভুল: পূর্ণ সাদৃশ্য',
      color: packet === 'B' ? 'border-vermillion text-vermillion bg-vermillion/15' : 'border-flag-green text-flag-green bg-flag-green/15',
    },
    {
      num: 4,
      tag: '04 VERDICT',
      tagBn: '০৪ রায়',
      titleEn: 'Statutory Attestation & Seal',
      titleBn: 'সংবিধিবদ্ধ সিদ্ধান্ত ও সিলমোহর',
      descEn:
        packet === 'B'
          ? 'Heavy brass seal descends with physical impact: Attestation memo records 2 RED + 1 AMBER defects.'
          : 'Heavy brass seal compresses: Attestation memo records ALL GREEN compliance across all statutes.',
      descBn:
        packet === 'B'
          ? 'পিতলের সিলমোহর বসে: যাচাই স্মারকে ২টি লাল এবং ১টি অ্যাম্বার ত্রুটি লিপিবদ্ধ হয়।'
          : 'পিতলের সিলমোহর বসে: সকল সংবিধিবদ্ধ ধারায় সম্পূর্ণ অনুমোদন লিপিবদ্ধ হয়।',
      statusEn: packet === 'B' ? 'VERDICT: FLAGGED (2 RED + 1 AMBER)' : 'VERDICT: VERIFIED (ALL GREEN)',
      statusBn: packet === 'B' ? 'সিদ্ধান্ত: ত্রুটি চিহ্নিত (২ লাল + ১ অ্যাম্বার)' : 'সিদ্ধান্ত: অনুমোদিত (সবুজ)',
      color: packet === 'B' ? 'border-vermillion text-vermillion bg-vermillion/15' : 'border-flag-green text-flag-green bg-flag-green/15',
    },
  ];

  const docNames = {
    deed: { en: 'Saf Kabala Deed (সাফ কবলা দলিল)', tag: 'Click to inspect fields' },
    khatian: { en: 'RS Khatian Record (আরএস খতিয়ান স্বত্বলিপি)', tag: 'Click to inspect fields' },
    nid: { en: 'National ID Smart Card (জাতীয় পরিচয়পত্র)', tag: 'Click to inspect fields' },
  };

  return (
    <div ref={containerRef} className="relative h-[400vh] bg-desk-dark text-paper">
      {/* Pinned Full Viewport Stage (100svh under header) */}
      <div
        ref={heroViewportRef}
        className="sticky top-[60px] md:top-[72px] h-[calc(100svh-60px)] md:h-[calc(100svh-72px)] w-full overflow-hidden select-none"
      >
        {/* Scoped 3D Reticle Cursor */}
        <Reticle3DCursor
          containerRef={heroViewportRef}
          hoveredObject={hoveredDoc ? 'document' : hoveredHotspot ? 'hotspot' : null}
        />

        {/* ── 1. BACKGROUND 3D SCENE (FILLS ENTIRE VIEWPORT) ────────── */}
        <div className="absolute inset-0 w-full h-full z-0">
          {prefersReducedMotion ? (
            <ReducedMotionFallback currentStep={currentStep} packet={packet} />
          ) : (
            <RegistryDeskCanvas
              scrollProgress={scrollProgress}
              packet={packet}
              activeDoc={activeDoc}
              setActiveDoc={setActiveDoc}
              hoveredDoc={hoveredDoc}
              setHoveredDoc={setHoveredDoc}
              hoveredHotspot={hoveredHotspot}
              setHoveredHotspot={setHoveredHotspot}
              soundEnabled={soundEnabled}
              isMobile={isMobile}
              replayTrigger={replayCounter}
            />
          )}
        </div>

        {/* ── 2. HOVER DOCUMENT BADGE & HOTSPOT TOOLTIPS ─────────────── */}
        {hoveredDoc && !activeDoc && (
          <div className="absolute top-6 right-6 z-30 pointer-events-none animate-in fade-in duration-200">
            <div className="px-3.5 py-1.5 rounded-xs bg-desk-mid/90 backdrop-blur-md border border-brass/60 shadow-xl flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-brass animate-pulse" />
              <span className="font-heading text-xs font-semibold text-paper-light">
                {docNames[hoveredDoc].en}
              </span>
              <span className="text-[10px] font-mono text-brass-light border-l border-border/40 pl-2">
                Click to inspect
              </span>
            </div>
          </div>
        )}

        {hoveredHotspot && (
          <div className="absolute top-16 right-6 z-30 pointer-events-none animate-in fade-in duration-150">
            <div className="px-3.5 py-1.5 rounded-xs bg-desk-dark/95 border border-vermillion/70 shadow-2xl flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-vermillion animate-ping" />
              <span className="font-mono text-xs font-bold text-vermillion-light">
                {hoveredHotspot}
              </span>
            </div>
          </div>
        )}

        {/* ── 3. OVERLAID HERO UI (LEFT TEXT COLUMN & BOTTOM-LEFT PROGRESS) ── */}
        <div className="absolute inset-0 z-20 pointer-events-none flex flex-col justify-between p-6 sm:p-8 lg:p-12">
          <div className="max-w-[1280px] mx-auto w-full h-full flex flex-col justify-between">

            {/* TOP-LEFT TEXT COLUMN */}
            <div className="pointer-events-auto max-w-md lg:max-w-xl flex flex-col gap-3.5">
              {/* Official Registry Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xs bg-desk-mid/80 backdrop-blur-md border border-brass/40 text-brass-light text-[11px] font-mono uppercase tracking-wider w-fit shadow-md">
                <span className="w-1.5 h-1.5 rounded-full bg-brass animate-pulse" />
                <span>Government Registry Standard</span>
                <span className="text-brass/50">•</span>
                <span className="text-paper-dark">Team Boron</span>
              </div>

              {/* Main Transparent Gradient Headline */}
              <div>
                <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.08] drop-shadow-[0_2px_16px_rgba(212,180,131,0.25)]">
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-paper-light via-paper to-brass-light/90">
                    Nothi AI
                  </span>
                  <span className="font-bangla font-normal text-3xl sm:text-4xl lg:text-5xl ml-2.5 align-baseline text-transparent bg-clip-text bg-gradient-to-r from-brass-light to-brass">
                    নথি এআই
                  </span>
                </h1>
                <p className="mt-2 text-sm sm:text-base text-paper-dark font-sans leading-snug max-w-sm sm:max-w-md">
                  {lang === 'bn'
                    ? 'দলিল, খতিয়ান ও এনআইডির সংবিধিবদ্ধ আইনি যাচাই।'
                    : 'Statutory deed, Khatian, and NID vetting for Bangladesh.'}
                </p>
              </div>

              {/* Interactive Controls Bar: Rearranged matching pill buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                {/* Primary Chat CTA Button */}
                <Link
                  href="/chat"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-brass text-desk-dark hover:bg-brass-light font-sans text-xs sm:text-sm font-bold tracking-wide transition-all shadow-lg hover:shadow-brass/25 active:scale-95 cursor-pointer"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  <span>{lang === 'bn' ? 'নথি এআই চ্যাটে যান' : 'Chat with Nothi AI'}</span>
                  <span className="text-base leading-none">→</span>
                </Link>

                {/* Secondary Explore Plans Link */}
                <Link
                  href="#pricing"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-paper/30 hover:border-paper bg-desk-mid/70 hover:bg-desk-mid text-paper font-sans text-xs sm:text-sm font-semibold transition-all shadow-md hover:-translate-y-0.5 active:scale-95 cursor-pointer"
                >
                  <span>{lang === 'bn' ? 'প্ল্যান দেখুন' : 'Explore Plans'}</span>
                </Link>

                {/* Sound FX Toggle */}
                <button
                  type="button"
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border font-sans text-xs transition-all shadow-sm cursor-pointer ${soundEnabled
                    ? 'border-brass bg-brass/20 text-brass-light'
                    : 'border-border/40 hover:border-brass/60 bg-desk-mid/70 text-paper-dark hover:text-paper'
                    }`}
                  title={soundEnabled ? 'Mute Registry Sound FX' : 'Enable Registry Sound FX (Stamp thud & scan)'}
                >
                  <span>{soundEnabled ? '🔊 Sound On' : '🔇 Sound Off'}</span>
                </button>
              </div>
            </div>

            {/* BOTTOM-LEFT SLIM FLOATING STAGE PROGRESS PANEL */}
            <div className="pointer-events-auto max-w-lg lg:max-w-xl w-full bg-desk-dark/90 backdrop-blur-md border border-brass/40 p-4 rounded-xs shadow-2xl transition-all duration-200 mb-2">
              {/* Step Progress Line (1 to 4 with fill) */}
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-1.5 flex-1">
                  {[1, 2, 3, 4].map((stepIdx) => {
                    const stepStart = (stepIdx - 1) * 0.25;
                    const stepEnd = stepIdx * 0.25;
                    const fillRatio = Math.max(0, Math.min(1, (scrollProgress - stepStart) / 0.25));
                    const isCompleted = scrollProgress >= stepEnd;
                    const isActive = currentStep === stepIdx;

                    return (
                      <button
                        key={stepIdx}
                        type="button"
                        onClick={() => scrollToStep(stepIdx)}
                        className="group flex-1 flex flex-col gap-1 cursor-pointer text-left focus:outline-hidden"
                      >
                        <div className="h-1.5 rounded-full bg-desk-mid overflow-hidden relative">
                          <div
                            className={`h-full rounded-full transition-all duration-150 ${
                              isActive
                                ? 'bg-brass shadow-[0_0_8px_rgba(212,180,131,0.8)]'
                                : isCompleted
                                ? 'bg-brass/70'
                                : 'bg-transparent'
                            }`}
                            style={{
                              width: isCompleted ? '100%' : isActive ? `${Math.max(10, fillRatio * 100)}%` : '0%',
                            }}
                          />
                        </div>
                        <span
                          className={`text-[10px] font-mono transition-colors ${
                            isActive
                              ? 'text-brass font-bold'
                              : isCompleted
                              ? 'text-paper-dark'
                              : 'text-desk-light'
                          }`}
                        >
                          0{stepIdx}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Stage 04 Replay Button */}
                {currentStep === 4 && (
                  <button
                    type="button"
                    onClick={() => {
                      setReplayCounter((c) => c + 1);
                      scrollToStep(4);
                    }}
                    className="px-2 py-0.5 rounded-xs border border-brass/60 text-brass-light hover:bg-brass/20 text-[10px] font-mono font-bold uppercase cursor-pointer transition-colors"
                    title="Replay Verdict Stamp Animation"
                  >
                    ↻ Replay Stamp
                  </button>
                )}
              </div>

              {/* Active Stage Header & Diagnostic Badge */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-desk-mid pb-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-xs bg-brass text-desk-dark font-mono font-bold text-xs flex items-center justify-center">
                    0{currentStep}
                  </span>
                  <h2 className="font-heading text-sm sm:text-base font-bold text-paper-light">
                    {lang === 'bn' ? steps[currentStep - 1].titleBn : steps[currentStep - 1].titleEn}
                  </h2>
                </div>

                <div
                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-xs border font-mono text-[10px] font-bold uppercase tracking-wider shrink-0 ${steps[currentStep - 1].color
                    }`}
                >
                  <span>●</span>
                  <span>
                    {lang === 'bn'
                      ? steps[currentStep - 1].statusBn
                      : steps[currentStep - 1].statusEn}
                  </span>
                </div>
              </div>

              {/* Stage Narrative Description */}
              <p className="text-xs sm:text-sm font-sans text-paper-dark leading-relaxed">
                {lang === 'bn'
                  ? steps[currentStep - 1].descBn
                  : steps[currentStep - 1].descEn}
              </p>
            </div>

          </div>
        </div>

        {/* ── 4. CLOSE-UP DOCUMENT FIELD INSPECTOR DRAWER ───────────── */}
        <DocumentInspectorCard
          activeDoc={activeDoc}
          packet={packet}
          onClose={() => setActiveDoc(null)}
        />
      </div>
    </div>
  );
}
