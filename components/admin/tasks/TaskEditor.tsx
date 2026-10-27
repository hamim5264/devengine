import {useState} from "react";
import AdminOverlay from "@/components/admin/AdminOverlay";
import {AdminSelect,AdminDateInput} from "@/components/admin/AdminFormControls";
import type {AdminTask,AdminTaskInput,TaskSettings} from "@/types/adminTasks";
import s from "./TaskManager.module.css";
export const emptyTask=():AdminTaskInput=>({title:"",description:"",status:"todo",priority:"medium",localStart:"",localDue:"",timezone:"Asia/Dhaka",category:"",project:"",tags:[],subtasks:[],assigneeUid:"",links:[],notes:"",reminderMinutes:[1440,60],calendarEnabled:false,emailEnabled:false});
const editable=(task:AdminTask):AdminTaskInput=>Object.fromEntries(Object.keys(emptyTask()).map(key=>[key,task[key as keyof AdminTask]])) as unknown as AdminTaskInput;
const reminderLabel=(minutes:number)=>minutes%1440===0?`${minutes/1440} ${minutes===1440?"day":"days"} before`:minutes%60===0?`${minutes/60} ${minutes===60?"hour":"hours"} before`:`${minutes} minutes before`;
export default function TaskEditor({task,people,busy,error,onClose,onSave}:{task:AdminTask|null;people:TaskSettings["people"];busy:boolean;error:string;onClose:()=>void;onSave:(data:AdminTaskInput,requestId:string)=>void}){
  const [form,setForm]=useState<AdminTaskInput>(()=>task?editable(task):emptyTask());
  const [requestId]=useState(()=>crypto.randomUUID());
  const [tags,setTags]=useState(form.tags.join(", ")),[links,setLinks]=useState(form.links.join("\n"));
  const [customAmount,setCustomAmount]=useState("2"),[customUnit,setCustomUnit]=useState("60"),[reminderError,setReminderError]=useState("");
  const reminderChoices=[...new Set([15,30,60,1440,2880,...form.reminderMinutes])].sort((a,b)=>b-a);
  function toggleReminder(minutes:number){setReminderError("");change("reminderMinutes",form.reminderMinutes.includes(minutes)?form.reminderMinutes.filter(value=>value!==minutes):[...form.reminderMinutes,minutes].sort((a,b)=>b-a));}
  function addReminder(){const minutes=Number(customAmount)*Number(customUnit);if(!Number.isInteger(minutes)||minutes<1||minutes>43200){setReminderError("Choose a time between 1 minute and 30 days before the deadline.");return;}if(form.reminderMinutes.length>=5&&!form.reminderMinutes.includes(minutes)){setReminderError("Choose up to 5 reminder times.");return;}change("reminderMinutes",[...new Set([...form.reminderMinutes,minutes])].sort((a,b)=>b-a));setReminderError("");}
  function change<K extends keyof AdminTaskInput>(key:K,value:AdminTaskInput[K]){setForm(old=>({...old,[key]:value}));}
  return <AdminOverlay label={task?"Edit task":"Create task"} onClose={()=>{if(!busy)onClose();}} className={s.overlay}><form className={s.sheet} onSubmit={event=>{event.preventDefault();onSave({...form,tags:tags.split(",").map(v=>v.trim()).filter(Boolean),links:links.split("\n").map(v=>v.trim()).filter(Boolean)},requestId);}}>
    <header className={s.sheetHeader}><div><p className={s.eyebrow}>DEVENGINE · TASK MANAGER</p><h2>{task?"Edit task":"Plan your next move."}</h2></div><button type="button" className={s.iconButton} onClick={onClose} disabled={busy} aria-label="Close task editor"><span className="material-symbols-outlined">close</span></button></header>
    <div className={s.sheetBody}>
      {error&&<p role="alert" className={s.notice} data-error="true">{error}</p>}
      <label className={s.field}>Task title *<input autoFocus required maxLength={180} value={form.title} onChange={e=>change("title",e.target.value)} placeholder="What needs to happen?"/></label>
      <label className={s.field}>Description<textarea rows={4} maxLength={12000} value={form.description} onChange={e=>change("description",e.target.value)} placeholder="Outcome, context and requirements"/></label>
      <div className={s.formGrid}>
        <label className={s.field}>Status<AdminSelect value={form.status} onChange={e=>change("status",e.target.value as AdminTaskInput["status"])}>{["todo","in_progress","blocked","completed"].map(v=><option key={v} value={v}>{v.replace(/_/g," ")}</option>)}</AdminSelect></label>
        <label className={s.field}>Priority<AdminSelect value={form.priority} onChange={e=>change("priority",e.target.value as AdminTaskInput["priority"])}>{["low","medium","high","urgent"].map(v=><option key={v}>{v}</option>)}</AdminSelect></label>
        <label className={s.field}>Start <span className={s.muted}>Optional</span><AdminDateInput type="datetime-local" value={form.localStart} onChange={e=>change("localStart",e.target.value)}/><button type="button" className={s.textButton} onClick={()=>change("localStart","")}>Clear start</button></label>
        <label className={s.field}>Deadline <span className={s.muted}>Optional</span><AdminDateInput type="datetime-local" value={form.localDue} onChange={e=>change("localDue",e.target.value)}/><button type="button" className={s.textButton} onClick={()=>{change("localDue","");change("localStart","");}}>Clear schedule</button></label>
        <label className={s.field}>Timezone<input list="task-timezones" value={form.timezone} onChange={e=>change("timezone",e.target.value)} required/><datalist id="task-timezones">{["Asia/Dhaka","Etc/UTC","Asia/Kolkata","Asia/Dubai","Europe/London","Europe/Berlin","America/New_York","America/Los_Angeles","Australia/Sydney"].map(v=><option key={v}>{v}</option>)}</datalist></label>
        <label className={s.field}>Assignee<AdminSelect value={form.assigneeUid} onChange={e=>change("assigneeUid",e.target.value)}><option value="">Administrator</option>{people.map(p=><option key={p.uid} value={p.uid}>{p.name}</option>)}</AdminSelect></label>
        <label className={s.field}>Project<input maxLength={180} value={form.project} onChange={e=>change("project",e.target.value)} placeholder="Project name"/></label>
        <label className={s.field}>Category<input maxLength={100} value={form.category} onChange={e=>change("category",e.target.value)} placeholder="e.g. Engineering"/></label>
      </div>
      <label className={s.field}>Tags<input value={tags} onChange={e=>setTags(e.target.value)} placeholder="Comma-separated tags"/></label>
      <section className={s.subtasks}><div className={s.row}><h3>Subtasks</h3><button type="button" className={s.textButton} disabled={form.subtasks.length>=30} onClick={()=>change("subtasks",[...form.subtasks,{id:crypto.randomUUID(),title:"",done:false}])}>+ Add subtask</button></div>{form.subtasks.map((sub,index)=><div key={sub.id} className={s.subtask}><input type="checkbox" checked={sub.done} aria-label={`Complete subtask ${index+1}`} onChange={e=>change("subtasks",form.subtasks.map(v=>v.id===sub.id?{...v,done:e.target.checked}:v))}/><input required maxLength={300} value={sub.title} aria-label={`Subtask ${index+1}`} placeholder="Subtask title" onChange={e=>change("subtasks",form.subtasks.map(v=>v.id===sub.id?{...v,title:e.target.value}:v))}/><button type="button" className={s.iconButton} aria-label="Remove subtask" onClick={()=>change("subtasks",form.subtasks.filter(v=>v.id!==sub.id))}><span className="material-symbols-outlined">close</span></button></div>)}</section>
      <label className={s.field}>Reference links<textarea rows={2} value={links} onChange={e=>setLinks(e.target.value)} placeholder="One URL per line"/></label>
      <label className={s.field}>Contextual notes<textarea rows={2} value={form.notes} maxLength={6000} onChange={e=>change("notes",e.target.value)} placeholder="Useful background for the team"/></label>
      <div className={s.integrationOptions}><label><input type="checkbox" checked={form.calendarEnabled} onChange={e=>change("calendarEnabled",e.target.checked)}/>Show this task in my Google Calendar</label><label><input type="checkbox" checked={form.emailEnabled} onChange={e=>change("emailEnabled",e.target.checked)}/>Also send task updates and reminders by email</label>
        <fieldset className={s.reminderSettings}><legend>When should I be reminded?</legend><p>Select when you want a notification before this task’s deadline. You can choose up to 5 times.</p>
          <div className={s.reminderChoices}>{reminderChoices.map(minutes=><label key={minutes} className={s.reminderChoice} data-selected={form.reminderMinutes.includes(minutes)}><input type="checkbox" checked={form.reminderMinutes.includes(minutes)} disabled={busy || !form.reminderMinutes.includes(minutes)&&form.reminderMinutes.length>=5} onChange={()=>toggleReminder(minutes)}/><span>{reminderLabel(minutes)}</span></label>)}</div>
          <div className={s.customReminder}><label className={s.field}>Custom reminder<input type="text" inputMode="decimal" value={customAmount} onChange={e=>setCustomAmount(e.target.value)}/></label><label className={s.field}>Time unit<AdminSelect value={customUnit} onChange={e=>setCustomUnit(e.target.value)}><option value="1">Minutes before</option><option value="60">Hours before</option><option value="1440">Days before</option></AdminSelect></label><button type="button" className={s.button} onClick={addReminder} disabled={busy}>Add reminder</button></div>
          {reminderError&&<p role="alert">{reminderError}</p>}
          <div className={s.row}><p aria-live="polite">{!form.localDue?"Add a deadline above to schedule these reminders.":form.reminderMinutes.length?`Selected: ${form.reminderMinutes.map(reminderLabel).join(" · ")}.`:"No reminders before the deadline."}</p><button type="button" className={s.textButton} onClick={()=>change("reminderMinutes",[])}>Clear reminders</button></div>
          <p>Reminders appear in your notification center. Enable email above to receive them by email too.</p>
        </fieldset>
      </div>
    </div>
    <footer className={s.sheetFooter}><button type="button" className={s.button} disabled={busy} onClick={onClose}>Cancel</button><button className={s.primary} disabled={busy}>{busy?"Saving…":task?"Save changes":"Create task"}</button></footer>
  </form></AdminOverlay>;
}
