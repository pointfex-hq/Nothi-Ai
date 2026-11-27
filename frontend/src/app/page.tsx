'use client';

import { LiteHero } from '@/components/landing/LiteHero';
import { HowItWorksSection } from '@/components/landing/HowItWorksSection';
import { ExploreSection } from '@/components/landing/ExploreSection';
import { AudienceSection } from '@/components/landing/AudienceSection';
import { LiteCitationGate } from '@/components/landing/citation-gate/LiteCitationGate';
import { PricingSection } from '@/components/pricing/PricingSection';
import { FinalCtaSection } from '@/components/landing/FinalCtaSection';

export default function HomePage() {
  return (
    <div className="flex flex-col bg-paper text-ink">
      {/* ── 1. LIGHTWEIGHT HERO SECTION ───────────────────────────── */}
      <LiteHero />

      {/* ── 2. HOW IT WORKS: 5 DETERMINISTIC STEPS ROW ────────────── */}
      <HowItWorksSection />

      {/* ── 3. INTERACTIVE CONVEYANCE TRIAD SHOWCASE ──────────────── */}
      <ExploreSection />

      {/* ── 4. WHO IT'S FOR: 3 SRS AUDIENCES (ADVOCATES, BANKS, PROMOTERS) */}
      <AudienceSection />

      {/* ── 5. LIGHTWEIGHT DETERMINISTIC CITATION GATE ────────────── */}
      <LiteCitationGate />

      {/* ── 6. THREE-TIER PRICING & 6-ITEM FAQ ACCORDION ──────────── */}
      <PricingSection showFaq={true} />

      {/* ── 7. FINAL CALL TO ACTION ───────────────────────────────── */}
      <FinalCtaSection />
    </div>
  );
}
