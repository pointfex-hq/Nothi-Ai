'use client';

import { useState } from 'react';
import type {
  AuditResult,
  Citation,
  DocType,
  Flag,
  PipelineProgress,
  UploadedFile,
} from '@/types';
import { runAudit } from '@/lib/api';
import { packetAResult } from '@/mocks/packets';
import { useLang } from '@/lib/lang';

import { DocumentViewer } from '@/components/audit/DocumentViewer';
import { IntakeSection } from '@/components/audit/IntakeSection';
import { PipelineProgressTracker } from '@/components/audit/PipelineProgressTracker';
import { EntityMatrix } from '@/components/audit/EntityMatrix';
import { RiskFlags } from '@/components/audit/RiskFlags';
import { VettingMemo } from '@/components/audit/VettingMemo';
import { CitationDrawer } from '@/components/audit/CitationDrawer';

export default function AuditWorkspacePage() {
  const { lang, t } = useLang();

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
  const [auditResult, setAuditResult] = useState<AuditResult | null>(packetAResult);
  const [activeDoc, setActiveDoc] = useState<DocType>('deed');
  const [selectedFlag, setSelectedFlag] = useState<Flag | null>(null);
  const [inspectingCitation, setInspectingCitation] = useState<Citation | null>(null);
  const [supportingRule, setSupportingRule] = useState<string | undefined>(undefined);

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

  return (
    <div className="mx-auto max-w-7xl px-3 sm:px-6 py-6 space-y-6">
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
              className={`px-3 py-1.5 rounded-sm border font-mono text-xs font-bold tracking-wider uppercase ${
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
