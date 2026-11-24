const express = require('express');
const { randomBytes, randomUUID, scrypt, timingSafeEqual } = require('node:crypto');
const { promisify } = require('node:util');
const { accountsFile, readLocalJson, writeLocalJson } = require('./local-data');
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
    return new Map(records.map(account => [account.username.toLowerCase(), account]));
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

  writeLocalJson(accountsFile, [...accounts.values(), account]);
  accounts.set(normalized, account);
}

// ── Environment-Driven Admin and Normal User Initialization ───
async function initializeEnvUsers() {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD?.trim();
  if (adminEmail && adminPassword && !accounts.has(adminEmail)) {
    const salt = randomBytes(16);
    const hash = await deriveKey(adminPassword, salt, 64, hashOptions);
    const adminAccount = {
      id: randomUUID(),
      username: adminEmail,
      salt: salt.toString('hex'),
      hash: hash.toString('hex'),
      role: 'admin',
    };
    saveAccount(adminAccount);
    adminIds.add(adminEmail);
  }

  const userEmail = process.env.USER_EMAIL?.trim().toLowerCase();
  const userPassword = process.env.USER_PASSWORD?.trim();
  if (userEmail && userPassword && !accounts.has(userEmail)) {
    const salt = randomBytes(16);
    const hash = await deriveKey(userPassword, salt, 64, hashOptions);
    const userAccount = {
      id: randomUUID(),
      username: userEmail,
      salt: salt.toString('hex'),
      hash: hash.toString('hex'),
      role: 'user',
    };
    saveAccount(userAccount);
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

function publicUser({ id, username, role }) {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const isAdmin =
    role === 'admin' ||
    (adminEmail && username.toLowerCase() === adminEmail) ||
    adminIds.has(id.toLowerCase()) ||
    adminIds.has(username.toLowerCase());

  return {
    id,
    username,
    email: username,
    role: isAdmin ? 'admin' : 'user',
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
  return session.user;
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
  const user = currentUser(request);
  if (!user) return response.status(401).json({ error: 'Sign in to continue.' });
  response.locals.user = user;
  next();
}

async function handleRegister(request, response) {
  const { username, password } = getCredentials(request);
  if (accounts.has(username)) throw new RequestError(409, 'That username is already taken.');

  const salt = randomBytes(16);
  const hash = await deriveKey(password, salt, 64, hashOptions);
  const account = { id: randomUUID(), username, salt: salt.toString('hex'), hash: hash.toString('hex') };
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
  startSession(request, response, account, 200);
}

function handleSignOut(request, response) {
  sessions.delete(getSessionToken(request));
  response.clearCookie(sessionCookie, cookieOptions(request));
  response.json({ user: null });
}

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

module.exports = { authRouter: router, requireUser };
