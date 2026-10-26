import { useState } from 'react';
import type { AppOSApp } from '@/types/appos';
import AppOSProfileForm from './AppOSProfileForm';
import type { AppOSAction } from './AppOSIntegration';
import s from '@/components/admin/AdminWorkspace.module.css';
import a from './AppOS.module.css';
export default function AppOSSettings({app,busy,execute}:{app:AppOSApp;busy:boolean;execute:AppOSAction}) {
  const [settings,setSettings]=useState(app.settings||{timezone:'UTC',currency:'BDT',notes:''});
  return <div className={a.page}>{app.permissions.includes('app.edit')&&<section className={s.panel}><h2>Application profile</h2><AppOSProfileForm existing initial={app} disabled={busy} onSave={async value=>{await execute('saveProfile',{app:value},'App profile saved.');}}/></section>}{app.permissions.includes('settings.manage')&&<section className={`${s.panel} ${a.page}`}><h2>Workspace preferences</h2><form className={s.page} onSubmit={e=>{e.preventDefault();void execute('saveSettings',{settings},'Workspace preferences saved.');}}><div className={s.grid}><label className={s.field}>Display timezone<input required value={settings.timezone} placeholder="Asia/Dhaka" onChange={e=>setSettings({...settings,timezone:e.target.value})}/></label><label className={s.field}>Default currency<input required pattern="[A-Za-z]{3}" maxLength={3} value={settings.currency} onChange={e=>setSettings({...settings,currency:e.target.value.toUpperCase()})}/></label><label className={`${s.field} ${s.full}`}>Operational notes<textarea maxLength={4000} rows={4} value={settings.notes} onChange={e=>setSettings({...settings,notes:e.target.value})}/></label></div><p className={a.context}>These preferences apply to the AppOS workspace. External application behavior is controlled by its own backend.</p><button className={s.primary} disabled={busy}>{busy?'Saving…':'Save preferences'}</button></form></section>}</div>;
}
