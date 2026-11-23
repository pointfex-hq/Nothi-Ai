// ── Core domain types for LawLens ──────────────────────

/** Document classification */
export type DocType = 'deed' | 'khatian' | 'nid';

/** Severity level for risk flags */
export type Severity = 'RED' | 'AMBER' | 'GREEN';

/** Pipeline processing stages */
export type PipelineStage =
  | 'ingestion'
  | 'extraction'
  | 'audit'
  | 'reasoning'
  | 'ui';

export const PIPELINE_STAGES: PipelineStage[] = [
  'ingestion',
  'extraction',
  'audit',
  'reasoning',
  'ui',
];

export const PIPELINE_STAGE_LABELS: Record<PipelineStage, { en: string; bn: string }> = {
  ingestion:   { en: 'Ingestion & Normalization',    bn: 'গ্রহণ ও স্বাভাবিককরণ' },
  extraction:  { en: 'Multimodal Extraction',        bn: 'বহুমাধ্যম নিষ্কাশন' },
  audit:       { en: 'Deterministic Audit',           bn: 'নির্ণায়ক নিরীক্ষা' },
  reasoning:   { en: 'Grounded Statutory Reasoning',  bn: 'ভিত্তিক বিধিবদ্ধ যুক্তি' },
  ui:          { en: 'Split-Screen Audit UI',          bn: 'বিভক্ত-পর্দা নিরীক্ষা ইউআই' },
};

/** An entity field name used in cross-document comparison */
export type EntityFieldName =
  | 'seller_name'
  | 'buyer_name'
  | 'father_name'
  | 'nid_number'
  | 'dag_no'
  | 'khatian_no'
  | 'mouza'
  | 'execution_date'
  | 'registration_date'
  | 'deed_value_bdt';

/** Entity value: may hold both Bangla and English representations */
export interface EntityValue {
  en?: string;
  bn?: string;
  raw?: string;
}

/** Extracted entities keyed by field name, per document */
export type EntityMap = Partial<Record<EntityFieldName, EntityValue>>;

/** Row in the entity comparison matrix */
export interface EntityRow {
  field: EntityFieldName;
  label: { en: string; bn: string };
  deed?: EntityValue;
  khatian?: EntityValue;
  nid?: EntityValue;
  match: boolean;
}

/** A citation reference to a statute section */
export interface Citation {
  id: string;        // e.g. "reg_act_1908_s23"
  act: string;       // "Registration Act, 1908"
  section: string;   // "Section 23"
  title: string;     // "Time for presenting documents"
}

/** A risk flag raised by deterministic audit */
export interface Flag {
  id: string;
  severity: Severity;
  title: string;
  titleBn?: string;
  rule: string;
  ruleBn?: string;
  values: { field: string; deed?: string; khatian?: string; nid?: string }[];
  citations: Citation[];
  /** Which document and region to highlight (placeholder for bounding-box) */
  highlight?: { docType: DocType; region?: { x: number; y: number; w: number; h: number } };
}

/** A section in the vetting memorandum */
export interface MemoSection {
  id: string;
  heading: string;
  headingBn?: string;
  body: string;
  bodyBn?: string;
  citations: Citation[];
}

/** Progress state during audit pipeline execution */
export interface PipelineProgress {
  currentStage: PipelineStage;
  completedStages: PipelineStage[];
  elapsedMs: number;
}

/** The complete audit result returned by the backend */
export interface AuditResult {
  id: string;
  timestamp: string;
  entities: {
    deed: EntityMap;
    khatian: EntityMap;
    nid: EntityMap;
  };
  matrix: EntityRow[];
  flags: Flag[];
  memo: MemoSection[];
  summary: {
    totalFlags: number;
    redCount: number;
    amberCount: number;
    greenCount: number;
    discrepancies: number;
    verdict: 'COMPLIANT' | 'FLAGGED';
    verdictBn: string;
  };
}

/** An uploaded file in the intake */
export interface UploadedFile {
  id: string;
  name: string;
  type: DocType;
  size: number;
  mimeType: string;
  dataUrl?: string; // for preview
}

/** A section entry in laws_corpus.json */
export interface CorpusSection {
  id: string;
  act: string;
  section: string;
  title: string;
  text: string;
  version: string;
}

/** Bundle of files sent to the backend for audit */
export interface AuditBundle {
  files: UploadedFile[];
  packet?: 'A' | 'B';
}
