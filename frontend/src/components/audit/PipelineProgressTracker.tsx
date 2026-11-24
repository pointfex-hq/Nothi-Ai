'use client';

import { PIPELINE_STAGES, PIPELINE_STAGE_LABELS } from '@/types';
import type { PipelineProgress } from '@/types';
import { useLang } from '@/lib/lang';

interface PipelineProgressTrackerProps {
  progress: PipelineProgress;
}

export function PipelineProgressTracker({ progress }: PipelineProgressTrackerProps) {
  const { lang } = useLang();

  return (
    <div className="rounded-sm border border-border bg-paper p-5 shadow-xs">
      <div className="flex items-center justify-between mb-3 border-b border-border pb-2">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-green-mid animate-pulse" />
          <span className="font-heading font-semibold text-sm text-green-deep">
            {lang === 'bn' ? 'স্বয়ংক্রিয় আইনি নিরীক্ষা পাইপলাইন' : 'Automated Legal Vetting Pipeline'}
          </span>
        </div>
        <div className="font-mono text-xs text-ink-muted">
          <span>{lang === 'bn' ? 'সময় অতিবাহিত: ' : 'Elapsed: '}</span>
          <span className="font-semibold text-ink">{(progress.elapsedMs / 1000).toFixed(1)}s</span>
          <span className="text-[11px] opacity-75"> / &lt;18s (NFR-2)</span>
        </div>
      </div>

      {/* Progress Track */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 mt-3">
        {PIPELINE_STAGES.map((stage, index) => {
          const isDone = progress.completedStages.includes(stage);
          const isCurrent = progress.currentStage === stage && !isDone;
          const label = PIPELINE_STAGE_LABELS[stage][lang];

          return (
            <div
              key={stage}
              className={`p-2.5 rounded-sm border text-xs transition-all ${
                isDone
                  ? 'bg-green-deep/10 border-green-mid text-green-deep'
                  : isCurrent
                  ? 'bg-brass/15 border-brass text-ink font-semibold ring-1 ring-brass'
                  : 'bg-paper-light border-border/60 text-ink-muted/70'
              }`}
            >
              <div className="flex items-center justify-between font-mono text-[10px] mb-1">
                <span>0{index + 1}</span>
                <span>
                  {isDone ? '✓' : isCurrent ? '● ACTIVE' : '○ QUEUED'}
                </span>
              </div>
              <div className="text-[11px] leading-tight font-medium">
                {label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
