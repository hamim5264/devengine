import { useEffect,useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import AdminLayout from '@/components/AdminLayout';
import { onAdminPageAccess } from '@/lib/services/staffAuth';
import { APPOS_MODULES } from '@/lib/appos/catalog';
import { appos,apposError } from '@/lib/appos/client';
import type { AppOSWorkspaceResult,AppOSActivity } from '@/types/appos';
import AppOSRecords from '@/components/appos/AppOSRecords';
import AppOSOverview from '@/components/appos/AppOSOverview';
import AppOSActivityList from '@/components/appos/AppOSActivityList';
import AppOSStudio from '@/components/appos/AppOSStudio';
import AppOSIntegration from '@/components/appos/AppOSIntegration';
import AppOSLegal from '@/components/appos/AppOSLegal';
import AppOSAccess from '@/components/appos/AppOSAccess';
import AppOSSettings from '@/components/appos/AppOSSettings';
import { EmployeeDialog,EmployeeIcon } from '@/components/staff/EmployeeUI';
import s from '@/components/admin/AdminWorkspace.module.css';
import a from '@/components/appos/AppOS.module.css';
const labels:Record<string,string>={overview:'Overview',legal:'Legal & Showcase',studio:'Customize',settings:'Settings',integrations:'Integrations',access:'Employee access',audit:'Audit history'};
const icons:Record<string,string>={overview:'dashboard',legal:'gavel',studio:'tune',settings:'settings',integrations:'hub',access:'group',audit:'history'};
export default function AppOSWorkspacePage() {
  const router=useRouter(),appId=typeof router.query.appId==='string'?router.query.appId:'';const [data,setData]=useState<AppOSWorkspaceResult|null>(null),[ready,setReady]=useState(false),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[archive,setArchive]=useState(false),[confirmDelete,setConfirmDelete]=useState(false),[audit,setAudit]=useState<AppOSActivity[]|null>(null),[auditCursor,setAuditCursor]=useState('');
  const tab=typeof router.query.tab==='string'?router.query.tab:'overview';
  useEffect(()=>onAdminPageAccess(router,()=>setReady(true),()=>{setReady(false);setData(null);}),[router]);
  async function load(){const value=await appos<AppOSWorkspaceResult>('workspace',{appId});setData(value);return value;}
  useEffect(()=>{if(!ready||!appId)return;let active=true;setData(null);setLoading(true);setError('');setNotice('');setAudit(null);setAuditCursor('');appos<AppOSWorkspaceResult>('workspace',{appId}).then(value=>{if(active)setData(value);}).catch(e=>{if(active)setError(apposError(e));}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[ready,appId]);
  async function execute(action:string,input:Record<string,unknown>,message:string){if(busy||!data)return false;setBusy(true);setError('');setNotice('');try{const result=await appos<{connected?:boolean}>(action,{...input,appId,revision:data.app.revision});await load();setNotice(action==='connect'&&result.connected===false?'Connection unavailable. Check the saved credentials, API contract and network permissions.':message);setArchive(false);return true;}catch(e){setError(apposError(e));return false;}finally{setBusy(false);}}
  const app=data?.app,can=(permission:string)=>app?.permissions.includes(permission)===true;
  const chipStatus=(app?.status||'DRAFT').toUpperCase();
  const available=(key:string)=>{const module=APPOS_MODULES.find(m=>m.key===key);if(module)return !!app?.workspace.modules.includes(key)&&!!app.integration.connected&&!!app.integration.capabilities.includes(key)&&can(`${key}.view`);return key==='overview'||key==='legal'&&can('legal.view')||key==='studio'&&can('studio.manage')||key==='settings'&&(can('settings.manage')||can('app.edit'))||key==='integrations'&&can('integrations.manage')||key==='access'&&can('access.manage')||key==='audit'&&can('audit.view');};
  const navigation=app?[...new Set(['overview',...app.workspace.navigation,...(data?.owner?['studio','settings','integrations','access']:[])])].filter(available):[];
  return <AdminLayout title={app?`${app.name} | AppOS`:'AppOS workspace | DevEngine'} backHref="/admin/appos"><div className={`${s.page} ${a.page}`}><div className={s.header}><Link href="/admin/appos" className={s.button}><EmployeeIcon>arrow_back</EmployeeIcon>Applications</Link>{app&&<div className={a.row}>{[{tab:'studio',permission:'studio.manage',label:'Customize'},{tab:'integrations',permission:'integrations.manage',label:'Integrations'},{tab:'access',permission:'access.manage',label:'App access'}].filter(item=>can(item.permission)).map(item=><Link key={item.tab} className={s.button} href={{pathname:'/admin/appos/[appId]',query:{appId,tab:item.tab}}}>{item.label}</Link>)}<span className={a.badge} data-status={chipStatus.toLowerCase()}>{chipStatus}</span><button className={s.button} disabled={loading||busy} onClick={()=>{setError('');void load().catch(e=>setError(apposError(e)));}}>Refresh</button>{can('app.archive')&&<><button className={s.button} disabled={busy} onClick={()=>setArchive(true)}>{app.status==='archived'?'Restore app':'Archive app'}</button><button className={s.danger} disabled={busy} onClick={()=>setConfirmDelete(true)}>Delete app</button></>}</div>}</div>
    {error&&<p className={s.notice} role="alert" data-error>{error}</p>}{notice&&<p className={s.notice} role="status">{notice}</p>}{loading?<p role="status">Opening application workspace…</p>:app&&data?<><div className={a.identity}>{app.logoUrl?<img src={app.logoUrl} className={a.logo} alt=""/>:<span className={a.logo}><EmployeeIcon>apps</EmployeeIcon></span>}<div><p className={s.eyebrow}>AppOS / {app.slug}</p><h1>{app.name}</h1><p className={a.context}>{app.description}</p></div></div>
    {chipStatus==='PAUSED'&&<p className={a.notice} style={{borderColor:'var(--devengine-brand-cyan, #2cecf7)',color:'var(--devengine-brand-cyan, #2cecf7)'}}>This application is currently PAUSED. Operational modifications and data changes are suspended according to policy. Administrative inspection is enabled.</p>}
    {app.status==='archived'&&<p className={a.notice}>This application is archived. Restore it before changing data or configuration. Public legal URLs are preserved.</p>}
    <div className={a.workspace}><nav className={a.sidebar} aria-label="Application workspace">{navigation.map(key=><Link href={{pathname:'/admin/appos/[appId]',query:{appId,tab:key}}} key={key} aria-current={tab===key?'page':undefined}><EmployeeIcon>{icons[key]||APPOS_MODULES.find(m=>m.key===key)?.icon||'table_view'}</EmployeeIcon>{labels[key]||APPOS_MODULES.find(m=>m.key===key)?.label}</Link>)}</nav><div className={a.page}>
      {!available(tab)?<section className={`${s.panel} ${a.empty}`}><h2>This module is unavailable</h2><p>It may be disabled, disconnected, or outside your app permissions.</p></section>:tab==='overview'?<AppOSOverview data={data}/>:
      tab==='studio'?<AppOSStudio key={`${app.id}:${app.revision}`} app={app} busy={busy} save={workspace=>execute('saveWorkspace',{workspace},'Workspace configuration saved.')}/>:
      tab==='integrations'?<AppOSIntegration key={`${app.id}:${app.revision}`} app={app} busy={busy} execute={execute}/>:
      tab==='legal'?<AppOSLegal key={`${app.id}:${app.revision}`} app={app} policy={data.policy} busy={busy} execute={execute}/>:
      tab==='access'?<AppOSAccess app={app} owner={data.owner} busy={busy} execute={execute}/>:
      tab==='settings'?<AppOSSettings key={`${app.id}:${app.revision}`} app={app} busy={busy} execute={execute}/>:
      tab==='audit'?<section className={`${s.panel} ${a.page}`}><h2>Audit history</h2><AppOSActivityList items={audit||data.activity} timezone={app.settings?.timezone}/><button className={s.button} disabled={busy||(audit!==null&&!auditCursor)} onClick={async()=>{setBusy(true);try{const result=await appos<{items:AppOSActivity[];nextCursor:string}>('audit',{appId,cursor:audit?auditCursor:''});setAudit(old=>[...(old||[]),...result.items]);setAuditCursor(result.nextCursor);if(!result.nextCursor)setNotice('End of audit history.');}catch(e){setError(apposError(e));}finally{setBusy(false);}}}>{audit?'Load more history':'Browse full history'}</button></section>:
      <AppOSRecords key={`${app.id}:${tab}`} app={app} module={tab}/>}
    </div></div></>:!error&&<p>No workspace is available.</p>}
    {archive&&app&&<EmployeeDialog title={app.status==='archived'?'Restore application?':'Archive application?'} icon="inventory_2" onClose={()=>{if(!busy)setArchive(false);}}><p>{app.status==='archived'?'This restores the app to draft status.':'Data and legal URLs are preserved. AppOS changes are blocked until it is restored.'}</p><div className={s.actions}><button className={s.button} disabled={busy} onClick={()=>setArchive(false)}>Cancel</button><button className={s.primary} disabled={busy} onClick={()=>void execute('archive',{archived:app.status!=='archived'},app.status==='archived'?'Application restored.':'Application archived.')}>{busy?'Saving…':'Confirm'}</button></div></EmployeeDialog>}
    {confirmDelete&&app&&<EmployeeDialog title={`Move ${app.name} to Recycle Bin?`} icon="delete" onClose={()=>{if(!busy)setConfirmDelete(false);}}><p>Moving <strong>{app.name}</strong> to the Recycle Bin will remove it from the active application registry. Its entire configuration, integrations, workspace settings, employee permissions, audit history, and associated metadata will be retained for recovery.</p><p className={a.context}>You can restore it or permanently delete it anytime from the Recycle Bin.</p><div className={s.actions}><button className={s.button} disabled={busy} onClick={()=>setConfirmDelete(false)}>Cancel</button><button className={s.danger} disabled={busy} onClick={async()=>{setBusy(true);setError('');try{await appos('deleteApp',{appId:app.id});router.push('/admin/appos');}catch(e){setError(apposError(e));setBusy(false);}}}>{busy?'Moving…':'Move to Recycle Bin'}</button></div></EmployeeDialog>}
  </div></AdminLayout>;
}
