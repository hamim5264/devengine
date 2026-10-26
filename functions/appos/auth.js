const { resolveActor }=require('../devkitty/config');
const { fail,permissionKeys }=require('./model');
async function actor(request,db) {
  const value=await resolveActor(request,db);
  if(value.role==='admin')return {...value,owner:true,access:{registry:['create','viewAll'],apps:{}}};
  const staff=value.staff;
  if(value.role!=='employee'||!staff?.allowedModules?.some(m=>['appos','all'].includes(m)))fail('AppOS access has not been granted.','permission-denied');
  const subs=staff.allowedSubModules?.appos;
  if(Array.isArray(subs)&&!subs.includes('/admin/appos'))fail('AppOS access has been revoked.','permission-denied');
  return {...value,owner:false,access:staff.apposAccess || {registry:[],apps:{}}};
}
function permissions(actor,appId) {return actor.owner?permissionKeys:(actor.access.apps?.[appId]?.permissions || []).filter(p=>permissionKeys.includes(p));}
function requirePermission(actor,appId,permission) {const p=permissions(actor,appId);if(!p.includes('app.view')||!p.includes(permission))fail('You do not have permission for this action in this application.','permission-denied');}
module.exports={actor,permissions,requirePermission};
