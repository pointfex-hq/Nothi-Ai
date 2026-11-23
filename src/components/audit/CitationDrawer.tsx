'use client';

import { useEffect } from 'react';
import type { Citation, CorpusSection } from '@/types';
import { getCorpusSectionById } from '@/lib/citations';
import { useLang } from '@/lib/lang';

interface CitationDrawerProps {
  citation: Citation | null;
  onClose: () => void;
  supportingRule?: string;
}

export function CitationDrawer({ citation, onClose, supportingRule }: CitationDrawerProps) {
  const { lang } = useLang();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    if (citation) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [citation, onClose]);

  if (!citation) return null;

  const corpusData: CorpusSection | undefined = getCorpusSectionById(citation.id);

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-ink/40 backdrop-blur-xs transition-opacity"
      role="dialog"
      aria-modal="true"
      aria-labelledby="citation-drawer-title"
    >
      <div
        className="w-full max-w-lg bg-surface border-l border-border h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200"
        tabIndex={-1}
      >
        {/* Drawer Header */}
        <div className="flex items-start justify-between border-b border-border p-5 bg-paper">
          <div>
            <div className="flex items-center gap-2">
              <span className="mono-id text-xs font-semibold px-2 py-0.5 rounded-sm bg-green-deep text-paper">
                {citation.id}
              </span>
              <span className="text-xs text-ink-muted">
                {corpusData?.version ?? 'corpus-ref'}
              </span>
            </div>
            <h3
              id="citation-drawer-title"
              className="font-heading text-xl font-bold text-green-deep mt-2"
            >
              {citation.section}: {citation.title}
            </h3>
            <p className="text-xs font-medium text-ink-muted mt-0.5">
              {citation.act}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-sm p-1.5 text-ink-muted hover:text-ink hover:bg-paper-dark border border-border transition-colors text-sm font-mono"
            aria-label="Close statutory citation drawer"
          >
            ✕
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Supporting Rule context */}
          {supportingRule && (
            <div className="rounded-sm border border-brass-light bg-brass/10 p-3.5">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-ochre mb-1">
                {lang === 'bn' ? 'সমর্থিত নিয়ম' : 'Supports Rule'}
              </h4>
              <p className="text-xs font-mono text-ink">
                {supportingRule}
              </p>
            </div>
          )}

          {/* Verbatim Statute Text */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                {lang === 'bn' ? 'বিধিবদ্ধ ধারা পাঠ (হুবহু)' : 'Verbatim Statutory Section'}
              </h4>
              {corpusData?.version.includes('placeholder') && (
                <span className="text-[11px] font-mono text-amber border border-amber/40 bg-amber/10 px-1.5 py-0.5 rounded-sm">
                  Corpus Placeholder
                </span>
              )}
            </div>
            <div className="bg-paper p-4 rounded-sm border border-border font-serif text-sm leading-relaxed text-ink shadow-inner whitespace-pre-wrap">
              {corpusData?.text ?? 'Statute text not found in local corpus.'}
            </div>
          </div>

          {/* Legislative Citation Guidance */}
          <div className="border-t border-border pt-4 text-xs text-ink-muted space-y-2">
            <p className="font-semibold text-ink">
              {lang === 'bn' ? 'বিধিবদ্ধ নির্ভুলতা নীতি:' : 'Statutory Accuracy Guarantee:'}
            </p>
            <p className="leading-normal">
              {lang === 'bn'
                ? 'নথি এআই কৃত্রিমভাবে কোনো আইনি ধারা রচনা করে না। প্রতিটি ধারা স্থানীয় laws_corpus.json থেকে অপরিবর্তিতভাবে উদ্ধৃত।'
                : 'Nothi AI enforces NFR-1 citation integrity. Unverified or fabricated statutory sections are strictly blocked by deterministic filters.'}
            </p>
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="border-t border-border p-4 bg-paper-dark flex justify-between items-center text-xs text-ink-muted">
          <span>Laws of Bangladesh Reference</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-sm bg-green-deep text-paper font-medium hover:bg-green-mid transition-colors"
          >
            {lang === 'bn' ? 'বন্ধ করুন' : 'Dismiss'}
          </button>
        </div>
      </div>
    </div>
  );
}
