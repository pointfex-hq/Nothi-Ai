const { randomUUID } = require('node:crypto');
const { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } = require('node:fs');
const path = require('node:path');

const accountsFile = process.env.NOTHI_ACCOUNTS_FILE || path.join(__dirname, 'data', 'accounts.json');
const usageLimitsFile = path.join(path.dirname(accountsFile), 'usage-limits.json');
const auditLogsFile = path.join(path.dirname(accountsFile), 'audit-logs.json');
const chatsFile = path.join(path.dirname(accountsFile), 'chats.json');

function readLocalJson(file, fallback) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT' || error instanceof SyntaxError) return fallback;
    throw error;
  }
}

function writeLocalJson(file, value) {
  mkdirSync(path.dirname(file), { recursive: true });
  const temporaryFile = file + '.' + randomUUID() + '.tmp';
  try {
    writeFileSync(temporaryFile, JSON.stringify(value, null, 2), { mode: 0o600, flag: 'w' });
    renameSync(temporaryFile, file);
  } finally {
    rmSync(temporaryFile, { force: true });
  }
}

module.exports = {
  accountsFile,
  usageLimitsFile,
  auditLogsFile,
  chatsFile,
  readLocalJson,
  writeLocalJson,
};
