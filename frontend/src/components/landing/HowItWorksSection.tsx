'use client';

import { useLang } from '@/lib/lang';

interface Step {
  num: string;
  titleEn: string;
  titleBn: string;
  descEn: string;
  descBn: string;
  statute: string;
}

const STEPS: Step[] = [
  {
    num: '01',
    titleEn: 'Document Ingestion',
    titleBn: 'নথি আপলোড ও সংযুক্তি',
    descEn: 'Upload Saf Kabala deeds (PDF/JPG), RS/BS Khatian ledgers, and National IDs.',
    descBn: 'সাফ কবলা দলিল (পিডিএফ/জেপিজি), আরএস/বিএস খতিয়ান ও জাতীয় পরিচয়পত্র আপলোড করুন।',
    statute: 'Triad Ingestion',
  },
  {
    num: '02',
    titleEn: 'Multimodal Extraction',
    titleBn: 'মাল্টিমোডাল তথ্য নিষ্কাশন',
    descEn: 'Deterministic OCR extracts deed parties, schedule plots, and dates into structured fields.',
    descBn: 'স্বয়ংক্রিয় ওসিআর দলিলের পক্ষসমূহ, তফসিল দাগ ও তারিখ সুনির্দিষ্ট ফিল্ডে রূপান্তর করে।',
    statute: 'Field Alignment',
  },
  {
    num: '03',
    titleEn: 'Cross-Document Audit',
    titleBn: 'আন্তঃনথি সমতা পরীক্ষা',
    descEn: 'Cross-checks Deed schedule Dag against Khatian recorded plot and NID identity parity.',
    descBn: 'খতিয়ানের দাগের সাথে দলিলের তফসিল দাগ ও এনআইডির নামের অক্ষরভিত্তিক সমতা যাচাই।',
    statute: 'Dag & Area Parity',
  },
  {
    num: '04',
    titleEn: 'Statutory Verification',
    titleBn: 'সংবিধিবদ্ধ ধারা যাচাই',
    descEn: 'Evaluates presentation window (Sec. 23), compulsory registration (Sec. 17), and litigation risks.',
    descBn: 'দাখিলের ৪ মাসের মেয়াদ (ধারা ২৩), বাধ্যতামূলক নিবন্ধন (ধারা ১৭) ও স্বত্ব মামলা পরীক্ষা।',
    statute: 'Registration Act 1908',
  },
  {
    num: '05',
    titleEn: 'Certified Memo',
    titleBn: 'প্রত্যয়িত ভেটিং মেমোরেন্ডাম',
    descEn: 'Generates printable legal attestation with verbatim statutory sections and risk ratings.',
    descBn: 'সংবিধিবদ্ধ ধারার হুবহু রেফারেন্স ও স্পষ্ট সংকেতসহ প্রিন্টযোগ্য অফিসিয়াল প্রত্যয়নপত্র।',
    statute: 'Vetting Memorandum',
  },
];

export function HowItWorksSection() {
  const { lang } = useLang();

  return (
    <section id="how-it-works" className="py-16 sm:py-24 border-b border-border bg-paper scroll-mt-20">
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8 lg:px-10">
        <div className="max-w-2xl text-left space-y-3">
          <div className="text-xs font-mono uppercase tracking-widest text-brass font-bold">
            {lang === 'bn' ? 'কার্যপ্রণালী • ৫টি সহজ ধাপ' : 'Audit Pipeline • 5 Deterministic Steps'}
          </div>
          <h2 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-bold text-ink">
            {lang === 'bn' ? 'নথি এআই যেভাবে কাজ করে' : 'How Nothi AI Works'}
          </h2>
          <p className="font-sans text-sm sm:text-base text-ink-muted leading-relaxed">
            {lang === 'bn'
              ? 'দলিল দাখিল থেকে আইনি ভেটিং মেমোরেন্ডাম তৈরি পর্যন্ত প্রতিটি ধাপ স্বয়ংক্রিয় এবং সংবিধিবদ্ধ আইনের ভিত্তিতে পরিচালিত।'
              : 'From raw file ingestion to official certified memorandum: every step is governed strictly by verified statutory rules.'}
          </p>
        </div>

        {/* 5 Steps as a Simple Numbered Row */}
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {STEPS.map((step) => (
            <div
              key={step.num}
              className="p-5 rounded-xl border border-border bg-paper-dark/50 hover:bg-paper-dark hover:border-brass/60 transition-all flex flex-col justify-between space-y-4 shadow-2xs"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-2xl font-bold text-green-deep">
                    {step.num}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-paper border border-border text-ink-muted">
                    {step.statute}
                  </span>
                </div>

                <h3 className="font-heading text-base font-bold text-ink leading-snug">
                  {lang === 'bn' ? step.titleBn : step.titleEn}
                </h3>

                <p className="font-sans text-xs text-ink-muted leading-relaxed">
                  {lang === 'bn' ? step.descBn : step.descEn}
                </p>
              </div>

              <div className="pt-2 border-t border-border/60 text-[11px] font-mono text-brass font-semibold">
                Step {step.num} →
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
