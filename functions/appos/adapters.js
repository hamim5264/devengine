const { initializeApp,cert,getApps,deleteApp }=require('firebase-admin/app');
const { getFirestore,FieldPath }=require('firebase-admin/firestore');
const { createHash }=require('node:crypto');
const { api }=require('./http');
const { fail,text,url,moduleKeys,record,id,recordId:resourceId,pageCursor,serial }=require('./model');

async function remoteDb(secret,projectId) {
  if(!secret?.serviceAccount)fail('Save a Firebase service account before connecting.','failed-precondition');
  const name=`appos-${createHash('sha256').update(JSON.stringify(secret.serviceAccount)).digest('hex').slice(0,24)}`;
  let app=getApps().find(a=>a.name===name);
  if(!app){const old=getApps().filter(a=>a.name.startsWith('appos-'));if(old.length>=12)await deleteApp(old[0]);app=initializeApp({credential:cert(secret.serviceAccount),projectId},name);}
  return getFirestore(app);
}

function parseHeaders(config, secret) {
  const token=secret?.apiToken||secret?.apiKey||'';
  if(!token)return {};
  const type=config.authType||'bearer';
  if(type==='apikey')return {'X-API-Key':token};
  if(type==='header'&&config.authHeader)return {[config.authHeader]:token};
  if(type==='none')return {};
  return token.startsWith('Bearer ')||token.startsWith('Token ')?{Authorization:token}:{Authorization:`Bearer ${token}`};
}

function unwrapList(res, key) {
  if(Array.isArray(res))return res;
  if(!res||typeof res!=='object')return [];
  if(Array.isArray(res.items))return res.items;
  if(Array.isArray(res.data))return res.data;
  if(Array.isArray(res.results))return res.results;
  if(Array.isArray(res.records))return res.records;
  if(key&&Array.isArray(res[key]))return res[key];
  if(Array.isArray(res.rows))return res.rows;
  return [];
}

function unwrapCount(res) {
  if(typeof res==='number')return res;
  if(!res||typeof res!=='object')return 0;
  if(typeof res.count==='number')return res.count;
  if(typeof res.total==='number')return res.total;
  if(typeof res.totalCount==='number')return res.totalCount;
  if(typeof res.meta?.total==='number')return res.meta.total;
  if(typeof res.pagination?.total==='number')return res.pagination.total;
  const list=unwrapList(res);
  return list.length;
}

function integration(input={},secretInput={},previous={}) {
  const kind=input.kind;
  if(!['managed','firebase','supabase','django','node','laravel','api','bingi'].includes(kind))fail('Choose a supported backend.');
  const config={kind,connected:kind==='managed'||kind==='bingi',capabilities:kind==='managed'?moduleKeys:kind==='bingi'?['records','content','notifications']:[],projectId:'',baseUrl:'',collections:{},tables:{},endpoints:{},verifiedAt:'',health:'not_checked'};
  const secret={...previous};

  if(kind==='managed') {
    config.capabilities=moduleKeys;
  }
  if(kind==='bingi') {
    config.baseUrl='https://api.bingi.com.bd/api';
    if(secretInput.apiToken)secret.apiToken=text(secretInput.apiToken,4000);
  }
  if(kind==='firebase') {
    config.projectId=text(input.projectId,80);
    if(!/^[a-z][a-z0-9-]{4,60}$/.test(config.projectId)||config.projectId===process.env.GCLOUD_PROJECT||config.projectId===process.env.GOOGLE_CLOUD_PROJECT)fail('Use the external app’s Firebase project. DevEngine data uses the managed adapter.');
    for(const key of moduleKeys)if(input.collections?.[key]){const path=text(input.collections[key],200);if(!/^[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+)*$/.test(path))fail('Use a Firestore collection path with literal segments.');config.collections[key]=path;}
    if(!Object.keys(config.collections).length)fail('Map at least one data module to a collection.');
    if(secretInput.serviceAccount){let account;try{account=JSON.parse(secretInput.serviceAccount);}catch{fail('Enter valid service-account JSON.');}if(account.project_id!==config.projectId||typeof account.private_key!=='string'||!account.private_key.includes('BEGIN PRIVATE KEY')||typeof account.client_email!=='string'||!account.client_email.endsWith('.iam.gserviceaccount.com'))fail('Use a service account belonging to the selected project.');secret.serviceAccount={projectId:account.project_id,clientEmail:account.client_email,privateKey:account.private_key};}
    if(secret.serviceAccount?.projectId!==config.projectId)fail('Add the external project’s service account.');
  }
  if(kind==='supabase') {
    config.baseUrl=url(input.baseUrl);
    if(!config.baseUrl)fail('Enter a valid Supabase project URL.');
    for(const key of moduleKeys)if(input.tables?.[key]){const tbl=text(input.tables[key],100);if(/^[a-zA-Z0-9_-]+$/.test(tbl))config.tables[key]=tbl;}
    if(!Object.keys(config.tables).length)config.tables={records:'records',content:'posts',users:'profiles'};
    config.capabilities=Object.keys(config.tables);
    if(secretInput.apiKey)secret.apiKey=text(secretInput.apiKey,4000);
    else if(previous.apiBaseUrl!==config.baseUrl)fail('Enter a Supabase API key for the project.');
    if(!secret.apiKey)fail('Add the Supabase API key (anon or service_role).');
  }
  if(kind==='django') {
    config.baseUrl=url(input.baseUrl);
    if(!config.baseUrl)fail('Enter a valid Django API URL.');
    for(const key of moduleKeys)if(input.endpoints?.[key]){const ep=text(input.endpoints[key],160);if(/^\/?[a-zA-Z0-9_/-]+$/.test(ep))config.endpoints[key]=ep.startsWith('/')?ep:`/${ep}`;}
    if(!Object.keys(config.endpoints).length)config.endpoints={records:'/records/',content:'/posts/',users:'/users/'};
    config.capabilities=Object.keys(config.endpoints);
    if(secretInput.apiToken)secret.apiToken=text(secretInput.apiToken,4000);
    else if(previous.apiBaseUrl!==config.baseUrl)fail('Enter an API token for the Django backend.');
  }
  if(kind==='node') {
    config.baseUrl=url(input.baseUrl);
    if(!config.baseUrl)fail('Enter a valid Node.js API base URL.');
    for(const key of moduleKeys)if(input.endpoints?.[key]){const ep=text(input.endpoints[key],160);if(/^\/?[a-zA-Z0-9_/-]+$/.test(ep))config.endpoints[key]=ep.startsWith('/')?ep:`/${ep}`;}
    if(!Object.keys(config.endpoints).length)config.endpoints={records:'/api/records',content:'/api/content',users:'/api/users'};
    config.capabilities=Object.keys(config.endpoints);
    config.authType=['bearer','apikey','none'].includes(input.authType)?input.authType:'bearer';
    if(secretInput.apiToken)secret.apiToken=text(secretInput.apiToken,4000);
    else if(previous.apiBaseUrl!==config.baseUrl&&config.authType!=='none')fail('Enter an API token for the Node.js backend.');
  }
  if(kind==='laravel') {
    config.baseUrl=url(input.baseUrl);
    if(!config.baseUrl)fail('Enter a valid Laravel API base URL.');
    for(const key of moduleKeys)if(input.endpoints?.[key]){const ep=text(input.endpoints[key],160);if(/^\/?[a-zA-Z0-9_/-]+$/.test(ep))config.endpoints[key]=ep.startsWith('/')?ep:`/${ep}`;}
    if(!Object.keys(config.endpoints).length)config.endpoints={records:'/api/records',content:'/api/posts',users:'/api/users'};
    config.capabilities=Object.keys(config.endpoints);
    if(secretInput.apiToken)secret.apiToken=text(secretInput.apiToken,4000);
    else if(previous.apiBaseUrl!==config.baseUrl)fail('Enter an API token for the Laravel backend.');
  }
  if(kind==='api') {
    config.baseUrl=url(input.baseUrl);
    if(!config.baseUrl)fail('Enter a valid public HTTPS API URL.');
    for(const key of moduleKeys)if(input.endpoints?.[key]){const ep=text(input.endpoints[key],160);if(/^\/?[a-zA-Z0-9_/-]+$/.test(ep))config.endpoints[key]=ep.startsWith('/')?ep:`/${ep}`;}
    config.authType=['bearer','apikey','header','none'].includes(input.authType)?input.authType:'bearer';
    config.authHeader=text(input.authHeader,60)||'X-API-Key';
    config.paginationType=['page','offset','cursor'].includes(input.paginationType)?input.paginationType:'page';
    config.capabilities=Object.keys(config.endpoints).length?Object.keys(config.endpoints):moduleKeys;
    if(secretInput.apiToken)secret.apiToken=text(secretInput.apiToken,4000);
    else if(previous.apiBaseUrl!==config.baseUrl&&config.authType!=='none')fail('Enter a new API token when changing the API destination.');
  }
  return {config,secret:{...secret,apiBaseUrl:config.baseUrl}};
}

// =============================================================================
// ADAPTER REGISTRY ARCHITECTURE
// =============================================================================

function createManagedAdapter({ collection, supported, project }) {
  return {
    async probe() {
      for(const key of moduleKeys)await collection(key).limit(1).get();
      return moduleKeys;
    },
    async count(key) {
      supported(key);
      return (await collection(key).count().get()).data().count;
    },
    async list(key,cursor='',limit=40) {
      supported(key);
      let query=collection(key).orderBy(FieldPath.documentId()).limit(limit+1);
      if(cursor)query=query.startAfter(resourceId(cursor));
      const rows=await query.get();
      return {
        items:rows.docs.slice(0,limit).map(row=>project({id:row.id,data:row.data(),revision:row.data()._apposRevision,updatedAt:row.data()._apposUpdatedAt,etag:`${row.updateTime.seconds}:${row.updateTime.nanoseconds}`},key)),
        nextCursor:rows.size>limit?rows.docs[limit-1].id:''
      };
    },
    async write(key,operation,input,actor,app) {
      supported(key);
      const recordId=input.id?resourceId(input.id):null;
      const data=['delete','approve'].includes(operation)?null:record(input.data,app.workspace.fields[key]);
      if(operation==='approve'&&!app.workspace.fields[key].some(field=>field.key==='status'&&field.type==='text'))fail('Approval requires a text field named status.');
      if(operation!=='create'&&!recordId)fail('Select a record.');
      const ref=recordId?collection(key).doc(recordId):input.requestId?collection(key).doc(id(input.requestId)):collection(key).doc();
      await ref.firestore.runTransaction(async tx=>{
        const old=await tx.get(ref);
        if(operation==='create'&&old.exists)fail('This record already exists. Reload the list before creating another.','already-exists');
        if(operation!=='create'&&!old.exists)fail('Record not found.','not-found');
        if(old.exists&&(input.etag!==`${old.updateTime.seconds}:${old.updateTime.nanoseconds}`||Number(old.data()._apposRevision||0)!==Number(input.revision||0)))fail('This record changed. Reload it before saving.','aborted');
        if(operation==='delete')tx.delete(ref);
        else tx.set(ref,{...(operation==='approve'?{status:'approved'}:data),_apposRevision:Number(old.data()?._apposRevision||0)+1,_apposUpdatedAt:new Date().toISOString(),_apposActor:actor.uid},{merge:old.exists});
      });
      return {id:ref.id};
    }
  };
}

function createFirebaseAdapter({ store, collection, supported, project }) {
  const inner=createManagedAdapter({ collection, supported, project });
  return {
    ...inner,
    async probe(app) {
      const keys=Object.keys(app.integration.collections);
      for(const key of keys)await collection(key).limit(1).get();
      return keys;
    }
  };
}

function createSupabaseAdapter({ app, secret, config, supported, project }) {
  const base=config.baseUrl;
  const keyHeader={apikey:secret.apiKey||'',Authorization:`Bearer ${secret.apiKey||''}`};
  return {
    async probe() {
      const tbls=Object.keys(config.tables||{});
      if(!tbls.length)fail('No Supabase tables mapped.');
      const first=config.tables[tbls[0]];
      await api(base,`/rest/v1/${first}?limit=1`,null,'GET',undefined,keyHeader);
      return tbls;
    },
    async count(key) {
      supported(key);
      const tbl=config.tables?.[key];
      if(!tbl)return 0;
      const res=await api(base,`/rest/v1/${tbl}?select=*&limit=0`,null,'GET',undefined,{...keyHeader,Prefer:'count=exact'},true);
      const range=res.headers?.['content-range']||'';
      const m=range.match(/\/(\d+)$/);
      if(m)return Number(m[1]);
      return Array.isArray(res.data)?res.data.length:0;
    },
    async list(key,cursor='',limit=40) {
      supported(key);
      const tbl=config.tables?.[key];
      if(!tbl)return {items:[],nextCursor:''};
      const offset=Number(cursor)||0;
      const res=await api(base,`/rest/v1/${tbl}?select=*&limit=${limit+1}&offset=${offset}`,null,'GET',undefined,keyHeader);
      const rows=Array.isArray(res)?res:[];
      const items=rows.slice(0,limit).map(row=>project({id:resourceId(row.id||row.uuid||'row'),data:row,revision:row.revision||0,updatedAt:row.updated_at||''},key));
      return {items,nextCursor:rows.length>limit?String(offset+limit):''};
    },
    async write(key,operation,input) {
      supported(key);
      const tbl=config.tables?.[key];
      const recordId=input.id?resourceId(input.id):null;
      const data=['delete','approve'].includes(operation)?null:record(input.data,app.workspace.fields[key]);
      if(operation==='delete'){if(!recordId)fail('Select a record.');await api(base,`/rest/v1/${tbl}?id=eq.${encodeURIComponent(recordId)}`,null,'DELETE',undefined,keyHeader);return {id:recordId};}
      if(operation==='approve'){if(!recordId)fail('Select a record.');await api(base,`/rest/v1/${tbl}?id=eq.${encodeURIComponent(recordId)}`,null,'PATCH',{status:'approved'},{...keyHeader,Prefer:'return=representation'});return {id:recordId};}
      if(operation==='create'){const res=await api(base,`/rest/v1/${tbl}`,null,'POST',data,{...keyHeader,Prefer:'return=representation'});const ret=Array.isArray(res)?res[0]:res;return {id:resourceId(ret?.id||input.requestId||'created')};}
      if(operation==='edit'){if(!recordId)fail('Select a record.');const res=await api(base,`/rest/v1/${tbl}?id=eq.${encodeURIComponent(recordId)}`,null,'PATCH',data,{...keyHeader,Prefer:'return=representation'});const ret=Array.isArray(res)?res[0]:res;return {id:resourceId(ret?.id||recordId)};}
      fail('Unsupported operation.');
    }
  };
}

function createDjangoAdapter({ app, secret, config, supported, project }) {
  const base=config.baseUrl;
  const authHeaders=parseHeaders(config, secret);
  return {
    async probe() {
      const eps=Object.keys(config.endpoints||{});
      if(!eps.length)fail('No Django endpoints mapped.');
      const first=config.endpoints[eps[0]];
      await api(base,`${first}?page=1&page_size=1`,null,'GET',undefined,authHeaders);
      return eps;
    },
    async count(key) {
      supported(key);
      const ep=config.endpoints?.[key];
      if(!ep)return 0;
      const res=await api(base,`${ep}?page_size=1`,null,'GET',undefined,authHeaders);
      return unwrapCount(res);
    },
    async list(key,cursor='',limit=40) {
      supported(key);
      const ep=config.endpoints?.[key];
      if(!ep)return {items:[],nextCursor:''};
      const page=Number(cursor)||1;
      const res=await api(base,`${ep}?page=${page}&page_size=${limit}`,null,'GET',undefined,authHeaders);
      const rows=unwrapList(res, key);
      const items=rows.map(row=>project({id:resourceId(String(row.id||row.pk||'row')),data:row,revision:row.revision||0,updatedAt:row.updated_at||''},key));
      return {items,nextCursor:res.next?String(page+1):''};
    },
    async write(key,operation,input) {
      supported(key);
      const ep=config.endpoints?.[key];
      const recordId=input.id?resourceId(input.id):null;
      const data=['delete','approve'].includes(operation)?null:record(input.data,app.workspace.fields[key]);
      const targetUrl=recordId?`${ep.replace(/\/$/,'')}/${encodeURIComponent(recordId)}/`:ep;
      if(operation==='delete'){if(!recordId)fail('Select a record.');await api(base,targetUrl,null,'DELETE',undefined,authHeaders);return {id:recordId};}
      if(operation==='approve'){if(!recordId)fail('Select a record.');await api(base,targetUrl,null,'PATCH',{status:'approved'},authHeaders);return {id:recordId};}
      if(operation==='create'){const res=await api(base,ep,null,'POST',data,authHeaders);return {id:resourceId(String(res?.id||res?.pk||input.requestId||'created'))};}
      if(operation==='edit'){if(!recordId)fail('Select a record.');const res=await api(base,targetUrl,null,'PATCH',data,authHeaders);return {id:resourceId(String(res?.id||res?.pk||recordId))};}
      fail('Unsupported operation.');
    }
  };
}

function createUniversalRestAdapter({ app, secret, config, supported, project }) {
  const base=config.baseUrl;
  const authHeaders=parseHeaders(config, secret);
  const getEp=key=>config.endpoints?.[key]||(base.endsWith('/appos')?`/modules/${key}/records`:`/${key}`);

  return {
    async probe() {
      if(config.endpoints&&Object.keys(config.endpoints).length) {
        const firstKey=Object.keys(config.endpoints)[0];
        await api(base,`${config.endpoints[firstKey]}?limit=1`,null,'GET',undefined,authHeaders);
        return Object.keys(config.endpoints);
      }
      try {
        const res=await api(base,'/health',null,'GET',undefined,authHeaders);
        if(res.ok===true&&Array.isArray(res.modules))return res.modules.filter(k=>moduleKeys.includes(k));
      } catch {}
      return moduleKeys;
    },
    async count(key) {
      supported(key);
      const ep=getEp(key);
      try {
        const countRes=await api(base,`${ep}/count`,null,'GET',undefined,authHeaders);
        if(typeof countRes.count==='number')return countRes.count;
      } catch {}
      const res=await api(base,`${ep}?limit=1`,null,'GET',undefined,authHeaders);
      return unwrapCount(res);
    },
    async list(key,cursor='',limit=40) {
      supported(key);
      const ep=getEp(key);
      const pagType=config.paginationType||'page';
      let qs=`limit=${limit}`;
      if(pagType==='offset'){const off=Number(cursor)||0;qs=`limit=${limit+1}&offset=${off}`;}
      else if(pagType==='cursor'){qs=`limit=${limit}${cursor?`&cursor=${encodeURIComponent(cursor)}`:''}`;}
      else {const p=Number(cursor)||1;qs=`limit=${limit}&page=${p}`;}
      const separator=ep.includes('?')?'&':'?';
      const res=await api(base,`${ep}${separator}${qs}`,null,'GET',undefined,authHeaders);
      const rows=unwrapList(res, key);
      const items=rows.slice(0,limit).map(row=>project({id:resourceId(String(row.id||row._id||row.uuid||'row')),data:row.data||row,revision:row.revision||row.version||0,updatedAt:row.updatedAt||row.updated_at||''},key));
      let nextCursor='';
      if(pagType==='offset'){const off=Number(cursor)||0;nextCursor=rows.length>limit?String(off+limit):'';}
      else if(pagType==='cursor'){nextCursor=typeof res.nextCursor==='string'?res.nextCursor:typeof res.next_cursor==='string'?res.next_cursor:'';}
      else {const p=Number(cursor)||1;nextCursor=rows.length>=limit?String(p+1):'';}
      return {items,nextCursor};
    },
    async write(key,operation,input) {
      supported(key);
      const ep=getEp(key);
      const recordId=input.id?resourceId(input.id):null;
      const data=['delete','approve'].includes(operation)?null:record(input.data,app.workspace.fields[key]);
      const targetUrl=recordId?`${ep.replace(/\/$/,'')}/${encodeURIComponent(recordId)}`:ep;
      if(operation==='delete'){if(!recordId)fail('Select a record.');await api(base,targetUrl,null,'DELETE',undefined,authHeaders);return {id:recordId};}
      if(operation==='approve'){if(!recordId)fail('Select a record.');await api(base,`${targetUrl}/approve`,null,'POST',{status:'approved'},authHeaders);return {id:recordId};}
      if(operation==='create'){const res=await api(base,ep,null,'POST',data,authHeaders);return {id:resourceId(String(res?.id||res?._id||input.requestId||'created'))};}
      if(operation==='edit'){if(!recordId)fail('Select a record.');const res=await api(base,targetUrl,null,'PATCH',data,authHeaders);return {id:resourceId(String(res?.id||res?._id||recordId))};}
      fail('Unsupported operation.');
    }
  };
}

// BinGi HMS Optional Plugin Adapter
function createBinGiPluginAdapter({ app, secret, config, supported, project }) {
  const base=config.baseUrl||'https://api.bingi.com.bd/api';
  const token=secret?.apiToken||'';
  const authHeaders=token?(token.startsWith('Bearer ')?{Authorization:token}:{Authorization:`Bearer ${token}`}):{};

  function extractBinGiList(res,key) {
    if(Array.isArray(res))return res;
    if(!res||typeof res!=='object')return [];
    if(key==='content'&&Array.isArray(res.pages))return res.pages;
    if(key==='notifications'&&Array.isArray(res.banners))return res.banners;
    if(key==='records') {
      if(Array.isArray(res.hotels?.data))return res.hotels.data;
      if(Array.isArray(res.hotels))return res.hotels;
      if(Array.isArray(res.rooms?.data))return res.rooms.data;
      if(Array.isArray(res.rooms))return res.rooms;
    }
    if(Array.isArray(res.hotels?.data))return res.hotels.data;
    if(Array.isArray(res.hotels))return res.hotels;
    if(Array.isArray(res.rooms?.data))return res.rooms.data;
    if(Array.isArray(res.rooms))return res.rooms;
    if(Array.isArray(res.pages))return res.pages;
    if(Array.isArray(res.banners))return res.banners;
    if(Array.isArray(res.locations))return res.locations;
    if(Array.isArray(res.data))return res.data;
    if(Array.isArray(res.results))return res.results;
    return [];
  }

  return {
    async probe() {
      try{await api(base,'/public/locations',null,'GET',undefined,authHeaders);return ['records','content','notifications'];}
      catch(err){fail(`BinGi API connection probe failed: ${err.message}`);}
    },
    async count(key) {
      supported(key);
      const ep=key==='content'?'/public/pages':key==='notifications'?'/public/mobile-login-banners':'/public/hotels';
      const res=await api(base,ep,null,'GET',undefined,authHeaders);
      const list=extractBinGiList(res,key);
      return list.length;
    },
    async list(key,cursor='',limit=40) {
      supported(key);
      const ep=key==='content'?'/public/pages':key==='notifications'?'/public/mobile-login-banners':'/public/hotels';
      const res=await api(base,ep,null,'GET',undefined,authHeaders);
      const raw=extractBinGiList(res,key);
      const offset=Number(cursor)||0;
      const pageItems=raw.slice(offset,offset+limit);
      const items=pageItems.map(item=>{
        let data={};
        if(key==='content') {
          const bodyText=typeof item.excerpt==='string'&&item.excerpt?item.excerpt:typeof item.content_html==='string'?item.content_html:typeof item.content==='string'?item.content:item.slug||'';
          data={title:item.title||item.name||'Page',body:bodyText.replace(/<[^>]+>/g,' ').trim().slice(0,1000),status:item.show_in_footer?'footer':item.published_at?'published':'draft'};
        } else if(key==='notifications') {
          const bannerName=item.banner_id?`Banner ${item.banner_id}`:`Login Banner ${item.sort_order??''}`;
          data={title:bannerName,body:item.image_url||'',status:'active'};
        } else {
          const loc=typeof item.location==='object'&&item.location?[item.location.address,item.location.city].filter(Boolean).join(', '):(item.address||item.city||'');
          const desc=typeof item.description==='string'&&item.description?item.description.replace(/<[^>]+>/g,' ').trim().slice(0,500):loc;
          data={title:item.name||item.title||'Hotel',description:desc||'Hotel property',status:item.category||item.status||'Hotel'};
        }
        const rawId=String(item.id||item.page_id||item.banner_id||item.slug||item.code||'item').replace(/[\/\\\u0000-\u001f\u007f\s]/g,'-').slice(0,100);
        return project({id:resourceId(rawId),data,revision:1,updatedAt:item.updated_at||item.published_at||new Date().toISOString()},key);
      });
      const nextCursor=offset+limit<raw.length?String(offset+limit):'';
      return {items,nextCursor};
    },
    async write() {
      fail('BinGi administrator mutation APIs are not yet verified. Read-only inspection is enabled for verified public endpoints (/public/hotels, /public/pages, /public/mobile-login-banners). Additional admin credentials are required for writes.','failed-precondition');
    }
  };
}

const ADAPTER_REGISTRY = {
  managed: createManagedAdapter,
  firebase: createFirebaseAdapter,
  supabase: createSupabaseAdapter,
  django: createDjangoAdapter,
  node: createUniversalRestAdapter,
  laravel: createUniversalRestAdapter,
  api: createUniversalRestAdapter,
  bingi: createBinGiPluginAdapter,
};

async function adapter(db,app,secret) {
  const config=app.integration;
  if(!config)fail('Configure an integration first.','failed-precondition');
  let store=db;
  if(config.kind==='firebase')store=await remoteDb(secret,config.projectId);
  const collection=key=>config.kind==='managed'?db.collection('appos_apps').doc(app.id).collection(`records_${key}`):store.collection(config.collections[key]);
  function supported(key) {
    if(!app.workspace.modules.includes(key)||!config.connected||!config.capabilities.includes(key))fail('This module is not enabled and connected.','failed-precondition');
  }
  function project(row,key) {
    const fields=app.workspace.fields[key]||[];
    return {
      id:String(row.id||''),
      data:Object.fromEntries(fields.map(f=>{
        const value=serial(row.data?.[f.key]??null);
        return [f.key,value!==null&&typeof value==='object'?null:value];
      })),
      revision:Number(row.revision)||0,
      updatedAt:typeof row.updatedAt==='string'?row.updatedAt:'',
      ...(row.etag?{etag:row.etag}:{})
    };
  }

  const factory=ADAPTER_REGISTRY[config.kind];
  if(!factory)fail(`Unsupported backend adapter: ${config.kind}`,'failed-precondition');

  return factory({ db, store, app, secret, config, collection, supported, project });
}

module.exports={integration,adapter,ADAPTER_REGISTRY};
