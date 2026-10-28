const { randomUUID } = require('node:crypto');
const { TASKS, JOBS } = require('./repository');
const { hash,eventLabel } = require('./model');
const { syncTask } = require('./calendar');
const { sendTaskEmail, emailConfiguration, EMAIL_REJECTION_CODES } = require('./email');
const { ADMIN_EMAIL } = require('../admin');
const {readEmailPreferences,emailAllowed}=require('./emailPreferences');

function retryDelay(attempt) { return Math.min(6*3600000,60000*2**Math.min(attempt,9)); }
function staleJob(job,task,now=Date.now()) { const reminder=/^(reminder_|overdue)/.test(job.event);return !task || (job.revision!==task.revision && !(job.kind==='email' && reminder && job.dueAt===task.dueAt)) || (task.status==='completed' || task.deleted || task.archived) && reminder || /^reminder_/.test(job.event) && task.dueAtMs<=now; }
function makeWorker(db,auth,options={}) {
  const calendar = options.syncTask || syncTask, email = options.sendTaskEmail || sendTaskEmail, clock=options.now || (()=>Date.now());
  const emailSetup=options.emailConfiguration || emailConfiguration;
  const jobs=db.collection(JOBS), tasks=db.collection(TASKS);
  async function recipient(uid) {
    let user; try { user=await auth.getUser(uid); } catch { return null; }
    if (user.disabled || !user.email) return null;
    if (user.email.toLowerCase()!==ADMIN_EMAIL) { const staff=await db.collection('staff_members').doc(uid).get(); if (!staff.exists || staff.data().status!=='active') return null; }
    return user;
  }
  async function claim(ref,now) {
    return db.runTransaction(async tx=>{
      const snap=await tx.get(ref); if (!snap.exists) return null; const job=snap.data();
      const lockRef=db.collection('admin_task_calendar_locks').doc(job.taskId);
      const lock=job.kind==='calendar'?await tx.get(lockRef):null;
      if (!['queued','processing'].includes(job.status) || job.nextAtMs>now || job.status==='processing' && job.leaseUntilMs>now) return null;
      if(lock?.exists && lock.data().untilMs>now)return null;
      if (job.emailDispatching) {tx.update(ref,{status:'delivery_unknown',error:'email_delivery_unknown',needsAttention:true});return null;}
      const token=randomUUID();if(job.kind==='calendar')tx.set(lockRef,{token,untilMs:now+120000});tx.update(ref,{status:'processing',leaseToken:token,leaseUntilMs:now+120000,attempts:job.attempts+1,nextAtMs:now+120000});return {...job,id:ref.id,leaseToken:token,attempts:job.attempts+1};
    });
  }
  async function finish(ref,job,updates) {
    await db.runTransaction(async tx=>{const snap=await tx.get(ref);const lockRef=db.collection('admin_task_calendar_locks').doc(job.taskId);const lock=job.kind==='calendar'?await tx.get(lockRef):null;if(snap.exists && snap.data().leaseToken===job.leaseToken){tx.update(ref,{...updates,leaseUntilMs:0,updatedAt:new Date(clock()).toISOString()});if(lock?.data()?.token===job.leaseToken)tx.set(lockRef,{token:'',untilMs:0});}});
  }
  async function history(task,event,error) {await tasks.doc(task.id).collection('activity').doc(hash(`${task.revision}:${event}:${error || ''}`)).set({event,error:error || null,actorUid:'system',revision:task.revision,at:new Date(clock()).toISOString()});}
  async function execute(ref,job) {
    const snapshot=await tasks.doc(job.taskId).get(), task=snapshot.exists?snapshot.data():null;
    if (staleJob(job,task,clock())) return finish(ref,job,{status:'cancelled',needsAttention:false});
    // The initiating owner must remain enabled, even during unattended execution.
    const owner=await recipient(job.ownerUid); if(!owner || owner.email.toLowerCase()!==ADMIN_EMAIL) return finish(ref,job,{status:'cancelled',error:'owner_unavailable'});
    let providerAccepted=false;
    try {
      if(job.kind==='calendar') {
        let result;
        if (!task.calendarEnabled && !task.calendar?.eventId) result={status:'disabled',eventUrl:null,error:null};
        else result=await calendar(db,task,task.calendar);
        await db.runTransaction(async tx=>{const fresh=await tx.get(tasks.doc(task.id));if(fresh.exists && fresh.data().revision===task.revision) tx.update(tasks.doc(task.id),{calendar:result});});
        await history(task,'calendar_synced');
      } else if(job.kind==='notify') {
        const recipients=job.recipientIds || [task.ownerUid,task.assigneeUid].filter(Boolean);
        for(const uid of [...new Set(recipients)]) {
          const user=await recipient(uid); if(!user)continue;
          const deliveryKey=/^(reminder_|overdue)/.test(job.event)?`${task.id}:${task.dueAt}:${job.event}:${uid}`:`${job.id}:${uid}`;
          const notificationId=hash(`admin-task:${deliveryKey}`), notification=db.collection('studio_notifications').doc(notificationId);
          const admin=user.email.toLowerCase()===ADMIN_EMAIL;
          await db.runTransaction(async tx=>{const seen=await tx.get(notification);if(!seen.exists)tx.create(notification,{recipientId:uid,kind:'task',title:task.title,body:`${eventLabel(job.event)} · ${task.priority} priority${task.localDue?` · Due ${task.localDue.replace('T',' ')} (${task.timezone})`:''}`,href:admin?`/admin/task-manager?task=${task.id}`:'/staff/notifications',read:false,createdAt:new Date(clock()).toISOString()});});
          if(task.emailEnabled && emailAllowed(await readEmailPreferences(db,task.ownerUid),job.event)) {
            const emailRef=jobs.doc(hash(`email:${deliveryKey}`));
            await db.runTransaction(async tx=>{const exists=await tx.get(emailRef);if(!exists.exists)tx.create(emailRef,{kind:'email',taskId:task.id,ownerUid:task.ownerUid,recipientUid:uid,event:job.event,dueAt:task.dueAt,revision:task.revision,status:'queued',attempts:0,nextAtMs:clock(),createdAt:new Date(clock()).toISOString()});});
          }
        }
      } else if(job.kind==='email') {
        if(!task.emailEnabled || !emailAllowed(await readEmailPreferences(db,task.ownerUid),job.event))return finish(ref,job,{status:'cancelled',needsAttention:false});
        const user=await recipient(job.recipientUid);if(!user)return finish(ref,job,{status:'cancelled'});
        if(!emailSetup().configured) throw Object.assign(new Error(),{code:'email_not_configured'});
        await finish(ref,job,{emailDispatching:true});
        await email(user,{...task,assignedByName:owner.displayName || 'DevEngine administration'},job.event,user.email.toLowerCase()===ADMIN_EMAIL);
        providerAccepted=true;
      }
      await finish(ref,job,{status:'done',emailDispatching:false,error:null,needsAttention:false});
    } catch(error) {
      const known=new Set(['calendar_not_configured','calendar_not_connected','calendar_reconnect_required','calendar_connection_changed','calendar_event_ownership_mismatch','google_403','google_404','google_409','google_410','google_429','google_temporarily_unavailable','email_not_configured','email_rate_limited','email_delivery_unknown','email_rejected','email_recipient_unavailable']);
      const code=providerAccepted?'email_delivery_unknown':known.has(error.code) || EMAIL_REJECTION_CODES.includes(error.code)?error.code:'integration_temporarily_unavailable';
      const unknown=code==='email_delivery_unknown', permanent=EMAIL_REJECTION_CODES.includes(code) || ['calendar_not_connected','calendar_reconnect_required','calendar_event_ownership_mismatch','google_403','google_410'].includes(code);
      await finish(ref,job,{status:unknown?'delivery_unknown':permanent || job.attempts>=8?'failed':'queued',emailDispatching:unknown,nextAtMs:clock()+retryDelay(job.attempts),error:code,needsAttention:true});
      await history(task,`${job.kind}_failed`,code);
      if(job.kind==='calendar') {
        await db.runTransaction(async tx=>{const fresh=await tx.get(tasks.doc(task.id));if(fresh.exists && fresh.data().revision===task.revision)tx.update(tasks.doc(task.id),{calendar:{...task.calendar,status:'error',error:code}});});
        const warn=jobs.doc(hash(`sync-failure:${job.taskId}:${job.revision}`));
        await db.runTransaction(async tx=>{const seen=await tx.get(warn);if(!seen.exists)tx.create(warn,{kind:'notify',event:'calendar_sync_failed',taskId:task.id,ownerUid:task.ownerUid,recipientIds:[task.ownerUid],revision:task.revision,status:'queued',attempts:0,nextAtMs:clock()});});
      }
    }
  }
  return { async runCalendar(taskId,revision) {
    // Complete the newly saved task's calendar job before a serverless response ends.
    // This shares the scheduler's durable claim and per-task lock; never launches
    // detached promises or runs unrelated notification/email jobs.
    const ref=jobs.doc(hash(`${taskId}:${revision}:calendar`));
    const job=await claim(ref,clock());
    if(job)await execute(ref,job);
  }, async run(limit=25) {
    const start=clock(),due=await jobs.where('status','in',['queued','processing']).where('nextAtMs','<=',start).orderBy('nextAtMs').limit(limit).get();
    let processed=0,emailUsed=false;
    for(const doc of due.docs) {if(clock()-start>40000)break;if(doc.data().kind==='email' && emailUsed)continue;const job=await claim(doc.ref,clock());if(!job)continue;if(job.kind==='email')emailUsed=true;await execute(doc.ref,job);processed++;}
    await jobs.doc('worker_health').set({kind:'worker_health',lastRunAt:new Date(clock()).toISOString(),processed});
    return {processed};
  } };
}
module.exports = { makeWorker,retryDelay,staleJob };
