'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type Lang = 'en' | 'bn';

type Translations = Record<string, { en: string; bn: string }>;

const translations: Translations = {
  // Header / nav
  'nav.home':          { en: 'Home',               bn: 'হোম' },
  'nav.audit':         { en: 'Audit Workspace',    bn: 'নিরীক্ষা কার্যক্ষেত্র' },
  'nav.language':      { en: 'বাংলা',               bn: 'English' },

  // Landing page
  'hero.title':        { en: 'Nothi AI',           bn: 'নথি এআই' },
  'hero.subtitle':     { en: 'Legal Document Vetting for Bangladeshi Property Transfers', bn: 'বাংলাদেশের সম্পত্তি হস্তান্তরের জন্য আইনি দলিল যাচাই' },
  'hero.cta':          { en: 'Open the audit workspace', bn: 'নিরীক্ষা কার্যক্ষেত্র খুলুন' },

  // Scroll steps
  'step.1.title':      { en: 'Ingestion',              bn: 'গ্রহণ' },
  'step.1.desc':       { en: 'Three documents arrive: Deed, Khatian, NID.', bn: 'তিনটি দলিল আসে: দলিল, খতিয়ান, জাতীয় পরিচয়পত্র।' },
  'step.2.title':      { en: 'Extraction',              bn: 'নিষ্কাশন' },
  'step.2.desc':       { en: 'Key fields are located and tagged.', bn: 'প্রধান ক্ষেত্রগুলি চিহ্নিত করা হয়।' },
  'step.3.title':      { en: 'Cross-Document Audit',    bn: 'আন্তঃনথি নিরীক্ষা' },
  'step.3.desc':       { en: 'Fields are compared across documents. Mismatches are flagged.', bn: 'ক্ষেত্রগুলি নথি জুড়ে তুলনা করা হয়। অমিল চিহ্নিত করা হয়।' },
  'step.4.title':      { en: 'Verdict',                 bn: 'রায়' },
  'step.4.desc':       { en: 'A vetting memorandum with statutory citations is generated.', bn: 'বিধিবদ্ধ উদ্ধৃতি সহ একটি যাচাই স্মারক তৈরি করা হয়।' },

  // Pipeline stages
  'pipeline.1':        { en: 'Ingestion & Normalization',       bn: 'গ্রহণ ও স্বাভাবিককরণ' },
  'pipeline.2':        { en: 'Multimodal Extraction',           bn: 'বহুমাধ্যম নিষ্কাশন' },
  'pipeline.3':        { en: 'Deterministic Audit',             bn: 'নির্ণায়ক নিরীক্ষা' },
  'pipeline.4':        { en: 'Grounded Statutory Reasoning',    bn: 'ভিত্তিক বিধিবদ্ধ যুক্তি' },
  'pipeline.5':        { en: 'Split-Screen Audit UI',           bn: 'বিভক্ত-পর্দা নিরীক্ষা ইউআই' },

  // Phase 1
  'phase1.title':      { en: 'What Phase 1 Covers',             bn: 'প্রথম পর্যায়ে কী অন্তর্ভুক্ত' },
  'phase1.docs':       { en: 'Documents: Saf Kabala (Property Deed), RS/BS Khatian, National ID', bn: 'দলিলসমূহ: সাফ কবলা (সম্পত্তি দলিল), আরএস/বিএস খতিয়ান, জাতীয় পরিচয়পত্র' },
  'phase1.laws':       { en: 'Statutes verified against:', bn: 'যে আইনের বিপরীতে যাচাই করা হয়:' },

  // Audit workspace
  'audit.title':       { en: 'Audit Workspace',         bn: 'নিরীক্ষা কার্যক্ষেত্র' },
  'audit.intake':      { en: 'Document Intake',         bn: 'দলিল গ্রহণ' },
  'audit.matrix':      { en: 'Entity Comparison',       bn: 'সত্তা তুলনা' },
  'audit.flags':       { en: 'Risk Flags',              bn: 'ঝুঁকি পতাকা' },
  'audit.citations':   { en: 'Citation Inspector',      bn: 'উদ্ধৃতি পরিদর্শক' },
  'audit.memo':        { en: 'Vetting Memorandum',       bn: 'যাচাই স্মারক' },
  'audit.upload':      { en: 'Upload documents or load a benchmark packet', bn: 'দলিল আপলোড করুন অথবা একটি বেঞ্চমার্ক প্যাকেট লোড করুন' },
  'audit.dragdrop':    { en: 'Drop PDF, JPG or PNG files here (max 15 MB each, up to 3 files)', bn: 'এখানে PDF, JPG বা PNG ফাইল ড্রপ করুন (প্রতিটি সর্বোচ্চ ১৫ এমবি, সর্বোচ্চ ৩টি ফাইল)' },
  'audit.packetA':     { en: 'Load Packet A (Compliant)', bn: 'প্যাকেট এ লোড করুন (সম্মত)' },
  'audit.packetB':     { en: 'Load Packet B (3 Planted Defects)', bn: 'প্যাকেট বি লোড করুন (৩টি ত্রুটি)' },
  'audit.run':         { en: 'Run Audit',               bn: 'নিরীক্ষা চালান' },
  'audit.viewer':      { en: 'Document Viewer',         bn: 'দলিল দর্শক' },
  'audit.noDoc':       { en: 'No document loaded. Upload files or load a benchmark packet.', bn: 'কোনো দলিল লোড হয়নি। ফাইল আপলোড করুন অথবা বেঞ্চমার্ক প্যাকেট লোড করুন।' },

  // Flags
  'flag.red':          { en: 'RED',    bn: 'লাল' },
  'flag.amber':        { en: 'AMBER',  bn: 'অ্যাম্বার' },
  'flag.green':        { en: 'GREEN',  bn: 'সবুজ' },

  // Footer
  'footer.credit':     { en: 'Nothi AI v1.0, Team Boron, Pointfex', bn: 'নথি এআই v১.০, টিম বোরন, পয়েন্টফেক্স' },
};

interface LangContextType {
  lang: Lang;
  toggle: () => void;
  setLang: (lang: Lang) => void;
  t: (key: string) => string;
}

const LangContext = createContext<LangContextType>({
  lang: 'en',
  toggle: () => {},
  setLang: () => {},
  t: (key: string) => key,
});

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('en');

  const toggle = useCallback(() => {
    setLang((prev) => (prev === 'en' ? 'bn' : 'en'));
  }, []);

  const t = useCallback(
    (key: string): string => {
      const entry = translations[key];
      if (!entry) {
        console.warn(`[i18n] Missing translation key: "${key}"`);
        return key;
      }
      return entry[lang];
    },
    [lang]
  );

  return (
    <LangContext.Provider value={{ lang, toggle, setLang, t }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}
