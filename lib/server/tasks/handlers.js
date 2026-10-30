const { getServerFirebase, identityOptions } = require('../admin');
const { readConfig, CalendarError } = require('../calendar/config');
const { requireAdmin, readBearerToken, requireSameOrigin, privateHeaders, safeEqual } = require('../calendar/security');
const { createStore } = require('../calendar/store');
const deployment = require('../../../config/deployment.json');
const { makeRepository, JOBS } = require('./repository');
const { makeWorker } = require('./worker');
const { emailConfiguration } = require('./email');
const { id, fail } = require('./model');
const {readEmailPreferences,saveEmailPreferences,sendTestEmail}=require('./emailPreferences');
function schedulerAuthorized(header, secret=process.env.ADMIN_TASK_WORKER_SECRET) { return typeof secret==='string' && secret.length>=32 && safeEqual(header,`Bearer ${secret}`); }
function createTaskHandlers(overrides={}) {
  const deps={getServerFirebase,makeRepository,makeWorker,sendTestEmail,...overrides};
  function origin(){return {origin:process.env.NODE_ENV==='production'?deployment.productionOrigin:deployment.localOrigin};}
  function error(res,value){
    const known=value instanceof CalendarError;
    const identity=value?.message==='server_identity_not_configured';
    const missingIndex=(value?.code===9 || value?.code==='failed-precondition') && /index/i.test(value?.message || '');
    return res.status(known?value.status:503).json({error:known?value.code:identity?'server_identity_not_configured':missingIndex?'firestore_indexes_required':'task_service_unavailable'});
  }
  async function owner(req){readBearerToken(req);const server=deps.getServerFirebase();const actor=await requireAdmin(req,server.auth);return {...server,actor};}
  function allowed(req,res,methods){privateHeaders(res);if(methods.includes(req.method))return true;res.setHeader('Allow',methods.join(', '));res.status(405).json({error:'method_not_allowed'});return false;}
  return {
    async index(req,res){
      if(!allowed(req,res,['GET','POST']))return;
      try{
        if(req.method==='POST')requireSameOrigin(req,origin());
        const {db,auth,actor}=await owner(req),repo=deps.makeRepository(db);
        if(req.method==='GET')return res.status(200).json(await repo.list(actor.uid,{cursor:req.query.cursor}));
        const input=req.body;
        if(!input || typeof input!=='object' || Array.isArray(input) || Object.keys(input).some(k=>!['action','id','revision','requestId','data'].includes(k)))fail('invalid_task_request');
        if(!['create','update','duplicate','archive','restore','delete','retry'].includes(input.action))fail('invalid_task_action');
        if(!['create','duplicate'].includes(input.action) && !Number.isInteger(input.revision))fail('task_revision_required');
        const task=await repo.mutate(actor.uid,input.action,input);
        try{
          const worker=deps.makeWorker(db,auth);
          if(task.calendarEnabled || task.calendar?.eventId){
            await worker.runCalendar(task.id,task.revision).catch(()=>{});
          }
          await worker.run().catch(()=>{});
        }catch{/* Preserve the queued durable jobs. */}
        if(task.calendarEnabled || task.calendar?.eventId){
          return res.status(200).json({task:(await repo.detail(actor.uid,task.id)).task});
        }
        return res.status(200).json({task});
      }catch(value){return error(res,value);}
    },
    async detail(req,res){if(!allowed(req,res,['GET']))return;try{const {db,actor}=await owner(req);return res.status(200).json(await deps.makeRepository(db).detail(actor.uid,id(req.query.id)));}catch(value){return error(res,value);}},
    async settings(req,res){
      if(!allowed(req,res,['GET']))return;
      try{
        const {db,actor}=await owner(req),repo=deps.makeRepository(db);
        let calendar;try{const config=readConfig();calendar={configured:true,...await createStore(db,config).status(actor.uid)};}catch(value){calendar={configured:false,connected:false,error:value instanceof CalendarError?value.code:'calendar_service_unavailable'};}
        const dashboard=req.query.overview==='1';
        const results=await Promise.allSettled([dashboard?Promise.resolve([]):repo.people(),repo.summary(actor.uid),repo.failures(actor.uid),dashboard?repo.upcoming(actor.uid):Promise.resolve([])]);
        const setupWarnings=[];
        for(const result of results)if(result.status==='rejected'){
          const value=result.reason;
          if((value?.code===9 || value?.code==='failed-precondition') && /index/i.test(value?.message || ''))setupWarnings.push('firestore_indexes_building');
          else throw value;
        }
        const people=results[0].status==='fulfilled'?results[0].value:[];
        const summary=results[1].status==='fulfilled'?results[1].value:null;
        const failures=results[2].status==='fulfilled'?results[2].value:[];
        const upcoming=results[3].status==='fulfilled'?results[3].value:[];
        return res.status(200).json({people,summary,failures,...(dashboard?{upcoming}:{}),setupWarnings:[...new Set(setupWarnings)],calendar,email:{...emailConfiguration(),preferences:await readEmailPreferences(db,actor.uid)},schedulerConfigured:(process.env.ADMIN_TASK_WORKER_SECRET || '').length>=32,identityMode:identityOptions()});
      }catch(value){return error(res,value);}
    },
    async jobs(req,res){if(!allowed(req,res,['POST']))return;try{
      requireSameOrigin(req,origin());const {db,actor}=await owner(req);const ref=db.collection(JOBS).doc(id(req.body?.id));
      await db.runTransaction(async tx=>{const snap=await tx.get(ref);if(!snap.exists || snap.data().ownerUid!==actor.uid)fail('job_not_found',404);if(!['failed','delivery_unknown','queued'].includes(snap.data().status))fail('job_not_retryable',409);if(snap.data().status==='delivery_unknown' && req.body?.acknowledgePossibleDuplicate!==true)fail('email_delivery_review_required',409);tx.update(ref,{status:'queued',attempts:0,nextAtMs:Date.now(),emailDispatching:false,error:null,needsAttention:false});});return res.status(200).json({queued:true});
    }catch(value){return error(res,value);}},
    async worker(req,res){
      if(!allowed(req,res,['GET','POST']))return;
      try{
        let server;
        if(req.method==='GET'){if(!schedulerAuthorized(req.headers.authorization))fail('worker_unauthorized',401);server=deps.getServerFirebase();}
        else{requireSameOrigin(req,origin());server=await owner(req);}
        return res.status(200).json(await deps.makeWorker(server.db,server.auth).run());
      }catch(value){return error(res,value);}
    },
    async email(req,res){
      if(!allowed(req,res,['POST']))return;
      try{
        requireSameOrigin(req,origin());const {db,auth,actor}=await owner(req);
        const body=req.body;
        if(!body || typeof body!=='object' || Array.isArray(body) || Object.keys(body).some(key=>!['action','preferences','requestId'].includes(key)))fail('invalid_email_request');
        if(body.action==='preferences')return res.status(200).json({preferences:await saveEmailPreferences(db,actor.uid,body.preferences)});
        if(body.action==='test')return res.status(200).json(await deps.sendTestEmail(db,auth,actor,body.requestId));
        fail('invalid_email_action');
      }catch(value){return error(res,value);}
    },
  };
}
module.exports={createTaskHandlers,schedulerAuthorized};
