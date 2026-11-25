import { describe, it, expect } from 'vitest';
import {
  hasMarkdownStructure,
  extractFirstHeading,
  generateFilenameFromHeading,
  extractTreeText,
} from '@/lib/markdown';
import { filterValidCitations } from '@/lib/citations';
import type { Citation } from '@/types';

describe('Markdown Utilities & File Structure Generation', () => {
  it('correctly identifies structured markdown elements', () => {
    // Fenced code block
    expect(hasMarkdownStructure('```tree\nfolder/\n└── file.txt\n```')).toBe(true);

    // Box-drawing file tree characters
    expect(hasMarkdownStructure('folder/\n├── file1.pdf\n└── file2.pdf')).toBe(true);

    // Markdown headings
    expect(hasMarkdownStructure('# Vetting Dossier\nSome content here')).toBe(true);
    expect(hasMarkdownStructure('### Section Analysis')).toBe(true);

    // Markdown table
    expect(hasMarkdownStructure('| Section | Act | Status |\n|---|---|---|\n| Sec 23 | Reg Act | Valid |')).toBe(true);

    // Checklists
    expect(hasMarkdownStructure('- [ ] Verify 3-month ordinary presentation deadline')).toBe(true);
    expect(hasMarkdownStructure('- [x] NID 10-digit format verified')).toBe(true);

    // Plain text without structure
    expect(hasMarkdownStructure('This is a simple plain text message without markdown.')).toBe(false);
    expect(hasMarkdownStructure('')).toBe(false);
  });

  it('extracts the first heading cleanly from markdown content', () => {
    const text1 = '# Property Deed Vetting Dossier Structure\n\nIntroductory text here.';
    expect(extractFirstHeading(text1)).toBe('Property Deed Vetting Dossier Structure');

    const text2 = 'Some intro\n## Statutory Title Verification Checklist\n- [ ] Task 1';
    expect(extractFirstHeading(text2)).toBe('Statutory Title Verification Checklist');

    const textWithFormatting = '# **Saf Kabala** Title Dossier\nDetails';
    expect(extractFirstHeading(textWithFormatting)).toBe('Saf Kabala Title Dossier');

    expect(extractFirstHeading('Plain text without any heading')).toBeNull();
    expect(extractFirstHeading('')).toBeNull();
  });

  it('generates a clean, sensible filename derived from the first heading', () => {
    const text1 = '# Property Deed Vetting Dossier Structure\n```tree\n...```';
    expect(generateFilenameFromHeading(text1)).toBe('property-deed-vetting-dossier-structure.md');

    const text2 = '# Statutory Title Verification Checklist\n- [x] Done';
    expect(generateFilenameFromHeading(text2)).toBe('statutory-title-verification-checklist.md');

    const text3 = '# Title Vetting Memo: Plot 892 (Saf Kabala)!\nMemo body';
    expect(generateFilenameFromHeading(text3)).toBe('title-vetting-memo-plot-892-saf-kabala.md');

    // Fallback when no heading is present
    expect(generateFilenameFromHeading('Plain text without heading', 'nothi-ai-report')).toBe('nothi-ai-report.md');
    expect(generateFilenameFromHeading('')).toBe('nothi-ai-document.md');
  });

  it('extracts clean file tree text without backtick fences', () => {
    const markdownWithFence = `
Here is the dossier structure:

\`\`\`tree
vetting-dossier/
├── 01_deed/
│   └── saf_kabala.pdf
└── 02_khatian/
    └── rs_khatian.pdf
\`\`\`

End of memo.
`;

    const tree = extractTreeText(markdownWithFence);
    expect(tree).not.toBeNull();
    expect(tree).toContain('├── 01_deed/');
    expect(tree).toContain('└── 02_khatian/');
    expect(tree).not.toContain('```');

    // Handles text without tree
    expect(extractTreeText('Just regular text')).toBeNull();
  });

  it('strictly validates citations inside markdown file structures against verified corpus', () => {
    // Given citation candidates including valid corpus IDs and a fake hallucinated ID
    const candidates: Citation[] = [
      {
        id: 'reg_act_1908_s23',
        act: 'Registration Act, 1908',
        section: 'Section 23',
        title: 'Time for presenting documents',
      },
      {
        id: 'tpa_1882_s54',
        act: 'Transfer of Property Act, 1882',
        section: 'Section 54',
        title: 'Sale defined',
      },
      {
        id: 'fake_hallucinated_section_999',
        act: 'Imaginary Act, 2099',
        section: 'Section 999',
        title: 'Fabricated Rule',
      },
    ];

    const verified = filterValidCitations(candidates);

    // Placeholder and fabricated IDs must be stripped.
    expect(verified).toHaveLength(1);
    expect(verified.map((c) => c.id)).toEqual(['reg_act_1908_s23']);
    expect(verified.some((c) => c.id === 'fake_hallucinated_section_999')).toBe(false);
  });
});
