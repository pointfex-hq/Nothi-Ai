const { readFile } = require('node:fs/promises');
const path = require('node:path');
const RequestError = require('./request-error');
const { getLegalCollectionStatus, replaceLegalSection } = require('./legal-retrieval');

const bundledCorpus = path.join(__dirname, 'legal-corpus.seed.jsonl');

function parseCorpus(text) {
  const input = text.replace(/^\uFEFF/u, '').trim();
  try {
    if (input.startsWith('[')) return JSON.parse(input);
    return input.split(/\r?\n/u).filter(line => line.trim()).map(line => JSON.parse(line));
  } catch {
    throw new RequestError(400, 'The seed file must be valid JSON or JSON Lines.');
  }
}

async function seedLegalCorpus(source = process.env.QDRANT_LEGAL_SEED_FILE || bundledCorpus) {
  const corpusPath = path.resolve(source);
  const corpus = parseCorpus(await readFile(corpusPath, 'utf8'));
  let indexedPoints = 0;
  for (const entry of corpus) {
    indexedPoints += (await replaceLegalSection(entry)).count;
  }
  const status = await getLegalCollectionStatus();
  return { collection: status.collection, indexedPoints, totalPoints: status.points, sourceFile: path.basename(corpusPath) };
}

module.exports = { parseCorpus, seedLegalCorpus };
