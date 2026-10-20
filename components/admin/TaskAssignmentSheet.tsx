import type { Dispatch, FormEvent, SetStateAction } from "react";
import { EmployeeDialog, EmployeeIcon } from "@/components/staff/EmployeeUI";
import StaffAvatar from "@/components/staff/StaffAvatar";
import AttachmentPicker from "@/components/common/AttachmentPicker";
import { AdminDateInput, AdminSelect } from "./AdminFormControls";
import type { StaffMember } from "@/types/staff";
import type { EcoAttachment, TaskPriority } from "@/types/staffEcoSystem";
import s from "./TaskAssignmentSheet.module.css";

interface TaskDraft {
  title: string; description: string; priority: TaskPriority; category: string;
  startDate: string; startTime: string; dueDate: string; dueTime: string;
  estimatedHours: number; adminAttachments?: EcoAttachment[];
}
export default function TaskAssignmentSheet({ employee, value, onChange, onSubmit, busy, onClose }: {
  employee: StaffMember; value: TaskDraft; onChange: Dispatch<SetStateAction<TaskDraft>>;
  onSubmit: (event: FormEvent) => void | Promise<void>; busy: boolean; onClose: () => void;
}) {
  const set = <K extends keyof TaskDraft>(key: K, next: TaskDraft[K]) => onChange(current => ({ ...current, [key]: next }));
  return <EmployeeDialog wide title="Assign a task" description="A clear brief. A realistic schedule. Everything in one place." icon="assignment" onClose={() => { if (!busy) onClose(); }}>
    <form onSubmit={onSubmit} className={s.sheet} aria-busy={busy}>
      <div className={s.assignee}><StaffAvatar name={employee.name} url={employee.avatarUrl} /><div><span>ASSIGNED TO</span><strong>{employee.name}</strong><p>{employee.email}</p></div><span className={s.assigneeIcon}><EmployeeIcon>person_check</EmployeeIcon></span></div>
      <section className={s.section} aria-labelledby="assignment-brief">
        <div className={s.sectionTitle}><span>01</span><h3 id="assignment-brief">The brief</h3><p>What needs to get done?</p></div>
        <label className={s.field}><span>Task title <b>*</b></span><input className="bg-transparent" type="text" required disabled={busy} value={value.title} onChange={event => set("title", event.target.value)} placeholder="A clear, specific task title" /></label>
        <label className={s.field}><span>Description & deliverables</span><textarea className="bg-transparent" rows={4} disabled={busy} value={value.description} onChange={event => set("description", event.target.value)} placeholder="Describe the work and expected outcome" /></label>
        <div className={s.twoColumns}>
          <div className={s.field}><span>Priority</span><AdminSelect aria-label="Task priority" disabled={busy} value={value.priority} onChange={event => set("priority", event.target.value as TaskPriority)}><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option></AdminSelect></div>
          <label className={s.field}><span>Category</span><input className="bg-transparent" type="text" disabled={busy} value={value.category} onChange={event => set("category", event.target.value)} placeholder="Frontend, backend, or design" /></label>
        </div>
      </section>
      <section className={s.section} aria-labelledby="assignment-schedule">
        <div className={s.sectionTitle}><span>02</span><h3 id="assignment-schedule">Schedule & effort</h3><p>Choose when work starts and when it is due.</p></div>
        <div className={s.scheduleGrid}>
          <div className={s.scheduleCard}>
            <div className={s.scheduleHeading}><span><EmployeeIcon>schedule</EmployeeIcon></span><div><h4>Starts</h4><p>Work unlocks at this time.</p></div></div>
            <div className={s.field}><span>Start date <b>*</b></span><AdminDateInput required disabled={busy} aria-label="Task start date" value={value.startDate} onChange={event => set("startDate", event.target.value)} /></div>
            <div className={s.field}><span>Start time <small>24-hour time</small></span><AdminDateInput type="time" disabled={busy} aria-label="Task start time" value={value.startTime} onChange={event => set("startTime", event.target.value)} /></div>
          </div>
          <div className={s.scheduleCard}>
            <div className={s.scheduleHeading}><span><EmployeeIcon>event_available</EmployeeIcon></span><div><h4>Due</h4><p>The target for delivery.</p></div></div>
            <div className={s.field}><span>Due date <b>*</b></span><AdminDateInput required disabled={busy} aria-label="Task due date" value={value.dueDate} onChange={event => set("dueDate", event.target.value)} /></div>
            <div className={s.field}><span>Due time <small>24-hour time</small></span><AdminDateInput type="time" disabled={busy} aria-label="Task due time" value={value.dueTime} onChange={event => set("dueTime", event.target.value)} /></div>
          </div>
        </div>
        <div className={s.effort}><span className={s.effortIcon}><EmployeeIcon>timelapse</EmployeeIcon></span><div><strong>Estimated effort</strong><p>Time expected to complete the work.</p></div><label><span className={s.srOnly}>Estimated hours</span><input className="bg-transparent" type="number" min="0" step="0.5" disabled={busy} value={value.estimatedHours} onChange={event => set("estimatedHours", Number(event.target.value))} /><span>hours</span></label></div>
      </section>
      <section className={s.files} aria-label="Supporting files"><AttachmentPicker label="Supporting files" hint="Optional · Up to 10 MB per file" folder="admin-tasks" disabled={busy} value={value.adminAttachments || []} onChange={files => set("adminAttachments", files)} /></section>
      <div className={s.actions}><span><EmployeeIcon>checklist</EmployeeIcon>Ready for the next step.</span><div><button type="button" className={s.cancel} disabled={busy} onClick={onClose}>Cancel</button><button type="submit" className={s.primary} disabled={busy || !value.title.trim()}><EmployeeIcon>{busy ? "hourglass_top" : "assignment_add"}</EmployeeIcon>{busy ? "Assigning…" : "Assign task"}</button></div></div>
    </form>
  </EmployeeDialog>;
}
