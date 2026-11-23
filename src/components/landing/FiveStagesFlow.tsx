'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useLang } from '@/lib/lang';
import { playScanChime } from '@/lib/audio';

export interface PipelineStage {
  num: string;
  titleEn: string;
  titleBn: string;
  descEn: string;
  descBn: string;
  srsRule: string;
}

interface FiveStagesFlowProps {
  stages: PipelineStage[];
}

// Exact mathematical node arc-length ratios along the curve: 0%, 25%, 50%, 75%, 100%
const NODE_RATIOS = [0.0, 0.25, 0.5, 0.75, 1.0];

export function FiveStagesFlow({ stages }: FiveStagesFlowProps) {
  const { lang } = useLang();
  const containerRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const mobilePathRef = useRef<SVGPathElement>(null);

  // Smooth damped progress state (0.0 to 1.0)
  const targetProgress = useRef(0);
  const smoothProgress = useRef(0);
  const [progress, setProgress] = useState(0);

  // Path arc lengths & live tracer coordinates
  const [pathLength, setPathLength] = useState(1572.75);
  const [tracerPos, setTracerPos] = useState({ x: 110, y: 130 });
  const [mobilePathLength, setMobilePathLength] = useState(1442.4);
  const [mobileTracerPos, setMobileTracerPos] = useState({ x: 65, y: 90 });

  // Currently active stage index (0 to 4)
  const [activeStageIndex, setActiveStageIndex] = useState(0);
  const lastChimeStage = useRef(0);

  // Guided Tour (Autoplay) State
  const [isPlayingTour, setIsPlayingTour] = useState(false);
  const tourRaf = useRef<number | null>(null);

  // Measure SVG path lengths on mount
  useEffect(() => {
    if (pathRef.current) {
      setPathLength(pathRef.current.getTotalLength());
    }
    if (mobilePathRef.current) {
      setMobilePathLength(mobilePathRef.current.getTotalLength());
    }
  }, []);

  // Continuous scroll listener with smooth damping (RAF exponential decay)
  useEffect(() => {
    const handleScroll = () => {
      // Pause guided tour on manual user scroll
      if (isPlayingTour) {
        setIsPlayingTour(false);
        if (tourRaf.current) cancelAnimationFrame(tourRaf.current);
      }

      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const totalScrollable = containerRef.current.offsetHeight - window.innerHeight;
      if (totalScrollable <= 0) return;

      const currentScroll = -rect.top;
      const rawP = Math.max(0, Math.min(1, currentScroll / totalScrollable));
      targetProgress.current = rawP;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    let rafId: number;
    let lastTime = performance.now();

    const updateMotion = (now: number) => {
      const dt = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;

      const diff = targetProgress.current - smoothProgress.current;
      if (Math.abs(diff) > 0.0001) {
        // High-fidelity liquid damping: responsive (rate ~14) without overshoot
        const step = diff * (1 - Math.exp(-14 * dt));
        smoothProgress.current += Math.abs(diff) < 0.002 ? diff : step;
        const currentP = Math.max(0, Math.min(1, smoothProgress.current));
        setProgress(currentP);

        // Update Desktop tracer jewel coordinates along SVG curve
        if (pathRef.current && pathLength > 0) {
          const pt = pathRef.current.getPointAtLength(currentP * pathLength);
          setTracerPos({ x: pt.x, y: pt.y });
        }

        // Update Mobile tracer jewel coordinates along SVG curve
        if (mobilePathRef.current && mobilePathLength > 0) {
          const pt = mobilePathRef.current.getPointAtLength(currentP * mobilePathLength);
          setMobileTracerPos({ x: pt.x, y: pt.y });
        }

        // Mathematically accurate stage timing (with sub-pixel halo threshold)
        let newStage = 0;
        if (currentP >= 0.96) newStage = 4;
        else if (currentP >= 0.745) newStage = 3;
        else if (currentP >= 0.495) newStage = 2;
        else if (currentP >= 0.245) newStage = 1;
        else newStage = 0;

        setActiveStageIndex(newStage);

        // Trigger subtle audio chime when crossing milestones
        if (newStage !== lastChimeStage.current) {
          lastChimeStage.current = newStage;
          try {
            playScanChime(true);
          } catch {
            // Audio permission safeguard
          }
        }
      }
      rafId = requestAnimationFrame(updateMotion);
    };

    rafId = requestAnimationFrame(updateMotion);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      cancelAnimationFrame(rafId);
    };
  }, [pathLength, mobilePathLength, isPlayingTour]);

  // Jump to specific milestone (scrolls smoothly to exact node ratio)
  const scrollToStage = useCallback((idx: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const scrollTop = window.scrollY + rect.top;
    const totalScrollable = containerRef.current.offsetHeight - window.innerHeight;
    const targetY = scrollTop + NODE_RATIOS[idx] * totalScrollable;
    window.scrollTo({ top: targetY, behavior: 'smooth' });
  }, []);

  // Cinematic Guided Tour: glides between milestones and pauses briefly at each stage
  const toggleGuidedTour = () => {
    if (isPlayingTour) {
      setIsPlayingTour(false);
      if (tourRaf.current) cancelAnimationFrame(tourRaf.current);
      return;
    }

    if (!containerRef.current) return;
    setIsPlayingTour(true);

    const rect = containerRef.current.getBoundingClientRect();
    const scrollTop = window.scrollY + rect.top;
    const totalScrollable = containerRef.current.offsetHeight - window.innerHeight;

    const milestones = [0.0, 0.25, 0.5, 0.75, 1.0];
    let currentIndex = 0;
    // Find next milestone ahead of current progress
    for (let i = 0; i < milestones.length; i++) {
      if (progress < milestones[i] - 0.04) {
        currentIndex = i;
        break;
      }
    }
    if (currentIndex === 0 && progress >= 0.96) {
      currentIndex = 0;
    }

    const dwellDuration = 900; // ms dwell at each milestone to read card & enjoy highlight
    const travelDuration = 2200; // ms smooth glide between nodes

    let legStartTime = performance.now();
    let startP = progress >= 0.96 ? 0 : progress;
    let targetP = milestones[currentIndex];
    let isDwelling = false;
    let dwellStartTime = 0;

    const stepTour = (now: number) => {
      if (!isDwelling) {
        const elapsed = now - legStartTime;
        const t = Math.min(1, elapsed / travelDuration);
        // Smooth sine ease
        const ease = 0.5 - Math.cos(t * Math.PI) / 2;
        const currentPos = startP + (targetP - startP) * ease;
        const targetScrollY = scrollTop + currentPos * totalScrollable;
        window.scrollTo({ top: targetScrollY, behavior: 'instant' });

        if (t >= 1) {
          isDwelling = true;
          dwellStartTime = now;
        }
      } else {
        if (now - dwellStartTime >= dwellDuration) {
          currentIndex++;
          if (currentIndex >= milestones.length) {
            setIsPlayingTour(false);
            return;
          }
          startP = targetP;
          targetP = milestones[currentIndex];
          isDwelling = false;
          legStartTime = now;
        }
      }

      tourRaf.current = requestAnimationFrame(stepTour);
    };

    tourRaf.current = requestAnimationFrame(stepTour);
  };

  // Serpentine Curve Paths (Calculated for exact 25% arc-length intervals)
  const desktopCurvePath =
    'M 110 130 C 230 130, 235 410, 355 410 C 475 410, 480 130, 600 130 C 720 130, 725 410, 845 410 C 965 410, 970 130, 1090 130';

  const mobileCurvePath =
    'M 65 90 C 65 200, 325 200, 325 310 C 325 420, 65 420, 65 530 C 65 640, 325 640, 325 750 C 325 860, 65 860, 65 970';

  // Desktop Node Positions (Geometry matches SVG curve coordinates)
  const desktopNodes = [
    {
      x: 110,
      y: 130,
      isTop: true,
      cardLeft: 20,
      cardTop: 195,
      icon: '📄',
      srs: 'FR-1.1',
      pill: 'Deed Normalization',
      liveStat: 'Deed + RS Khatian + NID (15 MB Max)',
    },
    {
      x: 355,
      y: 410,
      isTop: false,
      cardLeft: 245,
      cardTop: 155,
      icon: '🔍',
      srs: 'FR-2.1',
      pill: 'Entity Extraction',
      liveStat: 'Extracted: Dag 412, Khatian 1087, NID 9-digit',
    },
    {
      x: 600,
      y: 130,
      isTop: true,
      cardLeft: 490,
      cardTop: 195,
      icon: '⚖️',
      srs: 'FR-3.1',
      pill: 'Dag 412 Parity',
      liveStat: 'Flagged: Dag 412 ≠ Dag 421 Mismatch',
    },
    {
      x: 845,
      y: 410,
      isTop: false,
      cardLeft: 735,
      cardTop: 155,
      icon: '📜',
      srs: 'FR-4.1',
      pill: 'Corpus Filter',
      liveStat: 'Grounded: 28 Verified Statutory Sections',
    },
    {
      x: 1090,
      y: 130,
      isTop: true,
      cardLeft: 960,
      cardTop: 195,
      icon: '🖥️',
      srs: 'FR-5.1',
      pill: 'Attestation Memo',
      liveStat: 'Dual-Pane Comparison Workspace Ready',
    },
  ];

  return (
    <div
      ref={containerRef}
      className="relative min-h-[280vh] bg-paper text-ink select-none"
    >
      {/* ── STICKY PINNED WORKSPACE VIEWPORT ── */}
      <div className="sticky top-0 h-screen w-full flex flex-col justify-between py-8 sm:py-12 px-4 sm:px-8 lg:px-12 overflow-hidden">

        {/* ── 1. SECTION HEADER: TITLE & GUIDED CONTROLS ── */}
        <div className="max-w-[1280px] mx-auto w-full border-b border-border-light pb-3.5 z-20">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-green-mid">
                <span className="w-2 h-2 rounded-full bg-flag-green animate-pulse" />
                <span>Deterministic Sequential Architecture</span>
              </div>
              <h2 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-bold text-green-deep tracking-tight mt-0.5">
                {lang === 'bn' ? 'পাঁচটি স্তরের সংবিধিবদ্ধ নিরীক্ষা' : 'Five Stages of Registry Examination'}
              </h2>
            </div>

            {/* Interactive Mode Controls: Guided Tour & Live Progress Stepper */}
            <div className="flex items-center gap-3 self-start sm:self-auto">
              {/* Guided Tour Play/Pause Button */}
              <button
                type="button"
                onClick={toggleGuidedTour}
                className={`px-3 py-1.5 rounded-xs font-mono text-xs font-semibold flex items-center gap-2 border transition-all cursor-pointer shadow-xs active:scale-95 ${
                  isPlayingTour
                    ? 'border-brass bg-brass text-desk-dark shadow-md ring-2 ring-brass/40'
                    : 'border-border-dark/30 bg-paper-dark hover:border-green-deep text-ink'
                }`}
                title={isPlayingTour ? 'Pause guided walkthrough' : 'Watch guided walkthrough across the 5 stages'}
              >
                <span className={isPlayingTour ? 'animate-pulse text-desk-dark' : 'text-green-deep'}>
                  {isPlayingTour ? '⏸' : '▶'}
                </span>
                <span>{isPlayingTour ? 'Playing Tour' : 'Guided Tour'}</span>
              </button>

              {/* 5-Stage Segmented Progress Ribbon with Exact 25% Ratios */}
              <div className="flex items-center gap-2.5 font-mono text-xs bg-paper-dark/80 px-3 py-1.5 rounded-xs border border-border-light shadow-2xs">
                <span className="text-[11px] font-bold text-green-deep shrink-0">
                  Stage 0{activeStageIndex + 1}/05
                </span>
                <div className="flex items-center gap-1">
                  {[0, 1, 2, 3].map((segIdx) => {
                    const segStart = segIdx * 0.25;
                    const segEnd = (segIdx + 1) * 0.25;
                    const segFill = Math.max(0, Math.min(1, (progress - segStart) / 0.25));
                    const isDone = progress >= segEnd;
                    const isCurrent = activeStageIndex === segIdx;

                    return (
                      <div
                        key={segIdx}
                        className="w-7 sm:w-8 h-1.5 rounded-full bg-border-light/80 overflow-hidden relative cursor-pointer group"
                        onClick={() => scrollToStage(segIdx + 1)}
                        title={`Go to Stage 0${segIdx + 2}`}
                      >
                        <div
                          className={`h-full transition-all duration-100 ${
                            isDone
                              ? 'bg-green-deep'
                              : isCurrent
                              ? 'bg-gradient-to-r from-green-deep to-brass'
                              : 'bg-transparent'
                          }`}
                          style={{
                            width: isDone ? '100%' : isCurrent ? `${Math.max(10, segFill * 100)}%` : '0%',
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
                <span className="text-[10px] text-ink-muted ml-0.5 w-7 text-right">
                  {Math.round(progress * 100)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── 2. DESKTOP SERPENTINE ROADMAP CANVAS (>= 1024px) ── */}
        <div className="hidden lg:block relative max-w-[1280px] mx-auto w-full flex-1 my-auto h-[570px] z-10">

          {/* SVG Canvas for Curve, Grid & Kinetic Beam Effects */}
          <svg
            viewBox="0 0 1200 570"
            className="w-full h-full absolute inset-0 pointer-events-none"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              {/* Fine Ledger Drafting Grid */}
              <pattern id="serpentineGrid" width="32" height="32" patternUnits="userSpaceOnUse">
                <path d="M 32 0 L 0 0 0 32" fill="none" stroke="rgba(27, 67, 50, 0.04)" strokeWidth="1" />
              </pattern>

              {/* Laser Ink Gradient: Deep Emerald -> Forest -> Rich Brass -> Vermillion */}
              <linearGradient id="creativeBeamGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#1b4332" />
                <stop offset="30%" stopColor="#2d6a4f" />
                <stop offset="70%" stopColor="#b08d57" />
                <stop offset="100%" stopColor="#e8534a" />
              </linearGradient>

              {/* Kinetic Energy Sparkle Trail travelling along the active ink line */}
              <linearGradient id="sparklePulse" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
                <stop offset="50%" stopColor="#ffebad" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
              </linearGradient>

              {/* Physical Glow Diffusion Filter */}
              <filter id="physicalBeamGlow" x="-25%" y="-25%" width="150%" height="150%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="glow1" />
                <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="glow2" />
                <feMerge>
                  <feMergeNode in="glow2" />
                  <feMergeNode in="glow1" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Architectural Ledger Grid Background */}
            <rect width="1200" height="570" fill="url(#serpentineGrid)" opacity="0.85" />

            {/* Underlying Dashed Guideline (Future unreached route) */}
            <path
              d={desktopCurvePath}
              fill="none"
              stroke="#d5cebe"
              strokeWidth="2.5"
              strokeDasharray="8 8"
              opacity="0.85"
            />

            {/* Active Drawing Glowing Serpentine Line (100% Mathematically Synchronized) */}
            <path
              ref={pathRef}
              d={desktopCurvePath}
              fill="none"
              stroke="url(#creativeBeamGrad)"
              strokeWidth="4.5"
              strokeLinecap="round"
              strokeDasharray={pathLength}
              strokeDashoffset={pathLength * (1 - progress)}
              filter="url(#physicalBeamGlow)"
            />

            {/* Kinetic Secondary Energy Pulse (Living Electric Ink Trail) */}
            {progress > 0.02 && (
              <path
                d={desktopCurvePath}
                fill="none"
                stroke="url(#sparklePulse)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray="16 48"
                strokeDashoffset={pathLength * (1 - progress) - progress * 320}
                opacity="0.85"
              />
            )}

            {/* Radiant Leading Jewel Tracer travelling along the curve tip */}
            <g transform={`translate(${tracerPos.x}, ${tracerPos.y})`}>
              {/* Outer pulsing radial halo */}
              <circle r="18" fill="#b08d57" opacity="0.30" className="animate-ping" />
              <circle r="11" fill="#2d6a4f" opacity="0.65" />
              <circle r="5" fill="#fcfaf7" stroke="#1b4332" strokeWidth="2" />
              {/* Precision Crosshair Core */}
              <line x1="-3" y1="0" x2="3" y2="0" stroke="#b08d57" strokeWidth="1" />
              <line x1="0" y1="-3" x2="0" y2="3" stroke="#b08d57" strokeWidth="1" />
            </g>
          </svg>

          {/* ── 5 NUMBERED MILESTONE NODES & SATELLITE PILLS ── */}
          {stages.map((stage, idx) => {
            const node = desktopNodes[idx];
            const nodeRatio = NODE_RATIOS[idx];
            // Exactly reached when progress crosses node ratio
            const isReached = idx === 0 || progress >= (idx === 4 ? 0.96 : nodeRatio - 0.005);
            const isCurrentlyActive = activeStageIndex === idx;

            return (
              <div key={stage.num} className="absolute inset-0 pointer-events-none">

                {/* 1. Milestone Concentric Disc on Curve */}
                <div
                  style={{
                    left: `${(node.x / 1200) * 100}%`,
                    top: `${(node.y / 570) * 100}%`,
                  }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-auto cursor-pointer"
                  onClick={() => scrollToStage(idx)}
                >
                  <div className="relative flex items-center justify-center group">

                    {/* Radar Pulse Wave on Active Stage */}
                    {isCurrentlyActive && (
                      <span className="absolute -inset-2.5 rounded-full border-2 border-brass animate-ping opacity-65" />
                    )}

                    {/* Concentric Disc with 3D Bevel & Drop Shadow */}
                    <div
                      className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 transform group-hover:scale-105 ${
                        isCurrentlyActive
                          ? 'bg-paper shadow-[0_4px_24px_rgba(27,67,50,0.35),0_0_24px_rgba(176,141,87,0.45)] ring-2 ring-brass'
                          : isReached
                          ? 'bg-paper shadow-md ring-1 ring-green-mid'
                          : 'bg-paper-dark/90 shadow-xs border border-border group-hover:border-brass'
                      }`}
                    >
                      {/* Inner Circular Core */}
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-serif text-base font-bold transition-all duration-300 ${
                          isCurrentlyActive
                            ? 'bg-green-deep text-paper shadow-inner ring-2 ring-brass/40'
                            : isReached
                            ? 'bg-green-mid text-paper'
                            : 'bg-paper text-ink-muted group-hover:text-ink'
                        }`}
                      >
                        {isReached && !isCurrentlyActive ? '✓' : stage.num}
                      </div>
                    </div>

                    {/* Satellite Badges (Direct Reference from User Video) */}
                    <div className="absolute left-14 flex items-center gap-1.5 whitespace-nowrap pl-1">
                      {/* Document Icon Pill */}
                      <span
                        className={`px-2 py-0.5 rounded-[3px] text-xs transition-all duration-200 border shadow-2xs ${
                          isCurrentlyActive
                            ? 'bg-paper border-brass text-ink font-bold shadow-xs'
                            : isReached
                            ? 'bg-paper/90 border-border text-ink-muted'
                            : 'bg-paper-dark/70 border-border/40 text-ink-muted/50'
                        }`}
                      >
                        {node.icon}
                      </span>

                      {/* SRS Rule Code Pill */}
                      <span
                        className={`px-2 py-0.5 rounded-[3px] font-mono text-[10px] font-bold transition-all duration-200 border shadow-2xs ${
                          isCurrentlyActive
                            ? 'bg-green-deep text-paper border-green-deep shadow-xs'
                            : isReached
                            ? 'bg-paper border-green-mid/40 text-green-deep'
                            : 'bg-paper-dark/70 border-border/40 text-ink-muted/50'
                        }`}
                      >
                        {node.srs}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Directional Connector Arrow pointing from Node to Card */}
                <div
                  style={{
                    left: `${(node.x / 1200) * 100}%`,
                    top: node.isTop
                      ? `${((node.y + 36) / 570) * 100}%`
                      : `${((node.y - 48) / 570) * 100}%`,
                  }}
                  className={`absolute -translate-x-1/2 pointer-events-none transition-all duration-300 ${
                    isCurrentlyActive
                      ? 'opacity-100 scale-110 text-brass drop-shadow-[0_0_8px_rgba(176,141,87,0.7)]'
                      : isReached
                      ? 'opacity-80 scale-100 text-green-mid'
                      : 'opacity-25 scale-90 text-ink-muted'
                  }`}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    {node.isTop ? (
                      <path d="M12 4 L12 18 M6 13 L12 19 L18 13" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                    ) : (
                      <path d="M12 20 L12 6 M6 11 L12 5 L18 11" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                    )}
                  </svg>
                </div>

                {/* 3. Stage Content Card with Marker Sweep Animation */}
                <div
                  style={{
                    left: `${(node.cardLeft / 1200) * 100}%`,
                    top: `${(node.cardTop / 570) * 100}%`,
                    width: '224px',
                  }}
                  className={`absolute p-4 rounded-xs border transition-all duration-300 pointer-events-auto bg-paper-light cursor-pointer group ${
                    isCurrentlyActive
                      ? 'border-brass shadow-[0_8px_30px_rgba(27,67,50,0.14),0_0_24px_rgba(176,141,87,0.22)] -translate-y-2 ring-1 ring-brass/50 z-30'
                      : isReached
                      ? 'border-border shadow-xs hover:border-green-mid/50 hover:-translate-y-1 z-20'
                      : 'border-border/50 opacity-60 hover:opacity-90 z-10'
                  }`}
                  onClick={() => scrollToStage(idx)}
                >
                  {/* Glowing Top Accent on Active Card */}
                  {isCurrentlyActive && (
                    <div className="absolute top-0 inset-x-0 h-[3px] bg-gradient-to-r from-green-deep via-green-mid to-brass" />
                  )}

                  {/* Fluorescent Highlighter Marker Tape (Direct Reference to Video) */}
                  <div className="mb-2.5">
                    <div className="relative inline-block my-0.5">
                      {/* Physical Marker Tape Layer with Sweep Animation & Tilt */}
                      <div
                        className={`absolute -inset-x-2 -inset-y-0.5 rounded-[2px] transition-all duration-500 ease-out origin-left transform -rotate-1 shadow-[0_2px_8px_rgba(245,158,11,0.28)] ${
                          isCurrentlyActive
                            ? 'w-[calc(100%+16px)] bg-[#fde047] opacity-100'
                            : 'w-0 opacity-0'
                        }`}
                      />
                      <span
                        className={`relative z-10 block font-heading font-bold text-sm tracking-tight transition-colors duration-300 drop-shadow-2xs ${
                          isCurrentlyActive
                            ? 'text-ink'
                            : isReached
                            ? 'text-green-deep'
                            : 'text-ink-muted/80'
                        }`}
                      >
                        {lang === 'bn' ? stage.titleBn : stage.titleEn}
                      </span>
                    </div>
                  </div>

                  {/* Stage Narrative Description */}
                  <p className="text-xs text-ink-muted font-sans leading-relaxed line-clamp-3 mb-2">
                    {lang === 'bn' ? stage.descBn : stage.descEn}
                  </p>

                  {/* Live Diagnostic Stat Pill */}
                  <div className="text-[10px] font-mono font-medium text-green-mid/90 pt-1 border-t border-border/40">
                    {node.liveStat}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── 3. MOBILE SERPENTINE ROADMAP (< 1024px) ── */}
        <div className="lg:hidden relative w-full flex-1 my-auto min-h-[460px] py-4">
          <svg
            viewBox="0 0 390 1060"
            className="w-full h-full absolute inset-0 pointer-events-none"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <linearGradient id="mobileLaserGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#1b4332" />
                <stop offset="50%" stopColor="#2d6a4f" />
                <stop offset="100%" stopColor="#b08d57" />
              </linearGradient>
            </defs>

            {/* Dashed baseline track */}
            <path d={mobileCurvePath} fill="none" stroke="#d5cebe" strokeWidth="2.5" strokeDasharray="8 8" />

            {/* Glowing active path */}
            <path
              ref={mobilePathRef}
              d={mobileCurvePath}
              fill="none"
              stroke="url(#mobileLaserGrad)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={mobilePathLength}
              strokeDashoffset={mobilePathLength * (1 - progress)}
            />

            {/* Mobile Tracer Orb */}
            <circle cx={mobileTracerPos.x} cy={mobileTracerPos.y} r="6" fill="#b08d57" stroke="#1b4332" strokeWidth="1.5" />
          </svg>

          {/* Mobile Step Cards */}
          <div className="space-y-6 relative z-10 px-2">
            {stages.map((stage, idx) => {
              const nodeRatio = NODE_RATIOS[idx];
              const isPassed = progress >= nodeRatio - 0.02;
              const isCurrentlyActive = activeStageIndex === idx;

              return (
                <div
                  key={stage.num}
                  onClick={() => scrollToStage(idx)}
                  className={`p-4 rounded-xs border transition-all duration-200 bg-paper-light ${
                    isCurrentlyActive
                      ? 'border-brass shadow-lg ring-1 ring-brass/40 -translate-y-0.5'
                      : isPassed
                      ? 'border-border'
                      : 'border-border/50 opacity-70'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-green-deep text-paper font-serif font-bold text-xs flex items-center justify-center">
                        {stage.num}
                      </div>
                      <span className="px-2 py-0.5 rounded-[2px] bg-[#fae8b2] text-ink font-heading font-bold text-xs border border-[#ecd283]">
                        {lang === 'bn' ? stage.titleBn : stage.titleEn}
                      </span>
                    </div>
                    <span className="font-mono text-[10px] text-green-mid font-bold">
                      {stage.srsRule.split(' ')[0]}
                    </span>
                  </div>
                  <p className="text-xs text-ink-muted font-sans leading-relaxed">
                    {lang === 'bn' ? stage.descBn : stage.descEn}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── 4. BOTTOM PERSISTENT LEDGER CONSOLE WITH STEP SELECTORS ── */}
        <div
          className="max-w-[1280px] mx-auto w-full p-3.5 sm:p-4 rounded-xs border border-border-light bg-paper-dark/70 backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-3 z-20 relative overflow-hidden shadow-xs"
        >
          <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-gradient-to-b from-green-deep via-green-mid to-brass" />

          {/* Active Stage Narrative Focus */}
          <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-3 pl-2 flex-1">
            <span className="font-mono text-xs sm:text-sm font-bold text-green-deep shrink-0 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-brass animate-pulse inline-block" />
              STAGE {stages[activeStageIndex].num} FOCUS:
            </span>
            <span className="text-xs sm:text-sm font-sans text-ink leading-relaxed">
              {lang === 'bn' ? stages[activeStageIndex].descBn : stages[activeStageIndex].descEn}
            </span>
          </div>

          {/* Direct Stage Click Selector Tabs */}
          <div className="flex items-center gap-1.5 self-start md:self-auto shrink-0 pl-2 md:pl-0">
            {stages.map((stg, i) => (
              <button
                key={stg.num}
                type="button"
                onClick={() => scrollToStage(i)}
                className={`px-2.5 py-1 rounded-[2px] font-mono text-[11px] font-bold transition-all cursor-pointer ${
                  activeStageIndex === i
                    ? 'bg-green-deep text-paper shadow-2xs ring-1 ring-brass/40'
                    : progress >= NODE_RATIOS[i]
                    ? 'bg-paper text-green-mid border border-green-mid/30 hover:border-green-deep'
                    : 'bg-paper-dark text-ink-muted/70 hover:text-ink'
                }`}
                title={`Go to Stage ${stg.num}`}
              >
                0{i + 1}
              </button>
            ))}

            <span className="ml-2 px-2.5 py-1 rounded-xs bg-paper border border-brass/40 font-mono text-xs font-bold text-brass-dark shadow-2xs">
              {stages[activeStageIndex].srsRule}
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
