'use client';

import React, { useMemo, useState } from 'react';

interface StreamingTextRendererProps {
  text: string;
  isStreaming: boolean;
  reducedMotion?: boolean;
}

interface CodeBlockProps {
  code: string;
  language: string;
  isTree: boolean;
}

function CodeBlock({ code, language, isTree }: CodeBlockProps) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedTree, setCopiedTree] = useState(false);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyTree = () => {
    navigator.clipboard.writeText(code);
    setCopiedTree(true);
    setTimeout(() => setCopiedTree(false), 2000);
  };

  return (
    <div className="my-3 rounded-lg border border-border/80 bg-[#1f1a17] text-[#f5f0e8] overflow-hidden shadow-sm">
      {/* Code Header Bar */}
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-[#171310] border-b border-border/40 text-[11px] font-mono">
        <span className="text-brass font-bold uppercase tracking-wider flex items-center gap-1.5">
          {isTree ? (
            <>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
              <span>Directory Structure</span>
            </>
          ) : (
            <span>{language || 'markdown'}</span>
          )}
        </span>

        <div className="flex items-center gap-2">
          {isTree && (
            <button
              type="button"
              onClick={handleCopyTree}
              className="px-2 py-0.5 rounded-sm hover:bg-white/10 text-brass hover:text-brass-light transition-colors cursor-pointer flex items-center gap-1"
              title="Copy tree text only"
            >
              <span>{copiedTree ? '✓ Tree Copied' : 'Copy tree'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleCopyCode}
            className="px-2 py-0.5 rounded-sm hover:bg-white/10 text-paper-dark hover:text-paper transition-colors cursor-pointer flex items-center gap-1"
            title="Copy block content"
          >
            <span>{copiedCode ? '✓ Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* Code Content with Horizontal Scroll */}
      <div className="p-3 sm:p-4 overflow-x-auto font-mono text-xs sm:text-[13px] leading-relaxed selection:bg-brass selection:text-ink">
        <pre className="whitespace-pre font-mono tracking-normal m-0">
          <code>
            {code.split('\n').map((line, idx) => {
              // Highlight tree branching lines
              const hasTreeGlyph = line.includes('├──') || line.includes('└──') || line.includes('│');
              const isFolder = line.trim().endsWith('/');

              return (
                <div key={idx} className="table-row">
                  <span
                    className={
                      hasTreeGlyph
                        ? isFolder
                          ? 'text-brass-light font-bold'
                          : 'text-paper-light'
                        : isFolder
                        ? 'text-brass font-semibold'
                        : 'text-paper-dark'
                    }
                  >
                    {line}
                  </span>
                </div>
              );
            })}
          </code>
        </pre>
      </div>
    </div>
  );
}

/**
 * Parses inline formatting: **bold**, *italic*, `code`, and plain text.
 */
function renderInlineContent(content: string, keyPrefix: string, isStreaming: boolean, reducedMotion: boolean) {
  // Regex to split by inline code, bold, and italic
  const parts = content.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g);

  return parts.map((part, pIdx) => {
    const key = `${keyPrefix}_${pIdx}`;

    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      return (
        <code
          key={key}
          className="font-mono text-xs bg-paper-dark/60 text-green-deep px-1.5 py-0.5 rounded-xs border border-border/70 select-text"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      return (
        <strong key={key} className="font-bold text-ink">
          {part.slice(2, -2)}
        </strong>
      );
    }

    if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
      return (
        <em key={key} className="italic text-ink-muted">
          {part.slice(1, -1)}
        </em>
      );
    }

    // Words streaming animation
    const words = part.split(' ');
    return (
      <span key={key}>
        {words.map((word, wIdx) => (
          <span
            key={`${key}_w_${wIdx}`}
            className={`inline-block mr-1 transition-all ${
              reducedMotion
                ? 'animate-fade-in'
                : isStreaming
                ? 'animate-word-stream'
                : ''
            }`}
          >
            {word}
          </span>
        ))}
      </span>
    );
  });
}

/**
 * Markdown & Streaming Content Renderer for Nothi AI Chat
 *
 * Renders:
 * - Fenced code blocks & file-trees with tree characters (├──, └──, │)
 * - Headings (#, ##, ###, ####)
 * - Tables with overflow-x-auto
 * - Checklists (- [ ], - [x])
 * - Unordered and ordered lists
 * - Blockquotes
 * - Word-by-word streaming without layout shift
 */
export const StreamingTextRenderer = React.memo(function StreamingTextRenderer({
  text,
  isStreaming,
  reducedMotion = false,
}: StreamingTextRendererProps) {
  const renderedElements = useMemo(() => {
    if (!text) return null;

    const elements: React.ReactNode[] = [];
    const lines = text.split('\n');
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();

      // ── 1. FENCED CODE BLOCK ──
      if (trimmed.startsWith('```')) {
        const langMatch = trimmed.match(/^```(\w+)?/);
        const language = langMatch && langMatch[1] ? langMatch[1].toLowerCase() : '';
        const codeLines: string[] = [];
        i++;

        while (i < lines.length && !lines[i].trim().startsWith('```')) {
          codeLines.push(lines[i]);
          i++;
        }
        // Skip closing ``` if found
        if (i < lines.length && lines[i].trim().startsWith('```')) {
          i++;
        }

        const codeContent = codeLines.join('\n');
        const isTree =
          language === 'tree' ||
          language === 'dir' ||
          codeContent.includes('├──') ||
          codeContent.includes('└──') ||
          codeContent.includes('│');

        elements.push(
          <CodeBlock
            key={`code_${i}`}
            code={codeContent}
            language={isTree ? 'tree' : language || 'text'}
            isTree={isTree}
          />
        );
        continue;
      }

      // ── 2. HEADINGS ──
      if (trimmed.startsWith('#')) {
        const hMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
        if (hMatch) {
          const level = hMatch[1].length;
          const headingText = hMatch[2];

          if (level === 1) {
            elements.push(
              <h1
                key={`h1_${i}`}
                className="font-heading text-xl sm:text-2xl font-bold text-green-deep mt-4 mb-2 tracking-tight"
                style={{ textWrap: 'balance' }}
              >
                {renderInlineContent(headingText, `h1_${i}`, isStreaming, reducedMotion)}
              </h1>
            );
          } else if (level === 2) {
            elements.push(
              <h2
                key={`h2_${i}`}
                className="font-heading text-lg sm:text-xl font-bold text-green-deep mt-3.5 mb-1.5 tracking-tight border-b border-border/50 pb-1"
                style={{ textWrap: 'balance' }}
              >
                {renderInlineContent(headingText, `h2_${i}`, isStreaming, reducedMotion)}
              </h2>
            );
          } else if (level === 3) {
            elements.push(
              <h3
                key={`h3_${i}`}
                className="font-heading text-base sm:text-lg font-bold text-ink mt-3 mb-1"
                style={{ textWrap: 'balance' }}
              >
                {renderInlineContent(headingText, `h3_${i}`, isStreaming, reducedMotion)}
              </h3>
            );
          } else {
            elements.push(
              <h4
                key={`h4_${i}`}
                className="font-heading text-sm sm:text-base font-semibold text-ink mt-2 mb-1"
                style={{ textWrap: 'balance' }}
              >
                {renderInlineContent(headingText, `h4_${i}`, isStreaming, reducedMotion)}
              </h4>
            );
          }
          i++;
          continue;
        }
      }

      // ── 3. MARKDOWN TABLE ──
      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        const tableLines: string[] = [];
        while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
          tableLines.push(lines[i].trim());
          i++;
        }

        if (tableLines.length >= 2) {
          const headerRow = tableLines[0]
            .split('|')
            .slice(1, -1)
            .map((c) => c.trim());
          // Check if second row is a delimiter row
          const isDelimiter = /^\|[-:\s|]+\|$/.test(tableLines[1]);
          const dataRows = isDelimiter
            ? tableLines.slice(2).map((r) =>
                r
                  .split('|')
                  .slice(1, -1)
                  .map((c) => c.trim())
              )
            : tableLines.slice(1).map((r) =>
                r
                  .split('|')
                  .slice(1, -1)
                  .map((c) => c.trim())
              );

          elements.push(
            <div
              key={`table_${i}`}
              className="my-3 overflow-x-auto rounded-lg border border-border/80 bg-paper-light shadow-2xs"
            >
              <table className="w-full text-left border-collapse text-xs font-sans">
                <thead>
                  <tr className="bg-paper-dark/60 border-b border-border/80">
                    {headerRow.map((h, hIdx) => (
                      <th key={hIdx} className="px-3.5 py-2 font-mono font-bold text-green-deep">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {dataRows.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-paper-dark/30 transition-colors">
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} className="px-3.5 py-2 text-ink leading-relaxed">
                          {renderInlineContent(cell, `td_${rIdx}_${cIdx}`, false, reducedMotion)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
          continue;
        }
      }

      // ── 4. TASK LIST (CHECKLIST) ──
      const taskMatch = trimmed.match(/^[-*]\s+\[([ xX])\]\s+(.+)$/);
      if (taskMatch) {
        const isChecked = taskMatch[1].toLowerCase() === 'x';
        const taskText = taskMatch[2];

        elements.push(
          <div key={`task_${i}`} className="flex items-start gap-2.5 py-1 pl-1 text-sm font-sans">
            <span
              className={`w-4 h-4 rounded-xs border mt-0.5 flex items-center justify-center text-[10px] shrink-0 ${
                isChecked
                  ? 'bg-green-deep border-green-deep text-paper font-bold'
                  : 'border-border bg-paper text-transparent'
              }`}
            >
              ✓
            </span>
            <div className={`flex-1 ${isChecked ? 'text-ink font-medium' : 'text-ink-muted'}`}>
              {renderInlineContent(taskText, `task_${i}`, isStreaming, reducedMotion)}
            </div>
          </div>
        );
        i++;
        continue;
      }

      // ── 5. BULLET LIST OR NUMBERED LIST ──
      const isBullet = trimmed.startsWith('- ') || trimmed.startsWith('• ') || trimmed.startsWith('* ');
      const isNumbered = /^\d+\.\s/.test(trimmed);

      if (isBullet || isNumbered) {
        const itemContent = isBullet
          ? trimmed.replace(/^[-•*]\s*/, '')
          : trimmed.replace(/^\d+\.\s*/, '');

        elements.push(
          <div
            key={`list_${i}`}
            className="flex items-start gap-2 pl-3 sm:pl-4 py-0.5 text-sm sm:text-base font-sans leading-relaxed"
          >
            {isBullet && <span className="text-brass select-none shrink-0 mt-1 font-bold">•</span>}
            {isNumbered && (
              <span className="font-mono text-xs text-brass select-none shrink-0 mt-0.5 font-bold">
                {trimmed.match(/^\d+\./)?.[0]}
              </span>
            )}
            <div className="flex-1">
              {renderInlineContent(itemContent, `li_${i}`, isStreaming, reducedMotion)}
            </div>
          </div>
        );
        i++;
        continue;
      }

      // ── 6. BLOCKQUOTE ──
      if (trimmed.startsWith('>')) {
        const quoteText = trimmed.replace(/^>\s*/, '');
        elements.push(
          <blockquote
            key={`quote_${i}`}
            className="border-l-3 border-brass bg-paper-dark/40 px-3.5 py-2 my-2 text-xs sm:text-sm italic text-ink-muted rounded-r-sm font-serif"
          >
            {renderInlineContent(quoteText, `quote_${i}`, isStreaming, reducedMotion)}
          </blockquote>
        );
        i++;
        continue;
      }

      // ── 7. EMPTY LINE / PARAGRAPH BREAK ──
      if (!trimmed) {
        elements.push(<div key={`empty_${i}`} className="h-2.5" />);
        i++;
        continue;
      }

      // ── 8. REGULAR PARAGRAPH ──
      elements.push(
        <p
          key={`p_${i}`}
          className="text-sm sm:text-base font-sans text-ink leading-relaxed mb-2"
          style={{ textWrap: 'pretty' }}
        >
          {renderInlineContent(trimmed, `p_${i}`, isStreaming, reducedMotion)}
        </p>
      );
      i++;
    }

    return elements;
  }, [text, isStreaming, reducedMotion]);

  return (
    <div className="text-base font-sans text-ink leading-relaxed select-text space-y-1">
      {renderedElements}

      {/* Blinking Brass Caret at end of streaming stream */}
      {isStreaming && (
        <span
          className="inline-block w-1.5 h-4 ml-1 bg-brass align-middle animate-pulse"
          aria-hidden="true"
        />
      )}

      <style jsx global>{`
        @keyframes wordStream {
          0% {
            opacity: 0;
            transform: translateY(2px);
            filter: blur(2px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
            filter: blur(0);
          }
        }
        .animate-word-stream {
          animation: wordStream 140ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-fade-in {
          animation: fadeIn 80ms ease-in forwards;
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
});
