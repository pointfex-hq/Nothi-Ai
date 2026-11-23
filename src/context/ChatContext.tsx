'use client';

import {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  useEffect,
  ReactNode,
} from 'react';
import type { ChatMessage } from '@/lib/chat';
import { sendChatMessage } from '@/lib/chat';
import { useLang } from '@/lib/lang';
import { getCorpusSectionById, resolveCanonicalId } from '@/lib/citations';
import type { CorpusSection } from '@/types';

interface ChatContextType {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  openWithPrompt: (prompt: string) => void;
  messages: ChatMessage[];
  isStreaming: boolean;
  sendMessage: (text: string) => Promise<void>;
  clearChat: () => void;
  newChat: () => void;
  regenerateLast: () => Promise<void>;
  stopStreaming: () => void;
  activeCitationSection: CorpusSection | null;
  inspectCitation: (id: string) => void;
  closeCitationInspector: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

const STORAGE_KEY = 'nothi_ai_chat_v1';

export function ChatProvider({ children }: { children: ReactNode }) {
  const { lang } = useLang();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeCitationSection, setActiveCitationSection] = useState<CorpusSection | null>(null);

  const abortControllerRef = useRef<boolean>(false);

  // Safe restoration from sessionStorage on mount
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          queueMicrotask(() => {
            setMessages(parsed);
          });
        }
      }
    } catch (err) {
      console.warn('Could not restore chat session:', err);
    }
  }, []);

  // Safe persistence to sessionStorage
  const persistMessages = (msgs: ChatMessage[]) => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(msgs));
    } catch (err) {
      console.warn('Could not save chat session:', err);
    }
  };

  const stopStreaming = useCallback(() => {
    abortControllerRef.current = true;
    setIsStreaming(false);
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isStreaming) return;

      abortControllerRef.current = false;
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: trimmed,
        timestamp: Date.now(),
      };

      const updatedHistory = [...messages, userMsg];
      setMessages(updatedHistory);
      persistMessages(updatedHistory);
      setIsStreaming(true);

      const assistantId = `asst-${Date.now()}`;
      // Placeholder assistant message
      const initialAssistantMsg: ChatMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
        citations: [],
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, initialAssistantMsg]);

      try {
        let accumulatedContent = '';

        const result = await sendChatMessage(
          updatedHistory,
          lang,
          (chunk) => {
            if (abortControllerRef.current) return;
            accumulatedContent += chunk;
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantId ? { ...msg, content: accumulatedContent } : msg
              )
            );
          }
        );

        if (!abortControllerRef.current) {
          const finalMessages = updatedHistory.concat({
            id: assistantId,
            role: 'assistant',
            content: result.content,
            citations: result.citations,
            timestamp: Date.now(),
          });
          setMessages(finalMessages);
          persistMessages(finalMessages);
        }
      } catch (err) {
        console.error('Chat error:', err);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantId
              ? {
                  ...msg,
                  content:
                    lang === 'bn'
                      ? 'একটি অপ্রত্যাশিত ত্রুটি ঘটেছে। অনুগ্রহ করে আবার চেষ্টা করুন।'
                      : 'An error occurred while cross-referencing the statutory corpus. Please try again.',
                }
              : msg
          )
        );
      } finally {
        setIsStreaming(false);
      }
    },
    [messages, isStreaming, lang]
  );

  const openWithPrompt = useCallback(
    (prompt: string) => {
      setIsOpen(true);
      sendMessage(prompt);
    },
    [sendMessage]
  );

  const clearChat = useCallback(() => {
    stopStreaming();
    setMessages([]);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      console.warn('Could not clear chat session:', err);
    }
  }, [stopStreaming]);

  const newChat = useCallback(() => {
    clearChat();
  }, [clearChat]);

  const regenerateLast = useCallback(async () => {
    if (isStreaming || messages.length === 0) return;
    const lastUserIndex = [...messages].map((m) => m.role).lastIndexOf('user');
    if (lastUserIndex === -1) return;

    const trimmedHistory = messages.slice(0, lastUserIndex);
    const lastUserMessage = messages[lastUserIndex];
    setMessages(trimmedHistory);
    await sendMessage(lastUserMessage.content);
  }, [isStreaming, messages, sendMessage]);

  const inspectCitation = useCallback((id: string) => {
    const canonical = resolveCanonicalId(id);
    const section = getCorpusSectionById(canonical);
    if (section) {
      setActiveCitationSection(section);
    }
  }, []);

  const closeCitationInspector = useCallback(() => {
    setActiveCitationSection(null);
  }, []);

  return (
    <ChatContext.Provider
      value={{
        isOpen,
        setIsOpen,
        openWithPrompt,
        messages,
        isStreaming,
        sendMessage,
        clearChat,
        newChat,
        regenerateLast,
        stopStreaming,
        activeCitationSection,
        inspectCitation,
        closeCitationInspector,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return ctx;
}
