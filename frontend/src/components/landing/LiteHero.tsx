'use client';

import Link from 'next/link';
import { useLang } from '@/lib/lang';

export function LiteHero() {
  const { lang } = useLang();

  return (
    <section className="relative overflow-hidden border-b border-border bg-paper py-16 sm:py-24 lg:py-28">
      {/* Background subtle radial texture */}
      <div className="absolute inset-0 bg-[radial-gradient(#1b4332_0.75px,transparent_0.75px)] [background-size:24px_24px] opacity-15 pointer-events-none" />

      <div className="relative mx-auto max-w-[1200px] px-5 sm:px-8 lg:px-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Column: Headline, Description, CTAs */}
          <div className="lg:col-span-7 space-y-6 text-left">
            {/* Regulatory badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-brass/60 bg-paper-dark/60 text-xs font-mono font-medium text-ink shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-green-deep animate-pulse" />
              <span>{lang === 'bn' ? '২৮টি সংবিধিবদ্ধ ধারা দ্বারা নিয়ন্ত্রিত' : '28 Verified Statutory Sections'}</span>
            </div>

            {/* Main Headline */}
            <h1 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-ink leading-[1.2] text-balance">
              {lang === 'bn' ? (
                <>
                  দলিল ও খতিয়ানের সংবিধিবদ্ধ ত্রুটি নির্ণয় ও <span className="text-green-deep underline decoration-brass/60 underline-offset-4">আইনি ভেটিং</span>
                </>
              ) : (
                <>
                  Bangladeshi Property Document Auditing with{' '}
                  <span className="text-green-deep underline decoration-brass/60 underline-offset-4">Statutory Parity</span>
                </>
              )}
            </h1>

            {/* Short Paragraph */}
            <p className="font-sans text-base sm:text-lg text-ink-muted leading-relaxed max-w-xl text-pretty">
              {lang === 'bn'
                ? 'সাফ কবলা দলিল, আরএস/বিএস খতিয়ান ও জাতীয় পরিচয়পত্র যাচাই করুন বাংলাদেশের সম্পত্তি আইনের ২৮টি নির্দিষ্ট ধারার ভিত্তিতে। শূন্য মনগড়া তথ্য, সরাসরি সংবিধিবদ্ধ রেফারেন্স।'
                : 'Examine Saf Kabala deeds, RS/BS Khatians, and National IDs against 28 codified sections of Bangladeshi property law. Zero hallucinations, verified statutory citations.'}
            </p>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                href="/chat"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-green-deep hover:bg-green-mid text-paper font-sans text-sm font-semibold shadow-sm hover:shadow-md transition-all active:scale-98 min-h-[44px]"
              >
                <span>{lang === 'bn' ? 'নথি এআই সহকারী খুলুন' : 'Open the assistant'}</span>
                <span className="text-brass">→</span>
              </Link>

              <Link
                href="/pricing"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full border border-border hover:border-brass bg-paper-dark/50 hover:bg-paper-dark text-ink font-sans text-sm font-medium transition-colors min-h-[44px]"
              >
                <span>{lang === 'bn' ? 'মূল্যতালিকা দেখুন' : 'View pricing'}</span>
              </Link>
            </div>

            {/* Micro Trust Proof */}
            <div className="pt-4 flex items-center gap-6 text-xs text-ink-muted font-mono border-t border-border/60">
              <div className="flex items-center gap-1.5">
                <span className="text-green-deep font-bold">✓</span>
                <span>Registration Act, 1908</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-green-deep font-bold">✓</span>
                <span>Transfer of Property, 1882</span>
              </div>
              <div className="hidden sm:flex items-center gap-1.5">
                <span className="text-green-deep font-bold">✓</span>
                <span>LCPRA 2023</span>
              </div>
            </div>
          </div>

          {/* Right Column: Clean Static Stacked Document Cards Illustration */}
          <div className="lg:col-span-5 relative flex justify-center items-center py-4">
            <div className="relative w-full max-w-[380px] h-[340px] sm:h-[380px]">
              {/* Back Card: National ID Card */}
              <div className="absolute top-0 right-4 sm:right-6 w-[280px] sm:w-[300px] rounded-xl border border-border bg-paper-dark p-4 shadow-sm rotate-3 transition-transform hover:rotate-1">
                <div className="flex items-center justify-between border-b border-border/80 pb-2 mb-2">
                  <span className="text-[10px] font-mono uppercase text-ink-muted tracking-wider font-semibold">National ID Card</span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">Rule 3 Verified</span>
                </div>
                <div className="space-y-1.5 font-mono text-xs text-ink-muted">
                  <div className="flex justify-between"><span>NID No:</span> <span className="text-ink font-bold">19882691234567890</span></div>
                  <div className="flex justify-between"><span>Name:</span> <span className="text-ink">Md. Rafiqul Islam</span></div>
                  <div className="flex justify-between"><span>DOB:</span> <span className="text-ink">14-Feb-1988</span></div>
                </div>
              </div>

              {/* Middle Card: Collectorate RS/BS Khatian */}
              <div className="absolute top-16 left-2 sm:left-4 w-[290px] sm:w-[310px] rounded-xl border border-brass/50 bg-[#F9F6F0] p-4 shadow-md -rotate-2 transition-transform hover:rotate-0">
                <div className="flex items-center justify-between border-b border-brass/30 pb-2 mb-2">
                  <span className="text-[10px] font-mono uppercase text-brass font-bold tracking-wider">RS/BS Khatian Ledger</span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">Collectorate Record</span>
                </div>
                <div className="space-y-1.5 font-mono text-xs text-ink-muted">
                  <div className="flex justify-between"><span>Khatian No:</span> <span className="text-ink font-bold">4892 (Badda)</span></div>
                  <div className="flex justify-between"><span>CS / SA Dag:</span> <span className="text-ink">412</span></div>
                  <div className="flex justify-between"><span>Recorded Area:</span> <span className="text-ink">0.1420 Acre</span></div>
                </div>
              </div>

              {/* Front Card: Saf Kabala Deed with Planted Defect Flag */}
              <div className="absolute top-36 left-8 sm:left-12 w-[300px] sm:w-[320px] rounded-xl border-2 border-green-deep/30 bg-paper p-5 shadow-xl transition-transform hover:-translate-y-1">
                <div className="flex items-center justify-between border-b border-border pb-2.5 mb-3">
                  <span className="text-[11px] font-mono uppercase text-green-deep font-bold tracking-wider">Saf Kabala Deed #4812</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-vermillion/10 text-vermillion font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-vermillion animate-ping" />
                    ▲ Flagged
                  </span>
                </div>

                <div className="space-y-2 font-mono text-xs">
                  <div className="flex justify-between text-ink-muted">
                    <span>Deed Dag:</span>
                    <span className="text-vermillion font-bold bg-vermillion/10 px-1.5 py-0.5 rounded">Dag 413 (Mismatch with 412)</span>
                  </div>
                  <div className="flex justify-between text-ink-muted">
                    <span>Execution Lag:</span>
                    <span className="text-vermillion font-bold bg-vermillion/10 px-1.5 py-0.5 rounded">135 Days (&gt;120d Sec 23)</span>
                  </div>
                  <div className="flex justify-between text-ink-muted">
                    <span>Statutory Status:</span>
                    <span className="text-ink font-semibold">Defect Detected</span>
                  </div>
                </div>

                {/* Statutory tag footer */}
                <div className="mt-3 pt-2.5 border-t border-border flex items-center justify-between text-[10px] font-mono text-ink-muted">
                  <span>Registration Act, 1908</span>
                  <span className="text-green-deep font-bold">Sec. 23 / Sec. 17</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
