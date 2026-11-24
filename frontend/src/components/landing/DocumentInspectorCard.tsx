'use client';

import { useEffect } from 'react';
import { useLang } from '@/lib/lang';

interface DocumentInspectorCardProps {
  activeDoc: 'deed' | 'khatian' | 'nid' | null;
  packet: 'A' | 'B';
  onClose: () => void;
}

export function DocumentInspectorCard({
  activeDoc,
  packet,
  onClose,
}: DocumentInspectorCardProps) {
  const { lang } = useLang();

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!activeDoc) return null;

  const docData = {
    deed: {
      tag: 'DEED-SAF-KABALA',
      titleEn: 'Saf Kabala Property Deed',
      titleBn: 'সাফ কবলা জমি বিক্রয় দলিল',
      serial: '10492 / 2024',
      officeEn: 'Sub-Registry Office, Dhaka Sadar',
      officeBn: 'সাব-রেজিস্ট্রারের কার্যালয়, ঢাকা সদর',
      fields: [
        { labelEn: 'Schedule Plot (দাগ নং)', value: 'Dag 412', flag: null, mono: true },
        { labelEn: 'Khatian Ref (খতিয়ান নং)', value: 'Khatian 1087', flag: null, mono: true },
        { labelEn: 'Seller (বিক্রেতা)', value: 'Rafiqul Islam (রফিকুল ইসলাম)', flag: null, mono: false },
        { labelEn: 'Buyer (ক্রেতা)', value: 'Mohammad Hasan (মোহাম্মদ হাসান)', flag: null, mono: false },
        {
          labelEn: 'Time Window (নিবন্ধন কাল)',
          value: packet === 'B' ? '135 Days (Exceeds 4-month limit)' : '28 Days (Compliant window)',
          flag: packet === 'B' ? 'RED DEFECT: SEC. 23 REGISTRATION ACT 1908' : 'COMPLIANT',
          isDefect: packet === 'B',
          mono: true,
        },
      ],
    },
    khatian: {
      tag: 'KHATIAN-RS-PORCHA',
      titleEn: 'RS Khatian Record of Rights',
      titleBn: 'আরএস খতিয়ান স্বত্বলিপি',
      serial: 'Form 5463 / 1087',
      officeEn: 'Collectorate Revenue Record Room',
      officeBn: 'কালেক্টরেট রেকর্ড শাখা',
      fields: [
        {
          labelEn: 'Record Plot (রেকর্ড দাগ নং)',
          value: packet === 'B' ? 'Dag 421 (Discrepancy)' : 'Dag 412 (Exact Match)',
          flag: packet === 'B' ? 'RED DEFECT: MISMATCH WITH DEED DAG 412 (FR-3.1)' : 'COMPLIANT MATCH',
          isDefect: packet === 'B',
          mono: true,
        },
        { labelEn: 'Khatian No (খতিয়ান নং)', value: '1087', flag: null, mono: true },
        { labelEn: 'Proprietor (মালিকের নাম)', value: 'Abdul Karim (আব্দুল করিম)', flag: null, mono: false },
        { labelEn: 'Mouza & J.L. (মৌজা ও জে.এল)', value: 'Charbata • J.L. 45', flag: null, mono: false },
        { labelEn: 'Land Quantum (জমির পরিমাণ)', value: '20 Decimals (ধানী)', flag: null, mono: true },
      ],
    },
    nid: {
      tag: 'NID-SMART-CARD',
      titleEn: 'National ID Smart Card',
      titleBn: 'জাতীয় পরিচয়পত্র',
      serial: 'NIDW-BD-1985',
      officeEn: 'Election Commission Bangladesh',
      officeBn: 'বাংলাদেশ নির্বাচন কমিশন',
      fields: [
        {
          labelEn: 'NID Number (এনআইডি নম্বর)',
          value: packet === 'B' ? '269478513 (9 Digits)' : '2694785130 (10 Digits)',
          flag: packet === 'B' ? 'AMBER DEFECT: NON-STANDARD LENGTH (RULE 3 NIDW)' : 'COMPLIANT 10-DIGIT SMART CARD',
          isDefect: packet === 'B',
          mono: true,
        },
        { labelEn: 'Citizen Name (নাগরিকের নাম)', value: 'Mohammad Hasan (মোহাম্মদ হাসান)', flag: null, mono: false },
        { labelEn: 'Father Name (পিতার নাম)', value: 'Rafiqul Islam (রফিকুল ইসলাম)', flag: null, mono: false },
        { labelEn: 'Date of Birth (জন্ম তারিখ)', value: '12 Aug 1985', flag: null, mono: true },
        { labelEn: 'Card Standard (কার্ডের ধরন)', value: 'Smart National Identity Card', flag: null, mono: false },
      ],
    },
  }[activeDoc];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-end p-4 sm:p-8 bg-desk-dark/60 backdrop-blur-xs transition-opacity duration-300"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Document inspection details"
    >
      <div
        className="w-full max-w-md sm:max-w-lg bg-paper-light border-2 border-brass shadow-2xl rounded-xs overflow-hidden flex flex-col animate-in slide-in-from-right-8 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Card Header with brass ledger trim */}
        <div className="h-[4px] w-full bg-gradient-to-r from-brass via-brass-light to-brass" />

        <div className="p-5 sm:p-6 bg-paper border-b border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-xs bg-green-deep text-paper font-mono text-[10px] uppercase font-bold tracking-wider">
              {docData.tag}
            </span>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xs text-ink-muted hover:text-ink hover:bg-paper-dark transition-colors font-mono text-xs flex items-center gap-1 cursor-pointer"
              title="Close inspection (Esc)"
              aria-label="Close document inspector"
            >
              <span>Close</span>
              <kbd className="px-1.5 py-0.5 rounded-xs bg-paper-dark border border-border text-[10px]">
                ESC
              </kbd>
            </button>
          </div>

          <h3 className="font-heading text-xl sm:text-2xl font-bold text-green-deep">
            {lang === 'bn' ? docData.titleBn : docData.titleEn}
          </h3>
          <p className="text-xs text-ink-muted font-sans mt-0.5">
            {lang === 'bn' ? docData.officeBn : docData.officeEn} • {docData.serial}
          </p>
        </div>

        {/* Extracted Fields Table */}
        <div className="p-5 sm:p-6 divide-y divide-border/60 bg-paper-light overflow-y-auto max-h-[60vh]">
          {docData.fields.map((f, i) => (
            <div key={i} className="py-3 first:pt-0 last:pb-0">
              <div className="text-[11px] font-sans font-medium text-ink-muted mb-1">
                {f.labelEn}
              </div>
              <div
                className={`text-sm sm:text-base font-semibold text-ink ${f.mono ? 'font-mono' : 'font-sans'
                  }`}
              >
                {f.value}
              </div>
              {f.flag && (
                <div
                  className={`mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-xs text-[10px] font-mono font-bold tracking-wide ${f.isDefect
                      ? 'bg-vermillion/10 text-vermillion border border-vermillion/30'
                      : 'bg-green-deep/10 text-green-deep border border-green-deep/30'
                    }`}
                >
                  <span>{f.isDefect ? '▲' : '✓'}</span>
                  <span>{f.flag}</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer info bar */}
        <div className="p-4 bg-paper-dark/60 border-t border-border flex items-center justify-between text-xs font-mono text-ink-muted">
          <span>Benchmarked against laws_corpus.json</span>
          <span className="font-bold text-green-deep">Verified Parity</span>
        </div>
      </div>
    </div>
  );
}
