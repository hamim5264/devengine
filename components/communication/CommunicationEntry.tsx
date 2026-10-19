import Link from 'next/link';
import { useStudio } from './CommunicationProvider';
import s from './Communication.module.css';
const Icon = ({ name }: { name: string }) => <span className="material-symbols-outlined" aria-hidden="true">{name}</span>;
export function CommunicationHeader() {
  const state = useStudio(); if (!state.uid) return null;
  const base = state.admin ? '/admin' : '/staff';
  return <div className={s.headerTools}>{[{ path: 'notifications', label: 'Notifications', icon: 'notifications', count: state.unread }, { path: 'messages', label: 'Messages', icon: 'chat_bubble', count: state.unreadChats }].map(item => <Link key={item.path} href={`${base}/${item.path}`} className={s.headerButton} aria-label={`${item.label}${item.count ? `, ${item.count} unread` : ''}`} title={item.label}><Icon name={item.icon} />{item.count > 0 && <span className={s.counter}>{item.count > 99 ? '99+' : item.count}</span>}</Link>)}</div>;
}
export function CommunicationDashboard() {
  const state = useStudio();
  const base = state.admin ? '/admin' : '/staff';
  return (
    <div className={s.dashboard}>
      <div className={s.sectionTitle}>
        <div>
          <p className={s.eyebrow}>CONNECTED WORKSPACE</p>
          <h2>Stay in the loop.</h2>
        </div>
        <span className={s.live}>Live updates</span>
      </div>
      <div className={s.shortcutGrid}>
        {[
          { path: 'messages', title: 'Messages', icon: 'chat_bubble', detail: `${state.unreadChats} unread conversations` },
          { path: 'notifications', title: 'Activity inbox', icon: 'notifications_active', detail: `${state.unread} unread notifications` },
          { path: 'departments', title: 'Departments', icon: 'hub', detail: `${state.departments.length} teams, one studio` },
          { path: 'notices', title: 'Notice board', icon: 'campaign', detail: `${state.notices.filter(n => !state.noticeReads.includes(n.id)).length} unread notices` },
        ].map((item, idx) => (
          <Link
            key={item.path}
            href={`${base}/${item.path}`}
            className={s.shortcut}
            style={{ '--card-idx': idx } as React.CSSProperties}
          >
            <span className={s.shortcutIconWrap}><Icon name={item.icon} /></span>
            <strong>{item.title}</strong>
            <small>{item.detail}</small>
            <span className={s.shortcutArrow} aria-hidden="true">↗</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
