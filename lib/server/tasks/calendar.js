const { OAuth2Client } = require('google-auth-library');
const { randomUUID } = require('node:crypto');
const { readConfig, CalendarError } = require('../calendar/config');
const { seal, unseal, contextFor } = require('../calendar/security');
const { CONNECTIONS } = require('../calendar/store');
const { eventId, eventBody } = require('./model');

function providerCode(error) {
  if (error?.response?.data?.error === 'invalid_grant' || error?.response?.status === 401) return 'calendar_reconnect_required';
  const status = error?.response?.status || error?.status || error?.code;
  return [403,404,409,410,429].includes(Number(status)) ? `google_${status}` : 'google_temporarily_unavailable';
}
async function calendarClient(db, uid, config = readConfig(), factory = options => new OAuth2Client(options)) {
  const ref = db.collection(CONNECTIONS).doc(uid), snap = await ref.get();
  if (!snap.exists || snap.data().disconnected) throw new CalendarError('calendar_not_connected',409);
  const record = snap.data();
  if (record.clientId !== config.clientId) throw new CalendarError('calendar_reconnect_required',409);
  const tokens = unseal(record.encryptedTokens,config.key,contextFor(config,'tokens',uid));
  const client = factory({clientId:config.clientId,clientSecret:config.clientSecret,redirectUri:config.redirectUri,transporterOptions:{timeout:15000,retry:false}});
  client.setCredentials({access_token:tokens.accessToken,refresh_token:tokens.refreshToken,expiry_date:tokens.expiryDate});
  async function persist() {
    const current = client.credentials;
    await db.runTransaction(async tx => {
      const latest = await tx.get(ref);
      if (!latest.exists || latest.data().disconnected || latest.data().generation !== record.generation) throw new CalendarError('calendar_connection_changed',409);
      tx.update(ref,{encryptedTokens:seal({ ...tokens,accessToken:current.access_token || tokens.accessToken,refreshToken:current.refresh_token || tokens.refreshToken,expiryDate:current.expiry_date || tokens.expiryDate },config.key,contextFor(config,'tokens',uid))});
    });
  }
  return {client,config,record,persist,ref};
}
async function syncTask(db, task, mapping, options = {}) {
  const connection = await calendarClient(db,task.ownerUid,options.config,options.factory);
  const {client,config} = connection;
  let identifier = mapping?.eventId || eventId(task.ownerUid,task.id);
  const base = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
  const request = async (method,url,data) => (await client.request({method,url,data,timeout:15000,retry:false})).data;
  let existing,tombstone=false;
  try { existing = await request('GET',`${base}/${identifier}`); }
  catch (error) { const status=Number(error?.response?.status);if (![404,410].includes(status)) throw new CalendarError(providerCode(error),502);tombstone=status===410; }
  const remove = !task.calendarEnabled || !task.dueAt || task.deleted;
  if (existing && existing.status!=='cancelled' && (existing.extendedProperties?.private?.devengineTaskId !== task.id || existing.extendedProperties?.private?.devengineOwnerUid !== task.ownerUid)) throw new CalendarError('calendar_event_ownership_mismatch',409);
  if (remove) {
    if (existing && existing.status !== 'cancelled') await request('DELETE',`${base}/${identifier}?sendUpdates=none`);
    await connection.persist();
    return {status:'disabled',eventId:identifier,eventUrl:null,lastSyncedAt:new Date().toISOString(),error:null};
  }
  // Google retains cancelled IDs. Reserve a replacement durably before inserting,
  // so schedule removal/re-addition and crashed retries cannot create duplicates.
  if(tombstone || existing?.status==='cancelled') {
    const cycle=(task.calendarCycle || 0)+1;
    identifier=eventId(task.ownerUid,`${task.id}:${cycle}`);
    const ref=db.collection('admin_tasks').doc(task.id);
    await db.runTransaction(async tx=>{const snap=await tx.get(ref);if(!snap.exists || snap.data().revision!==task.revision)throw new CalendarError('calendar_connection_changed',409);tx.update(ref,{calendarCycle:cycle,'calendar.eventId':identifier});});
    existing=null;
  }
  const body = eventBody(task,config.origin);
  let result;
  try {
    if (existing) result = await request('PATCH',`${base}/${identifier}?sendUpdates=none`,{...body,status:'confirmed'});
    else {
      try { result = await request('POST',`${base}?sendUpdates=none`,{id:identifier,...body}); }
      catch (error) {
        if (Number(error?.response?.status) !== 409) throw error;
        const found = await request('GET',`${base}/${identifier}`);
        if (found.extendedProperties?.private?.devengineTaskId !== task.id || found.extendedProperties?.private?.devengineOwnerUid !== task.ownerUid) throw new CalendarError('calendar_event_ownership_mismatch',409);
        result = await request('PATCH',`${base}/${identifier}?sendUpdates=none`,{...body,status:'confirmed'});
      }
    }
    await connection.persist();
  } catch (error) { if (error instanceof CalendarError) throw error; throw new CalendarError(providerCode(error),502); }
  return {status:'synced',eventId:identifier,eventUrl:typeof result.htmlLink==='string' && result.htmlLink.startsWith('https://www.google.com/calendar/')?result.htmlLink:null,lastSyncedAt:new Date().toISOString(),error:null};
}
async function disconnect(db, uid, options = {}) {
  const connection = await calendarClient(db,uid,options.config,options.factory);
  try { await connection.client.revokeToken(connection.client.credentials.refresh_token); }
  catch { throw new CalendarError('calendar_revocation_failed',502); }
  await db.runTransaction(async tx => {
    const snapshot = await tx.get(connection.ref);
    if (snapshot.exists && snapshot.data().generation === connection.record.generation) tx.set(connection.ref,{uid,disconnected:true,generation:randomUUID(),clientId:connection.config.clientId});
  });
}
module.exports = { syncTask, disconnect, calendarClient, providerCode };
