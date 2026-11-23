/**
 * Nothi AI Subscription & Pricing Configuration
 *
 * 3 Chamber Tiers: Free, Basic, Pro
 */

export interface PlanFeature {
  text: string;
  included: boolean;
  planned?: boolean;
}

export interface PlanConfig {
  id: 'free' | 'basic' | 'pro';
  name: string;
  tagline: string;
  recommended?: boolean;
  badge?: string;
  priceMonthlyBdt: number | null; // null for custom/contact
  priceYearlyBdt: number | null;
  ctaText: string;
  ctaType: 'free' | 'request-access' | 'talk-to-us';
  features: PlanFeature[];
}

export const PLANS: PlanConfig[] = [
  {
    id: 'free',
    name: 'Free',
    tagline: 'For independent advocates exploring statutory vetting',
    recommended: false,
    badge: 'Starter',
    priceMonthlyBdt: 0,
    priceYearlyBdt: 0,
    ctaText: 'Start Free',
    ctaType: 'free',
    features: [
      { text: '5 document bundle audits per month', included: true },
      { text: 'Saf Kabala deed, RS/BS Khatian & NID verification', included: true },
      { text: 'Deterministic Red / Amber / Green statutory risk flags', included: true },
      { text: 'Grounded Nothi AI chat (28 verified statutory sections)', included: true },
      { text: 'Section 23 4-month presentation window calculation', included: true },
      { text: 'Bilingual English & Bangla interface', included: true },
    ],
  },
  {
    id: 'basic',
    name: 'Basic',
    tagline: 'For solo advocates and growing legal chambers',
    recommended: true,
    badge: 'Most popular',
    priceMonthlyBdt: 2500,
    priceYearlyBdt: 24000,
    ctaText: 'Get Basic',
    ctaType: 'request-access',
    features: [
      { text: '60 document bundle audits per month', included: true },
      { text: 'Everything included in Free', included: true },
      { text: 'Official downloadable vetting memorandum (PDF/Print ready)', included: true },
      { text: 'Lis Pendens litigation screening (TPA 1882 Sec. 52)', included: true },
      { text: 'Land crime penal liability screening (LCPRA 2023 Sec. 4)', included: true },
      { text: 'Persistent audit archive & case history', included: true },
      { text: 'Priority email & chat support within 4 hours', included: true },
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    tagline: 'For commercial banks, financial institutions & syndicates',
    recommended: false,
    badge: 'Enterprise',
    priceMonthlyBdt: 7500,
    priceYearlyBdt: 72000,
    ctaText: 'Upgrade to Pro',
    ctaType: 'talk-to-us',
    features: [
      { text: 'Unlimited monthly document audit volume', included: true },
      { text: 'Everything included in Basic', included: true },
      { text: 'Priority multimodal OCR extraction queue', included: true },
      { text: 'Multi-user advocate team seats & role provisioning', included: true },
      { text: 'Formal bank VAT/AIT invoices & institutional purchase orders', included: true },
      { text: 'Dedicated compliance account manager & SLA guarantee', included: true },
    ],
  },
];
