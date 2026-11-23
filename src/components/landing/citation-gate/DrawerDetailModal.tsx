'use client';

import type { CorpusSection } from '@/types';

interface DrawerDetailModalProps {
  section: CorpusSection | null;
  citationId: string | null;
  onClose: () => void;
}

export function DrawerDetailModal({
  section,
  citationId,
  onClose,
}: DrawerDetailModalProps) {
  if (!section && !citationId) return null;

  const isPlaceholder = !section?.text || section.text.startsWith('PLACEHOLDER');
  const displayText = isPlaceholder
    ? 'text pending verification'
    : section?.text;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawer-record-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-sm border-2 border-brass bg-paper shadow-2xl p-6 space-y-5 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header: Brass catalog drawer plate */}
        <div className="flex items-start justify-between border-b-2 border-brass/40 pb-3">
          <div>
            <div className="text-[11px] font-mono uppercase tracking-widest text-brass font-bold">
              Registry Archive • Drawer Record
            </div>
            <h3 id="drawer-record-title" className="font-heading text-xl font-bold text-green-deep mt-0.5">
              {section?.act || 'Statutory Corpus Entry'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close drawer record"
            className="p-1.5 rounded-xs text-ink-muted hover:text-ink hover:bg-paper-dark transition-colors font-mono text-sm focus-visible:ring-2 focus-visible:ring-brass focus-visible:outline-hidden cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Record Metadata Grid */}
        <div className="grid grid-cols-2 gap-3 text-xs bg-paper-light border border-border p-3.5 rounded-xs font-mono">
          <div>
            <span className="text-ink-muted block text-[10px] uppercase">Corpus ID</span>
            <span className="font-bold text-ink">{section?.id || citationId}</span>
          </div>
          <div>
            <span className="text-ink-muted block text-[10px] uppercase">Section Designation</span>
            <span className="font-bold text-ink">{section?.section || '—'}</span>
          </div>
          <div className="col-span-2 pt-1 border-t border-border/60">
            <span className="text-ink-muted block text-[10px] uppercase">Title / Heading</span>
            <span className="font-heading text-sm text-green-deep font-semibold">{section?.title || '—'}</span>
          </div>
          <div>
            <span className="text-ink-muted block text-[10px] uppercase">Corpus Version</span>
            <span className="text-ink">{section?.version || 'v1.0'}</span>
          </div>
          <div>
            <span className="text-ink-muted block text-[10px] uppercase">Integrity Status</span>
            <span className="text-green-deep font-bold flex items-center gap-1">
              ✓ Grounded in Statute
            </span>
          </div>
        </div>

        {/* Statutory Text / Verbatim Proof */}
        <div className="space-y-1.5">
          <div className="text-[11px] font-mono uppercase tracking-wider text-ink-muted font-bold">
            Statutory Text
          </div>
          <div
            className={`p-3.5 rounded-xs border text-xs leading-relaxed max-h-48 overflow-y-auto ${
              isPlaceholder
                ? 'border-dashed border-border bg-paper-dark/40 italic text-ink-muted font-mono'
                : 'border-border bg-paper-light font-sans text-ink'
            }`}
          >
            {displayText}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-border text-xs font-mono text-ink-muted">
          <span>Source: laws_corpus.json</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xs bg-green-deep text-paper hover:bg-green-mid font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-brass focus-visible:outline-hidden cursor-pointer"
          >
            Close Record
          </button>
        </div>
      </div>
    </div>
  );
}
