import lawsCorpus from '@/data/laws_corpus.json';
import type { Citation, CorpusSection } from '@/types';

// Build a lookup set of valid corpus IDs at module load time
const corpusMap = new Map<string, CorpusSection>();
for (const entry of lawsCorpus as CorpusSection[]) {
  corpusMap.set(entry.id, entry);
}

// Common statutory shorthand aliases to canonical laws_corpus.json keys
const ID_ALIASES: Record<string, string> = {
  'reg_1908_sec23': 'reg_act_1908_s23',
  'tp_1882_sec52': 'tpa_1882_s52',
  'land_crime_2023_sec4': 'lcpra_2023_s4',
  'reg_1908_sec17': 'reg_act_1908_s17',
  'reg_1908_sec24': 'reg_act_1908_s24',
  'reg_1908_sec25': 'reg_act_1908_s25',
  'tp_1882_sec54': 'tpa_1882_s54',
  'tp_1882_sec55': 'tpa_1882_s55',
  'nid_rules_r3': 'nidw_rules_r3',
  'nidw_rules_rule3': 'nidw_rules_r3',
};

/**
 * Resolves a citation ID to its canonical corpus key if aliased or regex-matched.
 */
export function resolveCanonicalId(id: string): string {
  const trimmed = id.trim();
  if (corpusMap.has(trimmed)) return trimmed;
  if (ID_ALIASES[trimmed] && corpusMap.has(ID_ALIASES[trimmed])) {
    return ID_ALIASES[trimmed];
  }
  // Generic normalizers for common shorthand patterns
  const regMatch = trimmed.match(/^reg(?:_act)?_(\d{4})_sec?(\d+)$/i);
  if (regMatch) {
    const candidate = `reg_act_${regMatch[1]}_s${regMatch[2]}`;
    if (corpusMap.has(candidate)) return candidate;
  }
  const tpMatch = trimmed.match(/^tp(?:a)?_(\d{4})_sec?(\d+)$/i);
  if (tpMatch) {
    const candidate = `tpa_${tpMatch[1]}_s${tpMatch[2]}`;
    if (corpusMap.has(candidate)) return candidate;
  }
  const lcpraMatch = trimmed.match(/^land_crime_(\d{4})_sec?(\d+)$/i);
  if (lcpraMatch) {
    const candidate = `lcpra_${lcpraMatch[1]}_s${lcpraMatch[2]}`;
    if (corpusMap.has(candidate)) return candidate;
  }
  return trimmed;
}

/**
 * Returns the full corpus section for a given ID (supporting aliases), or undefined if not found.
 */
export function getCorpusSectionById(id: string): CorpusSection | undefined {
  const canonical = resolveCanonicalId(id);
  return corpusMap.get(canonical);
}

/**
 * Filters an array of citations, keeping only those whose IDs exist in laws_corpus.json.
 * Unknown IDs are silently stripped and logged to console.
 */
export function filterValidCitations(citations: Citation[]): Citation[] {
  return citations.filter((citation) => {
    const canonical = resolveCanonicalId(citation.id);
    const exists = corpusMap.has(canonical);
    if (!exists) {
      console.warn(
        `[citation-filter] Unknown citation ID "${citation.id}" stripped. ` +
        `This ID does not exist in laws_corpus.json.`
      );
    }
    return exists;
  });
}

/**
 * Returns all entries in the corpus.
 */
export function getAllCorpusSections(): CorpusSection[] {
  return Array.from(corpusMap.values());
}

/**
 * Checks whether a given citation ID is valid (exists in the corpus).
 */
export function isValidCitationId(id: string): boolean {
  const canonical = resolveCanonicalId(id);
  return corpusMap.has(canonical);
}
