'use client';

import { useState, useRef } from 'react';
import type { ChatCitation } from '@/lib/chat';
import { getCorpusSectionById, resolveCanonicalId } from '@/lib/citations';
import type { CorpusSection } from '@/types';

interface CitationPopoverProps {
  citation: ChatCitation;
  onInspect: (section: CorpusSection) => void;
  index?: number;
}

export function CitationPopover({ citation, onInspect, index = 0 }: CitationPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const canonicalId = resolveCanonicalId(citation.id);
  const section = getCorpusSectionById(canonicalId);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setIsOpen(false), 200);
  };

  const isPending = !section?.text || section.text.startsWith('PLACEHOLDER');
  const previewText = isPending
    ? 'text pending verification'
    : section?.text
    ? section.text.length > 180
      ? section.text.substring(0, 180) + '...'
      : section.text
    : 'Statutory section record';

  return (
    <div
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleMouseEnter}
      onBlur={handleMouseLeave}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <button
        type="button"
        onClick={() => {
          if (section) {
            onInspect(section);
          } else if (citation.officialUrl) {
            window.open(citation.officialUrl, '_blank', 'noopener,noreferrer');
          }
        }}
        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-border/90 bg-paper-light hover:border-brass/80 hover:bg-paper text-ink text-xs transition-all duration-150 ease-out cursor-pointer shadow-2xs hover:shadow-xs hover:-translate-y-0.5 active:scale-95 group focus-visible:ring-2 focus-visible:ring-brass focus-visible:outline-hidden"
        title={citation.officialUrl ? `View official text (${citation.officialUrl})` : "View verbatim statutory text"}
      >
        <span className="text-[11px] text-green-deep font-bold font-mono">§</span>
        <span className="font-mono font-semibold text-green-deep text-[11px]">{citation.section || citation.label || citation.id}</span>
        <span className="text-ink-muted text-[11px] font-sans opacity-80 truncate max-w-[160px]">({citation.act})</span>
        {citation.officialUrl && !section && (
          <span className="text-[10px] text-brass opacity-70 group-hover:opacity-100">↗</span>
        )}
      </button>

      {/* Floating Popover on Hover */}
      {isOpen && (
        <div
          role="tooltip"
          className="absolute bottom-full left-0 mb-2 w-72 sm:w-80 p-3.5 rounded-lg bg-paper border border-border shadow-xl z-30 animate-in fade-in slide-in-from-bottom-1 duration-150 text-left pointer-events-auto"
        >
          {/* Arrow */}
          <div className="absolute top-full left-4 -mt-[5px] w-2.5 h-2.5 bg-paper border-r border-b border-border rotate-45" />

          <div className="space-y-1.5 font-sans">
            <div className="flex items-center justify-between text-[10px] font-mono text-ink-muted uppercase tracking-wider">
              <span>{citation.act}</span>
              <span className={isPending ? 'text-ink-muted' : 'text-green-deep font-bold'}>
                {isPending ? 'Pending' : '✓ Verified'}
              </span>
            </div>

            <h4 className="font-heading text-xs font-bold text-green-deep">
              {section?.title || citation.section || citation.id}
            </h4>

            <p className="text-xs text-ink-muted leading-relaxed line-clamp-4 font-sans italic bg-paper-light p-2 rounded-xs border border-border/60">
              &ldquo;{previewText}&rdquo;
            </p>

            <div className="pt-1 flex items-center justify-between text-[11px] text-brass font-mono">
              <span>{citation.officialUrl && !section ? 'Open bdlaws legislation portal ↗' : 'Click chip to view full section'}</span>
              <span>&rarr;</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
