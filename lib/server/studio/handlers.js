const {getServerFirebase,ADMIN_EMAIL}=require('../admin');
const {requireAdmin,readBearerToken,requireSameOrigin,privateHeaders}=require('../calendar/security');
const {CalendarError}=require('../calendar/config');
const {SUPPORT_EMAIL,SUPPORT_NAME}=require('../../../config/studioRoles');
const deployment=require('../../../config/deployment.json');
const origin=()=>({origin:process.env.NODE_ENV==='production'?deployment.productionOrigin:deployment.localOrigin});
const fail=(code,status=400)=>{throw new CalendarError(code,status);};
const error=(res,e)=>res.status(e instanceof CalendarError?e.status:503).json({error:e instanceof CalendarError?e.code:'studio_service_unavailable'});
const publicStaff=(s)=>({
  id:s.id,
  uid:s.id,
  name:s.data().name||'',
  email:s.data().email||'',
  avatarUrl:s.data().avatarUrl||'',
  password:s.data().password||'',
  status:s.data().status||'active',
  allowedModules:s.data().allowedModules||[],
  allowedSubModules:s.data().allowedSubModules||{},
  createdAt:s.data().createdAt||'',
  updatedAt:s.data().updatedAt||''
});
async function subAdmins(req,res){
 privateHeaders(res);if(!['GET','POST'].includes(req.method))return res.status(405).end();
 try{
  if(req.method==='POST')requireSameOrigin(req,origin());const {auth,db}=getServerFirebase();await requireAdmin(req,auth);
  if(req.method==='GET'){const rows=await db.collection('staff_members').where('accountType','==','sub_admin').get();return res.json({accounts:rows.docs.map(publicStaff)});}
  const body=req.body;if(!body||typeof body!=='object')fail('invalid_account_fields');

  // Delete sub-admin action
  if(body.action==='delete'){
    const targetUid=typeof body.uid==='string'?body.uid.trim():'';
    if(!targetUid)fail('uid_required');
    await auth.deleteUser(targetUid).catch(()=>{});
    await db.collection('staff_members').doc(targetUid).delete().catch(()=>{});
    await db.collection('studio_people').doc(targetUid).delete().catch(()=>{});
    return res.json({deleted:true,uid:targetUid});
  }

  // Save / Update sub-admin action
  const targetEmail=typeof body.email==='string'?body.email.trim().toLowerCase():'';
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(targetEmail))fail('invalid_email_address');
  const targetName=typeof body.name==='string'&&body.name.trim()?body.name.trim():'Sub Admin';
  const targetStatus=['active','suspended'].includes(body.status)?body.status:'active';
  const targetModules=Array.isArray(body.modules)?body.modules:[];
  const targetAvatar=typeof body.avatarUrl==='string'?body.avatarUrl.trim():'';
  const targetPassword=typeof body.password==='string'&&body.password.trim()?body.password.trim():'';

  let user;
  let created=false;

  if(body.uid && typeof body.uid==='string'){
    try{user=await auth.getUser(body.uid.trim());}catch(e){if(e.code!=='auth/user-not-found')throw e;}
  }
  if(!user){
    try{user=await auth.getUserByEmail(targetEmail);}catch(e){if(e.code!=='auth/user-not-found')throw e;}
  }

  if(!user){
    if(!targetPassword || targetPassword.length<6)fail('initial_password_required');
    user=await auth.createUser({
      email:targetEmail,
      password:targetPassword,
      displayName:targetName,
      photoURL:targetAvatar||undefined
    });
    created=true;
  } else {
    const authUpdates={
      email:targetEmail,
      displayName:targetName,
      disabled:targetStatus==='suspended'
    };
    if(targetAvatar)authUpdates.photoURL=targetAvatar;
    if(targetPassword){
      if(targetPassword.length<6)fail('password_too_short');
      authUpdates.password=targetPassword;
    }
    await auth.updateUser(user.uid,authUpdates);
  }

  const ref=db.collection('staff_members').doc(user.uid),now=new Date().toISOString();
  try{
    await db.runTransaction(async tx=>{
      const old=await tx.get(ref);
      const oldData=old.exists?old.data():{};
      const savedPassword=targetPassword || oldData.password || '';
      tx.set(ref,{
        ...oldData,
        uid:user.uid,
        name:targetName,
        email:targetEmail,
        avatarUrl:targetAvatar,
        password:savedPassword,
        accountType:'sub_admin',
        staffType:'support',
        allowedModules:[...new Set(targetModules)],
        allowedSubModules:{},
        status:targetStatus,
        createdAt:oldData.createdAt||now,
        updatedAt:now
      });
      tx.set(db.collection('studio_people').doc(user.uid),{
        uid:user.uid,
        name:targetName,
        avatarUrl:targetAvatar||user.photoURL||'',
        role:'support',
        status:targetStatus,
        departmentIds:oldData.departmentIds||[],
        chatSuspended:false
      },{merge:true});
    });
  }catch(e){
    if(created)await auth.deleteUser(user.uid).catch(()=>{});
    throw e;
  }

  if(targetStatus==='suspended')await auth.revokeRefreshTokens(user.uid).catch(()=>{});
  return res.json({saved:true,created,uid:user.uid});
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
