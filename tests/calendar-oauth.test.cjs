const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Timestamp } = require('firebase-admin/firestore');
const { readConfig, CALLBACK_PATH, SCOPES } = require('../lib/server/calendar/config');
const { ADMIN_EMAIL } = require('../lib/server/admin');
const { createCalendarHandlers } = require('../lib/server/calendar/handlers');
const { createGoogle } = require('../lib/server/calendar/google');
const { createStore, STATES, CONNECTIONS, LIMITS } = require('../lib/server/calendar/store');
const { STATE_TTL_MS, digest, cookie, cookieName, seal, unseal, contextFor, requireAdmin, revalidateAdmin } = require('../lib/server/calendar/security');

// Deliberately fake fixtures. No .env files, SDK credentials, Google requests, or real Firestore.
const NOW = 1800000000000;
const AUTH_TIME = NOW / 1000 - 30;
const UID = 'calendar-test-admin';
const TOKEN = 'fake-firebase-id-token-for-offline-tests';
const environment = extra => ({ NODE_ENV: 'test', NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'demo-calendar-tests',
  GOOGLE_CALENDAR_CLIENT_ID: 'offline-test.apps.googleusercontent.com', GOOGLE_CALENDAR_CLIENT_SECRET: 'fake-client-secret',
  GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString('base64'),
  GOOGLE_CALENDAR_REDIRECT_URI: `http://localhost:3000${CALLBACK_PATH}`, ...extra });

class MemoryDB {
  constructor() { this.values = new Map(); this.queue = Promise.resolve(); }
  collection(name) { return { doc: id => this.ref(`${name}/${id}`) }; }
  ref(path) { return { path, get: async () => this.snapshot(path), set: async value => this.values.set(path, value) }; }
  snapshot(path) { return { exists: this.values.has(path), data: () => this.values.get(path) }; }
  runTransaction(callback) {
    const result = this.queue.then(async () => {
      const changes = [];
      const tx = { get: async ref => this.snapshot(ref.path),
        set: (ref, value) => changes.push(() => this.values.set(ref.path, value)),
        create: (ref, value) => { assert.ok(!this.values.has(ref.path)); changes.push(() => this.values.set(ref.path, value)); },
        update: (ref, value) => changes.push(() => this.values.set(ref.path, { ...this.values.get(ref.path), ...value })) };
      const answer = await callback(tx);
      changes.forEach(change => change());
      return answer;
    });
    this.queue = result.catch(() => {});
    return result;
  }
}

function response() {
  return { statusCode: 200, headers: {}, body: undefined,
    setHeader(name, value) { this.headers[name.toLowerCase()] = value; return this; },
    status(value) { this.statusCode = value; return this; },
    json(value) { this.body = value; return this; },
    redirect(code, url) { this.statusCode = code; this.headers.location = url; return this; } };
}
function fixture(options = {}) {
  const config = readConfig(environment(options.env));
  const db = new MemoryDB();
  const user = { uid: UID, email: ADMIN_EMAIL, disabled: false, tokensValidAfterTime: new Date(0).toISOString(), ...options.user };
  const calls = { verify: [], exchanges: [] };
  const auth = {
    async verifyIdToken(token, revoked) { calls.verify.push({ token, revoked }); if (options.authFailure) throw new Error('secret SDK diagnostic'); return { uid: UID, auth_time: AUTH_TIME }; },
    async getUser() { return user; },
  };
  const tokens = { access_token: 'fake-access-token', refresh_token: 'fake-refresh-token', expiry_date: NOW + 3600000, scope: SCOPES.join(' '), token_type: 'Bearer', ...options.tokens };
  const handlers = createCalendarHandlers({ readConfig: () => config, getServerFirebase: () => ({ db, auth }), now: () => NOW,
    createGoogle: value => ({ authorizationUrl: (state, verifier) => createGoogle(value).authorizationUrl(state, verifier),
      async exchange(code, verifier) { calls.exchanges.push({ code, verifier }); if (options.exchangeFailure) throw new Error('upstream-secret-code-refresh-token'); return tokens; } }) });
  const headers = { host: new URL(config.origin).host, origin: config.origin, 'content-type': 'application/json',
    'sec-fetch-site': 'same-origin', authorization: `Bearer ${TOKEN}` };
  async function start(extra = {}) {
    const res = response();
    await handlers.authorize({ method: 'POST', headers, query: {}, ...extra }, res);
    if (res.statusCode !== 200) return { res };
    const url = new URL(res.body.authorizationUrl), state = url.searchParams.get('state');
    return { res, url, state, browserCookie: res.headers['set-cookie'].split(';')[0] };
  }
  async function callback(flow, query = {}, extra = {}) {
    const res = response();
    await handlers.callback({ method: 'GET', headers: { host: headers.host, cookie: flow.browserCookie },
      query: { state: flow.state, code: 'fake-authorization-code', ...query }, ...extra }, res);
    return res;
  }
  return { config, db, auth, user, calls, tokens, handlers, headers, start, callback };
}

test('exact local/production callbacks; reject aliases, mismatches, preview deployments, malformed secrets', () => {
  assert.equal(readConfig(environment()).redirectUri, 'http://localhost:3000/api/admin/calendar/callback');
  assert.equal(readConfig(environment({ NODE_ENV: 'production', GOOGLE_CALENDAR_REDIRECT_URI: 'https://www.devenginehq.com/api/admin/calendar/callback' })).origin, 'https://www.devenginehq.com');
  for (const uri of ['http://127.0.0.1:3000/api/admin/calendar/callback', 'http://localhost:3001/api/admin/calendar/callback',
    'http://localhost:3000/api/admin/calendar/callback/', 'https://evil.example/api/admin/calendar/callback', 'https://devenginehq.com/api/admin/calendar/callback']) {
    assert.throws(() => readConfig(environment({ GOOGLE_CALENDAR_REDIRECT_URI: uri })), { code: 'calendar_not_configured' });
  }
  for (const extra of [{ GOOGLE_CALENDAR_CLIENT_ID: '' }, { GOOGLE_CALENDAR_CLIENT_SECRET: '' },
    { GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY: 'invalid' }, { GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY: Buffer.alloc(16).toString('base64') },
    { VERCEL_ENV: 'preview' }, { NEXT_PUBLIC_FIREBASE_PROJECT_ID: '' }]) {
    assert.throws(() => readConfig(environment(extra)), { code: 'calendar_not_configured' });
  }
});

test('authenticated, revocation-checked owner only; token claims cannot impersonate the owner', async () => {
  const f = fixture();
  assert.deepEqual(await requireAdmin({ headers: f.headers }, f.auth), { uid: UID, authTime: AUTH_TIME });
  assert.equal(f.calls.verify[0].revoked, true);
  for (const options of [{ user: { email: 'employee@example.com' } }, { user: { disabled: true } },
    { user: { tokensValidAfterTime: new Date(NOW).toISOString() } }, { authFailure: true }]) {
    const denied = fixture(options);
    assert.ok((await denied.start()).res.statusCode >= 400);
    assert.equal(denied.db.values.size, 0);
  }
  await assert.rejects(requireAdmin({ headers: {} }, f.auth), { code: 'admin_sign_in_required' });
  await assert.rejects(revalidateAdmin(UID, NaN, f.auth), { code: 'admin_sign_in_required' });
});

test('authorization refuses cross-origin/missing-origin, forged hosts, non-JSON requests and invalid methods', async () => {
  for (const extra of [{ origin: 'https://evil.example' }, { origin: undefined }, { host: 'evil.example', 'x-forwarded-host': 'localhost:3000' },
    { 'sec-fetch-site': 'cross-site' }, { 'content-type': 'application/x-www-form-urlencoded' }, { authorization: '' }]) {
    const f = fixture(), { res } = await f.start({ headers: { ...f.headers, ...extra } });
    assert.ok(res.statusCode === 401 || res.statusCode === 403);
    assert.equal(f.db.values.size, 0);
    assert.equal(res.headers['access-control-allow-origin'], undefined);
  }
  const f = fixture(), { res } = await f.start({ method: 'GET' });
  assert.equal(res.statusCode, 405); assert.equal(res.headers.allow, 'POST');
});

test('Google consent URL uses exact redirect, minimal scope, offline consent, random state and S256 PKCE', async () => {
  const f = fixture(), flow = await f.start(), next = await f.start();
  assert.equal(flow.url.origin, 'https://accounts.google.com');
  assert.equal(flow.url.pathname, '/o/oauth2/v2/auth');
  for (const [key, value] of Object.entries({ redirect_uri: f.config.redirectUri, scope: SCOPES[0], response_type: 'code',
    access_type: 'offline', prompt: 'consent', code_challenge_method: 'S256', include_granted_scopes: 'false' })) {
    assert.equal(flow.url.searchParams.get(key), value);
  }
  assert.match(flow.state, /^[A-Za-z0-9_-]{43}$/); assert.notEqual(flow.state, next.state);
  assert.notEqual(cookieName(flow.state, f.config), cookieName(next.state, f.config));
  const stored = f.db.values.get(`${STATES}/${digest(flow.state)}`);
  assert.equal(stored.uid, UID); assert.equal(stored.expiresAt.toMillis(), NOW + STATE_TTL_MS);
  assert.ok(!JSON.stringify(stored).includes(flow.browserCookie.split('=')[1]));
  const { verifier } = unseal(stored.verifier, f.config.key, contextFor(f.config, 'state', digest(flow.state)));
  assert.equal(require('node:crypto').createHash('sha256').update(verifier).digest('base64url'), flow.url.searchParams.get('code_challenge'));
  assert.ok(!flow.url.search.includes('fake-client-secret'));
});

test('cookies are HTTP-only, host-only, Lax, expiring; production uses Secure and __Host prefix', () => {
  const local = readConfig(environment());
  const production = readConfig(environment({ NODE_ENV: 'production', GOOGLE_CALENDAR_REDIRECT_URI: 'https://www.devenginehq.com/api/admin/calendar/callback' }));
  for (const config of [local, production]) {
    const value = cookie('state', 'browser-secret', config);
    assert.match(value, /HttpOnly/); assert.match(value, /SameSite=Lax/); assert.match(value, /Path=\//); assert.match(value, /Max-Age=600/);
    assert.ok(!value.includes('Domain='));
    assert.equal(value.includes('; Secure'), config.secure);
    assert.equal(value.startsWith('__Host-'), config.secure);
    assert.match(cookie('state', '', config, true), /Max-Age=0/);
  }
});

test('callback rejects malformed/missing/duplicate state, wrong/missing/duplicate browser cookie, and foreign host', async () => {
  const cases = [
    flow => ({ query: { state: undefined } }), flow => ({ query: { state: [flow.state, flow.state] } }),
    () => ({ query: { state: 'invalid' } }),
    () => ({ headers: { host: 'localhost:3000' } }),
    flow => ({ headers: { host: 'localhost:3000', cookie: `${flow.browserCookie}; ${flow.browserCookie}` } }),
    flow => ({ headers: { host: 'localhost:3000', cookie: `${flow.browserCookie.split('=')[0]}=${'x'.repeat(43)}` } }),
    flow => ({ headers: { host: 'evil.example', cookie: flow.browserCookie } }),
  ];
  for (const change of cases) {
    const f = fixture(), flow = await f.start(), extra = change(flow);
    const result = await f.callback(flow, extra.query || {}, extra.headers ? { headers: extra.headers } : {});
    assert.ok(result.statusCode >= 400);
    assert.equal(f.calls.exchanges.length, 0);
    assert.ok(!f.db.values.has(`${CONNECTIONS}/${UID}`));
  }
});

test('expired state fails even before TTL cleanup; wrong redirect binding is rejected', async () => {
  for (const mutate of [value => ({ ...value, expiresAt: Timestamp.fromMillis(NOW) }), value => ({ ...value, redirectUri: 'https://evil.example/callback' })]) {
    const f = fixture(), flow = await f.start(), path = `${STATES}/${digest(flow.state)}`;
    f.db.values.set(path, mutate(f.db.values.get(path)));
    assert.equal((await f.callback(flow)).statusCode, 400);
    assert.equal(f.calls.exchanges.length, 0);
  }
});

test('successful callback exchanges only once, encrypts tokens, redirects safely, and protects status output', async () => {
  const f = fixture(), flow = await f.start();
  const results = await Promise.all([f.callback(flow), f.callback(flow)]);
  assert.deepEqual(results.map(result => result.statusCode).sort(), [303, 400]);
  assert.equal(f.calls.exchanges.length, 1);
  assert.equal(results.find(result => result.statusCode === 303).headers.location, 'http://localhost:3000/admin/task-manager?calendar=connected');
  const stored = f.db.values.get(`${CONNECTIONS}/${UID}`), serialized = JSON.stringify(stored);
  assert.ok(!serialized.includes(f.tokens.access_token)); assert.ok(!serialized.includes(f.tokens.refresh_token));
  const tokens = unseal(stored.encryptedTokens, f.config.key, contextFor(f.config, 'tokens', UID));
  assert.equal(tokens.refreshToken, f.tokens.refresh_token);
  const res = response();
  await f.handlers.status({ method: 'GET', headers: f.headers }, res);
  assert.equal(res.statusCode, 200); assert.equal(res.body.connected, true);
  assert.ok(!JSON.stringify(res.body).includes('token'));
  assert.match(res.headers['cache-control'], /no-store/); assert.equal(res.headers['referrer-policy'], 'no-referrer');
});

test('callback revalidates suspended/revoked admin before exchange and before token storage', async () => {
  const f = fixture(), flow = await f.start(); f.user.disabled = true;
  assert.equal((await f.callback(flow)).statusCode, 401); assert.equal(f.calls.exchanges.length, 0);
  const g = fixture(), next = await g.start(); let count = 0;
  g.auth.getUser = async () => ({ ...g.user, disabled: ++count > 1 });
  assert.equal((await g.callback(next)).statusCode, 401);
  assert.equal(g.calls.exchanges.length, 1); assert.ok(!g.db.values.has(`${CONNECTIONS}/${UID}`));
});

test('consent denial consumes state without exchanging code or replacing an existing connection', async () => {
  const f = fixture(), flow = await f.start();
  const existing = { marker: 'existing grant' }; f.db.values.set(`${CONNECTIONS}/${UID}`, existing);
  const res = await f.callback(flow, { error: 'access_denied', code: undefined });
  assert.equal(res.statusCode, 303); assert.match(res.headers.location, /calendar=cancelled$/);
  assert.equal(f.calls.exchanges.length, 0); assert.equal(f.db.values.get(`${CONNECTIONS}/${UID}`), existing);
  assert.equal((await f.callback(flow)).statusCode, 400);
});

test('provider errors are redacted and failed/partial grants never overwrite stored tokens', async () => {
  for (const options of [{ exchangeFailure: true }, { tokens: { refresh_token: undefined } },
    { tokens: { scope: 'openid' } }, { tokens: { access_token: '' } }, { tokens: { expiry_date: NOW - 1 } }]) {
    const f = fixture(options), flow = await f.start();
    const existing = { marker: 'existing grant' }; f.db.values.set(`${CONNECTIONS}/${UID}`, existing);
    const res = await f.callback(flow);
    assert.ok(res.statusCode >= 400);
    assert.equal(f.db.values.get(`${CONNECTIONS}/${UID}`), existing);
    assert.ok(!JSON.stringify(res.body).includes('upstream-secret'));
    assert.match(res.headers['set-cookie'], /Max-Age=0/);
  }
});

test('authenticated encryption rejects tampering and cross-user/client/project/purpose reuse', () => {
  const f = fixture(), context = contextFor(f.config, 'tokens', UID), data = { refreshToken: 'fake-private-token' };
  const encrypted = seal(data, f.config.key, context);
  assert.deepEqual(unseal(encrypted, f.config.key, context), data);
  assert.notDeepEqual(encrypted, seal(data, f.config.key, context));
  for (const other of [contextFor(f.config, 'tokens', 'other-user'), contextFor({ ...f.config, clientId: 'other-client' }, 'tokens', UID),
    contextFor({ ...f.config, projectId: 'other-project' }, 'tokens', UID), contextFor(f.config, 'state', UID)]) {
    assert.throws(() => unseal(encrypted, f.config.key, other), { code: 'calendar_reconnect_required' });
  }
  assert.throws(() => unseal(encrypted, Buffer.alloc(32, 8), context), { code: 'calendar_reconnect_required' });
  assert.throws(() => unseal({ ...encrypted, tag: Buffer.alloc(16).toString('base64') }, f.config.key, context), { code: 'calendar_reconnect_required' });
});

test('state creation is bounded per admin and invalid requests do not use the quota', async () => {
  const f = fixture();
  for (let count = 0; count < 10; count++) assert.equal((await f.start()).res.statusCode, 200);
  assert.equal((await f.start()).res.statusCode, 429);
  assert.equal(f.db.values.get(`${LIMITS}/${UID}`).count, 10);
  assert.equal([...f.db.values.keys()].filter(path => path.startsWith(`${STATES}/`)).length, 10);
  const expiredWindow = createStore(f.db, f.config);
  await expiredWindow.createState('new-state', 'new-browser', 'new-verifier', { uid: UID, authTime: AUTH_TIME }, NOW + STATE_TTL_MS);
  assert.equal(f.db.values.get(`${LIMITS}/${UID}`).count, 1);
});

test('Google library receives the authorization code, same redirect and matching PKCE verifier', async () => {
  const f = fixture(); let received;
  const adapter = createGoogle(f.config, { async getToken(options) { received = options; return { tokens: f.tokens }; } });
  assert.equal(await adapter.exchange('fake-code', 'fake-verifier'), f.tokens);
  assert.deepEqual(received, { code: 'fake-code', codeVerifier: 'fake-verifier', redirect_uri: f.config.redirectUri });
});

test('missing configuration and infrastructure failures are safe, with no diagnostic leakage', async () => {
  for (const overrides of [{ readConfig() { throw new (require('../lib/server/calendar/config').CalendarError)('calendar_not_configured', 503); } },
    { getServerFirebase() { throw new Error('private-key-diagnostic'); } }]) {
    const f = fixture(), handler = createCalendarHandlers({ readConfig: () => f.config, ...overrides });
    const res = response();
    await handler.authorize({ method: 'POST', headers: f.headers }, res);
    assert.equal(res.statusCode, 503); assert.ok(!JSON.stringify(res.body).includes('private-key'));
  }
});
