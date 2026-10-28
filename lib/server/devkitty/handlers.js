const { getServerFirebase, ADMIN_EMAIL } = require('../admin');
const { requireAdmin, privateHeaders } = require('../calendar/security');
const { providerDetails, usageDetails } = require('../../../functions/devkitty/reporting');

const BASE = 'https://openrouter.ai/api/v1';
const FREE_ROUTER = 'openrouter/free';
const DEFAULT_PAID_MODEL = 'google/gemini-2.5-flash';
const isFreeModel = model => model === FREE_ROUTER || /^[a-z0-9._-]+\/[a-z0-9._/-]+:free$/i.test(model);

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
const dayKey = () => new Date().toISOString().slice(0, 10);

function routingSettings(input, result) {
  if (!['free', 'paid'].includes(result.billingMode)) throw new Error('Choose free or paid mode.');
  if (!input.freeModel && isFreeModel(input.model)) result.freeModel = input.model;
  if (!input.paidModel && typeof input.model === 'string' && !isFreeModel(input.model)) result.paidModel = input.model;
  if (!isFreeModel(result.freeModel)) throw new Error('Free mode requires openrouter/free or a model ending in :free.');
  if (!/^[a-z0-9._-]+\/[a-z0-9._:/-]+$/i.test(result.paidModel) || result.paidModel.length > 160 || isFreeModel(result.paidModel)) throw new Error('Choose a valid paid model.');
  if (result.freeModel.length > 160) throw new Error('Choose a valid free model.');
  result.model = result.billingMode === 'paid' ? result.paidModel : result.freeModel;
  return result;
}

function validateSettings(input = {}) {
  const result = {};
  for (const [key, fallback] of Object.entries(DEFAULTS)) {
    if (typeof fallback === 'boolean') result[key] = typeof input[key] === 'boolean' ? input[key] : fallback;
    else if (typeof fallback === 'string') result[key] = string(input[key], key.endsWith('Greeting') || key === 'maintenanceMessage' ? 600 : 4000) || fallback;
  }
  const ranges = { temperature: [0, 1], maxOutputTokens: [256, 2048], dailyMessageLimit: [1, 100000], messagesPerMinute: [1, 30], visitorDailyLimit: [1, 500] };
  for (const [key, [low, high]] of Object.entries(ranges)) {
    const value = Number(input[key] ?? DEFAULTS[key]);
    if (!Number.isFinite(value) || value < low || value > high) throw new Error(`Invalid setting: ${key}.`);
    result[key] = key === 'temperature' ? value : Math.floor(value);
  }
  return routingSettings(input, result);
}

async function readSettings(db) {
  const snapshot = await settingsRef(db).get();
  return validateSettings(snapshot.exists ? snapshot.data() : DEFAULTS);
}

async function validateKey(apiKey) {
  if (!/^sk-or-[a-z0-9-]+$/i.test(apiKey) || apiKey.length > 256) throw new Error('Enter a valid OpenRouter API key.');
  const response = await fetch(`${BASE}/key`, { headers: { Authorization: `Bearer ${apiKey}` }, signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error('The AI provider rejected this API key. Please check your key.');
}

async function modelCatalog() {
  try {
    const response = await fetch(`${BASE}/models`, { signal: AbortSignal.timeout(12000) });
    if (!response.ok) return [{ id: FREE_ROUTER, name: 'OpenRouter · Free Models Router', inputPricePerMillion: 0, outputPricePerMillion: 0, free: true, supportsTools: true }];
    const data = await response.json();
    const models = (data.data || []).filter(model => {
      if (isFreeModel(model.id)) return ['prompt', 'completion', 'request'].every(f => model.pricing?.[f] != null ? Number(model.pricing[f]) === 0 : f === 'request');
      return model.supported_parameters?.includes('tools') && Number(model.pricing?.prompt) >= 0 && Number(model.pricing?.completion) >= 0;
    }).map(model => ({
      id: model.id, name: model.name, inputPricePerMillion: Number(model.pricing?.prompt || 0) * 1000000,
      outputPricePerMillion: Number(model.pricing?.completion || 0) * 1000000, free: isFreeModel(model.id), supportsTools: !!model.supported_parameters?.includes('tools'),
    }));
    if (!models.some(m => m.id === FREE_ROUTER)) models.push({ id: FREE_ROUTER, name: 'OpenRouter · Free Models Router', inputPricePerMillion: 0, outputPricePerMillion: 0, free: true, supportsTools: true });
    return models.sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    return [{ id: FREE_ROUTER, name: 'OpenRouter · Free Models Router', inputPricePerMillion: 0, outputPricePerMillion: 0, free: true, supportsTools: true }];
  }
}

async function devkittyAdminHandler(req, res) {
  privateHeaders(res);
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  try {
    const { auth, db } = getServerFirebase();
    const adminUser = await requireAdmin(req, auth);
    const body = req.body || {};
    const action = body.action || 'read';

    if (action === 'read') {
      const [settings, keySnap, usageSnap, knowledgeSnap] = await Promise.all([
        readSettings(db),
        privateRef(db).get(),
        db.doc(`devkitty_usage/${dayKey()}`).get(),
        db.collection('devkitty_knowledge').limit(200).get(),
      ]);
      const savedKey = keySnap.data()?.apiKey || '';
      return res.json({
        settings,
        configured: !!(savedKey || process.env.OPENROUTER_API_KEY),
        keyHint: keySnap.data()?.keyHint || (savedKey ? `••••${savedKey.slice(-4)}` : ''),
        apiKey: savedKey,
        usage: usageSnap.data() || {},
        knowledge: knowledgeSnap.docs.map(snap => ({ ...snap.data(), id: snap.id })),
      });
    }

    if (action === 'save') {
      const settings = validateSettings(body.settings);
      const key = string(body.apiKey, 300);
      if (key) await validateKey(key);
      const batch = db.batch();
      batch.set(settingsRef(db), { ...settings, updatedAt: new Date().toISOString(), updatedBy: adminUser.uid });
      if (body.removeKey === true) {
        batch.delete(privateRef(db));
      } else if (key) {
        batch.set(privateRef(db), { apiKey: key, keyHint: `••••${key.slice(-4)}`, updatedAt: new Date().toISOString(), updatedBy: adminUser.uid });
      }
      await batch.commit();
      return res.json({ saved: true });
    }

    if (action === 'removeKey') {
      await privateRef(db).delete();
      return res.json({ saved: true, removed: true });
    }

    if (action === 'setEnabled') {
      if (typeof body.enabled !== 'boolean') return res.status(400).json({ error: 'Choose whether DevKitty is enabled.' });
      await settingsRef(db).set({ enabled: body.enabled, updatedAt: new Date().toISOString(), updatedBy: adminUser.uid }, { merge: true });
      return res.json({ enabled: body.enabled });
    }

    if (action === 'models') {
      const models = await modelCatalog();
      return res.json({ models });
    }

    if (action === 'insights') {
      const snap = await privateRef(db).get();
      const apiKey = snap.data()?.apiKey || process.env.OPENROUTER_API_KEY || '';
      const [providerResult, usageResult] = await Promise.allSettled([
        providerDetails(apiKey),
        usageDetails(db),
      ]);
      const provider = providerResult.status === 'fulfilled' ? providerResult.value : { status: 'unavailable', checkedAt: new Date().toISOString() };
      const usageReport = usageResult.status === 'fulfilled' ? { ...usageResult.value, status: 'connected' } : { since: new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10), models: [], status: 'unavailable' };
      return res.json({ provider, usageReport });
    }

    if (action === 'saveKnowledge') {
      const item = body.item || {};
      const title = string(item.title, 160), content = string(item.content, 12000);
      const audiences = Array.isArray(item.audiences) ? [...new Set(item.audiences.filter(role => ['visitor', 'employee', 'admin'].includes(role)))] : [];
      if (!title || !content || !audiences.length) return res.status(400).json({ error: 'Add a title, content and at least one audience.' });
      const id = string(item.id, 100);
      if (id.includes('/')) return res.status(400).json({ error: 'Invalid knowledge item.' });
      const ref = id ? db.doc(`devkitty_knowledge/${id}`) : db.collection('devkitty_knowledge').doc();
      const url = string(item.url, 300);
      if (url && (!/^\/[a-z0-9/_-]*$/i.test(url) || url.startsWith('//'))) return res.status(400).json({ error: 'Use a local DevEngine page path.' });
      await ref.set({ title, content, audiences, url, keywords: string(item.keywords, 500), enabled: item.enabled !== false, updatedAt: new Date().toISOString() });
      return res.json({ id: ref.id });
    }

    if (action === 'deleteKnowledge') {
      const id = string(body.id, 100);
      if (!id || id.includes('/')) return res.status(400).json({ error: 'Invalid knowledge item.' });
      await db.doc(`devkitty_knowledge/${id}`).delete();
      return res.json({ deleted: true });
    }

    return res.status(400).json({ error: 'unknown_action' });
  } catch (err) {
    const status = err.status || (err.safeCode === 'admin_sign_in_required' ? 401 : 500);
    return res.status(status).json({ error: err.message || 'devkitty_admin_failed' });
  }
}

module.exports = { devkittyAdminHandler };
