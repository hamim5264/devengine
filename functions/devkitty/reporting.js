const BASE='https://openrouter.ai/api/v1';
const number=value=>(typeof value==='number'||typeof value==='string'&&value.trim()!=='')&&Number.isFinite(Number(value))?Number(value):null;
async function providerDetails(apiKey) {
  if(!apiKey) return {status:'not-configured',checkedAt:new Date().toISOString()};
  async function read(path) {
    try {
      const response=await fetch(`${BASE}/${path}`,{headers:{Authorization:`Bearer ${apiKey}`},signal:AbortSignal.timeout(10000)});
      if(!response.ok) return {data:null,status:response.status===401?'invalid_key':response.status===403?'permission_required':response.status===429?'rate_limited':'unavailable'};
      return {data:(await response.json()).data || null,status:'connected'};
    } catch {return {data:null,status:'unavailable'};}
  }
  const [keyResult,creditsResult]=await Promise.all([read('key'),read('credits')]);
  const key=keyResult.data,credits=creditsResult.data;
  const totalCredits=number(credits?.total_credits),totalUsage=number(credits?.total_usage);
  return {
    status:key?'connected':keyResult.status,keyStatus:keyResult.status,creditsStatus:creditsResult.status,checkedAt:new Date().toISOString(),
    keyUsage:number(key?.usage),dailyUsage:number(key?.usage_daily),weeklyUsage:number(key?.usage_weekly),monthlyUsage:number(key?.usage_monthly),
    keyLimit:number(key?.limit),keyRemaining:number(key?.limit_remaining),limitReset:typeof key?.limit_reset==='string'?key.limit_reset:null,
    totalCredits,totalUsage,accountBalance:totalCredits!==null&&totalUsage!==null?totalCredits-totalUsage:null,
    isFreeTier:typeof key?.is_free_tier==='boolean'?key.is_free_tier:null,expiresAt:typeof key?.expires_at==='string'?key.expires_at:null,
  };
}
async function usageDetails(db) {
  const start=new Date();start.setUTCDate(start.getUTCDate()-29);
  const since=start.toISOString().slice(0,10);
  // Daily IDs are known. Direct document reads need no range/descending index.
  const refs=Array.from({length:30},(_,offset)=>{const date=new Date(start);date.setUTCDate(date.getUTCDate()+offset);return db.doc(`devkitty_usage/${date.toISOString().slice(0,10)}`);});
  const days={docs:(await db.getAll(...refs)).filter(snapshot=>snapshot.exists)};
  const models=new Map();
  for(const day of days.docs) for(const item of Object.values(day.data().models || {})) {
    if(!item || typeof item.model!=='string') continue;
    const billingMode=['free','paid'].includes(item.billingMode)?item.billingMode:'legacy';
    const id=`${billingMode}:${item.model}`;
    const aggregate=models.get(id) || {model:item.model,billingMode,calls:0,inputTokens:0,outputTokens:0,reportedCost:0,costSamples:0};
    for(const field of ['calls','inputTokens','outputTokens','reportedCost','costSamples']) aggregate[field]+=number(item[field]) || 0;
    models.set(id,aggregate);
  }
  return {since,models:[...models.values()].sort((a,b)=>b.calls-a.calls)};
}
module.exports={providerDetails,usageDetails};
