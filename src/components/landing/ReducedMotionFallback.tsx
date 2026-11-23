'use client';

import { useLang } from '@/lib/lang';

interface FallbackProps {
  currentStep: number;
  packet?: 'A' | 'B';
}

export function ReducedMotionFallback({ currentStep, packet = 'B' }: FallbackProps) {
  const { t } = useLang();

  return (
    <div className="w-full h-full min-h-[440px] bg-desk-dark p-6 sm:p-8 flex flex-col justify-between text-paper">
      {/* Top Ledger Strip */}
      <div className="flex items-center justify-between border-b border-desk-mid pb-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-brass" />
          <span className="font-mono text-xs text-brass-light uppercase tracking-wider font-bold">
            Registry Desk • Static Diagnostic View
          </span>
        </div>
        <div className="text-xs font-mono px-2.5 py-1 rounded-xs bg-brass/20 text-brass-light border border-brass/40 font-bold">
          Stage 0{currentStep} of 04
        </div>
      </div>

      {/* Physical Representation of the Document Triad */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 my-6 max-w-5xl mx-auto w-full">
        {/* Deed Sheet */}
        <div className="p-5 rounded-xs bg-paper text-ink border-2 border-border space-y-2.5 shadow-xl">
          <div className="flex items-center justify-between border-b border-border pb-1.5">
            <span className="text-[10px] font-mono uppercase font-bold text-green-deep">
              Saf Kabala Deed (সাফ কবলা)
            </span>
            <span className="text-[10px] font-mono text-ink-muted">10492 / 2024</span>
          </div>

          <div className="font-heading text-sm font-bold text-ink">
            Sub-Registry Office, Dhaka
          </div>

          <div className="p-2 rounded-xs bg-green-deep/10 border border-green-deep/30">
            <span className="text-[10px] font-mono font-bold text-green-deep block">SCHEDULE PLOT</span>
            <span className="font-mono text-sm font-bold text-green-deep">DAG NO: 412</span>
          </div>

          <div className="text-xs font-sans text-ink-muted">
            Khatian: <span className="font-mono font-bold text-ink">1087</span> • Mouza: Charbata
          </div>

          <div
            className={`p-1.5 rounded-xs text-[11px] font-mono font-bold ${
              packet === 'B'
                ? 'bg-vermillion/10 text-vermillion border border-vermillion/30'
                : 'bg-green-deep/10 text-green-deep border border-green-deep/30'
            }`}
          >
            {packet === 'B' ? '▲ Reg Lag: 135 Days (> 4 Months Limit)' : '✓ Reg Lag: 28 Days (Compliant)'}
          </div>
        </div>

        {/* Khatian Sheet */}
        <div className="p-5 rounded-xs bg-paper text-ink border-2 border-border space-y-2.5 shadow-xl">
          <div className="flex items-center justify-between border-b border-border pb-1.5">
            <span className="text-[10px] font-mono uppercase font-bold text-green-deep">
              RS Khatian (আরএস খতিয়ান)
            </span>
            <span className="text-[10px] font-mono text-ink-muted">Form 5463</span>
          </div>

          <div className="font-heading text-sm font-bold text-ink">
            Collectorate Record of Rights
          </div>

          <div
            className={`p-2 rounded-xs border ${
              packet === 'B'
                ? 'bg-vermillion/10 border-vermillion/40 text-vermillion'
                : 'bg-green-deep/10 border-green-deep/40 text-green-deep'
            }`}
          >
            <span className="text-[10px] font-mono font-bold block">RECORD PLOT</span>
            <span className="font-mono text-sm font-bold">
              {packet === 'B' ? 'DAG NO: 421 (Discrepancy)' : 'DAG NO: 412 (Exact Match)'}
            </span>
          </div>

          <div className="text-xs font-sans text-ink-muted">
            Proprietor: Abdul Karim • Area: 20 Decimals
          </div>

          <div className="text-[11px] font-mono text-ink-muted">
            Collectorate Verification: Sealed & Recorded
          </div>
        </div>

        {/* NID Card */}
        <div className="p-5 rounded-xs bg-paper text-ink border-2 border-border space-y-2.5 shadow-xl">
          <div className="flex items-center justify-between border-b border-border pb-1.5">
            <span className="text-[10px] font-mono uppercase font-bold text-green-deep">
              National ID (জাতীয় পরিচয়পত্র)
            </span>
            <span className="text-[10px] font-mono text-ink-muted">Election Commission</span>
          </div>

          <div className="font-heading text-sm font-bold text-ink">
            Mohammad Hasan
          </div>

          <div
            className={`p-2 rounded-xs border ${
              packet === 'B'
                ? 'bg-amber/15 border-amber/40 text-amber'
                : 'bg-green-deep/10 border-green-deep/40 text-green-deep'
            }`}
          >
            <span className="text-[10px] font-mono font-bold block">NID NUMBER</span>
            <span className="font-mono text-sm font-bold">
              {packet === 'B' ? '269478513 (9 Digits - Invalid)' : '2694785130 (10 Digits Smart)'}
            </span>
          </div>

          <div className="text-xs font-sans text-ink-muted">
            Father: Rafiqul Islam • DOB: 12 Aug 1985
          </div>

          <div className="text-[11px] font-mono text-ink-muted">
            Rule 3, National Identity Registration Rules
          </div>
        </div>
      </div>

      {/* Step Explanation Callout */}
      <div className="border-t border-desk-mid pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-paper-dark">
        <div>
          <span className="font-bold text-brass-light">{t(`step.${currentStep}.title`)}: </span>
          <span>{t(`step.${currentStep}.desc`)}</span>
        </div>
        <div className="font-mono text-xs font-bold text-brass">
          {currentStep === 4
            ? packet === 'B'
              ? 'VERDICT: FLAGGED (2 RED + 1 AMBER)'
              : 'VERDICT: VERIFIED (ALL GREEN)'
            : 'AUDIT IN PROGRESS'}
        </div>
      </div>
    </div>
  );
}
