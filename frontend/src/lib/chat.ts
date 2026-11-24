import { filterValidCitations } from '@/lib/citations';
import type { Citation } from '@/types';
import { API_BASE } from '@/lib/api';

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
 * Communicates strictly with the live backend `/api/chat` endpoint.
 * Enforces a strict statutory citation lock against `laws_corpus.json`.
 */
export async function sendChatMessage(
  messages: ChatMessage[],
  lang: 'en' | 'bn' = 'en',
  onChunk?: (chunk: string) => void,
  attachments?: ChatAttachment[]
): Promise<ChatResponse> {
  const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');
  if (!lastUserMessage) {
    throw new Error('No user message provided to sendChatMessage');
  }

  const endpoint = `${API_BASE}/api/chat`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({
      messages,
      lang,
      attachments: lastUserMessage.attachments || attachments,
    }),
  });

  if (!response.ok) {
    throw new Error(`Chat request failed with status ${response.status}`);
  }

  const rawResponse = await response.json();

  if (onChunk && typeof rawResponse.content === 'string') {
    onChunk(rawResponse.content);
  }

  // Strict citation lock: verify each citation ID against laws_corpus.json
  const verifiedCitations: ChatCitation[] = [];
  if (rawResponse.citations && rawResponse.citations.length > 0) {
    const citationObjects: Citation[] = rawResponse.citations.map(
      (c: { id: string; act: string; section?: string; title?: string }) => ({
        id: c.id,
        act: c.act,
        section: c.section || '',
        title: c.title || '',
      })
    );

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
