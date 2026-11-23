'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { useChat } from '@/context/ChatContext';
import { useLang } from '@/lib/lang';
import { Logo } from '@/components/Logo';
import { AnimatedLogo } from './AnimatedLogo';
import { DrawerDetailModal } from '@/components/landing/citation-gate/DrawerDetailModal';

const SUGGESTED_QUESTIONS = [
  'How long can pass between signing and registering a deed?',
  'What makes an NID number valid?',
  'What does a Dag number mismatch mean?',
  'What is a Khatian used for?',
];

export function ChatDrawer() {
  const {
    isOpen,
    setIsOpen,
    messages,
    isStreaming,
    sendMessage,
    newChat,
    regenerateLast,
    stopStreaming,
    activeCitationSection,
    inspectCitation,
    closeCitationInspector,
  } = useChat();

  const { lang, setLang } = useLang();
  const [inputText, setInputText] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  const drawerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const lastActiveElementRef = useRef<HTMLElement | null>(null);

  // Focus management and escape key listener
  useEffect(() => {
    if (isOpen) {
      lastActiveElementRef.current = document.activeElement as HTMLElement | null;
      textareaRef.current?.focus();

      const handleKeyDown = (e: globalThis.KeyboardEvent) => {
        if (e.key === 'Escape') {
          setIsOpen(false);
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    } else {
      if (lastActiveElementRef.current) {
        lastActiveElementRef.current.focus();
      }
    }
  }, [isOpen, setIsOpen]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (!showScrollBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, showScrollBottom]);

  // Auto-grow textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [inputText]);

  const handleScroll = () => {
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const isUp = scrollHeight - scrollTop - clientHeight > 80;
    setShowScrollBottom(isUp);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setShowScrollBottom(false);
  };

  const handleSend = () => {
    if (!inputText.trim() || isStreaming) return;
    sendMessage(inputText);
    setInputText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopy = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* ── BACKDROP (DIMMED BUT NON-BLOCKING FOR PAGE SCROLL) ── */}
      <div
        className="fixed inset-0 z-50 bg-black/35 backdrop-blur-[1px] transition-opacity duration-200"
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      />

      {/* ── CHAT DRAWER PANEL (440PX DESKTOP / FULL-SCREEN MOBILE) ── */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Nothi AI Statutory Legal Assistant"
        className="fixed top-0 right-0 z-50 h-full w-full sm:w-[440px] bg-paper text-ink shadow-2xl flex flex-col border-l border-border transition-transform duration-250 ease-out"
      >
        {/* Top Header */}
        <div className="p-4 border-b border-border bg-paper-light flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Logo />
          </div>

          <div className="flex items-center gap-2">
            {/* Language Switch */}
            <button
              type="button"
              onClick={() => setLang(lang === 'en' ? 'bn' : 'en')}
              className="px-2 py-1 rounded-xs border border-border text-[11px] font-mono hover:bg-paper-dark transition-colors cursor-pointer"
              title="Toggle reply language"
            >
              {lang === 'en' ? 'বাংলা' : 'EN'}
            </button>

            {/* New Chat Button */}
            <button
              type="button"
              onClick={newChat}
              className="px-2.5 py-1 rounded-xs border border-border bg-paper text-xs font-mono hover:bg-paper-dark transition-colors cursor-pointer"
              title="Start a new conversation"
            >
              New chat
            </button>

            {/* Close Drawer Button */}
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close chat drawer"
              className="p-1.5 rounded-xs text-ink-muted hover:text-ink hover:bg-paper-dark transition-colors focus-visible:ring-2 focus-visible:ring-brass focus-visible:outline-hidden cursor-pointer"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Messages Body */}
        <div
          ref={messagesContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-4 space-y-4"
        >
          {messages.length === 0 ? (
            /* ── EMPTY STATE ── */
            <div className="h-full flex flex-col justify-center space-y-6 text-center px-2 py-6">
              <div className="w-12 h-12 mx-auto rounded-full bg-green-deep/10 border border-green-deep/30 flex items-center justify-center text-green-deep">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>

              <div className="space-y-1">
                <h3 className="font-heading text-lg font-bold text-green-deep">
                  {lang === 'bn' ? 'নথি এআই সংবিধিবদ্ধ সহকারী' : 'Ask Nothi AI'}
                </h3>
                <p className="text-xs text-ink-muted font-sans leading-relaxed">
                  {lang === 'bn'
                    ? 'বাংলাদেশের স্থাবর সম্পত্তি হস্তান্তরের সংবিধিবদ্ধ আইন (রেজিস্ট্রেশন আইন, সম্পত্তি হস্তান্তর আইন ও এনআইডি) সম্পর্কিত প্রশ্ন করুন।'
                    : 'Ask about Bangladeshi statutory property law, deed registration windows, NID validation formats, or Khatian records.'}
                </p>
              </div>

              {/* Suggested Prompts */}
              <div className="space-y-2 text-left">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-ink-muted block">
                  Suggested Questions:
                </span>
                <div className="space-y-1.5">
                  {SUGGESTED_QUESTIONS.map((question, qIdx) => (
                    <button
                      key={qIdx}
                      type="button"
                      onClick={() => sendMessage(question)}
                      className="w-full text-left p-2.5 rounded-sm border border-border bg-paper-light hover:bg-paper-dark/60 text-xs font-sans text-ink transition-colors cursor-pointer flex items-center justify-between group"
                    >
                      <span>{question}</span>
                      <span className="text-brass opacity-0 group-hover:opacity-100 transition-opacity">
                        &rarr;
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* ── MESSAGE THREAD ── */
            <>
              {messages.map((msg, index) => {
                const isUser = msg.role === 'user';
                const isLastAssistant =
                  !isUser && index === messages.map((m) => m.role).lastIndexOf('assistant');

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} group space-y-1`}
                  >
                    {/* Timestamp on hover */}
                    <span className="text-[10px] font-mono text-ink-muted/60 opacity-0 group-hover:opacity-100 transition-opacity duration-150 px-1">
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>

                    {/* Message Container */}
                    {isUser ? (
                      /* USER BUBBLE: Green, 18px radius, flatter corner toward sender */
                      <div className="bg-green-deep text-paper rounded-[18px] rounded-tr-[4px] px-4 py-2.5 max-w-[85%] text-sm font-sans leading-relaxed shadow-xs">
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    ) : (
                      /* ASSISTANT MESSAGE: Clean sans text, no box, animated logo avatar */
                      <div className="w-full pl-0.5 space-y-2 text-sm font-sans text-ink leading-relaxed">
                        <div className="flex items-center gap-2 text-xs font-semibold text-green-deep">
                          <AnimatedLogo state="idle" size={20} />
                          <span>Nothi AI</span>
                        </div>

                        <div className="pl-7 space-y-2">
                          {msg.content ? (
                            <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                          ) : (
                            /* Typing indicator while streaming starts */
                            <div className="flex items-center gap-1.5 py-1">
                              <span className="w-2 h-2 rounded-full bg-brass animate-pulse" />
                              <span className="w-2 h-2 rounded-full bg-brass animate-pulse delay-100" />
                              <span className="w-2 h-2 rounded-full bg-brass animate-pulse delay-200" />
                            </div>
                          )}

                          {/* Citation Chips: Modern pill style, soft hover lift */}
                          {msg.citations && msg.citations.length > 0 && (
                            <div className="pt-2 border-t border-border/60 space-y-1.5">
                              <span className="text-[10px] font-mono uppercase tracking-wider text-green-deep font-bold block">
                                Verified Statutory Citations:
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {msg.citations.map((cite) => (
                                  <button
                                    key={cite.id}
                                    type="button"
                                    onClick={() => inspectCitation(cite.id)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-border/90 bg-paper-light hover:border-brass hover:bg-paper text-ink text-xs font-mono transition-all duration-150 ease-out cursor-pointer shadow-2xs hover:shadow-xs hover:-translate-y-0.5 active:scale-95 group focus-visible:ring-2 focus-visible:ring-brass focus-visible:outline-hidden"
                                    title={`Inspect Section: ${cite.act}`}
                                  >
                                    <span className="text-[11px] text-green-deep font-bold font-mono">§</span>
                                    <span className="font-mono font-semibold text-green-deep text-[11px]">
                                      {cite.section || cite.id}
                                    </span>
                                    <span className="text-ink-muted text-[11px] font-sans opacity-75 truncate max-w-[130px]">
                                      ({cite.act})
                                    </span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Assistant Actions Toolbar (Fades in on hover) */}
                          {msg.content && (
                            <div className="pt-1.5 flex items-center gap-3 text-xs font-sans text-ink-muted opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                              <button
                                type="button"
                                onClick={() => handleCopy(msg.content, msg.id)}
                                className="hover:text-green-deep cursor-pointer flex items-center gap-1 transition-colors"
                              >
                                <span>{copiedId === msg.id ? '✓ Copied' : 'Copy'}</span>
                              </button>

                              {isLastAssistant && !isStreaming && (
                                <button
                                  type="button"
                                  onClick={regenerateLast}
                                  className="hover:text-green-deep cursor-pointer flex items-center gap-1 transition-colors"
                                >
                                  <span>↺ Regenerate</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Jump to Latest Floating Pill */}
        {showScrollBottom && (
          <button
            type="button"
            onClick={scrollToBottom}
            className="absolute bottom-24 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-paper border border-border text-ink text-xs font-sans shadow-md flex items-center gap-1 cursor-pointer animate-in fade-in transition-transform duration-150 active:scale-95"
          >
            <span>↓ Jump to latest</span>
          </button>
        )}

        {/* Floating Rounded Input Bar (20px radius, layered shadow, focus ring) */}
        <div className="p-4 border-t border-border/80 bg-paper-light/95 backdrop-blur-xs space-y-2 shrink-0">
          <div className="relative rounded-[20px] border border-border/90 bg-paper shadow-[0_4px_20px_-2px_rgba(27,67,50,0.06),0_2px_6px_-1px_rgba(0,0,0,0.04)] focus-within:border-brass/80 focus-within:ring-2 focus-within:ring-brass/25 transition-all duration-200 p-2 sm:p-2.5 space-y-1">
            <textarea
              ref={textareaRef}
              rows={1}
              maxLength={1000}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isStreaming}
              placeholder={
                lang === 'bn'
                  ? 'দলিল দাখিলের সময়সীমা বা ধারা সম্পর্কে প্রশ্ন লিখুন...'
                  : 'Ask about deed timelines, NID formats, or Khatians...'
              }
              className="w-full px-2 py-1 text-xs sm:text-sm font-sans text-ink placeholder:text-ink-muted/50 bg-transparent resize-none max-h-32 focus:outline-hidden leading-relaxed"
            />

            <div className="flex items-center justify-between pt-1 border-t border-border/40 px-1">
              {/* Character counter inside the bar */}
              <span className="text-[10px] font-mono text-ink-muted">
                {inputText.length > 0 ? `${inputText.length}/1000` : ''}
              </span>

              {/* Filled Green Circle Send Button that turns into Stop button */}
              {isStreaming ? (
                <button
                  type="button"
                  onClick={stopStreaming}
                  className="w-8 h-8 rounded-full bg-vermillion hover:bg-vermillion/90 text-paper flex items-center justify-center transition-all duration-150 active:scale-95 shadow-xs cursor-pointer"
                  title="Stop generating"
                  aria-label="Stop generating"
                >
                  <span className="w-2.5 h-2.5 rounded-xs bg-paper" />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={!inputText.trim()}
                  onClick={handleSend}
                  className="w-8 h-8 rounded-full bg-green-deep hover:bg-green-mid disabled:opacity-30 disabled:hover:bg-green-deep text-paper flex items-center justify-center transition-all duration-150 active:scale-95 shadow-xs cursor-pointer disabled:cursor-not-allowed"
                  title="Send message"
                  aria-label="Send message"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Statutory disclaimer note */}
          <p className="text-center text-[10px] sm:text-[11px] font-sans text-ink-muted">
            Nothi AI explains verified statutory sections. It does not replace a licensed advocate.
          </p>
        </div>
      </div>

      {/* Citation Inspector Modal (Triggered by clicking chips) */}
      <DrawerDetailModal
        section={activeCitationSection}
        citationId={activeCitationSection?.id || null}
        onClose={closeCitationInspector}
      />
    </>
  );
}
