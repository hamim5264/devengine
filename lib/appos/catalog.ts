import catalog from '@/functions/appos/catalog.json';
import type { AppOSWorkspace, AppOSAccess } from '@/types/appos';
export const APPOS_MODULES = catalog.modules;
export const APPOS_PERMISSIONS = catalog.permissions;
export const APPOS_WIDGETS = catalog.widgets;
export const APPOS_NAVIGATION = catalog.navigation;
export const emptyAppOSAccess = (): AppOSAccess => ({registry:[],apps:{}});
export function workspaceDefaults(template='operations'): AppOSWorkspace {
  const modules=template==='content'?['content','records']:template==='support'?['support','notifications']:['records','transactions'];
  return { modules,navigation:['overview',...modules,'legal','settings','audit'],widgets:['counts','activity','health'],accent:'#2cecf7',template,fields:Object.fromEntries(APPOS_MODULES.map(m=>[m.key,structuredClone(m.fields)])) };
}
export function rolePermissions(role: string): string[] {
  if(role==='Administrator')return APPOS_PERMISSIONS.map(p=>p.key);
  if(role==='Editor')return APPOS_PERMISSIONS.filter(p=>p.key==='app.view'||p.key==='legal.view'||/\.(view|create|edit)$/.test(p.key)&&!p.key.startsWith('audit.')).map(p=>p.key);
  return APPOS_PERMISSIONS.filter(p=>p.key==='app.view'||p.key==='legal.view'||APPOS_MODULES.some(m=>p.key===`${m.key}.view`)).map(p=>p.key);
}
