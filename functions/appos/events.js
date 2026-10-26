const { onDocumentWrittenWithAuthContext }=require('firebase-functions/v2/firestore');
const { getFirestore }=require('firebase-admin/firestore');
const { createHash }=require('node:crypto');
const { permissionKeys }=require('./model');
exports.apposAccessAudit=onDocumentWrittenWithAuthContext({document:'staff_members/{uid}',region:'us-central1',retry:true},async event=>{
  const before=event.data.before.data()||{},after=event.data.after.data()||{};
  const appIds=[...new Set([...Object.keys(before.apposAccess?.apps||{}),...Object.keys(after.apposAccess?.apps||{})])].filter(id=>/^[a-zA-Z0-9_-]{1,100}$/.test(id));
  const enabled=staff=>staff.status==='active'&&staff.allowedModules?.some(k=>['appos','all'].includes(k))&&(!Array.isArray(staff.allowedSubModules?.appos)||staff.allowedSubModules.appos.includes('/admin/appos'));
  for(const appId of appIds){const old=enabled(before)?before.apposAccess?.apps?.[appId]?.permissions||[]:[],current=enabled(after)?after.apposAccess?.apps?.[appId]?.permissions||[]:[];
    if(JSON.stringify(old)===JSON.stringify(current))continue;
    const key=createHash('sha256').update(`${event.id}:${appId}`).digest('hex');
    try{await getFirestore().collection('appos_apps').doc(appId).collection('audit').doc(key).create({actorId:event.authId||'system',actorName:'DevEngine employee access management',action:'employee.permissions-changed',target:event.params.uid,beforePermissions:old.filter(p=>permissionKeys.includes(p)),afterPermissions:current.filter(p=>permissionKeys.includes(p)),createdAt:event.time});}catch(error){if(error.code!==6&&error.code!=='already-exists')throw error;}
  }
});
