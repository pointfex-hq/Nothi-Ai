'use client';

import { useEffect, useState, useRef, useSyncExternalStore } from 'react';

const subscribeMounted = () => () => {};
const getMountedSnapshot = () => true;
const getMountedServerSnapshot = () => false;

interface ClickRipple {
  id: number;
  x: number;
  y: number;
  type: string | null;
}

export function CustomCursor() {
  const mounted = useSyncExternalStore(subscribeMounted, getMountedSnapshot, getMountedServerSnapshot);
  const [visible, setVisible] = useState(false);
  const [hoveredType, setHoveredType] = useState<string | null>(null);
  const [isClicking, setIsClicking] = useState(false);
  const [ripples, setRipples] = useState<ClickRipple[]>([]);

  // Positions
  const mousePos = useRef({ x: -100, y: -100 });
  const trailPos = useRef({ x: -100, y: -100 });
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const rafId = useRef<number | null>(null);

  useEffect(() => {
    // Only enable on fine pointer devices (desktop mouse, trackpad)
    const isFinePointer = window.matchMedia('(pointer: fine)').matches;
    const isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!isFinePointer || isReducedMotion) {
      return;
    }

    const onMouseMove = (e: MouseEvent) => {
      mousePos.current = { x: e.clientX, y: e.clientY };
      if (!visible) setVisible(true);

      // Check hovered interactive elements
      const target = e.target as HTMLElement | null;
      if (target) {
        if (target.closest('button') || target.closest('a') || target.closest('[role="button"]') || target.closest('[role="tab"]')) {
          setHoveredType('button');
        } else if (target.closest('input') || target.closest('select') || target.closest('textarea')) {
          setHoveredType('input');
        } else if (
          target.closest('[data-flag-defect="true"]') ||
          target.closest('.bg-vermillion\\/10') ||
          target.closest('.text-vermillion')
        ) {
          setHoveredType('defect');
        } else if (target.closest('canvas') || target.closest('[data-inspect="true"]')) {
          setHoveredType('inspect');
        } else {
          setHoveredType(null);
        }
      }
    };

    const onMouseDown = (e: MouseEvent) => {
      setIsClicking(true);
      const newRipple: ClickRipple = {
        id: Date.now(),
        x: e.clientX,
        y: e.clientY,
        type: hoveredType,
      };
      setRipples((prev) => [...prev.slice(-3), newRipple]);
    };

    const onMouseUp = () => setIsClicking(false);

    const onMouseLeave = () => setVisible(false);
    const onMouseEnter = () => setVisible(true);

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    document.addEventListener('mouseleave', onMouseLeave);
    document.addEventListener('mouseenter', onMouseEnter);

    // Smooth trailing physics loop with sub-pixel interpolation
    const render = () => {
      // Lerp trailing ring (buttery smooth damping)
      const ease = 0.18;
      trailPos.current.x += (mousePos.current.x - trailPos.current.x) * ease;
      trailPos.current.y += (mousePos.current.y - trailPos.current.y) * ease;

      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${mousePos.current.x}px, ${mousePos.current.y}px, 0)`;
      }

      if (ringRef.current) {
        ringRef.current.style.transform = `translate3d(${trailPos.current.x}px, ${trailPos.current.y}px, 0)`;
      }

      rafId.current = requestAnimationFrame(render);
    };

    rafId.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('mouseleave', onMouseLeave);
      document.removeEventListener('mouseenter', onMouseEnter);
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [visible, hoveredType]);

  // Clean up ripples after animation duration
  useEffect(() => {
    if (ripples.length === 0) return;
    const timer = setTimeout(() => {
      setRipples((prev) => prev.filter((r) => Date.now() - r.id < 600));
    }, 600);
    return () => clearTimeout(timer);
  }, [ripples]);

  if (!mounted) return null;

  const isButton = hoveredType === 'button';
  const isDefect = hoveredType === 'defect';
  const isInspect = hoveredType === 'inspect';
  const isInput = hoveredType === 'input';

  return (
    <div
      className={`fixed inset-0 pointer-events-none z-[99999] transition-opacity duration-300 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
      aria-hidden="true"
    >
      {/* ── 1. CLICK STAMP RIPPLES (PHYSICAL NOTARY SEAL EFFECT) ── */}
      {ripples.map((ripple) => (
        <div
          key={ripple.id}
          className="fixed top-0 left-0 pointer-events-none -ml-6 -mt-6 w-12 h-12 rounded-full border-2 border-brass animate-stamp-expand flex items-center justify-center"
          style={{
            transform: `translate3d(${ripple.x}px, ${ripple.y}px, 0)`,
            borderColor: ripple.type === 'defect' ? '#c0392b' : '#b08d57',
            boxShadow: ripple.type === 'defect' ? '0 0 12px rgba(192,57,43,0.4)' : '0 0 12px rgba(176,141,87,0.3)',
          }}
        >
          <div className="w-6 h-6 rounded-full border border-dashed border-current opacity-60" />
        </div>
      ))}

      {/* ── 2. PRECISION CENTER TARGET (INSTANT ZERO-LAG RETICLE) ── */}
      <div
        ref={dotRef}
        className="fixed top-0 left-0 pointer-events-none -ml-2 -mt-2 w-4 h-4 flex items-center justify-center transition-transform duration-0"
      >
        {/* Center Pip */}
        <div
          className={`w-1.5 h-1.5 rounded-full transition-all duration-150 ${
            isDefect
              ? 'bg-vermillion scale-125 shadow-[0_0_8px_#c0392b]'
              : isButton
              ? 'bg-green-mid scale-125 shadow-[0_0_6px_#2d6a4f]'
              : isInspect
              ? 'bg-brass scale-110 shadow-[0_0_6px_#b08d57]'
              : 'bg-green-deep shadow-[0_0_3px_rgba(27,67,50,0.8)]'
          }`}
        />

        {/* Micro-crosshairs around central point */}
        <div className="absolute inset-0 flex items-center justify-center opacity-40">
          <div className="absolute w-3 h-[1px] bg-current" />
          <div className="absolute h-3 w-[1px] bg-current" />
        </div>
      </div>

      {/* ── 3. BESPOKE ANIMATED INSPECTION LOUPE / ROTATING BRASS BEZEL ── */}
      <div
        ref={ringRef}
        className="fixed top-0 left-0 pointer-events-none -ml-7 -mt-7 w-14 h-14 flex items-center justify-center transition-[transform] duration-75 ease-out"
      >
        <div
          className={`relative rounded-full transition-all duration-200 ease-out flex items-center justify-center ${
            isClicking
              ? 'w-8 h-8 scale-90 bg-brass/25 border-2 border-brass shadow-inner'
              : isDefect
              ? 'w-16 h-16 border-2 border-vermillion bg-vermillion/10 animate-pulse shadow-[0_0_16px_rgba(192,57,43,0.3)]'
              : isButton
              ? 'w-14 h-14 border-2 border-green-mid bg-green-deep/12 shadow-[0_0_12px_rgba(45,106,79,0.25)]'
              : isInspect
              ? 'w-15 h-15 border-2 border-brass bg-brass/10 shadow-[0_0_14px_rgba(176,141,87,0.25)]'
              : isInput
              ? 'w-10 h-10 border border-green-mid/70 bg-green-deep/5'
              : 'w-11 h-11 border border-brass/70 bg-brass/5 shadow-xs'
          }`}
        >
          {/* A. Rotating Cardinal Bezel (Slow Animated Clockwise Ring) */}
          {!isClicking && (
            <svg
              className="absolute inset-0 w-full h-full animate-spin-slow pointer-events-none opacity-60"
              viewBox="0 0 44 44"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Outer delicate dashed gauge */}
              <circle
                cx="22"
                cy="22"
                r="20"
                stroke={isDefect ? '#c0392b' : isButton ? '#2d6a4f' : '#b08d57'}
                strokeWidth="0.8"
                strokeDasharray="2 3"
              />
              {/* 4 Cardinal Marks (North, East, South, West) */}
              <line x1="22" y1="1" x2="22" y2="4" stroke={isDefect ? '#c0392b' : isButton ? '#2d6a4f' : '#b08d57'} strokeWidth="1.4" strokeLinecap="round" />
              <line x1="22" y1="40" x2="22" y2="43" stroke={isDefect ? '#c0392b' : isButton ? '#2d6a4f' : '#b08d57'} strokeWidth="1.4" strokeLinecap="round" />
              <line x1="1" y1="22" x2="4" y2="22" stroke={isDefect ? '#c0392b' : isButton ? '#2d6a4f' : '#b08d57'} strokeWidth="1.4" strokeLinecap="round" />
              <line x1="40" y1="22" x2="43" y2="22" stroke={isDefect ? '#c0392b' : isButton ? '#2d6a4f' : '#b08d57'} strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          )}

          {/* B. Optical Glass Sheen Reflection (Simulating convex glass lens) */}
          <div
            className="absolute inset-1 rounded-full pointer-events-none opacity-30"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0) 50%, rgba(176,141,87,0.15) 100%)',
            }}
          />

          {/* C. Interactive State Overlays */}
          {/* Button Mode: Optical Viewfinder Corner Brackets */}
          {isButton && !isClicking && (
            <div className="absolute inset-0 pointer-events-none">
              <span className="absolute top-1 left-1 w-2 h-2 border-t-2 border-l-2 border-green-mid" />
              <span className="absolute top-1 right-1 w-2 h-2 border-t-2 border-r-2 border-green-mid" />
              <span className="absolute bottom-1 left-1 w-2 h-2 border-b-2 border-l-2 border-green-mid" />
              <span className="absolute bottom-1 right-1 w-2 h-2 border-b-2 border-r-2 border-green-mid" />
              <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-xs bg-green-deep text-[8px] font-mono font-bold tracking-widest text-paper shadow-xs whitespace-nowrap">
                AUDIT
              </span>
            </div>
          )}

          {/* Inspect / 3D Desk Mode: Loupe Handle & Inspect Badge */}
          {isInspect && !isClicking && (
            <div className="absolute inset-0 pointer-events-none">
              {/* Loupe handle sticking out bottom-right */}
              <div
                className="absolute -bottom-3 -right-3 w-5 h-1.5 bg-brass rounded-xs origin-top-left rotate-45 shadow-xs border border-brass-light/40"
              />
              <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-xs bg-brass text-[8px] font-mono font-bold tracking-widest text-ink shadow-xs whitespace-nowrap">
                EXAMINE
              </span>
            </div>
          )}

          {/* Defect Mode: Alert Indicator Badge */}
          {isDefect && !isClicking && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-xs bg-vermillion text-[8px] font-mono font-bold tracking-widest text-paper shadow-xs animate-bounce whitespace-nowrap">
                ▲ DEFECT
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
