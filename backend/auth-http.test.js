const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { randomBytes } = require('node:crypto');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { test } = require('node:test');

test('auth validation, Super Admin protection and persistent sessions', async t => {
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
      require(${JSON.stringify(server)});
    `], {
      env: {
        ...process.env, HOST: '127.0.0.1', NODE_ENV: 'test',
        NOTHI_ACCOUNTS_FILE: join(directory, 'accounts.json'), USER_EMAIL: '', USER_PASSWORD: '',
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

  async function request(route, expected, { method = 'GET', body, cookie } = {}) {
    const headers = {};
    if (body) headers['Content-Type'] = 'application/json';
    if (cookie) headers.Cookie = cookie;
    const response = await fetch(origin + '/api/' + route, {
      method, headers, body: body && JSON.stringify(body), signal: AbortSignal.timeout(5000),
    });
    const result = await response.json();
    assert.equal(response.status, expected, route + ' ' + JSON.stringify(result));
    if (expected >= 400) assert.equal(typeof result.error, 'string');
    return { ...result, cookie: response.headers.get('set-cookie')?.split(';')[0] };
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

  await stop();
  await start(false);
  const restarted = await request('auth/settings', 200, { cookie: root.cookie });
  assert.equal(restarted.user.id, root.user.id);
  await request('auth/login', 200, { method: 'POST', body: rootBody });
  await request('auth/logout', 200, { method: 'POST', cookie: b.cookie });
  await request('auth/settings', 401, { cookie: b.cookie });
});
