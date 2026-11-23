/**
 * LawLens API Client
 *
 * This module provides the single interface between the front end and the backend.
 * Currently wired to mock data. To connect to the real FastAPI backend, replace the
 * function bodies below — the signatures and return types stay the same.
 */

import type { AuditBundle, AuditResult, CorpusSection, PipelineProgress, PipelineStage, UploadedFile } from '@/types';
import { PIPELINE_STAGES } from '@/types';
import { packetAResult, packetBResult } from '@/mocks/packets';
import { getCorpusSectionById, getAllCorpusSections } from '@/lib/citations';

// ── Simulated delay to mimic backend latency ──────────

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Upload & Classify ──────────────────────────────────

/**
 * Upload a bundle of files for audit.
 * In mock mode, this simply returns the files with mock classifications.
 */
export async function uploadBundle(bundle: AuditBundle): Promise<UploadedFile[]> {
  await delay(800);
  return bundle.files;
}

// ── Run Audit ──────────────────────────────────────────

/**
 * Run the full audit pipeline on the uploaded bundle.
 * Calls onProgress at each stage transition.
 * Returns the final AuditResult.
 */
export async function runAudit(
  bundle: AuditBundle,
  onProgress?: (progress: PipelineProgress) => void
): Promise<AuditResult> {
  const completedStages: PipelineStage[] = [];
  const start = Date.now();

  // Simulate pipeline stages with realistic durations (total ~6s mock)
  const stageDurations: Record<PipelineStage, number> = {
    ingestion: 800,
    extraction: 1500,
    audit: 1200,
    reasoning: 1500,
    ui: 1000,
  };

  for (const stage of PIPELINE_STAGES) {
    onProgress?.({
      currentStage: stage,
      completedStages: [...completedStages],
      elapsedMs: Date.now() - start,
    });

    await delay(stageDurations[stage]);
    completedStages.push(stage);
  }

  // Final progress callback
  onProgress?.({
    currentStage: 'ui',
    completedStages: [...completedStages],
    elapsedMs: Date.now() - start,
  });

  // Return the appropriate mock result
  if (bundle.packet === 'A') {
    return { ...packetAResult, timestamp: new Date().toISOString() };
  }
  return { ...packetBResult, timestamp: new Date().toISOString() };
}

// ── Corpus Lookup ──────────────────────────────────────

/**
 * Get a single section from the laws corpus by ID.
 */
export async function getCorpusSection(id: string): Promise<CorpusSection | null> {
  await delay(100);
  return getCorpusSectionById(id) ?? null;
}

/**
 * Get all sections in the laws corpus.
 */
export async function getFullCorpus(): Promise<CorpusSection[]> {
  await delay(100);
  return getAllCorpusSections();
}
