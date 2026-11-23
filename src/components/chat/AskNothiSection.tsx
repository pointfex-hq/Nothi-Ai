'use client';

import { useState, FormEvent } from 'react';
import { useChat } from '@/context/ChatContext';
import { useLang } from '@/lib/lang';

const SUGGESTED_CHIPS = [
  'How long can pass between signing and registering a deed?',
  'What makes an NID number valid?',
  'What does a Dag number mismatch mean?',
  'What is a Khatian used for?',
];

export function AskNothiSection() {
  const { openWithPrompt } = useChat();
  const { lang } = useLang();
  const [query, setQuery] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    openWithPrompt(query.trim());
    setQuery('');
  };

  return (
    <section
      id="ask-ai"
      className="py-16 sm:py-20 border-b border-border bg-paper-light scroll-mt-24"
      aria-labelledby="ask-nothi-heading"
    >
      <div className="max-w-[1280px] mx-auto px-6 sm:px-8 lg:px-12">
        <div className="max-w-3xl mx-auto text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brass/15 border border-brass/30 text-xs font-mono font-bold text-ink">
            <span className="w-2 h-2 rounded-full bg-brass animate-pulse" />
            <span>Interactive Legal Assistant</span>
          </div>

          <h2
            id="ask-nothi-heading"
            className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold text-green-deep tracking-tight"
          >
            {lang === 'bn'
              ? 'সম্পত্তির দলিল ও আইন সম্পর্কিত প্রশ্ন করুন'
              : 'Ask about a Bangladeshi property document'}
          </h2>

          <p className="text-sm sm:text-base text-ink-muted font-sans max-w-xl mx-auto leading-relaxed">
            {lang === 'bn'
              ? 'রেজিস্ট্রেশন আইন, সম্পত্তি হস্তান্তর আইন ও এনআইডি বিধিমালার সংবিধিবদ্ধ ধারার ভিত্তিতে তাৎক্ষণিক নির্ভরযোগ্য উত্তর।'
              : 'Instant statutory answers verified directly against the Registration Act 1908, Transfer of Property Act 1882, and NID rules.'}
          </p>
        </div>

        {/* Large Central Input Box */}
        <div className="mt-8 max-w-2xl mx-auto">
          <form
            onSubmit={handleSubmit}
            className="relative flex items-center rounded-sm border-2 border-border bg-paper shadow-md transition-all focus-within:border-brass focus-within:ring-2 focus-within:ring-brass"
          >
            <div className="pl-4 text-ink-muted">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>

            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                lang === 'bn'
                  ? 'দলিল দাখিলের সময়সীমা, খতিয়ান বা এনআইডি সংক্রান্ত প্রশ্ন লিখুন...'
                  : 'Ask about deed timelines, Khatians, Dag numbers, or NID formats...'
              }
              className="flex-1 px-4 py-4 sm:py-5 text-sm sm:text-base font-sans text-ink placeholder:text-ink-muted/50 bg-transparent focus:outline-hidden"
            />

            <div className="pr-3">
              <button
                type="submit"
                disabled={!query.trim()}
                className="px-5 py-2.5 sm:py-3 rounded-xs bg-green-deep hover:bg-green-mid disabled:opacity-40 text-paper font-sans text-xs sm:text-sm font-semibold transition-all shadow-xs active:scale-95 cursor-pointer disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                <span>Ask AI</span>
                <span>&rarr;</span>
              </button>
            </div>
          </form>

          {/* 4 Suggested Question Chips */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <span className="text-xs font-mono text-ink-muted mr-1">Popular:</span>
            {SUGGESTED_CHIPS.map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => openWithPrompt(chip)}
                className="px-3 py-1.5 rounded-full border border-border bg-paper hover:bg-paper-dark/60 text-xs font-sans text-ink transition-colors cursor-pointer shadow-2xs hover:border-brass/70"
              >
                {chip}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
