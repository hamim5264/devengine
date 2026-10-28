const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { settingsRef, privateRef, readSettings, validateSettings, requireAdmin, resolveActor, roleEnabled, greeting, maintenance, string } = require('./config');
const { providerDetails, usageDetails } = require('./reporting');
const { collectContext } = require('./context');
const { answer, validateKey, modelCatalog } = require('./provider');
const { reserveRequest, recordUsage, dayKey } = require('./limits');
const OPTIONS={region:'us-central1',maxInstances:3,concurrency:12,memory:'256MiB',timeoutSeconds:120,enforceAppCheck:process.env.DEVKITTY_REQUIRE_APP_CHECK==='true',cors:[/^https:\/\/([a-z0-9-]+\.)?devenginehq\.com$/, 'https://thedevengine.vercel.app', /^https:\/\/(thedevengine|devengine)(-[a-z0-9-]+)?\.vercel\.app$/, /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/]};
const db=()=>getFirestore();
async function conversationActor(request){
  const actor=await resolveActor(request,db());
  // Public surface can only reduce privileges; authentication remains authoritative.
  return request.data?.surface==='public'?{role:'visitor',uid:actor.uid,name:'bunny',session:`public:${actor.session}`} : actor;
}
async function credentials() {const snap=await privateRef(db()).get();return snap.data()?.apiKey || process.env.OPENROUTER_API_KEY || '';}
exports.devkittyBootstrap=onCall({...OPTIONS,timeoutSeconds:30},async request=>{
  const actor=await conversationActor(request); const settings=await readSettings(db());
  return {role:actor.role,name:actor.name,uid:actor.uid,session:actor.session,enabled:roleEnabled(settings,actor.role),configured:!!(await credentials()),greeting:greeting(settings,actor),autoEmployeeGreeting:settings.autoEmployeeGreeting,maxInputLength:3000};
});
exports.devkittyChat=onCall(OPTIONS,async request=>{
  const settings=await readSettings(db()),actor=await conversationActor(request);
  const input=request.data?.messages;
  if(!Array.isArray(input)||!input.length||input.length>16) throw new HttpsError('invalid-argument','Start a new conversation or send up to 16 recent messages.');
  const messages=input.map(message=>{
    if(!['user','assistant'].includes(message?.role)||typeof message.content!=='string'||message.content.length>(message.role==='user'?3000:14000)) throw new HttpsError('invalid-argument','Please shorten your message.');
    return {role:message.role,content:message.content.trim().replace(/sk-or-[a-z0-9-]{20,}/gi,'[API key removed]')};
  });
  if(messages.at(-1).role!=='user'||!messages.at(-1).content||messages.reduce((sum,item)=>sum+item.content.length,0)>30000) throw new HttpsError('invalid-argument','Please start a new conversation or shorten your message.');
  if(!roleEnabled(settings,actor.role)) return {text:maintenance(settings),links:[],sources:[],role:actor.role,maintenance:true,groundedAt:new Date().toISOString()};
  const apiKey=await credentials();
  if(!apiKey) throw new HttpsError('failed-precondition','DevKitty is not connected yet. Administration needs to add an API key in DevKitty settings.');
  const usageRef=await reserveRequest(db(),request,actor,settings);
  try {
    const question=messages.filter(item=>item.role==='user').slice(-2).map(item=>item.content).join('\n');
    const context=await collectContext(db(),actor,settings,question);
    const result=await answer({apiKey,settings,actor,context,messages,recordUsage:(usage,model)=>recordUsage(usageRef,usage,model,settings.billingMode)});
    await usageRef.set({successful:FieldValue.increment(1)},{merge:true});
    return {...result,role:actor.role,groundedAt:new Date().toISOString()};
  } catch(error) {
    await usageRef.set({errors:FieldValue.increment(1)},{merge:true}).catch(()=>{});
    if(error instanceof HttpsError) throw error;
    throw new HttpsError('internal','DevKitty could not complete this message. Please try again.');
  }
});
exports.devkittyAdmin=onCall(OPTIONS,async request=>{
  const actor=await requireAdmin(request,db()); const action=request.data?.action || 'read';
  if(action==='read') {
    const [settings,key,usage,knowledge]=await Promise.all([readSettings(db()),privateRef(db()).get(),db().doc(`devkitty_usage/${dayKey()}`).get(),db().collection('devkitty_knowledge').limit(200).get()]);
    return {settings,configured:!!(key.data()?.apiKey || process.env.OPENROUTER_API_KEY),keyHint:key.data()?.keyHint || '',usage:usage.data() || {},knowledge:knowledge.docs.map(snapshot=>({...snapshot.data(),id:snapshot.id}))};
  }
  if(action==='models') return {models:await modelCatalog()};
  if(action==='insights') {
    const [providerResult,usageResult]=await Promise.allSettled([credentials().then(providerDetails),usageDetails(db())]);
    const provider=providerResult.status==='fulfilled'?providerResult.value:{status:'unavailable',checkedAt:new Date().toISOString()};
    const usageReport=usageResult.status==='fulfilled'?{...usageResult.value,status:'connected'}:{since:new Date(Date.now()-29*86400000).toISOString().slice(0,10),models:[],status:'unavailable'};
    return {provider,usageReport};
  }
  if(action==='setEnabled') {
    if(typeof request.data.enabled!=='boolean') throw new HttpsError('invalid-argument','Choose whether DevKitty is enabled.');
    await settingsRef(db()).set({enabled:request.data.enabled,updatedAt:new Date().toISOString(),updatedBy:actor.uid},{merge:true});
    return {enabled:request.data.enabled};
  }
  if(action==='save') {
    const settings=validateSettings(request.data.settings);
    const key=string(request.data.apiKey,300);
    if(key) await validateKey(key);
    const batch=db().batch();
    batch.set(settingsRef(db()),{...settings,updatedAt:new Date().toISOString(),updatedBy:actor.uid});
    if(key) batch.set(privateRef(db()),{apiKey:key,keyHint:`••••${key.slice(-4)}`,updatedAt:new Date().toISOString(),updatedBy:actor.uid});
    if(request.data.removeKey===true) batch.delete(privateRef(db()));
    await batch.commit();return {saved:true};
  }
  if(action==='saveKnowledge') {
    const item=request.data.item || {};
    const title=string(item.title,160),content=string(item.content,12000);
    const audiences=Array.isArray(item.audiences)?[...new Set(item.audiences.filter(role=>['visitor','employee','admin'].includes(role)))]:[];
    if(!title||!content||!audiences.length) throw new HttpsError('invalid-argument','Add a title, content and at least one audience.');
    const id=string(item.id,100);
    if(id.includes('/')) throw new HttpsError('invalid-argument','Invalid knowledge item.');
    if(!id && (await db().collection('devkitty_knowledge').limit(200).get()).size>=200) throw new HttpsError('resource-exhausted','Use up to 200 curated knowledge notes.');
    const ref=id?db().doc(`devkitty_knowledge/${id}`):db().collection('devkitty_knowledge').doc();
    const url=string(item.url,300);
    if(url && (!/^\/[a-z0-9/_-]*$/i.test(url)||url.startsWith('//'))) throw new HttpsError('invalid-argument','Use a local DevEngine page path.');
    await ref.set({title,content,audiences,url,keywords:string(item.keywords,500),enabled:item.enabled!==false,updatedAt:new Date().toISOString()});return {id:ref.id};
  }
  if(action==='deleteKnowledge') {
    const id=string(request.data.id,100);if(!id||id.includes('/')) throw new HttpsError('invalid-argument','Invalid knowledge item.');
    await db().doc(`devkitty_knowledge/${id}`).delete();return {deleted:true};
  }
  throw new HttpsError('invalid-argument','Unknown DevKitty action.');
});
