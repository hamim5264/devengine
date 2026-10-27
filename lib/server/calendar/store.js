const { Timestamp } = require('firebase-admin/firestore');
const { randomUUID } = require('node:crypto');
const { CalendarError } = require('./config');
const { STATE_TTL_MS, digest, safeEqual, seal, unseal, contextFor } = require('./security');

const STATES = 'admin_calendar_oauth_states';
const CONNECTIONS = 'admin_calendar_connections';
const LIMITS = 'admin_calendar_oauth_limits';

function createStore(db, config) {
  return {
    async createState(state, browserSecret, verifier, actor, now) {
      const id = digest(state), ref = db.collection(STATES).doc(id), limitRef = db.collection(LIMITS).doc(actor.uid);
      const transactionData = {
        uid: actor.uid, authTime: actor.authTime, browserHash: digest(browserSecret), redirectUri: config.redirectUri,
        verifier: seal({ verifier }, config.key, contextFor(config, 'state', id)),
        createdAt: Timestamp.fromMillis(now), expiresAt: Timestamp.fromMillis(now + STATE_TTL_MS), consumed: false,
      };
      await db.runTransaction(async tx => {
        const limit = await tx.get(limitRef);
        const old = limit.exists ? limit.data() : {};
        const fresh = !old.windowStart || now - old.windowStart >= STATE_TTL_MS;
        const count = fresh ? 0 : old.count;
        if (count >= 10) throw new CalendarError('too_many_connection_attempts', 429);
        tx.set(limitRef, { windowStart: fresh ? now : old.windowStart, count: count + 1, expiresAt: Timestamp.fromMillis(now + STATE_TTL_MS) });
        tx.create(ref, transactionData);
      });
    },
    async consumeState(state, browserSecret, now) {
      const id = digest(state), ref = db.collection(STATES).doc(id);
      return db.runTransaction(async tx => {
        const snapshot = await tx.get(ref);
        const value = snapshot.exists ? snapshot.data() : null;
        if (!value || value.consumed || value.expiresAt.toMillis() <= now || value.redirectUri !== config.redirectUri ||
            !safeEqual(value.browserHash, digest(browserSecret))) throw new CalendarError('invalid_oauth_state');
        const { verifier } = unseal(value.verifier, config.key, contextFor(config, 'state', id));
        tx.update(ref, { consumed: true, consumedAt: Timestamp.fromMillis(now) });
        return { uid: value.uid, authTime: value.authTime, verifier };
      });
    },
    async saveConnection(actor, tokens, now) {
      // Consent must return a fresh offline grant. Never mix refresh tokens from different Google accounts.
      if (!tokens.refresh_token) throw new CalendarError('offline_access_required', 409);
      const scopes = typeof tokens.scope === 'string' ? tokens.scope.split(/\s+/).filter(Boolean) : [];
      if (!config.scopes.every(scope => scopes.includes(scope))) throw new CalendarError('calendar_scope_not_granted', 403);
      if (typeof tokens.access_token !== 'string' || !tokens.access_token || typeof tokens.refresh_token !== 'string' ||
          !Number.isFinite(tokens.expiry_date) || tokens.expiry_date <= now || (tokens.token_type && tokens.token_type.toLowerCase() !== 'bearer')) {
        throw new CalendarError('invalid_provider_response', 502);
      }
      const encryptedTokens = seal({ accessToken: tokens.access_token, refreshToken: tokens.refresh_token,
        expiryDate: tokens.expiry_date, scopes }, config.key, contextFor(config, 'tokens', actor.uid));
      await db.collection(CONNECTIONS).doc(actor.uid).set({ uid: actor.uid, clientId: config.clientId,
        generation:randomUUID(), encryptedTokens, scopes, connectedAt: Timestamp.fromMillis(now), updatedAt: Timestamp.fromMillis(now) });
    },
    async status(uid) {
      const snapshot = await db.collection(CONNECTIONS).doc(uid).get();
      if (!snapshot.exists || snapshot.data().disconnected || snapshot.data().clientId !== config.clientId) return { connected: false };
      const value = snapshot.data();
      // An unreadable grant must not be reported as a usable connection after a key rotation.
      const tokens = unseal(value.encryptedTokens, config.key, contextFor(config, 'tokens', uid));
      return { connected: true, calendar:'primary', accountLabel:'Connected Google account · primary calendar', expiresAt:new Date(tokens.expiryDate).toISOString(), scopes: value.scopes, connectedAt: value.connectedAt.toDate().toISOString() };
    },
  };
}

module.exports = { STATES, CONNECTIONS, LIMITS, createStore };
