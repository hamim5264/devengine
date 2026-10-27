const { CalendarError } = require('../calendar/config');
const { hash } = require('./model');
const { emailConfiguration,sendTaskEmail,EMAIL_REJECTION_CODES } = require('./email');
const {ADMIN_EMAIL}=require('../admin');
const EMAIL_EVENTS=Object.freeze(['assigned','upcoming','overdue','status_changed','completed','calendar_sync_failed']);
const defaults=()=>({enabled:true,events:[...EMAIL_EVENTS]});
const preferenceRef=(db,uid)=>db.collection('admin_task_jobs').doc(`email_preferences_${uid}`);
function validatePreferences(value){
  if(!value || typeof value!=='object' || Array.isArray(value) || Object.keys(value).some(k=>!['enabled','events'].includes(k)) || typeof value.enabled!=='boolean' || !Array.isArray(value.events) || value.events.some(v=>!EMAIL_EVENTS.includes(v)))throw new CalendarError('invalid_email_preferences');
  return {enabled:value.enabled,events:[...new Set(value.events)]};
}
async function readEmailPreferences(db,uid){const snapshot=await preferenceRef(db,uid).get();return snapshot.exists?validatePreferences(snapshot.data().preferences || defaults()):defaults();}
function emailEvent(event){return /^reminder_/.test(event)?'upcoming':['created','assigned'].includes(event)?'assigned':EMAIL_EVENTS.includes(event)?event:null;}
function emailAllowed(preferences,event){return preferences.enabled && preferences.events.includes(emailEvent(event));}
async function saveEmailPreferences(db,uid,value){const preferences=validatePreferences(value);await db.runTransaction(async tx=>{const ref=preferenceRef(db,uid),snap=await tx.get(ref);tx.set(ref,{...(snap.exists?snap.data():{}),kind:'email_preferences',ownerUid:uid,preferences,updatedAt:new Date().toISOString()});});return preferences;}
async function sendTestEmail(db,auth,actor,requestId,options={}){
  if(typeof requestId!=='string' || !/^[a-zA-Z0-9_-]{16,128}$/.test(requestId))throw new CalendarError('invalid_test_request');
  if(!emailConfiguration(options.env || process.env).configured)throw new CalendarError('email_not_configured',503);
  const now=options.now || Date.now(),day=new Date(now).toISOString().slice(0,10);
  const ref=db.collection('admin_task_jobs').doc(hash(`test-email:${actor.uid}:${requestId}`)),limit=preferenceRef(db,actor.uid);
  const reservation=await db.runTransaction(async tx=>{
    const seen=await tx.get(ref),rate=await tx.get(limit);
    if(seen.exists){if(seen.data().status==='done')return 'done';throw new CalendarError(seen.data().status==='delivery_unknown'?'email_delivery_unknown':'test_email_already_attempted',409);}
    const previous=rate.exists?rate.data():{},count=previous.testDay===day?(previous.testCount || 0):0;
    if(count>=3 || now-(previous.lastTestAtMs || 0)<60000)throw new CalendarError('test_email_rate_limited',429);
    tx.set(limit,{...previous,kind:'email_preferences',ownerUid:actor.uid,testDay:day,testCount:count+1,lastTestAtMs:now});
    tx.create(ref,{kind:'email_test',ownerUid:actor.uid,status:'sending',createdAt:new Date(now).toISOString()});return 'send';
  });
  if(reservation==='done')return {status:'provider_accepted',duplicatePrevented:true};
  try{
    const user=await auth.getUser(actor.uid);
    if(user.disabled || user.email?.toLowerCase()!==ADMIN_EMAIL)throw new CalendarError('email_recipient_unavailable',400);
    await (options.send || sendTaskEmail)(user,{id:'test-email',title:'DevEngine email connection',description:'A test notification requested by the signed-in administrator.',status:'todo',priority:'medium',dueAt:null,assignedByName:user.displayName || 'Administrator'},'test_email',true);
    await ref.update({status:'done',acceptedAt:new Date().toISOString()});return {status:'provider_accepted'};
  }catch(error){
    const code=['email_delivery_unknown','email_not_configured','email_rate_limited','email_recipient_unavailable',...EMAIL_REJECTION_CODES].includes(error.code)?error.code:'email_delivery_unknown';
    await ref.update({status:code==='email_delivery_unknown'?'delivery_unknown':'failed',error:code});throw new CalendarError(code,error.status || 502);
  }
}
module.exports={EMAIL_EVENTS,readEmailPreferences,saveEmailPreferences,validatePreferences,emailEvent,emailAllowed,sendTestEmail};
