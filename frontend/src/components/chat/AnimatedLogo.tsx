'use client';

import { useSyncExternalStore } from 'react';

export type LogoState = 'idle' | 'thinking' | 'answered' | 'error';

interface AnimatedLogoProps {
  state?: LogoState;
  size?: number;
  className?: string;
  showWordmark?: boolean;
}

const subscribeReducedMotion = (callback: () => void) => {
  if (typeof window === 'undefined') return () => {};
  const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
  mql.addEventListener('change', callback);
  return () => mql.removeEventListener('change', callback);
};
const getReducedMotionSnapshot = () =>
  typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false;
const getReducedMotionServerSnapshot = () => false;

export function AnimatedLogo({
  state = 'idle',
  size = 24,
  className = '',
  showWordmark = false,
}: AnimatedLogoProps) {
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot
  );

  // Stroke colors based on state
  const isThinking = state === 'thinking';
  const isAnswered = state === 'answered';
  const isError = state === 'error';

  const folderStroke = isError ? '#c0392b' : '#1b4332';
  const lensStroke = isError ? '#c0392b' : isThinking ? '#b08d57' : isAnswered ? '#1b4332' : '#b08d57';
  const checkStroke = '#1b4332';

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 overflow-visible"
        aria-hidden="true"
      >
        {/* ── DOCUMENT DOSSIER FOLDER BASE ── */}
        <path
          d="M5 8C5 6.89543 5.89543 6 7 6H12.5L15 9H25C26.1046 9 27 9.89543 27 11V24C27 25.1046 26.1046 26 25 26H7C5.89543 26 5 25.1046 5 24V8Z"
          stroke={folderStroke}
          strokeWidth="1.75"
          strokeLinejoin="round"
          className={`folder-base ${!reducedMotion && state === 'idle' ? 'folder-shimmer' : ''}`}
        />

        {/* Dossier flap crease line */}
        <path
          d="M5 12H27"
          stroke={folderStroke}
          strokeWidth="1.25"
          strokeOpacity="0.4"
          strokeLinecap="round"
        />

        {/* ── LENS GROUP ── */}
        <g
          className={
            reducedMotion
              ? ''
              : isThinking
              ? 'lens-thinking'
              : isError
              ? 'lens-error'
              : ''
          }
        >
          {/* Optical lens ring */}
          <circle
            cx="20"
            cy="19"
            r="5.5"
            stroke={lensStroke}
            strokeWidth="1.75"
            fill={isThinking ? 'rgba(176, 141, 87, 0.12)' : 'none'}
          />

          {/* Optical handle */}
          <path
            d="M24 23L27.5 26.5"
            stroke={lensStroke}
            strokeWidth="1.75"
            strokeLinecap="round"
          />
        </g>

        {/* ── VERIFICATION CHECK MARK ── */}
        {(isAnswered || state === 'idle') && (
          <path
            d="M17.5 19L19.2 20.8L22.5 17.2"
            stroke={checkStroke}
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={!reducedMotion && isAnswered ? 'check-draw' : ''}
          />
        )}
      </svg>

      {/* Wordmark (Serif English + Bangla on same baseline) */}
      {showWordmark && (
        <span className="flex items-baseline gap-1.5 select-none font-medium">
          <span className="font-heading text-lg sm:text-xl font-bold tracking-tight text-green-deep">
            Nothi AI
          </span>
          <span className="font-bangla text-base sm:text-lg font-normal text-brass">
            নথি এআই
          </span>
        </span>
      )}
    </div>
  );
}
