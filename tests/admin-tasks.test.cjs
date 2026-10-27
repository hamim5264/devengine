const {test}=require('node:test');
const assert=require('node:assert/strict');
const {MemoryDB}=require('./helpers/task-db.cjs');
const {normalize,instant,reminders,eventId}=require('../lib/server/tasks/model');
const {makeRepository,TASKS,JOBS}=require('../lib/server/tasks/repository');
const {makeWorker,retryDelay,staleJob}=require('../lib/server/tasks/worker');
const {createTaskHandlers,schedulerAuthorized}=require('../lib/server/tasks/handlers');
const {identityOptions,ADMIN_EMAIL}=require('../lib/server/admin');
const {template,emailConfiguration}=require('../lib/server/tasks/email');
const {syncTask,disconnect}=require('../lib/server/tasks/calendar');
const {readConfig,SCOPES}=require('../lib/server/calendar/config');
const {seal,unseal,contextFor}=require('../lib/server/calendar/security');
const NOW=Date.parse('2026-10-27T06:00:00Z'),UID='owner-test';
const auth={async getUser(uid){return {uid,email:uid===UID?ADMIN_EMAIL:'employee@example.com',disabled:false,tokensValidAfterTime:new Date(0).toISOString()};},async verifyIdToken(){return {uid:UID,auth_time:NOW/1000-20};}};
const response=()=>({statusCode:200,headers:{},status(v){this.statusCode=v;return this;},setHeader(k,v){this.headers[k]=v;},json(v){this.body=v;return this;}});
const request=(body)=>({method:'POST',headers:{host:'localhost:3000',origin:'http://localhost:3000','content-type':'application/json',authorization:'Bearer fake-token-for-complete-offline-testing'},body,query:{}});
function fixture(){const db=new MemoryDB(),repo=makeRepository(db);return {db,repo,create:async(data={},requestId='task_one')=>repo.mutate(UID,'create',{requestId,data:{title:'Build task manager',...data}},NOW)};}
function calendarFixture(db){const config=readConfig({NODE_ENV:'test',NEXT_PUBLIC_FIREBASE_PROJECT_ID:'demo-task-tests',GOOGLE_CALENDAR_CLIENT_ID:'test.apps.googleusercontent.com',GOOGLE_CALENDAR_CLIENT_SECRET:'fake-secret',GOOGLE_CALENDAR_REDIRECT_URI:'http://localhost:3000/api/admin/calendar/callback',GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY:Buffer.alloc(32,3).toString('base64')});const tokens={accessToken:'fake-access',refreshToken:'fake-refresh',expiryDate:NOW+3600000,scopes:SCOPES};db.values.set(`admin_calendar_connections/${UID}`,{uid:UID,generation:'g1',clientId:config.clientId,encryptedTokens:seal(tokens,config.key,contextFor(config,'tokens',UID))});const events=new Map(),calls=[];const client={setCredentials(value){this.credentials=value;},async request({method,url,data}){const id=url.split('/events/')[1]?.split('?')[0];calls.push({method,url,data});if(method==='GET'){if(!events.has(id))throw {response:{status:404}};return {data:events.get(id)};}if(method==='POST'){if(events.has(data.id))throw {response:{status:409}};events.set(data.id,{...data,htmlLink:'https://www.google.com/calendar/event?fake'});return {data:events.get(data.id)};}if(method==='DELETE'){events.set(id,{id,status:'cancelled'});return {data:{}};}events.set(id,{...events.get(id),...data});return {data:events.get(id)};},async revokeToken(){return {};}};return {config,tokens,events,calls,client,factory:()=>client};}

test('task model rejects forged metadata, invalid state transitions, bad links and malformed subtasks',()=>{
  assert.equal(normalize({title:' Task '}).title,'Task');
  for(const value of [{title:''},{title:'x',ownerUid:'attacker'},{title:'x',status:'review'},{title:'x',calendarEnabled:'true'},{title:'x',links:['javascript:alert(1)']},{title:'x',reminderMinutes:[0]},{title:'x',subtasks:[{title:'',done:false}]}])assert.throws(()=>normalize(value));
  const completed=normalize({title:'x',status:'completed'});assert.throws(()=>normalize({status:'in_progress'},completed),{code:'reopen_completed_task_as_todo'});assert.equal(normalize({status:'todo'},completed).status,'todo');
});
test('timezone scheduling handles Dhaka, DST changes and rejects ambiguous/nonexistent wall times',()=>{
  assert.equal(instant('2026-10-27T12:00','Asia/Dhaka'),'2026-10-27T06:00:00.000Z');
  assert.equal(instant('2026-07-01T12:00','America/New_York'),'2026-07-01T16:00:00.000Z');
  assert.throws(()=>instant('2026-03-08T02:30','America/New_York'),{code:'nonexistent_local_time'});
  assert.throws(()=>instant('2026-11-01T01:30','America/New_York'),{code:'ambiguous_daylight_saving_time'});
  assert.throws(()=>normalize({title:'x',localStart:'2026-10-28T13:00',localDue:'2026-10-28T12:00'}),{code:'deadline_must_follow_start'});
});
test('create is idempotent, audit/jobs are server-owned, edits enforce optimistic concurrency',async()=>{
  const f=fixture(),first=await f.create(),again=await f.create();assert.equal(first.id,again.id);assert.equal(again.revision,1);
  assert.equal([...f.db.values.keys()].filter(key=>key.includes('/activity/')).length,1);
  const next=await f.repo.mutate(UID,'update',{id:first.id,revision:1,data:{status:'completed'}},NOW+1);assert.equal(next.completedAt,new Date(NOW+1).toISOString());
  await assert.rejects(f.repo.mutate(UID,'update',{id:first.id,revision:1,data:{title:'stale'}},NOW+2),{code:'task_changed_refresh'});
  await assert.rejects(f.repo.detail('other-owner',first.id),{code:'task_not_found'});
  assert.ok([...f.db.values.keys()].some(key=>key.startsWith(JOBS+'/')));
});
test('assignee uses existing active employees; duplicate/archive/restore/delete preserve history',async()=>{
  const f=fixture();await assert.rejects(f.create({assigneeUid:'missing'}),{code:'assignee_unavailable'});
  f.db.values.set('staff_members/employee',{name:'Team member',status:'active'});const task=await f.create({assigneeUid:'employee'});assert.equal(task.assigneeName,'Team member');
  const duplicate=await f.repo.mutate(UID,'duplicate',{id:task.id,requestId:'copy_one'},NOW);assert.equal(duplicate.status,'todo');assert.equal(duplicate.localDue,'');
  const archived=await f.repo.mutate(UID,'archive',{id:task.id,revision:1},NOW);assert.ok(archived.archived);
  await assert.rejects(f.repo.mutate(UID,'update',{id:task.id,revision:2,data:{title:'blocked edit'}},NOW),{code:'restore_task_before_editing'});
  const restored=await f.repo.mutate(UID,'restore',{id:task.id,revision:2},NOW);assert.equal(restored.archived,false);
  const removed=await f.repo.mutate(UID,'delete',{id:task.id,revision:3},NOW);assert.ok(removed.deleted);assert.ok((await f.repo.detail(UID,task.id)).activity.length>=4);
});
test('queries are bounded and paginated without loading other owners',async()=>{
  const f=fixture();for(let i=0;i<45;i++)f.db.values.set(`${TASKS}/id_${String(i).padStart(2,'0')}`,{id:`id_${String(i).padStart(2,'0')}`,ownerUid:UID});f.db.values.set(`${TASKS}/foreign`,{ownerUid:'other'});
  const first=await f.repo.list(UID),second=await f.repo.list(UID,{cursor:first.nextCursor});assert.equal(first.tasks.length,40);assert.equal(second.tasks.length,5);assert.equal(second.nextCursor,null);assert.ok(f.db.requests.every(query=>query.max===41));
});
test('manual calendar retry preserves task revision and does not recreate notifications or reminders',async()=>{
  const f=fixture(),task=await f.create({localDue:'2026-10-29T12:00'});const before=[...f.db.values.keys()].filter(key=>key.startsWith(JOBS+'/')).sort();
  const retried=await f.repo.mutate(UID,'retry',{id:task.id,revision:1},NOW+1);assert.equal(retried.revision,1);assert.deepEqual([...f.db.values.keys()].filter(key=>key.startsWith(JOBS+'/')).sort(),before);
});
test('deadline jobs are deterministic, old revisions are cancelled, completed tasks do not remind',()=>{
  const task={...normalize({title:'x',localDue:'2026-10-29T12:00'}),revision:2};const planned=reminders(task,NOW);assert.equal(new Set(planned.map(v=>v.event)).size,3);assert.equal(reminders({...task,status:'completed'},NOW).length,0);assert.ok(staleJob({revision:1,event:'overdue'},task));assert.ok(staleJob({revision:2,event:'reminder_60'}, {...task,archived:true}));assert.ok(retryDelay(3)>retryDelay(1));assert.ok(retryDelay(30)<=21600000);
});
test('calendar retry/update uses stable IDs and never creates a duplicate event',async()=>{
  const f=fixture(),task=await f.create({calendarEnabled:true,localDue:'2026-10-29T12:00'}),g=calendarFixture(f.db);
  const first=await syncTask(f.db,task,task.calendar,g);await syncTask(f.db,{...task,title:'Updated'},first,g);
  assert.equal(g.events.size,1);assert.equal(g.calls.filter(v=>v.method==='POST').length,1);assert.equal(first.eventId,eventId(UID,task.id));assert.equal([...g.events.values()][0].summary,'Updated');
  const stored=f.db.values.get(`admin_calendar_connections/${UID}`);assert.ok(!JSON.stringify(stored).includes(g.tokens.refreshToken));assert.equal(unseal(stored.encryptedTokens,g.config.key,contextFor(g.config,'tokens',UID)).refreshToken,g.tokens.refreshToken);
});
test('calendar blocks unrelated event edits and surfaces actual provider errors',async()=>{
  const f=fixture(),task=await f.create({calendarEnabled:true,localDue:'2026-10-29T12:00'}),g=calendarFixture(f.db);g.events.set(eventId(UID,task.id),{summary:'Unrelated',extendedProperties:{private:{devengineTaskId:'other'}}});
  await assert.rejects(syncTask(f.db,task,task.calendar,g),{code:'calendar_event_ownership_mismatch'});assert.equal(g.calls.length,1);
  g.client.request=async()=>{throw {response:{status:429}};};await assert.rejects(syncTask(f.db,task,task.calendar,g),{code:'google_429'});
});
test('removed schedule cancels only the tracked event; re-adding uses a durable replacement ID',async()=>{
  const f=fixture(),task=await f.create({calendarEnabled:true,localDue:'2026-10-29T12:00'}),g=calendarFixture(f.db);const first=await syncTask(f.db,task,task.calendar,g);
  const off=await syncTask(f.db,{...task,calendarEnabled:false},first,g);assert.equal(off.status,'disabled');assert.equal(g.events.get(first.eventId).status,'cancelled');
  const next=await syncTask(f.db,task,off,g);assert.notEqual(next.eventId,first.eventId);assert.equal(f.db.values.get(`${TASKS}/${task.id}`).calendar.eventId,next.eventId);
});
test('worker notifications deduplicate and never send email unless enabled/configured',async()=>{
  const f=fixture();await f.create();let emails=0;const worker=makeWorker(f.db,auth,{now:()=>NOW,sendTaskEmail:async()=>emails++});await worker.run();await worker.run();
  const notices=[...f.db.values.keys()].filter(key=>key.startsWith('studio_notifications/'));assert.equal(notices.length,1);assert.equal(emails,0);assert.equal(f.db.values.get(notices[0]).recipientId,UID);
});
test('calendar failures have bounded backoff, sanitized audit and owner-only failure notifications',async()=>{
  const f=fixture();await f.create({calendarEnabled:true,localDue:'2026-10-29T12:00'});
  const worker=makeWorker(f.db,auth,{now:()=>NOW,syncTask:async()=>{throw {code:'google_429',message:'secret-upstream-token'};}});await worker.run();
  const failed=[...f.db.values.values()].find(v=>v.kind==='calendar');assert.equal(failed.status,'queued');assert.ok(failed.nextAtMs>NOW);assert.equal(failed.error,'google_429');assert.equal(failed.needsAttention,true);assert.ok(!JSON.stringify([...f.db.values.values()]).includes('secret-upstream'));
});
test('job leases prevent concurrent notifications; email crash is flagged instead of blindly resent',async()=>{
  const f=fixture();await f.create();await Promise.all([makeWorker(f.db,auth,{now:()=>NOW}).run(),makeWorker(f.db,auth,{now:()=>NOW}).run()]);assert.equal([...f.db.values.keys()].filter(k=>k.startsWith('studio_notifications/')).length,1);
  f.db.values.set(`${JOBS}/email_crash`,{kind:'email',taskId:'task_one',ownerUid:UID,recipientUid:UID,revision:1,status:'processing',emailDispatching:true,attempts:1,nextAtMs:NOW-1,leaseUntilMs:NOW-1});await makeWorker(f.db,auth,{now:()=>NOW}).run();assert.equal(f.db.values.get(`${JOBS}/email_crash`).status,'delivery_unknown');
});
test('API and scheduler access boundaries reject untrusted callers before touching storage',async()=>{
  const handlers=createTaskHandlers({getServerFirebase(){throw Error('must not run');}});
  const res=response();await handlers.worker({method:'GET',headers:{authorization:'Bearer invalid'}},res);assert.equal(res.statusCode,401);
  assert.equal(schedulerAuthorized('Bearer '+ 'x'.repeat(32),'x'.repeat(32)),true);assert.equal(schedulerAuthorized('Bearer wrong','x'.repeat(32)),false);
  const denied=response();await handlers.index({...request({}),headers:{...request({}).headers,authorization:''}},denied);assert.equal(denied.statusCode,401);
  const cross=response();await handlers.index({...request({}),headers:{...request({}).headers,origin:'https://evil.example'}},cross);assert.equal(cross.statusCode,403);
  const employee=createTaskHandlers({getServerFirebase:()=>({db:new MemoryDB(),auth:{...auth,async getUser(){return {uid:UID,email:'employee@example.com'};}}})});const forbidden=response();await employee.index(request({action:'create',requestId:'forged',data:{title:'No'}}),forbidden);assert.equal(forbidden.statusCode,403);
});
test('Firebase identity selection is explicit, keyless by default, and fails closed on incomplete WIF',()=>{
  assert.equal(identityOptions({}),'adc');assert.throws(()=>identityOptions({VERCEL:'1'}));assert.throws(()=>identityOptions({VERCEL:'1',FIREBASE_ADMIN_AUTH_MODE:'adc'}));assert.equal(identityOptions({FIREBASE_ADMIN_AUTH_MODE:'service_account'}),'service_account');
  assert.equal(identityOptions({VERCEL:'1',GCP_WORKLOAD_IDENTITY_AUDIENCE:'//iam.googleapis.com/projects/123/locations/global/workloadIdentityPools/vercel/providers/app',GCP_SERVICE_ACCOUNT_EMAIL:'tasks@demo-project.iam.gserviceaccount.com'}),'wif');
});
test('email template escapes task text and configuration never invents a provider',()=>{
  const message=template({...normalize({title:'<script>alert(1)</script>'}),id:'one',dueAt:null},'assigned','https://www.devenginehq.com/admin/task-manager');assert.ok(!message.task_title.includes('<script>'));assert.ok(message.task_title.includes('&lt;script&gt;'));assert.equal(emailConfiguration({}).configured,false);assert.ok(emailConfiguration({}).missing.includes('EMAILJS_TASK_TEMPLATE_ID'));
});
test('disconnect revokes before removing the stored encrypted grant; failure preserves reconnect data',async()=>{
  const f=fixture(),g=calendarFixture(f.db);
  g.client.revokeToken=async()=>{throw Error('provider diagnostic secret');};
  await assert.rejects(disconnect(f.db,UID,g),{code:'calendar_revocation_failed'});assert.ok(f.db.values.get(`admin_calendar_connections/${UID}`).encryptedTokens);
  g.client.revokeToken=async token=>{assert.equal(token,g.tokens.refreshToken);};await disconnect(f.db,UID,g);assert.equal(f.db.values.get(`admin_calendar_connections/${UID}`).disconnected,true);assert.equal(f.db.values.get(`admin_calendar_connections/${UID}`).encryptedTokens,undefined);
});
test('real Firebase SDK initialization accepts the shared federated Auth/Firestore client without network or keys',()=>{
  const {execFileSync}=require('node:child_process');
  const output=execFileSync(process.execPath,['-e',`const result=require('./lib/server/admin').getServerFirebase(); console.log(Boolean(result.auth && result.db._settings.authClient));`],{cwd:require('node:path').resolve(__dirname,'..'),env:{PATH:process.env.PATH,NODE_ENV:'production',VERCEL:'1',NEXT_PUBLIC_FIREBASE_PROJECT_ID:'demo-initialization',GCP_WORKLOAD_IDENTITY_AUDIENCE:'//iam.googleapis.com/projects/123/locations/global/workloadIdentityPools/vercel/providers/app',GCP_SERVICE_ACCOUNT_EMAIL:'tasks@demo-project.iam.gserviceaccount.com'},encoding:'utf8'});
  assert.equal(output.trim(),'true');
});
test('Firebase initialization failures never expose credential material',()=>{
  const {execFileSync}=require('node:child_process');
  const output=execFileSync(process.execPath,['-e',`try {require('./lib/server/admin').getServerFirebase();} catch(error) {console.log(error.message);}`],{cwd:require('node:path').resolve(__dirname,'..'),env:{PATH:process.env.PATH,NODE_ENV:'test',NEXT_PUBLIC_FIREBASE_PROJECT_ID:'demo-initialization',FIREBASE_ADMIN_AUTH_MODE:'service_account',FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON:'{"private_key":"fake-sensitive-fixture"}'},encoding:'utf8'});
  assert.equal(output.trim(),'Server configuration unavailable.');assert.ok(!output.includes('fake-sensitive'));
});
