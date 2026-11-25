const path = require('node:path');
const { loadEnvFile } = require('node:process');
const RequestError = require('../request-error');
const { seedLegalCorpus } = require('../legal-seed');

try {
  loadEnvFile(path.join(__dirname, '..', '.env'));
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}

seedLegalCorpus(process.argv[2])
  .then(result => {
    console.log(`Reconciled ${result.indexedPoints} bundled legal passage records in ${result.collection} (${result.totalPoints} total points).`);
  })
  .catch(error => {
    console.error(error instanceof RequestError ? error.message : 'Could not seed the verified legal corpus.');
    process.exitCode = 1;
  });
