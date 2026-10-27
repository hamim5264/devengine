const { randomUUID } = require('node:crypto');
const { FieldPath } = require('firebase-admin/firestore');
const { normalize, reminders, hash, fail, id } = require('./model');
const TASKS = 'admin_tasks', JOBS = 'admin_task_jobs';
function makeRepository(db) {
  const tasks = db.collection(TASKS), jobs = db.collection(JOBS);
  async function assignee(uid) {
    if (!uid) return '';
    const snap = await db.collection('staff_members').doc(id(uid)).get();
    if (!snap.exists || snap.data().status !== 'active') fail('assignee_unavailable');
    return snap.data().name || 'Employee';
  }
  function queue(tx, task, event, now, recipientIds) {
    const base = { taskId:task.id, ownerUid:task.ownerUid, revision:task.revision, attempts:0, status:'queued', nextAtMs:now, createdAt:new Date(now).toISOString() };
    tx.set(jobs.doc(hash(`${task.id}:${task.revision}:calendar`)), { ...base, kind:'calendar', event:'sync' });
    tx.set(jobs.doc(hash(`${task.id}:${task.revision}:${event}`)), { ...base, kind:'notify', event, recipientIds });
    for (const reminder of reminders(task,now)) tx.set(jobs.doc(hash(`${task.id}:${task.revision}:${reminder.event}`)), { ...base, kind:'notify', event:reminder.event, recipientIds, nextAtMs:reminder.runAtMs });
  }
  return {
    async upcoming(ownerUid,now=Date.now()){
      const snap=await tasks.where('ownerUid','==',ownerUid).where('deleted','==',false).where('archived','==',false).where('status','in',['todo','in_progress','blocked']).where('dueAtMs','>',now).where('dueAtMs','<=',now+7*86400000).orderBy('dueAtMs','asc').limit(5).get();
      return snap.docs.map(doc=>doc.data());
    },
    async summary(ownerUid, now = Date.now()) {
      const base=tasks.where('ownerUid','==',ownerUid).where('deleted','==',false).where('archived','==',false);
      const queries=[base,base.where('status','==','todo'),base.where('status','==','in_progress'),base.where('status','==','completed')];
      // Split overdue by concrete status to keep Firestore's range/index rules predictable.
      const counts=await Promise.all(queries.map(query=>query.count().get()));
      const overdue=await Promise.all(['todo','in_progress','blocked'].map(status=>base.where('status','==',status).where('dueAtMs','>',0).where('dueAtMs','<',now).count().get()));
      return {total:counts[0].data().count,pending:counts[1].data().count,inProgress:counts[2].data().count,completed:counts[3].data().count,overdue:overdue.reduce((sum,snap)=>sum+snap.data().count,0)};
    },
    async list(ownerUid, params = {}) {
      const count = 40;
      let query = tasks.where('ownerUid','==',ownerUid).orderBy(FieldPath.documentId());
      if (params.cursor) query = query.startAfter(id(params.cursor));
      const snap = await query.limit(count+1).get();
      return { tasks:snap.docs.slice(0,count).map(doc=>doc.data()), nextCursor:snap.docs.length>count?snap.docs[count-1].id:null };
    },
    async detail(ownerUid, taskId) {
      const ref = tasks.doc(id(taskId)), snap = await ref.get();
      if (!snap.exists || snap.data().ownerUid !== ownerUid) fail('task_not_found',404);
      const history = await ref.collection('activity').orderBy('at','desc').limit(40).get();
      return { task:snap.data(), activity:history.docs.map(doc=>({id:doc.id,...doc.data()})) };
    },
    async mutate(ownerUid, action, input, now = Date.now()) {
      const taskId = action === 'create' || action === 'duplicate' ? id(input.requestId) : id(input.id);
      const ref = tasks.doc(taskId);
      let source;
      if (action === 'duplicate') source = (await this.detail(ownerUid,input.id)).task;
      const previous=action==='update' ? await ref.get():null;
      if(previous && (!previous.exists || previous.data().ownerUid!==ownerUid))fail('task_not_found',404);
      const data = ['create','update','duplicate'].includes(action) ? normalize(action==='duplicate' ? {title:`${source.title.slice(0,160)} (copy)`,description:source.description,priority:source.priority,category:source.category,project:source.project,tags:source.tags,links:source.links,timezone:source.timezone,subtasks:source.subtasks.map(s=>({...s,done:false})),assigneeUid:source.assigneeUid} : input.data, previous?.data()) : null;
      const name = data ? await assignee(data.assigneeUid) : '';
      return db.runTransaction(async tx => {
        const snap = await tx.get(ref), old = snap.exists?snap.data():null;
        if (old && old.ownerUid !== ownerUid) fail('task_not_found',404);
        if (['create','duplicate'].includes(action) && old) { if (old.createdRequestId === input.requestId) return old; fail('task_already_exists',409); }
        if (!['create','duplicate'].includes(action) && !old) fail('task_not_found',404);
        if (old && (old.revision !== input.revision || old.deleted)) fail('task_changed_refresh',409);
        if (old?.archived && !['restore','delete','retry'].includes(action)) fail('restore_task_before_editing',409);
        if(action==='retry'){
          const job=jobs.doc(hash(`${taskId}:${old.revision}:calendar`)),existing=await tx.get(job);
          if(existing.exists && existing.data().status==='processing' && existing.data().leaseUntilMs>now)return old;
          tx.set(job,{taskId,ownerUid,revision:old.revision,kind:'calendar',event:'sync',status:'queued',attempts:0,nextAtMs:now,createdAt:new Date(now).toISOString(),error:null,needsAttention:false});
          const calendar={...old.calendar,status:'queued',error:null};tx.update(ref,{calendar});
          tx.set(ref.collection('activity').doc(randomUUID()),{event:'calendar_retry_requested',actorUid:ownerUid,at:new Date(now).toISOString(),revision:old.revision});
          return {...old,calendar};
        }
        const task = { ...old, ...data, id:taskId, ownerUid, revision:(old?.revision || 0)+1,
          createdAt:old?.createdAt || new Date(now).toISOString(), createdBy:old?.createdBy || ownerUid, createdRequestId:old?.createdRequestId || input.requestId || '', updatedAt:new Date(now).toISOString(), updatedBy:ownerUid,
          assigneeName:data?name:old?.assigneeName || '', archived:old?.archived || false, deleted:false };
        if (action === 'archive') task.archived = true;
        if (action === 'restore') task.archived = false;
        if (action === 'delete') task.deleted = true;
        task.completedAt = task.status==='completed'?(old?.completedAt || new Date(now).toISOString()):null;
        task.calendar = { ...old?.calendar, status:'queued', error:null };
        const event = !old?'created':action==='delete'?'deleted':action==='archive'?'archived':action==='restore'?'restored':old.status!==task.status?task.status==='completed'?'completed':'status_changed':old.assigneeUid!==task.assigneeUid?'assigned':'updated';
        const recipients = [...new Set([ownerUid,task.assigneeUid,old?.assigneeUid].filter(Boolean))];
        queue(tx,task,event,now,recipients);
        tx.set(ref,task);
        tx.set(ref.collection('activity').doc(randomUUID()), { event,actorUid:ownerUid,at:new Date(now).toISOString(),revision:task.revision });
        return task;
      });
    },
    async people() {
      const snap = await db.collection('staff_members').where('status','==','active').limit(100).get();
      return snap.docs.map(doc=>({uid:doc.id,name:doc.data().name || 'Employee'}));
    },
    async failures(ownerUid) {
      const snap = await jobs.where('ownerUid','==',ownerUid).where('needsAttention','==',true).limit(30).get();
      return snap.docs.map(doc=>({id:doc.id,taskId:doc.data().taskId,kind:doc.data().kind,error:doc.data().error,status:doc.data().status,attempts:doc.data().attempts}));
    },
  };
}
module.exports = { TASKS, JOBS, makeRepository };
