import Link from 'next/link';
import AdminLayout from '@/components/AdminLayout';
import {useAdminOrStaffAuth} from '@/lib/services/staffAuth';
import {STUDIO_MODULES,getFilteredModuleItems} from '@/lib/staffModules';
import {useStudio} from '@/components/communication/CommunicationProvider';
import s from '@/components/admin/AdminWorkspace.module.css';
export default function SupportHome(){const {staffData}=useAdminOrStaffAuth('support'),studio=useStudio();return <AdminLayout title="Dev Support | DevEngine"><div className={s.page}><div className={s.header}><div><p className={s.eyebrow}>Dev Support / Delegated workspace</p><h1>Help your team move forward.</h1><p>Employee conversations and the tools assigned by your administrator.</p></div><Link className={s.primary} href="/admin/messages">Open support inbox · {studio.unreadChats} unread</Link></div><div className={s.cards}>{STUDIO_MODULES.filter(m=>staffData?.allowedModules.includes(m.key)).map(m=><section key={m.key} className={s.panel}><h2>{m.label}</h2><p>{m.description}</p><div className={s.actions}>{getFilteredModuleItems(staffData,m.key).map(i=><Link key={i.href} className={s.button} href={i.href}>{i.label} ↗</Link>)}</div></section>)}</div></div></AdminLayout>;}
