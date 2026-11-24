'use client';

import Link from 'next/link';
import { useLang } from '@/lib/lang';

export function AudienceSection() {
  const { lang } = useLang();

  const AUDIENCES = [
    {
      roleEn: '01. Legal Vetting Officers & Advocates',
      roleBn: '০১. আইনি যাচাই কর্মকর্তা ও আইনজীবী',
      titleEn: 'Chain of Title & Statutory Execution Windows',
      titleBn: 'মালিকানার ধারাবাহিকতা ও সংবিধিবদ্ধ সময়সীমা',
      descEn:
        'Eliminate manual cross-checking between deed recitals and collectorate record books. Nothi AI instantly detects schedule Dag mismatches and verifies whether the Saf Kabala deed was presented within the strict 4-month statutory deadline under Section 23 of the Registration Act, 1908.',
      descBn:
        'দলিলের বিবরণ ও কালেক্টরেট রেকর্ডের মধ্যে ম্যানুয়াল মিল খোঁজার জটিলতা দূর করুন। নথি এআই তাত্ক্ষণিকভাবে তফসিলে দাগের গরমিল শনাক্ত করে এবং রেজিস্ট্রেশন আইন ১৯০৮ এর ধারা ২৩ অনুযায়ী ৪ মাসের বাধ্যতামূলক সময়সীমা মানা হয়েছে কি না তা যাচাই করে।',
      statutoryKey: 'Registration Act 1908 (Sec. 23 & 28)',
    },
    {
      roleEn: '02. Bank Credit Risk & Compliance Teams',
      roleBn: '০২. ব্যাংক ক্রেডিট রিস্ক ও কমপ্লায়েন্স টিম',
      titleEn: 'Mortgage Security & Borrower Identity Verification',
      titleBn: 'বন্ধকী নিরাপত্তা ও ঋণগ্রহীতার পরিচয় যাচাই',
      descEn:
        'Protect bank collateral against fraudulent conveyances and undisclosed litigations. Verify vendor National ID digit format parity (Rule 3, NIDW Rules 2010) and automatically screen for contentious court suits under Transfer of Property Act 1882 Section 52 (doctrine of Lis Pendens) before loan sanction.',
      descBn:
        'ভুয়া দলিল ও গোপন মামলার বিরুদ্ধে ব্যাংকের বন্ধকী জামানত সুরক্ষিত রাখুন। ঋণ অনুমোদনের পূর্বে জাতীয় পরিচয়পত্রের ১০/১৩/১৭-ডিজিটের কাঠামোগত বৈধতা এবং সম্পত্তি হস্তান্তর আইন ১৮৮২ এর ধারা ৫২ (Lis Pendens) অনুযায়ী বিচারাধীন মামলা পরীক্ষা করুন।',
      statutoryKey: 'TPA 1882 (Sec. 52) & NIDW Rules (Rule 3)',
    },
    {
      roleEn: '03. Title Examiners & Real Estate Developers',
      roleBn: '০৩. স্বত্ব পরীক্ষক ও রিয়েল এস্টেট ডেভেলপার',
      titleEn: 'High-Volume Khatian Parity & Encumbrance Screening',
      titleBn: 'বৃহৎ খতিয়ান সমন্বয় ও স্বত্ব পরীক্ষা',
      descEn:
        'Standardize title examination across multi-plot acquisitions. Cross-audit CS, SA, RS and BS Khatians against deed schedules to verify vendor possession, mutation status, and penal liabilities under Section 4 of the Land Crime Prevention and Remedy Act, 2023.',
      descBn:
        'বৃহৎ প্রকল্প ও বহু-দাগের ভূমি ক্রয়ে স্বত্ব পরীক্ষা মানসম্পন্ন করুন। দলিলের তফসিলের সাথে সিএস, এসএ, আরএস ও বিএস খতিয়ান সমন্বয় করে নামজারি এবং ভূমি অপরাধ প্রতিরোধ ও প্রতিকার আইন ২০২৩ এর ধারা ৪ এর ঝুঁকি প্রতিরোধ করুন।',
      statutoryKey: 'LCPRA 2023 (Sec. 4) & Registration Act 1908 (Sec. 17)',
    },
  ];

  return (
    <section
      id="who-its-for"
      className="py-24 border-b border-border bg-paper scroll-mt-24"
      aria-labelledby="audience-heading"
    >
      <div className="max-w-[1280px] mx-auto px-6 sm:px-8 lg:px-12">
        {/* Section Header */}
        <div className="border-b-2 border-green-deep pb-6 mb-14 max-w-3xl">
          <div className="text-xs font-mono uppercase tracking-widest text-ink-muted">
            Specialized Workflows • SRS Stakeholders
          </div>
          <h2
            id="audience-heading"
            className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold text-green-deep mt-1.5"
          >
            {lang === 'bn'
              ? 'আইনি পেশাজীবীদের জন্য বিশেষভাবে নির্মিত'
              : 'Engineered for property legal practitioners'}
          </h2>
          <p className="text-sm sm:text-base text-ink-muted mt-2 font-sans leading-relaxed">
            {lang === 'bn'
              ? 'নির্ণায়ক অ্যালগরিদম ও সংবিধিবদ্ধ ধারা দ্বারা চালিত, যা ব্যক্তি আইনজীবী ও প্রাতিষ্ঠানিক টিমের কাজের গতি বাড়ায়।'
              : 'Deterministic algorithms designed to eliminate title vetting blind spots across independent chambers and institutional syndicates.'}
          </p>
        </div>

        {/* Text Editorial Layout (Three Audiences, Not Icon Cards) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 lg:gap-14">
          {AUDIENCES.map((aud, idx) => (
            <div
              key={idx}
              className="border-t-2 border-brass/60 pt-6 space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <span className="font-mono text-xs font-bold text-brass uppercase tracking-wider block">
                  {lang === 'bn' ? aud.roleBn : aud.roleEn}
                </span>

                <h3 className="font-heading text-xl sm:text-2xl font-bold text-ink leading-snug">
                  {lang === 'bn' ? aud.titleBn : aud.titleEn}
                </h3>

                <p className="font-sans text-sm text-ink-muted leading-relaxed">
                  {lang === 'bn' ? aud.descBn : aud.descEn}
                </p>
              </div>

              <div className="pt-4 border-t border-border/50 text-[11px] font-mono text-green-deep font-semibold flex items-center gap-1.5">
                <span>§</span>
                <span>{aud.statutoryKey}</span>
              </div>
            </div>
          ))}
        </div>

        {/* ── Direct Chat Entry Bridge ── */}
        <div className="mt-14 pt-8 border-t border-border/60 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-0.5">
            <h4 className="font-heading text-lg font-bold text-green-deep">
              {lang === 'bn' ? 'আপনার দলিলের সংবিধিবদ্ধ অনুচ্ছেদ পরীক্ষা করুন' : 'Have a deed, Khatian or NID question?'}
            </h4>
            <p className="text-xs text-ink-muted font-sans">
              {lang === 'bn'
                ? '২৮টি সংবিধিবদ্ধ ধারার ভিত্তিতে তাৎক্ষণিক উত্তর পান।'
                : 'Answers grounded strictly in 28 verified sections of Bangladeshi property law.'}
            </p>
          </div>
          <Link
            href="/chat"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-green-deep hover:bg-green-mid text-paper font-sans text-xs sm:text-sm font-semibold shadow-xs hover:shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span>{lang === 'bn' ? 'নথি এআই চ্যাটে জিজ্ঞাসা করুন' : 'Ask in Nothi AI Chat'}</span>
            <span className="text-brass">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
