'use client';

import { isValidCitationId } from '@/lib/citations';
import type { Citation } from '@/types';

interface CitationChipProps {
  citation: Citation;
  onClick: (citation: Citation) => void;
  className?: string;
}

export function CitationChip({ citation, onClick, className = '' }: CitationChipProps) {
  // Integrity check: if not in corpus, don't render
  if (!isValidCitationId(citation.id)) {
    console.warn(`[LawLens Integrity Check] Citation dropped due to missing corpus ID: ${citation.id}`);
    return null;
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick(citation);
      }}
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-xs font-mono border border-green-mid/40 bg-green-deep/5 text-green-deep hover:bg-green-deep hover:text-paper hover:border-green-deep transition-all cursor-pointer ${className}`}
      title={`Click to inspect ${citation.act} ${citation.section}`}
    >
      <span className="text-[10px] opacity-70">§</span>
      <span className="font-semibold">{citation.section}</span>
      <span className="text-[11px] opacity-80 truncate max-w-[150px]">
        {citation.act}
      </span>
    </button>
  );
}
