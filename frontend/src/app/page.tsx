'use client';

import { LiteHero } from '@/components/landing/LiteHero';
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

      {/* ── 2. CREATIVE EXPLORE SHOWCASE SECTION ──────────────────── */}
      <ExploreSection />

      {/* ── 3. WHO IT'S FOR: 3 SRS AUDIENCES WITH EDITORIAL TYPOGRAPHY */}
      <AudienceSection />

      {/* ── 4. LIGHTWEIGHT DETERMINISTIC CITATION GATE ────────────── */}
      <LiteCitationGate />

      {/* ── 5. THREE-TIER PRICING & FAQ SECTION ───────────────────── */}
      <PricingSection showFaq={true} />

      {/* ── 6. FINAL CALL TO ACTION ───────────────────────────────── */}
      <FinalCtaSection />
    </div>
  );
}
