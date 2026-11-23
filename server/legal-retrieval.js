const { createHash } = require('node:crypto');
const RequestError = require('./request-error');

const model = 'intfloat/multilingual-e5-small';
const vectorConfig = { size: 384, distance: 'Cosine' };
const resultLimit = 5;
const candidateLimit = 20;
const preferredPassagesPerSection = 2;
const batchSize = 32;
const passageBytes = 1600;
const requiredFields = ['passage', 'lawTitle', 'section', 'jurisdiction', 'officialUrl'];
const optionalFields = ['version', 'effectiveDate'];
const sourceFields = [...requiredFields, ...optionalFields];

function validOfficialUrl(value) {
  const url = URL.parse(value);
  return url && ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password;
}

function splitPassage(passage) {
  const chunks = [];
  let start = 0;
  let end = 0;
  let lastSpace = 0;
  let bytes = 0;

  for (const character of passage) {
    const size = Buffer.byteLength(character);
    if (bytes + size > passageBytes) {
      const boundary = lastSpace > start ? lastSpace : end;
      chunks.push(passage.slice(start, boundary));
      start = boundary;
      bytes = Buffer.byteLength(passage.slice(start, end));
    }
    end += character.length;
    bytes += size;
    if (/\s/u.test(character) && bytes >= passageBytes / 2) lastSpace = end;
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

    const fingerprint = createHash('sha256').update(JSON.stringify(source)).digest('hex');
    for (const [chunkIndex, passage] of splitPassage(source.passage).entries()) {
      const id = pointId(fingerprint, chunkIndex);
      points.set(id, {
        id,
        payload: { ...source, passage },
        vector: {
          model,
          text: `passage: ${source.lawTitle}\n${source.section}\n${source.jurisdiction}\n${passage}`,
        },
      });
    }
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

function selectPassages(sources) {
  const counts = new Map();
  const preferred = [];
  const additional = [];
  for (const source of sources) {
    const section = JSON.stringify([source.jurisdiction, source.lawTitle, source.section]);
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

async function searchLegal(question) {
  const result = await qdrantRequest(collectionPath() + '/points/query', {
    method: 'POST',
    ignoreStatus: 404,
    body: {
      query: { model, text: `query: ${question}` },
      limit: candidateLimit,
      with_payload: sourceFields,
    },
  });
  if (result === null) {
    throw new RequestError(503, 'The Qdrant legal collection is missing. Ingest the official corpus before using Legal search.');
  }
  if (!Array.isArray(result.points)) {
    throw new RequestError(502, 'Qdrant Cloud did not return a usable search result.');
  }

  const sources = result.points.slice(0, candidateLimit).flatMap(point => {
    const { payload: fields, score } = point ?? {};
    if (!requiredFields.every(field => typeof fields?.[field] === 'string' && fields[field].trim()) ||
        !validOfficialUrl(fields.officialUrl)) return [];

    const source = { score };
    for (const field of sourceFields) {
      if (typeof fields[field] === 'string') source[field] = fields[field];
    }
    return [source];
  });
  return selectPassages(sources);
}

module.exports = { ingestLegalCorpus, listCollections, searchLegal };
