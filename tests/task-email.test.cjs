const {test}=require('node:test');
const assert=require('node:assert/strict');
const {MemoryDB}=require('./helpers/task-db.cjs');
const {providerConfiguration,emailConfiguration,sendTaskEmail}=require('../lib/server/tasks/email');
const {readEmailPreferences,saveEmailPreferences,validatePreferences,emailAllowed,sendTestEmail}=require('../lib/server/tasks/emailPreferences');
const {createTaskHandlers}=require('../lib/server/tasks/handlers');
const {makeWorker}=require('../lib/server/tasks/worker');
const {makeRepository}=require('../lib/server/tasks/repository');
const {ADMIN_EMAIL}=require('../lib/server/admin');
const NOW=Date.parse('2026-10-27T06:00:00Z'),UID='admin';
const env={NEXT_PUBLIC_EMAILJS_DELETION_SERVICE_ID:'shared-gmail',NEXT_PUBLIC_EMAILJS_DELETION_PUBLIC_KEY:'shared-public',NEXT_PUBLIC_EMAILJS_DELETION_TEMPLATE_ID:'deletion-template',EMAILJS_TASK_TEMPLATE_ID:'task-template',EMAILJS_PRIVATE_KEY:'fake-server-private-key'};
const user={uid:UID,email:ADMIN_EMAIL,displayName:'Admin <name>'};
const auth={async getUser(uid){assert.equal(uid,UID);return user;},async verifyIdToken(){return {uid:UID,auth_time:NOW/1000-1};}};
const task={id:'task-1',title:'A <script> task',description:'Details <img src=x>',status:'in_progress',priority:'high',dueAt:null,timezone:'Asia/Dhaka',assignedByName:'Admin <b>name</b>'};
const req=body=>({method:'POST',headers:{host:'localhost:3000',origin:'http://localhost:3000','content-type':'application/json',authorization:'Bearer fake-token-for-offline-email-testing'},body,query:{}});
const res=()=>({statusCode:200,status(code){this.statusCode=code;return this;},setHeader(){},json(value){this.body=value;return this;}});

test('task mail reuses deletion account identifiers but never its template',()=>{
  const config=providerConfiguration({...env,EMAILJS_SERVICE_ID:'other-service',EMAILJS_PUBLIC_KEY:'other-public'});
  assert.equal(config.serviceId,'shared-gmail');assert.equal(config.publicKey,'shared-public');assert.equal(config.templateId,'task-template');
  assert.ok(!JSON.stringify(emailConfiguration(env)).includes(env.EMAILJS_PRIVATE_KEY));assert.ok(!JSON.stringify(emailConfiguration(env)).includes(env.NEXT_PUBLIC_EMAILJS_DELETION_PUBLIC_KEY));
});
test('provider gets the exact template parameters, escaped content, trusted links, and private server authentication',async()=>{
  let body;
  const result=await sendTaskEmail(user,task,'assigned',true,async(url,options)=>{assert.equal(url,'https://api.emailjs.com/api/v1.0/email/send');body=JSON.parse(options.body);return {ok:true};},env);
  assert.deepEqual(Object.keys(body.template_params).sort(),['to_name','to_email','email_subject','email_heading','notification_message','task_title','task_description','task_status','task_priority','task_due_date','assigned_by','task_url','dashboard_url'].sort());
  assert.equal(body.template_params.to_email,ADMIN_EMAIL);assert.equal(body.accessToken,env.EMAILJS_PRIVATE_KEY);assert.equal(body.template_id,'task-template');
  assert.ok(body.template_params.task_title.includes('&lt;script&gt;'));assert.ok(body.template_params.task_description.includes('&lt;img'));assert.equal(body.template_params.task_due_date,'No deadline');assert.ok(body.template_params.assigned_by.includes('&lt;b&gt;'));
  assert.equal(body.template_params.task_url,'https://www.devenginehq.com/admin/task-manager?task=task-1');assert.equal(result.status,'provider_accepted');assert.ok(!JSON.stringify(result).includes('private'));
});
test('missing task template/private key never calls the provider; recipient is validated',async()=>{
  let calls=0;const send=async()=>{calls++;return {ok:true};};
  await assert.rejects(sendTaskEmail(user,task,'assigned',true,send,{...env,EMAILJS_TASK_TEMPLATE_ID:''}),{code:'email_not_configured'});
  await assert.rejects(sendTaskEmail(user,task,'assigned',true,send,{...env,EMAILJS_PRIVATE_KEY:''}),{code:'email_not_configured'});
  await assert.rejects(sendTaskEmail({...user,email:'attacker\r\nBcc: someone'},task,'assigned',true,send,env),{code:'email_recipient_unavailable'});assert.equal(calls,0);
});
test('provider rejection, rate limit, timeout and uncertain failures never claim delivery',async()=>{
  for(const [status,code]of [[400,'email_rejected'],[429,'email_rate_limited'],[500,'email_delivery_unknown']])await assert.rejects(sendTaskEmail(user,task,'assigned',true,async()=>({ok:false,status}),env),{code});
  await assert.rejects(sendTaskEmail(user,task,'assigned',true,async()=>{throw Error('private response');},env),{code:'email_delivery_unknown'});
});
test('preferences validate supported events and pause queued delivery',async()=>{
  const db=new MemoryDB();assert.ok(emailAllowed(await readEmailPreferences(db,UID),'reminder_60'));assert.ok(!emailAllowed(await readEmailPreferences(db,UID),'updated'));
  await saveEmailPreferences(db,UID,{enabled:false,events:['assigned']});assert.ok(!emailAllowed(await readEmailPreferences(db,UID),'assigned'));
  assert.throws(()=>validatePreferences({enabled:true,events:['unknown']}));assert.throws(()=>validatePreferences({enabled:true,events:[],to_email:'arbitrary@example.com'}));
});
test('manual tests are idempotent, self-only, and rate-limited durably',async()=>{
  const db=new MemoryDB();let calls=0;const options={env,now:NOW,send:async(target)=>{calls++;assert.equal(target.email,ADMIN_EMAIL);}};
  await sendTestEmail(db,auth,{uid:UID},'request_identifier_1',options);
  const duplicate=await sendTestEmail(db,auth,{uid:UID},'request_identifier_1',options);assert.ok(duplicate.duplicatePrevented);assert.equal(calls,1);
  await assert.rejects(sendTestEmail(db,auth,{uid:UID},'request_identifier_2',options),{code:'test_email_rate_limited'});
  await sendTestEmail(db,auth,{uid:UID},'request_identifier_2',{...options,now:NOW+60001});await sendTestEmail(db,auth,{uid:UID},'request_identifier_3',{...options,now:NOW+120002});
  await assert.rejects(sendTestEmail(db,auth,{uid:UID},'request_identifier_4',{...options,now:NOW+180003}),{code:'test_email_rate_limited'});assert.equal(calls,3);
});
test('uncertain manual tests cannot be replayed into duplicate messages',async()=>{
  const db=new MemoryDB();let calls=0;const options={env,now:NOW,send:async()=>{calls++;throw {code:'email_delivery_unknown',status:502};}};
  await assert.rejects(sendTestEmail(db,auth,{uid:UID},'request_identifier_1',options),{code:'email_delivery_unknown'});
  await assert.rejects(sendTestEmail(db,auth,{uid:UID},'request_identifier_1',options),{code:'email_delivery_unknown'});assert.equal(calls,1);
});
test('email endpoint enforces owner, same-origin JSON, and rejects arbitrary recipients before dispatch',async()=>{
  const db=new MemoryDB();let sends=0;const handler=createTaskHandlers({getServerFirebase:()=>({db,auth}),sendTestEmail:async()=>{sends++;return {status:'provider_accepted'};}});
  const missing=res();await handler.email({...req({action:'test'}),headers:{}},missing);assert.equal(missing.statusCode,403);
  const arbitrary=res();await handler.email(req({action:'test',requestId:'request_identifier_1',to_email:'other@example.com'}),arbitrary);assert.equal(arbitrary.statusCode,400);assert.equal(sends,0);
  const denied=createTaskHandlers({getServerFirebase:()=>({db,auth:{...auth,getUser:async()=>({...user,email:'employee@example.com'})}})}),employee=res();await denied.email(req({action:'test'}),employee);assert.equal(employee.statusCode,403);
  const accepted=res();await handler.email(req({action:'test',requestId:'request_identifier_1'}),accepted);assert.equal(accepted.body.status,'provider_accepted');assert.equal(sends,1);
});
test('successful worker email is not resent when Firestore acknowledgement fails',async()=>{
  const db=new MemoryDB();await makeRepository(db).mutate(UID,'create',{requestId:'task_one',data:{title:'Task',emailEnabled:true}},NOW);
  let sends=0;const worker=makeWorker(db,auth,{now:()=>NOW,emailConfiguration:()=>({configured:true}),sendTaskEmail:async()=>{sends++;}});
  await worker.run();const original=db.runTransaction.bind(db);let failOnce=true;
  db.runTransaction=callback=>original(tx=>callback({...tx,update(ref,value){if(failOnce && value.status==='done' && db.values.get(ref.path)?.kind==='email'){failOnce=false;throw Error('acknowledgement lost');}return tx.update(ref,value);}}));
  await worker.run();await worker.run();assert.equal(sends,1);assert.ok([...db.values.values()].some(row=>row.kind==='email' && row.status==='delivery_unknown'));
});
