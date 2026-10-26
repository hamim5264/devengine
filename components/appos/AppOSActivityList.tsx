import type { AppOSActivity } from '@/types/appos';
import { appOSActivity,appOSDate } from '@/lib/appos/presentation';
import { EmployeeIcon } from '@/components/staff/EmployeeUI';
import AdminStatusChip from '@/components/admin/AdminStatusChip';
import a from './AppOS.module.css';
export default function AppOSActivityList({items,timezone}:{items:AppOSActivity[];timezone?:string}) {
  return <div className={a.eventList}>{items.length?items.map(item=>{const event=appOSActivity(item);return <article key={item.id} className={a.event} data-failed={event.status==='failed'}><span className={a.eventIcon}><EmployeeIcon>{event.icon}</EmployeeIcon></span><div className={a.eventBody}><div className={a.eventHeading}><strong>{event.title}</strong>{event.status&&<AdminStatusChip status={event.status} label={event.status==='started'?'Outcome pending':undefined}/>}</div><p>{item.actorName||'System'}{event.detail&&<> · {event.detail}</>}</p>{event.status==='failed'&&<p className={a.eventFailure}>The action did not complete. Review the record or connection before retrying.</p>}<time dateTime={item.createdAt}>{appOSDate(item.createdAt,timezone)}</time></div></article>;}):<div className={a.empty}><EmployeeIcon>history</EmployeeIcon><h3>No recent activity</h3><p>App updates and record actions will appear here.</p></div>}</div>;
}
