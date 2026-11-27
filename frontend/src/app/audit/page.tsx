'use client';

import { useState, useEffect, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { SignInModal } from '@/components/auth/SignInModal';
import type {
  AuditResult,
  Citation,
  DocType,
  Flag,
  PipelineProgress,
  UploadedFile,
} from '@/types';
import { runAudit } from '@/lib/api';
import { useLang } from '@/lib/lang';

import { DocumentViewer } from '@/components/audit/DocumentViewer';
import { IntakeSection } from '@/components/audit/IntakeSection';
import { PipelineProgressTracker } from '@/components/audit/PipelineProgressTracker';
import { EntityMatrix } from '@/components/audit/EntityMatrix';
import { RiskFlags } from '@/components/audit/RiskFlags';
import { VettingMemo } from '@/components/audit/VettingMemo';
import { CitationDrawer } from '@/components/audit/CitationDrawer';

const emptySubscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

export default function AuditWorkspacePage() {
  const router = useRouter();
  const { lang, t } = useLang();
  const { user } = useAuth();
  const [signInModalOpen, setSignInModalOpen] = useState(false);
  const mounted = useSyncExternalStore(emptySubscribe, getClientSnapshot, getServerSnapshot);

  // State
  const [files, setFiles] = useState<UploadedFile[]>([
    {
      id: 'f-1',
      name: 'Saf_Kabala_Deed_10492.pdf',
      type: 'deed',
      size: 4200000,
      mimeType: 'application/pdf',
    },
    {
      id: 'f-2',
      name: 'RS_Khatian_1087_Charbata.pdf',
      type: 'khatian',
      size: 2100000,
      mimeType: 'application/pdf',
    },
    {
      id: 'f-3',
      name: 'NID_Buyer_Mohammad_Hasan.jpg',
      type: 'nid',
      size: 1400000,
      mimeType: 'image/jpeg',
    },
  ]);

  const [selectedPacket, setSelectedPacket] = useState<'A' | 'B'>('A');
  const [isAuditing, setIsAuditing] = useState(false);
  const [progress, setProgress] = useState<PipelineProgress | null>(null);
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const [activeDoc, setActiveDoc] = useState<DocType>('deed');
  const [selectedFlag, setSelectedFlag] = useState<Flag | null>(null);
  const [inspectingCitation, setInspectingCitation] = useState<Citation | null>(null);
  const [supportingRule, setSupportingRule] = useState<string | undefined>(undefined);

  // Load benchmark A on initial mount
  useEffect(() => {
    handleLoadBenchmark('A');
  }, []);

  // Handlers
  async function handleLoadBenchmark(packet: 'A' | 'B') {
    setSelectedPacket(packet);
    setSelectedFlag(null);

    const benchmarkFiles: UploadedFile[] = [
      {
        id: `bench-${packet}-deed`,
        name: packet === 'A' ? 'Saf_Kabala_Deed_10492_Clean.pdf' : 'Saf_Kabala_Deed_10492_Defect.pdf',
        type: 'deed',
        size: 4200000,
        mimeType: 'application/pdf',
      },
      {
        id: `bench-${packet}-khatian`,
        name: packet === 'A' ? 'RS_Khatian_1087_Clean.pdf' : 'RS_Khatian_1087_Dag421_Defect.pdf',
        type: 'khatian',
        size: 2100000,
        mimeType: 'application/pdf',
      },
      {
        id: `bench-${packet}-nid`,
        name: packet === 'A' ? 'NID_10Digit_Clean.jpg' : 'NID_9Digit_Defect.jpg',
        type: 'nid',
        size: 1400000,
        mimeType: 'image/jpeg',
      },
    ];

    setFiles(benchmarkFiles);

    // Immediately trigger pipeline
    setIsAuditing(true);
    setProgress(null);

    try {
      const res = await runAudit(
        { files: benchmarkFiles, packet },
        (p) => setProgress(p)
      );
      setAuditResult(res);
      // If packet B, auto select the first RED flag
      if (packet === 'B') {
        const firstRed = res.flags.find((f) => f.severity === 'RED');
        if (firstRed) {
          setSelectedFlag(firstRed);
          if (firstRed.highlight?.docType) {
            setActiveDoc(firstRed.highlight.docType);
          }
        }
      }
    } finally {
      setIsAuditing(false);
      setProgress(null);
    }
  }

  async function handleRunAudit() {
    if (files.length === 0) return;
    setIsAuditing(true);
    setProgress(null);

    try {
      const res = await runAudit(
        { files, packet: selectedPacket ?? 'A' },
        (p) => setProgress(p)
      );
      setAuditResult(res);
    } finally {
      setIsAuditing(false);
      setProgress(null);
    }
  }

  function handleSelectFlag(flag: Flag) {
    setSelectedFlag(flag);
    if (flag.highlight?.docType) {
      setActiveDoc(flag.highlight.docType);
    }
  }

  function handleSelectCitation(citation: Citation, rule?: string) {
    setInspectingCitation(citation);
    setSupportingRule(rule);
  }

  if (mounted && !user) {
    return (
      <div suppressHydrationWarning className="min-h-screen bg-paper flex items-center justify-center p-6 text-center select-none">
        <div className="max-w-md w-full p-8 rounded-2xl bg-paper-light border border-brass/50 shadow-2xl space-y-5 animate-in fade-in duration-200">
          <div className="w-14 h-14 rounded-full bg-brass/15 text-green-deep mx-auto flex items-center justify-center">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <div className="space-y-2">
            <h2 className="font-heading text-2xl font-bold text-green-deep">
              {lang === 'bn' ? 'সাইন ইন আবশ্যক' : 'Authentication Required'}
            </h2>
            <p className="text-xs sm:text-sm text-ink-muted font-sans leading-relaxed">
              {lang === 'bn'
                ? 'দলিল অডিট ও সংবিধিবদ্ধ ভেরিফিকেশন ওয়ার্কস্পেস শুধুমাত্র নিবন্ধিত আইনজীবী ও কর্মকর্তাদের জন্য সংরক্ষিত।'
                : 'Document vetting and the statutory audit workspace are restricted to authenticated legal officers and advocates.'}
            </p>
          </div>
          <div className="pt-2 space-y-2">
            <button
              type="button"
              onClick={() => setSignInModalOpen(true)}
              className="w-full py-3 px-5 rounded-full bg-green-deep hover:bg-green-mid text-paper text-sm font-semibold transition-all shadow-md active:scale-95 cursor-pointer"
            >
              {lang === 'bn' ? 'সাইন ইন করুন' : 'Sign in to Access Audit Workspace'}
            </button>
            <Link
              href="/"
              className="block text-xs font-sans text-ink-muted hover:text-ink py-1.5 transition-colors"
            >
              {lang === 'bn' ? '← হোমপেজে ফিরে যান' : '← Return to Home'}
            </Link>
          </div>
          <SignInModal isOpen={signInModalOpen} onClose={() => router.replace('/')} />
        </div>
      </div>
    );
  }

  return (
    <div suppressHydrationWarning className="mx-auto max-w-7xl px-3 sm:px-6 py-6 space-y-6">
      {/* Workspace Header Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-widest text-ink-muted">
            Registry Document Vetting Engine • FR-1.1 – FR-5.1
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-green-deep tracking-tight">
            {t('audit.title')}
          </h1>
          <p className="text-xs sm:text-sm text-ink-muted mt-0.5">
            {lang === 'bn'
              ? 'সাফ কবলা দলিল, আরএস/বিএস খতিয়ান ও জাতীয় পরিচয়পত্রের বহুমাধ্যম ও নির্ণায়ক নিরীক্ষা।'
              : 'Deterministic statutory vetting for Bangladeshi deeds, Khatians, and NID cards.'}
          </p>
        </div>

        {auditResult && (
          <div className="flex items-center gap-2">
            <div
              className={`px-3.5 py-1.5 rounded-full border font-mono text-xs font-bold tracking-wider uppercase ${
                auditResult.summary.verdict === 'COMPLIANT'
                  ? 'border-flag-green text-flag-green bg-flag-green/10'
                  : 'border-vermillion text-vermillion bg-vermillion/10'
              }`}
            >
              {auditResult.summary.verdict === 'COMPLIANT'
                ? '● 0 DISCREPANCIES (PASSED)'
                : `▲ ${auditResult.summary.discrepancies} DISCREPANCIES RECORDED`}
            </div>
          </div>
        )}
      </div>

      {/* Inline Pipeline Progress state (calm sequence, < 18s) */}
      {isAuditing && progress && (
        <div className="transition-all animate-in fade-in duration-200">
          <PipelineProgressTracker progress={progress} />
        </div>
      )}

      {/* Split-Screen Primary Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT PANE: Document Viewer (Sticky on desktop, 5 cols) */}
        <div className="lg:col-span-5 lg:sticky lg:top-20 z-10 space-y-3">
          <DocumentViewer
            activeDoc={activeDoc}
            onDocChange={setActiveDoc}
            selectedFlag={selectedFlag}
            hasAudited={!!auditResult}
            isDefectPacket={selectedPacket === 'B'}
          />
        </div>

        {/* RIGHT PANE: Audit Sections (Scrollable, 7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* a) Intake Section */}
          <IntakeSection
            files={files}
            onFilesChange={setFiles}
            onLoadBenchmark={handleLoadBenchmark}
            onRunAudit={handleRunAudit}
            isAuditing={isAuditing}
            selectedPacket={selectedPacket}
          />

          {auditResult && (
            <>
              {/* b) Entity Comparison Matrix */}
              <EntityMatrix rows={auditResult.matrix} />

              {/* c) Risk Flags (Red/Amber/Green) */}
              <RiskFlags
                flags={auditResult.flags}
                selectedFlagId={selectedFlag?.id ?? null}
                onSelectFlag={handleSelectFlag}
                onSelectCitation={handleSelectCitation}
              />

              {/* e) Vetting Memorandum */}
              <VettingMemo
                memo={auditResult.memo}
                verdict={auditResult.summary.verdict}
                verdictBn={auditResult.summary.verdictBn}
                auditId={auditResult.id}
                timestamp={auditResult.timestamp}
                onSelectCitation={(cit) => handleSelectCitation(cit)}
              />
            </>
          )}
        </div>
      </div>

      {/* d) Citation Inspector Drawer (Modal / Side Drawer) */}
      <CitationDrawer
        citation={inspectingCitation}
        onClose={() => setInspectingCitation(null)}
        supportingRule={supportingRule}
      />
    </div>
  );
}
