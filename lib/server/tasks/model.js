const { createHash } = require('node:crypto');
const { CalendarError } = require('../calendar/config');
const STATUSES = ['todo', 'in_progress', 'blocked', 'completed'];
const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const TRANSITIONS = { todo: STATUSES, in_progress: STATUSES, blocked: STATUSES, completed: ['completed', 'todo'] };
const hash = value => createHash('sha256').update(value).digest('hex');
const fail = (code, status = 400) => { throw new CalendarError(code, status); };
function text(value, length = 1000) { if (typeof value !== 'string' || value.length > length) fail('invalid_task_field'); return value.trim(); }
function id(value) { if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(value)) fail('invalid_id'); return value; }
function zone(value) { try { new Intl.DateTimeFormat('en', { timeZone: value }).format(); } catch { fail('invalid_timezone'); } return value; }
function wallParts(ms, timeZone) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(ms).map(v => [v.type, v.value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}
function instant(value, timeZone) {
  if (!value) return null;
  if (typeof value !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(value)) fail('invalid_schedule');
  const naive = Date.parse(value + ':00Z');
  if (!Number.isFinite(naive) || new Date(naive).toISOString().slice(0,16) !== value) fail('invalid_schedule');
  const offsets = new Set([-2,-1,0,1,2].map(day => { const sample = naive + day * 86400000; return Date.parse(wallParts(sample, timeZone) + ':00Z') - sample; }));
  const candidates = [...offsets].map(offset => naive - offset).filter(ms => wallParts(ms, timeZone) === value);
  if (candidates.length !== 1) fail(candidates.length ? 'ambiguous_daylight_saving_time' : 'nonexistent_local_time');
  return new Date(candidates[0]).toISOString();
}
function normalize(input, old) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) fail('invalid_task');
  const allowed = ['title','description','status','priority','localStart','localDue','timezone','category','project','tags','subtasks','assigneeUid','links','notes','reminderMinutes','calendarEnabled','emailEnabled'];
  if (Object.keys(input).some(key => !allowed.includes(key))) fail('unsupported_task_field');
  const value = { title: '', description: '', status: 'todo', priority: 'medium', localStart: '', localDue: '', timezone: 'Asia/Dhaka', category: '', project: '', tags: [], subtasks: [], assigneeUid: '', links: [], notes: '', reminderMinutes: [1440,60], calendarEnabled: true, emailEnabled: true, ...old, ...input };
  const task = {};
  for (const [key,max] of Object.entries({title:180,description:12000,localStart:16,localDue:16,timezone:80,category:100,project:180,assigneeUid:128,notes:6000})) task[key] = text(value[key],max);
  if (!task.title) fail('task_title_required');
  if (!STATUSES.includes(value.status) || !PRIORITIES.includes(value.priority)) fail('invalid_task_status_or_priority');
  if (old && !TRANSITIONS[old.status].includes(value.status)) fail('reopen_completed_task_as_todo');
  task.status = value.status; task.priority = value.priority;
  if (task.assigneeUid) id(task.assigneeUid);
  zone(task.timezone);
  task.startAt = instant(task.localStart, task.timezone); task.dueAt = instant(task.localDue, task.timezone);
  if (task.startAt && !task.dueAt) fail('deadline_required_for_start');
  if (task.startAt && task.startAt >= task.dueAt) fail('deadline_must_follow_start');
  task.dueAtMs = task.dueAt ? Date.parse(task.dueAt) : null;
  for (const [key,max,length] of [['tags',20,60],['links',10,2000]]) {
    if (!Array.isArray(value[key]) || value[key].length > max) fail('invalid_task_list');
    task[key] = [...new Set(value[key].map(item => text(item,length)).filter(Boolean))];
  }
  for (const link of task.links) { let u; try { u = new URL(link); } catch { fail('invalid_reference_link'); } if (!['https:','http:'].includes(u.protocol) || u.username || u.password) fail('invalid_reference_link'); }
  if (!Array.isArray(value.subtasks) || value.subtasks.length > 30) fail('invalid_subtasks');
  task.subtasks = value.subtasks.map((item,index) => { if (!item || typeof item !== 'object' || typeof item.done !== 'boolean') fail('invalid_subtasks'); return { id: item.id ? id(item.id) : `sub_${index}`, title: text(item.title,300), done:item.done }; });
  if (task.subtasks.some(item => !item.title) || new Set(task.subtasks.map(item => item.id)).size !== task.subtasks.length) fail('invalid_subtasks');
  if (!Array.isArray(value.reminderMinutes) || value.reminderMinutes.length > 5 || value.reminderMinutes.some(n => !Number.isInteger(n) || n < 1 || n > 43200)) fail('invalid_reminder_times');
  task.reminderMinutes = [...new Set(value.reminderMinutes)].sort((a,b)=>b-a);
  for (const key of ['calendarEnabled','emailEnabled']) { if (typeof value[key] !== 'boolean') fail('invalid_task_field'); task[key] = value[key]; }
  return task;
}
function reminders(task, now) {
  if (!task.dueAtMs || task.status === 'completed' || task.archived || task.deleted) return [];
  return [...task.reminderMinutes.map(minutes => ({ event:`reminder_${minutes}`, runAtMs:task.dueAtMs - minutes * 60000 })), { event:'overdue', runAtMs:Math.max(now,task.dueAtMs) }].filter(item => item.event === 'overdue' || item.runAtMs > now);
}
function eventId(ownerUid, taskId) { return 'de' + hash(`${ownerUid}:${taskId}`).slice(0,48); }
function eventLabel(event) { return event.startsWith('reminder_')?'Upcoming deadline':({overdue:'Task overdue',created:'Task created',assigned:'Task assignment changed',status_changed:'Task status changed',completed:'Task completed',calendar_sync_failed:'Calendar sync needs attention'}[event] || event.replace(/_/g,' ')); }
function eventBody(task, origin) {
  const end = task.dueAt, start = task.startAt || new Date(Date.parse(end) - 1800000).toISOString();
  return { summary: task.title, description: `${task.description}\n\nStatus: ${task.status}\n${origin}/admin/task-manager?task=${task.id}`,
    start:{dateTime:start,timeZone:task.timezone}, end:{dateTime:end,timeZone:task.timezone},
    extendedProperties:{private:{devengineTaskId:task.id,devengineOwnerUid:task.ownerUid}}, reminders:{useDefault:false,overrides:[]} };
}
module.exports = { STATUSES, PRIORITIES, hash, fail, text, id, normalize, instant, reminders, eventId, eventBody, eventLabel };
