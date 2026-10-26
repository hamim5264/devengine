const { HttpsError } = require('firebase-functions/v2/https');
const { getAuth } = require('firebase-admin/auth');
const { FREE_ROUTER, DEFAULT_PAID_MODEL, routingSettings } = require('./pricing');
const ADMIN_EMAIL = 'hamim.leon@gmail.com';
const DEFAULTS = {
  enabled: true, publicEnabled: true, employeeEnabled: true, adminEnabled: true,
  maintenanceMessage: 'I’m currently undergoing maintenance, bunny. I’ll be back shortly. Thank you for your patience.',
  billingMode: 'free', freeModel: FREE_ROUTER, paidModel: DEFAULT_PAID_MODEL,
  model: FREE_ROUTER, temperature: 0.35, maxOutputTokens: 1200,
  dailyMessageLimit: 1000, messagesPerMinute: 8, visitorDailyLimit: 60,
  webSearchEnabled: true, employeeDataEnabled: true, adminDataEnabled: true,
  autoEmployeeGreeting: true, requireZeroRetention: false,
  instructions: 'Be warm, clear, accurate and concise. Use short paragraphs and meaningful links. Avoid unnecessary emoji.',
  visitorInstructions: 'Help visitors discover public projects, services, articles and contact options.',
  employeeInstructions: 'Help the employee understand their own tasks, attendance, requests and workspace. Guide them to the correct screen.',
  adminInstructions: 'Help administration understand studio activity and find the appropriate management screen. Never claim to have changed data.',
  visitorGreeting: 'Hey bunny! I’m DevKitty, your DevEngine companion. What would you like to explore?',
  employeeGreeting: 'Hey bunny, welcome back, {name}! What’s your plan today? I can help with your tasks, requests and daily updates.',
  adminGreeting: 'Hey bunny, welcome back! What would you like to work on in the studio today?',
};
const settingsRef = db => db.doc('devkitty_settings/main');
const privateRef = db => db.doc('devkitty_private/provider');
const string = (value, max = 4000) => typeof value === 'string' ? value.trim().slice(0, max) : '';
function validateSettings(input = {}) {
  const result = {};
  for (const [key, fallback] of Object.entries(DEFAULTS)) {
    if (typeof fallback === 'boolean') result[key] = typeof input[key] === 'boolean' ? input[key] : fallback;
    else if (typeof fallback === 'string') result[key] = string(input[key], key.endsWith('Greeting') || key === 'maintenanceMessage' ? 600 : 4000) || fallback;
  }
  const ranges = { temperature: [0, 1], maxOutputTokens: [256, 2048], dailyMessageLimit: [1, 100000], messagesPerMinute: [1, 30], visitorDailyLimit: [1, 500] };
  for (const [key, [low, high]] of Object.entries(ranges)) {
    const value = Number(input[key] ?? DEFAULTS[key]);
    if (!Number.isFinite(value) || value < low || value > high) throw new HttpsError('invalid-argument', `Invalid setting: ${key}.`);
    result[key] = key === 'temperature' ? value : Math.floor(value);
  }
  return routingSettings(input, result);
}
async function readSettings(db) {
  const snapshot = await settingsRef(db).get();
  return validateSettings(snapshot.exists ? snapshot.data() : DEFAULTS);
}
async function resolveActor(request, db) {
  if (!request.auth) return { role: 'visitor', uid: '', name: 'bunny', session: 'visitor' };
  // Verify current account state as well as the callable's automatically verified ID token.
  const user = await getAuth().getUser(request.auth.uid);
  if (user.disabled || (request.auth.token.auth_time || 0) * 1000 < new Date(user.tokensValidAfterTime || 0).getTime()) throw new HttpsError('unauthenticated', 'Please sign in again.');
  if (user.email?.toLowerCase() === ADMIN_EMAIL) return { role: 'admin', uid: user.uid, name: user.displayName || 'Administrator', session: `${user.uid}:${request.auth.token.auth_time}` };
  const snapshot = await db.doc(`staff_members/${user.uid}`).get();
  if (snapshot.exists) {
    if (snapshot.data().status !== 'active') throw new HttpsError('permission-denied', 'Your employee account is unavailable. Please contact administration.');
    return { role: 'employee', uid: user.uid, name: string(snapshot.data().name, 100) || 'bunny', staff: snapshot.data(), session: `${user.uid}:${request.auth.token.auth_time}` };
  }
  return { role: 'visitor', uid: user.uid, name: 'bunny', session: `visitor:${user.uid}` };
}
async function requireAdmin(request, db) {
  const actor = await resolveActor(request, db);
  if (actor.role !== 'admin') throw new HttpsError('permission-denied', 'Administrator access is required.');
  return actor;
}
function roleEnabled(settings, role) { return settings.enabled && settings[`${role === 'visitor' ? 'public' : role}Enabled`]; }
function greeting(settings, actor) {
  if (!roleEnabled(settings, actor.role)) return maintenance(settings);
  let value = settings[`${actor.role}Greeting`].replace(/\{name\}/g, actor.name).replace(/\{company\}/g, 'DevEngine');
  if (!/\bbunny\b/i.test(value)) value = `Hey bunny! ${value}`;
  return value;
}
function maintenance(settings) {
  const text = settings.maintenanceMessage;
  return /\bbunny\b/i.test(text) ? text : `${text} Thank you for your patience, bunny.`;
}
module.exports = { DEFAULTS, ADMIN_EMAIL, settingsRef, privateRef, string, readSettings, validateSettings, resolveActor, requireAdmin, roleEnabled, greeting, maintenance };
