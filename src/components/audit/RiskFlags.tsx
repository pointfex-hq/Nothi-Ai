'use client';

import type { Citation, Flag, Severity } from '@/types';
import { useLang } from '@/lib/lang';
import { CitationChip } from './CitationChip';

interface RiskFlagsProps {
  flags: Flag[];
  selectedFlagId: string | null;
  onSelectFlag: (flag: Flag) => void;
  onSelectCitation: (citation: Citation, rule?: string) => void;
}

const SEVERITY_CONFIG: Record<
  Severity,
  {
    badge: string;
    badgeBn: string;
    icon: string;
    containerClass: string;
    borderClass: string;
    selectedClass: string;
    iconBg: string;
  }
> = {
  RED: {
    badge: 'CRITICAL DEFECT',
    badgeBn: 'মারাত্মক ত্রুটি',
    icon: '▲', // Triangle shape
    containerClass: 'bg-vermillion/5',
    borderClass: 'border-vermillion/40',
    selectedClass: 'ring-2 ring-vermillion border-vermillion',
    iconBg: 'bg-vermillion text-paper',
  },
  AMBER: {
    badge: 'STATUTORY WARNING',
    badgeBn: 'বিধিবদ্ধ সতর্কতা',
    icon: '◆', // Diamond shape
    containerClass: 'bg-amber/5',
    borderClass: 'border-amber/40',
    selectedClass: 'ring-2 ring-amber border-amber',
    iconBg: 'bg-amber text-paper',
  },
  GREEN: {
    badge: 'STATUTORY COMPLIANCE',
    badgeBn: 'বিধিবদ্ধ সম্মতি',
    icon: '■', // Square shape
    containerClass: 'bg-flag-green/5',
    borderClass: 'border-flag-green/40',
    selectedClass: 'ring-2 ring-flag-green border-flag-green',
    iconBg: 'bg-flag-green text-paper',
  },
};

export function RiskFlags({
  flags,
  selectedFlagId,
  onSelectFlag,
  onSelectCitation,
}: RiskFlagsProps) {
  const { lang, t } = useLang();

  if (!flags || flags.length === 0) {
    return null;
  }

  // Count tallies
  const redCount = flags.filter((f) => f.severity === 'RED').length;
  const amberCount = flags.filter((f) => f.severity === 'AMBER').length;
  const greenCount = flags.filter((f) => f.severity === 'GREEN').length;

  return (
    <section className="rounded-sm border border-border bg-surface p-5 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3 mb-4">
        <div>
          <h2 className="font-heading text-lg font-bold text-green-deep">
            {t('audit.flags')}
          </h2>
          <p className="text-xs text-ink-muted">
            {lang === 'bn'
              ? 'আইনি বিধিবদ্ধ ধারা ও নিয়ম দ্বারা পরিচালিত নিরীক্ষা ফলাফল।'
              : 'Deterministic findings evaluated against Bangladeshi statutory rules.'}
          </p>
        </div>

        {/* Tallies */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm bg-vermillion/10 text-vermillion border border-vermillion/30 font-bold">
            ▲ {redCount} {t('flag.red')}
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm bg-amber/10 text-amber border border-amber/30 font-bold">
            ◆ {amberCount} {t('flag.amber')}
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm bg-flag-green/10 text-flag-green border border-flag-green/30 font-bold">
            ■ {greenCount} {t('flag.green')}
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {flags.map((flag) => {
          const config = SEVERITY_CONFIG[flag.severity];
          const isSelected = selectedFlagId === flag.id;

          return (
            <div
              key={flag.id}
              onClick={() => onSelectFlag(flag)}
              className={`p-4 rounded-sm border cursor-pointer transition-all ${
                config.containerClass
              } ${config.borderClass} ${
                isSelected ? config.selectedClass : 'hover:border-ink/40'
              }`}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectFlag(flag);
                }
              }}
              aria-pressed={isSelected}
            >
              {/* Top row: badge + severity shape */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center justify-center w-4 h-4 rounded-xs text-[10px] font-bold ${config.iconBg}`}
                    aria-hidden="true"
                  >
                    {config.icon}
                  </span>
                  <span className="text-[11px] font-mono font-bold tracking-wider">
                    {lang === 'bn' ? config.badgeBn : config.badge}
                  </span>
                </div>
                <span className="text-[11px] font-mono text-ink-muted">
                  {flag.id}
                </span>
              </div>

              {/* Title */}
              <h3 className="font-heading font-semibold text-ink text-sm sm:text-base leading-snug">
                {lang === 'bn' && flag.titleBn ? flag.titleBn : flag.title}
              </h3>

              {/* Rule Description */}
              <div className="mt-2 text-xs font-mono bg-paper/80 p-2 rounded-sm border border-border/60 text-ink-muted">
                <span className="font-semibold text-ink">Rule: </span>
                {lang === 'bn' && flag.ruleBn ? flag.ruleBn : flag.rule}
              </div>

              {/* Values Involved */}
              {flag.values && flag.values.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-2 text-xs">
                  {flag.values.map((v, idx) => (
                    <div
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm bg-paper border border-border font-mono text-[11px]"
                    >
                      <span className="text-ink-muted">{v.field}:</span>
                      {v.deed && <span className="text-ink font-semibold">Deed={v.deed}</span>}
                      {v.khatian && <span className="text-vermillion font-bold">Khatian={v.khatian}</span>}
                      {v.nid && <span className="text-amber font-bold">NID={v.nid}</span>}
                    </div>
                  ))}
                </div>
              )}

              {/* Citations Footer */}
              {flag.citations && flag.citations.length > 0 && (
                <div className="mt-3 pt-2.5 border-t border-border/60 flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-mono text-ink-muted">
                    {lang === 'bn' ? 'সংবিধিবদ্ধ রেফারেন্স:' : 'Statutory Basis:'}
                  </span>
                  {flag.citations.map((c) => (
                    <CitationChip
                      key={c.id}
                      citation={c}
                      onClick={(cit) => onSelectCitation(cit, flag.rule)}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
