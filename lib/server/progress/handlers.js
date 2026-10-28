const {randomBytes,randomUUID}=require('node:crypto');
const {getServerFirebase,ADMIN_EMAIL}=require('../admin');
const {CalendarError}=require('../calendar/config');
const {readBearerToken,requireSameOrigin,privateHeaders}=require('../calendar/security');
const deployment=require('../../../config/deployment.json');
const COL='project_progress',SHARES='shared_project_progress';
const fail=(code,status=400)=>{throw new CalendarError(code,status);};
const text=(value,max,required=false)=>{if(typeof value!=='string'||value.length>max||required&&!value.trim())fail('invalid_progress_fields');return value.trim();};
const validId=value=>typeof value==='string'&&/^[a-zA-Z0-9_-]{1,128}$/.test(value);
function publicDocument(data){const {title,client,summary,status,percent,nextStep,targetDate,milestones,updates,updatedAt}=data;return {title,client,summary,status,percent,nextStep,targetDate,milestones,updates,updatedAt};}
async function actorFor(req,auth,db){
  let claims;try{claims=await auth.verifyIdToken(readBearerToken(req),true);}catch{fail('sign_in_required',401);}
  const user=await auth.getUser(claims.uid);if(user.disabled)fail('access_denied',403);
  const owner=user.email?.toLowerCase()===ADMIN_EMAIL;
  const staff=owner?null:await db.collection('staff_members').doc(user.uid).get();
  if(!owner&&(!staff?.exists||staff.data().status!=='active'||![...(staff.data().allowedModules||[])].some(x=>['all','project_progress'].includes(x))))fail('progress_access_denied',403);
  const grants=staff?.data()?.allowedSubModules?.project_progress;
  if(!owner&&Array.isArray(grants)&&!grants.includes('/admin/project-progress'))fail('progress_access_denied',403);
  return {uid:user.uid,owner,name:owner?user.displayName||'Administration':staff.data().name||'Project team'};
}
async function handler(req,res){
  privateHeaders(res);res.setHeader('Allow','GET, POST');
  try{
    if(!['GET','POST'].includes(req.method))return res.status(405).json({error:'method_not_allowed'});
    if(req.method==='POST')requireSameOrigin(req,{origin:process.env.NODE_ENV==='production'?deployment.productionOrigin:deployment.localOrigin});
    const {auth,db}=getServerFirebase(),actor=await actorFor(req,auth,db);
    if(req.method==='GET'){
      if(!actor.owner)return res.status(200).json({briefs:[],people:[]});
      const [briefs,people]=await Promise.all([db.collection('admin_project_briefs').limit(200).get(),db.collection('staff_members').where('status','==','active').get()]);
      return res.status(200).json({briefs:briefs.docs.map(x=>({id:x.id,title:x.data().title,client:x.data().client,summary:x.data().overview||''})),people:people.docs.filter(x=>(x.data().allowedModules||[]).some(k=>['project_progress','all'].includes(k))).map(x=>({uid:x.id,name:x.data().name||'Team member'}))});
    }
    const body=req.body;if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(k=>!['action','id','revision','data','update'].includes(k)))fail('invalid_progress_request');
    if(!['save','publish','revoke','update'].includes(body.action))fail('invalid_progress_action');
    if(body.id&&!validId(body.id))fail('invalid_progress_id');
    if(!body.id&&(!actor.owner||body.action!=='save'))fail('owner_required',403);
    const ref=body.id?db.collection(COL).doc(body.id):db.collection(COL).doc();
    const result=await db.runTransaction(async tx=>{
      if(!actor.owner){const current=await tx.get(db.collection('staff_members').doc(actor.uid));const grants=current.data()?.allowedSubModules?.project_progress;if(!current.exists||current.data().status!=='active'||!(current.data().allowedModules||[]).some(x=>['all','project_progress'].includes(x))||Array.isArray(grants)&&!grants.includes('/admin/project-progress'))fail('progress_access_denied',403);}
      const snap=await tx.get(ref),old=snap.exists?snap.data():null;
      if(body.id&&!old)fail('progress_not_found',404);
      if(old&&!actor.owner&&!old.editorIds.includes(actor.uid))fail('progress_access_denied',403);
      if(old&&body.revision!==old.revision)fail('progress_changed_refresh',409);
      if(['publish','revoke'].includes(body.action)&&!actor.owner)fail('owner_required',403);
      const now=new Date().toISOString();let data={...old};
      if(body.action==='save'){
        const input=body.data;if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!['title','client','summary','status','percent','nextStep','targetDate','milestones','editorIds','briefId'].includes(k)))fail('invalid_progress_fields');
        if(!['planning','in_progress','review','on_hold','completed'].includes(input.status)||!Number.isInteger(input.percent)||input.percent<0||input.percent>100)fail('invalid_progress_status');
        const date=value=>{const v=text(value,10);if(v&&(!/^\d{4}-\d{2}-\d{2}$/.test(v)||!Number.isFinite(Date.parse(v))||new Date(v).toISOString().slice(0,10)!==v))fail('invalid_progress_date');return v;};
        if(!Array.isArray(input.milestones)||input.milestones.length>30)fail('invalid_milestones');
        const milestones=input.milestones.map(m=>{if(!m||!validId(m.id)||!['pending','in_progress','completed'].includes(m.status))fail('invalid_milestones');return {id:m.id,title:text(m.title,160,true),status:m.status,dueDate:date(m.dueDate)};});
        if(new Set(milestones.map(m=>m.id)).size!==milestones.length)fail('invalid_milestones');
        let editorIds=old?.editorIds||[],briefId=old?.briefId||'';
        if(actor.owner){
          if(!Array.isArray(input.editorIds)||input.editorIds.length>50||input.editorIds.some(x=>!validId(x)))fail('invalid_editors');
          editorIds=[...new Set(input.editorIds)];briefId=text(input.briefId||'',128);
          if(briefId){if(!validId(briefId)||!(await tx.get(db.collection('admin_project_briefs').doc(briefId))).exists)fail('brief_not_found');}
          const members=await Promise.all(editorIds.map(uid=>tx.get(db.collection('staff_members').doc(uid))));
          if(members.some(x=>!x.exists||x.data().status!=='active'||!(x.data().allowedModules||[]).some(k=>['project_progress','all'].includes(k))))fail('editor_module_access_required');
        }
        data={...data,title:text(input.title,160,true),client:text(input.client,160,true),summary:text(input.summary,5000),status:input.status,percent:input.status==='completed'?100:input.percent,nextStep:text(input.nextStep,2000),targetDate:date(input.targetDate),milestones,editorIds,briefId};
      }
      if(body.action==='update'){
        const u=body.update;if(!u||typeof u!=='object'||Object.keys(u).some(k=>!['title','message'].includes(k)))fail('invalid_progress_update');
        data.updates=[{id:randomUUID(),title:text(u.title,160,true),message:text(u.message,4000,true),author:actor.name,createdAt:now},...(old.updates||[])].slice(0,60);
      }
      data={...data,id:ref.id,ownerUid:old?.ownerUid||actor.uid,createdAt:old?.createdAt||now,updatedAt:now,updates:data.updates||[],revision:(old?.revision||0)+1,shareEnabled:old?.shareEnabled||false};
      if(body.action==='publish'){data.shareToken=old.shareToken||randomBytes(32).toString('hex');data.shareEnabled=true;}
      if(body.action==='revoke'){if(old.shareToken)tx.delete(db.collection(SHARES).doc(old.shareToken));delete data.shareToken;data.shareEnabled=false;}
      tx.set(ref,data);
      if(data.shareEnabled&&data.shareToken)tx.set(db.collection(SHARES).doc(data.shareToken),publicDocument(data));
      tx.create(ref.collection('activity').doc(),{action:body.action,actorUid:actor.uid,createdAt:now,revision:data.revision});
      return data;
    });
    return res.status(200).json({project:result});
  }catch(e){return res.status(e instanceof CalendarError?e.status:503).json({error:e instanceof CalendarError?e.code:'progress_service_unavailable'});}
}
module.exports={handler};
