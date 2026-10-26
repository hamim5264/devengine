import type { AppOSActivity, AppOSIntegration } from '@/types/appos';
export const appOSLabel = (value:string) => value.replace(/([a-z])([A-Z])/g,'$1 $2').replace(/[._-]+/g,' ').replace(/^./,letter=>letter.toUpperCase());
export const appOSBackend = (kind:AppOSIntegration['kind']) => ({managed:'Managed Firestore',firebase:'External Firebase',supabase:'Supabase PostgreSQL',django:'Django API',node:'Node.js API',laravel:'Laravel API',bingi:'BinGi Plugin',api:'Universal REST API'}[kind] || 'App integration');
export function appOSDate(value:string,timezone?:string) {
  const date=new Date(value);if(!value||Number.isNaN(date.getTime()))return 'Not provided';
  try{return new Intl.DateTimeFormat(undefined,{dateStyle:'medium',timeStyle:'short',timeZone:timezone||'UTC'}).format(date);}catch{return date.toLocaleString();}
}
export function appOSActivity(item:AppOSActivity) {
  const titles:Record<string,string>={'app.register':'Application registered','app.delete':'Application moved to Recycle Bin','app.restore':'Application restored','saveProfile':'App profile updated','saveWorkspace':'Workspace customized','archive':'App lifecycle updated','integration.configure':'Integration configured','integration.probe':'Connection checked','access.update':'App permissions updated','employee.permissions-changed':'Employee access changed','settings.update':'Workspace preferences updated','legal.save':'Legal profile saved','legal.request-status':'Deletion request updated','role.template-save':'Role template saved','role.template-remove':'Role template removed'};
  const [module,operation]=item.action.split('.');
  const operationLabel:Record<string,string>={create:'created',edit:'updated',delete:'deleted',approve:'approved',export:'exported'};
  const noun=module==='records'?'Record':module==='users'?'User record':module==='notifications'?'Notice':module==='support'?'Support record':module==='errors'?'Error record':appOSLabel(module)+' record';
  let title=titles[item.action]||(operationLabel[operation]?`${noun} ${operationLabel[operation]}`:appOSLabel(item.action));
  const failed=item.outcome==='failed',status=failed?'failed':item.outcome==='started'?'started':item.outcome==='completed'?'completed':'';
  if(operationLabel[operation]&&failed)title=`Could not ${{create:'create',edit:'update',delete:'delete',approve:'approve',export:'export'}[operation as 'create'|'edit'|'delete'|'approve'|'export']} ${noun.toLowerCase()}`;
  if(operationLabel[operation]&&item.outcome==='started')title=`${noun} action requested`;
  const detail=item.action==='integration.probe'?(item.target==='healthy'?'Connection responded successfully.':item.target==='unavailable'?'The saved connection could not be reached.':appOSLabel(item.target)):item.action==='integration.configure'?`Data source: ${appOSLabel(item.target)}`:item.target?`Reference: ${item.target}`:'';
  return {title,detail,status,icon:failed?'error_outline':item.action.startsWith('integration.')?'hub':item.action.includes('access')||item.action.includes('permissions')?'admin_panel_settings':operation==='delete'?'delete_outline':operation==='edit'?'edit_note':'history'};
}
