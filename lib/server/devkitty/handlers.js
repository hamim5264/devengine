const { getServerFirebase, ADMIN_EMAIL } = require('../admin');
const { requireAdmin, privateHeaders } = require('../calendar/security');
const { settingsRef, privateRef, readSettings, validateSettings, string } = require('../../../functions/devkitty/config');
const { providerDetails, usageDetails } = require('../../../functions/devkitty/reporting');
const { validateKey, modelCatalog } = require('../../../functions/devkitty/provider');
const { dayKey } = require('../../../functions/devkitty/limits');

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
