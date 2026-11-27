const { createHash, randomBytes, timingSafeEqual } = require('node:crypto');
const store = require('./auth-store');
const RequestError = require('./request-error');

const callbackPath = '/api/auth/google/callback';
const attemptCookie = 'nothi_google_state';
const attemptLifetime = 10 * 60 * 1000;
const statePattern = /^[A-Za-z0-9_-]{43}$/;

function configuration() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim();
  const uri = process.env.GOOGLE_OAUTH_REDIRECT_URI?.trim();
  const url = uri && URL.parse(uri);
  const local = url && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (!clientId || !clientSecret || !url || url.pathname !== callbackPath ||
    url.search || url.hash || url.username || url.password ||
    (url.protocol !== 'https:' && !(local && url.protocol === 'http:'))) {
    throw new RequestError(503, 'Google sign-in is unavailable.');
  }
  return { clientId, clientSecret, redirectUri: url.href, origin: url.origin, secure: url.protocol === 'https:' };
}

function cookieOptions(config) {
  return { httpOnly: true, secure: config.secure, sameSite: 'lax', path: callbackPath };
}

function beginGoogleSignIn(request, response) {
  const config = configuration();
  if (request.get('Origin') !== config.origin) throw new RequestError(403, 'Open Nothi AI directly to sign in.');
  if (request.body?.acknowledgeScope !== true) throw new RequestError(400, 'Confirm that you understand the scope of Nothi AI.');

  const state = randomBytes(32).toString('base64url');
  const verifier = randomBytes(32).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  store.saveGoogleAttempt(state, verifier, Date.now(), attemptLifetime);
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.search = new URLSearchParams({
    client_id: config.clientId, redirect_uri: config.redirectUri, response_type: 'code',
    scope: 'openid email profile', state, code_challenge: challenge, code_challenge_method: 'S256',
    prompt: 'select_account',
  }).toString();
  response.cookie(attemptCookie, state, { ...cookieOptions(config), maxAge: attemptLifetime });
  response.json({ url: url.href });
}

async function googleRequest(url, options) {
  try {
    const result = await fetch(url, { ...options, redirect: 'error', signal: AbortSignal.timeout(8000) });
    if (result.ok) return await result.json();
  } catch {
    // Return a stable application error without exposing provider response data.
  }
  throw new RequestError(502, 'Google sign-in could not be verified. Try again.');
}

async function completeGoogleSignIn(request, response) {
  const config = configuration();
  response.set('Referrer-Policy', 'no-referrer');
  const { state, code, error, iss } = request.query;
  const cookie = /(?:^|;\s*)nothi_google_state=([A-Za-z0-9_-]{43})(?=;|$)/.exec(request.get('Cookie') ?? '')?.[1];
  if (typeof state !== 'string' || !statePattern.test(state) || !cookie ||
    !timingSafeEqual(Buffer.from(state), Buffer.from(cookie))) {
    throw new RequestError(400, 'Invalid Google sign-in session. Start again.');
  }
  response.clearCookie(attemptCookie, cookieOptions(config));
  const verifier = store.consumeGoogleAttempt(state, Date.now());
  if (!verifier || (iss !== undefined && iss !== 'https://accounts.google.com')) {
    throw new RequestError(400, 'Invalid or expired Google sign-in session. Start again.');
  }
  if (error === 'access_denied') throw new RequestError(400, 'Google sign-in was cancelled.');
  if (error || typeof code !== 'string' || !code || code.length > 2048) {
    throw new RequestError(400, 'Invalid Google authorization response. Start again.');
  }

  const tokens = await googleRequest('https://oauth2.googleapis.com/token', {
    method: 'POST',
    body: new URLSearchParams({
      code, code_verifier: verifier, client_id: config.clientId, client_secret: config.clientSecret,
      redirect_uri: config.redirectUri, grant_type: 'authorization_code',
    }),
  });
  if (typeof tokens?.access_token !== 'string' || !tokens.access_token) {
    throw new RequestError(502, 'Google sign-in could not be verified. Try again.');
  }

  const profile = await googleRequest('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { Authorization: 'Bearer ' + tokens.access_token },
  });
  if (profile?.email_verified !== true || typeof profile.email !== 'string' ||
    typeof profile.sub !== 'string' || !/^[\x21-\x7e]{1,255}$/.test(profile.sub)) {
    throw new RequestError(403, 'Sign in with a Google account that has a verified email address.');
  }

  return { profile, origin: config.origin };
}

module.exports = { beginGoogleSignIn, completeGoogleSignIn };
