import { describe, it, expect, vi } from 'vitest';
import { sendChatMessage } from '@/lib/chat';
import * as mockLayer from '@/mocks/chat';

describe('Nothi AI Chat Client & Citation Integrity', () => {
  it('returns citation-locked answers for in-corpus statutory queries', async () => {
    const response = await sendChatMessage(
      [
        {
          id: 'msg-1',
          role: 'user',
          content: 'How long can pass between signing and registering a deed?',
          timestamp: Date.now(),
        },
      ],
      'en'
    );

    expect(response.content).toContain('Section 23');
    expect(response.content).toContain('four months');
    expect(response.citations.length).toBeGreaterThan(0);
    expect(response.citations[0].id).toBe('reg_act_1908_s23');
  });

  it('handles out-of-corpus questions by refusing to fabricate and returning 0 citations', async () => {
    const response = await sendChatMessage(
      [
        {
          id: 'msg-2',
          role: 'user',
          content: 'What is the corporate income tax rate on dividends in Bangladesh?',
          timestamp: Date.now(),
        },
      ],
      'en'
    );

    expect(response.content).toContain('cannot find this specific inquiry in our verified statutory corpus');
    expect(response.citations).toHaveLength(0);
  });

  it('generates structured markdown with file tree, checklists, and statutory citations', async () => {
    const response = await sendChatMessage(
      [
        {
          id: 'msg-tree-1',
          role: 'user',
          content: 'show me the folder structure for a title vetting dossier',
          timestamp: Date.now(),
        },
      ],
      'en'
    );

    // Verify markdown structure components
    expect(response.content).toContain('# Property Deed Vetting Dossier Structure');
    expect(response.content).toContain('```tree');
    expect(response.content).toContain('├──');
    expect(response.content).toContain('└──');
    expect(response.content).toContain('- [x]');
    expect(response.content).toContain('- [ ]');
    expect(response.content).toContain('|');

    // Verify statutory citations are locked to verified corpus
    expect(response.citations.length).toBeGreaterThan(0);
    const validIds = response.citations.map((c) => c.id);
    expect(validIds).toContain('reg_act_1908_s23');
    expect(validIds).toContain('tpa_1882_s54');
    expect(validIds).toContain('nidw_rules_r3');
  });

  it('generates statutory vetting checklist with verified corpus compliance', async () => {
    const response = await sendChatMessage(
      [
        {
          id: 'msg-chk-1',
          role: 'user',
          content: 'give me a document checklist for Saf Kabala title clearance',
          timestamp: Date.now(),
        },
      ],
      'en'
    );

    expect(response.content).toContain('# Statutory Title Verification Checklist');
    expect(response.content).toContain('- [x]');
    expect(response.content).toContain('|');
    expect(response.citations.some((c) => c.id === 'reg_act_1908_s17')).toBe(true);
    expect(response.citations.some((c) => c.id === 'reg_act_1908_s23')).toBe(true);
  });

  it('generates title vetting memorandum in markdown', async () => {
    const response = await sendChatMessage(
      [
        {
          id: 'msg-memo-1',
          role: 'user',
          content: 'give me a title vetting memo outline with dossier structure',
          timestamp: Date.now(),
        },
      ],
      'en'
    );

    expect(response.content).toContain('# Statutory Title Vetting Memorandum');
    expect(response.content).toContain('```tree');
    expect(response.content).toContain('├──');
    expect(response.citations.some((c) => c.id === 'tpa_1882_s54')).toBe(true);
  });

  it('strictly strips any unknown or fabricated citation IDs before rendering', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Spy on generateMockChatResponse to inject a fabricated citation ID alongside a valid one
    vi.spyOn(mockLayer, 'generateMockChatResponse').mockResolvedValueOnce({
      content: 'Simulated answer with a real citation and a fabricated hallucination.',
      citations: [
        {
          id: 'reg_act_1908_s23',
          act: 'Registration Act, 1908',
          section: 'Section 23',
        },
        {
          id: 'reg_act_9999_completely_fake_section',
          act: 'Fake Act, 2099',
          section: 'Section 9999',
        },
      ],
    });

    const response = await sendChatMessage(
      [
        {
          id: 'msg-3',
          role: 'user',
          content: 'Test query for fabricated citation stripping',
          timestamp: Date.now(),
        },
      ],
      'en'
    );

    // Only the valid citation should remain
    expect(response.citations).toHaveLength(1);
    expect(response.citations[0].id).toBe('reg_act_1908_s23');

    // Console warning should have been logged for the unknown ID
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('reg_act_9999_completely_fake_section')
    );

    warnSpy.mockRestore();
    vi.restoreAllMocks();
  });
});
