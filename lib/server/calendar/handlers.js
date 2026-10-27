const { getServerFirebase } = require('../admin');
const { readConfig, RETURN_PATH, CalendarError } = require('./config');
const { createStore } = require('./store');
const { createGoogle } = require('./google');
const { randomSecret, cookie, readBrowserSecret, requireSameOrigin, readBearerToken, requireAdmin, revalidateAdmin, privateHeaders } = require('./security');

// Dependency injection keeps route/security tests completely offline, with no production credentials.
function createCalendarHandlers(overrides = {}) {
  const dependencies = {
    readConfig, getServerFirebase, createStore, createGoogle, now: () => Date.now(), ...overrides,
  };
  function fail(res, error) {
    const known = error instanceof CalendarError;
    return res.status(known ? error.status : 503).json({ error: known ? error.code : error?.message==='server_identity_not_configured'?'server_identity_not_configured':'calendar_service_unavailable' });
  }
  function method(req, res, expected) {
    privateHeaders(res);
    if (req.method === expected) return true;
    res.setHeader('Allow', expected);
    res.status(405).json({ error: 'method_not_allowed' });
    return false;
  }
  return {
    async authorize(req, res) {
      if (!method(req, res, 'POST')) return;
      try {
        const config = dependencies.readConfig();
        requireSameOrigin(req, config);
        readBearerToken(req);
        const { auth, db } = dependencies.getServerFirebase();
        const actor = await requireAdmin(req, auth);
        const state = randomSecret(), browserSecret = randomSecret(), verifier = randomSecret();
        const google = dependencies.createGoogle(config);
        const authorizationUrl = google.authorizationUrl(state, verifier);
        await dependencies.createStore(db, config).createState(state, browserSecret, verifier, actor, dependencies.now());
        res.setHeader('Set-Cookie', cookie(state, browserSecret, config));
        return res.status(200).json({ authorizationUrl });
      } catch (error) { return fail(res, error); }
    },
    async callback(req, res) {
      if (!method(req, res, 'GET')) return;
      let config, state;
      try {
        config = dependencies.readConfig();
        if (req.headers.host !== new URL(config.origin).host) throw new CalendarError('invalid_request_origin', 403);
        state = req.query.state;
        if (typeof state !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(state)) throw new CalendarError('invalid_oauth_state');
        const browserSecret = readBrowserSecret(req, state, config);
        const { auth, db } = dependencies.getServerFirebase();
        const store = dependencies.createStore(db, config);
        const transaction = await store.consumeState(state, browserSecret, dependencies.now());
        res.setHeader('Set-Cookie', cookie(state, '', config, true));
        const actor = await revalidateAdmin(transaction.uid, transaction.authTime, auth);
        if (req.query.error !== undefined) {
          const result = req.query.error === 'access_denied' ? 'cancelled' : 'authorization_failed';
          return res.redirect(303, `${config.origin}${RETURN_PATH}?calendar=${result}`);
        }
        const code = req.query.code;
        if (typeof code !== 'string' || !code || code.length > 4096) throw new CalendarError('invalid_authorization_code');
        let tokens;
        try { tokens = await dependencies.createGoogle(config).exchange(code, transaction.verifier); }
        catch { throw new CalendarError('google_authorization_failed', 502); }
        // Check revocation/owner status again after the external token exchange.
        await revalidateAdmin(actor.uid, actor.authTime, auth);
        await store.saveConnection(actor, tokens, dependencies.now());
        return res.redirect(303, `${config.origin}${RETURN_PATH}?calendar=connected`);
      } catch (error) {
        // No raw upstream messages, tokens, authorization codes, or request URLs are logged/returned.
        if (config && typeof state === 'string' && /^[A-Za-z0-9_-]{43}$/.test(state)) res.setHeader('Set-Cookie', cookie(state, '', config, true));
        return fail(res, error);
      }
    },
    async status(req, res) {
      if (!method(req, res, 'GET')) return;
      try {
        readBearerToken(req);
        const config = dependencies.readConfig();
        const { auth, db } = dependencies.getServerFirebase();
        const actor = await requireAdmin(req, auth);
        return res.status(200).json({ configured: true, ...(await dependencies.createStore(db, config).status(actor.uid)) });
      } catch (error) { return fail(res, error); }
    },
    async disconnect(req, res) {
      if (!method(req,res,'POST')) return;
      try {
        const config = dependencies.readConfig(); requireSameOrigin(req,config); readBearerToken(req);
        const {auth,db} = dependencies.getServerFirebase(); const actor = await requireAdmin(req,auth);
        await require('../tasks/calendar').disconnect(db,actor.uid);
        return res.status(200).json({disconnected:true});
      } catch (error) { return fail(res,error); }
    },
  };
}

module.exports = { createCalendarHandlers };
