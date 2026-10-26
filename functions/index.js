/* Durable, server-created notifications. Document event IDs make retries idempotent. */
const { onDocumentWrittenWithAuthContext, onDocumentCreated, onDocumentDeleted } = require('firebase-functions/v2/firestore');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const { createHash } = require('node:crypto');
initializeApp();
const db = getFirestore();
const ADMIN_EMAIL = 'hamim.leon@gmail.com';
const config = { retry: true };
const iso = () => new Date().toISOString();
const digest = text => createHash('sha256').update(text).digest('hex');
async function adminUid() { return (await getAuth().getUserByEmail(ADMIN_EMAIL)).uid; }
async function notify(eventId, recipients, details) {
  const users = [...new Set(recipients.filter(Boolean))];
  for (let offset = 0; offset < users.length; offset += 200) {
    const chunk = users.slice(offset, offset + 200);
    await db.runTransaction(async tx => {
      const refs = chunk.map(uid => db.doc(`studio_notifications/${digest(`${eventId}:${uid}`)}`));
      const existing = await tx.getAll(...refs);
      existing.forEach((s, i) => {
        if (!s.exists) tx.create(refs[i], { ...details, recipientId: chunk[i], read: false, createdAt: iso() });
      });
    });
  }
}
function changed(before, after, keys) { return keys.some(key => JSON.stringify(before[key]) !== JSON.stringify(after[key])); }

exports.employeeDirectory = onDocumentWrittenWithAuthContext({ ...config, document: 'staff_members/{uid}' }, async event => {
  const after = event.data.after; const ref = db.doc(`studio_people/${event.params.uid}`);
  await db.runTransaction(async tx => {
    const previous = await tx.get(ref);
    const current = await tx.get(db.doc(`staff_members/${event.params.uid}`));
    if (!current.exists) { tx.set(ref, { status: 'suspended', chatSuspended: true, departmentIds: [] }, { merge: true }); return; }
    const person = current.data();
    tx.set(ref, { uid: after.id, name: person.name || 'Employee', avatarUrl: person.avatarUrl || '', role: 'employee', status: person.status || 'active', departmentIds: previous.data()?.departmentIds || [], chatSuspended: previous.data()?.chatSuspended ?? false }, { merge: true });
  });
  // Full suspension also disables sign-in and revokes refresh tokens. Chat-only suspension never touches Auth.
  const beforeAccount = event.data.before.data() || {};
  if (!after.exists || beforeAccount.status !== after.data().status) {
    const latest = await db.doc(`staff_members/${event.params.uid}`).get();
    const disabled = !latest.exists || latest.data().status === 'suspended';
    try {
      const account = await getAuth().getUser(event.params.uid);
      if (account.disabled !== disabled) {
        await getAuth().updateUser(event.params.uid, { disabled });
      }
      if (disabled) await getAuth().revokeRefreshTokens(event.params.uid);
      const finalState = await db.doc(`staff_members/${event.params.uid}`).get();
      if ((!finalState.exists || finalState.data().status === 'suspended') !== disabled) throw new Error('Account status changed during Auth synchronization; retrying.');
    } catch (error) { if (error.code !== 'auth/user-not-found') throw error; }
  }
  if (after.exists) {
    const before = event.data.before.data() || {}; const person = after.data();
    if (!event.data.before.exists || changed(before, person, ['name', 'avatarUrl', 'allowedModules', 'status', 'staffType', 'assignedOffDays', 'shiftHours', 'agreementId', 'password'])) {
      await notify(event.id, [after.id], { kind: 'account', title: event.data.before.exists ? 'Your workspace access was updated' : 'Welcome to DevEngine', body: 'Your administrator updated your employee profile, permissions or employment settings.', href: '/staff/dashboard' });
    }
  }
});

const employeeEvents = {
  staff_attendance: ['Attendance updated', 'attendance', '/admin/manage-attendance', '/staff/attendance'],
  staff_attendance_requests: ['Missed punch request', 'attendance', '/admin/manage-attendance', '/staff/attendance'],
  staff_work_updates: ['Daily work update', 'work', '/admin/manage-work-updates', '/staff/work-updates'],
  staff_leave_requests: ['Leave request', 'leave', '/admin/manage-leaves', '/staff/leaves'],
  staff_offday_swap_requests: ['Off-day swap request', 'leave', '/admin/manage-leaves', '/staff/leaves'],
  employee_tasks: ['Task updated', 'task', '/admin/manage-staff', '/staff/tasks'],
};
Object.entries(employeeEvents).forEach(([name, info]) => {
  exports[`notify_${name}`] = onDocumentWrittenWithAuthContext({ ...config, document: `${name}/{id}` }, async event => {
    const before = event.data.before.data() || {}; const after = event.data.after.data() || {};
    const record = event.data.after.exists ? after : before;
    const uid = record.staffUid || record.assignedToStaffUid || record.staffId || record.assignedToStaffId;
    if (!uid) return;
    const admin = await adminUid();
    const stampedActor = after.studioEventAt?.isEqual(event.data.after.updateTime) ? after.studioActorUid : null;
    const byEmployee = (stampedActor || event.authId) === uid || (!!event.authId && event.authId === record.staffEmail);
    const title = `${info[0]}${record.status ? ` · ${String(record.status).replace(/_/g, ' ')}` : ''}`;
    await notify(event.id, byEmployee ? [admin] : [uid], { kind: info[1], title, body: byEmployee ? `${record.staffName || record.assignedToName || 'An employee'} submitted a workspace update.` : 'Your administrator updated this item. Open it to view the details.', href: byEmployee ? info[2] : info[3] });
    // Reassignment also tells the previous owner their task has moved.
    if (name === 'employee_tasks' && before.assignedToStaffUid && before.assignedToStaffUid !== uid) await notify(`${event.id}:previous`, [before.assignedToStaffUid], { kind: 'task', title: 'Task assignment changed', body: 'A task previously assigned to you was reassigned.', href: '/staff/tasks' });
  });
});

exports.notifyAgreement = onDocumentWrittenWithAuthContext({ ...config, document: 'agreements/{id}' }, async event => {
  const owners = await db.collection('staff_members').where('agreementId', '==', event.params.id).get();
  const ids = owners.docs.map(d => d.id);
  if (!ids.length) return;
  const employee = ids.includes(event.authId) || owners.docs.some(d => d.data().email === event.authId);
  await notify(event.id, employee ? [await adminUid()] : ids, { kind: 'agreement', title: 'Employment agreement updated', body: employee ? 'An employee updated their agreement.' : 'Your employment agreement has been updated.', href: employee ? '/admin/agreements' : '/staff/agreement' });
});

exports.notifyDepartment = onDocumentWrittenWithAuthContext({ ...config, document: 'studio_departments/{id}' }, async event => {
  const before = event.data.before.data() || {}; const after = event.data.after.data() || {};
  if (!changed(before, after, ['title', 'description', 'avatarUrl', 'memberIds', 'deleted'])) return;
  const recipients = [...new Set([...(before.memberIds || []), ...(after.memberIds || [])])];
  await notify(event.id, recipients, { kind: 'department', title: `${after.title || before.title} · department updated`, body: 'Your department details or membership have changed.', href: '/staff/departments' });
});
exports.notifyChatAccess = onDocumentWrittenWithAuthContext({ ...config, document: 'studio_people/{uid}' }, async event => {
  const before = event.data.before.data(); const after = event.data.after.data();
  if (before && after && before.chatSuspended !== after.chatSuspended) await notify(event.id, [event.params.uid], { kind: 'account', title: after.chatSuspended ? 'Chat access paused' : 'Chat access restored', body: 'Your administrator changed your messaging access.', href: '/staff/messages' });
});
exports.notifyBroadcast = onDocumentWrittenWithAuthContext({ ...config, document: 'studio_notices/{id}' }, async event => {
  if (!event.data.after.exists) return;
  const notice = event.data.after.data();
  const staff = await db.collection('staff_members').where('status', '==', 'active').get();
  await notify(event.id, staff.docs.map(d => d.id), { kind: 'notice', title: notice.title, body: notice.body.slice(0, 180), href: `/staff/notices?notice=${event.params.id}` });
});
exports.notifyMessage = onDocumentCreated({ ...config, document: 'studio_conversations/{chatId}/messages/{messageId}' }, async event => {
  if (!(await event.data.ref.get()).exists) return;
  const message = event.data.data(); message.createdAt = message.sentAt.toDate().toISOString(); const chatRef = db.doc(`studio_conversations/${event.params.chatId}`);
  const snapshot = await chatRef.get(); if (!snapshot.exists || snapshot.data().deleted) return;
  const chat = snapshot.data();
  const profileRefs = chat.participantIds.filter(uid => uid !== message.senderId).map(uid => db.doc(`studio_people/${uid}`));
  const profiles = profileRefs.length ? await db.getAll(...profileRefs) : [];
  const admin = await adminUid();
  const department = chat.kind === 'department' ? await db.doc(`studio_departments/${chat.departmentId}`).get() : null;
  const sender = await db.doc(`studio_people/${message.senderId}`).get();
  const eligible = profiles.filter(p => p.exists && p.data().status === 'active' && !p.data().chatSuspended && (chat.kind === 'department' ? department?.exists && !department.data().deleted && (p.id === admin || department.data().memberIds.includes(p.id)) : p.id === admin || message.senderId === admin || sender.data()?.departmentIds?.some(id => p.data().departmentIds.includes(id))));
  // Older concurrent deliveries must not overwrite the latest chat preview.
  const preview = message.text ? message.text.slice(0, 160) : (message.attachments?.length ? '📎 Attachment' : '');
  await db.runTransaction(async tx => {
    const current = await tx.get(chatRef);
    if (current.exists && (!current.data().lastMessageAt || current.data().lastMessageAt <= message.createdAt)) tx.update(chatRef, { lastMessage: preview, lastMessageAt: message.createdAt, lastSenderId: message.senderId, lastMessageId: event.params.messageId });
  });
  const notifBody = (message.text || (message.attachments?.length ? '📎 Sent an attachment' : '')).slice(0, 180);
  await Promise.all(eligible.map(p => notify(event.id, [p.id], { kind: 'message', title: chat.kind === 'department' ? `${message.senderName} · ${chat.title}` : message.senderName, body: notifBody, href: `${p.id === admin ? '/admin' : '/staff'}/messages?chat=${event.params.chatId}` })));
});

exports.notifyReaction = onDocumentWrittenWithAuthContext({ ...config, document: 'studio_conversations/{chatId}/reactions/{reactionId}' }, async event => {
  if (!event.data.after.exists) return;
  const reaction = event.data.after.data();
  const before = event.data.before.data();
  if (before?.emoji === reaction.emoji) return;
  const message = await db.doc(`studio_conversations/${event.params.chatId}/messages/${reaction.messageId}`).get();
  if (!message.exists || message.data().senderId === reaction.uid) return;
  const chat = await db.doc(`studio_conversations/${event.params.chatId}`).get();
  if (!chat.exists || chat.data().deleted) return;
  const recipient = message.data().senderId;
  // Membership is evaluated again so a queued reaction cannot notify a removed member.
  if (!chat.data().participantIds.includes(recipient)) return;
  const actor = await db.doc(`studio_people/${reaction.uid}`).get();
  const admin = await adminUid();
  await notify(event.id, [recipient], { kind: 'message', title: `${actor.data()?.name || 'A teammate'} reacted ${reaction.emoji}`, body: message.data().text.slice(0, 140), href: `${recipient === admin ? '/admin' : '/staff'}/messages?chat=${event.params.chatId}` });
});

exports.messageRemoved = onDocumentDeleted({ ...config, document: 'studio_conversations/{chatId}/messages/{messageId}' }, async event => {
  const parent = db.doc(`studio_conversations/${event.params.chatId}`);
  const latest = await parent.collection('messages').orderBy('sentAt', 'desc').limit(1).get();
  const row = latest.docs[0];
  await db.runTransaction(async tx => {
    const chat = await tx.get(parent);
    const deletedAt = event.data.data().sentAt.toDate().toISOString();
    if (chat.exists && (chat.data().lastMessageId === event.params.messageId || chat.data().lastMessageAt === deletedAt)) tx.update(parent, { lastMessage: row?.data().text.slice(0, 160) || '', lastMessageId: row?.id || '', lastMessageAt: row?.data().sentAt.toDate().toISOString() || '', lastSenderId: row?.data().senderId || '' });
  });
  const quotes = await parent.collection('messages').where('replyTo', '==', event.params.messageId).get();
  const writer = db.bulkWriter();
  const pending = quotes.docs.map(quote => writer.update(quote.ref, { replyText: 'Message removed by administration', replyName: '' }).catch(error => { if (error.code !== 5) throw error; }));
  await Promise.all([writer.close(), Promise.all(pending)]);
});

// DevKitty is isolated from notification triggers and uses server-verified roles.
Object.assign(exports, require('./devkitty'));
Object.assign(exports, require('./appos'));
