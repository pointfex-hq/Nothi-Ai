const express = require('express');
const { randomBytes, randomUUID, scrypt, timingSafeEqual } = require('node:crypto');
const { promisify } = require('node:util');
const { accountsFile, auditLogsFile, readLocalJson, writeLocalJson } = require('./local-data');
const RequestError = require('./request-error');

const router = express.Router();
const readCredentials = express.json({ limit: '8kb' });
const adminIds = new Set(
  (process.env.NOTHI_ADMIN_USER_IDS ?? '')
    .split(',')
    .map(id => id.trim().toLowerCase())
    .filter(Boolean)
);
const sessionCookie = 'nothi_session';
const sessionLifetime = 12 * 60 * 60 * 1000;
const sessions = new Map();
const deriveKey = promisify(scrypt);
const hashOptions = { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 };
const fallbackSalt = randomBytes(16);
const fallbackHash = randomBytes(64);

function readAccounts() {
  try {
    const records = readLocalJson(accountsFile, []);
    return new Map(records.map(account => [account.username.toLowerCase(), {
      ...account,
      status: account.status || 'active',
      createdAt: account.createdAt || Date.now(),
      isEnvAccount: Boolean(account.isEnvAccount),
    }]));
  } catch (error) {
    throw new Error('Could not read the local account store.', { cause: error });
  }
}

const accounts = readAccounts();

function saveAccount(account) {
  const normalized = account.username.toLowerCase();
  if (accounts.has(normalized)) {
    throw new RequestError(409, 'That username is already taken.');
  }

  const record = {
    ...account,
    status: account.status || 'active',
    createdAt: account.createdAt || Date.now(),
    isEnvAccount: Boolean(account.isEnvAccount),
  };
  accounts.set(normalized, record);
  writeLocalJson(accountsFile, [...accounts.values()]);
}

// ── Environment-Driven Admin and Normal User Initialization ───
async function initializeEnvUsers() {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD?.trim();
  if (adminEmail && adminPassword) {
    const existing = accounts.get(adminEmail);
    const salt = randomBytes(16);
    const hash = await deriveKey(adminPassword, salt, 64, hashOptions);
    const adminAccount = {
      id: existing?.id || 'env-admin',
      username: adminEmail,
      name: existing?.name || 'Chamber Administrator',
      salt: salt.toString('hex'),
      hash: hash.toString('hex'),
      role: 'admin',
      status: existing?.status || 'active',
      createdAt: existing?.createdAt || Date.now(),
      isEnvAccount: true,
    };
    accounts.set(adminEmail, adminAccount);
    writeLocalJson(accountsFile, [...accounts.values()]);
    adminIds.add(adminEmail);
    adminIds.add(adminAccount.id);
  }

  const userEmail = process.env.USER_EMAIL?.trim().toLowerCase();
  const userPassword = process.env.USER_PASSWORD?.trim();
  if (userEmail && userPassword) {
    const existing = accounts.get(userEmail);
    const salt = randomBytes(16);
    const hash = await deriveKey(userPassword, salt, 64, hashOptions);
    const userAccount = {
      id: existing?.id || 'env-user',
      username: userEmail,
      name: existing?.name || 'Advocate Rafiqul Islam',
      salt: salt.toString('hex'),
      hash: hash.toString('hex'),
      role: 'user',
      status: existing?.status || 'active',
      createdAt: existing?.createdAt || Date.now(),
      isEnvAccount: true,
    };
    accounts.set(userEmail, userAccount);
    writeLocalJson(accountsFile, [...accounts.values()]);
  }
}

initializeEnvUsers().catch(err => {
  console.warn('Could not initialize environment users:', err.message);
});

function getCredentials(request) {
  const { username, email, password } = request.body ?? {};
  const rawIdentifier = (typeof email === 'string' && email.trim()) ? email : username;
  const normalized = typeof rawIdentifier === 'string' ? rawIdentifier.trim().toLowerCase() : '';
  if (!normalized || normalized.length < 3 || normalized.length > 64) {
    throw new RequestError(400, 'Enter a valid username or email address.');
  }
  if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
    throw new RequestError(400, 'Use a password between 8 and 128 characters.');
  }
  return { username: normalized, password };
}

function publicUser(account) {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const isAdmin =
    account.role === 'admin' ||
    (adminEmail && account.username.toLowerCase() === adminEmail) ||
    adminIds.has(account.id.toLowerCase()) ||
    adminIds.has(account.username.toLowerCase());

  return {
    id: account.id,
    name: account.name || (account.username.split('@')[0]),
    username: account.username,
    email: account.username,
    role: isAdmin ? 'admin' : 'user',
    status: account.status || 'active',
    createdAt: account.createdAt || Date.now(),
    isEnvAccount: Boolean(account.isEnvAccount),
  };
}

function getSessionToken(request) {
  return /(?:^|;\s*)nothi_session=([A-Za-z0-9_-]{43})(?=;|$)/.exec(request.get('Cookie') ?? '')?.[1];
}

function currentUser(request) {
  const token = getSessionToken(request);
  const session = sessions.get(token);
  if (!session) return null;
  if (session.expiresAt <= Date.now()) {
    sessions.delete(token);
    return null;
  }
  const account = accounts.get(session.user.username.toLowerCase());
  if (!account || account.status === 'suspended') {
    sessions.delete(token);
    return null;
  }
  return publicUser(account);
}

function cookieOptions(request) {
  const isProduction = process.env.NODE_ENV === 'production';
  const isHttps = request.secure || request.get('x-forwarded-proto') === 'https';
  const isCrossSite = request.get('sec-fetch-site') === 'cross-site' || process.env.COOKIE_SAMESITE_NONE === 'true';

  return {
    httpOnly: true,
    secure: isProduction ? (isHttps || true) : isHttps,
    sameSite: isCrossSite && (isHttps || isProduction) ? 'none' : 'lax',
    path: '/',
  };
}

function startSession(request, response, account, status) {
  const now = Date.now();
  for (const [token, session] of sessions) {
    if (session.expiresAt <= now) sessions.delete(token);
  }

  sessions.delete(getSessionToken(request));
  const token = randomBytes(32).toString('base64url');
  const user = publicUser(account);
  sessions.set(token, { user, expiresAt: now + sessionLifetime });
  response.cookie(sessionCookie, token, { ...cookieOptions(request), maxAge: sessionLifetime });
  response.status(status).json({ user });
}

function requireUser(request, response, next) {
  const token = getSessionToken(request);
  if (!token) return response.status(401).json({ error: 'Sign in to continue.' });

  const session = sessions.get(token);
  if (!session || session.expiresAt <= Date.now()) {
    if (session) sessions.delete(token);
    return response.status(401).json({ error: 'Sign in to continue.' });
  }

  const account = accounts.get(session.user.username.toLowerCase());
  if (!account) {
    sessions.delete(token);
    response.clearCookie(sessionCookie, cookieOptions(request));
    return response.status(401).json({ error: 'Your account no longer exists.' });
  }

  if (account.status === 'suspended') {
    sessions.delete(token);
    response.clearCookie(sessionCookie, cookieOptions(request));
    return response.status(403).json({ error: 'Your account has been suspended by an administrator.' });
  }

  response.locals.user = publicUser(account);
  next();
}

async function handleRegister(request, response) {
  const { username, password } = getCredentials(request);
  if (accounts.has(username)) throw new RequestError(409, 'That username is already taken.');

  const salt = randomBytes(16);
  const hash = await deriveKey(password, salt, 64, hashOptions);
  const account = {
    id: randomUUID(),
    username,
    name: (typeof request.body?.name === 'string' && request.body.name.trim()) ? request.body.name.trim().slice(0, 80) : username.split('@')[0],
    salt: salt.toString('hex'),
    hash: hash.toString('hex'),
    role: 'user',
    status: 'active',
    createdAt: Date.now(),
    isEnvAccount: false,
  };
  saveAccount(account);
  startSession(request, response, account, 201);
}

async function handleSignIn(request, response) {
  const { username, password } = getCredentials(request);
  const account = accounts.get(username);
  const salt = account ? Buffer.from(account.salt, 'hex') : fallbackSalt;
  const expected = account ? Buffer.from(account.hash, 'hex') : fallbackHash;
  const hash = await deriveKey(password, salt, 64, hashOptions);
  if (!timingSafeEqual(hash, expected) || !account) {
    throw new RequestError(401, 'The username or password is incorrect.');
  }
  if (account.status === 'suspended') {
    throw new RequestError(403, 'Your account has been suspended by an administrator.');
  }
  startSession(request, response, account, 200);
}

function handleSignOut(request, response) {
  sessions.delete(getSessionToken(request));
  response.clearCookie(sessionCookie, cookieOptions(request));
  response.json({ user: null });
}

// ── Profile and Security Update Endpoint ───
router.patch('/profile', requireUser, express.json({ limit: '8kb' }), async (request, response) => {
  const user = response.locals.user;
  const account = accounts.get(user.username.toLowerCase());
  if (!account) throw new RequestError(404, 'Account not found.');

  const { name, currentPassword, newPassword } = request.body || {};
  const passwordChanged = Boolean(newPassword);

  // Display Name Update
  if (typeof name === 'string' && name.trim()) {
    account.name = name.trim().slice(0, 80);
  }

  // Password Update
  if (newPassword) {
    if (account.isEnvAccount) {
      throw new RequestError(400, 'Password for environment-seeded accounts is managed via .env configuration.');
    }
    if (typeof newPassword !== 'string' || newPassword.length < 8 || newPassword.length > 128) {
      throw new RequestError(400, 'Use a new password between 8 and 128 characters.');
    }
    if (typeof currentPassword !== 'string' || !currentPassword) {
      throw new RequestError(400, 'Enter your current password to confirm changes.');
    }

    const salt = Buffer.from(account.salt, 'hex');
    const expected = Buffer.from(account.hash, 'hex');
    const hash = await deriveKey(currentPassword, salt, 64, hashOptions);
    if (!timingSafeEqual(hash, expected)) {
      throw new RequestError(400, 'Current password verification failed.');
    }

    const newSalt = randomBytes(16);
    const newHash = await deriveKey(newPassword, newSalt, 64, hashOptions);
    account.salt = newSalt.toString('hex');
    account.hash = newHash.toString('hex');
  }

  accounts.set(account.username.toLowerCase(), account);
  writeLocalJson(accountsFile, [...accounts.values()]);

  const updatedUser = publicUser(account);
  const currentToken = getSessionToken(request);
  for (const [token, session] of sessions) {
    if (session.user.id === account.id) {
      if (passwordChanged && token !== currentToken) {
        sessions.delete(token);
        continue;
      }
      session.user = updatedUser;
    }
  }

  response.json({ user: updatedUser });
});

router.get('/session', (request, response) => {
  response.json({ user: currentUser(request) });
});

router.post('/register', readCredentials, handleRegister);
router.post('/sign-in', readCredentials, handleSignIn);
router.post('/signin', readCredentials, handleSignIn);
router.post('/login', readCredentials, handleSignIn);
router.post('/sign-out', handleSignOut);
router.post('/logout', handleSignOut);

router.use((error, _request, response, next) => {
  if (response.headersSent) return next(error);
  const message =
    error instanceof RequestError
      ? error.message
      : error.status === 400
      ? 'Enter a valid username and password.'
      : error.status === 413
      ? 'The sign-in details are too large.'
      : 'The account request could not be completed. Try again.';
  response.status(error.status || 500).json({ error: message });
});

// ── Admin Lifecycle Operations ───
function listUsers() {
  return [...accounts.values()].map(publicUser);
}

function updateUserStatus(userId, status, actorId) {
  const account = [...accounts.values()].find(a => a.id === userId);
  if (!account) throw new RequestError(404, 'User account not found.');

  if (account.isEnvAccount && account.role === 'admin') {
    throw new RequestError(400, 'Cannot modify status of root environment administrator.');
  }

  if (status !== 'active' && status !== 'suspended') {
    throw new RequestError(400, 'Status must be active or suspended.');
  }

  account.status = status;
  accounts.set(account.username.toLowerCase(), account);
  writeLocalJson(accountsFile, [...accounts.values()]);

  recordAuditLog({
    action: status === 'suspended' ? 'USER_SUSPENDED' : 'USER_REACTIVATED',
    adminId: actorId,
    targetId: userId,
    details: `Account ${account.username} marked ${status}`,
  });

  return publicUser(account);
}

function deleteUser(userId, actorId) {
  const account = [...accounts.values()].find(a => a.id === userId);
  if (!account) throw new RequestError(404, 'User account not found.');

  if (account.isEnvAccount) {
    throw new RequestError(400, 'Cannot delete an environment-provisioned account.');
  }

  if (account.role === 'admin') {
    throw new RequestError(400, 'Cannot delete administrator accounts.');
  }

  accounts.delete(account.username.toLowerCase());
  writeLocalJson(accountsFile, [...accounts.values()]);

  // Invalidate any active sessions
  for (const [token, sess] of sessions.entries()) {
    if (sess.user.id === userId || sess.user.username.toLowerCase() === account.username.toLowerCase()) {
      sessions.delete(token);
    }
  }

  recordAuditLog({
    action: 'USER_DELETED',
    adminId: actorId,
    targetId: userId,
    details: `Account ${account.username} permanently deleted`,
  });

  return { success: true, id: userId };
}

// ── Admin Audit Logging Store ───
function recordAuditLog({ action, adminId, targetId, details }) {
  try {
    const logs = readLocalJson(auditLogsFile, []);
    const entry = {
      id: randomUUID(),
      action,
      adminId,
      targetId: targetId || null,
      details: details || '',
      timestamp: Date.now(),
    };
    logs.unshift(entry);
    writeLocalJson(auditLogsFile, logs.slice(0, 100));
    return entry;
  } catch (err) {
    console.warn('Failed to record audit log:', err.message);
    return null;
  }
}

function getAuditLogs() {
  return readLocalJson(auditLogsFile, []);
}

module.exports = {
  authRouter: router,
  requireUser,
  listUsers,
  updateUserStatus,
  deleteUser,
  recordAuditLog,
  getAuditLogs,
};
