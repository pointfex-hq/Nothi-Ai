/**
 * Nothi AI API Client
 *
 * Single unified client interface communicating strictly with the live
 * Node.js Express backend (`backend/`) via Next.js `/api` proxy rewrites.
 */

import type {
  AuditBundle,
  AuditResult,
  CorpusSection,
  PipelineProgress,
  PipelineStage,
  UploadedFile,
} from '@/types';
import { PIPELINE_STAGES } from '@/types';
import { getCorpusSectionById, getAllCorpusSections } from '@/lib/citations';
import type {
  ServerUser,
  ServerChat,
  ServerChatSummary,
  ServerChatMessage,
  ServerAttachment,
  ServerAttachmentPage,
  ServerUsageLimits,
  ServerAdminUser,
  ServerAuditLog,
} from '@/types/server';

export * from '@/types/server';

// Resolves API base URL. Empty string defaults to same-origin Next.js rewrites (/api)
export const API_BASE = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const headers = new Headers(options.headers || {});

  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: options.credentials || 'include',
  });

  if (!response.ok) {
    let errorMessage = `API request failed with status ${response.status}`;
    try {
      const errorJson = await response.json();
      if (errorJson && typeof errorJson.error === 'string') {
        errorMessage = errorJson.error;
      }
    } catch {
      // response was not JSON
    }
    throw new Error(errorMessage);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

// ── Live Backend API Interface (`backend/`) ────────────────────

export const serverApi = {
  /** Check backend health */
  async health(): Promise<{ status: string }> {
    return apiRequest<{ status: string }>('/api/health');
  },

  /** Role-based Authentication endpoints */
  auth: {
    async getSession(): Promise<{ user: ServerUser | null }> {
      return apiRequest<{ user: ServerUser | null }>('/api/auth/session');
    },

    async register(credentials: {
      username?: string;
      email?: string;
      password: string;
    }): Promise<{ user: ServerUser }> {
      return apiRequest<{ user: ServerUser }>('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });
    },

    async signIn(credentials: {
      username?: string;
      email?: string;
      password: string;
    }): Promise<{ user: ServerUser }> {
      return apiRequest<{ user: ServerUser }>('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });
    },

    async login(credentials: {
      username?: string;
      email?: string;
      password: string;
    }): Promise<{ user: ServerUser }> {
      return this.signIn(credentials);
    },

    async signOut(): Promise<{ user: null }> {
      return apiRequest<{ user: null }>('/api/auth/logout', {
        method: 'POST',
      });
    },

    async logout(): Promise<{ user: null }> {
      return this.signOut();
    },

    async updateProfile(data: {
      name?: string;
      currentPassword?: string;
      newPassword?: string;
    }): Promise<{ user: ServerUser }> {
      return apiRequest<{ user: ServerUser }>('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    },
  },

  /** Statutory Audit Pipeline endpoints */
  audit: {
    async upload(bundle: AuditBundle): Promise<UploadedFile[]> {
      return apiRequest<UploadedFile[]>('/api/audit/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bundle),
      });
    },

    async run(bundle: AuditBundle): Promise<AuditResult> {
      return apiRequest<AuditResult>('/api/audit/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bundle),
      });
    },
  },

  /** Multi-turn chat & document attachment endpoints */
  chats: {
    async list(): Promise<ServerChatSummary[]> {
      return apiRequest<ServerChatSummary[]>('/api/chats');
    },

    async getQuota(): Promise<{
      questionsUsed: number;
      questionsLimit: number;
      tokensUsed: number;
      tokensLimit: number;
      questionsPerMinute: number;
      resetAt: string;
    }> {
      return apiRequest('/api/chats/quota');
    },

    async create(data?: {
      id?: string;
      title?: string;
      messages?: ServerChatMessage[];
      attachments?: { pdf: ServerAttachment | null; photo: ServerAttachment | null };
    }): Promise<ServerChat> {
      return apiRequest<ServerChat>('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data || {}),
      });
    },

    async update(
      chatId: string,
      data: {
        title?: string;
        messages?: ServerChatMessage[];
        attachments?: { pdf: ServerAttachment | null; photo: ServerAttachment | null };
        updatedAt?: number;
      }
    ): Promise<ServerChat> {
      return apiRequest<ServerChat>(`/api/chats/${chatId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    },

    async get(chatId: string): Promise<ServerChat> {
      return apiRequest<ServerChat>(`/api/chats/${chatId}`);
    },

    async delete(chatId: string): Promise<{ id: string }> {
      return apiRequest<{ id: string }>(`/api/chats/${chatId}`, {
        method: 'DELETE',
      });
    },

    async uploadDocument(
      chatId: string,
      file: Blob | ArrayBuffer,
      filename: string,
      mimeType: string
    ): Promise<ServerChat> {
      return apiRequest<ServerChat>(`/api/chats/${chatId}/document`, {
        method: 'POST',
        headers: {
          'Content-Type': mimeType,
          'X-File-Name': encodeURIComponent(filename),
        },
        body: file,
      });
    },

    async deleteDocument(
      chatId: string,
      kind: 'pdf' | 'photo'
    ): Promise<ServerChat> {
      return apiRequest<ServerChat>(`/api/chats/${chatId}/document/${kind}`, {
        method: 'DELETE',
      });
    },

    async updatePhotoText(
      chatId: string,
      text: string
    ): Promise<ServerChat> {
      return apiRequest<ServerChat>(`/api/chats/${chatId}/document`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
    },

    async sendMessage(
      chatId: string,
      question: string,
      mode: 'document' | 'legal' = 'document'
    ): Promise<ServerChat> {
      return apiRequest<ServerChat>(`/api/chats/${chatId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, mode }),
      });
    },
  },

  /** Direct QA over extracted document pages */
  async ask(
    question: string,
    pages: ServerAttachmentPage[]
  ): Promise<{ answer: string }> {
    return apiRequest<{ answer: string }>('/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, pages }),
    });
  },

  /** OCR single image directly */
  async ocr(imageBytes: Blob | ArrayBuffer, mimeType = 'image/jpeg'): Promise<{ text: string }> {
    return apiRequest<{ text: string }>('/api/ocr', {
      method: 'POST',
      headers: { 'Content-Type': mimeType },
      body: imageBytes,
    });
  },

  /** PDF text extraction */
  async extractPdf(
    pdfBytes: Blob | ArrayBuffer
  ): Promise<{ pages: ServerAttachmentPage[] }> {
    return apiRequest<{ pages: ServerAttachmentPage[] }>('/api/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/pdf' },
      body: pdfBytes,
    });
  },

  /** Admin RBAC settings */
  admin: {
    async getUsageLimits(): Promise<ServerUsageLimits> {
      return apiRequest<ServerUsageLimits>('/api/admin/usage-limits');
    },

    async saveUsageLimits(
      limits: Partial<ServerUsageLimits>
    ): Promise<ServerUsageLimits> {
      return apiRequest<ServerUsageLimits>('/api/admin/usage-limits', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(limits),
      });
    },

    async getUsers(): Promise<ServerAdminUser[]> {
      return apiRequest<ServerAdminUser[]>('/api/admin/users');
    },

    async updateUserStatus(id: string, status: 'active' | 'suspended'): Promise<ServerAdminUser> {
      return apiRequest<ServerAdminUser>(`/api/admin/users/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
    },

    async deleteUser(id: string): Promise<{ success: boolean; id: string }> {
      return apiRequest<{ success: boolean; id: string }>(`/api/admin/users/${id}`, {
        method: 'DELETE',
      });
    },

    async getAuditLogs(): Promise<ServerAuditLog[]> {
      return apiRequest<ServerAuditLog[]>('/api/admin/audit-logs');
    },
  },
};

// ── Live Audit Workspace Client ────────────────────────────────

export async function uploadBundle(bundle: AuditBundle): Promise<UploadedFile[]> {
  return serverApi.audit.upload(bundle);
}

export async function runAudit(
  bundle: AuditBundle,
  onProgress?: (progress: PipelineProgress) => void
): Promise<AuditResult> {
  const completedStages: PipelineStage[] = [];
  const start = Date.now();

  for (const stage of PIPELINE_STAGES) {
    onProgress?.({
      currentStage: stage,
      completedStages: [...completedStages],
      elapsedMs: Date.now() - start,
    });
    completedStages.push(stage);
  }

  // Call live backend endpoint
  const result = await serverApi.audit.run(bundle);

  onProgress?.({
    currentStage: 'ui',
    completedStages: PIPELINE_STAGES,
    elapsedMs: Date.now() - start,
  });

  return result;
}

// ── Corpus Lookup ──────────────────────────────────────────────

export async function getCorpusSection(id: string): Promise<CorpusSection | null> {
  return getCorpusSectionById(id) ?? null;
}

export async function getFullCorpus(): Promise<CorpusSection[]> {
  return getAllCorpusSections();
}
