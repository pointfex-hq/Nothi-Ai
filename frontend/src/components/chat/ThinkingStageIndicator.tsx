'use client';

import { AnimatedLogo } from './AnimatedLogo';

export type PipelineStage =
  | 'reading'
  | 'searching'
  | 'checking'
  | 'writing'
  | 'not_found';

interface ThinkingStageIndicatorProps {
  currentStage: PipelineStage;
  isError?: boolean;
}

const STAGE_LABELS: Record<PipelineStage, { en: string; bn: string }> = {
  reading: { en: 'Reading question', bn: 'প্রশ্ন পর্যালোচনা হচ্ছে' },
  searching: { en: 'Checking statutory sections', bn: 'সংবিধিবদ্ধ ধারা পরীক্ষা হচ্ছে' },
  checking: { en: 'Checking statutory sections', bn: 'সংবিধিবদ্ধ ধারা পরীক্ষা হচ্ছে' },
  writing: { en: 'Drafting verified response', bn: 'যাচাইকৃত উত্তর প্রস্তুত হচ্ছে' },
  not_found: { en: 'Not found in verified sections', bn: 'যাচাইকৃত ধারায় পাওয়া যায়নি' },
};

export function ThinkingStageIndicator({
  currentStage,
  isError = false,
}: ThinkingStageIndicatorProps) {
  const displayedText = STAGE_LABELS[currentStage]?.en || 'Reasoning';

  return (
    <div className="py-2 space-y-2">
      {/* 3-Step Simple Status Line */}
      <div className="flex items-center gap-2.5">
        <AnimatedLogo
          state={isError ? 'error' : 'thinking'}
          size={18}
        />

        <div className="flex items-center gap-2 font-sans text-xs text-ink-muted" aria-live="polite">
          <span>{displayedText}</span>
          <span className="flex gap-1 items-center">
            <span className="w-1.5 h-1.5 rounded-full bg-brass/80 animate-pulse" />
            <span className="w-1.5 h-1.5 rounded-full bg-brass/60 animate-pulse delay-100" />
            <span className="w-1.5 h-1.5 rounded-full bg-brass/40 animate-pulse delay-200" />
          </span>
        </div>
      </div>

      {/* Lightweight subtle skeleton bar */}
      <div className="h-2 w-48 rounded-full bg-paper-dark/80 pl-6" />
    </div>
  );
}
