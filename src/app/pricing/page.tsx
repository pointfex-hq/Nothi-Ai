import type { Metadata } from 'next';
import { PricingSection } from '@/components/pricing/PricingSection';

export const metadata: Metadata = {
  title: 'Chamber Plans & Packages — Nothi AI (নথি এআই)',
  description:
    'Transparent subscription plans for legal advocates, property vetting chambers, real estate developers, and commercial loan syndicates.',
};

export default function PricingPage() {
  return (
    <div className="flex flex-col bg-paper text-ink min-h-screen">
      <div className="pt-8 sm:pt-12">
        <PricingSection showFaq={true} />
      </div>
    </div>
  );
}
