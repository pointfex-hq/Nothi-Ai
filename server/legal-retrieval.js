const { createHash } = require('node:crypto');
const RequestError = require('./request-error');

const model = 'intfloat/multilingual-e5-small';
const vectorConfig = { size: 384, distance: 'Cosine' };
const resultLimit = 5;
const candidateLimit = 40;
const preferredPassagesPerSection = 2;
const batchSize = 32;
const passageBytes = 1600;
const requiredFields = ['passage', 'lawTitle', 'section', 'jurisdiction', 'officialUrl'];
const optionalFields = ['version', 'effectiveDate'];
const sourceFields = [...requiredFields, ...optionalFields];
const citationFields = [...sourceFields, 'subsection'];
const searchFields = [...citationFields, 'context', 'fragmentIds'];
const sectionFields = ['lawTitle', 'jurisdiction', 'section', 'officialUrl'];

function validOfficialUrl(value) {
  const url = URL.parse(value);
  return url && ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password;
}

function splitPassage(passage, limit = passageBytes) {
  const chunks = [];
  let start = 0;
  let end = 0;
  let lastSpace = 0;
  let bytes = 0;

  for (const character of passage) {
    const size = Buffer.byteLength(character);
    if (bytes + size > limit) {
      const boundary = lastSpace > start ? lastSpace : end;
      chunks.push(passage.slice(start, boundary));
      start = boundary;
      bytes = Buffer.byteLength(passage.slice(start, end));
    }
    end += character.length;
    bytes += size;
    if (/\s/u.test(character) && bytes >= limit / 2) lastSpace = end;
  }
  chunks.push(passage.slice(start));
  return chunks;
}

function pointId(fingerprint, chunkIndex) {
  const bytes = createHash('sha256').update(`${fingerprint}:${chunkIndex}`).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x80;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  return bytes.toString('hex').replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, '$1-$2-$3-$4-$5');
}

function combinePassage(context, text) {
  return context ? `${context}\n\n${text}` : text;
}

function numberedParts(passage, marker) {
  const matches = [...passage.matchAll(marker)];
  return {
    opening: passage.slice(0, matches[0]?.index ?? passage.length).trim(),
    parts: matches.map((match, index) => ({
      number: match[1],
      text: passage.slice(match.index, matches[index + 1]?.index).trim(),
    })),
  };
}

function clauseGroups(source, closingNote) {
  let text = source.passage;
  let note;
  if (closingNote) {
    const start = text.lastIndexOf('\n' + closingNote);
    if (start === -1) throw new RequestError(400, 'The closing note could not be found on its own line.');
    note = text.slice(start + 1).trim();
    text = text.slice(0, start);
  }
  const section = numberedParts(text, /^[ \t]*(\(\d+\))(?=[ \t]|\r?$)/gmu);
  if (!section.parts.length) throw new RequestError(400, 'The section needs numbered paragraphs on separate lines.');

  const groups = section.parts.flatMap(part => {
    const clauses = numberedParts(part.text, /^[ \t]*(\([a-z]\))(?=[ \t]|\r?$)/gmu);
    const label = source.section + part.number;
    if (!clauses.parts.length) return [{ subsection: label, context: section.opening, text: part.text }];
    const context = combinePassage(section.opening, clauses.opening);
    return clauses.parts.map(clause => ({ subsection: label + clause.number, context, text: clause.text }));
  });
  if (note) groups.push({ context: section.opening, text: note });
  return groups;
}

function indexedPoint(id, payload, searchablePassage) {
  return {
    id,
    payload,
    vector: {
      model,
      text: `passage: ${payload.lawTitle}\n${payload.subsection ?? payload.section}\n${payload.jurisdiction}\n${searchablePassage}`,
    },
  };
}

function clausePoints(source, fingerprint, closingNote) {
  return clauseGroups(source, closingNote).flatMap(({ subsection, context, text }, groupIndex) => {
    // Reserve embedding space for the actual clause even when its opening language is long.
    const searchableContext = splitPassage(context, passageBytes / 2)[0];
    const bodyLimit = passageBytes - Buffer.byteLength(searchableContext, 'utf8') - 2;
    const fragments = splitPassage(text, bodyLimit);
    const fragmentIds = fragments.map((_, index) => pointId(`${fingerprint}:${groupIndex}`, index));
    return fragments.map((fragment, index) => {
      const location = subsection ? { subsection } : {};
      const payload = fragments.length === 1
        ? { ...source, ...location, passage: combinePassage(context, fragment) }
        : { ...source, ...location, passage: fragment, context, fragmentIds };
      return indexedPoint(fragmentIds[index], payload, combinePassage(searchableContext, fragment));
    });
  });
}

function pointsFromCorpus(corpus) {
  if (!Array.isArray(corpus) || !corpus.length) {
    throw new RequestError(400, 'Provide a JSON array or JSON Lines with at least one legal passage.');
  }

  const points = new Map();
  for (const [index, entry] of corpus.entries()) {
    const source = {};
    for (const field of sourceFields) {
      const value = entry?.[field];
      if (value == null && optionalFields.includes(field)) continue;
      if (typeof value !== 'string' || !value.trim() || (field !== 'passage' && value.length > 1024)) {
        throw new RequestError(400, `Corpus entry ${index + 1} has an invalid ${field}.`);
      }
      source[field] = field === 'passage' ? value : value.trim();
    }
    if (!validOfficialUrl(source.officialUrl)) {
      throw new RequestError(400, `Corpus entry ${index + 1} needs an official HTTP or HTTPS URL.`);
    }

    const { splitByClause, closingNoteStartsWith } = entry;
    if ((splitByClause !== undefined && typeof splitByClause !== 'boolean') ||
        (closingNoteStartsWith !== undefined && (!splitByClause || typeof closingNoteStartsWith !== 'string' || !closingNoteStartsWith.trim()))) {
      throw new RequestError(400, `Corpus entry ${index + 1} has an invalid clause layout.`);
    }
    const hash = createHash('sha256').update(JSON.stringify(source));
    if (splitByClause) hash.update(JSON.stringify(['numbered-clauses-v1', closingNoteStartsWith]));
    const fingerprint = hash.digest('hex');
    const indexed = splitByClause
      ? clausePoints(source, fingerprint, closingNoteStartsWith)
      : splitPassage(source.passage).map((passage, chunkIndex) =>
        indexedPoint(pointId(fingerprint, chunkIndex), { ...source, passage }, passage));
    for (const point of indexed) points.set(point.id, point);
  }
  return [...points.values()];
}

function collectionPath() {
  const collection = process.env.QDRANT_LEGAL_COLLECTION?.trim() || 'nothi-legal';
  if (!/^[a-z0-9][a-z0-9_-]{0,62}$/.test(collection)) {
    throw new RequestError(503, 'Use up to 63 lowercase letters, numbers, dashes, or underscores for QDRANT_LEGAL_COLLECTION. Start with a letter or number.');
  }
  return `/collections/${collection}`;
}

async function qdrantRequest(path, { method = 'GET', body, ignoreStatus } = {}) {
  const apiKey = process.env.QDRANT_API_KEY?.trim();
  const configuredUrl = process.env.QDRANT_URL?.trim();
  if (!apiKey || !configuredUrl) {
    throw new RequestError(503, 'Set QDRANT_URL and QDRANT_API_KEY in server/.env to use Legal search.');
  }
  const url = URL.parse(configuredUrl);
  if (!url || url.protocol !== 'https:' || !url.hostname.endsWith('.cloud.qdrant.io') ||
      url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new RequestError(503, 'Set QDRANT_URL to the HTTPS endpoint shown for your Qdrant Cloud cluster.');
  }

  let response;
  try {
    response = await fetch(new URL(path, url), {
      method,
      redirect: 'error',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    });
  } catch (error) {
    const status = error.name === 'TimeoutError' ? 504 : 502;
    throw new RequestError(status, 'Could not reach Qdrant Cloud. Try again shortly.');
  }

  if (response.status === ignoreStatus) return null;
  if (response.status === 401 || response.status === 403) {
    throw new RequestError(503, 'Qdrant Cloud denied access. Check the cluster URL and API key permissions.');
  }
  if (!response.ok) {
    throw new RequestError(502, `Qdrant Cloud returned HTTP ${response.status}. Check the collection configuration and Cloud Inference settings.`);
  }
  const envelope = await response.json().catch(() => null);
  if (envelope?.status !== 'ok' || envelope.result == null) {
    throw new RequestError(502, 'Qdrant Cloud did not return a usable response.');
  }
  return envelope.result;
}

async function listCollections() {
  const result = await qdrantRequest('/collections');
  if (!Array.isArray(result.collections) || !result.collections.every(entry => typeof entry?.name === 'string')) {
    throw new RequestError(502, 'Qdrant Cloud did not return a usable collection list.');
  }
  return result.collections.map(entry => entry.name);
}

async function ensureCollection(path) {
  let collection = await qdrantRequest(path, { ignoreStatus: 404 });
  if (!collection) {
    const created = await qdrantRequest(path, { method: 'PUT', body: { vectors: vectorConfig }, ignoreStatus: 409 });
    if (created === true) return;
    collection = await qdrantRequest(path);
  }
  const vectors = collection?.config?.params?.vectors;
  if (vectors?.size !== vectorConfig.size || vectors.distance !== vectorConfig.distance) {
    throw new RequestError(503, 'The legal collection needs an unnamed 384-dimensional cosine vector. Choose a new QDRANT_LEGAL_COLLECTION.');
  }
}

async function ingestLegalCorpus(corpus) {
  const points = pointsFromCorpus(corpus);
  const path = collectionPath();
  await ensureCollection(path);
  for (let start = 0; start < points.length; start += batchSize) {
    const result = await qdrantRequest(path + '/points?wait=true', {
      method: 'PUT', body: { points: points.slice(start, start + batchSize) },
    });
    if (result.status !== 'completed') {
      throw new RequestError(502, 'Qdrant Cloud did not confirm the write. Rerun ingestion to retry the same points.');
    }
  }
  return points.length;
}

async function sectionPointIds(path, source) {
  const ids = [];
  let offset;
  do {
    // Cloud collections may require payload indexes for filtered scrolls.
    const page = await qdrantRequest(path + '/points/scroll', {
      method: 'POST', body: { offset, limit: 100, with_payload: sectionFields, with_vector: false },
    });
    if (!Array.isArray(page.points) || (offset != null && page.next_page_offset === offset)) {
      throw new RequestError(502, 'Qdrant Cloud did not return a usable list of legal records.');
    }
    ids.push(...page.points.filter(({ payload }) => sectionFields.every(field => payload?.[field] === source[field]))
      .map(point => point.id));
    offset = page.next_page_offset;
  } while (offset != null);
  return ids;
}

async function replaceLegalSection(source) {
  const points = pointsFromCorpus([source]);
  const path = collectionPath();
  await ensureCollection(path);
  const wanted = new Set(points.map(point => point.id));
  const scope = points[0].payload;
  const existing = await sectionPointIds(path, scope);
  const stale = existing.filter(id => !wanted.has(id));
  const operations = [];
  for (let start = 0; start < points.length; start += batchSize) {
    operations.push({ upsert: { points: points.slice(start, start + batchSize) } });
  }
  if (stale.length) operations.push({ delete: { points: stale } });
  const result = await qdrantRequest(path + '/points/batch?wait=true&ordering=strong', {
    method: 'POST', body: { operations },
  });
  if (!Array.isArray(result) || result.length !== operations.length || result.some(update => update.status !== 'completed')) {
    throw new RequestError(502, 'Qdrant Cloud did not confirm the section replacement. Rerun the same command to verify it.');
  }
  const verified = await sectionPointIds(path, scope);
  if (verified.length !== wanted.size || !verified.every(id => wanted.has(id))) {
    throw new RequestError(502, 'The section still contains unexpected records. Rerun the replacement to reconcile it.');
  }
  return { count: wanted.size, removed: stale.length };
}

function selectPassages(sources) {
  const counts = new Map();
  const seenGroups = new Set();
  const preferred = [];
  const additional = [];
  for (const source of sources) {
    const group = source.fragmentIds?.[0];
    if (group && seenGroups.has(group)) continue;
    if (group) seenGroups.add(group);
    const section = JSON.stringify([source.fields.jurisdiction, source.fields.lawTitle, source.fields.section]);
    const count = counts.get(section) ?? 0;
    if (count < preferredPassagesPerSection) {
      preferred.push(source);
      counts.set(section, count + 1);
    } else {
      additional.push(source);
    }
  }
  return [...preferred, ...additional].slice(0, resultLimit);
}

function parseHit(point) {
  const { id, payload, score } = point ?? {};
  if (!requiredFields.every(field => typeof payload?.[field] === 'string' && payload[field].trim()) ||
      !validOfficialUrl(payload.officialUrl)) return null;

  const fields = {};
  for (const field of citationFields) {
    if (typeof payload[field] === 'string') fields[field] = payload[field];
  }
  const { fragmentIds, context } = payload;
  if (fragmentIds !== undefined && (!Array.isArray(fragmentIds) || fragmentIds.length < 2 ||
      new Set(fragmentIds).size !== fragmentIds.length || !fragmentIds.every(id => typeof id === 'string') ||
      !fragmentIds.includes(id) || typeof context !== 'string')) return null;
  return { id, fields, score, context, fragmentIds };
}

async function assemblePassages(path, candidates) {
  const selected = selectPassages(candidates);
  const byId = new Map(candidates.map(candidate => [candidate.id, candidate]));
  const missing = [...new Set(selected.flatMap(candidate => candidate.fragmentIds ?? []))].filter(id => !byId.has(id));
  if (missing.length) {
    const points = await qdrantRequest(path + '/points', {
      method: 'POST', body: { ids: missing, with_payload: searchFields, with_vector: false },
    });
    if (!Array.isArray(points)) throw new RequestError(502, 'Qdrant Cloud did not return the adjacent legal excerpts.');
    for (const point of points) {
      const fragment = parseHit(point);
      if (fragment) byId.set(fragment.id, fragment);
    }
  }

  return selected.flatMap(({ fields, score, fragmentIds, context }) => {
    if (!fragmentIds) return [{ score, ...fields }];
    const fragments = fragmentIds.map(id => byId.get(id));
    const sameGroup = fragments.every(fragment => fragment && fragment.context === context &&
      JSON.stringify(fragment.fragmentIds) === JSON.stringify(fragmentIds) &&
      citationFields.every(field => field === 'passage' || fragment.fields[field] === fields[field]));
    if (!sameGroup) return [];
    const passage = combinePassage(context, fragments.map(fragment => fragment.fields.passage).join(''));
    return [{ score, ...fields, passage }];
  });
}

async function searchLegal(question) {
  const path = collectionPath();
  const result = await qdrantRequest(path + '/points/query', {
    method: 'POST',
    ignoreStatus: 404,
    body: {
      query: { model, text: `query: ${question}` },
      limit: candidateLimit,
      with_payload: searchFields,
    },
  });
  if (result === null) {
    throw new RequestError(503, 'The Qdrant legal collection is missing. Ingest the official corpus before using Legal search.');
  }
  if (!Array.isArray(result.points)) {
    throw new RequestError(502, 'Qdrant Cloud did not return a usable search result.');
  }

  return assemblePassages(path, result.points.slice(0, candidateLimit).map(parseHit).filter(Boolean));
}

module.exports = { ingestLegalCorpus, listCollections, replaceLegalSection, searchLegal };
