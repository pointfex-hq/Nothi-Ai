'use client';

import { useState, useEffect } from 'react';
import type { DocType, Flag } from '@/types';
import { useLang } from '@/lib/lang';

interface DocumentViewerProps {
  activeDoc: DocType;
  onDocChange: (doc: DocType) => void;
  selectedFlag: Flag | null;
  hasAudited: boolean;
  isDefectPacket: boolean;
}

export function DocumentViewer({
  activeDoc,
  onDocChange,
  selectedFlag,
  isDefectPacket,
}: DocumentViewerProps) {
  const { lang } = useLang();
  const [zoomLevel, setZoomLevel] = useState(100);
  const currentPage = 1;

  // When a flag with highlight is selected, automatically switch to that document tab
  useEffect(() => {
    if (selectedFlag?.highlight?.docType) {
      onDocChange(selectedFlag.highlight.docType);
    }
  }, [selectedFlag, onDocChange]);

  const docTabs: { id: DocType; labelEn: string; labelBn: string; badge: string }[] = [
    { id: 'deed', labelEn: 'Saf Kabala Deed', labelBn: 'সাফ কবলা দলিল', badge: 'DEED-10492' },
    { id: 'khatian', labelEn: 'RS/BS Khatian', labelBn: 'আরএস/বিএস খতিয়ান', badge: 'KHAT-1087' },
    { id: 'nid', labelEn: 'National ID', labelBn: 'জাতীয় পরিচয়পত্র', badge: 'NID-CARD' },
  ];

  return (
    <div className="flex flex-col h-full rounded-sm border border-border bg-surface shadow-xs">
      {/* Top Bar: Tabs & Controls */}
      <div className="border-b border-border bg-paper p-2.5 flex flex-wrap items-center justify-between gap-2">
        {/* Document Switcher Tabs */}
        <div className="flex items-center gap-1.5" role="tablist">
          {docTabs.map((tab) => {
            const isActive = activeDoc === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => onDocChange(tab.id)}
                className={`px-3 py-1.5 text-xs rounded-sm font-medium transition-all cursor-pointer flex items-center gap-1.5 ${isActive
                  ? 'bg-green-deep text-paper shadow-xs font-semibold'
                  : 'bg-paper-light text-ink-muted hover:text-ink hover:bg-paper-dark border border-border/60'
                  }`}
              >
                <span>{lang === 'bn' ? tab.labelBn : tab.labelEn}</span>
                <span className="text-[10px] opacity-75 font-mono">
                  {tab.badge}
                </span>
              </button>
            );
          })}
        </div>

        {/* Zoom & Page Controls */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <div className="flex items-center border border-border rounded-sm bg-paper-light">
            <button
              onClick={() => setZoomLevel((z) => Math.max(z - 15, 70))}
              className="px-2 py-1 text-ink hover:bg-paper-dark border-r border-border"
              title="Zoom Out"
            >
              −
            </button>
            <span className="px-2.5 py-1 text-ink-muted min-w-[50px] text-center">
              {zoomLevel}%
            </span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(z + 15, 160))}
              className="px-2 py-1 text-ink hover:bg-paper-dark"
              title="Zoom In"
            >
              +
            </button>
          </div>

          <button
            onClick={() => setZoomLevel(100)}
            className="px-2 py-1 border border-border rounded-sm bg-paper-light hover:bg-paper-dark text-ink-muted"
            title="Reset Zoom"
          >
            Reset
          </button>

          <div className="text-ink-muted pl-1 border-l border-border hidden sm:block">
            Page {currentPage}/1
          </div>
        </div>
      </div>

      {/* Main Document Canvas Viewport */}
      <div className="flex-1 overflow-auto p-4 sm:p-6 bg-paper-dark/60 flex items-center justify-center min-h-[460px]">
        <div
          style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
          className="transition-transform duration-150 ease-out w-full max-w-xl shadow-md border border-border bg-paper rounded-xs p-6 sm:p-8 text-ink relative"
        >
          {/* Active Highlight Bounding Box Overlay */}
          {selectedFlag && selectedFlag.highlight?.docType === activeDoc && (
            <div
              className={`absolute z-30 pointer-events-none transition-all duration-300 ${activeDoc === 'khatian'
                ? 'top-44 left-10 right-10 h-16 border-2 border-vermillion bg-vermillion/10 animate-pulse'
                : activeDoc === 'deed'
                  ? 'bottom-20 left-10 right-10 h-16 border-2 border-vermillion bg-vermillion/10 animate-pulse'
                  : 'top-32 left-10 right-10 h-16 border-2 border-amber bg-amber/10 animate-pulse'
                } rounded-xs`}
            >
              <div
                className={`absolute -top-5 left-2 px-1.5 py-0.5 rounded-xs text-[10px] font-mono font-bold tracking-wider ${selectedFlag.severity === 'RED'
                  ? 'bg-vermillion text-paper'
                  : 'bg-amber text-paper'
                  }`}
              >
                FLAGGED REGION: {selectedFlag.id}
              </div>
            </div>
          )}

          {/* 1. Saf Kabala Deed Render */}
          {activeDoc === 'deed' && (
            <div className="space-y-4 font-serif text-xs leading-relaxed">
              {/* Deed Header / Stamp Head */}
              <div className="border-b-2 border-green-deep pb-4 text-center">
                <div className="text-[10px] font-mono tracking-widest uppercase text-ink-muted">
                  গণপ্রজাতন্ত্রী বাংলাদেশ সরকার • জেলা রেজিস্ট্রারের কার্যালয়
                </div>
                <h3 className="text-lg font-bold text-green-deep mt-1">
                  সাফ কবলা বিক্রয় দলিল (Saf Kabala Deed)
                </h3>
                <div className="text-[11px] font-mono text-ink-muted mt-0.5">
                  দলিল নং: ১০৪৯২/২০২৪ • সাব-রেজিস্ট্রি অফিস: সদর
                </div>
              </div>

              {/* Deed Parties */}
              <div className="grid grid-cols-2 gap-4 border border-border p-3 rounded-xs bg-paper-light">
                <div>
                  <div className="font-sans font-bold text-[11px] text-green-deep uppercase">১ম পক্ষ (বিক্রেতা / Seller)</div>
                  <div className="mt-1 font-serif text-sm">আব্দুল করিম (Abdul Karim)</div>
                  <div className="text-[11px] text-ink-muted">পিতা: মৃত ফজলুল হক</div>
                </div>
                <div>
                  <div className="font-sans font-bold text-[11px] text-green-deep uppercase">২য় পক্ষ (ক্রেতা / Buyer)</div>
                  <div className="mt-1 font-serif text-sm">মোহাম্মদ হাসান (Mohammad Hasan)</div>
                  <div className="text-[11px] text-ink-muted">পিতা: রফিকুল ইসলাম</div>
                  <div className="text-[11px] font-mono">
                    NID: {isDefectPacket ? '269478513' : '2694785130'}
                  </div>
                </div>
              </div>

              {/* Property Details */}
              <div className="border border-border p-3 rounded-xs bg-paper-light space-y-1">
                <div className="font-sans font-bold text-[11px] text-green-deep uppercase">সম্পত্তির বিবরণ (Schedule of Property)</div>
                <div className="grid grid-cols-3 gap-2 font-mono text-xs mt-2">
                  <div>মৌজা: চরবাটা (Charbata)</div>
                  <div className="font-bold text-green-deep">দাগ নং: ৪১২ (Dag 412)</div>
                  <div>খতিয়ান নং: ১০৮৭ (Khatian 1087)</div>
                </div>
                <div className="text-[11px] text-ink-muted mt-1">
                  জমির শ্রেণি: নাল • পরিমাণ: ২০ শতক • দলিল মূল্য: ১২,৫০,০০০/- (BDT 12,50,000)
                </div>
              </div>

              {/* Execution & Registration Dates */}
              <div
                className={`border p-3 rounded-xs ${isDefectPacket
                  ? 'border-vermillion/40 bg-vermillion/5'
                  : 'border-border bg-paper-light'
                  }`}
              >
                <div className="font-sans font-bold text-[11px] text-green-deep uppercase">সম্পাদন ও নিবন্ধন তারিখ</div>
                <div className="grid grid-cols-2 gap-2 font-mono text-xs mt-1">
                  <div>Execution: 15-01-2024</div>
                  <div className={isDefectPacket ? 'text-vermillion font-bold' : ''}>
                    Registration: {isDefectPacket ? '30-05-2024 (135d lag)' : '06-02-2024 (22d lag)'}
                  </div>
                </div>
              </div>

              {/* Sub-Registrar Attestation Stamp */}
              <div className="pt-3 border-t border-border flex justify-between items-end text-[10px] font-mono text-ink-muted">
                <div>Seal &amp; Signature of Sub-Registrar</div>
                <div className="w-16 h-12 border border-dashed border-ink-muted/50 rounded-xs flex items-center justify-center text-[9px]">
                  SEAL
                </div>
              </div>
            </div>
          )}

          {/* 2. RS/BS Khatian Render */}
          {activeDoc === 'khatian' && (
            <div className="space-y-4 font-serif text-xs leading-relaxed">
              <div className="border-b-2 border-green-deep pb-4 text-center">
                <div className="text-[10px] font-mono tracking-widest uppercase text-ink-muted">
                  বাংলাদেশ ফরম নং ৫৪৬৩ • খতিয়ান স্বত্বলিপি
                </div>
                <h3 className="text-lg font-bold text-green-deep mt-1">
                  আরএস খতিয়ান (RS Record of Rights)
                </h3>
                <div className="text-[11px] font-mono text-ink-muted mt-0.5">
                  খতিয়ান নং: ১০৮৭ • মৌজা: চরবাটা • জে.এল নং: ৪৫
                </div>
              </div>

              {/* Khatian Ledger Table */}
              <div className="border border-border rounded-xs overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-paper-dark text-ink font-sans text-[11px]">
                    <tr className="border-b border-border">
                      <th className="p-2 border-r border-border">মালিকের নাম ও অংশ</th>
                      <th className="p-2 border-r border-border">দাগ নম্বর (Dag No.)</th>
                      <th className="p-2 border-r border-border">শ্রেণি</th>
                      <th className="p-2">জমির পরিমাণ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border font-mono">
                    <tr className={isDefectPacket ? 'bg-vermillion/10' : ''}>
                      <td className="p-2 border-r border-border font-serif">
                        আব্দুল করিম (১.০০০ অংশ)
                      </td>
                      <td className={`p-2 border-r border-border font-bold text-sm ${isDefectPacket ? 'text-vermillion' : 'text-green-deep'
                        }`}>
                        {isDefectPacket ? '৪২১ (Dag 421)' : '৪১২ (Dag 412)'}
                      </td>
                      <td className="p-2 border-r border-border font-serif">ধানী</td>
                      <td className="p-2">০.২০ একর (২০ শতক)</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Revenue & Mutation stamp */}
              <div className="p-3 bg-paper-light border border-border rounded-xs text-[11px] font-mono text-ink-muted flex justify-between items-center">
                <div>দখলকার: স্বত্বাধিকারী স্বয়ং • খাজনা: পরিশোধিত</div>
                <div className="text-xs font-bold text-green-deep">কালেক্টরেট রেকর্ড শাখা</div>
              </div>
            </div>
          )}

          {/* 3. National ID Render */}
          {activeDoc === 'nid' && (
            <div className="space-y-4 text-xs font-sans">
              <div className="border-b-2 border-green-deep pb-3 text-center">
                <div className="text-[10px] font-mono tracking-widest uppercase text-ink-muted">
                  Government of the People&apos;s Republic of Bangladesh
                </div>
                <h3 className="text-base font-bold text-green-deep mt-0.5">
                  National ID Card / জাতীয় পরিচয়পত্র
                </h3>
              </div>

              {/* NID Card Visual Frame */}
              <div className="border-2 border-green-deep/30 rounded-sm p-4 bg-paper-light shadow-inner flex flex-col sm:flex-row gap-4 items-center">
                {/* Photo Silhouette */}
                <div className="w-24 h-28 bg-paper-dark border border-border rounded-xs flex flex-col items-center justify-center text-ink-muted text-[10px] font-mono">
                  <div className="text-2xl">👤</div>
                  <div>PHOTO</div>
                </div>

                {/* Details */}
                <div className="flex-1 space-y-1.5 w-full">
                  <div>
                    <div className="text-[10px] text-ink-muted uppercase">নাম (Name)</div>
                    <div className="font-serif font-bold text-sm text-ink">মোহাম্মদ হাসান</div>
                    <div className="font-sans text-xs text-ink-muted">Mohammad Hasan</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-ink-muted uppercase">পিতা (Father)</div>
                    <div className="text-xs text-ink">রফিকুল ইসলাম (Rafiqul Islam)</div>
                  </div>
                  <div className="pt-1 border-t border-border/60">
                    <div className="text-[10px] text-ink-muted uppercase">ID NO (জাতীয় পরিচয় নং)</div>
                    <div
                      className={`font-mono text-base font-extrabold tracking-wider ${isDefectPacket ? 'text-amber' : 'text-green-deep'
                        }`}
                    >
                      {isDefectPacket ? '269478513 (9 Digits - Invalid)' : '2694785130 (10 Digits)'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-[10px] font-mono text-ink-muted text-center">
                Election Commission Bangladesh • NIDW Database Record
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Viewer Footer Status */}
      <div className="border-t border-border bg-paper p-2.5 px-4 text-xs font-mono text-ink-muted flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-mid" />
          <span>Multimodal Document Rendering Active</span>
        </span>
        <span>
          {activeDoc.toUpperCase()} • 300 DPI Vector View
        </span>
      </div>
    </div>
  );
}
