const { HttpsError } = require('firebase-functions/v2/https');
const catalog = require('./catalog.json');
const fail = (message, code='invalid-argument') => { throw new HttpsError(code,message); };
const text = (value,max=2000) => typeof value==='string'?value.trim().slice(0,max):'';
const id = value => typeof value==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(value)?value:fail('Invalid resource identifier.');
const recordId = value => typeof value==='string'&&value.length>0&&Buffer.byteLength(value,'utf8')<=800&&!['.','..'].includes(value)&&!/[\/\\\u0000-\u001f\u007f]/.test(value)?value:fail('Invalid record identifier.');
const pageCursor = value => value==null?'':typeof value==='string'&&value.length<=1200?value:fail('Invalid pagination cursor.');
const moduleKeys=catalog.modules.map(m=>m.key), permissionKeys=catalog.permissions.map(p=>p.key);
const list=(value,allowed,max=100)=>Array.isArray(value)?[...new Set(value.filter(item=>typeof item==='string'&&allowed.includes(item)))].slice(0,max):[];
function url(value) {const result=text(value,1000);if(!result)return '';try{const parsed=new URL(result);if(parsed.protocol!=='https:'||parsed.username||parsed.password)fail('Use a public HTTPS URL without credentials.');return parsed.href;}catch{fail('Use a valid HTTPS URL.');}}
function defaults() {return {modules:['records'],navigation:['overview','records','legal','settings','audit'],widgets:['counts','activity','health'],accent:'#2cecf7',template:'operations',fields:Object.fromEntries(catalog.modules.map(m=>[m.key,m.fields]))};}
function workspace(value={}) {
  const base=defaults();const modules=list(value.modules,moduleKeys);
  const fields={};
  for(const key of moduleKeys) {
    const supplied=value.fields?.[key] || base.fields[key];
    if(!Array.isArray(supplied)||!supplied.length||supplied.length>12)fail('Each data module needs 1–12 fields.');
    fields[key]=supplied.map(f=>{
      const name=text(f.key,40);
      if(!/^[a-z][a-zA-Z0-9_]{0,39}$/.test(name)||/password|token|secret|private.?key|api.?key|access.?key|service.?account|credential|auth|createdAt|updatedAt|createdBy|revision/i.test(name))fail('Use a safe, non-secret field key.');
      if(!['text','textarea','number','boolean','date','email'].includes(f.type)||!text(f.label,80))fail('Choose a field label and supported type.');
      return {key:name,label:text(f.label,80),type:f.type,required:f.required===true};
    });
    if(new Set(fields[key].map(f=>f.key)).size!==fields[key].length)fail('Field keys must be unique.');
  }
  const accent=text(value.accent,7)||base.accent;if(!/^#[0-9a-f]{6}$/i.test(accent))fail('Use a six-digit brand color.');
  return {modules,navigation:list(value.navigation,catalog.navigation),widgets:list(value.widgets,catalog.widgets),accent,template:['operations','content','support'].includes(value.template)?value.template:base.template,fields};
}
function profile(value) {
  const name=text(value.name,160),slug=text(value.slug,100).toLowerCase();
  if(!name||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))fail('Enter an app name and a URL-safe slug.');
  const rawStatus=typeof value.status==='string'?value.status.trim().toUpperCase():'DRAFT';
  const status=['DRAFT','ACTIVE','PAUSED'].includes(rawStatus)?rawStatus:rawStatus==='ARCHIVED'?'PAUSED':'DRAFT';
  const stack={frontend:text(value.stack?.frontend,60),backend:text(value.stack?.backend,60),database:text(value.stack?.database,60)};
  return {name,slug,description:text(value.description,6000),category:text(value.category,100),logoUrl:url(value.logoUrl),platforms:list(value.platforms,['web','android','ios','flutter','desktop']),status,stack,urls:{production:url(value.urls?.production),staging:url(value.urls?.staging),development:url(value.urls?.development)}};
}
function record(value,fields) {
  const data={};for(const field of fields){const raw=value?.[field.key];if(field.required&&(raw===undefined||raw===null||raw===''))fail(`Enter ${field.label}.`);
    if(field.type==='boolean') data[field.key]=raw===true;
    else if(field.type==='number'){if(raw===''||raw==null){if(field.required)fail(`Enter ${field.label}.`);data[field.key]=null;}else{if(typeof raw!=='number'||!Number.isFinite(raw)||Math.abs(raw)>1e15)fail(`Enter a valid ${field.label}.`);data[field.key]=raw;}}
    else {const result=text(raw,field.type==='textarea'?16000:1000);if(field.required&&!result)fail(`Enter ${field.label}.`);if(field.type==='email'&&result&&!/^[^\s@]+@[^\s@]+$/.test(result))fail('Enter a valid email.');if(field.type==='date'&&result&&!/^\d{4}-\d{2}-\d{2}$/.test(result))fail('Use a valid date.');data[field.key]=result;}}
  return data;
}
function serial(value) {if(value==null)return value;if(typeof value.toDate==='function')return value.toDate().toISOString();if(Array.isArray(value))return value.map(serial);if(typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,v])=>[key,serial(v)]));return value;}
module.exports={catalog,fail,text,id,recordId,pageCursor,list,url,defaults,workspace,profile,record,serial,moduleKeys,permissionKeys};
