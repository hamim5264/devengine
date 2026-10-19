import { collection, deleteDoc, doc, getDocs, limit, onSnapshot, orderBy, query, serverTimestamp, runTransaction, setDoc, updateDoc, where, writeBatch, type DocumentData, type Query, type FirestoreError } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { Department, StudioPerson, StudioConversation, StudioMessage, StudioMessageAttachment, ChatBackground } from '@/types/communication';

export const communicationCollections = { people: 'studio_people', departments: 'studio_departments', chats: 'studio_conversations', notices: 'studio_notices', notifications: 'studio_notifications', users: 'studio_user_settings' };
const C = communicationCollections;
export const nowISO = () => new Date().toISOString();
export function watchStudio<T>(source: string | Query<DocumentData>, callback: (items: T[]) => void, onError?: (error: FirestoreError) => void) {
  return onSnapshot(typeof source === 'string' ? collection(db, source) : source, snap => callback(snap.docs.map(d => ({ ...d.data(), id: d.id }) as T)), onError);
}
export const chatRef = (id: string) => doc(db, C.chats, id);
export const userSettingRef = (uid: string) => doc(db, C.users, uid);
export const conversationStateRef = (uid: string, id: string) => doc(db, C.users, uid, 'chats', id);

/** Admin-only bootstrap for existing accounts. Never copy email, credentials or permissions into the directory. */
export async function prepareStudioDirectory() {
  const current = auth.currentUser;
  if (!current) return;
  const [staff, people] = await Promise.all([getDocs(collection(db, 'staff_members')), getDocs(collection(db, C.people))]);
  const directory = new Map(people.docs.map(d => [d.id, d.data()]));
  const changes: { id: string; data: DocumentData }[] = [];
  for (const employee of staff.docs) {
    const s = employee.data(); const old = directory.get(employee.id);
    const data = { uid: employee.id, name: s.name || 'Employee', avatarUrl: s.avatarUrl || '', role: 'employee', status: s.status || 'active', departmentIds: old?.departmentIds || [], chatSuspended: old?.chatSuspended ?? false };
    if (!old || ['name', 'avatarUrl', 'status', 'role', 'departmentIds', 'chatSuspended'].some(key => old[key] !== data[key as keyof typeof data])) {
      changes.push({ id: employee.id, data });
    }
  }
  const staffIds = new Set(staff.docs.map(d => d.id));
  people.docs.forEach(p => { if (p.data().role === 'employee' && !staffIds.has(p.id) && p.data().status !== 'suspended') changes.push({ id: p.id, data: { status: 'suspended', chatSuspended: true } }); });
  if (!directory.has(current.uid)) changes.push({ id: current.uid, data: { uid: current.uid, name: 'DevEngine Admin', avatarUrl: current.photoURL || '', role: 'admin', status: 'active', departmentIds: [], chatSuspended: false } });
  for (let i = 0; i < changes.length; i += 400) {
    const batch = writeBatch(db); changes.slice(i, i + 400).forEach(c => batch.set(doc(db, C.people, c.id), c.data, { merge: true })); await batch.commit();
  }
}

export async function saveDepartment(input: Pick<Department, 'title' | 'description' | 'avatarUrl' | 'memberIds'>, id?: string) {
  if (!input.title.trim()) throw new Error('Enter a department title.');
  if (input.memberIds.length > 100) throw new Error('A department can have up to 100 employees.');
  const target = id ? doc(db, C.departments, id) : doc(collection(db, C.departments));
  const admins = await getDocs(query(collection(db, C.people), where('role', '==', 'admin')));
  await runTransaction(db, async transaction => {
    const previous = await transaction.get(target);
    const before: string[] = previous.exists() ? previous.data().memberIds || [] : [];
    const members = [...new Set(input.memberIds)];
    const all = [...new Set([...before, ...members])];
    const profiles = await Promise.all(all.map(uid => transaction.get(doc(db, C.people, uid))));
    const data = { title: input.title.trim().slice(0, 100), description: input.description.trim().slice(0, 1000), avatarUrl: input.avatarUrl.trim(), memberIds: members, deleted: false, updatedAt: nowISO(), createdAt: previous.data()?.createdAt || nowISO() };
    transaction.set(target, data);
    transaction.set(chatRef(`department_${target.id}`), { kind: 'department', departmentId: target.id, title: data.title, description: data.description, avatarUrl: data.avatarUrl, participantIds: [...new Set([...members, ...admins.docs.map(d => d.id)])], deleted: false, createdAt: data.createdAt }, { merge: true });
    profiles.forEach((profile, index) => {
      if (!profile.exists()) throw new Error('An employee is no longer available. Reopen this department.');
      const ids = new Set<string>(profile.data().departmentIds || []);
      if (members.includes(all[index])) ids.add(target.id); else ids.delete(target.id);
      transaction.update(profile.ref, { departmentIds: [...ids] });
    });
  });
  return target.id;
}
export async function removeDepartment(department: Department) {
  await runTransaction(db, async tx => {
    const current = await tx.get(doc(db, C.departments, department.id));
    if (!current.exists()) return;
    const members: string[] = current.data().memberIds || [];
    const profiles = await Promise.all(members.map(uid => tx.get(doc(db, C.people, uid))));
    tx.update(current.ref, { deleted: true, memberIds: [], updatedAt: nowISO() });
    tx.update(chatRef(`department_${department.id}`), { deleted: true, participantIds: [] });
    profiles.forEach(p => { if (p.exists()) tx.update(p.ref, { departmentIds: (p.data().departmentIds || []).filter((v: string) => v !== department.id) }); });
  });
}
export async function setEmployeeAccess(uid: string, action: 'chat' | 'account', suspended: boolean) {
  const batch = writeBatch(db);
  if (action === 'account') batch.update(doc(db, 'staff_members', uid), { status: suspended ? 'suspended' : 'active', updatedAt: nowISO() });
  batch.update(doc(db, C.people, uid), action === 'chat' ? { chatSuspended: suspended } : { status: suspended ? 'suspended' : 'active' });
  await batch.commit();
}
export function canDirectMessage(me: StudioPerson | undefined, person: StudioPerson) {
  return !!me && me.uid !== person.uid && me.status === 'active' && !me.chatSuspended && !person.chatSuspended && person.status === 'active' && (me.role === 'admin' || person.role === 'admin' || me.departmentIds.some(id => person.departmentIds.includes(id)));
}
export async function openDirectMessage(me: StudioPerson, person: StudioPerson) {
  if (!canDirectMessage(me, person)) throw new Error('Direct messages are available to admin and colleagues in your departments.');
  const ids = [me.uid, person.uid].sort(); const id = `direct_${ids.join('_')}`;
  await runTransaction(db, async tx => {
    const ref = chatRef(id); const existing = await tx.get(ref);
    if (existing.exists() && existing.data().deleted) { if (me.role === 'admin') tx.update(ref, { deleted: false }); else throw new Error('This conversation was removed by administration. Please contact your administrator.'); }
    if (!existing.exists()) tx.set(ref, { kind: 'direct', participantIds: ids, departmentId: '', title: '', description: '', avatarUrl: '', createdAt: nowISO(), deleted: false });
  });
  await setDoc(conversationStateRef(me.uid, id), { archived: false }, { merge: true });
  return id;
}
export async function sendStudioMessage(chatId: string, me: StudioPerson, text: string, reply?: StudioMessage | null, attachments?: StudioMessageAttachment[]) {
  const clean = text.trim();
  const hasAttachments = Boolean(attachments && attachments.length > 0);
  if (!clean && !hasAttachments) throw new Error('Write a message or attach a file.');
  if (clean.length > 4000) throw new Error('Write a message of up to 4,000 characters.');
  const msgDoc: Record<string, any> = {
    senderId: me.uid,
    senderName: me.name,
    text: clean,
    createdAt: nowISO(),
    sentAt: serverTimestamp(),
    replyTo: reply?.id || '',
    replyText: reply?.text.slice(0, 180) || '',
    replyName: reply?.senderName || '',
  };
  if (hasAttachments) {
    msgDoc.attachments = attachments;
  }
  const messageRef = doc(collection(db, C.chats, chatId, 'messages'));
  await setDoc(messageRef, msgDoc);

  const preview = clean || (hasAttachments ? (attachments!.length === 1 ? `📎 ${attachments![0].name}` : `📎 ${attachments!.length} attachments`) : '');
  try {
    await updateDoc(doc(db, C.chats, chatId), {
      lastMessage: preview,
      lastMessageAt: nowISO(),
      lastSenderId: me.uid,
      lastMessageId: messageRef.id,
    });
  } catch (err) {
    // Non-blocking
  }
}
export const watchMessages = (id: string, callback: (messages: StudioMessage[]) => void, error: (e: FirestoreError) => void, count = 60) => watchStudio<StudioMessage>(query(collection(db, C.chats, id, 'messages'), orderBy('sentAt', 'desc'), limit(count)), rows => callback(rows.map(row => { const sentAt = (row as unknown as { sentAt?: { toDate: () => Date } }).sentAt; return { ...row, createdAt: sentAt?.toDate ? sentAt.toDate().toISOString() : row.createdAt }; }).reverse()), error);
export const setChatBackground = (uid: string, background: ChatBackground) => setDoc(userSettingRef(uid), { background }, { merge: true });
export const markChatRead = (uid: string, id: string, lastReadAt: string) => setDoc(conversationStateRef(uid, id), { lastReadAt }, { merge: true });
export const archiveConversation = (uid: string, id: string, archived: boolean) => setDoc(conversationStateRef(uid, id), { archived }, { merge: true });
export const archiveMessage = (uid: string, chatId: string, messageId: string, archived: boolean) => setDoc(doc(db, C.users, uid, 'archived_messages', `${chatId}_${messageId}`), { chatId, messageId, archived });
export const reactToMessage = async (chatId: string, messageId: string, emoji: string, current?: string) => {
  const uid = auth.currentUser?.uid; if (!uid) return;
  const ref = doc(db, C.chats, chatId, 'reactions', `${messageId}_${uid}`);
  if (emoji === current) await deleteDoc(ref); else await setDoc(ref, { uid, messageId, emoji });
};
export const setTyping = (chatId: string, me: StudioPerson, typing: boolean) => setDoc(doc(db, C.chats, chatId, 'typing', me.uid), { uid: me.uid, name: me.name, expiresAt: typing ? Date.now() + 7000 : 0 });
export const deleteStudioMessage = (chatId: string, messageId: string) => deleteDoc(doc(db, C.chats, chatId, 'messages', messageId));
export const deleteStudioConversation = (id: string) => updateDoc(chatRef(id), { deleted: true });
export const readNotification = (id: string) => updateDoc(doc(db, C.notifications, id), { read: true });
export async function publishNotice(title: string, body: string, priority: string, id?: string) {
  if (!title.trim() || !body.trim()) throw new Error('Add a title and the notice text.');
  const ref = id ? doc(db, C.notices, id) : doc(collection(db, C.notices));
  if (id) await updateDoc(ref, { title: title.trim(), body: body.trim(), priority, updatedAt: nowISO() });
  else await setDoc(ref, { title: title.trim(), body: body.trim(), priority, authorId: auth.currentUser!.uid, createdAt: nowISO(), updatedAt: nowISO() });
}
export const deleteNotice = (id: string) => deleteDoc(doc(db, C.notices, id));
export const readNotice = (uid: string, id: string) => setDoc(doc(db, C.users, uid, 'notice_reads', id), { readAt: nowISO() });
