'use client';

import { Hero3DSection } from '@/components/landing/Hero3DSection';
import { ExploreSection } from '@/components/landing/ExploreSection';
import { AudienceSection } from '@/components/landing/AudienceSection';
import { CitationGateSection } from '@/components/landing/citation-gate/CitationGateSection';
import { PricingSection } from '@/components/pricing/PricingSection';
import { FinalCtaSection } from '@/components/landing/FinalCtaSection';

export default function HomePage() {
  return (
    <div className="flex flex-col bg-paper text-ink">
      {/* ── 1. HERO 3D SCENE: 400VH PINNED REGISTRY DESK ──────────── */}
      <Hero3DSection />

      {/* ── 2. CREATIVE EXPLORE SHOWCASE SECTION ──────────────────── */}
      <ExploreSection />

      {/* ── 3. WHO IT'S FOR: 3 SRS AUDIENCES WITH EDITORIAL TYPOGRAPHY */}
      <AudienceSection />

      {/* ── 4. 3D CITATION GATE & ZERO-FABRICATION CHECKPOINT ─────── */}
      <CitationGateSection />

      {/* ── 5. THREE-TIER PRICING & FAQ SECTION (WITHOUT COMPARISON TABLE) */}
      <PricingSection showFaq={true} />

      {/* ── 6. FINAL CALL TO ACTION ───────────────────────────────── */}
      <FinalCtaSection />
    </div>
  );
}
