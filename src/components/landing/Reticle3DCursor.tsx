'use client';

import { useEffect, useRef, useState } from 'react';

interface Reticle3DCursorProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  hoveredObject: 'document' | 'hotspot' | 'button' | null;
}

export function Reticle3DCursor({ containerRef, hoveredObject }: Reticle3DCursorProps) {
  const [active, setActive] = useState(false);
  const cursorRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: -100, y: -100 });
  const trail = useRef({ x: -100, y: -100 });
  const rafId = useRef<number | null>(null);

  useEffect(() => {
    const isFinePointer = window.matchMedia('(pointer: fine)').matches;
    const isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!isFinePointer || isReducedMotion) return;

    const el = containerRef.current;
    if (!el) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const inBounds =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;

      setActive(inBounds);
      pos.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseLeave = () => setActive(false);

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    el.addEventListener('mouseleave', handleMouseLeave);

    const render = () => {
      const ease = 0.18;
      trail.current.x += (pos.current.x - trail.current.x) * ease;
      trail.current.y += (pos.current.y - trail.current.y) * ease;

      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${pos.current.x}px, ${pos.current.y}px, 0)`;
      }
      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate3d(${trail.current.x}px, ${trail.current.y}px, 0)`;
      }

      rafId.current = requestAnimationFrame(render);
    };

    rafId.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      el.removeEventListener('mouseleave', handleMouseLeave);
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [containerRef]);

  if (!active) return null;

  const isDoc = hoveredObject === 'document';
  const isHotspot = hoveredObject === 'hotspot';
  const isBtn = hoveredObject === 'button';

  return (
    <div className="fixed inset-0 pointer-events-none z-50 transition-opacity duration-200" aria-hidden="true">
      {/* Central brass laser dot */}
      <div
        ref={dotRef}
        className="fixed top-0 left-0 w-1.5 h-1.5 -ml-[3px] -mt-[3px] rounded-full bg-brass-light pointer-events-none shadow-[0_0_6px_rgba(212,180,131,0.9)]"
      />

      {/* Trailing Brass Reticle Ring */}
      <div
        ref={cursorRef}
        className={`fixed top-0 left-0 rounded-full pointer-events-none transition-[width,height,border-color,background-color] duration-150 ease-out flex items-center justify-center ${
          isHotspot
            ? 'w-12 h-12 -ml-6 -mt-6 border-2 border-vermillion bg-vermillion/20 animate-pulse'
            : isDoc
            ? 'w-14 h-14 -ml-7 -mt-7 border-2 border-brass-light bg-brass/15 shadow-[0_0_12px_rgba(176,141,87,0.3)]'
            : isBtn
            ? 'w-10 h-10 -ml-5 -mt-5 border border-paper-light bg-paper/10'
            : 'w-8 h-8 -ml-4 -mt-4 border border-brass/60 bg-transparent'
        }`}
      >
        {isDoc && (
          <span className="text-[9px] font-mono font-bold tracking-widest text-brass-light uppercase">
            INSPECT
          </span>
        )}
      </div>
    </div>
  );
}