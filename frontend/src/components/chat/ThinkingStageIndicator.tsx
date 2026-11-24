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
  reading: { en: 'Reading your question', bn: 'প্রশ্ন পর্যালোচনা করা হচ্ছে' },
  searching: { en: 'Searching verified sections', bn: 'যাচাইকৃত ধারাসমূহ অনুসন্ধান করা হচ্ছে' },
  checking: { en: 'Checking citations', bn: 'আইনি উদ্ধৃতিসমূহ যাচাই করা হচ্ছে' },
  writing: { en: 'Writing the answer', bn: 'উত্তর সংকলন করা হচ্ছে' },
  not_found: { en: 'Not found in verified sections', bn: 'যাচাইকৃত ধারায় পাওয়া যায়নি' },
};

export function ThinkingStageIndicator({
  currentStage,
  isError = false,
}: ThinkingStageIndicatorProps) {
  const displayedText = STAGE_LABELS[currentStage]?.en || 'Reasoning';

  return (
    <div className="space-y-3.5 py-1">
      {/* Top stage status line */}
      <div className="flex items-center gap-2.5">
        <AnimatedLogo
          state={isError ? 'error' : 'thinking'}
          size={20}
        />

        <span
          key={currentStage}
          className="font-sans text-xs text-ink-muted transition-opacity duration-200 animate-in fade-in"
          aria-live="polite"
        >
          {displayedText}
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-brass animate-pulse ml-1.5" />
        </span>
      </div>

      {/* Subtle Paper-Toned Skeleton (Not Gray-Blue) */}
      <div className="space-y-2 max-w-xl pl-7" aria-hidden="true">
        <div
          className="h-3.5 rounded-xs w-5/6"
          style={{
            background: 'linear-gradient(90deg, #ede7db 0%, #f6f2e9 50%, #ede7db 100%)',
            backgroundSize: '200% 100%',
            animation: 'skeletonShimmer 1.8s ease-in-out infinite',
          }}
        />
        <div
          className="h-3.5 rounded-xs w-4/6"
          style={{
            background: 'linear-gradient(90deg, #ede7db 0%, #f6f2e9 50%, #ede7db 100%)',
            backgroundSize: '200% 100%',
            animation: 'skeletonShimmer 1.8s ease-in-out infinite 0.2s',
          }}
        />
        <div
          className="h-3.5 rounded-xs w-3/6"
          style={{
            background: 'linear-gradient(90deg, #ede7db 0%, #f6f2e9 50%, #ede7db 100%)',
            backgroundSize: '200% 100%',
            animation: 'skeletonShimmer 1.8s ease-in-out infinite 0.4s',
          }}
        />
      </div>

      <style jsx>{`
        @keyframes skeletonShimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}
