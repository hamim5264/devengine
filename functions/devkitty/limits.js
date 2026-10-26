const { createHash } = require('node:crypto');
const { HttpsError } = require('firebase-functions/v2/https');
const { FieldValue, Timestamp } = require('firebase-admin/firestore');
function dayKey() {return new Date().toISOString().slice(0,10);}
async function reserveRequest(db,request,actor,settings) {
  const now=Date.now(),day=dayKey(),minute=Math.floor(now/60000);
  const ip=request.rawRequest.ip || request.rawRequest.socket?.remoteAddress || 'unknown';
  const hash=value=>createHash('sha256').update(value).digest('hex');
  const identities=[`ip:${hash(ip)}`,...(actor.uid?[`user:${hash(actor.uid)}`]:[])];
  const refs=identities.flatMap(id=>[
    {ref:db.doc(`devkitty_limits/${hash(`${day}:${minute}:${id}`)}`),limit:settings.messagesPerMinute*(actor.role==='admin'?3:1),expires:now+120000},
    {ref:db.doc(`devkitty_limits/${hash(`${day}:${id}`)}`),limit:settings.visitorDailyLimit*(actor.role==='visitor'?1:5),expires:now+172800000},
  ]);
  const usageRef=db.doc(`devkitty_usage/${day}`);
  await db.runTransaction(async tx=>{
    const snapshots=await Promise.all([tx.get(usageRef),...refs.map(item=>tx.get(item.ref))]);
    if((snapshots[0].data()?.requests || 0)>=settings.dailyMessageLimit) throw new HttpsError('resource-exhausted','DevKitty has reached today’s message limit. Please try again tomorrow.');
    refs.forEach((item,index)=>{if((snapshots[index+1].data()?.count || 0)>=item.limit) throw new HttpsError('resource-exhausted','You’ve reached DevKitty’s message limit. Please try again later, bunny.');});
    tx.set(usageRef,{requests:FieldValue.increment(1),[`${actor.role}Requests`]:FieldValue.increment(1),updatedAt:new Date().toISOString()},{merge:true});
    refs.forEach(item=>tx.set(item.ref,{count:FieldValue.increment(1),expiresAt:Timestamp.fromMillis(item.expires)},{merge:true}));
  });
  return usageRef;
}
async function recordUsage(ref,usage,model,billingMode) {
  const finite=value=>Number.isFinite(Number(value))?Math.max(0,Number(value)):0;
  const counters={inputTokens:FieldValue.increment(finite(usage.prompt_tokens)),outputTokens:FieldValue.increment(finite(usage.completion_tokens)),reportedCost:FieldValue.increment(finite(usage.cost)),costSamples:FieldValue.increment(usage.cost!=null&&Number.isFinite(Number(usage.cost))?1:0)};
  const id=createHash('sha256').update(`${billingMode}:${model}`).digest('hex');
  await ref.set({...counters,models:{[id]:{model,billingMode,calls:FieldValue.increment(1),...counters}}},{merge:true});
}
module.exports={reserveRequest,recordUsage,dayKey};
