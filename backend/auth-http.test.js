const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { randomBytes } = require('node:crypto');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { test } = require('node:test');

function samplePdf() {
  const pageText = 'BT /F1 24 Tf 50 160 Td (PROPERTY DEED) Tj ET';
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 400 300] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${pageText.length} >>\nstream\n${pageText}\nendstream`,
  ];
  let contents = '%PDF-1.4\n';
  const offsets = objects.map((object, index) => {
    const offset = contents.length;
    contents += `${index + 1} 0 obj\n${object}\nendobj\n`;
    return String(offset).padStart(10, '0') + ' 00000 n \n';
  });
  const xref = contents.length;
  contents += `xref\n0 6\n0000000000 65535 f \n${offsets.join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(contents);
}

test('password and Google auth, sessions, admin moderation and usage', async t => {
  const directory = mkdtempSync(join(tmpdir(), 'nothi-auth-'));
  const password = randomBytes(24).toString('hex');
  const server = require.resolve('./index');
  let child;
  let origin;

  async function stop() {
    if (!child || child.exitCode !== null || child.signalCode !== null) return;
    await new Promise(resolve => {
      child.once('exit', resolve);
      child.kill();
    });
  }

  t.after(async () => {
    await stop();
    rmSync(directory, { force: true, recursive: true });
  });

  async function start(bootstrap) {
    child = spawn(process.execPath, ['-e', `
      const http = require('node:http');
      const listen = http.Server.prototype.listen;
      http.Server.prototype.listen = function (_port, host, callback) {
        this.once('listening', () => console.log('TEST_PORT=' + this.address().port));
        return listen.call(this, 0, host, callback);
      };
      globalThis.fetch = async (url, options) => {
        if (url === 'https://oauth2.googleapis.com/token') {
          const verifier = options.body.get('code_verifier');
          if (!/^[A-Za-z0-9_-]{43}$/.test(verifier) ||
              options.body.get('client_secret') !== 'test-google-secret') return new Response(null, { status: 400 });
          return Response.json({ access_token: options.body.get('code') });
        }
        if (url === 'https://openidconnect.googleapis.com/v1/userinfo') {
          const code = options.headers.Authorization.slice('Bearer '.length);
          return Response.json({
            sub: code === 'collision' ? 'different-subject' : 'google-subject',
            email: code === 'collision' ? 'tester@example.com' : 'google@example.com',
            email_verified: code !== 'unverified',
            name: 'Google Tester',
          });
        }
        if (url === 'https://openrouter.ai/api/v1/chat/completions') {
          return Response.json({
            choices: [{ message: { content: 'The file is a deed. [Page 1]' } }],
            usage: { prompt_tokens: 12, completion_tokens: 8, total_tokens: 20 },
          });
        }
        throw new Error('Unexpected outbound request in auth test');
      };
      require(${JSON.stringify(server)});
    `], {
      env: {
        ...process.env, HOST: '127.0.0.1', NODE_ENV: 'test',
        NOTHI_ACCOUNTS_FILE: join(directory, 'accounts.json'), USER_EMAIL: '', USER_PASSWORD: '',
        REDIS_URL: '', OPENROUTER_API_KEY: 'test-openrouter-key',
        GOOGLE_OAUTH_CLIENT_ID: 'test-google-client',
        GOOGLE_OAUTH_CLIENT_SECRET: 'test-google-secret',
        GOOGLE_OAUTH_REDIRECT_URI: 'http://localhost:3000/api/auth/google/callback',
        SUPER_ADMIN_USERNAME: bootstrap ? 'rootadmin' : '', SUPER_ADMIN_PASSWORD: bootstrap ? password : '',
      },
      stdio: ['ignore', 'pipe', 'inherit'],
    });
    origin = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Backend startup timed out')), 10000);
      child.once('exit', code => {
        clearTimeout(timer);
        reject(new Error('Backend exited with code ' + code));
      });
      let output = '';
      child.stdout.on('data', chunk => {
        output += chunk;
        const port = /TEST_PORT=(\d+)/.exec(output)?.[1];
        if (port) {
          clearTimeout(timer);
          resolve('http://127.0.0.1:' + port);
        }
      });
    });
  }

  async function request(route, expected, { method = 'GET', body, cookie, browserOrigin, upload } = {}) {
    const headers = {};
    if (body) headers['Content-Type'] = 'application/json';
    if (cookie) headers.Cookie = cookie;
    if (browserOrigin) headers.Origin = browserOrigin;
    if (upload) {
      headers['Content-Type'] = upload.mimeType;
      headers['X-File-Name'] = encodeURIComponent(upload.name);
    }
    const response = await fetch(origin + '/api/' + route, {
      method, headers, redirect: 'manual', body: upload?.bytes ?? (body && JSON.stringify(body)), signal: AbortSignal.timeout(15000),
    });
    const result = expected === 303 ? { location: response.headers.get('location') } : await response.json();
    assert.equal(response.status, expected, route + ' ' + JSON.stringify(result));
    if (expected >= 400) assert.equal(typeof result.error, 'string');
    return { ...result, cookie: response.headers.getSetCookie().at(-1)?.split(';')[0] };
  }

  await start(true);
  const rootBody = { username: 'rootadmin', password, acknowledgeScope: true };
  const root = await request('auth/login', 200, { method: 'POST', body: rootBody });
  assert.equal(root.user.isSuperAdmin, true);
  await request('auth/settings', 403, { method: 'PATCH', body: { name: 'Edited' }, cookie: root.cookie });
  const adminRoute = 'admin/users/' + root.user.id;
  await request(adminRoute + '/status', 403, { method: 'PATCH', body: { status: 'suspended' }, cookie: root.cookie });
  await request(adminRoute + '/status', 403, { method: 'PATCH', body: { status: 'banned' }, cookie: root.cookie });
  await request(adminRoute, 403, { method: 'DELETE', cookie: root.cookie });

  const registration = { email: 'tester@example.com', password, name: 'Tester', acknowledgeScope: true };
  for (const invalid of [{ acknowledgeScope: false }, { acknowledgeScope: 'true' }, { email: 'broken@x' }, { name: ' ' }]) {
    await request('auth/register', 400, { method: 'POST', body: { ...registration, ...invalid } });
  }
  const a = await request('auth/register', 201, { method: 'POST', body: registration });
  const registered = await request('admin/users', 200, { cookie: root.cookie });
  assert.equal(Object.values(registered).filter(user => user?.id).length, 2);
  await request('auth/login', 400, { method: 'POST', body: { ...registration, acknowledgeScope: false } });
  const b = await request('auth/login', 200, { method: 'POST', body: registration });
  const { sessions } = await request('auth/sessions', 200, { cookie: b.cookie });
  assert.equal(sessions.length, 2);
  const route = 'auth/sessions/' + sessions.find(session => !session.current).id;
  await request(route, 404, { method: 'DELETE', cookie: root.cookie });
  await request(route, 200, { method: 'DELETE', cookie: b.cookie });
  await request('auth/settings', 401, { cookie: a.cookie });
  const edited = await request('auth/settings', 200, { method: 'PATCH', cookie: b.cookie, body: { name: 'New Name' } });
  assert.equal(edited.user.name, 'New Name');

  const googlePost = { method: 'POST', browserOrigin: 'http://localhost:3000', body: { acknowledgeScope: true } };
  await request('auth/google/start', 400, { ...googlePost, body: { acknowledgeScope: false } });
  await request('auth/google/start', 403, { ...googlePost, browserOrigin: 'http://localhost:3000.invalid' });

  async function attempt(code) {
    const start = await request('auth/google/start', 200, googlePost);
    const url = new URL(start.url);
    assert.equal(url.origin, 'https://accounts.google.com');
    assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
    const route = 'auth/google/callback?' + new URLSearchParams({ state: url.searchParams.get('state'), code });
    return { route, cookie: start.cookie };
  }

  const first = await attempt('success');
  await request(first.route, 400);
  const google = await request(first.route, 303, first);
  assert.equal(google.location, 'http://localhost:3000/dashboard');
  await request(first.route, 400, first);
  const googleUser = (await request('auth/settings', 200, { cookie: google.cookie })).user;
  assert.equal(googleUser.username, 'google@example.com');
  assert.equal(googleUser.role, 'user');
  const repeat = await attempt('success');
  const repeatLogin = await request(repeat.route, 303, repeat);
  assert.equal((await request('auth/settings', 200, { cookie: repeatLogin.cookie })).user.id, googleUser.id);
  const collision = await attempt('collision');
  await request(collision.route, 409, collision);
  const unverified = await attempt('unverified');
  await request(unverified.route, 403, unverified);
  const userRoute = 'admin/users/' + googleUser.id;
  const userStatus = userRoute + '/status';

  await request('admin/users?status=active', 403, { cookie: b.cookie });
  const limits = await request('admin/settings', 200, { cookie: root.cookie });
  const settings = {
    questionsPerMinute: limits.questionsPerMinute, questionsPerDay: limits.questionsPerDay + 1,
    maxOutputTokens: limits.maxOutputTokens, dailyTokenBudget: limits.dailyTokenBudget,
  };
  await request('admin/settings', 400, { method: 'PUT', body: { ...settings, maxOutputTokens: 0 }, cookie: root.cookie });
  await request('admin/settings', 200, { method: 'PUT', body: settings, cookie: root.cookie });
  const chat = await request('chats', 201, { method: 'POST', body: { title: 'Moderation test' }, cookie: google.cookie });
  assert.ok(chat.id);
  const documentAnswer = await request('ask', 200, { method: 'POST', cookie: google.cookie, body: {
    question: 'What type of document is this?',
    pages: [{ pageNumber: 1, text: 'Property deed' }],
  } });
  assert.match(documentAnswer.answer, /deed/i);
  const pdf = { bytes: samplePdf(), mimeType: 'application/pdf', name: 'Property.pdf' };
  const uploadRoute = 'chats/' + chat.id + '/document';
  const pdfChat = await request(uploadRoute, 200, { method: 'POST', cookie: google.cookie, upload: pdf });
  assert.match(pdfChat.attachments.pdf.pages[0].text, /PROPERTY DEED/);
  await request('extract', 200, { method: 'POST', cookie: google.cookie, upload: pdf });
  await request('audit/upload', 200, { method: 'POST', cookie: google.cookie, upload: pdf });
  await request('audit/upload', 422, { method: 'POST', cookie: google.cookie, upload: {
    ...pdf, bytes: Buffer.from('spoofed PDF'),
  } });

  const sharp = require('sharp');
  const blank = sharp({ create: { width: 32, height: 32, channels: 3, background: '#ffffff' } });
  for (const [ext, format] of [['jpg', 'jpeg'], ['png', 'png'], ['webp', 'webp']]) {
    const upload = { bytes: await blank.clone().toFormat(format).toBuffer(), mimeType: 'image/' + format, name: 'deed.' + ext };
    const result = await request('audit/upload', 200, { method: 'POST', cookie: google.cookie, upload });
    assert.equal(result.mimeType, upload.mimeType);
  }

  const photoBytes = await sharp(Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="500" height="150"><rect width="500" height="150" fill="white"/><text x="20" y="95" font-size="44" fill="black">PROPERTY DEED</text></svg>'
  )).webp().toBuffer();
  const photo = { bytes: photoBytes, mimeType: 'image/webp', name: 'Photo.webp' };
  const photoChat = await request(uploadRoute, 200, { method: 'POST', cookie: google.cookie, upload: photo });
  assert.match(photoChat.attachments.photo.pages[0].text, /PROPERTY/i);
  assert.ok(photoChat.attachments.pdf);
  await request('ocr', 200, { method: 'POST', cookie: google.cookie, upload: photo });

  for (const [name, mimeType] of [
    ['document.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    ['document.txt', 'text/plain'],
  ]) {
    const upload = { bytes: Buffer.from('not an allowed file'), name, mimeType };
    await request(uploadRoute, 415, { method: 'POST', cookie: google.cookie, upload });
    await request('audit/upload', 415, { method: 'POST', cookie: google.cookie, upload });
  }
  await request(uploadRoute, 422, { method: 'POST', cookie: google.cookie, upload: { ...photo, bytes: pdf.bytes } });
  await request(uploadRoute, 415, { method: 'POST', cookie: google.cookie, upload: { ...photo, name: 'fake.pdf' } });
  await request('chats/' + chat.id, 415, { method: 'PUT', cookie: google.cookie,
    body: { attachments: { pdf: { name: 'unvalidated.pdf', pages: [] } } },
  });
  const stored = await request('chats/' + chat.id, 200, { cookie: google.cookie });
  assert.equal(stored.attachments.pdf.name, pdf.name);
  assert.equal(stored.attachments.photo.name, photo.name);

  const offTopic = 'who is fahim';
  const asAsk = await request('ask', 200, { method: 'POST', cookie: google.cookie, body: { question: offTopic } });
  assert.equal(asAsk.answer, '');
  assert.deepEqual(asAsk.citations, []);
  const statutory = await request('chat', 200, { method: 'POST', cookie: google.cookie,
    body: { messages: [{ role: 'user', content: offTopic }] },
  });
  assert.equal(statutory.content, '');
  assert.deepEqual(statutory.citations, []);
  for (const mode of ['legal', 'document']) {
    const guarded = await request('chats/' + chat.id + '/messages', 200, {
      method: 'POST', cookie: google.cookie, body: { mode, question: offTopic },
    });
    assert.equal(guarded.outOfScope, true);
    assert.equal(guarded.content, '');
    assert.deepEqual(guarded.citations, []);
    assert.deepEqual(guarded.messages, []);
  }
  const inScope = await request('chat', 200, { method: 'POST', cookie: google.cookie,
    body: { messages: [{ role: 'user', content: 'Which documents are needed for a Saf Kabala deed?' }] },
  });
  assert.ok(inScope.content);
  const initialUsage = await request(userRoute + '/usage', 200, { cookie: root.cookie });
  assert.equal(initialUsage.tokensUsed, 20);
  assert.equal(initialUsage.recordedTokensToday, 20);
  assert.equal(initialUsage.recordedTokensTotal, 20);
  const active = await request('admin/users?status=active', 200, { cookie: root.cookie });
  assert.equal(Object.values(active).find(user => user?.id === googleUser.id)?.recordedTokensToday, 20);

  await request(userStatus, 200, { method: 'PATCH', body: { status: 'suspended' }, cookie: root.cookie });
  await request('auth/settings', 401, { cookie: google.cookie });
  const suspended = await attempt('success');
  await request(suspended.route, 403, suspended);

  await request(userStatus, 200, { method: 'PATCH', body: { status: 'active' }, cookie: root.cookie });
  await request('auth/settings', 401, { cookie: repeatLogin.cookie });
  const afterReactivation = await attempt('success');
  const newGoogleSession = await request(afterReactivation.route, 303, afterReactivation);
  const banned = await request(userStatus, 200, { method: 'PATCH', body: { status: 'banned' }, cookie: root.cookie });
  assert.equal(banned.status, 'banned');
  await request('auth/settings', 401, { cookie: newGoogleSession.cookie });
  const bannedAttempt = await attempt('success');
  await request(bannedAttempt.route, 403, bannedAttempt);

  await request(userStatus, 200, { method: 'PATCH', body: { status: 'active' }, cookie: root.cookie });
  const beforeDeletion = await attempt('success');
  const lastGoogleSession = await request(beforeDeletion.route, 303, beforeDeletion);
  await request(userRoute, 200, { method: 'DELETE', cookie: root.cookie });
  await request('auth/settings', 401, { cookie: lastGoogleSession.cookie });
  await request(userRoute + '/usage', 404, { cookie: root.cookie });
  const { DatabaseSync } = require('node:sqlite');
  const chatDb = new DatabaseSync(join(directory, 'chats.sqlite'), { readOnly: true });
  try {
    assert.equal(chatDb.prepare('SELECT id FROM chats WHERE id = ?').get(chat.id), undefined);
  } finally {
    chatDb.close();
  }

  const authDb = new DatabaseSync(join(directory, 'auth.sqlite'), { readOnly: true });
  try {
    for (const table of ['sessions', 'google_identities', 'token_usage']) {
      assert.equal(authDb.prepare(`SELECT account_id FROM ${table} WHERE account_id = ?`).get(googleUser.id), undefined);
    }
  } finally {
    authDb.close();
  }
  const events = await request('admin/audit-logs', 200, { cookie: root.cookie });
  const actions = Object.values(events).filter(event => event?.targetId === googleUser.id).map(event => event.action);
  for (const action of ['USER_REGISTERED', 'GOOGLE_LOGIN', 'SESSION_CREATED', 'SESSION_REVOKED',
    'TOKEN_USAGE_REPORTED', 'USER_SUSPENDED', 'USER_BANNED', 'USER_DELETED', 'UPLOAD_REJECTED']) {
    assert.ok(actions.includes(action), action);
  }
  for (const event of Object.values(events).filter(event => event?.targetId === googleUser.id)) {
    assert.ok(Number.isSafeInteger(event.timestamp) && event.timestamp > 0);
  }

  await stop();
  await start(false);
  assert.equal((await request('admin/settings', 200, { cookie: root.cookie })).questionsPerDay, settings.questionsPerDay);
  const restarted = await request('auth/settings', 200, { cookie: root.cookie });
  assert.equal(restarted.user.id, root.user.id);
  await request('auth/login', 200, { method: 'POST', body: rootBody });
  await request('auth/logout', 200, { method: 'POST', cookie: b.cookie });
  await request('auth/settings', 401, { cookie: b.cookie });
});
