/**
 * Server API types matching backend/ endpoints
 */

export interface ServerUser {
  id: string;
  username: string;
  name?: string;
  role: 'admin' | 'user';
  status?: 'active' | 'suspended' | 'banned';
  createdAt?: number;
  isEnvAccount?: boolean;
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
  timestamp?: number;
  attachments?: unknown[];
}

export interface ServerChat {
  outOfScope?: true;
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

export interface ServerAdminUser {
  id: string;
  username: string;
  email: string;
  name?: string;
  role: 'admin' | 'user';
  status: 'active' | 'suspended' | 'banned';
  createdAt: number;
  isEnvAccount?: boolean;
  chatCount: number;
  recordedTokensToday: number;
  recordedTokensTotal: number;
}

export interface ServerAuditLog {
  id: string;
  action: string;
  adminId: string | null;
  targetId?: string | null;
  details?: string;
  timestamp: number;
}
