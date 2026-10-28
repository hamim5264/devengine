import type {GetServerSideProps} from 'next';
// Public content uses Firestore's public REST surface, never admin credentials.
// Unlike client service fallbacks, provider outages must not become cached 404s.
function decode(value:any):any {
 if('nullValue' in value)return null;
 if('stringValue' in value)return value.stringValue;
 if('booleanValue' in value)return value.booleanValue;
 if('integerValue' in value)return Number(value.integerValue);
 if('doubleValue' in value)return value.doubleValue;
 if('timestampValue' in value)return value.timestampValue;
 if('arrayValue' in value)return (value.arrayValue.values||[]).map(decode);
 if('mapValue' in value)return Object.fromEntries(Object.entries(value.mapValue.fields||{}).map(([k,v])=>[k,decode(v)]));
 return null;
}
const unpack=(doc:any)=>({...Object.fromEntries(Object.entries(doc.fields||{}).map(([k,v])=>[k,decode(v)])),id:doc.name.split('/').at(-1)}) as Record<string,any>;
function base(){const project=process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;if(!project||!/^[a-z0-9-]+$/.test(project))throw Error('public_content_unavailable');return `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents`;}
export async function publicContent(collection:string,field?:string,value?:string|boolean):Promise<Record<string,any>[]> {
 if(!['blogs','projects','app_policies'].includes(collection))throw Error('invalid_public_collection');
 const structuredQuery={from:[{collectionId:collection}],...(field?{where:{fieldFilter:{field:{fieldPath:field},op:'EQUAL',value:typeof value==='boolean'?{booleanValue:value}:{stringValue:value}}}}:{}),limit:1000};
 const response=await fetch(`${base()}:runQuery`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({structuredQuery}),signal:AbortSignal.timeout(10000)});
 if(!response.ok)throw Error('public_content_unavailable');
 const result=await response.json();if(!Array.isArray(result)||result.some(x=>x.error))throw Error('public_content_unavailable');
 return result.filter(x=>x.document).map(x=>unpack(x.document));
}
export async function publicItem(collection:string,slug:string){
 if(!slug||slug.length>200||/[\x00-\x1f/]/.test(slug))return null;
 const rows=await publicContent(collection,'slug',slug);let item=rows.find(x=>collection==='blogs'?x.isPublished===true:collection==='projects'?x.isPublic!==false:x.isPublished!==false)||null;
 if(!item&&!rows.length){const response=await fetch(`${base()}/${collection}/${encodeURIComponent(slug)}`,{signal:AbortSignal.timeout(10000)});if(response.status===404)return null;if(!response.ok)throw Error('public_content_unavailable');item=unpack(await response.json());}
 if(!item||(collection==='blogs'?item.isPublished!==true:collection==='projects'?item.isPublic===false:item.isPublished===false))return null;
 return item;
}
export const appPolicyServerProps:GetServerSideProps=async context=>{
 try{const app=await publicItem('app_policies',String(context.params?.slug||''));if(!app)return {notFound:true};context.res.setHeader('Cache-Control','public, s-maxage=60, stale-while-revalidate=300');return {props:{initialApp:app}};}
 catch{context.res.statusCode=503;context.res.setHeader('Retry-After','60');context.res.setHeader('Cache-Control','no-store');return {props:{initialApp:null}};}
};
