const { readFile } = require('node:fs/promises');
const path = require('node:path');
const { loadEnvFile } = require('node:process');
const { ingestLegalCorpus, listCollections, replaceLegalSection, searchLegal } = require('../legal-retrieval');
const RequestError = require('../request-error');

function parseCorpus(text) {
  const input = text.replace(/^\uFEFF/, '').trim();
  try {
    if (input.startsWith('[')) return JSON.parse(input);
    return input.split(/\r?\n/).filter(line => line.trim()).map(line => JSON.parse(line));
  } catch {
    throw new RequestError(400, 'The corpus file must be valid JSON or JSON Lines.');
  }
}

async function main() {
  try {
    loadEnvFile(path.join(__dirname, '..', '.env'));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }

  const [command, input, expectedSection, expectedLaw, ...extra] = process.argv.slice(2);
  if (command === 'collections' && !input) {
    console.log(JSON.stringify(await listCollections(), null, 2));
  } else if (command === 'ingest' && input && !expectedSection) {
    const corpus = await readFile(input, 'utf8');
    const count = await ingestLegalCorpus(parseCorpus(corpus));
    console.log(`Indexed ${count} legal passage records in Qdrant Cloud.`);
  } else if (command === 'replace-section' && input && expectedSection && !extra.length) {
    const corpus = parseCorpus(await readFile(input, 'utf8'));
    const entries = Array.isArray(corpus) ? corpus.filter(entry => typeof entry?.section === 'string' &&
      entry.section.trim() === expectedSection &&
      (!expectedLaw || (typeof entry.lawTitle === 'string' && entry.lawTitle.trim() === expectedLaw))) : [];
    if (entries.length !== 1) throw new RequestError(400, 'Select exactly one source section from the corpus file.');
    const { count, removed } = await replaceLegalSection(entries[0]);
    console.log(`Verified ${count} replacement records, with ${removed} old records removed.`);
  } else if (command === 'search' && input?.trim() && input.length <= 2000 && !extra.length) {
    const results = await searchLegal(input.trim());
    console.log(JSON.stringify(results, null, 2));
    if (expectedSection) {
      const matches = results.some(source => source.section === expectedSection && (!expectedLaw || source.lawTitle === expectedLaw));
      if (!matches) throw new RequestError(404, 'The expected provision was not in the search results.');
      console.log('Verified the expected section in the search results.');
    }
  } else {
    throw new RequestError(400, 'Use legal.js collections, legal.js ingest <corpus-file>, legal.js replace-section <corpus-file> <section> [law-title], or legal.js search <question> [expected-section] [expected-law-title].');
  }
}

main().catch(error => {
  console.error(error instanceof RequestError ? error.message : 'Could not load the local corpus or configuration file.');
  process.exitCode = 1;
});
