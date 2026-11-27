'use client';

import { useState, FormEvent } from 'react';
import { useChat } from '@/context/ChatContext';
import { useLang } from '@/lib/lang';
import { useAuth } from '@/lib/auth';
import { SignInModal } from '@/components/auth/SignInModal';

const SUGGESTED_CHIPS = [
  'How long can pass between signing and registering a deed?',
  'What makes an NID number valid?',
  'What does a Dag number mismatch mean?',
  'What is a Khatian used for?',
];

export function AskNothiSection() {
  const { openWithPrompt } = useChat();
  const { lang } = useLang();
  const { user } = useAuth();
  const [signInModalOpen, setSignInModalOpen] = useState(false);
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

        {/* Central Area: Guest CTA vs Authenticated Input Box */}
        {!user ? (
          <div className="mt-8 max-w-2xl mx-auto p-8 rounded-xl border border-brass/40 bg-paper shadow-md text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-brass/15 text-green-deep mx-auto flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <h3 className="font-heading text-xl font-bold text-green-deep">
              {lang === 'bn' ? 'সাইন ইন করে সহকারী ব্যবহার করুন' : 'Sign In to Access the Statutory Assistant'}
            </h3>
            <p className="text-xs sm:text-sm text-ink-muted font-sans max-w-md mx-auto">
              {lang === 'bn'
                ? 'আইনি যাচাই ও সংবিধিবদ্ধ চ্যাট শুধুমাত্র নিবন্ধিত চেম্বার ও আইনজীবীদের জন্য সংরক্ষিত।'
                : 'Legal record vetting and statutory examination are reserved for authenticated chambers, advocates, and vetting officers.'}
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setSignInModalOpen(true)}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-green-deep hover:bg-green-mid text-paper text-xs sm:text-sm font-semibold transition-all shadow-md hover:shadow-lg active:scale-95 cursor-pointer"
              >
                <span>{lang === 'bn' ? 'সাইন ইন করুন' : 'Sign In to Consult AI'}</span>
                <span>&rarr;</span>
              </button>
            </div>
            <SignInModal isOpen={signInModalOpen} onClose={() => setSignInModalOpen(false)} />
          </div>
        ) : (
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
                className="flex-1 px-4 py-4 sm:py-5 text-sm sm:text-base font-sans text-ink placeholder:text-ink-muted/50 bg-transparent border-none outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 shadow-none"
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
        )}
      </div>
    </section>
  );
}
