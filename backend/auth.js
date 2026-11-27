const express = require('express');
const { randomBytes, randomUUID, scrypt, timingSafeEqual } = require('node:crypto');
const { promisify } = require('node:util');
const store = require('./auth-store');
const { recordAuditLog, getAuditLogs } = store;
const { beginGoogleSignIn, completeGoogleSignIn } = require('./google-auth');
const RequestError = require('./request-error');

const router = express.Router();
const readCredentials = express.json({ limit: '8kb' });
const sessionCookie = 'nothi_session';
const sessionLifetime = 12 * 60 * 60 * 1000;
const deriveKey = promisify(scrypt);
const hashOptions = { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 };
const fallbackSalt = randomBytes(16);
const fallbackHash = randomBytes(64);

// ── Environment-Driven Admin and Normal User Initialization ───
async function initializeEnvUsers() {
  const identifier = process.env.SUPER_ADMIN_USERNAME?.trim().toLowerCase();
  const password = process.env.SUPER_ADMIN_PASSWORD;
  if (!store.getSuperAdmin() && (identifier || password)) {
    if (!validIdentifier(identifier) || !validPassword(password) || password.length < 16) {
      throw new Error('Provide a valid SUPER_ADMIN_USERNAME and a bootstrap password of 16–128 characters.');
    }
    const salt = randomBytes(16);
    const hash = await deriveKey(password, salt, 64, hashOptions);
    store.transaction(() => {
      const seeded = store.getSuperAdmin();
      if (seeded) return;
      const existing = store.readAccount(identifier);
      if (existing && !(existing.isEnvAccount && existing.role === 'admin')) {
        throw new Error('Super Admin username belongs to an existing account.');
      }
      const account = {
        id: existing?.id || randomUUID(),
        username: identifier,
        name: existing?.name || 'Super Admin',
        salt: salt.toString('hex'),
        hash: hash.toString('hex'),
        role: 'admin',
        status: 'active',
        createdAt: existing?.createdAt || Date.now(),
        isEnvAccount: true,
      };
      store.saveAccount(account);
      store.revokeAccountSessions(account.id);
      store.markSuperAdmin(account.id);
      recordAuditLog({ action: 'SUPER_ADMIN_SEEDED', targetId: account.id, details: identifier });
    });
  }

  const userEmail = process.env.USER_EMAIL?.trim().toLowerCase();
  const userPassword = process.env.USER_PASSWORD?.trim();
  if (userEmail && userPassword) {
    if (store.readAccount(userEmail)) return;
    const salt = randomBytes(16);
    const hash = await deriveKey(userPassword, salt, 64, hashOptions);
    const userAccount = {
      id: 'env-user',
      username: userEmail,
      name: 'Advocate Rafiqul Islam',
      salt: salt.toString('hex'),
      hash: hash.toString('hex'),
      role: 'user',
      status: 'active',
      createdAt: Date.now(),
      isEnvAccount: true,
    };
    store.transaction(() => {
      if (!store.readAccount(userEmail) && !store.readAccountById(userAccount.id) &&
        !store.wasAccountDeleted(userAccount.id, userEmail)) {
        store.saveAccount(userAccount);
      }
    });
  }
}

function validEmail(value) {
  return typeof value === 'string' && value.length <= 64 &&
    /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/i.test(value) &&
    !value.startsWith('.') && !value.includes('..') && !value.includes('.@');
}

function validIdentifier(value) {
  return validEmail(value) || (typeof value === 'string' && /^[a-z0-9][a-z0-9._-]{2,63}$/i.test(value));
}

function validPassword(value) {
  return typeof value === 'string' && value.length >= 8 && value.length <= 128 && /\S/u.test(value);
}

function getCredentials(request, registration = false) {
  const { username, email, password, acknowledgeScope } = request.body ?? {};
  const raw = email ?? username;
  const identifier = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  if (!(registration ? validEmail(identifier) : validIdentifier(identifier))) {
    throw new RequestError(400, registration ? 'Enter a valid email address.' : 'Enter a valid username or email address.');
  }
  if (!validPassword(password)) {
    throw new RequestError(400, 'Use a password between 8 and 128 characters.');
  }
  if (acknowledgeScope !== true) {
    throw new RequestError(400, 'Confirm that you understand the scope of Nothi AI.');
  }
  return { username: identifier, password };
}

function requireEditableAccount(account) {
  if (account.isSuperAdmin) throw new RequestError(403, 'The Super Admin account cannot be modified.');
}

function publicUser(account) {
  return {
    id: account.id,
    name: account.name || (account.username.split('@')[0]),
    username: account.username,
    email: account.username,
    role: account.role,
    isSuperAdmin: Boolean(account.isSuperAdmin),
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
  const session = store.getSession(token);
  if (!session) return null;
  const now = Date.now();
  if (session.expiresAt <= now) {
    store.expireSession(token, now);
    return null;
  }
  const account = store.readAccountById(session.accountId);
  if (!account || account.status !== 'active') {
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
  const token = randomBytes(32).toString('base64url');
  const user = store.transaction(() => {
    if (status === 201) {
      if (store.readAccount(account.username)) throw new RequestError(409, 'That username is already taken.');
      store.registerAccount(account, request.body.acknowledgeScope);
    }

    const current = store.readAccountById(account.id);
    if (!current || current.hash !== account.hash) {
      throw new RequestError(401, 'The username or password is incorrect.');
    }
    if (current.status !== 'active') {
      throw new RequestError(403, 'Your account is restricted by an administrator.');
    }

    recordSession(request, current, token, now, status === 201 ? 'USER_REGISTERED' : 'USER_LOGIN');
    return publicUser(current);
  });
  response.cookie(sessionCookie, token, { ...cookieOptions(request), maxAge: sessionLifetime });
  response.status(status).json({ user });
}

function recordSession(request, account, token, now, action) {
  store.deleteExpiredSessions(now);
  store.deleteSession(getSessionToken(request), 'SESSION_REPLACED', now);
  store.createSession(token, account.id, now, now + sessionLifetime);
  recordAuditLog({ action, targetId: account.id, details: account.username });
}

async function handleGoogleCallback(request, response) {
  const { profile, origin } = await completeGoogleSignIn(request, response);
  const email = profile.email.trim().toLowerCase();
  if (!validEmail(email)) throw new RequestError(400, 'Google returned an unsupported email address.');

  const token = randomBytes(32).toString('base64url');
  const now = Date.now();
  store.transaction(() => {
    let account = store.findGoogleAccount(profile.sub);
    if (account) {
      if (account.status !== 'active' || account.role !== 'user' || account.isSuperAdmin) {
        throw new RequestError(403, 'Google sign-in is unavailable for this account.');
      }
    } else {
      if (store.readAccount(email)) {
        throw new RequestError(409, 'An account already uses this email. Sign in with your existing method.');
      }
      const displayName = typeof profile.name === 'string'
        ? profile.name.replace(/[\p{Cc}]/gu, '').trim().slice(0, 80)
        : '';
      account = {
        id: randomUUID(), username: email, name: displayName || email.split('@')[0],
        salt: randomBytes(16).toString('hex'), hash: randomBytes(64).toString('hex'),
        role: 'user', status: 'active', createdAt: now, isEnvAccount: false,
      };
      store.registerGoogleAccount(account, profile.sub);
      recordAuditLog({ action: 'USER_REGISTERED', targetId: account.id, details: account.username });
    }
    recordSession(request, account, token, now, 'GOOGLE_LOGIN');
  });

  response.cookie(sessionCookie, token, { ...cookieOptions(request), maxAge: sessionLifetime });
  response.redirect(303, new URL('/dashboard', origin).href);
}

function requireUser(request, response, next) {
  const token = getSessionToken(request);
  if (!token) return response.status(401).json({ error: 'Sign in to continue.' });

  const session = store.getSession(token);
  const now = Date.now();
  if (!session || session.expiresAt <= now) {
    if (session) store.expireSession(token, now);
    return response.status(401).json({ error: 'Sign in to continue.' });
  }

  const account = store.readAccountById(session.accountId);
  if (!account) {
    response.clearCookie(sessionCookie, cookieOptions(request));
    return response.status(401).json({ error: 'Your account no longer exists.' });
  }

  if (account.status !== 'active') {
    response.clearCookie(sessionCookie, cookieOptions(request));
    return response.status(403).json({ error: 'Your account is restricted by an administrator.' });
  }

  response.locals.user = publicUser(account);
  next();
}

async function handleRegister(request, response) {
  const { username, password } = getCredentials(request, true);
  const name = typeof request.body.name === 'string' ? request.body.name.trim() : '';
  if (!name || name.length > 80 || /[\p{Cc}]/u.test(name)) {
    throw new RequestError(400, 'Enter a name between 1 and 80 characters.');
  }
  if (store.readAccount(username)) throw new RequestError(409, 'That username is already taken.');

  const salt = randomBytes(16);
  const hash = await deriveKey(password, salt, 64, hashOptions);
  const account = {
    id: randomUUID(),
    username,
    name,
    salt: salt.toString('hex'),
    hash: hash.toString('hex'),
    role: 'user',
    status: 'active',
    createdAt: Date.now(),
    isEnvAccount: false,
  };
  startSession(request, response, account, 201);
}

async function handleSignIn(request, response) {
  const { username, password } = getCredentials(request);
  const account = store.readAccount(username);
  const salt = account ? Buffer.from(account.salt, 'hex') : fallbackSalt;
  const expected = account ? Buffer.from(account.hash, 'hex') : fallbackHash;
  const hash = await deriveKey(password, salt, 64, hashOptions);
  if (!timingSafeEqual(hash, expected) || !account || store.isGoogleAccount(account.id)) {
    throw new RequestError(401, 'The username or password is incorrect.');
  }
  startSession(request, response, account, 200);
}

function handleSignOut(request, response) {
  const token = getSessionToken(request);
  store.transaction(() => store.deleteSession(token, 'USER_LOGOUT'));
  response.clearCookie(sessionCookie, cookieOptions(request));
  response.json({ user: null });
}

// ── Profile and Security Update Endpoint ───
router.get('/settings', requireUser, (_request, response) => {
  response.json({ user: response.locals.user });
});

router.patch(['/profile', '/settings'], requireUser, readCredentials, async (request, response) => {
  const user = response.locals.user;
  const account = store.readAccount(user.username.toLowerCase());
  if (!account) throw new RequestError(404, 'Account not found.');

  requireEditableAccount(account);
  const originalHash = account.hash;
  const { name, currentPassword, newPassword } = request.body || {};

  // Display Name Update
  if (name !== undefined) {
    if (typeof name !== 'string' || !name.trim() || name.trim().length > 80 || /[\p{Cc}]/u.test(name)) {
      throw new RequestError(400, 'Enter a name between 1 and 80 characters.');
    }
    account.name = name.trim();
  }

  // Password Update
  if (newPassword !== undefined) {
    if (store.isGoogleAccount(account.id)) {
      throw new RequestError(400, 'Manage your Google password through your Google account.');
    }
    if (account.isEnvAccount) {
      throw new RequestError(400, 'Password for environment-seeded accounts is managed via .env configuration.');
    }
    if (!validPassword(newPassword)) {
      throw new RequestError(400, 'Use a new password between 8 and 128 characters.');
    }
    if (!validPassword(currentPassword)) {
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

  const updated = store.updateProfile(account, originalHash);
  if (!updated) throw new RequestError(409, 'Your account changed. Sign in again to continue.');
  response.json({ user: publicUser(updated) });
});

router.get('/sessions', requireUser, (request, response) => {
  const currentId = store.getSession(getSessionToken(request))?.id;
  const sessions = store.listSessions(response.locals.user.id, Date.now());
  response.json({ sessions: sessions.map(session => ({ ...session, current: session.id === currentId })) });
});

router.delete('/sessions/:id', requireUser, (request, response) => {
  const user = response.locals.user;
  const { id } = request.params;
  const currentId = store.getSession(getSessionToken(request))?.id;
  store.transaction(() => {
    if (!store.revokeSession(user.id, id, Date.now())) throw new RequestError(404, 'Active session not found.');
  });
  if (currentId === id) response.clearCookie(sessionCookie, cookieOptions(request));
  response.json({ id });
});

router.get('/session', (request, response) => {
  response.json({ user: currentUser(request) });
});

router.post('/google/start', readCredentials, beginGoogleSignIn);
router.get('/google/callback', handleGoogleCallback);
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
  return store.listAccounts().map(publicUser);
}

function getModerationTarget(id) {
  const account = store.readAccountById(id);
  if (!account) throw new RequestError(404, 'User account not found.');
  requireEditableAccount(account);
  if (account.role !== 'user') throw new RequestError(403, 'Only standard user accounts can be moderated.');
  return account;
}

const moderationEvents = {
  active: 'USER_REACTIVATED',
  suspended: 'USER_SUSPENDED',
  banned: 'USER_BANNED',
};

function updateUserStatus(userId, status, actorId) {
  return store.transaction(() => {
    const account = getModerationTarget(userId);
    if (typeof status !== 'string' || !Object.hasOwn(moderationEvents, status)) {
      throw new RequestError(400, 'Status must be active, suspended, or banned.');
    }
    if (account.status === status) return publicUser(account);
    store.setStatus(userId, status);
    recordAuditLog({
      action: moderationEvents[status], adminId: actorId, targetId: userId,
      details: `Account ${account.username} marked ${status}`,
    });
    return publicUser(store.readAccountById(userId));
  });
}

function deleteUser(userId, actorId) {
  return store.transaction(() => {
    const account = getModerationTarget(userId);
    store.deleteAccount(userId);
    recordAuditLog({
      action: 'USER_DELETED', adminId: actorId, targetId: userId,
      details: `Account ${account.username} permanently deleted`,
    });
    return { success: true, id: userId };
  });
}

module.exports = {
  authRouter: router,
  initializeEnvUsers,
  requireUser,
  listUsers,
  updateUserStatus,
  deleteUser,
  recordAuditLog,
  getAuditLogs,
};
