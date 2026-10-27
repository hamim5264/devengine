const { createHash, createCipheriv, createDecipheriv, randomBytes, timingSafeEqual } = require('node:crypto');
const { ADMIN_EMAIL } = require('../admin');
const { CalendarError } = require('./config');

const STATE_TTL_MS = 10 * 60 * 1000;
const randomSecret = () => randomBytes(32).toString('base64url');
const digest = value => createHash('sha256').update(value).digest('hex');

function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const aa = Buffer.from(a), bb = Buffer.from(b);
  return aa.length === bb.length && timingSafeEqual(aa, bb);
}

function seal(value, key, context) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from(context));
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return { version: 1, iv: iv.toString('base64'), ciphertext: ciphertext.toString('base64'), tag: cipher.getAuthTag().toString('base64') };
}

function unseal(value, key, context) {
  try {
    if (!value || value.version !== 1 || typeof value.iv !== 'string' || typeof value.tag !== 'string' || typeof value.ciphertext !== 'string' || value.ciphertext.length > 65536) throw new Error();
    const iv = Buffer.from(value.iv, 'base64'), tag = Buffer.from(value.tag, 'base64');
    if (iv.length !== 12 || tag.length !== 16) throw new Error();
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAAD(Buffer.from(context));
    decipher.setAuthTag(tag);
    return JSON.parse(Buffer.concat([decipher.update(Buffer.from(value.ciphertext, 'base64')), decipher.final()]).toString('utf8'));
  } catch { throw new CalendarError('calendar_reconnect_required', 409); }
}

const contextFor = (config, purpose, id) => `${config.projectId}:${config.clientId}:${purpose}:${id}`;

function cookieName(state, config) {
  return `${config.secure ? '__Host-' : ''}devengine_calendar_${digest(state).slice(0, 24)}`;
}

function cookie(state, secret, config, clear = false) {
  return `${cookieName(state, config)}=${clear ? '' : secret}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${clear ? 0 : STATE_TTL_MS / 1000}${config.secure ? '; Secure' : ''}`;
}

function readBrowserSecret(req, state, config) {
  const name = cookieName(state, config);
  const matches = (req.headers.cookie || '').split(';').map(value => value.trim()).filter(value => value.startsWith(`${name}=`));
  if (matches.length !== 1) throw new CalendarError('invalid_oauth_state');
  const value = matches[0].slice(name.length + 1);
  if (!/^[A-Za-z0-9_-]{43}$/.test(value)) throw new CalendarError('invalid_oauth_state');
  return value;
}

function requireSameOrigin(req, config) {
  if (req.headers.host !== new URL(config.origin).host || req.headers.origin !== config.origin ||
      (req.headers['sec-fetch-site'] && req.headers['sec-fetch-site'] !== 'same-origin') ||
      !/^application\/json(?:\s*;|$)/i.test(req.headers['content-type'] || '')) {
    throw new CalendarError('invalid_request_origin', 403);
  }
}

function readBearerToken(req) {
  const match = /^Bearer ([^\s]{20,8192})$/.exec(req.headers.authorization || '');
  if (!match) throw new CalendarError('admin_sign_in_required', 401);
  return match[1];
}

async function requireAdmin(req, auth) {
  const token = readBearerToken(req);
  let claims;
  try { claims = await auth.verifyIdToken(token, true); }
  catch { throw new CalendarError('admin_sign_in_required', 401); }
  return revalidateAdmin(claims.uid, claims.auth_time, auth);
}

async function revalidateAdmin(uid, authTime, auth) {
  let user;
  try { user = await auth.getUser(uid); }
  catch { throw new CalendarError('admin_sign_in_required', 401); }
  if (!Number.isFinite(authTime) || authTime <= 0 || user.disabled ||
      authTime * 1000 < new Date(user.tokensValidAfterTime || 0).getTime()) {
    throw new CalendarError('admin_sign_in_required', 401);
  }
  if (user.email?.toLowerCase() !== ADMIN_EMAIL) throw new CalendarError('admin_only', 403);
  return { uid: user.uid, authTime };
}

function privateHeaders(res) {
  res.setHeader('Cache-Control', 'no-store, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
}

module.exports = { STATE_TTL_MS, randomSecret, digest, safeEqual, seal, unseal, contextFor,
  cookieName, cookie, readBrowserSecret, requireSameOrigin, readBearerToken, requireAdmin, revalidateAdmin, privateHeaders };
