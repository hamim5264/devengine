const { FieldPath } = require('firebase-admin/firestore');
const BASE='https://openrouter.ai/api/v1';
const number=value=>typeof value==='number'&&Number.isFinite(value)?value:null;
async function providerDetails(apiKey) {
  if(!apiKey) return {status:'not-configured',checkedAt:new Date().toISOString()};
  async function read(path) {
    try {
      const response=await fetch(`${BASE}/${path}`,{headers:{Authorization:`Bearer ${apiKey}`},signal:AbortSignal.timeout(10000)});
      if(!response.ok) return null;
      return (await response.json()).data || null;
    } catch {return null;}
  }
  const [key,credits]=await Promise.all([read('key'),read('credits')]);
  const totalCredits=number(credits?.total_credits),totalUsage=number(credits?.total_usage);
  return {
    status:key?'connected':'unavailable',checkedAt:new Date().toISOString(),
    keyUsage:number(key?.usage),dailyUsage:number(key?.usage_daily),weeklyUsage:number(key?.usage_weekly),monthlyUsage:number(key?.usage_monthly),
    keyLimit:number(key?.limit),keyRemaining:number(key?.limit_remaining),limitReset:typeof key?.limit_reset==='string'?key.limit_reset:null,
    totalCredits,totalUsage,accountBalance:totalCredits!==null&&totalUsage!==null?totalCredits-totalUsage:null,
  };
}
async function usageDetails(db) {
  const start=new Date();start.setUTCDate(start.getUTCDate()-29);
  const since=start.toISOString().slice(0,10);
  const days=await db.collection('devkitty_usage').where(FieldPath.documentId(),'>=',since).orderBy(FieldPath.documentId(),'desc').limit(30).get();
  const models=new Map();
  for(const day of days.docs) for(const item of Object.values(day.data().models || {})) {
    if(typeof item.model!=='string') continue;
    const aggregate=models.get(item.model) || {model:item.model,calls:0,inputTokens:0,outputTokens:0,reportedCost:0,costSamples:0};
    for(const field of ['calls','inputTokens','outputTokens','reportedCost','costSamples']) aggregate[field]+=number(item[field]) || 0;
    models.set(item.model,aggregate);
  }
  return {since,models:[...models.values()].sort((a,b)=>b.calls-a.calls)};
}
module.exports={providerDetails,usageDetails};
