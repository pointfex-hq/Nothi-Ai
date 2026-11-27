'use client';

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  useSyncExternalStore,
  KeyboardEvent,
  DragEvent,
  ChangeEvent,
} from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLang } from '@/lib/lang';
import { AnimatedLogo, LogoState } from '@/components/chat/AnimatedLogo';
import { CorpusListModal } from '@/components/chat/CorpusListModal';
import { CitationPopover } from '@/components/chat/CitationPopover';
import { ThinkingStageIndicator, PipelineStage } from '@/components/chat/ThinkingStageIndicator';
import { StreamingTextRenderer } from '@/components/chat/StreamingTextRenderer';
import { VoiceInputButton } from '@/components/chat/VoiceInputButton';
import { ChatSessionMenu } from '@/components/chat/ChatSessionMenu';
import { DrawerDetailModal } from '@/components/landing/citation-gate/DrawerDetailModal';
import { useAuth } from '@/lib/auth';
import { SignInModal } from '@/components/auth/SignInModal';
import { UserMenu } from '@/components/auth/UserMenu';
import { sendChatMessage, ChatMessage, ChatAttachment, ChatCitation } from '@/lib/chat';
import { hasMarkdownStructure, generateFilenameFromHeading } from '@/lib/markdown';
import { serverApi, ServerChatMessage } from '@/lib/api';
import type { CorpusSection } from '@/types';

export type AskMode = 'legal' | 'document' | 'statutory';

interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  messages: ChatMessage[];
}

function makeId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
}

function nowTimestamp(): number {
  return Date.now();
}

const STORAGE_SESSIONS_KEY = 'nothi_ai_sessions_v4';

const emptySubscribe = () => () => { };
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

const subscribeWindowResize = (callback: () => void) => {
  window.addEventListener('resize', callback);
  return () => window.removeEventListener('resize', callback);
};
const getIsDesktopSnapshot = () => window.innerWidth >= 768;
const getIsDesktopServerSnapshot = () => true;

// 4 Plain Text Suggestions for Clerk's Reading Room Empty State
const EMPTY_SUGGESTIONS = [
  {
    textEn: 'How long can pass between signing and registering a Saf Kabala deed?',
    textBn: 'সাফ কবলা দলিল সম্পাদনের পর কতদিনের মধ্যে তা রেজিস্ট্রি করতে হবে?',
  },
  {
    textEn: 'What makes an NID number valid?',
    textBn: 'জাতীয় পরিচয়পত্র (এনআইডি) নম্বর কী কারণে সংবিধিবদ্ধভাবে বৈধ হয়?',
  },
  {
    textEn: 'What does a Dag number mismatch mean?',
    textBn: 'দলিল ও খতিয়ানের দাগ নম্বরের গরমিলের আইনি ফলাফল কী?',
  },
  {
    textEn: 'What is a Khatian used for?',
    textBn: 'সম্পত্তি হস্তান্তরে খতিয়ান (স্বত্বলিপির) মূল ভূমিকা কী?',
  },
];

// Interactive Sample Property Documents for Instant Inspection
const SAMPLE_DOCS = [
  {
    name: 'Saf_Kabala_Deed_4812.pdf',
    type: 'pdf' as const,
    size: 420 * 1024,
    labelEn: 'Sample Deed (Saf Kabala)',
    labelBn: 'নমুনা সাফ কবলা দলিল',
    queryEn: 'Verify Section 23 4-month presentation window and compulsory registration for this deed.',
    queryBn: 'এই দলিলের ৪ মাসের রেজিস্ট্রেশন সময়সীমা ও ধারা ১৭ এর শর্তাবলি পরীক্ষা করুন।',
  },
  {
    name: 'RS_Khatian_Ledger_104.png',
    type: 'image' as const,
    size: 280 * 1024,
    dataUrl:
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="400" height="300" fill="%23f6f1e7"/><text x="20" y="40" font-family="serif" font-size="18" fill="%231b4332">Collectorate RS Khatian 104</text><text x="20" y="80" font-family="sans-serif" font-size="14" fill="%231a1a18">Mouza: Tejgaon • JL No. 24</text><text x="20" y="110" font-family="sans-serif" font-size="14" fill="%231a1a18">Dag No: 892 • Area: 0.1650 Acre</text><text x="20" y="140" font-family="sans-serif" font-size="14" fill="%231a1a18">Owner: Md. Rafiqul Islam</text><rect x="20" y="180" width="360" height="80" rx="4" fill="%23ede7db"/><text x="30" y="215" font-family="monospace" font-size="12" fill="%231b4332">Status: Parity Verified (TPA 1882 S.54)</text></svg>',
    labelEn: 'Sample RS Khatian',
    labelBn: 'নমুনা আরএস খতিয়ান',
    queryEn: 'Verify Dag schedule allocations and Khatian title continuity.',
    queryBn: 'এই আরএস খতিয়ানের দাগ নম্বর ও স্বত্বলিপির ধারাবাহিকতা নিরীক্ষা করুন।',
  },
  {
    name: 'Smart_NID_Card.png',
    type: 'image' as const,
    size: 190 * 1024,
    dataUrl:
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="240" viewBox="0 0 400 240"><rect width="400" height="240" rx="12" fill="%23ede7db" stroke="%23b08d57" stroke-width="2"/><text x="30" y="45" font-family="sans-serif" font-weight="bold" font-size="16" fill="%231b4332">Government of Bangladesh</text><text x="30" y="70" font-family="sans-serif" font-size="12" fill="%234a4a45">National ID Smart Card</text><rect x="30" y="90" width="70" height="90" fill="%23c9c0b0" rx="4"/><text x="120" y="115" font-family="sans-serif" font-size="14" fill="%231a1a18">Name: Md. Rafiqul Islam</text><text x="120" y="145" font-family="sans-serif" font-size="14" fill="%231a1a18">Father: Late Abul Kashem</text><text x="120" y="175" font-family="monospace" font-weight="bold" font-size="14" fill="%231b4332">NID: 19882692015000142</text></svg>',
    labelEn: 'Sample Smart NID',
    labelBn: 'নমুনা স্মার্ট এনআইডি',
    queryEn: 'Verify structural format parity and citizen validity under NID Rule 3.',
    queryBn: 'জাতীয় পরিচয়পত্র বিধি ৩ অনুসারে এই এনআইডি নম্বরের কাঠামোগত বৈধতা পরীক্ষা করুন।',
  },
];

// Contextual follow-up chips (max 2 per assistant answer)
function getFollowUpChips(content: string, lang: 'en' | 'bn'): string[] {
  const lower = content.toLowerCase();
  if (lower.includes('23') || lower.includes('four month') || lower.includes('৪ মাস') || lower.includes('presentation')) {
    return lang === 'bn'
      ? ['ধারা ২৪ এর অধীনে বিলম্ব কি মওকুফযোগ্য?', 'দেরিতে দলিলের জন্য শাস্তি কী?']
      : ['Can Section 24 extend this deadline?', 'What are the penalties for late presentation?'];
  }
  if (lower.includes('nid') || lower.includes('স্মার্ট') || lower.includes('পরিচয়পত্র') || lower.includes('rule 3')) {
    return lang === 'bn'
      ? ['৯-সংখ্যার এনআইডি কি বৈধ?', 'বিধি ৫ কীভাবে নাম যাচাই করে?']
      : ['Can a 9-digit NID be verified?', 'How does Rule 5 check party names?'];
  }
  if (lower.includes('dag') || lower.includes('দাগ') || lower.includes('mismatch')) {
    return lang === 'bn'
      ? ['দাগ নম্বরের গরমিল কীভাবে সংশোধন করা যায়?', 'আরএস ও বিএস খতিয়ানের পার্থক্য কী?']
      : ['How to rectify a Dag mismatch?', 'What is the difference between RS and BS Khatians?'];
  }
  if (lower.includes('khatian') || lower.includes('খতিয়ান')) {
    return lang === 'bn'
      ? ['নামজারি খতিয়ান কীভাবে যাচাই হয়?', 'দলিলের আগে খতিয়ান কেন বাধ্যতামূলক?']
      : ['How is a Mutation Khatian verified?', 'Why is Khatian compulsory before deed registration?'];
  }
  return lang === 'bn'
    ? ['কোন দলিলগুলো বাধ্যতামূলকভাবে রেজিস্ট্রি করতে হয়?', 'লিস পেনডেন্স নীতি কীভাবে প্রযোজ্য?']
    : ['What documents are compulsorily registered?', 'How does Lis Pendens affect title?'];
}

function loadUserCachedSessions(userId?: string): { sessions: ChatSession[]; activeSessionId: string } {
  if (typeof window === 'undefined' || !userId) {
    return { sessions: [], activeSessionId: '' };
  }

  const userKey = `nothi_ai_sessions_${userId}`;
  const userActiveKey = `nothi_ai_active_session_${userId}`;
  try {
    const stored = localStorage.getItem(userKey);
    const parsed: ChatSession[] = stored ? JSON.parse(stored) : [];
    const savedActiveId = localStorage.getItem(userActiveKey);
    const activeId =
      savedActiveId && parsed.some((s) => s.id === savedActiveId)
        ? savedActiveId
        : (parsed[0]?.id || '');

    return { sessions: parsed, activeSessionId: activeId };
  } catch {
    return { sessions: [], activeSessionId: '' };
  }
}

export default function ChatPage() {
  const router = useRouter();
  const { lang, setLang } = useLang();
  const { user } = useAuth();
  const [signInModalOpen, setSignInModalOpen] = useState(false);

  // Auth & Session States
  const currentUserId = user?.id ?? null;
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [sessionsLoaded, setSessionsLoaded] = useState(false);
  const [askMode, setAskMode] = useState<AskMode>('legal');
  const [quota, setQuota] = useState<{
    questionsUsed: number;
    questionsLimit: number;
    tokensUsed: number;
    tokensLimit: number;
    questionsPerMinute: number;
    resetAt: string;
  } | null>(null);
  const [inspectingAttachment, setInspectingAttachment] = useState<{
    name: string;
    text: string;
  } | null>(null);

  const refreshQuota = useCallback(async () => {
    if (!user) return;
    try {
      const q = await serverApi.chats.getQuota();
      setQuota(q);
    } catch (err) {
      console.warn('Could not refresh quota:', err);
    }
  }, [user]);

  useEffect(() => {
    let active = true;

    async function syncSessions() {
      if (!currentUserId) {
        if (active) {
          setSessions([]);
          setActiveSessionId('');
          setSessionsLoaded(true);
        }
        return;
      }

      const urlParams = new URLSearchParams(window.location.search);
      const urlParamId = urlParams.get('id');

      // 1. Fetch live sessions from backend server
      try {
        const [serverList, quotaData] = await Promise.all([
          serverApi.chats.list(),
          serverApi.chats.getQuota().catch(() => null),
        ]);
        if (active && quotaData) {
          setQuota(quotaData);
        }
        if (!active) return;

        if (Array.isArray(serverList) && serverList.length > 0) {
          const userActiveKey = `nothi_ai_active_session_${currentUserId}`;
          const savedActiveId = localStorage.getItem(userActiveKey);
          const chosenActiveId =
            urlParamId && serverList.some((s) => s.id === urlParamId)
              ? urlParamId
              : savedActiveId && serverList.some((s) => s.id === savedActiveId)
              ? savedActiveId
              : serverList[0].id;

          let activeFullChat = null;
          try {
            activeFullChat = await serverApi.chats.get(chosenActiveId);
          } catch (e) {
            console.warn('Could not fetch active chat details:', e);
          }

          if (activeFullChat && Array.isArray(activeFullChat.messages) && activeFullChat.messages.length > 0) {
            const lastMode = activeFullChat.messages[activeFullChat.messages.length - 1]?.mode;
            if (lastMode === 'legal' || lastMode === 'document') {
              setAskMode(lastMode);
            }
          }

          const mappedSessions: ChatSession[] = serverList.map((item) => {
            if (item.id === chosenActiveId && activeFullChat) {
              return {
                id: activeFullChat.id,
                title: activeFullChat.title || item.title || 'Property Examination',
                createdAt: item.updatedAt || Date.now(),
                messages: (activeFullChat.messages || []).map((m: ServerChatMessage) => ({
                  id: m.id,
                  role: m.role,
                  mode: m.mode,
                  content: m.content,
                  citations: Array.isArray(m.citations)
                    ? m.citations.map((c: { id?: string | number; section?: string; lawTitle?: string; label?: string; officialUrl?: string }) => ({
                        id: String(c.id || c.section || 'statute'),
                        act: c.lawTitle || c.label || 'The Transfer of Property Act, 1882',
                        section: c.section ? (String(c.section).startsWith('s.') ? String(c.section) : `s. ${c.section}`) : (c.label || ''),
                        officialUrl: c.officialUrl,
                        label: c.label,
                      }))
                    : (m.citations as ChatCitation[] | undefined),
                  attachments: m.attachments as ChatAttachment[] | undefined,
                  timestamp: m.timestamp || Date.now(),
                })),
              };
            }
            return {
              id: item.id,
              title: item.title || 'Property Examination',
              createdAt: item.updatedAt || Date.now(),
              messages: [],
            };
          });

          if (active) {
            setSessions(mappedSessions);
            setActiveSessionId(chosenActiveId);
            setSessionsLoaded(true);
            try {
              localStorage.setItem(`nothi_ai_sessions_${currentUserId}`, JSON.stringify(mappedSessions));
              localStorage.setItem(userActiveKey, chosenActiveId);
            } catch {}
            return;
          }
        }
      } catch (err) {
        console.warn('Could not fetch server sessions, falling back to local cache:', err);
      }

      // 2. Fallback to local storage cache if server was empty or unreachable
      if (!active) return;
      const cached = loadUserCachedSessions(currentUserId);
      if (cached.sessions.length > 0) {
        setSessions(cached.sessions);
        setActiveSessionId(
          urlParamId && cached.sessions.some((s) => s.id === urlParamId)
            ? urlParamId
            : cached.activeSessionId
        );
        setSessionsLoaded(true);
        return;
      }

      // 3. User has zero sessions on server and in cache (clean initial reading room)
      if (active) {
        setSessions([]);
        setActiveSessionId('');
        setSessionsLoaded(true);
      }
    }

    syncSessions();
    return () => {
      active = false;
    };
  }, [currentUserId]);
  const isDesktop = useSyncExternalStore(
    subscribeWindowResize,
    getIsDesktopSnapshot,
    getIsDesktopServerSnapshot
  );
  const [userSidebarToggle, setUserSidebarToggle] = useState<boolean | null>(null);
  const sidebarOpen = userSidebarToggle !== null ? userSidebarToggle : isDesktop;
  const setSidebarOpen = useCallback(
    (open: boolean | ((prev: boolean) => boolean)) => {
      setUserSidebarToggle((prevVal) => {
        const current = prevVal !== null ? prevVal : isDesktop;
        return typeof open === 'function' ? open(current) : open;
      });
    },
    [isDesktop]
  );
  const mounted = useSyncExternalStore(emptySubscribe, getClientSnapshot, getServerSnapshot);

  // Input & Attachment States
  const [inputText, setInputText] = useState('');
  const [attachments, setAttachments] = useState<
    (ChatAttachment & { uploadProgress?: number })[]
  >([]);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Pipeline Thinking & Streaming States
  const [isThinking, setIsThinking] = useState(false);
  const [thinkingStage, setThinkingStage] = useState<PipelineStage>('reading');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isErrorState, setIsErrorState] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [logoState, setLogoState] = useState<LogoState>('idle');

  // Modal & Inspector States
  const [activeCitationSection, setActiveCitationSection] = useState<CorpusSection | null>(null);
  const [corpusListOpen, setCorpusListOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [feedbackState, setFeedbackState] = useState<Record<string, 'up' | 'down'>>({});
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  // DOM Refs
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatScrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<boolean>(false);

  const persistSessions = useCallback(
    (newSessions: ChatSession[]) => {
      setSessions(newSessions);
      if (!user) return;
      const userKey = `nothi_ai_sessions_${user.id}`;
      try {
        localStorage.setItem(userKey, JSON.stringify(newSessions));
      } catch (e) {
        console.warn('Unable to persist chat sessions to localStorage:', e);
      }
    },
    [user]
  );

  const activeSession = useMemo(() => {
    return sessions.find((s) => s.id === activeSessionId) || sessions[0] || {
      id: 'default',
      title: 'Property Examination',
      createdAt: 0,
      messages: [],
    };
  }, [sessions, activeSessionId]);

  const messages = activeSession.messages;

  // ── 2. AUTO-SCROLL TO BOTTOM ──────────────────────────────────
  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({
      behavior: smooth ? 'smooth' : 'auto',
      block: 'end',
    });
  }, []);

  useEffect(() => {
    scrollToBottom(false);
  }, [activeSessionId, scrollToBottom]);

  useEffect(() => {
    if (isStreaming || isThinking) {
      scrollToBottom(false);
    }
  }, [streamingText, isThinking, isStreaming, scrollToBottom]);

  const handleScroll = () => {
    if (!chatScrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatScrollContainerRef.current;
    const distanceToBottom = scrollHeight - scrollTop - clientHeight;
    // Only show scroll-to-bottom if there is actual message history and user is scrolled up
    setShowScrollBottom(messages.length > 0 && distanceToBottom > 240);
  };

  // Auto-grow textarea (1 to 6 lines)
  const adjustTextarea = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const newHeight = Math.min(el.scrollHeight, 160);
    el.style.height = `${newHeight}px`;
  };

  // ── 3. SESSION MANAGEMENT ─────────────────────────────────────
  const handleNewChat = async () => {
    let createdId = makeId('session');
    if (user) {
      try {
        const serverChat = await serverApi.chats.create({ title: 'New Examination' });
        if (serverChat?.id) createdId = serverChat.id;
      } catch (err) {
        console.warn('Could not create session on server:', err);
      }
    }

    const newSession: ChatSession = {
      id: createdId,
      title: 'New Examination',
      createdAt: nowTimestamp(),
      messages: [],
    };
    const updated = [newSession, ...sessions.filter((s) => s.id !== createdId)];
    persistSessions(updated);
    setActiveSessionId(newSession.id);
    if (user?.id) {
      try {
        localStorage.setItem(`nothi_ai_active_session_${user.id}`, newSession.id);
      } catch { }
    }
    setInputText('');
    setAttachments([]);
    setAttachmentError(null);
    setStreamingText('');
    setIsStreaming(false);
    setIsThinking(false);
    setLogoState('idle');
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  const handleSelectSession = async (id: string) => {
    setActiveSessionId(id);
    if (user?.id) {
      try {
        localStorage.setItem(`nothi_ai_active_session_${user.id}`, id);
      } catch { }
    }
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }

    const existing = sessions.find((s) => s.id === id);
    if (existing && existing.messages.length === 0 && user) {
      try {
        const fullChat = await serverApi.chats.get(id);
        if (fullChat && Array.isArray(fullChat.messages) && fullChat.messages.length > 0) {
          const lastMode = fullChat.messages[fullChat.messages.length - 1]?.mode;
          if (lastMode === 'legal' || lastMode === 'document') {
            setAskMode(lastMode);
          }
          const mappedMsgs: ChatMessage[] = fullChat.messages.map((m: ServerChatMessage) => ({
            id: m.id,
            role: m.role,
            mode: m.mode,
            content: m.content,
            citations: Array.isArray(m.citations)
              ? m.citations.map((c: { id?: string | number; section?: string; lawTitle?: string; label?: string; officialUrl?: string }) => ({
                  id: String(c.id || c.section || 'statute'),
                  act: c.lawTitle || c.label || 'The Transfer of Property Act, 1882',
                  section: c.section ? (String(c.section).startsWith('s.') ? String(c.section) : `s. ${c.section}`) : (c.label || ''),
                  officialUrl: c.officialUrl,
                  label: c.label,
                }))
              : (m.citations as ChatCitation[] | undefined),
            attachments: m.attachments as ChatAttachment[] | undefined,
            timestamp: m.timestamp || Date.now(),
          }));
          setSessions((prev) => {
            const updated = prev.map((s) =>
              s.id === id ? { ...s, title: fullChat.title || s.title, messages: mappedMsgs } : s
            );
            persistSessions(updated);
            return updated;
          });
        }
      } catch (err) {
        console.warn('Could not load session details from server:', err);
      }
    }
  };

  const handleRenameSession = async (id: string, newTitle: string) => {
    const updated = sessions.map((s) => (s.id === id ? { ...s, title: newTitle } : s));
    persistSessions(updated);
    if (user) {
      try {
        await serverApi.chats.update(id, { title: newTitle });
      } catch (e) {
        console.warn('Could not rename chat on server:', e);
      }
    }
  };

  const handleDeleteSession = async (id: string) => {
    if (user) {
      try {
        await serverApi.chats.delete(id);
      } catch (e) {
        console.warn('Failed to delete chat on server:', e);
      }
    }
    const updated = sessions.filter((s) => s.id !== id);
    persistSessions(updated);
    if (updated.length > 0) {
      const nextActive = updated[0].id;
      setActiveSessionId(nextActive);
      handleSelectSession(nextActive);
    } else {
      setActiveSessionId('');
    }
  };

  // ── 4. DATE GROUPING FOR CONVERSATION LIST (Today, Yesterday, Earlier) ──
  const groupedSessions = useMemo(() => {
    if (!mounted) {
      return sessions.length > 0 ? [{ label: 'Conversations', items: sessions }] : [];
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const groups: { label: string; items: ChatSession[] }[] = [
      { label: 'Today', items: [] },
      { label: 'Yesterday', items: [] },
      { label: 'Earlier', items: [] },
    ];

    sessions.forEach((s) => {
      const ts = s.createdAt > 0 ? s.createdAt : 0;
      const date = new Date(ts);
      if (date >= today) groups[0].items.push(s);
      else if (date >= yesterday) groups[1].items.push(s);
      else groups[2].items.push(s);
    });

    return groups.filter((g) => g.items.length > 0);
  }, [sessions, mounted]);

  // Export current chat conversation as formatted Markdown
  const handleExportChat = useCallback(() => {
    if (messages.length === 0) return;
    const header = `# Nothi AI Statutory Examination Transcript\nDate: ${new Date().toLocaleString()}\nTitle: ${activeSession.title}\n\n---\n\n`;
    const body = messages
      .map(
        (m) =>
          `### ${m.role === 'user' ? 'Advocate / Citizen' : 'Nothi AI'} (${new Date(m.timestamp).toLocaleTimeString()})\n\n${m.content}\n` +
          (m.citations && m.citations.length > 0
            ? `\n*Statutory Citations:*\n${m.citations.map((c) => `- \`${c.id}\`: Section ${c.section || ''} (${c.act})`).join('\n')}\n`
            : '')
      )
      .join('\n---\n\n');

    const filename = generateFilenameFromHeading(activeSession.title, `nothi_ai_${activeSession.id}`);
    const blob = new Blob([header + body], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, [messages, activeSession]);

  // Download individual assistant message as .md file derived from first heading
  const downloadSingleMessageMd = useCallback((content: string) => {
    const filename = generateFilenameFromHeading(content, 'nothi-ai-vetting-memo');
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  // Copy individual message as raw Markdown
  const copyAsMarkdown = useCallback((id: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedMessageId(`md_${id}`);
    setTimeout(() => setCopiedMessageId(null), 2000);
  }, []);

  // Clear messages from current active conversation
  const handleClearCurrentChat = useCallback(() => {
    setSessions((prev) => {
      const updated = prev.map((s) => (s.id === activeSessionId ? { ...s, messages: [] } : s));
      try {
        localStorage.setItem(STORAGE_SESSIONS_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
    setStreamingText('');
    setIsStreaming(false);
    setIsThinking(false);
  }, [activeSessionId]);

  // Instant Sample Document Loader
  const handleLoadSampleDoc = useCallback(
    (sample: (typeof SAMPLE_DOCS)[number]) => {
      setAttachmentError(null);
      const tempId = makeId('att_sample');
      setAttachments([
        {
          id: tempId,
          name: sample.name,
          type: sample.type,
          size: sample.size,
          dataUrl: sample.dataUrl,
          uploadProgress: 100,
        },
      ]);
      if (!inputText) {
        setInputText(lang === 'bn' ? sample.queryBn : sample.queryEn);
      }
      textareaRef.current?.focus();
    },
    [inputText, lang]
  );

  // ── 5. FILE ATTACHMENTS (MAX 3, 15MB EACH) ────────────────────
  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setAttachmentError(null);

    const maxFiles = 3;
    const maxSize = 15 * 1024 * 1024; // 15 MB

    if (attachments.length + files.length > maxFiles) {
      setAttachmentError(`Maximum ${maxFiles} documents allowed per message.`);
      return;
    }

    Array.from(files).forEach((file) => {
      const isImg = file.type.startsWith('image/');
      const isPdf = file.type === 'application/pdf' || file.name.endsWith('.pdf');

      if (!isImg && !isPdf) {
        setAttachmentError(`"${file.name}" is not a valid format. Only PDF, JPG, and PNG are supported.`);
        return;
      }

      if (file.size > maxSize) {
        setAttachmentError(`"${file.name}" exceeds 15 MB size limit.`);
        return;
      }

      const tempId = makeId('att');
      const reader = new FileReader();

      // Show immediate progress card
      setAttachments((prev) => [
        ...prev,
        {
          id: tempId,
          name: file.name,
          type: isImg ? 'image' : 'pdf',
          size: file.size,
          file,
          uploadProgress: 45,
        },
      ]);

      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setAttachments((prev) =>
          prev.map((a) =>
            a.id === tempId
              ? {
                ...a,
                uploadProgress: 100,
                file,
                dataUrl: isImg ? dataUrl : undefined,
              }
              : a
          )
        );
      };

      if (isImg) {
        reader.readAsDataURL(file);
      } else {
        reader.readAsArrayBuffer(file.slice(0, 512));
      }
    });
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  // Clipboard Paste Support (Ctrl+V directly into textarea)
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) files.push(file);
      }
    }

    if (files.length > 0) {
      e.preventDefault();
      const dt = new DataTransfer();
      files.forEach((f) => dt.items.add(f));
      handleFiles(dt.files);
    }
  };

  // Meaningful auto-titling from question (max 40 chars, never "hi")
  const generateMeaningfulTitle = (content: string, firstFileName?: string): string => {
    const lower = content.toLowerCase().trim();
    if (lower === 'hi' || lower === 'hello' || lower === 'hey') {
      return 'Property Inquiry';
    }
    if (lower.includes('23') || lower.includes('signing and registering') || lower.includes('presentation')) {
      return 'Deed Presentation Window (Sec. 23)';
    }
    if (lower.includes('nid') || lower.includes('identity') || lower.includes('rule 3')) {
      return 'NID Digit Parity Check';
    }
    if (lower.includes('dag') || lower.includes('plot') || lower.includes('mismatch')) {
      return 'Dag Number Schedule Parity';
    }
    if (lower.includes('khatian') || lower.includes('porcha')) {
      return 'Collectorate Khatian Title Chain';
    }
    if (lower.includes('lis pendens') || lower.includes('suit') || lower.includes('52')) {
      return 'Lis Pendens Litigation Check (Sec. 52)';
    }
    if (lower.includes('forged') || lower.includes('fake') || lower.includes('crime')) {
      return 'Forged Deed Penal Liabilities';
    }
    if (firstFileName) {
      return `Vetting: ${firstFileName.substring(0, 30)}`;
    }
    // Clean, sanitize, take first 38 characters
    const cleaned = content.replace(/[^a-zA-Z0-9\u0980-\u09FF\s]/g, '').trim();
    if (cleaned.length > 3) {
      return cleaned.substring(0, 38) + (cleaned.length > 38 ? '...' : '');
    }
    return 'Property Examination';
  };

  // ── 6. THINKING PIPELINE & STREAMING LOGIC ────────────────────
  const handleSendMessage = async (textToSend?: string) => {
    const content = (textToSend !== undefined ? textToSend : inputText).trim();
    if (!content && attachments.length === 0) return;
    if (isStreaming || isThinking) return;

    if (askMode === 'document' && attachments.length === 0) {
      setAttachmentError(
        lang === 'bn'
          ? 'নথি প্রশ্নোত্তর মোডে অন্তত একটি দলিল বা খতিয়ান সংযুক্ত করুন (অথবা আইনি সার্চ মোড ব্যবহার করুন)।'
          : 'Please attach a deed, khatian, or NID scan for Document Q&A, or switch to Legal Search.'
      );
      return;
    }

    abortControllerRef.current = false;
    const currentAttachments = [...attachments];
    setInputText('');
    setAttachments([]);
    setAttachmentError(null);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    const currentNow = nowTimestamp();
    const userMessage: ChatMessage = {
      id: makeId('msg_user'),
      role: 'user',
      mode: askMode,
      content: content || (currentAttachments.length > 0 ? `Uploaded ${currentAttachments.length} document file(s) for examination.` : ''),
      attachments: currentAttachments.length > 0 ? currentAttachments : undefined,
      timestamp: currentNow,
    };

    let targetSessionId = activeSessionId;
    const targetTitle = activeSession?.title || 'Property Examination';

    // Auto-title session if this is the first message
    const isFirst = messages.length === 0;
    const newTitle = isFirst ? generateMeaningfulTitle(content, currentAttachments[0]?.name) : (activeSession?.title || targetTitle);

    if (!targetSessionId || !sessions.some((s) => s.id === targetSessionId)) {
      if (user) {
        try {
          const created = await serverApi.chats.create({ title: newTitle });
          if (created?.id) targetSessionId = created.id;
        } catch {
          targetSessionId = makeId('session');
        }
      } else {
        targetSessionId = makeId('session');
      }
      setActiveSessionId(targetSessionId);
    }

    // Immediately append user message
    const updatedMessagesWithUser = [...messages, userMessage];
    const updatedSessionsWithUser = sessions.some((s) => s.id === targetSessionId)
      ? sessions.map((s) =>
          s.id === targetSessionId
            ? { ...s, title: newTitle, messages: updatedMessagesWithUser }
            : s
        )
      : [
          {
            id: targetSessionId,
            title: newTitle,
            createdAt: currentNow,
            messages: updatedMessagesWithUser,
          },
          ...sessions,
        ];
    persistSessions(updatedSessionsWithUser);

    // Upload any attached files to backend if user is authenticated
    if (user && targetSessionId && currentAttachments.length > 0) {
      for (const att of currentAttachments) {
        if (att.file) {
          try {
            const mime = att.file.type || (att.type === 'image' ? 'image/jpeg' : 'application/pdf');
            const uploaded = await serverApi.chats.uploadDocument(targetSessionId, att.file, att.name, mime);
            const kind = att.type === 'image' ? 'photo' : 'pdf';
            const serverPages = uploaded.attachments?.[kind]?.pages;
            if (serverPages && Array.isArray(serverPages)) {
              att.extractedText = serverPages.map((p) => p.text).join('\n\n');
            }
          } catch (uploadErr) {
            console.warn('Backend document upload notice:', uploadErr);
          }
        }
      }
    }

    // ── STAGE 1: 4-STAGE THINKING SEQUENCE (Snappy, responsive ~360ms total) ──
    setIsThinking(true);
    setLogoState('thinking');
    setIsErrorState(false);

    setThinkingStage('reading');
    await new Promise((r) => setTimeout(r, 90));
    if (abortControllerRef.current) return;

    setThinkingStage('searching');
    await new Promise((r) => setTimeout(r, 90));
    if (abortControllerRef.current) return;

    setThinkingStage('checking');
    await new Promise((r) => setTimeout(r, 90));
    if (abortControllerRef.current) return;

    setThinkingStage('writing');
    await new Promise((r) => setTimeout(r, 80));
    if (abortControllerRef.current) return;

    // ── STAGE 2: EXECUTION & STREAMING ───────────────────────────────
    let accumulatedText = '';
    let responseCitations: ChatCitation[] = [];

    if (user && (askMode === 'legal' || askMode === 'document') && targetSessionId) {
      try {
        const updatedChat = await serverApi.chats.sendMessage(targetSessionId, content, askMode);
        const serverMessages = updatedChat.messages || [];
        const lastMsg = serverMessages[serverMessages.length - 1];

        accumulatedText = lastMsg?.content || 'I could not find an answer in the legal sources.';
        responseCitations = (lastMsg?.citations || []).map((c: { id?: string | number; section?: string; lawTitle?: string; label?: string; officialUrl?: string }) => ({
          id: String(c.id || c.section || 'statute'),
          act: c.lawTitle || c.label || 'The Transfer of Property Act, 1882',
          section: c.section ? (String(c.section).startsWith('s.') ? String(c.section) : `s. ${c.section}`) : (c.label || ''),
          officialUrl: c.officialUrl,
          label: c.label,
        }));

        setIsThinking(false);
        setIsStreaming(true);
        setStreamingText('');

        const words = accumulatedText.split(' ');
        let currentStreaming = '';
        for (let i = 0; i < words.length; i++) {
          if (abortControllerRef.current) break;
          currentStreaming += (i === 0 ? '' : ' ') + words[i];
          setStreamingText(currentStreaming);
          if (i % 2 === 0) await new Promise((r) => setTimeout(r, 12));
        }

        setLogoState('answered');
        refreshQuota();
      } catch (err: unknown) {
        console.error('Error in serverApi.chats.sendMessage:', err);
        setIsErrorState(true);
        setLogoState('error');
        setAttachmentError(err instanceof Error ? err.message : 'The chat request could not be completed. Try again.');
      } finally {
        setIsStreaming(false);
      }
    } else {
      setIsThinking(false);
      setIsStreaming(true);
      setStreamingText('');

      try {
        const response = await sendChatMessage(
          updatedMessagesWithUser,
          lang,
          (chunk) => {
            if (abortControllerRef.current) return;
            accumulatedText += chunk;
            setStreamingText(accumulatedText);
          }
        );

        responseCitations = response.citations;

        if (response.citations.length === 0 && response.content.includes('cannot find this specific')) {
          setLogoState('error');
          await new Promise((r) => setTimeout(r, 300));
        } else {
          setLogoState('answered');
          await new Promise((r) => setTimeout(r, 300));
        }
      } catch (err: unknown) {
        console.error('Error in sendChatMessage:', err);
        setIsErrorState(true);
        setLogoState('error');
        setAttachmentError(err instanceof Error ? err.message : 'The request could not be completed.');
      } finally {
        setIsStreaming(false);
      }
    }

    if (!abortControllerRef.current && accumulatedText) {
      const assistantMessage: ChatMessage = {
        id: makeId('msg_asst'),
        role: 'assistant',
        mode: askMode,
        content: accumulatedText,
        citations: responseCitations,
        timestamp: nowTimestamp(),
      };

      const finalizedMessages = [...updatedMessagesWithUser, assistantMessage];
      const updatedFinalSessions = sessions.some((s) => s.id === targetSessionId)
        ? sessions.map((s) =>
            s.id === targetSessionId ? { ...s, title: newTitle, messages: finalizedMessages } : s
          )
        : [
            {
              id: targetSessionId,
              title: newTitle,
              createdAt: currentNow,
              messages: finalizedMessages,
            },
            ...sessions,
          ];

      persistSessions(updatedFinalSessions);
      setStreamingText('');
      setLogoState('idle');

      // Sync finalized conversation to backend server if in statutory mode
      if (user && targetSessionId && askMode === 'statutory') {
        serverApi.chats
          .update(targetSessionId, {
            title: newTitle,
            messages: finalizedMessages as unknown as ServerChatMessage[],
            updatedAt: currentNow,
          })
          .catch((err) => console.warn('Could not sync chat messages to server:', err));
      }
    }
  };

  const handleStop = () => {
    abortControllerRef.current = true;
    setIsThinking(false);
    setIsStreaming(false);

    if (streamingText.trim()) {
      const partialMessage: ChatMessage = {
        id: makeId('msg_asst_stopped'),
        role: 'assistant',
        content: streamingText + ' [Stopped]',
        citations: [],
        timestamp: nowTimestamp(),
      };
      const finalized = [...messages, partialMessage];
      const updated = sessions.map((s) =>
        s.id === activeSessionId ? { ...s, messages: finalized } : s
      );
      persistSessions(updated);
    }
    setStreamingText('');
    setLogoState('idle');
  };

  const handleRegenerate = async (lastUserText: string) => {
    handleSendMessage(lastUserText);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const copyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMessageId(id);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  // Authentication Route Guard (placed after all hooks)
  if (mounted && !user) {
    return (
      <div suppressHydrationWarning className="min-h-screen bg-paper flex items-center justify-center p-6 text-center select-none">
        <div className="max-w-md w-full p-8 rounded-2xl bg-paper-light border border-brass/50 shadow-2xl space-y-5 animate-in fade-in duration-200">
          <div className="w-14 h-14 rounded-full bg-brass/15 text-green-deep mx-auto flex items-center justify-center">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <div className="space-y-2">
            <h2 className="font-heading text-2xl font-bold text-green-deep">
              {lang === 'bn' ? 'সাইন ইন আবশ্যক' : 'Authentication Required'}
            </h2>
            <p className="text-xs sm:text-sm text-ink-muted font-sans leading-relaxed">
              {lang === 'bn'
                ? 'আইনি নথি যাচাই ও সংবিধিবদ্ধ চ্যাট শুধুমাত্র নিবন্ধিত আইনজীবী ও অডিট কর্মকর্তাদের জন্য সংরক্ষিত।'
                : 'Statutory examination and land document auditing are restricted to authenticated advocates and vetting officers.'}
            </p>
          </div>
          <div className="pt-2 space-y-2">
            <button
              type="button"
              onClick={() => setSignInModalOpen(true)}
              className="w-full py-3 px-5 rounded-full bg-green-deep hover:bg-green-mid text-paper text-sm font-semibold transition-all shadow-md active:scale-95 cursor-pointer"
            >
              {lang === 'bn' ? 'সাইন ইন করুন' : 'Sign in to Access Chat'}
            </button>
            <Link
              href="/"
              className="block text-xs font-sans text-ink-muted hover:text-ink py-1.5 transition-colors"
            >
              {lang === 'bn' ? '← হোমপেজে ফিরে যান' : '← Return to Home'}
            </Link>
          </div>
          <SignInModal isOpen={signInModalOpen} onClose={() => router.replace('/')} />
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col h-[100dvh] bg-[#F6F1E7] text-ink overflow-hidden select-none font-sans"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* ── DRAG AND DROP FULLSCREEN OVERLAY (NO EMOJI) ── */}
      {isDragging && (
        <div className="fixed inset-0 z-50 bg-[#1B4332]/90 backdrop-blur-xs flex flex-col items-center justify-center text-paper border-4 border-dashed border-brass pointer-events-none animate-in fade-in duration-150">
          <div className="w-16 h-16 rounded-full bg-paper/10 flex items-center justify-center mb-3 text-brass">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <h3 className="font-heading text-2xl font-bold">Drop property documents here</h3>
          <p className="text-sm font-sans text-paper/80 mt-1">
            Accepts Saf Kabala deed scans, Khatian ledgers, and NID cards (PDF, JPG, PNG up to 15 MB)
          </p>
        </div>
      )}

      {/* ── 1. SINGLE AUTHORITATIVE HEADER (NO SECOND LOGO / TOGGLE) ── */}
      <header className="h-[54px] sm:h-[60px] md:h-[64px] border-b border-border/80 bg-[#FAF7F2] px-3 sm:px-6 flex items-center justify-between shrink-0 z-30">
        {/* Left: Sidebar Toggle + Nothi AI Logo & Wordmark */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 sm:p-2 rounded-xs border border-border/70 text-ink hover:bg-paper-dark transition-colors cursor-pointer"
            title={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
            aria-label="Toggle conversation sidebar"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <Link href="/" className="no-underline flex items-center gap-2 group whitespace-nowrap" aria-label="Nothi AI Home">
            <AnimatedLogo state={logoState} size={24} />
            <span className="font-heading text-lg sm:text-xl font-bold text-green-deep tracking-tight">
              Nothi AI
            </span>
            <span className="hidden sm:inline-block font-bangla text-base text-ink-muted/80 ml-0.5">
              নথি এআই
            </span>
            <span className="hidden md:inline-block text-[11px] font-mono px-1.5 py-0.5 rounded-full bg-paper-dark border border-border/70 text-ink-muted whitespace-nowrap">
              v1.2
            </span>
          </Link>
        </div>

        {/* Center: Quiet 28 Verified Sections Link (Desktop Only) */}
        <div className="hidden lg:flex items-center">
          <button
            type="button"
            onClick={() => setCorpusListOpen(true)}
            className="inline-flex items-center gap-2 text-xs font-sans text-ink-muted hover:text-green-deep transition-colors cursor-pointer px-3 py-1.5 rounded-full hover:bg-paper-dark/60"
            title="View 28 verified sections from laws_corpus.json"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-green-deep" />
            <span>28 verified sections</span>
          </button>
        </div>

        {/* Right Controls: Live Quota, Single EN / বাং Switch, Sign In/Profile, Back to site */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Live Redis Daily Quota Badge */}
          {mounted && user && quota && (
            <div
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-border/80 bg-paper-dark/60 text-xs font-mono text-ink shadow-2xs whitespace-nowrap"
              title={`Questions: ${quota.questionsUsed}/${quota.questionsLimit} used • Tokens: ${quota.tokensUsed.toLocaleString()}/${quota.tokensLimit.toLocaleString()} • Resets at ${new Date(quota.resetAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
              <span>{Math.max(0, quota.questionsLimit - quota.questionsUsed)} Qs left</span>
            </div>
          )}

          {/* Single Header EN / বাং Language Toggle */}
          <div
            role="radiogroup"
            aria-label="Select interface language"
            className="inline-flex p-0.5 rounded-full border border-border/80 bg-paper-dark/60 shrink-0"
          >
            <button
              type="button"
              role="radio"
              aria-checked={lang === 'en'}
              onClick={() => setLang('en')}
              className={`px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-sans transition-all cursor-pointer ${lang === 'en'
                ? 'bg-green-deep text-paper font-semibold shadow-2xs'
                : 'text-ink-muted hover:text-ink'
                }`}
            >
              EN
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={lang === 'bn'}
              onClick={() => setLang('bn')}
              className={`px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-bangla transition-all cursor-pointer ${lang === 'bn'
                ? 'bg-green-deep text-paper font-semibold shadow-2xs'
                : 'text-ink-muted hover:text-ink'
                }`}
            >
              বাং
            </button>
          </div>

          {/* User Sign In / Profile Pill */}
          {user ? (
            <UserMenu />
          ) : (
            <button
              type="button"
              onClick={() => setSignInModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-border/80 bg-paper hover:bg-paper-dark text-xs font-sans text-ink hover:text-green-deep transition-all cursor-pointer shadow-2xs whitespace-nowrap"
              title="Sign in with your email"
            >
              <span>{lang === 'bn' ? 'সাইন ইন' : 'Sign in'}</span>
            </button>
          )}

          {/* Back to Site Link (Desktop) */}
          <Link
            href="/"
            className="hidden md:inline-block text-xs font-sans text-ink-muted hover:text-green-deep px-2 py-1 transition-colors whitespace-nowrap"
            title="Return to Nothi AI landing page"
          >
            {lang === 'bn' ? 'মূল সাইট' : 'Back to site'}
          </Link>
        </div>
      </header>

      {/* ── 2. WORKSPACE BODY: SIDEBAR + CONVERSATION COLUMN ── */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Mobile Backdrop Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-ink/30 md:hidden backdrop-blur-2xs"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* ── 2A. LEFT SIDEBAR (COLLAPSIBLE 280PX, SLIDE-OVER ON MOBILE) ── */}
        <aside
          className={`fixed md:static inset-y-0 left-0 z-40 w-[280px] bg-[#FAF7F2] border-r border-border/80 flex flex-col justify-between transition-transform duration-200 ease-in-out shadow-lg md:shadow-none shrink-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:-ml-[280px]'
            }`}
          style={{ top: '60px', height: 'calc(100dvh - 60px)' }}
        >
          <div className="flex flex-col h-full overflow-hidden">
            {/* Top Button: "+ New chat" */}
            <div className="p-3 border-b border-border/80">
              <button
                type="button"
                onClick={handleNewChat}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-green-deep hover:bg-green-mid text-paper font-sans text-xs font-semibold transition-all shadow-xs cursor-pointer active:scale-98"
              >
                <span className="text-base leading-none font-bold">+</span>
                <span>{lang === 'bn' ? 'নতুন আলাপ' : 'New chat'}</span>
              </button>
            </div>

            {/* Conversation List Grouped by Today / Yesterday / Earlier */}
            <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
              {(!mounted || !sessionsLoaded) ? (
                <div className="space-y-3 px-3 py-2">
                  <div className="h-4 bg-paper-dark/60 rounded animate-pulse w-3/4" />
                  <div className="h-4 bg-paper-dark/40 rounded animate-pulse w-1/2" />
                  <div className="h-4 bg-paper-dark/50 rounded animate-pulse w-2/3" />
                </div>
              ) : (
                groupedSessions.map((group) => (
                  <div key={group.label} className="space-y-1">
                    <div className="px-3 text-[11px] font-sans font-semibold text-ink-muted/80 uppercase tracking-wider">
                      {group.label}
                    </div>

                    {group.items.map((session) => {
                      const isActive = session.id === activeSessionId;

                      return (
                        <div
                          key={session.id}
                          onClick={() => handleSelectSession(session.id)}
                          className={`group relative flex items-center justify-between px-3 py-1.5 rounded-md text-xs font-sans transition-all duration-150 cursor-pointer ${isActive
                            ? 'bg-paper-dark/70 border-l-[3px] border-green-deep text-green-deep font-semibold shadow-2xs pl-2.5'
                            : 'text-ink hover:bg-paper-dark/40 hover:text-green-deep'
                            }`}
                        >
                          <span className="truncate pr-2">{session.title}</span>

                          {/* Three dots menu */}
                          <ChatSessionMenu
                            sessionId={session.id}
                            sessionTitle={session.title}
                            onRename={handleRenameSession}
                            onDelete={handleDeleteSession}
                          />
                        </div>
                      );
                    })}
                  </div>
                ))
              )}
            </div>

            {/* Sidebar Safe Footer: One disclaimer text link only (laws_corpus.json) */}
            <div className="p-4 border-t border-border/80 text-center pb-8 safe-bottom">
              <button
                type="button"
                onClick={() => setCorpusListOpen(true)}
                className="text-xs font-mono text-ink-muted hover:text-green-deep transition-colors cursor-pointer"
                title="View verified statutory corpus"
              >
                laws_corpus.json
              </button>
            </div>
          </div>
        </aside>

        {/* ── 2B. MAIN CONVERSATION COLUMN (CENTERED MAX 760PX) ── */}
        <main
          ref={chatScrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 flex flex-col h-full overflow-y-auto relative bg-[#F6F1E7]"
          role="log"
          aria-live="polite"
        >
          <div className="flex-1 flex flex-col justify-between max-w-[760px] mx-auto w-full px-4 sm:px-6 py-6 sm:py-8">
            {/* ── EMPTY STATE (CLERK'S READING ROOM) ── */}
            {messages.length === 0 && !isThinking && !isStreaming ? (
              <div className="my-auto py-8 sm:py-14 space-y-7 animate-in fade-in duration-300">
                {/* Greeting & Verification Subtitle */}
                <div className="space-y-3">
                  <h1 className="font-heading text-2xl sm:text-4xl lg:text-[42px] font-normal text-ink tracking-tight leading-tight">
                    {lang === 'bn' ? 'কী আইনি তথ্য যাচাই করতে চান?' : 'What would you like to check?'}
                  </h1>
                  <p className="font-sans text-base text-ink-muted leading-relaxed">
                    {lang === 'bn'
                      ? 'উত্তর কেবল বাংলাদেশ ভূমি আইনের ২৮টি যাচাইকৃত ধারার ভিত্তিতে দেওয়া হয়।'
                      : 'Answers come only from 28 verified sections of Bangladeshi property law.'}
                  </p>
                </div>

                {/* Four Plain Text Rows Separated by Thin Rules */}
                <div className="border-t border-border/80">
                  {EMPTY_SUGGESTIONS.map((item, idx) => {
                    const text = lang === 'bn' ? item.textBn : item.textEn;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSendMessage(text)}
                        className="group w-full py-4 sm:py-4.5 border-b border-border/80 flex items-center justify-between text-left transition-colors hover:bg-paper-dark/30 px-2 -mx-2 rounded-sm cursor-pointer"
                      >
                        <span className="font-sans text-base text-ink group-hover:text-green-deep transition-colors pr-4 leading-snug">
                          {text}
                        </span>
                        <span className="text-ink-muted/60 group-hover:text-green-deep group-hover:translate-x-1.5 transition-all text-base shrink-0 select-none">
                          &rarr;
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Interactive Sample Documents Bar (1-Click Instant Test) */}
                <div className="pt-2 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-brass animate-pulse" />
                    <span className="text-xs font-mono uppercase tracking-wider text-ink-muted font-semibold">
                      {lang === 'bn' ? 'বা নমুনা নথি দিয়ে সরাসরি পরীক্ষা করুন:' : 'Or test instant document vetting:'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2.5">
                    {SAMPLE_DOCS.map((sample, sIdx) => (
                      <button
                        key={sIdx}
                        type="button"
                        onClick={() => handleLoadSampleDoc(sample)}
                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full border border-border/80 bg-paper hover:bg-paper-dark hover:border-brass text-xs font-sans text-ink transition-all shadow-2xs hover:shadow-xs active:scale-95 cursor-pointer"
                        title={sample.queryEn}
                      >
                        <span>{lang === 'bn' ? sample.labelBn : sample.labelEn}</span>
                        <span className="text-brass font-bold">＋</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* ── ACTIVE MESSAGE LIST ── */
              <div className="space-y-6 pb-4">
                {/* Conversation Header Actions */}
                <div className="flex items-center justify-between pb-3 border-b border-border/60 text-xs font-sans text-ink-muted">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-ink max-w-[200px] sm:max-w-xs truncate">
                      {mounted && sessionsLoaded ? activeSession.title : 'Property Examination'}
                    </span>
                    <span>•</span>
                    <span>{messages.length} {messages.length === 1 ? 'message' : 'messages'}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleExportChat}
                      className="hover:text-green-deep flex items-center gap-1.5 transition-colors cursor-pointer font-medium"
                      title="Download entire examination transcript with citations as Markdown"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      <span>{lang === 'bn' ? 'সম্পূর্ণ ডাউনলোড (.md)' : 'Download all as .md'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleClearCurrentChat}
                      className="hover:text-vermillion flex items-center gap-1 transition-colors cursor-pointer"
                      title="Clear messages in this chat"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                      <span>{lang === 'bn' ? 'মুছে ফেলুন' : 'Clear'}</span>
                    </button>
                  </div>
                </div>
                {messages.map((msg, idx) => {
                  const isUser = msg.role === 'user';
                  const prevMsg = idx > 0 ? messages[idx - 1] : null;
                  const isConsecutive = prevMsg?.role === msg.role;

                  return (
                    <div
                      key={msg.id}
                      className={`group flex flex-col ${isUser ? 'items-end' : 'items-start'
                        } ${isConsecutive ? 'mt-2' : 'mt-6'}`}
                    >
                      {/* USER MESSAGE: Bottle-Green Filled Bubble (18px radius, flatter corner toward sender) */}
                      {isUser ? (
                        <div className="max-w-[80%] rounded-[18px] rounded-tr-[4px] bg-green-deep text-paper p-4 text-base font-sans leading-relaxed shadow-xs">
                          {/* Attached files inside message */}
                          {msg.attachments && msg.attachments.length > 0 && (
                            <div className="mb-3 space-y-1.5 pb-2 border-b border-paper/20">
                              {msg.attachments.map((att) => (
                                <div
                                  key={att.id}
                                  className="flex items-center gap-2 p-1.5 rounded-xs bg-black/15 text-xs"
                                >
                                  {att.type === 'image' && att.dataUrl ? (
                                    <button
                                      type="button"
                                      onClick={() => setLightboxImage(att.dataUrl!)}
                                      className="cursor-zoom-in"
                                      title="Enlarge image"
                                    >
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img
                                        src={att.dataUrl}
                                        alt={att.name}
                                        className="w-10 h-10 object-cover rounded-xs border border-white/30"
                                      />
                                    </button>
                                  ) : (
                                    <span className="w-8 h-8 rounded-xs bg-vermillion/40 text-paper font-mono font-bold text-[10px] flex items-center justify-center">
                                      PDF
                                    </span>
                                  )}
                                  <div className="truncate">
                                    <div className="font-medium truncate">{att.name}</div>
                                    <div className="text-[10px] font-mono opacity-70 flex items-center gap-1.5">
                                      <span>{(att.size / 1024).toFixed(1)} KB</span>
                                      {att.extractedText && (
                                        <button
                                          type="button"
                                          onClick={() => setInspectingAttachment({ name: att.name, text: att.extractedText! })}
                                          className="underline hover:text-brass cursor-pointer"
                                        >
                                          • Review Text
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="whitespace-pre-wrap">{msg.content}</div>

                          <div className="mt-1 text-[10px] font-mono text-paper/70 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                            {mounted &&
                              new Date(msg.timestamp).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                          </div>
                        </div>
                      ) : (
                        /* ASSISTANT MESSAGE: Left-Aligned, NO Bubble Box, Directly on Paper Background */
                        <div className="w-full space-y-3 pl-0 sm:pl-1">
                          {/* Header: 24px AnimatedLogo Avatar + Nothi AI Label */}
                          <div className="flex items-center gap-2.5 text-xs font-sans text-ink">
                            <AnimatedLogo state="idle" size={24} />
                            <span className="font-semibold text-green-deep text-sm">Nothi AI</span>
                            <span className="text-[10px] font-mono text-ink-muted opacity-0 group-hover:opacity-100 transition-opacity">
                              {mounted &&
                                `• ${new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                            </span>
                          </div>

                          {/* Message Body: 16px Clean Sans Text */}
                          <div className="pl-8 sm:pl-8.5">
                            <StreamingTextRenderer
                              text={msg.content}
                              isStreaming={false}
                            />

                            {/* "Based on" Verified Citation Chips */}
                            {msg.citations && msg.citations.length > 0 && (
                              <div className="mt-4 pt-3 border-t border-border/80 flex flex-wrap items-center gap-2">
                                <span className="text-xs font-sans text-ink-muted">Based on:</span>
                                {msg.citations.map((c, cIdx) => (
                                  <CitationPopover
                                    key={cIdx}
                                    citation={c}
                                    index={cIdx}
                                    onInspect={(sec) => setActiveCitationSection(sec)}
                                  />
                                ))}
                              </div>
                            )}

                            {/* Follow-up Chips (At most two chips) */}
                            {msg.content && (
                              <div className="mt-3.5 flex flex-wrap gap-2">
                                {getFollowUpChips(msg.content, lang).slice(0, 2).map((chip, chipIdx) => (
                                  <button
                                    key={chipIdx}
                                    type="button"
                                    onClick={() => handleSendMessage(chip)}
                                    className="text-xs font-sans px-3 py-1.5 rounded-full border border-border/80 bg-paper hover:border-brass hover:bg-paper-dark/60 text-ink transition-colors cursor-pointer"
                                  >
                                    <span>{chip}</span>
                                    <span className="ml-1 text-brass">&rarr;</span>
                                  </button>
                                ))}
                              </div>
                            )}

                            {/* Assistant Actions Row (Copy, Copy as Markdown, Download .md, Regenerate, Thumbs) */}
                            <div className="mt-3 flex flex-wrap items-center gap-3.5 text-xs font-sans text-ink-muted opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150">
                              <button
                                type="button"
                                onClick={() => copyMessage(msg.id, msg.content)}
                                className="hover:text-green-deep transition-colors cursor-pointer"
                              >
                                {copiedMessageId === msg.id ? '✓ Copied' : 'Copy'}
                              </button>

                              <button
                                type="button"
                                onClick={() => copyAsMarkdown(msg.id, msg.content)}
                                className="hover:text-green-deep transition-colors cursor-pointer"
                                title="Copy message as raw Markdown"
                              >
                                {copiedMessageId === `md_${msg.id}` ? '✓ Copied .md' : 'Copy as Markdown'}
                              </button>

                              {hasMarkdownStructure(msg.content) && (
                                <button
                                  type="button"
                                  onClick={() => downloadSingleMessageMd(msg.content)}
                                  className="hover:text-green-deep text-brass font-medium flex items-center gap-1 transition-colors cursor-pointer"
                                  title="Download structure as Markdown file"
                                >
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                    <polyline points="7 10 12 15 17 10" />
                                    <line x1="12" y1="15" x2="12" y2="3" />
                                  </svg>
                                  <span>Download .md</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => {
                                  const lastUser = [...messages].reverse().find((m) => m.role === 'user');
                                  if (lastUser) handleRegenerate(lastUser.content);
                                }}
                                className="hover:text-green-deep transition-colors cursor-pointer"
                              >
                                Regenerate
                              </button>

                              <div className="flex items-center gap-1.5 border-l border-border/80 pl-3">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setFeedbackState((prev) => ({
                                      ...prev,
                                      [msg.id]: prev[msg.id] === 'up' ? undefined! : 'up',
                                    }))
                                  }
                                  className={`p-1 hover:text-green-deep cursor-pointer transition-colors ${feedbackState[msg.id] === 'up' ? 'text-green-deep' : 'text-ink-muted'
                                    }`}
                                  title="Helpful"
                                  aria-label="Helpful"
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill={feedbackState[msg.id] === 'up' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                                    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
                                  </svg>
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setFeedbackState((prev) => ({
                                      ...prev,
                                      [msg.id]: prev[msg.id] === 'down' ? undefined! : 'down',
                                    }))
                                  }
                                  className={`p-1 hover:text-vermillion cursor-pointer transition-colors ${feedbackState[msg.id] === 'down' ? 'text-vermillion' : 'text-ink-muted'
                                    }`}
                                  title="Not helpful"
                                  aria-label="Not helpful"
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill={feedbackState[msg.id] === 'down' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                                    <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* ── 4-STAGE THINKING SEQUENCE (>=500ms EACH & SKELETON) ── */}
                {isThinking && (
                  <div className="w-full space-y-2 mt-4 pl-0 sm:pl-1">
                    <ThinkingStageIndicator
                      currentStage={thinkingStage}
                      isError={isErrorState}
                    />
                  </div>
                )}

                {/* ── WORD-BY-WORD STREAMING TRANSITION ── */}
                {isStreaming && (
                  <div className="w-full space-y-2 mt-4 pl-0 sm:pl-1">
                    <div className="flex items-center gap-2.5 text-xs font-sans text-ink">
                      <AnimatedLogo state="thinking" size={24} />
                      <span className="font-semibold text-green-deep text-sm">Nothi AI</span>
                    </div>

                    <div className="pl-8 sm:pl-8.5">
                      <StreamingTextRenderer
                        text={streamingText}
                        isStreaming={true}
                      />
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}

            {/* Jump to Latest Floating Pill (Centered cleanly above input bar, only with messages) */}
            {messages.length > 0 && showScrollBottom && (
              <button
                type="button"
                onClick={() => scrollToBottom()}
                className="fixed bottom-36 sm:bottom-40 left-1/2 -translate-x-1/2 z-20 px-3.5 py-1.5 rounded-full bg-paper border border-border/90 text-ink text-xs font-sans shadow-lg hover:bg-paper-dark transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap animate-in fade-in duration-150"
              >
                <span>↓</span>
                <span>{lang === 'bn' ? 'সর্বশেষ বার্তায় যান' : 'Jump to latest'}</span>
              </button>
            )}

            {/* ── 3. DOCKED BOTTOM INPUT BAR (FLOATING ROUNDED CONTAINER 20PX, LAYERED SHADOW) ── */}
            <div className="pt-2 sm:pt-4 sticky bottom-0 bg-[#F6F1E7]/95 backdrop-blur-md pb-3 sm:pb-5 z-10">
              <div className="rounded-[20px] bg-paper border border-border shadow-[0_4px_20px_-2px_rgba(27,67,50,0.06),0_2px_6px_-1px_rgba(0,0,0,0.04)] focus-within:border-brass/80 focus-within:ring-2 focus-within:ring-brass/25 transition-all duration-200 p-2.5 sm:p-3 space-y-2">
                {/* Ask Mode Switcher: Legal Search (Qdrant) vs Document Q&A vs Statutory Vetting */}
                <div className="flex items-center justify-between pb-1.5 border-b border-border/50 gap-2">
                  <div
                    role="radiogroup"
                    aria-label="Select ask mode"
                    className="w-full sm:w-auto inline-flex p-0.5 rounded-full border border-border/80 bg-paper-dark/60 text-xs overflow-x-auto no-scrollbar"
                  >
                    <button
                      type="button"
                      role="radio"
                      aria-checked={askMode === 'legal'}
                      onClick={() => setAskMode('legal')}
                      className={`flex-1 sm:flex-initial px-2.5 sm:px-3 py-1 rounded-full font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap text-[11px] sm:text-xs shrink-0 ${
                        askMode === 'legal'
                          ? 'bg-green-deep text-paper font-semibold shadow-2xs'
                          : 'text-ink-muted hover:text-ink'
                      }`}
                      title="Qdrant Cloud vector search with lawyer-style reasoning on Section 17A and Bangladesh property laws"
                    >
                      <span className="text-[11px]">⚖️</span>
                      <span>
                        <span className="inline sm:hidden">{lang === 'bn' ? 'আইনি' : 'Legal'}</span>
                        <span className="hidden sm:inline">{lang === 'bn' ? 'আইনি সার্চ' : 'Legal Search'}</span>
                      </span>
                    </button>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={askMode === 'document'}
                      onClick={() => setAskMode('document')}
                      className={`flex-1 sm:flex-initial px-2.5 sm:px-3 py-1 rounded-full font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap text-[11px] sm:text-xs shrink-0 ${
                        askMode === 'document'
                          ? 'bg-green-deep text-paper font-semibold shadow-2xs'
                          : 'text-ink-muted hover:text-ink'
                      }`}
                      title="Direct question answering grounded strictly in your attached files (PDF or photo)"
                    >
                      <span className="text-[11px]">📄</span>
                      <span>
                        <span className="inline sm:hidden">{lang === 'bn' ? 'নথি' : 'Doc Q&A'}</span>
                        <span className="hidden sm:inline">{lang === 'bn' ? 'নথি প্রশ্নোত্তর' : 'Document Q&A'}</span>
                      </span>
                    </button>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={askMode === 'statutory'}
                      onClick={() => setAskMode('statutory')}
                      className={`flex-1 sm:flex-initial px-2.5 sm:px-3 py-1 rounded-full font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap text-[11px] sm:text-xs shrink-0 ${
                        askMode === 'statutory'
                          ? 'bg-green-deep text-paper font-semibold shadow-2xs'
                          : 'text-ink-muted hover:text-ink'
                      }`}
                      title="Deterministic verification against 28 codified sections of Bangladesh laws"
                    >
                      <span className="text-[11px]">🏛️</span>
                      <span>
                        <span className="inline sm:hidden">{lang === 'bn' ? 'বিধি' : 'Statutory'}</span>
                        <span className="hidden sm:inline">{lang === 'bn' ? 'বিধি নিরীক্ষা' : 'Statutory Vetting'}</span>
                      </span>
                    </button>
                  </div>

                  <div className="hidden md:flex items-center gap-1.5 text-[11px] font-mono text-ink-muted">
                    {askMode === 'legal' && <span className="text-emerald-700">Qdrant Cloud • Lawyer Reasoning</span>}
                    {askMode === 'document' && <span className="text-brass">Extracted Documents Context</span>}
                    {askMode === 'statutory' && <span>28 Codified Sections</span>}
                  </div>
                </div>

                {/* Upload Error Banner */}
                {attachmentError && (
                  <div className="px-3 py-1.5 rounded-xs bg-vermillion/10 border border-vermillion/30 text-vermillion text-xs font-sans flex items-center justify-between">
                    <span>{attachmentError}</span>
                    <button
                      type="button"
                      onClick={() => setAttachmentError(null)}
                      className="font-bold ml-2 cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* Attached Files Tray with Thumbnail, Size, Progress, Remove */}
                {attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 pb-2 border-b border-border/70">
                    {attachments.map((att) => (
                      <div
                        key={att.id}
                        className="flex items-center gap-2 p-1.5 pr-2.5 rounded-xs bg-paper-dark border border-border text-xs font-sans text-ink"
                      >
                        {att.type === 'image' && att.dataUrl ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={att.dataUrl}
                            alt={att.name}
                            className="w-7 h-7 object-cover rounded-xs"
                          />
                        ) : (
                          <span className="w-7 h-7 rounded-xs bg-vermillion/20 text-vermillion font-mono font-bold text-[9px] flex items-center justify-center">
                            PDF
                          </span>
                        )}
                        <div className="truncate max-w-[130px]">
                          <div className="font-semibold truncate">{att.name}</div>
                          <div className="text-[10px] text-ink-muted font-mono flex items-center gap-1">
                            <span>{(att.size / 1024).toFixed(1)} KB</span>
                            <span className="text-green-deep">✓</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeAttachment(att.id)}
                          className="ml-1 text-ink-muted hover:text-vermillion p-1 font-bold cursor-pointer"
                          title="Remove file"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Auto-growing Textarea (1 to 6 lines, 16px text) */}
                <textarea
                  ref={textareaRef}
                  value={inputText}
                  onChange={(e: ChangeEvent<HTMLTextAreaElement>) => {
                    setInputText(e.target.value);
                    adjustTextarea();
                  }}
                  onKeyDown={handleKeyDown}
                  onPaste={handlePaste}
                  placeholder={
                    lang === 'bn'
                      ? 'দলিল বা সংবিধিবদ্ধ আইন সম্পর্কিত প্রশ্ন লিখুন (বা ছবি পেস্ট করুন)...'
                      : 'Ask about a Bangladeshi property document (or paste an image)...'
                  }
                  rows={1}
                  maxLength={1000}
                  className="w-full bg-transparent resize-none border-none outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 shadow-none font-sans text-base text-ink placeholder:text-ink-muted/70 leading-relaxed max-h-40"
                />

                {/* Controls: Paperclip, Sample Docs, Voice Input, Character Counter, Send/Stop */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-1.5">
                    {/* Hidden File Picker (PDF, JPG, PNG up to 15MB, max 3) */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/jpeg,image/png,application/pdf"
                      onChange={(e) => handleFiles(e.target.files)}
                      className="hidden"
                    />

                    {/* Paperclip Button */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-1.5 rounded-full text-ink-muted hover:text-green-deep hover:bg-paper-dark transition-colors cursor-pointer"
                      title="Attach deed scan, khatian or NID (PDF, JPG, PNG up to 15MB)"
                      aria-label="Attach file"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
                      </svg>
                    </button>

                    {/* Quick Sample Document Inserter (Clean SVG, No Emoji) */}
                    <div className="relative group/sample">
                      <button
                        type="button"
                        className="px-2.5 py-1 rounded-full text-xs font-sans text-ink-muted hover:text-green-deep hover:bg-paper-dark transition-colors flex items-center gap-1 cursor-pointer border border-transparent hover:border-border/60"
                        title="Load sample test document"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                        </svg>
                        <span className="text-[11px] font-medium hidden sm:inline">Samples</span>
                        <span className="text-[9px] opacity-70">▼</span>
                      </button>

                      <div className="absolute bottom-full left-0 mb-2 hidden group-hover/sample:flex flex-col bg-paper border border-border shadow-xl rounded-xl p-1.5 w-60 z-30 space-y-1">
                        <span className="text-[10px] font-mono text-ink-muted uppercase px-2 py-1 font-semibold">Test with Sample:</span>
                        {SAMPLE_DOCS.map((sample, sIdx) => (
                          <button
                            key={sIdx}
                            type="button"
                            onClick={() => handleLoadSampleDoc(sample)}
                            className="text-left text-xs font-sans px-2.5 py-1.5 rounded-lg hover:bg-paper-dark text-ink hover:text-green-deep transition-colors cursor-pointer flex items-center justify-between"
                          >
                            <span className="truncate">{lang === 'bn' ? sample.labelBn : sample.labelEn}</span>
                            <span className="text-brass font-bold ml-1 text-sm">＋</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Voice Input Button */}
                    <VoiceInputButton
                      lang={lang}
                      onTranscript={(transcript) =>
                        setInputText((prev) => (prev ? prev + ' ' : '') + transcript)
                      }
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Character Counter (aligned cleanly inside the bar) */}
                    <span className="font-mono text-[11px] text-ink-muted">
                      {inputText.length > 0 ? `${inputText.length}/1000` : ''}
                    </span>

                    {/* Send or Stop Button (Filled green circle / Stop button) */}
                    {isStreaming || isThinking ? (
                      <button
                        type="button"
                        onClick={handleStop}
                        className="w-9 h-9 rounded-full bg-vermillion hover:bg-vermillion/90 text-paper flex items-center justify-center transition-all duration-150 active:scale-95 shadow-xs cursor-pointer shrink-0"
                        title="Stop generating"
                        aria-label="Stop generating"
                      >
                        <span className="w-3 h-3 bg-paper rounded-[2px]" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSendMessage()}
                        disabled={!inputText.trim() && attachments.length === 0}
                        className="w-9 h-9 rounded-full bg-green-deep hover:bg-green-mid disabled:opacity-30 disabled:hover:bg-green-deep disabled:cursor-not-allowed text-paper flex items-center justify-center transition-all duration-150 active:scale-95 shadow-xs cursor-pointer shrink-0"
                        title={lang === 'bn' ? 'বার্তা পাঠান' : 'Send message'}
                        aria-label="Send message"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="translate-x-[0.5px]">
                          <line x1="22" y1="2" x2="11" y2="13" />
                          <polygon points="22 2 15 22 11 13 2 9 22 2" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Contextual Mode Guidance Note */}
              <p className="text-center text-[11px] sm:text-[12px] font-sans text-ink-muted/80 pt-2 leading-tight sm:leading-normal px-2">
                <span className="hidden sm:inline">
                  {askMode === 'legal' ? (
                    <>
                      <span className="text-green-deep font-semibold">Legal Search:</span>{' '}
                      {lang === 'bn'
                        ? 'আপনার প্রশ্নটি Qdrant Cloud (nothi-legal-official) এবং ওপেনরাউটারে অ্যাডভোকেট যুক্তিযুক্তকরণে পাঠানো হয়।'
                        : 'Queries Qdrant Cloud (nothi-legal-official) and retrieves lawyer-grounded statutory analysis via OpenRouter.'}
                      {attachments.length > 0 && (
                        <span className="text-brass font-medium">
                          {' '}{lang === 'bn' ? 'সংযুক্ত নথির তথ্যও কেস ফ্যাক্ট হিসেবে অন্তর্ভুক্ত হবে।' : 'Extracted attachment text is also analyzed as case facts.'}
                        </span>
                      )}
                    </>
                  ) : askMode === 'document' ? (
                    <>
                      <span className="text-green-deep font-semibold">Document Q&A:</span>{' '}
                      {lang === 'bn'
                        ? 'উত্তর সরাসরি আপনার সংযুক্ত সাফ কবলা, খতিয়ান বা এনআইডি থেকে দেওয়া হবে।'
                        : 'Answers are grounded strictly in your attached deed, khatian, or NID scans.'}
                    </>
                  ) : (
                    <>
                      <span className="text-green-deep font-semibold">Statutory Vetting:</span>{' '}
                      {lang === 'bn'
                        ? '২৮টি সংবিধিবদ্ধ ধারা দ্বারা নিয়ন্ত্রিত।'
                        : 'Deterministic verification against 28 codified sections of Bangladeshi property law.'}
                    </>
                  )}
                  <br className="hidden sm:inline" />
                </span>
                <span className="opacity-75">
                  {lang === 'bn'
                    ? 'নথি এআই কেবল সংবিধিবদ্ধ ধারা ব্যাখ্যা করে • এটি লাইসেন্সপ্রাপ্ত আইনজীবীর বিকল্প নয়।'
                    : 'Nothi AI explains verified statutory sections • Not legal advice.'}
                </span>
              </p>
            </div>
          </div>
        </main>
      </div>

      {/* ── 4. CORPUS 28-SECTION LIST MODAL ── */}
      <CorpusListModal
        isOpen={corpusListOpen}
        onClose={() => setCorpusListOpen(false)}
        onSelectSection={(sec) => {
          setCorpusListOpen(false);
          setActiveCitationSection(sec);
        }}
      />

      {/* ── 5. STATUTORY VERBATIM INSPECTION MODAL ── */}
      {activeCitationSection && (
        <DrawerDetailModal
          section={activeCitationSection}
          citationId={activeCitationSection.id}
          onClose={() => setActiveCitationSection(null)}
        />
      )}

      {/* ── 6. IMAGE LIGHTBOX MODAL ── */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightboxImage}
              alt="Enlarged document preview"
              className="rounded-md shadow-2xl object-contain max-h-[85vh] mx-auto border border-white/20"
            />
            <button
              type="button"
              onClick={() => setLightboxImage(null)}
              className="absolute top-3 right-3 px-3 py-1 rounded-xs bg-black/70 text-white font-mono text-xs hover:bg-black cursor-pointer"
            >
              ✕ Close
            </button>
          </div>
        </div>
      )}

      {/* ── 7. CHAMBER SIGN IN MODAL ── */}
      <SignInModal
        isOpen={signInModalOpen}
        onClose={() => setSignInModalOpen(false)}
      />

      {/* ── 8. ATTACHMENT EXTRACTED TEXT REVIEW MODAL ── */}
      {inspectingAttachment && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 select-text"
          onClick={() => setInspectingAttachment(null)}
        >
          <div
            className="bg-paper border border-brass/60 rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl p-6 space-y-4 text-ink"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <h3 className="font-heading font-bold text-green-deep text-lg">
                  {inspectingAttachment.name}
                </h3>
                <p className="text-xs text-ink-muted font-mono mt-0.5">
                  Extracted Document Text • {inspectingAttachment.text.length} chars • ~{Math.ceil(inspectingAttachment.text.split(/\s+/).length)} words
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInspectingAttachment(null)}
                className="p-1 text-ink-muted hover:text-ink font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3.5 bg-paper-light rounded-lg border border-border/70 font-mono text-xs whitespace-pre-wrap leading-relaxed text-ink select-text">
              {inspectingAttachment.text}
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-ink-muted">
                Extracted via Node.js PDF.js / Tesseract OCR
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(inspectingAttachment.text);
                  }}
                  className="px-3 py-1.5 rounded-full border border-border bg-paper hover:bg-paper-dark text-xs font-semibold cursor-pointer transition-colors"
                >
                  Copy Text
                </button>
                <button
                  type="button"
                  onClick={() => setInspectingAttachment(null)}
                  className="px-4 py-1.5 rounded-full bg-green-deep hover:bg-green-mid text-paper text-xs font-semibold cursor-pointer transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
