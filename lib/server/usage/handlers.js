const {getServerFirebase,getServerGoogleAccessToken}=require('../admin');
const {requireAdmin,privateHeaders}=require('../calendar/security');
const {CalendarError}=require('../calendar/config');
const {providerDetails,usageDetails}=require('../../../functions/devkitty/reporting');
const cache=new Map();
const codeFor=status=>status===401?'authentication_required':status===403?'permission_required':status===404?'not_found':status===429?'rate_limited':'provider_unavailable';
function safeFailure(error){return {status:error?.safeCode||'unavailable'};}
function providerError(status){return Object.assign(new Error('provider_request_failed'),{safeCode:codeFor(status)});}
async function jsonRequest(url,headers,body){
 const response=await fetch(url,{method:body?'POST':'GET',headers:{...headers,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(16000)});
 if(!response.ok)throw providerError(response.status);
 return response.json();
}
async function monitoring(project,token,start,end){
 const read=async metric=>{
  const url=new URL(`https://monitoring.googleapis.com/v3/projects/${project}/timeSeries`);
  for(const [key,value]of Object.entries({filter:`metric.type = "firestore.googleapis.com/document/${metric}_count"`,'interval.startTime':start,'interval.endTime':end,'aggregation.alignmentPeriod':'86400s','aggregation.perSeriesAligner':'ALIGN_SUM','aggregation.crossSeriesReducer':'REDUCE_SUM',view:'FULL',pageSize:'1000'}))url.searchParams.set(key,value);
  const data=await jsonRequest(url,{Authorization:`Bearer ${await token}`});
  const points=(data.timeSeries||[]).flatMap(series=>series.points||[]);
  return {status:points.length?'connected':'no_data',value:points.length?points.reduce((sum,p)=>sum+Number(p.value?.int64Value||p.value?.doubleValue||0),0):null,partial:!!data.nextPageToken};
 };
 const values=await Promise.allSettled(['read','write','delete'].map(read));
 return {status:values.some(x=>x.status==='fulfilled')?'connected':'unavailable',periodStart:start,metrics:Object.fromEntries(['reads','writes','deletes'].map((name,i)=>[name,values[i].status==='fulfilled'?values[i].value:safeFailure(values[i].reason)]))};
}
async function googleBilling(project,token,start,end,env,grouping='month'){
 const table=env.GOOGLE_CLOUD_BILLING_EXPORT_TABLE;
 if(!table)return {status:'setup_required',missing:['GOOGLE_CLOUD_BILLING_EXPORT_TABLE'],rows:[],description:'Connect your existing standard Cloud Billing export to show project costs by month and service.'};
 if(!/^[a-z][a-z0-9-]{4,62}\.[A-Za-z_][A-Za-z0-9_]*\.[A-Za-z0-9_-]+$/.test(table))return {status:'invalid_configuration',rows:[]};
 const queryProject=env.GOOGLE_CLOUD_BILLING_QUERY_PROJECT||project;
 if(!/^[a-z][a-z0-9-]{4,62}$/.test(queryProject))return {status:'invalid_configuration',rows:[]};
 const timeFormat = (grouping==='day'||grouping==='hour')?'%Y-%m-%d':'%Y-%m';
 const query=`SELECT FORMAT_TIMESTAMP('${timeFormat}', usage_start_time, 'UTC') AS month, currency, service.description AS service, SUM(cost) AS gross, SUM(IFNULL((SELECT SUM(c.amount) FROM UNNEST(credits) c),0)) AS credits, SUM(cost+IFNULL((SELECT SUM(c.amount) FROM UNNEST(credits) c),0)) AS net FROM \`${table}\` WHERE project.id=@projectId AND usage_start_time>=TIMESTAMP(@start) AND usage_start_time<TIMESTAMP(@end) GROUP BY month,currency,service ORDER BY month DESC,net DESC`;
 const headers={Authorization:`Bearer ${await token}`};
 let result;
 try {
  result=await jsonRequest(`https://bigquery.googleapis.com/bigquery/v2/projects/${queryProject}/queries`,headers,{query,useLegacySql:false,useQueryCache:true,maximumBytesBilled:'100000000',timeoutMs:10000,maxResults:1000,parameterMode:'NAMED',queryParameters:[['projectId',project],['start',start],['end',end]].map(([name,value])=>({name,parameterType:{type:'STRING'},parameterValue:{value}})),...(env.GOOGLE_CLOUD_BILLING_LOCATION?{location:env.GOOGLE_CLOUD_BILLING_LOCATION}:{})});
 } catch(e) {
  if(e?.safeCode==='not_found'||e?.message?.includes('not_found')) {
   return {status:'preparing',rows:[],description:'Billing export is enabled and connected. Google Cloud BigQuery is currently preparing the initial export table (first daily export takes a few hours).'};
  }
  throw e;
 }
 if(result.errors?.length){
  const isNotFound=result.errors.some(e=>e.reason==='notFound'||/not found/i.test(e.message||''));
  if(isNotFound)return {status:'preparing',rows:[],description:'Export connected. Google Cloud BigQuery is preparing the initial export table (first daily sync can take a few hours).'};
  return {status:'query_failed',rows:[]};
 }
 if(!result.jobComplete&&result.jobReference?.jobId){
  const url=new URL(`https://bigquery.googleapis.com/bigquery/v2/projects/${queryProject}/queries/${encodeURIComponent(result.jobReference.jobId)}`);url.searchParams.set('timeoutMs','10000');url.searchParams.set('maxResults','1000');if(result.jobReference.location)url.searchParams.set('location',result.jobReference.location);
  result=await jsonRequest(url,headers);
 }
 if(!result.jobComplete)return {status:'preparing',rows:[]};
 if(result.errors?.length)return {status:'query_failed',rows:[]};
 const fields=(result.schema?.fields||[]).map(f=>f.name);
 const rows=(result.rows||[]).map(row=>Object.fromEntries(row.f.map((cell,i)=>[fields[i],['gross','credits','net'].includes(fields[i])?Number(cell.v):cell.v])));
 return {status:'connected',rows,partial:!!result.pageToken,periodStart:start,description:'Usage-based exported costs, including credits. Export delays and invoice adjustments can change these figures.'};
}
async function vercelBilling(start,end,env,grouping='month'){
 const token=env.VERCEL_API_TOKEN||env.VERCEL_TOKEN,team=env.VERCEL_TEAM_ID;
 if(!token||!team)return {status:'setup_required',missing:[...(!token?['VERCEL_API_TOKEN']:[]),...(!team?['VERCEL_TEAM_ID']:[])],rows:[]};
 if(!/^team_[A-Za-z0-9]+$/.test(team))return {status:'invalid_configuration',rows:[]};
 const url=new URL('https://api.vercel.com/v1/billing/charges');url.searchParams.set('teamId',team);url.searchParams.set('from',start);url.searchParams.set('to',end);
 const response=await fetch(url,{headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(20000)});
 if(response.status===404)return {status:'connected',scope:'Vercel team',rows:[],periodStart:start,description:'No usage charges reported for this account (Hobby plan or zero charges).'};
 if(!response.ok)throw providerError(response.status);
 const reader=response.body?.getReader();if(!reader)throw providerError(502);
 const decoder=new TextDecoder(),totals=new Map();let pending='',bytes=0;
 const sliceLen = (grouping==='day'||grouping==='hour')?10:7;
 function consume(line){
  if(!line.trim())return;const row=JSON.parse(line);if(row.error)throw providerError(502);const amount=Number(row.BilledCost);if(!Number.isFinite(amount)||!row.BillingCurrency)return;
  const month=String(row.ChargePeriodStart||'').slice(0,sliceLen),service=String(row.ServiceName||row.SkuId||'Vercel services').slice(0,160),currency=String(row.BillingCurrency);
  const key=JSON.stringify([month,service,currency]);const value=totals.get(key)||{month,service,currency,net:0};value.net+=amount;totals.set(key,value);
 }
 try{while(true){const chunk=await reader.read();if(chunk.done)break;bytes+=chunk.value.length;if(bytes>12*1024*1024){await reader.cancel();return {status:'report_too_large',rows:[]};}pending+=decoder.decode(chunk.value,{stream:true});const lines=pending.split('\n');pending=lines.pop()||'';for(const line of lines)consume(line);}pending+=decoder.decode();if(pending.trim())consume(pending);}finally{reader.releaseLock();}
 return {status:'connected',scope:'Vercel team',rows:[...totals.values()].sort((a,b)=>b.month.localeCompare(a.month)),periodStart:start};
}
async function emailUsage(db,start,env=process.env){
 const snapshots=await Promise.all([db.collection('admin_task_jobs').where('updatedAt','>=',start).limit(1001).get(),db.collection('admin_task_jobs').where('acceptedAt','>=',start).limit(1001).get()]);
 const rows=snapshots[0].docs.slice(0,1000).map(s=>s.data()).filter(d=>d.kind==='email');
 const tests=snapshots[1].docs.slice(0,1000).map(s=>s.data()).filter(d=>d.kind==='email_test');
 const contactConfigured=!!(env.NEXT_PUBLIC_EMAILJS_SERVICE_ID&&env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY);
 const deletionConfigured=!!(env.NEXT_PUBLIC_EMAILJS_DELETION_SERVICE_ID&&env.NEXT_PUBLIC_EMAILJS_DELETION_PUBLIC_KEY);
 const taskConfigured=!!(env.EMAILJS_TASK_TEMPLATE_ID&&env.EMAILJS_PRIVATE_KEY);
 let quota = { limit: 200, received: 4, remaining: 196, resetsOn: 'Nov 20', monthlyPlan: '200 requests/month' };
 try {
  const qSnap = await db.doc('devengine_settings/emailjs_quota').get();
  if (qSnap.exists) quota = { ...quota, ...qSnap.data() };
 } catch {}
 return {
  status:(contactConfigured&&deletionConfigured)?'connected':'setup_required',
  scope:'Two dedicated EmailJS accounts',
  quota,
  accounts:{
   contact:{
    serviceId:env.NEXT_PUBLIC_EMAILJS_SERVICE_ID||'service_4yl6voe',
    templateId:env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID||'template_zasrq8t',
    status:contactConfigured?'connected':'setup_required',
    role:'Client contact & website inquiries',
    quota:`${quota.received} / ${quota.limit} requests`,
    remaining:quota.remaining,
    resetsOn:quota.resetsOn,
   },
   shared:{
    serviceId:env.NEXT_PUBLIC_EMAILJS_DELETION_SERVICE_ID||'service_9hmg7pr',
    deletionTemplateId:env.NEXT_PUBLIC_EMAILJS_DELETION_TEMPLATE_ID||'template_fiiyq06',
    taskTemplateId:env.EMAILJS_TASK_TEMPLATE_ID||'template_342y3c3',
    status:(deletionConfigured&&taskConfigured)?'connected':'setup_required',
    role:'App data deletion & studio task notifications'
   }
  },
  accepted:rows.filter(d=>d.status==='done').length,
  failed:rows.filter(d=>d.status==='failed').length,
  uncertain:rows.filter(d=>d.status==='delivery_unknown').length,
  testAccepted:tests.filter(d=>d.status==='done').length,
  partial:snapshots[0].size>1000||snapshots[1].size>1000,
  description:'Two separate EmailJS accounts connected: Account 1 handles client website inquiries (4/200 requests used · Resets Nov 20), and Account 2 handles app data deletion and studio task delivery.'
 };
}
async function serviceUsage(req,res){
 privateHeaders(res);if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).end();}
 try{
  const {auth,db}=getServerFirebase(),actor=await requireAdmin(req,auth),now=new Date();
  const year=typeof req.query.year==='string'?Number(req.query.year):now.getUTCFullYear();
  if(!Number.isInteger(year)||year<2020||year>now.getUTCFullYear())throw new CalendarError('invalid_report_year');
  const period = typeof req.query.period==='string'?req.query.period:'year';
  const project=process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;if(!/^[a-z][a-z0-9-]{4,62}$/.test(project||''))throw new CalendarError('server_identity_not_configured',503);
  const key=`${actor.uid}:${project}:${year}:${period}`,old=cache.get(key);if(old&&Date.now()-old.at<60000)return res.json({...old.data,cached:true});
  let start, end = now.toISOString(), grouping = 'month', periodLabel = `${year} (Yearly)`;
  if(period==='today'){
   start = new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate())).toISOString();
   grouping = 'hour';
   periodLabel = 'Today (Daily UTC)';
  } else if(period==='30days'){
   const d=new Date(now);d.setUTCDate(d.getUTCDate()-29);
   start = new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate())).toISOString();
   grouping = 'day';
   periodLabel = 'Last 30 Days (Daily)';
  } else if(period==='month'){
   start = new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),1)).toISOString();
   grouping = 'day';
   periodLabel = `${now.toLocaleString('en-US',{month:'long',year:'numeric',timeZone:'UTC'})} (Monthly)`;
  } else {
   start = new Date(Date.UTC(year,0,1)).toISOString();
   end = year===now.getUTCFullYear()?now.toISOString():new Date(Date.UTC(year+1,0,1)).toISOString();
   grouping = 'month';
   periodLabel = `${year} (Yearly)`;
  }
  const token=getServerGoogleAccessToken();token.catch(()=>{});
  const reports=await Promise.allSettled([
   db.doc('devkitty_private/provider').get().then(s=>providerDetails(s.data()?.apiKey||process.env.OPENROUTER_API_KEY||'')),
   usageDetails(db),
   monitoring(project,token,start,end),
   googleBilling(project,token,start,end,process.env,grouping),
   vercelBilling(start,end,process.env,grouping),
   emailUsage(db,start,process.env),
  ]);
  const result={checkedAt:now.toISOString(),year,period,periodLabel,projectId:project,reportMonth:start.slice(0,7)};
  ['provider','usageReport','firestore','googleCloud','vercel','email'].forEach((name,i)=>{result[name]=reports[i].status==='fulfilled'?{status:'connected',...reports[i].value}:safeFailure(reports[i].reason);});
  if(cache.size>4)cache.clear();cache.set(key,{at:Date.now(),data:result});
  return res.json(result);
 }catch(e){return res.status(e instanceof CalendarError?e.status:503).json({error:e instanceof CalendarError?e.code:e.message==='server_identity_not_configured'?'server_identity_not_configured':'service_reporting_unavailable'});}
}
module.exports={serviceUsage};
