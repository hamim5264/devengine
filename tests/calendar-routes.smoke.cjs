const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const http = require('node:http');
const { spawn } = require('node:child_process');
const { once } = require('node:events');

function send(url, init = {}) {
  return new Promise((resolve, reject) => {
    // node:http preserves an explicit Host header while connecting to our random test port.
    const req = http.request(url, { method: init.method || 'GET', headers: init.headers, timeout: 15000 }, res => {
      let body = '';
      res.setEncoding('utf8'); res.on('data', chunk => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, headers: { get: name => res.headers[name.toLowerCase()] }, json: async () => JSON.parse(body) }));
    });
    req.on('error', reject); req.on('timeout', () => req.destroy(new Error('Local route timed out.')));
    req.end(init.body);
  });
}

test('real Next.js API routes compile and reject unsafe requests in an isolated, credential-free project', { timeout: 90000 }, async t => {
  const root = path.resolve(__dirname, '..');
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'devengine-calendar-route-test-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  // Copy the exact route/server sources. No .env files or application pages are loaded.
  for (const item of ['pages/api/admin/calendar', 'pages/api/admin/tasks', 'lib/server', 'config/deployment.json', 'config/emailjs.js']) {
    await fs.mkdir(path.dirname(path.join(dir, item)), { recursive: true });
    await fs.cp(path.join(root, item), path.join(dir, item), { recursive: true });
  }
  await fs.symlink(path.join(root, 'node_modules'), path.join(dir, 'node_modules'), 'dir');
  await fs.writeFile(path.join(dir, 'package.json'), JSON.stringify({ private: true, dependencies: { next: '15.5.9', react: '19.2.3', 'react-dom': '19.2.3' } }));
  await fs.writeFile(path.join(dir, 'tsconfig.json'), JSON.stringify({ compilerOptions: { allowJs: true, skipLibCheck: true, noEmit: true, esModuleInterop: true, moduleResolution: 'bundler', module: 'esnext', target: 'ES2017' } }));
  const reservation = net.createServer();
  reservation.listen(0, '127.0.0.1'); await once(reservation, 'listening');
  const port = reservation.address().port; await new Promise(resolve => reservation.close(resolve));
  const child = spawn(process.execPath, [path.join(root, 'node_modules/next/dist/bin/next'), 'dev', '--hostname', '127.0.0.1', '--port', String(port)], {
    cwd: dir, stdio: ['ignore', 'pipe', 'pipe'],
    // Explicit synthetic environment: do not inherit credentials, project IDs, or emulator endpoints.
    env: { PATH: process.env.PATH, HOME: dir, NODE_ENV: 'development', NEXT_TELEMETRY_DISABLED: '1',
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'demo-calendar-route-tests',
      FIREBASE_ADMIN_AUTH_MODE: 'service_account', FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON: '{}',
      GOOGLE_CALENDAR_CLIENT_ID: 'offline-test.apps.googleusercontent.com', GOOGLE_CALENDAR_CLIENT_SECRET: 'fake-test-secret',
      GOOGLE_CALENDAR_REDIRECT_URI: 'http://localhost:3000/api/admin/calendar/callback',
      GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString('base64') },
  });
  let diagnostics = '';
  child.stdout.on('data', data => { diagnostics = (diagnostics + data.toString()).slice(-10000); });
  child.stderr.on('data', data => { diagnostics = (diagnostics + data.toString()).slice(-10000); });
  t.after(async () => {
    if (child.exitCode !== null) return;
    child.kill('SIGTERM');
    const timer = setTimeout(() => child.kill('SIGKILL'), 3000);
    await once(child, 'exit'); clearTimeout(timer);
  });
  const base = `http://127.0.0.1:${port}/api/admin/calendar`;
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (child.exitCode !== null) throw new Error(`Isolated Next.js process exited: ${diagnostics}`);
    try { const res = await fetch(`${base}/authorize`, { signal: AbortSignal.timeout(1000) }); if (res.status === 405) { ready = true; break; } }
    catch { /* Wait for this local server only. */ }
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  assert.ok(ready, diagnostics);
  for (const [route, init, expected, code] of [
    ['/authorize', {}, 405, 'method_not_allowed'],
    ['/authorize', { method: 'POST', headers: { Host: 'localhost:3000', Origin: 'https://evil.example', 'Content-Type': 'application/json' }, body: '{}' }, 403, 'invalid_request_origin'],
    ['/authorize', { method: 'POST', headers: { Host: 'localhost:3000', Origin: 'http://localhost:3000', 'Content-Type': 'application/json' }, body: '{}' }, 401, 'admin_sign_in_required'],
    ['/callback', { headers: { Host: 'localhost:3000' } }, 400, 'invalid_oauth_state'],
    ['/callback?state=invalid', { headers: { Host: 'localhost:3000' } }, 400, 'invalid_oauth_state'],
    ['/callback', { method: 'POST' }, 405, 'method_not_allowed'],
    ['/status', {}, 401, 'admin_sign_in_required'],
    ['/status', { method: 'POST' }, 405, 'method_not_allowed'],
  ]) {
    const res = await send(base + route, init);
    assert.equal(res.status, expected, `${route}: ${diagnostics}`);
    assert.equal((await res.json()).error, code);
    assert.match(res.headers.get('cache-control'), /no-store/);
    assert.equal(res.headers.get('referrer-policy'), 'no-referrer');
  }
  for(const route of ['','/settings','/one']) {
    const res=await send(`http://127.0.0.1:${port}/api/admin/tasks${route}`);
    assert.equal(res.status,401);assert.equal((await res.json()).error,'admin_sign_in_required');
  }
  const worker=await send(`http://127.0.0.1:${port}/api/admin/tasks/worker`,{headers:{Authorization:'Bearer invalid'}});
  assert.equal(worker.status,401);assert.equal((await worker.json()).error,'worker_unauthorized');
});
