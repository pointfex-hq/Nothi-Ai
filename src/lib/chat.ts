import { filterValidCitations } from '@/lib/citations';
import { generateMockChatResponse } from '@/mocks/chat';
import type { Citation } from '@/types';

export interface ChatCitation {
  id: string;
  act: string;
  section?: string;
}

export interface ChatAttachment {
  id: string;
  name: string;
  type: 'image' | 'pdf';
  size: number;
  dataUrl?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: ChatCitation[];
  attachments?: ChatAttachment[];
  timestamp: number;
}

export interface ChatResponse {
  content: string;
  citations: ChatCitation[];
}

/**
 * Chat Client Interface
 *
 * Currently routes to the deterministic statutory mock engine in /src/mocks/chat.ts.
 * To connect to the FastAPI backend, replace the body below to POST to /api/chat.
 * The request/response interface and citation verification invariants remain identical.
 */
export async function sendChatMessage(
  messages: ChatMessage[],
  lang: 'en' | 'bn' = 'en',
  onChunk?: (chunk: string) => void
): Promise<ChatResponse> {
  const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');
  if (!lastUserMessage) {
    throw new Error('No user message provided to sendChatMessage');
  }

  // 1. Generate statutory answer from mock layer
  const rawResponse = await generateMockChatResponse(
    lastUserMessage.content,
    lang,
    onChunk,
    lastUserMessage.attachments
  );

  // 2. Strict citation lock: verify each citation ID against laws_corpus.json
  const verifiedCitations: ChatCitation[] = [];
  if (rawResponse.citations && rawResponse.citations.length > 0) {
    const citationObjects: Citation[] = rawResponse.citations.map((c) => ({
      id: c.id,
      act: c.act,
      section: c.section || '',
      title: '',
    }));

    // Filter using the app's canonical statutory verification engine
    const filtered = filterValidCitations(citationObjects);
    for (const valid of filtered) {
      verifiedCitations.push({
        id: valid.id,
        act: valid.act,
        section: valid.section,
      });
    }
  }

  return {
    content: rawResponse.content,
    citations: verifiedCitations,
  };
}
