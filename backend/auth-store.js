const { createHash, randomUUID } = require('node:crypto');
const { closeSync, mkdirSync, openSync, readFileSync } = require('node:fs');
const path = require('node:path');
const { Database, DatabaseSync } = require('node:sqlite');
const { accountsFile, auditLogsFile } = require('./local-data');

const file = path.join(path.dirname(accountsFile), 'auth.sqlite');
mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
closeSync(openSync(file, 'a', 0o600));
const SQLiteDatabase = Database ?? DatabaseSync;
const db = new SQLiteDatabase(file);
db.exec('PRAGMA foreign_keys = ON; PRAGMA recursive_triggers = ON; PRAGMA busy_timeout = 5000;');

function transaction(work) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = work();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

function readLegacy(filePath) {
  let contents;
  try {
    contents = readFileSync(filePath, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
  const records = JSON.parse(contents);
  if (!Array.isArray(records)) throw new Error('Expected an array in ' + filePath);
  return records;
}

function saveAccount(account) {
  db.prepare(`
    INSERT INTO accounts (id, username, name, salt, hash, role, status, created_at, is_env_account)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET name = excluded.name, salt = excluded.salt,
      hash = excluded.hash, role = excluded.role, status = excluded.status,
      is_env_account = excluded.is_env_account
  `).run(account.id, account.username.toLowerCase(), account.name || account.username.split('@')[0],
    account.salt, account.hash, account.role || 'user', account.status || 'active',
    account.createdAt || Date.now(), Number(Boolean(account.isEnvAccount)));
}

function recordAuditLog({ id = randomUUID(), action, adminId = null, targetId = null,
  details = '', timestamp = Date.now() }) {
  const event = { id, action, adminId, targetId, details, timestamp };
  db.prepare('INSERT INTO audit_events VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, action, adminId, targetId, details, timestamp);
  return event;
}

const accountColumns = 'id, username, name, salt, hash, role, status, created_at AS createdAt, is_env_account AS isEnvAccount';

transaction(() => {
  const { user_version: version } = db.prepare('PRAGMA user_version').get();
  if (version >= 1 && version <= 3) return;
  if (version !== 0) throw new Error('Unsupported auth database schema version.');
  db.exec(`
    CREATE TABLE accounts (
      id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
      username TEXT NOT NULL UNIQUE CHECK (username = lower(trim(username)) AND length(username) > 0),
      name TEXT NOT NULL,
      salt TEXT NOT NULL CHECK (length(salt) = 32 AND salt NOT GLOB '*[^0-9a-f]*'),
      hash TEXT NOT NULL CHECK (length(hash) = 128 AND hash NOT GLOB '*[^0-9a-f]*'),
      role TEXT NOT NULL CHECK (role IN ('user', 'admin')),
      status TEXT NOT NULL CHECK (status IN ('active', 'suspended')),
      created_at INTEGER NOT NULL CHECK (created_at > 0),
      is_env_account INTEGER NOT NULL CHECK (is_env_account IN (0, 1))
    ) STRICT;
    CREATE TABLE sessions (
      token_hash TEXT PRIMARY KEY CHECK (length(token_hash) = 64),
      account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL CHECK (expires_at > created_at)
    ) STRICT;
    CREATE INDEX sessions_by_account ON sessions(account_id);
    CREATE INDEX sessions_by_expiry ON sessions(expires_at);
    CREATE TABLE audit_events (
      id TEXT PRIMARY KEY,
      action TEXT NOT NULL CHECK (length(trim(action)) > 0),
      adminId TEXT,
      targetId TEXT,
      details TEXT NOT NULL,
      timestamp INTEGER NOT NULL CHECK (timestamp > 0)
    ) STRICT;
    CREATE INDEX audit_events_by_time ON audit_events(timestamp DESC);
  `);
  for (const account of readLegacy(accountsFile)) {
    if (db.prepare('SELECT 1 FROM accounts WHERE username = ? OR id = ?')
      .get(account.username.toLowerCase(), account.id)) {
      throw new Error('Duplicate account in legacy account store.');
    }
    saveAccount(account);
  }
  for (const event of readLegacy(auditLogsFile)) recordAuditLog(event);
  db.exec('PRAGMA user_version = 1');
});

transaction(() => {
  if (db.prepare('PRAGMA user_version').get().user_version >= 2) return;
  db.exec(`
    ALTER TABLE accounts ADD COLUMN is_super_admin INTEGER NOT NULL DEFAULT 0
      CHECK (is_super_admin IN (0, 1) AND (is_super_admin = 0 OR (role = 'admin' AND status = 'active')));
    CREATE UNIQUE INDEX one_super_admin ON accounts(is_super_admin) WHERE is_super_admin = 1;
    CREATE TRIGGER protect_super_admin_update BEFORE UPDATE ON accounts
      WHEN OLD.is_super_admin = 1 BEGIN SELECT RAISE(ABORT, 'Super Admin is immutable'); END;
    CREATE TRIGGER protect_super_admin_delete BEFORE DELETE ON accounts
      WHEN OLD.is_super_admin = 1 BEGIN SELECT RAISE(ABORT, 'Super Admin is immutable'); END;
    ALTER TABLE sessions ADD COLUMN public_id TEXT;
    CREATE UNIQUE INDEX sessions_by_public_id ON sessions(public_id);
  `);
  const assign = db.prepare('UPDATE sessions SET public_id = ? WHERE token_hash = ?');
  for (const row of db.prepare('SELECT token_hash FROM sessions').all()) {
    assign.run(randomUUID(), row.token_hash);
  }
  db.exec('PRAGMA user_version = 2');
});

transaction(() => {
  if (db.prepare('PRAGMA user_version').get().user_version === 3) return;
  db.exec(`
    CREATE TABLE password_registrations (
      account_id TEXT PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
      email TEXT NOT NULL CHECK (
        length(email) BETWEEN 5 AND 64 AND email = lower(trim(email))
        AND instr(email, ' ') = 0 AND instr(email, '..') = 0
        AND email GLOB '?*@?*.?*' AND length(email) - length(replace(email, '@', '')) = 1
      ),
      display_name TEXT NOT NULL CHECK (
        length(display_name) BETWEEN 1 AND 80 AND trim(display_name) = display_name
        AND instr(display_name, char(0)) = 0
      ),
      scope_acknowledged INTEGER NOT NULL CHECK (scope_acknowledged = 1)
    ) STRICT;
    PRAGMA user_version = 3;
  `);
});

function registerAccount(account, acknowledged) {
  saveAccount(account);
  db.prepare('INSERT INTO password_registrations VALUES (?, ?, ?, ?)')
    .run(account.id, account.username, account.name, Number(acknowledged === true));
}

const currentAccountColumns = accountColumns + ', is_super_admin AS isSuperAdmin';

function getSuperAdmin() {
  return db.prepare('SELECT ' + currentAccountColumns + ' FROM accounts WHERE is_super_admin = 1').get();
}

function markSuperAdmin(id) {
  db.prepare('UPDATE accounts SET is_super_admin = 1 WHERE id = ?').run(id);
}

function readAccount(username) {
  return db.prepare('SELECT ' + currentAccountColumns + ' FROM accounts WHERE username = ?').get(username);
}

function readAccountById(id) {
  return db.prepare('SELECT ' + currentAccountColumns + ' FROM accounts WHERE id = ?').get(id);
}

function listAccounts() {
  return db.prepare('SELECT ' + currentAccountColumns + ' FROM accounts ORDER BY rowid').all();
}

function updateProfile(account, originalHash) {
  const result = db.prepare(`
    UPDATE accounts SET name = ?, salt = ?, hash = ?
    WHERE id = ? AND hash = ? AND status = 'active'
  `).run(account.name, account.salt, account.hash, account.id, originalHash);
  return result.changes ? readAccountById(account.id) : undefined;
}

function setStatus(id, status) {
  db.prepare('UPDATE accounts SET status = ? WHERE id = ?').run(status, id);
  if (status === 'suspended') revokeAccountSessions(id);
}

function revokeAccountSessions(id) {
  db.prepare('DELETE FROM sessions WHERE account_id = ?').run(id);
}

function deleteAccount(id) {
  db.prepare('DELETE FROM accounts WHERE id = ?').run(id);
}

function tokenHash(token) {
  return createHash('sha256').update(token).digest('hex');
}

function createSession(token, accountId, createdAt, expiresAt) {
  db.prepare('INSERT INTO sessions (token_hash, account_id, created_at, expires_at, public_id) VALUES (?, ?, ?, ?, ?)')
    .run(tokenHash(token), accountId, createdAt, expiresAt, randomUUID());
}

function getSession(token) {
  if (!token) return undefined;
  return db.prepare('SELECT public_id AS id, account_id AS accountId, expires_at AS expiresAt FROM sessions WHERE token_hash = ?')
    .get(tokenHash(token));
}

function deleteSession(token) {
  if (token) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash(token));
}

function deleteExpiredSessions(now) {
  db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(now);
}

function listSessions(accountId, now) {
  return db.prepare(`
    SELECT public_id AS id, created_at AS createdAt, expires_at AS expiresAt
    FROM sessions WHERE account_id = ? AND expires_at > ? ORDER BY created_at DESC
  `).all(accountId, now);
}

function revokeSession(accountId, id, now) {
  return db.prepare('DELETE FROM sessions WHERE account_id = ? AND public_id = ? AND expires_at > ?')
    .run(accountId, id, now).changes > 0;
}

function getAuditLogs() {
  return db.prepare('SELECT * FROM audit_events ORDER BY timestamp DESC, rowid DESC LIMIT 100').all();
}

module.exports = {
  transaction, registerAccount, saveAccount, readAccount, readAccountById, listAccounts, updateProfile, setStatus, deleteAccount,
  getSuperAdmin, markSuperAdmin, revokeAccountSessions, listSessions, revokeSession, createSession, getSession, deleteSession, deleteExpiredSessions, recordAuditLog, getAuditLogs,
};
