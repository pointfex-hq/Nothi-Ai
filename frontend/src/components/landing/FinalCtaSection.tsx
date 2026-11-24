'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLang } from '@/lib/lang';
import { ContactModal } from '@/components/pricing/ContactModal';

export function FinalCtaSection() {
  const { lang } = useLang();
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <section className="py-20 sm:py-24 bg-paper-dark border-b border-border">
      <div className="max-w-[1280px] mx-auto px-6 sm:px-8 lg:px-12 text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brass/20 text-ink text-xs font-mono font-bold">
          <span>Phase 1 Production Ready</span>
        </div>

        <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold text-green-deep tracking-tight max-w-3xl mx-auto">
          {lang === 'bn'
            ? 'আপনার চেম্বারের জন্য সংবিধিবদ্ধ দলিল যাচাই শুরু করুন'
            : 'Elevate statutory property vetting for your chamber'}
        </h2>

        <p className="font-sans text-sm sm:text-base text-ink-muted max-w-2xl mx-auto leading-relaxed">
          {lang === 'bn'
            ? 'আইনি চেম্বার, আর্থিক প্রতিষ্ঠান ও ডেভেলপারদের সাথে যুক্ত হোন যারা কোনো বিভ্রমের ঝুঁকি ছাড়াই সংবিধিবদ্ধ সত্যের ভিত্তিতে দলিল নিরীক্ষা করছেন।'
            : 'Join legal advocates, commercial loan teams, and property examiners vetting deeds, Khatians, and NIDs with zero hallucination risk.'}
        </p>

        <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/chat"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-brass text-desk-dark hover:bg-brass-light font-sans text-sm font-bold transition-all shadow-lg hover:shadow-brass/25 active:scale-95 cursor-pointer"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span>{lang === 'bn' ? 'নথি এআই চ্যাটে যান' : 'Chat with Nothi AI'}</span>
            <span className="text-base leading-none">→</span>
          </Link>

          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full border-2 border-border bg-paper hover:bg-paper-light text-ink font-sans text-sm font-semibold transition-all shadow-2xs hover:border-brass/70 active:scale-95 cursor-pointer"
          >
            <span>Request a Demo</span>
            <span>&rarr;</span>
          </button>
        </div>
      </div>

      <ContactModal
        isOpen={modalOpen}
        initialPlan="demo"
        onClose={() => setModalOpen(false)}
      />
    </section>
  );
}
