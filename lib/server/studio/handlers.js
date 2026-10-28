const {getServerFirebase,ADMIN_EMAIL}=require('../admin');
const {requireAdmin,readBearerToken,requireSameOrigin,privateHeaders}=require('../calendar/security');
const {CalendarError}=require('../calendar/config');
const {SUPPORT_EMAIL,SUPPORT_NAME}=require('../../../config/studioRoles');
const deployment=require('../../../config/deployment.json');
const origin=()=>({origin:process.env.NODE_ENV==='production'?deployment.productionOrigin:deployment.localOrigin});
const fail=(code,status=400)=>{throw new CalendarError(code,status);};
const error=(res,e)=>res.status(e instanceof CalendarError?e.status:503).json({error:e instanceof CalendarError?e.code:'studio_service_unavailable'});
const publicStaff=(s)=>({uid:s.id,name:s.data().name,email:s.data().email,status:s.data().status,allowedModules:s.data().allowedModules||[],allowedSubModules:s.data().allowedSubModules||{}});
async function subAdmins(req,res){
 privateHeaders(res);if(!['GET','POST'].includes(req.method))return res.status(405).end();
 try{
  if(req.method==='POST')requireSameOrigin(req,origin());const {auth,db}=getServerFirebase();await requireAdmin(req,auth);
  if(req.method==='GET'){const rows=await db.collection('staff_members').where('accountType','==','sub_admin').get();return res.json({accounts:rows.docs.map(publicStaff)});}
  const body=req.body;if(!body||typeof body!=='object'||Object.keys(body).some(k=>!['name','modules','status','initialPassword'].includes(k)))fail('invalid_account_fields');
  const allowed=['support','project_progress','appos','commerce','contract_center','projects','content_cms','social_network','legal','system'];
  if(!Array.isArray(body.modules)||body.modules.some(x=>!allowed.includes(x))||!['active','suspended'].includes(body.status)||typeof body.name!=='string'||!body.name.trim()||body.name.length>100)fail('invalid_account_fields');
  let user;try{user=await auth.getUserByEmail(SUPPORT_EMAIL);}catch(e){if(e.code!=='auth/user-not-found')throw e;}
  let created=false;
  if(!user){if(typeof body.initialPassword!=='string'||body.initialPassword.length<8||body.initialPassword.length>128)fail('initial_password_required');user=await auth.createUser({email:SUPPORT_EMAIL,password:body.initialPassword,displayName:body.name.trim()});created=true;}
  const ref=db.collection('staff_members').doc(user.uid),now=new Date().toISOString();
  try{await db.runTransaction(async tx=>{const old=await tx.get(ref);const {password:ignoredPassword,...fields}=old.exists?old.data():{};tx.set(ref,{...fields,uid:user.uid,name:body.name.trim(),email:SUPPORT_EMAIL,accountType:'sub_admin',staffType:'support',allowedModules:[...new Set(['support',...body.modules])],allowedSubModules:{},status:body.status,createdAt:old.data()?.createdAt||now,updatedAt:now});tx.set(db.collection('studio_people').doc(user.uid),{uid:user.uid,name:SUPPORT_NAME,avatarUrl:user.photoURL||'',role:'support',status:body.status,departmentIds:[],chatSuspended:false},{merge:true});});}catch(e){if(created)await auth.deleteUser(user.uid).catch(()=>{});throw e;}
  await auth.updateUser(user.uid,{disabled:body.status==='suspended'});if(body.status==='suspended')await auth.revokeRefreshTokens(user.uid);
  return res.json({saved:true,created});
 }catch(e){return error(res,e);}
}
async function support(req,res){
 privateHeaders(res);if(req.method!=='POST')return res.status(405).end();
 try{
  requireSameOrigin(req,origin());if(req.body&&Object.keys(req.body).length)fail('invalid_support_request');
  const {auth,db}=getServerFirebase();let claims;try{claims=await auth.verifyIdToken(readBearerToken(req),true);}catch{fail('sign_in_required',401);}
  const user=await auth.getUser(claims.uid);if(user.disabled)fail('access_denied',403);
  const employee=await db.collection('staff_members').doc(user.uid).get();
  if(user.email?.toLowerCase()===ADMIN_EMAIL||employee.data()?.accountType==='sub_admin')return res.json({chatId:null});
  if(!employee.exists||employee.data().status!=='active')fail('access_denied',403);
  let account;try{account=await auth.getUserByEmail(SUPPORT_EMAIL);}catch(e){if(e.code==='auth/user-not-found')return res.json({chatId:null,setupRequired:true});throw e;}
  const staff=await db.collection('staff_members').doc(account.uid).get();if(account.disabled||!staff.exists||staff.data().accountType!=='sub_admin'||staff.data().status!=='active'||!(staff.data().allowedModules||[]).includes('support'))return res.json({chatId:null,unavailable:true});
  const ids=[user.uid,account.uid].sort(),id=`direct_${ids.join('_')}`,ref=db.collection('studio_conversations').doc(id);
  await db.runTransaction(async tx=>{const current=await tx.get(ref),me=await tx.get(db.collection('studio_people').doc(user.uid)),peer=await tx.get(db.collection('studio_people').doc(account.uid));if(me.data()?.chatSuspended||me.data()?.status!=='active')fail('chat_access_paused',403);if(peer.data()?.chatSuspended)fail('support_chat_unavailable',403);if(!current.exists)tx.create(ref,{kind:'direct',participantIds:ids,departmentId:'',title:SUPPORT_NAME,description:'Employee support',avatarUrl:'',createdAt:new Date().toISOString(),deleted:false});else if(current.data().deleted)tx.update(ref,{deleted:false});});
  return res.json({chatId:id});
 }catch(e){return error(res,e);}
}
module.exports={subAdmins,support};
