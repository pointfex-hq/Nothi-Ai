const assert = require('node:assert/strict');
const { once } = require('node:events');
const { spawn } = require('node:child_process');
const { mkdtempSync, readFileSync, rmSync } = require('node:fs');
const net = require('node:net');
const path = require('node:path');
const { tmpdir } = require('node:os');
const test = require('node:test');
const { randomUUID } = require('node:crypto');

const adminEmail = 'root@example.test';
const adminPassword = 'admin-password-for-test';
const userEmail = 'person@example.test';
const userPassword = 'user-password-for-test';

async function freePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => server.once('error', reject).listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  return port;
}

async function request(baseUrl, route, { method = 'GET', cookie, body } = {}) {
  const headers = { Accept: 'application/json' };
  if (cookie) headers.Cookie = cookie;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const response = await fetch(baseUrl + route, {
    method,
    headers,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = await response.json();
  const setCookie = response.headers.getSetCookie?.()[0] ?? response.headers.get('set-cookie');
  return {
    status: response.status,
    data,
    cookie: setCookie?.split(';', 1)[0],
  };
}

test('in-memory daily usage reports each user token reservation', async () => {
  const previousRedisUrl = process.env.REDIS_URL;
  delete process.env.REDIS_URL;
  try {
    const { getUserUsage, reserveAsk } = require('../ask-quota');
    const userId = randomUUID();
    const reservation = await reserveAsk(userId, [{ role: 'user', content: 'daily usage check' }]);
    await reservation.reconcileUsage({ total_tokens: 47, prompt_tokens: 40, completion_tokens: 7 });
    const usage = await getUserUsage(userId);
    assert.equal(usage.questionsUsed, 1);
    assert.equal(usage.tokensUsed, 47);
  } finally {
    if (previousRedisUrl === undefined) delete process.env.REDIS_URL;
    else process.env.REDIS_URL = previousRedisUrl;
  }
});

test('admin lifecycle, entry logs, and placeholder RAG rejection', async t => {
  const dataDirectory = mkdtempSync(path.join(tmpdir(), 'nothi-admin-'));
  const port = await freePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const backend = spawn(process.execPath, ['index.js'], {
    cwd: __dirname + '/..',
    env: {
      ...process.env,
      NODE_ENV: 'test',
      HOST: '127.0.0.1',
      PORT: String(port),
      ADMIN_EMAIL: adminEmail,
      ADMIN_PASSWORD: adminPassword,
      USER_EMAIL: '',
      USER_PASSWORD: '',
      REDIS_URL: '',
      NOTHI_ACCOUNTS_FILE: path.join(dataDirectory, 'accounts.json'),
    },
    stdio: 'ignore',
  });

  t.after(async () => {
    if (backend.exitCode === null) {
      const exited = once(backend, 'exit');
      backend.kill('SIGTERM');
      await exited.catch(() => {});
    }
    rmSync(dataDirectory, { recursive: true, force: true });
  });

  let healthy = false;
  for (let attempt = 0; attempt < 80; attempt++) {
    if (backend.exitCode !== null) throw new Error('Backend exited before becoming healthy.');
    try {
      const response = await fetch(baseUrl + '/api/health');
      healthy = response.ok;
      if (healthy) break;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.equal(healthy, true, 'backend should become healthy');

  const adminLogin = await request(baseUrl, '/api/auth/sign-in', {
    method: 'POST', body: { username: adminEmail, password: adminPassword },
  });
  assert.equal(adminLogin.status, 200);
  assert.equal(adminLogin.data.user.isSuperAdmin, true);

  const registration = await request(baseUrl, '/api/auth/register', {
    method: 'POST', body: { username: userEmail, password: userPassword },
  });
  assert.equal(registration.status, 201);
  const userId = registration.data.user.id;

  const users = await request(baseUrl, '/api/admin/users', { cookie: adminLogin.cookie });
  assert.equal(users.status, 200);
  assert.equal(users.data.find(account => account.id === userId).usage.tokensUsed, 0);
  assert.equal(users.data.find(account => account.id === adminLogin.data.user.id).isSuperAdmin, true);

  const entries = await request(baseUrl, '/api/admin/entry-logs', { cookie: adminLogin.cookie });
  assert.deepEqual(entries.data.entries.filter(entry => entry.username === userEmail).map(entry => entry.event), ['REGISTERED']);
  assert.ok(Number.isInteger(entries.data.entries.find(entry => entry.username === userEmail).timestamp));
  assert.ok(entries.data.entries.some(entry => entry.username === adminEmail && entry.event === 'LOGIN'));
  const firstEntryPage = await request(baseUrl, '/api/admin/entry-logs?limit=1&offset=0', { cookie: adminLogin.cookie });
  assert.equal(firstEntryPage.data.entries.length, 1);
  assert.ok(firstEntryPage.data.total >= 2);

  const currentLimits = await request(baseUrl, '/api/admin/usage-limits', { cookie: adminLogin.cookie });
  const savedLimits = await request(baseUrl, '/api/admin/usage-limits', {
    method: 'PUT', cookie: adminLogin.cookie, body: { ...currentLimits.data, questionsPerMinute: 7 },
  });
  assert.equal(savedLimits.data.questionsPerMinute, 7);

  const protectedAdmin = await request(baseUrl, `/api/admin/users/${adminLogin.data.user.id}/status`, {
    method: 'PATCH', cookie: adminLogin.cookie, body: { status: 'banned' },
  });
  assert.equal(protectedAdmin.status, 400);
  const protectedDelete = await request(baseUrl, `/api/admin/users/${adminLogin.data.user.id}`, {
    method: 'DELETE', cookie: adminLogin.cookie,
  });
  assert.equal(protectedDelete.status, 400);

  const suspended = await request(baseUrl, `/api/admin/users/${userId}/status`, {
    method: 'PATCH', cookie: adminLogin.cookie, body: { status: 'suspended' },
  });
  assert.equal(suspended.data.status, 'suspended');
  assert.equal(JSON.parse(readFileSync(path.join(dataDirectory, 'accounts.json'), 'utf8')).find(account => account.id === userId).status, 'suspended');
  assert.equal((await request(baseUrl, '/api/chats', { cookie: registration.cookie })).status, 401);

  await request(baseUrl, `/api/admin/users/${userId}/status`, {
    method: 'PATCH', cookie: adminLogin.cookie, body: { status: 'active' },
  });
  const userLogin = await request(baseUrl, '/api/auth/sign-in', {
    method: 'POST', body: { username: userEmail, password: userPassword },
  });
  assert.equal(userLogin.status, 200);
  const loginEntries = await request(baseUrl, '/api/admin/entry-logs', { cookie: adminLogin.cookie });
  assert.ok(loginEntries.data.entries.some(entry => entry.username === userEmail && entry.event === 'LOGIN'));

  const banned = await request(baseUrl, `/api/admin/users/${userId}/status`, {
    method: 'PATCH', cookie: adminLogin.cookie, body: { status: 'banned' },
  });
  assert.equal(banned.data.status, 'banned');
  assert.equal(JSON.parse(readFileSync(path.join(dataDirectory, 'accounts.json'), 'utf8')).find(account => account.id === userId).status, 'banned');
  assert.equal((await request(baseUrl, '/api/chats', { cookie: userLogin.cookie })).status, 401);
  assert.equal((await request(baseUrl, '/api/auth/sign-in', {
    method: 'POST', body: { username: userEmail, password: userPassword },
  })).status, 403);

  const unbanned = await request(baseUrl, `/api/admin/users/${userId}/status`, {
    method: 'PATCH', cookie: adminLogin.cookie, body: { status: 'active' },
  });
  assert.equal(unbanned.data.status, 'active');

  const placeholderSeed = await request(baseUrl, '/api/admin/rag/seed', {
    method: 'POST', cookie: adminLogin.cookie, body: { corpus: [{ passage: 'PLACEHOLDER: sample' }] },
  });
  assert.equal(placeholderSeed.status, 400);

  assert.equal((await request(baseUrl, `/api/admin/users/${userId}`, {
    method: 'DELETE', cookie: adminLogin.cookie,
  })).status, 200);
  assert.equal(JSON.parse(readFileSync(path.join(dataDirectory, 'accounts.json'), 'utf8')).some(account => account.id === userId), false);
  const afterDelete = await request(baseUrl, '/api/admin/users', { cookie: adminLogin.cookie });
  assert.equal(afterDelete.data.some(account => account.id === userId), false);
});
