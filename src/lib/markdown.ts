/**
 * Markdown Utilities for Nothi AI Chat
 *
 * Provides helper functions for detecting markdown structure,
 * generating sensible filenames from headings, and extracting file trees.
 */

/**
 * Checks if a string contains structured markdown elements:
 * headings, fenced code blocks, tables, checklists, or file trees.
 */
export function hasMarkdownStructure(text: string): boolean {
  if (!text) return false;
  // Code block fence
  if (text.includes('```')) return true;
  // File tree characters
  if (text.includes('├──') || text.includes('└──') || text.includes('│')) return true;
  // Headings
  if (/^#{1,4}\s+/m.test(text)) return true;
  // Markdown tables
  if (/\|.+\|[\r\n]+\|[-:\s|]+\|/m.test(text)) return true;
  // Task lists
  if (/^[-*]\s+\[[ xX]\]/m.test(text)) return true;
  return false;
}

/**
 * Extracts the text of the first markdown heading (# or ##), if present.
 */
export function extractFirstHeading(text: string): string | null {
  if (!text) return null;
  const match = text.match(/^#{1,4}\s+(.+)$/m);
  if (match && match[1]) {
    // Strip bold or link tags from heading
    return match[1].replace(/[*_`]/g, '').trim();
  }
  return null;
}

/**
 * Converts a heading into a clean, sensible filename (e.g., "vetting-checklist.md").
 */
export function generateFilenameFromHeading(text: string, fallback = 'nothi-ai-document'): string {
  const heading = extractFirstHeading(text);
  const base = heading || fallback;

  // Convert to lowercase, remove non-alphanumeric (keep hyphens and spaces), replace spaces with hyphens
  const slug = base
    .toLowerCase()
    .replace(/[^\w\s\u0980-\u09FF-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .substring(0, 50);

  return slug ? `${slug}.md` : `${fallback}.md`;
}

/**
 * Extracts the file tree text from a fenced code block, if present.
 */
export function extractTreeText(text: string): string | null {
  if (!text) return null;
  // Check for fenced block with tree characters
  const fenceRegex = /```(?:tree|text|bash|markdown|dir)?\s*([\s\S]*?)```/g;
  let match: RegExpExecArray | null;

  while ((match = fenceRegex.exec(text)) !== null) {
    const code = match[1];
    if (code.includes('├──') || code.includes('└──') || code.includes('│')) {
      return code.trim();
    }
  }

  // Fallback: check if tree characters appear in raw text
  if (text.includes('├──') || text.includes('└──')) {
    const lines = text.split('\n');
    const treeLines = lines.filter(
      (l) => l.includes('├──') || l.includes('└──') || l.includes('│') || l.trim().endsWith('/')
    );
    if (treeLines.length > 0) {
      return treeLines.join('\n').trim();
    }
  }

  return null;
}
