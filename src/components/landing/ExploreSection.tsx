'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLang } from '@/lib/lang';

export function ExploreSection() {
  const { lang } = useLang();
  const [activeTab, setActiveTab] = useState<'deed' | 'khatian' | 'nid'>('deed');

  const TRIAD_DOCS = {
    deed: {
      type: 'Saf Kabala Property Deed',
      typeBn: 'সাফ কবলা দলিল',
      serial: 'Deed No. 4812/2023 • Sub-Registry Sadar',
      act: 'Registration Act, 1908 (Sec. 17 & 23)',
      badge: 'Primary Conveyance',
      status: 'VERIFIED COMPLIANT',
      statusColor: 'green',
      fields: [
        { label: 'Vendor / Transferor', val: 'Md. Rafiqul Islam (পিতা: মরহুম আবুল কাশেম)' },
        { label: 'Purchaser / Transferee', val: 'Begum Sultana (স্বামী: মোশাররফ হোসেন)' },
        { label: 'Schedule Dag (Plot)', val: 'RS Dag No. 892 • Area: 0.1650 Acre' },
        { label: 'Execution & Filing', val: 'Exec: 12-Oct-2023 → Pres: 18-Nov-2023 (37 Days)' },
      ],
      complianceNote:
        'Section 23 4-month presentation window strictly satisfied. Compulsory registration requirements under Section 17 verified.',
    },
    khatian: {
      type: 'Collectorate RS / BS Khatian',
      typeBn: 'কালেক্টরেট আরএস / বিএস খতিয়ান',
      serial: 'Khatian Ledger No. 104 • Mouza Tejgaon (JL 24)',
      act: 'Transfer of Property Act, 1882 (Sec. 54)',
      badge: 'Record of Rights',
      status: 'PARITY CONFIRMED',
      statusColor: 'green',
      fields: [
        { label: 'Recorded Owner', val: 'Md. Rafiqul Islam (Share: 16 Anna / Full)' },
        { label: 'Mouza & JL Number', val: 'Tejgaon, Thana Tejgaon, JL No. 24' },
        { label: 'Cross-Audit Dag Number', val: 'RS Dag 892 (Exact Deed Schedule Match)' },
        { label: 'Litigation Check', val: 'No Lis Pendens Suits Pending (TPA Sec. 52 Clean)' },
      ],
      complianceNote:
        'Dag 892 title lineage verified. Zero adverse mutation encumbrances detected under Section 4 of LCPRA 2023.',
    },
    nid: {
      type: 'National Identity Smart Card',
      typeBn: 'জাতীয় পরিচয়পত্র স্মার্ট কার্ড',
      serial: 'NID: 19882692015000142 • Standard 17-Digit',
      act: 'NIDW Rules, 2010 (Rule 3)',
      badge: 'Identity Parity',
      status: 'FORMAT CERTIFIED',
      statusColor: 'green',
      fields: [
        { label: 'Citizen Name', val: 'Md. Rafiqul Islam (মোহাম্মদ রফিকুল ইসলাম)' },
        { label: 'Father Name', val: 'Late Abul Kashem (মৃত আবুল কাশেম)' },
        { label: 'Structural Format', val: '17-Digit Standard Format (Compliant with Rule 3)' },
        { label: 'Deed Party Alignment', val: '100% Cross-Field Character Match' },
      ],
      complianceNote:
        'Structural format compliance verified. Biometric Election Commission database parity standards satisfied.',
    },
  };

  const current = TRIAD_DOCS[activeTab];

  return (
    <section
      id="explore"
      className="py-24 sm:py-28 border-b border-border bg-paper scroll-mt-28 relative overflow-hidden"
      aria-labelledby="explore-main-heading"
    >
      {/* Subtle Background Glow */}
      <div
        className="absolute top-0 right-1/4 w-96 h-96 rounded-full pointer-events-none opacity-40 blur-3xl"
        style={{
          background: 'radial-gradient(circle, rgba(176,141,87,0.15) 0%, rgba(27,67,50,0.05) 70%, transparent 100%)',
        }}
      />

      <div className="max-w-[1280px] mx-auto px-6 sm:px-8 lg:px-12 relative z-10">
        {/* ── 1. SECTION HEADER: ENGAGING & CONFIDENT ── */}
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brass/15 border border-brass/30 text-xs font-mono font-bold text-ink">
            <span className="w-2 h-2 rounded-full bg-green-deep animate-pulse" />
            <span>Autonomous Chamber Intelligence</span>
          </div>

          <h2
            id="explore-main-heading"
            className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold text-green-deep tracking-tight"
          >
            {lang === 'bn'
              ? 'দলিল পরীক্ষণ ও স্বত্ব সুরক্ষার আধুনিক মানদণ্ড'
              : 'The Gold Standard for Property Title Vetting'}
          </h2>

          <p className="font-sans text-base sm:text-lg text-ink-muted leading-relaxed">
            {lang === 'bn'
              ? 'সাফ কবলা দলিল সম্পাদন থেকে সাব-রেজিস্ট্রেশন দাখিল: আন্তঃনথি সমতা পরীক্ষা করুন, স্বত্ব জটিলতা প্রতিরোধ করুন এবং কোনো বিভ্রমের ঝুঁকি ছাড়াই ব্যাংকের বন্ধকী জামানত সুরক্ষিত রাখুন।'
              : 'From Saf Kabala deed execution to Sub-Registry presentation: audit cross-document parity, eliminate boundary defects before closing, and protect institutional mortgages with zero hallucination risk.'}
          </p>
        </div>

        {/* ── 2. INTERACTIVE LIVE VETTING SHOWCASE + INSPIRING VALUE TIERS ── */}
        <div className="mt-14 grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Left Column: Interactive Digital Document Dossier (7 Cols) */}
          <div className="lg:col-span-7 rounded-2xl border-2 border-border bg-paper-light p-6 sm:p-8 shadow-sm flex flex-col justify-between">
            <div>
              {/* Header inside Dossier */}
              <div className="flex items-center justify-between pb-4 border-b border-border flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-green-deep uppercase tracking-wider">
                    Interactive Vetting Dossier
                  </span>
                  <span className="text-xs text-brass font-mono">• Live Simulator</span>
                </div>

                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-deep/10 text-green-deep font-mono text-[11px] font-bold border border-green-deep/20">
                  <span>✓</span>
                  <span>{current.status}</span>
                </div>
              </div>

              {/* Document Switcher Tabs */}
              <div className="mt-6 flex flex-wrap gap-2">
                {(['deed', 'khatian', 'nid'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 rounded-full font-sans text-xs font-bold transition-all cursor-pointer ${
                      activeTab === tab
                        ? 'bg-green-deep text-paper shadow-sm scale-[1.02]'
                        : 'bg-paper text-ink border border-border hover:bg-paper-dark'
                    }`}
                  >
                    {tab === 'deed' ? 'Saf Kabala Deed' : tab === 'khatian' ? 'RS/BS Khatian' : 'National ID'}
                  </button>
                ))}
              </div>

              {/* Active Document Card Simulation */}
              <div className="mt-6 p-5 sm:p-6 rounded-xl bg-paper border border-border shadow-xs space-y-5">
                <div className="flex items-start justify-between flex-wrap gap-2 pb-3 border-b border-border/70">
                  <div>
                    <h3 className="font-heading text-lg sm:text-xl font-bold text-green-deep">
                      {lang === 'bn' ? current.typeBn : current.type}
                    </h3>
                    <p className="text-xs font-mono text-ink-muted mt-0.5">{current.serial}</p>
                  </div>
                  <span className="text-xs font-mono px-3 py-1 rounded-full bg-brass/20 text-ink font-semibold">
                    {current.badge}
                  </span>
                </div>

                {/* Normalized Extracted Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs font-sans">
                  {current.fields.map((field, fIdx) => (
                    <div key={fIdx} className="p-3 rounded-lg bg-paper-light border border-border/60 space-y-1">
                      <div className="text-[10px] font-mono text-ink-muted uppercase tracking-wider">
                        {field.label}
                      </div>
                      <div className="font-semibold text-ink leading-snug">{field.val}</div>
                    </div>
                  ))}
                </div>

                {/* Statutory Parity Guarantee */}
                <div className="p-3.5 rounded-lg bg-green-deep/5 border border-green-deep/20 flex items-start gap-2.5 text-xs">
                  <span className="text-green-deep font-bold mt-0.5">§</span>
                  <div className="space-y-0.5">
                    <span className="font-mono text-green-deep font-bold">{current.act}:</span>{' '}
                    <span className="text-ink-muted font-sans">{current.complianceNote}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Proof Metrics */}
            <div className="mt-6 pt-4 border-t border-border flex items-center justify-between text-xs font-mono text-ink-muted flex-wrap gap-3">
              <span className="flex items-center gap-1.5 text-ink font-medium">
                <span className="text-green-deep font-bold">18s</span> Automated Turnaround
              </span>
              <span className="flex items-center gap-1.5 text-ink font-medium">
                <span className="text-green-deep font-bold">0%</span> Fabrication Invariant
              </span>
              <span className="flex items-center gap-1.5 text-ink font-medium">
                <span className="text-green-deep font-bold">28</span> Verified Sections
              </span>
            </div>
          </div>

          {/* Right Column: Inspiring Chamber Value & "See Plans" Pathway (5 Cols) */}
          <div className="lg:col-span-5 flex flex-col justify-between gap-6">
            {/* Value Card: Institutional ROI */}
            <div className="rounded-2xl border border-border bg-paper p-6 sm:p-7 shadow-xs space-y-4">
              <div className="inline-flex items-center gap-2 text-xs font-mono font-bold text-brass uppercase tracking-wider">
                <span>✦ Chamber ROI & Protection</span>
              </div>
              <h3 className="font-heading text-xl font-bold text-green-deep">
                {lang === 'bn'
                  ? 'ঘণ্টার পর ঘণ্টা ম্যানুয়াল অনুসন্ধানের অবসান'
                  : 'Eliminate 4+ Hours of Manual Deed Cross-Checking'}
              </h3>
              <p className="text-xs sm:text-sm text-ink-muted font-sans leading-relaxed">
                {lang === 'bn'
                  ? 'তফসিলের দাগের অমিল, ৪ মাসের রেজিস্ট্রেশন সময়সীমা ও জাল দলিলের অপরাধ প্রতিরোধ আইন এক ক্লিকে পরীক্ষা করুন। প্রতিটি অনুসন্ধান আইনে আবদ্ধ।'
                  : 'Instantly cross-audit deed recitals against collectorate Record of Rights ledgers. Detect Dag mismatches, calculate Section 23 deadlines, and screen penal liabilities before loan sanction or title registration.'}
              </p>
              <div className="pt-2 flex items-center gap-2 font-sans text-xs text-ink font-medium">
                <span className="text-green-deep font-bold">✓</span>
                <span>Sub-registry deed vetting</span>
                <span className="text-ink-muted">•</span>
                <span className="text-green-deep font-bold">✓</span>
                <span>Bank loan vetting opinions</span>
              </div>
            </div>

            {/* HIGH-IMPACT INSPIRATION CARD: EXPLORE PLANS */}
            <div className="rounded-2xl border-2 border-brass/50 bg-gradient-to-br from-paper-light via-paper to-brass/15 p-6 sm:p-7 shadow-md space-y-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-brass/10 rounded-bl-full pointer-events-none" />

              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brass/20 text-ink text-xs font-mono font-bold">
                <span>Chamber & Corporate Packages</span>
              </div>

              <h3 className="font-heading text-xl sm:text-2xl font-bold text-green-deep">
                {lang === 'bn'
                  ? 'আপনার চেম্বারের উপযোগী পরিকল্পনা বেছে নিন'
                  : 'Tailored Plans for Advocates, Chambers & Banks'}
              </h3>

              <p className="text-xs sm:text-sm text-ink-muted font-sans leading-relaxed">
                {lang === 'bn'
                  ? 'স্বতন্ত্র আইনজীবী থেকে শুরু করে কর্পোরেট লিগ্যাল চেম্বার ও কমার্শিয়াল ব্যাংকের জন্য নমনীয় প্যাকেজ। ভ্যাট/এআইটি ইনভয়েস অন্তর্ভুক্ত।'
                  : 'Whether you examine five title deeds a month or manage high-volume commercial loan portfolios, explore transparent tiers with formal bank VAT/AIT invoicing.'}
              </p>

              {/* Direct Buttons to Explore Plans & Chat */}
              <div className="pt-2 space-y-2.5">
                <Link
                  href="#pricing"
                  className="w-full py-3.5 px-5 rounded-full bg-green-deep hover:bg-green-mid text-paper font-sans text-xs font-semibold uppercase tracking-wider text-center block transition-all shadow-md active:scale-98 cursor-pointer flex items-center justify-center gap-2 group"
                >
                  <span>{lang === 'bn' ? 'সকল পরিকল্পনা ও প্যাকেজ দেখুন' : 'Explore Plans'}</span>
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </Link>

                <Link
                  href="/chat"
                  className="w-full py-2.5 px-4 rounded-full border border-border bg-paper hover:bg-paper-dark text-ink font-sans text-xs font-semibold text-center block transition-colors"
                >
                  <span>{lang === 'bn' ? 'নথি এআই চ্যাটে পরীক্ষা করুন' : 'Test Documents in Nothi AI Chat'}</span>
                </Link>
              </div>

              <div className="pt-2 flex items-center justify-between text-[11px] font-mono text-ink-muted">
                <span>✓ 28 Sections Verified</span>
                <span>✓ Formal BDT Invoicing</span>
                <span>✓ Zero Hallucination</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
