import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { db } from '@/lib/firebase';
import {taskRequest} from '@/lib/tasks/client';
import { subscribeStudioAccess } from '@/lib/services/staffAuth';
import { communicationCollections as C, prepareStudioDirectory, watchStudio } from '@/lib/services/communicationService';
import type { StudioPerson, StudioNotification, StudioNotice, Department, StudioConversation, ConversationState, ChatBackground } from '@/types/communication';
import s from './Communication.module.css';
interface StudioState {
  uid: string; admin: boolean; console: boolean; ready: boolean; me?: StudioPerson; people: StudioPerson[];
  departments: Department[]; conversations: StudioConversation[]; notifications: StudioNotification[];
  notices: StudioNotice[]; noticeReads: string[]; chatStates: Record<string, ConversationState>;
  background: ChatBackground; error: string; unread: number; unreadChats: number;
}
const empty: StudioState = { uid: '', admin: false, console: false, ready: false, people: [], departments: [], conversations: [], notifications: [], notices: [], noticeReads: [], chatStates: {}, background: 'aurora', error: '', unread: 0, unreadChats: 0 };
const Context = createContext<StudioState>(empty);
export const useStudio = () => useContext(Context);
export const studioHref = (href: string) => /^\/(staff|admin)(\/|\?|$)/.test(href) ? href : '/staff/dashboard';
export function CommunicationProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const enabled = router.pathname.startsWith('/admin') || router.pathname.startsWith('/staff/');
  const [session, setSession] = useState({ uid: '', admin: false, console: false, ready: false });
  const [people, setPeople] = useState<StudioPerson[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [conversations, setConversations] = useState<StudioConversation[]>([]);
  const [notifications, setNotifications] = useState<StudioNotification[]>([]);
  const [notices, setNotices] = useState<StudioNotice[]>([]);
  const [noticeReads, setNoticeReads] = useState<string[]>([]);
  const [chatStates, setChatStates] = useState<Record<string, ConversationState>>({});
  const [background, setBackground] = useState<ChatBackground>('aurora');
  const [error, setError] = useState('');
  const [toast, setToast] = useState<StudioNotification | null>(null);
  useEffect(() => {
    if (!enabled) { setSession({ uid: '', admin: false, console: false, ready: true }); return; }
    return subscribeStudioAccess(undefined, state => setSession({ uid: state.authorized ? state.user!.uid : '', admin: state.isAdmin, console: state.isAdmin || state.isSubAdmin === true, ready: true }));
  }, [enabled]);
  useEffect(() => {
    setPeople([]); setDepartments([]); setNotifications([]); setNotices([]); setNoticeReads([]); setChatStates({}); setConversations([]); setBackground('aurora'); setError(''); setToast(null);
    if (!session.uid) return;
    let alive = true; let seen: Set<string> | null = null;
    const fail = () => { if (alive) setError('Workspace communication is unavailable. Publish the updated Firebase rules, then refresh.'); };
    if (session.admin) void prepareStudioDirectory().catch(fail);
    else if(!session.console) void taskRequest('/api/studio/support',{}).catch(()=>{});
    const stops = [
      watchStudio<StudioPerson>(C.people, rows => setPeople(rows.map(p => ({ ...p, uid: p.uid || p.id, name: p.name || 'Employee', departmentIds: p.departmentIds || [], chatSuspended: !!p.chatSuspended }))), fail),
      watchStudio<Department>(C.departments, rows => setDepartments(rows.filter(d => !d.deleted).sort((a, b) => a.title.localeCompare(b.title))), fail),
      watchStudio<StudioNotice>(C.notices, rows => setNotices(rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt))), fail),
      watchStudio<StudioNotification>(query(collection(db, C.notifications), where('recipientId', '==', session.uid)), rows => {
        rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        if (seen) { const fresh = rows.find(n => !n.read && !seen!.has(n.id)); if (fresh) setToast(fresh); }
        seen = new Set(rows.map(n => n.id)); setNotifications(rows);
      }, fail),
      onSnapshot(doc(db, C.users, session.uid), snap => setBackground(snap.data()?.background || 'aurora'), fail),
      onSnapshot(collection(db, C.users, session.uid, 'chats'), snap => setChatStates(Object.fromEntries(snap.docs.map(d => [d.id, d.data() as ConversationState]))), fail),
      onSnapshot(collection(db, C.users, session.uid, 'notice_reads'), snap => setNoticeReads(snap.docs.map(d => d.id)), fail),
    ];
    return () => { alive = false; stops.forEach(stop => stop()); };
  }, [session.uid, session.admin, session.console]);
  const me = people.find(p => p.uid === session.uid);
  const membershipKey = me?.departmentIds.join('|') || '';
  useEffect(() => {
    setConversations([]);
    if (!session.uid || !me || me.chatSuspended || me.status !== 'active') return;
    return watchStudio<StudioConversation>(query(collection(db, C.chats), where('participantIds', 'array-contains', session.uid), where('deleted', '==', false)), rows => setConversations(rows.filter(c => !c.deleted && (session.admin || c.kind === 'direct' || me.departmentIds.includes(c.departmentId))).sort((a, b) => (b.lastMessageAt || b.createdAt).localeCompare(a.lastMessageAt || a.createdAt))), () => { setConversations([]); setError('Messaging could not be loaded. Refresh after your administrator confirms your access.'); });
  }, [session.uid, session.admin, membershipKey, me?.chatSuspended, me?.status, !!me]);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(null), 6500); return () => clearTimeout(timer); }, [toast]);
  const value = useMemo<StudioState>(() => ({ ...session, me, people, departments, conversations, notifications, notices, noticeReads, chatStates, background, error,
    unread: notifications.filter(n => !n.read).length,
    unreadChats: conversations.filter(c => c.lastSenderId !== session.uid && c.lastMessageAt && c.lastMessageAt > (chatStates[c.id]?.lastReadAt || '')).length,
  }), [session, me, people, departments, conversations, notifications, notices, noticeReads, chatStates, background, error]);
  return <Context.Provider value={value}>{children}{toast && <div className={s.toast} role="status"><Link href={studioHref(toast.href)} onClick={() => setToast(null)}><strong>{toast.title}</strong><span>{toast.body}</span></Link><button type="button" onClick={() => setToast(null)} aria-label="Dismiss notification">×</button></div>}</Context.Provider>;
}
