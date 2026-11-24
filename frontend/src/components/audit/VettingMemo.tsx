'use client';

import type { Citation, MemoSection } from '@/types';
import { useLang } from '@/lib/lang';
import { CitationChip } from './CitationChip';

interface VettingMemoProps {
  memo: MemoSection[];
  verdict: 'COMPLIANT' | 'FLAGGED';
  verdictBn: string;
  auditId: string;
  timestamp: string;
  onSelectCitation: (citation: Citation) => void;
}

export function VettingMemo({
  memo,
  verdict,
  verdictBn,
  auditId,
  timestamp,
  onSelectCitation,
}: VettingMemoProps) {
  const { lang, t } = useLang();

  if (!memo || memo.length === 0) {
    return null;
  }

  function handlePrint() {
    window.print();
  }

  const isCompliant = verdict === 'COMPLIANT';

  return (
    <section className="rounded-sm border border-border bg-surface p-6 shadow-xs relative print:p-0 print:border-none print:shadow-none">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-green-deep pb-4 mb-6">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-widest text-ink-muted">
            Government of the People&apos;s Republic of Bangladesh
          </div>
          <h2 className="font-heading text-xl font-bold text-green-deep tracking-tight">
            {t('audit.memo')}
          </h2>
          <div className="text-xs font-mono text-ink-muted mt-1">
            Ref: {auditId} • Date: {new Date(timestamp).toLocaleDateString('en-GB')}
          </div>
        </div>

        <div className="flex items-center gap-3 no-print">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm border border-border bg-paper hover:bg-paper-dark text-xs font-mono text-ink transition-colors cursor-pointer"
            title="Print Official Vetting Memorandum"
          >
            <span>🖨</span>
            <span>{lang === 'bn' ? 'প্রিন্ট করুন' : 'Print Memo'}</span>
          </button>
        </div>
      </div>

      {/* Official Verdict Seal / Stamp Badge */}
      <div className="absolute top-6 right-6 pointer-events-none opacity-90 print:block">
        <div
          className={`border-2 sm:border-3 rounded-xs px-3 py-1.5 transform rotate-[-6deg] font-mono text-center tracking-widest uppercase text-xs sm:text-sm font-extrabold ${isCompliant
            ? 'border-flag-green text-flag-green bg-flag-green/10'
            : 'border-vermillion text-vermillion bg-vermillion/10'
            }`}
        >
          <div>{verdict === 'COMPLIANT' ? '● VERIFIED COMPLIANT' : '▲ FLAGGED FOR REVIEW'}</div>
          <div className="text-[9px] font-normal tracking-normal mt-0.5">
            {lang === 'bn' ? verdictBn : (isCompliant ? 'Statutory Audit Passed' : 'Discrepancies Recorded')}
          </div>
        </div>
      </div>

      {/* Memo Sections */}
      <div className="space-y-6 max-w-3xl">
        {memo.map((sec, index) => {
          return (
            <div key={sec.id} className="space-y-1.5">
              <h3 className="font-heading font-semibold text-base text-green-deep border-b border-border/60 pb-1">
                {index + 1}. {lang === 'bn' && sec.headingBn ? sec.headingBn : sec.heading}
              </h3>
              <p className="text-sm font-serif leading-relaxed text-ink">
                {lang === 'bn' && sec.bodyBn ? sec.bodyBn : sec.body}
              </p>

              {/* Inline Citations */}
              {sec.citations && sec.citations.length > 0 && (
                <div className="pt-1 flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-mono text-ink-muted">
                    {lang === 'bn' ? 'ধারা:' : 'Statutory Reference:'}
                  </span>
                  {sec.citations.map((c) => (
                    <CitationChip
                      key={c.id}
                      citation={c}
                      onClick={onSelectCitation}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Memo Attestation Footer */}
      <div className="mt-8 pt-6 border-t border-border grid grid-cols-2 gap-4 text-xs font-mono text-ink-muted">
        <div>
          <div>Auditing Officer: Legal Vetting Engine v1.0</div>
          <div>Pointfex Land Intelligence — Team Boron</div>
        </div>
        <div className="text-right">
          <div>Verified against laws_corpus.json</div>
          <div>Dhaka Registry Jurisdiction</div>
        </div>
      </div>
    </section>
  );
}
