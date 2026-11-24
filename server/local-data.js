const { randomUUID } = require('node:crypto');
const { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } = require('node:fs');
const path = require('node:path');

const accountsFile = process.env.NOTHI_ACCOUNTS_FILE || path.join(__dirname, 'data', 'accounts.json');
const usageLimitsFile = path.join(path.dirname(accountsFile), 'usage-limits.json');
const chatsFile = path.join(path.dirname(accountsFile), 'chats.sqlite');

function readLocalJson(file, fallback) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return fallback;
    throw error;
  }
}

function writeLocalJson(file, value) {
  mkdirSync(path.dirname(file), { recursive: true });
  const temporaryFile = file + '.' + randomUUID() + '.tmp';
  try {
    writeFileSync(temporaryFile, JSON.stringify(value), { mode: 0o600, flag: 'wx' });
    renameSync(temporaryFile, file);
  } finally {
    rmSync(temporaryFile, { force: true });
  }
}

module.exports = { accountsFile, usageLimitsFile, chatsFile, readLocalJson, writeLocalJson };
