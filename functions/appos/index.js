const { onCall,HttpsError }=require('firebase-functions/v2/https');
const { getFirestore,FieldValue,FieldPath }=require('firebase-admin/firestore');
const { actor,permissions,requirePermission }=require('./auth');
const { catalog,fail,text,id,pageCursor,list,defaults,workspace,profile,serial,moduleKeys,permissionKeys }=require('./model');
const { integration,adapter }=require('./adapters');
const iso=()=>new Date().toISOString();
const OPTIONS={region:'us-central1',maxInstances:3,concurrency:12,memory:'256MiB',timeoutSeconds:120,cors:[/^https:\/\/([a-z0-9-]+\.)?devenginehq\.com$/,'https://thedevengine.vercel.app',/^https:\/\/(thedevengine|devengine)(-[a-z0-9-]+)?\.vercel\.app$/,/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/]};
function audit(db,appId,who,action,target) {return {ref:db.collection('appos_apps').doc(appId).collection('audit').doc(),data:{actorId:who.uid,actorName:who.name,action,target:text(target,160),createdAt:iso()}};}
function attach(tx,event){tx.create(event.ref,event.data);}
const summary=(doc,who)=>{
  const data=doc.data()||{};
  return {...data,id:doc.id,status:(data.status||'DRAFT').toUpperCase(),permissions:permissions(who,doc.id)};
};
async function policies(db){const rows=await db.collection('app_policies').orderBy(FieldPath.documentId()).limit(200).get();return rows.docs.map(row=>({id:row.id,name:text(row.data().appName,160),slug:text(row.data().slug,100)}));}
exports.apposManage=onCall(OPTIONS,async request=>{
  try {
    const db=getFirestore(),who=await actor(request,db),input=request.data || {},action=input.action;
    if(action==='registry') {
      let rows;
      if(who.owner||who.access.registry?.includes('viewAll')) {let q=db.collection('appos_apps').orderBy(FieldPath.documentId()).limit(61);if(input.cursor)q=q.startAfter(id(input.cursor));const snap=await q.get();rows=snap.docs;return {apps:serial(rows.slice(0,60).map(doc=>summary(doc,who))),nextCursor:rows.length>60?rows[59].id:'',owner:who.owner,canCreate:who.owner||who.access.registry?.includes('create'),legacyPolicies:who.owner?await policies(db):[]};}
      const ids=Object.entries(who.access.apps||{}).filter(([key,value])=>/^[a-zA-Z0-9_-]{1,100}$/.test(key)&&value?.permissions?.includes('app.view')).map(([key])=>key).slice(0,200);
      rows=ids.length?await db.getAll(...ids.map(key=>db.collection('appos_apps').doc(key))):[];
      return {apps:serial(rows.filter(row=>row.exists).map(doc=>summary(doc,who))),nextCursor:'',owner:false,canCreate:who.access.registry?.includes('create')===true,legacyPolicies:[]};
    }
    if(action==='register') {
      if(!who.owner&&!who.access.registry?.includes('create'))fail('Application creation is not granted.','permission-denied');
      const data=profile(input.app||{}),ref=db.collection('appos_apps').doc(),slugRef=db.collection('appos_slugs').doc(data.slug);
      const policyId=who.owner&&input.policyId?id(input.policyId):'';
      const policy=policyId?await db.collection('app_policies').doc(policyId).get():null;
      if(policyId&&!policy.exists)fail('Legal profile not found.','not-found');
      const now=iso(),app={...data,status:(data.status||'DRAFT').toUpperCase(),workspace:defaults(),integration:{kind:'managed',connected:true,capabilities:moduleKeys,collections:{},projectId:'',baseUrl:'',health:'not_checked',verifiedAt:''},policyId,policySlug:policy?.data()?.slug||'',revision:1,createdAt:now,updatedAt:now,createdBy:who.uid};
      await db.runTransaction(async tx=>{if((await tx.get(slugRef)).exists)fail('This app slug is already registered.','already-exists');if(policyId&&(await tx.get(db.collection('appos_policy_links').doc(policyId))).exists)fail('This legal profile is already linked.','already-exists');tx.create(ref,app);tx.create(slugRef,{appId:ref.id});if(policyId)tx.create(db.collection('appos_policy_links').doc(policyId),{appId:ref.id});if(!who.owner)tx.update(db.doc(`staff_members/${who.uid}`),{[`apposAccess.apps.${ref.id}`]:{role:'Creator',permissions:permissionKeys.filter(p=>!['access.manage','integrations.manage'].includes(p))}});attach(tx,audit(db,ref.id,who,'app.register',data.name));});
      return {id:ref.id};
    }
    const appId=id(input.appId),ref=db.collection('appos_apps').doc(appId),snapshot=await ref.get();if(!snapshot.exists)fail('Application not found.','not-found');
    const app={...snapshot.data(),id:appId,status:(snapshot.data()?.status||'DRAFT').toUpperCase()};requirePermission(who,appId,'app.view');
    const can=permission=>permissions(who,appId).includes(permission);
    const secretRef=db.collection('appos_private').doc(appId);
    async function connection(){return adapter(db,app,(await secretRef.get()).data()||{});}
    if(action==='deleteApp'||action==='moveToBin') {
      if(!who.owner&&!who.access.registry?.includes('create')&&!can('app.archive'))fail('You do not have permission to delete this application.','permission-denied');
      const binRef=db.collection('recycle_bin').doc();
      const binRecord={
        id:binRef.id,
        originalCollection:'appos_apps',
        originalId:appId,
        itemTitle:app.name,
        itemType:'AppOS Application',
        data:app,
        metadata:{slug:app.slug,category:app.category||'',platforms:app.platforms||[],deletedBy:who.name||who.email||who.uid},
        deletedBy:who.name||who.email||who.uid,
        deletedAt:FieldValue.serverTimestamp(),
      };
      await db.runTransaction(async tx=>{
        tx.set(binRef,binRecord);
        tx.delete(ref);
        tx.delete(db.collection('appos_slugs').doc(app.slug));
        if(app.policyId)tx.delete(db.collection('appos_policy_links').doc(app.policyId));
        attach(tx,audit(db,appId,who,'app.moveToBin',app.name));
      });
      return {deleted:true,binId:binRef.id};
    }
    if(action==='workspace') {
      if(app.slug){const slugDoc=await db.collection('appos_slugs').doc(app.slug).get();if(!slugDoc.exists)await db.collection('appos_slugs').doc(app.slug).set({appId}).catch(()=>{});}
      const counts={},failures={};
      const integrationReady=app.integration.connected;
      if(integrationReady)for(const key of app.workspace.modules.filter(key=>can(`${key}.view`)&&app.integration.capabilities.includes(key))){try{counts[key]=await (await connection()).count(key);}catch{failures[key]='Unavailable';}}
      const auditRows=can('audit.view')?await ref.collection('audit').orderBy('createdAt','desc').limit(30).get():null;
      const linked=app.policyId&&can('legal.view')?await db.collection('app_policies').doc(app.policyId).get():null;
      return {app:serial({...app,permissions:permissions(who,appId)}),counts,failures,activity:auditRows?auditRows.docs.map(row=>({id:row.id,...row.data()})):[],policy:linked?.exists?serial({id:linked.id,...linked.data()}):null,hasCredentials:(await secretRef.get()).exists,owner:who.owner};
    }
    if(action==='audit') {requirePermission(who,appId,'audit.view');let q=ref.collection('audit').orderBy('createdAt','desc').limit(41);if(input.cursor)q=q.startAfter(text(input.cursor,40));const rows=await q.get();return {items:rows.docs.slice(0,40).map(row=>({id:row.id,...row.data()})),nextCursor:rows.size>40?rows.docs[39].data().createdAt:''};}
    if(app.status==='ARCHIVED'&&!['archive'].includes(action))fail('Restore this archived app before making changes.','failed-precondition');
    if(action==='saveProfile'||action==='saveWorkspace'||action==='archive') {
      const permission=action==='saveProfile'?'app.edit':action==='archive'?'app.archive':'studio.manage';requirePermission(who,appId,permission);
      let changes=action==='saveProfile'?profile(input.app||{}):action==='archive'?{status:input.archived===false?'DRAFT':'ARCHIVED'}:{workspace:workspace(input.workspace)};
      if(action==='saveProfile'){if(changes.slug!==app.slug)fail('The app slug cannot change after registration.');}
      await db.runTransaction(async tx=>{const current=await tx.get(ref);if(current.data()?.revision!==input.revision)fail('This app changed. Reload before saving.','aborted');tx.update(ref,{...changes,updatedAt:iso(),revision:FieldValue.increment(1)});attach(tx,audit(db,appId,who,action,app.name));});return {saved:true};
    }
    if(action==='saveIntegration') {
      requirePermission(who,appId,'integrations.manage');const old=(await secretRef.get()).data()||{};const next=integration(input.integration,input.credentials,old);
      await db.runTransaction(async tx=>{const current=await tx.get(ref);if(current.data()?.revision!==input.revision)fail('Integration changed. Reload before saving.','aborted');tx.update(ref,{integration:next.config,updatedAt:iso(),revision:FieldValue.increment(1)});tx.set(secretRef,next.secret);attach(tx,audit(db,appId,who,'integration.configure',next.config.kind));});return {saved:true};
    }
    if(action==='saveSettings') {
      requirePermission(who,appId,'settings.manage');const timezone=text(input.settings?.timezone,80)||'UTC',currency=text(input.settings?.currency,3).toUpperCase();
      try{new Intl.DateTimeFormat('en',{timeZone:timezone}).format();}catch{fail('Enter a valid IANA timezone.');}if(!/^[A-Z]{3}$/.test(currency))fail('Use a three-letter currency code.');
      await db.runTransaction(async tx=>{const current=await tx.get(ref);if(current.data()?.revision!==input.revision)fail('This app changed. Reload before saving.','aborted');tx.update(ref,{settings:{timezone,currency,notes:text(input.settings?.notes,4000)},updatedAt:iso(),revision:FieldValue.increment(1)});attach(tx,audit(db,appId,who,'settings.update',app.name));});return {saved:true};
    }
    if(action==='connect') {
      requirePermission(who,appId,'integrations.manage');let result;
      try {const supported=await (await connection()).probe();result={...app.integration,connected:true,capabilities:supported,health:'healthy',verifiedAt:iso()};}
      catch {result={...app.integration,connected:false,capabilities:[],health:'unavailable',verifiedAt:iso()};}
      await db.runTransaction(async tx=>{const current=await tx.get(ref);if(current.data()?.revision!==app.revision)fail('Integration changed. Reload and retry.','aborted');tx.update(ref,{integration:result,updatedAt:iso(),revision:FieldValue.increment(1)});attach(tx,audit(db,appId,who,'integration.probe',result.health));});return {connected:result.connected};
    }
    if(action==='records'||action==='export'||action==='writeRecord') {
      const key=input.module;if(!moduleKeys.includes(key))fail('Unsupported module.');
      const operation=action==='writeRecord'?input.operation:action==='export'?'export':'view';
      if(!['view','export','create','edit','delete','approve'].includes(operation))fail('Unsupported operation.');requirePermission(who,appId,`${key}.${operation}`);
      if(action==='writeRecord'&&app.status==='PAUSED')fail('This application is currently PAUSED. Operational modifications are suspended according to policy.','failed-precondition');
      const store=await connection();
      if(action==='records')return store.list(key,pageCursor(input.cursor),40);
      if(action==='export')return store.list(key,pageCursor(input.cursor),100);
      const event=audit(db,appId,who,`${key}.${operation}`,input.id||'new');await event.ref.create({...event.data,outcome:'started'});
      try {const value=await store.write(key,operation,input,who);await event.ref.update({outcome:'completed',target:value.id}).catch(()=>{});return value;}
      catch(error){await event.ref.update({outcome:'failed'}).catch(()=>{});throw error;}
    }
    if(action==='people') {
      requirePermission(who,appId,'access.manage');const people=await db.collection('staff_members').limit(250).get();return {people:people.docs.map(row=>({id:row.id,name:text(row.data().name,160),status:row.data().status,role:row.data().apposAccess?.apps?.[appId]?.role||'',permissions:row.data().apposAccess?.apps?.[appId]?.permissions||[],hasAppOS:row.data().allowedModules?.some(m=>['appos','all'].includes(m))===true}))};
    }
    if(action==='saveAccess') {
      requirePermission(who,appId,'access.manage');const uid=id(input.uid);if(!who.owner&&uid===who.uid)fail('You cannot change your own app permissions.','permission-denied');const grant=list(input.permissions,permissionKeys);if(!who.owner&&grant.some(p=>!can(p)))fail('You may only delegate permissions you already hold.','permission-denied');
      await db.runTransaction(async tx=>{const target=db.doc(`staff_members/${uid}`),staff=await tx.get(target);if(!staff.exists)fail('Employee not found.');if(!staff.data().allowedModules?.some(m=>['appos','all'].includes(m)))fail('The owner must first grant this employee the AppOS module.');tx.update(target,{[`apposAccess.apps.${appId}`]:{role:text(input.role,60)||'Custom',permissions:grant},updatedAt:iso()});attach(tx,audit(db,appId,who,'access.update',uid));});return {saved:true};
    }
    if(action==='saveRole'||action==='deleteRole') {
      requirePermission(who,appId,'access.manage');const roleId=id(input.role?.id||input.id),currentRoles=app.roles||[];
      const name=text(input.role?.name,60),grant=list(input.role?.permissions,permissionKeys);
      if(action==='saveRole'&&(!name||!grant.includes('app.view')))fail('Add a role name and workspace access.');
      if(!who.owner&&grant.some(p=>!can(p)))fail('Role templates may contain only permissions you hold.','permission-denied');
      const roles=currentRoles.filter(role=>role.id!==roleId);if(action==='saveRole')roles.push({id:roleId,name,permissions:grant});if(roles.length>20)fail('Use up to 20 custom app role templates.');
      await db.runTransaction(async tx=>{const current=await tx.get(ref);if(current.data()?.revision!==input.revision)fail('App roles changed. Reload before saving.','aborted');tx.update(ref,{roles,revision:FieldValue.increment(1),updatedAt:iso()});attach(tx,audit(db,appId,who,action==='saveRole'?'role.template-save':'role.template-remove',name||roleId));});return {saved:true};
    }
    if(action==='legalRequests') {requirePermission(who,appId,'legal.manage');if(!app.policyId)return {items:[],nextCursor:''};let q=db.collection('app_data_deletion_requests').where('appSlug','==',app.policySlug).orderBy(FieldPath.documentId()).limit(41);if(input.cursor)q=q.startAfter(id(input.cursor));const rows=await q.get();return {items:serial(rows.docs.slice(0,40).map(row=>({id:row.id,...row.data()}))),nextCursor:rows.size>40?rows.docs[39].id:''};}
    if(action==='saveRequest') {requirePermission(who,appId,'legal.manage');if(!['pending','processing','completed','rejected'].includes(input.status))fail('Choose a request status.');await db.runTransaction(async tx=>{const target=db.collection('app_data_deletion_requests').doc(id(input.id)),row=await tx.get(target);if(!app.policyId||row.data()?.appSlug!==app.policySlug)fail('Request does not belong to this app.','permission-denied');tx.update(target,{status:input.status});attach(tx,audit(db,appId,who,'legal.request-status',input.id));});return {saved:true};}
    if(action==='saveLegal') {
      requirePermission(who,appId,'legal.manage');const source=input.policy||{},changes={};
      for(const field of ['appName','appSubtitle','description','category','packageName','contactEmail','effectiveDate','privacyPolicy','termsOfService','dataDeletionPolicy','playStoreStatusMsg','appStoreStatusMsg'])changes[field]=text(source[field],field.endsWith('Policy')||field==='termsOfService'?100000:6000);
      if(!changes.appName)fail('Enter an app title.');for(const field of ['logoUrl','playStoreUrl','appStoreUrl'])changes[field]=require('./model').url(source[field]);changes.isPublished=source.isPublished===true;
      const policyId=app.policyId||app.slug;
      await db.runTransaction(async tx=>{const policyRef=db.collection('app_policies').doc(policyId),current=await tx.get(policyRef),currentApp=await tx.get(ref),link=await tx.get(db.collection('appos_policy_links').doc(policyId));if(currentApp.data()?.revision!==app.revision)fail('The app changed. Reload before saving.','aborted');if(!app.policyId&&(current.exists||link.exists))fail('This legal slug is already used. Import the existing profile instead.');const slug=app.policySlug||app.slug;tx.set(policyRef,{...changes,slug,updatedAt:FieldValue.serverTimestamp(),...(!current.exists?{createdAt:FieldValue.serverTimestamp()}: {})},{merge:true});tx.update(ref,{policyId,policySlug:slug,revision:FieldValue.increment(1),updatedAt:iso()});tx.set(db.collection('appos_policy_links').doc(policyId),{appId});attach(tx,audit(db,appId,who,'legal.save',policyId));});return {saved:true};
    }
    fail('Unsupported AppOS operation.');
  }catch(error){
    if(error instanceof HttpsError)throw error;
    const msg=typeof error?.message==='string'&&error.message.length<=300?error.message:'AppOS could not complete the operation. Check the integration and try again.';
    throw new HttpsError('unavailable',msg);
  }
});
Object.assign(exports,require('./events'));
