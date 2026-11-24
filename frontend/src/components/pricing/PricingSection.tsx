'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PLANS, PlanConfig } from '@/config/plans';
import { ContactModal } from './ContactModal';

export function PricingSection({ showFaq = true }: { showFaq?: boolean }) {
  const [isYearly, setIsYearly] = useState(false);
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    plan: 'free' | 'basic' | 'pro' | 'demo';
  }>({
    isOpen: false,
    plan: 'basic',
  });

  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const FAQ_ITEMS = [
    {
      q: 'Which documents are supported in Phase 1?',
      a: 'Phase 1 deterministically vets the primary Bangladeshi property conveyance triad: Saf Kabala deeds (সাফ কবলা), Collectorate RS and BS Khatian ledgers (আরএস ও বিএস খতিয়ান), and National ID smart cards (জাতীয় পরিচয়পত্র). PDF, JPG, and PNG formats up to 15 MB per document are supported.',
    },
    {
      q: 'How is statutory accuracy protected against AI hallucination?',
      a: 'Nothi AI enforces a zero-fabrication invariant (SRS FR-4.2, NFR-1). Findings and chat explanations must resolve against our verified legal corpus (laws_corpus.json, 28 sections across 4 Acts). Any citation ID not present in the verified corpus is deterministically stripped and logged before rendering.',
    },
    {
      q: 'What can the Nothi AI chat answer, and what can it not?',
      a: 'The assistant explains statutory rules governing deed registration deadlines (Section 23, Registration Act 1908), plot/Dag identification (Transfer of Property Act 1882), Khatian title chain records, and NID format requirements. It will refuse to answer or fabricate rules for unverified topics outside the statutory corpus.',
    },
    {
      q: 'Does Nothi AI replace a licensed advocate?',
      a: 'No. Nothi AI is a deterministic statutory vetting assistant designed for legal vetting officers, advocates, and bank compliance teams. It performs mathematical parity and statutory checks, but does not render legal advice or replace formal title clearance opinions by an advocate.',
    },
    {
      q: 'How are sensitive property deeds and National ID numbers handled?',
      a: 'Uploaded files are processed in ephemeral memory and automatically purged after audit completion. National ID numbers are normalized strictly in-session to verify 10-digit or 13/17-digit format and are never stored or logged in plain text.',
    },
    {
      q: 'How does billing and invoicing work for chambers and banks?',
      a: 'Subscriptions are billed in Bangladeshi Taka (BDT) on either a monthly or annual basis (with a 20% annual discount). Enterprise Pro plans include formal bank VAT/AIT invoicing and institutional purchase orders.',
    },
  ];

  return (
    <section id="pricing" className="py-24 border-b border-border bg-paper-light scroll-mt-24">
      <div className="max-w-[1280px] mx-auto px-6 sm:px-8 lg:px-12">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brass/15 border border-brass/30 text-xs font-mono font-bold text-ink">
            <span className="w-2 h-2 rounded-full bg-green-deep animate-pulse" />
            <span>Explore Plans & Capabilities</span>
          </div>

          <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold text-green-deep tracking-tight">
            Explore Plans for chambers, banks and developers
          </h2>

          <p className="text-sm sm:text-base text-ink-muted font-sans max-w-xl mx-auto leading-relaxed">
            Deterministic statutory vetting tailored for independent advocates, corporate law firms, and commercial loan syndicates.
          </p>

          {/* Monthly / Yearly Billing Toggle */}
          <div className="pt-4 flex items-center justify-center gap-3">
            <span className={`text-xs font-mono font-semibold ${!isYearly ? 'text-ink' : 'text-ink-muted'}`}>
              Monthly
            </span>

            <button
              type="button"
              role="switch"
              aria-checked={isYearly}
              onClick={() => setIsYearly(!isYearly)}
              aria-label="Toggle annual billing discount"
              className="relative w-12 h-6 rounded-full bg-paper-dark border border-border p-0.5 transition-colors focus-visible:ring-2 focus-visible:ring-brass focus-visible:outline-hidden cursor-pointer"
            >
              <div
                className={`w-4 h-4 rounded-full bg-green-deep transition-transform duration-200 ${
                  isYearly ? 'translate-x-6 bg-brass' : 'translate-x-0'
                }`}
              />
            </button>

            <span className={`text-xs font-mono font-semibold ${isYearly ? 'text-green-deep' : 'text-ink-muted'}`}>
              Yearly <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-brass/20 text-ink font-bold">Save 20%</span>
            </span>
          </div>
        </div>

        {/* ── 3 PRICING CARDS (FREE, BASIC, PRO) ── */}
        <div className="mt-14 grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
          {PLANS.map((plan: PlanConfig) => {
            const isRec = plan.recommended;
            const price = isYearly ? plan.priceYearlyBdt : plan.priceMonthlyBdt;

            return (
              <div
                key={plan.id}
                className={`relative rounded-3xl transition-all duration-300 flex flex-col justify-between group ${
                  isRec
                    ? 'bg-gradient-to-b from-[#1b4332] to-[#122e22] text-paper shadow-2xl hover:shadow-[0_20px_50px_rgba(27,67,50,0.3)] border-2 border-brass/90 ring-4 ring-brass/15 lg:-translate-y-3 z-10 p-7 sm:p-8'
                    : 'bg-paper text-ink shadow-sm hover:shadow-xl border border-border/80 hover:border-brass/50 p-6 sm:p-7 hover:-translate-y-1'
                }`}
              >
                {/* Badge (Most popular / Starter / Enterprise) */}
                {plan.badge && (
                  <div
                    className={`absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full font-mono text-[10px] font-black uppercase tracking-widest shadow-md transition-all duration-300 group-hover:scale-105 ${
                      isRec
                        ? 'bg-brass text-ink border border-brass-light shadow-brass/30'
                        : 'bg-paper-dark text-ink border border-border'
                    }`}
                  >
                    {plan.badge}
                  </div>
                )}

                <div className="space-y-6">
                  {/* Plan Name & Tagline */}
                  <div>
                    <h3 className={`font-heading text-2xl sm:text-3xl font-bold tracking-tight ${isRec ? 'text-paper' : 'text-green-deep'}`}>
                      {plan.name}
                    </h3>
                    <p className={`text-xs mt-2 font-sans leading-relaxed ${isRec ? 'text-paper-dark/90' : 'text-ink-muted'}`}>
                      {plan.tagline}
                    </p>
                  </div>

                  {/* Pricing Display */}
                  <div className="pt-3 border-t border-current/15">
                    {price !== null ? (
                      <div className="transition-all duration-300">
                        <div className="flex items-baseline gap-1.5">
                          <span className="font-mono text-xs opacity-75">BDT</span>
                          <span className="font-mono text-3xl sm:text-4xl font-extrabold tracking-tight">
                            ৳{price.toLocaleString()}
                          </span>
                          <span className="text-xs font-mono opacity-70">
                            {isYearly ? '/ yr' : '/ mo'}
                          </span>
                        </div>
                        {isYearly && price > 0 && (
                          <div className={`text-[11px] font-mono mt-1 ${isRec ? 'text-brass-light' : 'text-green-deep'}`}>
                            ৳{Math.round(price / 12).toLocaleString()}/mo billed annually
                          </div>
                        )}
                        {price === 0 && (
                          <div className={`text-[11px] font-mono mt-1 ${isRec ? 'text-paper-dark' : 'text-ink-muted'}`}>
                            Free forever • No credit card needed
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-baseline gap-2">
                        <span className="font-heading text-3xl font-bold">Custom Quote</span>
                        <span className="text-xs font-mono opacity-70">/ institutional</span>
                      </div>
                    )}
                  </div>

                  {/* Clean Positive Capabilities List */}
                  <div className="pt-2 space-y-3">
                    <span className="text-[10px] font-mono uppercase tracking-wider opacity-75 font-bold block">
                      Included Capabilities:
                    </span>
                    <ul className="space-y-3 text-xs sm:text-[13px] font-sans">
                      {plan.features.map((feat, fIdx) => (
                        <li key={fIdx} className="flex items-start gap-2.5 leading-snug">
                          <span className={`shrink-0 font-bold text-sm ${isRec ? 'text-brass-light' : 'text-green-deep'}`}>
                            ✓
                          </span>
                          <span>{feat.text}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Primary Button */}
                <div className="pt-8">
                  {plan.ctaType === 'free' ? (
                    <Link
                      href="/chat"
                      className="w-full py-3.5 rounded-2xl bg-paper-dark hover:bg-border text-ink font-sans text-xs font-bold uppercase tracking-wider text-center block transition-all border border-border shadow-2xs hover:shadow-md active:scale-98 cursor-pointer"
                    >
                      {plan.ctaText} &rarr;
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        setModalState({
                          isOpen: true,
                          plan: plan.id as 'basic' | 'pro',
                        })
                      }
                      className={`w-full py-3.5 rounded-2xl font-sans text-xs font-bold uppercase tracking-wider text-center block transition-all shadow-md hover:shadow-xl active:scale-98 cursor-pointer ${
                        isRec
                          ? 'bg-brass text-ink hover:bg-brass-light font-black hover:brightness-105'
                          : 'bg-green-deep text-paper hover:bg-green-mid'
                      }`}
                    >
                      {plan.ctaText} &rarr;
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── ACCESSIBLE FAQ ACCORDION ── */}
        {showFaq && (
          <div className="mt-24 max-w-3xl mx-auto space-y-6">
            <div className="text-center space-y-1">
              <span className="text-xs font-mono uppercase tracking-widest text-brass font-bold">
                Verification Details
              </span>
              <h3 className="font-heading text-2xl sm:text-3xl font-bold text-green-deep">
                Frequently Asked Questions
              </h3>
            </div>

            <div className="space-y-3">
              {FAQ_ITEMS.map((faq, fIdx) => {
                const isOpen = openFaqIndex === fIdx;

                return (
                  <div
                    key={fIdx}
                    className="rounded-2xl border border-border bg-paper shadow-2xs overflow-hidden transition-all"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaqIndex(isOpen ? null : fIdx)}
                      aria-expanded={isOpen}
                      className="w-full p-4 sm:p-5 text-left font-heading text-base font-bold text-ink flex items-center justify-between gap-4 hover:bg-paper-light cursor-pointer focus-visible:ring-2 focus-visible:ring-brass focus-visible:outline-hidden"
                    >
                      <span>{faq.q}</span>
                      <span className="font-mono text-base text-brass shrink-0">
                        {isOpen ? '−' : '+'}
                      </span>
                    </button>

                    {isOpen && (
                      <div className="px-4 pb-4 sm:px-5 sm:pb-5 text-xs sm:text-sm text-ink-muted font-sans leading-relaxed border-t border-border/60 pt-3 bg-paper-light/50">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Access Request / Sales Modal */}
      <ContactModal
        isOpen={modalState.isOpen}
        initialPlan={modalState.plan}
        onClose={() => setModalState({ ...modalState, isOpen: false })}
      />
    </section>
  );
}
