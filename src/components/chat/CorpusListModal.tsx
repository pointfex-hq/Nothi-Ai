'use client';

import { useEffect, useRef } from 'react';
import corpusData from '@/data/laws_corpus.json';
import type { CorpusSection } from '@/types';

interface CorpusListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSection: (section: CorpusSection) => void;
}

export function CorpusListModal({ isOpen, onClose, onSelectSection }: CorpusListModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Group sections by Act
  const actsMap: Record<string, CorpusSection[]> = {};
  (corpusData as CorpusSection[]).forEach((sec) => {
    if (!actsMap[sec.act]) actsMap[sec.act] = [];
    actsMap[sec.act].push(sec);
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="corpus-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl max-h-[85vh] rounded-xl bg-paper border-2 border-border shadow-2xl flex flex-col overflow-hidden text-ink"
      >
        {/* Header */}
        <div className="p-5 border-b border-border bg-paper-light flex items-center justify-between shrink-0">
          <div>
            <div className="text-[11px] font-mono text-ink-muted uppercase tracking-wider">
              Statutory Boundary • 28 Sections
            </div>
            <h2 id="corpus-modal-title" className="font-heading text-xl font-bold text-green-deep">
              Verified Statutory Corpus
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xs text-ink-muted hover:text-ink hover:bg-paper-dark transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        {/* Notice */}
        <div className="px-5 py-3 bg-paper-dark/50 border-b border-border text-xs font-sans text-ink-muted flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-deep shrink-0" />
          <span>
            Nothi AI strictly rejects unverified topics. Only answers grounded in these 28 statutory sections are delivered.
          </span>
        </div>

        {/* Section List by Act */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {Object.entries(actsMap).map(([actName, sections]) => (
            <div key={actName} className="space-y-2">
              <h3 className="font-heading text-sm font-bold text-green-deep border-b border-border/80 pb-1 flex items-center justify-between">
                <span>{actName}</span>
                <span className="text-[11px] font-mono font-normal text-ink-muted">
                  {sections.length} sections
                </span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {sections.map((sec) => {
                  const isVerified = sec.version === 'verified-v1' && !sec.text.startsWith('PLACEHOLDER');

                  return (
                    <button
                      key={sec.id}
                      type="button"
                      onClick={() => {
                        onSelectSection(sec);
                      }}
                      className="group p-2.5 rounded-lg border border-border bg-paper hover:bg-paper-light text-left transition-all hover:border-brass/70 cursor-pointer flex flex-col justify-between"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-mono text-xs font-bold text-ink group-hover:text-green-deep">
                          {sec.section}
                        </span>
                        <span
                          className={`text-[9px] font-mono px-1.5 py-0.5 rounded-xs ${
                            isVerified
                              ? 'bg-green-deep/10 text-green-deep font-semibold'
                              : 'bg-paper-dark text-ink-muted'
                          }`}
                        >
                          {isVerified ? 'Verified' : 'Pending'}
                        </span>
                      </div>
                      <div className="text-xs font-sans text-ink-muted truncate mt-1">
                        {sec.title}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-paper-light flex items-center justify-between text-xs font-sans text-ink-muted">
          <span>Click any section to inspect verbatim statutory text.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xs bg-paper-dark border border-border text-ink hover:bg-border font-medium cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
