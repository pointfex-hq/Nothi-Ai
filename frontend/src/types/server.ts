/**
 * Server API types matching server/ endpoints
 */

export interface ServerUser {
  id: string;
  username: string;
  role: 'admin' | 'user';
}

export interface ServerChatSummary {
  id: string;
  title: string;
  updatedAt: number;
}

export interface ServerAttachmentPage {
  pageNumber: number;
  text: string;
}

export interface ServerAttachment {
  name: string;
  kind: 'pdf' | 'photo';
  pages: ServerAttachmentPage[];
}

export interface ServerUpload {
  name: string;
  status: 'processing' | 'failed';
  error?: string;
}

export interface ServerChatMessage {
  id: string;
  role: 'user' | 'assistant';
  mode?: 'document' | 'legal';
  content: string;
  citations?: Array<{
    id: number | string;
    kind: string;
    label: string;
    lawTitle?: string;
    section?: string;
    jurisdiction?: string;
    officialUrl?: string;
    pageNumber?: number;
  }>;
}

export interface ServerChat {
  id: string;
  title: string;
  updatedAt: number;
  attachments: {
    pdf: ServerAttachment | null;
    photo: ServerAttachment | null;
  };
  uploads: {
    pdf: ServerUpload | null;
    photo: ServerUpload | null;
  };
  messages: ServerChatMessage[];
  busy: string | null;
}

export interface ServerUsageLimits {
  questionsPerMinute: number;
  questionsPerDay: number;
  maxOutputTokens: number;
  dailyTokenBudget: number;
}

