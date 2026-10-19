import Head from "next/head";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/router";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getStaffByUid } from "@/lib/services/staffService";
import {
  getEmployeeTasks,
  updateEmployeeTask,
} from "@/lib/services/employeeTaskService";
import StaffLayout from "@/components/StaffLayout";
import HelixLoader from "@/components/HelixLoader";
import CustomSelectField from "@/components/staff/CustomSelectField";
import AttachmentPicker from "@/components/common/AttachmentPicker";
import AttachmentList from "@/components/common/AttachmentList";
import { EmployeeHeading, EmployeeIcon, EmployeeMetric, EmployeeBadge, EmployeeProgress, EmployeeSearch, EmployeeEmpty, EmployeeLoading, EmployeeDialog } from "@/components/staff/EmployeeUI";
import styles from "@/components/staff/EmployeeExperience.module.css";
import type { StaffMember } from "@/types/staff";
import type {
  EmployeeTask,
  TaskPriority,
  TaskStatus,
  EcoAttachment,
} from "@/types/staffEcoSystem";
import {
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
} from "@/types/staffEcoSystem";

export default function StaffTasksPage() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [staffData, setStaffData] = useState<StaffMember | null>(null);
  const [tasks, setTasks] = useState<EmployeeTask[]>([]);
  const [loading, setLoading] = useState(true);

  // Live timer tick
  const [now, setNow] = useState<Date>(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Update Task Modal
  const [selectedTask, setSelectedTask] = useState<EmployeeTask | null>(null);
  const [viewingTask, setViewingTask] = useState<EmployeeTask | null>(null);
  const [startingTaskId, setStartingTaskId] = useState<string | null>(null);

  const [editStatus, setEditStatus] = useState<TaskStatus>("todo");
  const [editProgress, setEditProgress] = useState<number>(0);
  const [editNotes, setEditNotes] = useState("");
  const [editSubmissionUrl, setEditSubmissionUrl] = useState("");
  const [editSubmissionAttachments, setEditSubmissionAttachments] = useState<EcoAttachment[]>([]);
  const [editActualHours, setEditActualHours] = useState<number>(0);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [taskError, setTaskError] = useState("");
  const [updateError, setUpdateError] = useState("");

  // Time & Status Calculation Helper
  const parseTaskDateTime = (dateStr?: string, timeStr?: string, defaultTime: string = "00:00") => {
    if (!dateStr) return null;
    const time = timeStr && timeStr.trim() ? timeStr : defaultTime;
    const d = new Date(`${dateStr}T${time}:00`);
    return isNaN(d.getTime()) ? null : d;
  };

  const formatCountdown = (targetDate: Date, fromDate: Date) => {
    const diff = targetDate.getTime() - fromDate.getTime();
    if (diff <= 0) return "00:00:00";
    const totalSeconds = Math.floor(diff / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (days > 0) {
      return `${days}d ${hours.toString().padStart(2, "0")}h ${minutes.toString().padStart(2, "0")}m ${seconds.toString().padStart(2, "0")}s`;
    }
    return `${hours.toString().padStart(2, "0")}h ${minutes.toString().padStart(2, "0")}m ${seconds.toString().padStart(2, "0")}s`;
  };

  const formatOverdue = (targetDate: Date, fromDate: Date) => {
    const diff = fromDate.getTime() - targetDate.getTime();
    if (diff <= 0) return "Just now";
    const totalSeconds = Math.floor(diff / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    }
    return `${hours}h ${minutes}m`;
  };

  const fetchTasks = async (staffId: string) => {
    try {
      setLoading(true);
      setTaskError("");
      const data = await getEmployeeTasks(staffId);
      setTasks(data);
    } catch (err) {
      console.error("Failed to load tasks:", err);
      setTaskError("Your tasks could not be refreshed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/staff");
        return;
      }
      const staff = await getStaffByUid(user.uid);
      if (!staff || staff.status !== "active") {
        router.replace("/staff");
        return;
      }
      setStaffData(staff);
      await fetchTasks(staff.id);
      setAuthReady(true);
    });
    return () => unsub();
  }, [router]);

  // Handle Start Task Now
  const handleStartTask = async (task: EmployeeTask) => {
    try {
      setStartingTaskId(task.id);
      await updateEmployeeTask(task.id, {
        status: "in_progress",
        startedAt: new Date().toISOString(),
      });
      if (staffData) {
        await fetchTasks(staffData.id);
      }
    } catch (err) {
      console.error("Failed to start task:", err);
      alert("Failed to start task.");
    } finally {
      setStartingTaskId(null);
    }
  };

  // Open modal
  const handleOpenEdit = (task: EmployeeTask) => {
    setSelectedTask(task);
    setEditStatus(task.status);
    setEditProgress(task.progressPercent || 0);
    setEditNotes(task.employeeNotes || "");
    setEditSubmissionUrl(task.submissionUrl || "");
    setEditSubmissionAttachments(task.submissionAttachments || []);
    setEditActualHours(task.actualHours || 0);
    setUpdateSuccess(false);
    setUpdateError("");
  };

  // Submit update
  const handleSaveUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;

    setIsUpdating(true);
    setUpdateError("");
    try {
      await updateEmployeeTask(selectedTask.id, {
        status: editStatus,
        progressPercent: Number(editProgress),
        employeeNotes: editNotes,
        submissionUrl: editSubmissionUrl,
        submissionAttachments: editSubmissionAttachments,
        actualHours: Number(editActualHours) || 0,
      });

      setUpdateSuccess(true);
      // Refresh local state
      if (staffData) {
        await fetchTasks(staffData.id);
      }
      setTimeout(() => {
        setSelectedTask(null);
        setUpdateSuccess(false);
      }, 1000);
    } catch (err) {
      console.error("Failed to update task:", err);
      setUpdateError(err instanceof Error ? err.message : "Your progress could not be saved. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inTitle = t.title.toLowerCase().includes(q);
        const inDesc = t.description?.toLowerCase().includes(q);
        const inCategory = t.category?.toLowerCase().includes(q);
        if (!inTitle && !inDesc && !inCategory) return false;
      }
      return true;
    });
  }, [tasks, statusFilter, priorityFilter, searchQuery]);

  // Stats
  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === "completed").length;
    const inProgress = tasks.filter((t) => t.status === "in_progress").length;
    const inReview = tasks.filter((t) => t.status === "in_review").length;
    const todo = tasks.filter((t) => t.status === "todo").length;

    const todayStr = new Date().toISOString().split("T")[0];
    const overdue = tasks.filter(
      (t) => t.status !== "completed" && t.dueDate && t.dueDate < todayStr
    ).length;

    return {
      total,
      completed,
      inProgress,
      inReview,
      todo,
      overdue,
      rate: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }, [tasks]);

  if (!authReady) return <EmployeeLoading />;

  const timingFor = (task: EmployeeTask) => {
    const start = parseTaskDateTime(task.startDate || task.assignedDate, task.startTime, "09:00");
    const due = parseTaskDateTime(task.dueDate, task.dueTime, "18:00");
    return {
      start, due,
      locked: Boolean(start && now < start && task.status !== "in_progress" && task.status !== "completed"),
      ready: Boolean(start && now >= start && task.status === "todo"),
      overdue: Boolean(due && now > due && task.status !== "completed"),
    };
  };
  const viewingTiming = viewingTask ? timingFor(viewingTask) : null;

  return (
    <StaffLayout title="Tasks & Deadlines | Employee Portal">
      <Head><title>Tasks & Deadlines | DevEngine Portal</title></Head>
      <div className={styles.page}>
        <EmployeeHeading eyebrow="Your next move" icon="assignment" title="My Assigned Tasks"
          description="Your sprints, priorities, and deliverables—all in one place. Keep your team in sync as work moves forward."
          actions={<button type="button" className={styles.secondaryButton} disabled={loading} onClick={() => staffData && fetchTasks(staffData.id)}><EmployeeIcon>refresh</EmployeeIcon>{loading ? "Refreshing…" : "Refresh Tasks"}</button>} />

        <div className={styles.metrics}>
          <EmployeeMetric label="Total tasks" value={stats.total} icon="assignment" />
          <EmployeeMetric label="In progress" value={stats.inProgress} icon="pending_actions" />
          <EmployeeMetric label="In review" value={stats.inReview} icon="fact_check" />
          <EmployeeMetric label="Completed" value={stats.completed} icon="task_alt" />
          <EmployeeMetric label="Overdue" value={stats.overdue} icon="event_busy" warning={stats.overdue > 0} />
          <EmployeeMetric label="Completion rate" value={`${stats.rate}%`} icon="donut_large" />
        </div>

        <div className={styles.toolbar}>
          <div className={styles.tabs} role="group" aria-label="Filter tasks by status">
            {(["all", "todo", "in_progress", "in_review", "completed", "blocked"] as const).map((tab) => (
              <button key={tab} type="button" className={styles.tab} aria-pressed={statusFilter === tab} onClick={() => setStatusFilter(tab)}>{tab === "all" ? "All tasks" : TASK_STATUS_LABELS[tab]}</button>
            ))}
          </div>
          <div className={styles.filters}>
            <EmployeeSearch label="Search assigned tasks" value={searchQuery} onChange={setSearchQuery} placeholder="Search tasks or categories…" />
            <CustomSelectField value={priorityFilter} onChange={setPriorityFilter} className={styles.customField} placeholder="Priority"
              options={[{ value: "all", label: "All priorities" }, ...(["urgent", "high", "normal", "low"] as TaskPriority[]).map((value) => ({ value, label: TASK_PRIORITY_LABELS[value] }))]} />
          </div>
        </div>
        <div className={styles.sectionHeading}>
          <h2>{statusFilter === "all" ? "Your task board" : TASK_STATUS_LABELS[statusFilter as TaskStatus]}</h2>
          <span aria-live="polite">{filteredTasks.length} of {tasks.length} tasks{loading ? " · Refreshing…" : ""}</span>
        </div>
        {taskError && <p className={styles.feedback} data-tone="danger" role="alert">{taskError}</p>}

        {loading && tasks.length === 0 ? <div className={styles.inlineLoading}><HelixLoader size={36} color="#2cecf7" /><p>Loading your tasks…</p></div>
          : filteredTasks.length === 0 ? <EmployeeEmpty icon="task_alt" title={tasks.length === 0 ? "A little room for what's next" : "No matching tasks"}
              description={tasks.length === 0 ? "Your assigned tasks will appear here when your administrator adds them." : "Try another search, status, or priority to find your task."}>
              {tasks.length > 0 && <button type="button" className={styles.secondaryButton} onClick={() => { setStatusFilter("all"); setPriorityFilter("all"); setSearchQuery(""); }}>Clear filters</button>}
            </EmployeeEmpty>
          : <div className={styles.taskGrid} aria-busy={loading}>
            {filteredTasks.map((task) => {
              const timing = timingFor(task);
              return <article key={task.id} className={styles.taskCard}>
                <div className={styles.badgeRow}>
                  <EmployeeBadge tone={task.priority}>{TASK_PRIORITY_LABELS[task.priority]}</EmployeeBadge>
                  {task.category && <EmployeeBadge>{task.category}</EmployeeBadge>}
                  <EmployeeBadge tone={task.status}>{TASK_STATUS_LABELS[task.status]}</EmployeeBadge>
                </div>
                <div><h2>{task.title}</h2>{task.description && <p className={styles.taskDescription}>{task.description}</p>}</div>
                {timing.locked && timing.start && <div className={styles.timing} data-tone="warning"><div><strong><EmployeeIcon>lock_clock</EmployeeIcon>Starts in</strong><span className={styles.timer}>{formatCountdown(timing.start, now)}</span></div><p>Scheduled for {task.startDate || task.assignedDate} at {task.startTime || "09:00"}</p></div>}
                {timing.ready && <div className={styles.timing}><div><strong><EmployeeIcon>play_circle</EmployeeIcon>Ready to begin</strong><EmployeeBadge tone="accent">Work unlocked</EmployeeBadge></div></div>}
                {timing.overdue && timing.due && <div className={styles.timing} data-tone="danger"><div><strong><EmployeeIcon>event_busy</EmployeeIcon>Overdue by</strong><span className={styles.timer}>{formatOverdue(timing.due, now)}</span></div><p>Please update your progress and complete the remaining deliverables.</p></div>}
                <dl className={styles.details}>
                  <div><dt>Start schedule</dt><dd>{task.startDate || task.assignedDate}{task.startTime ? ` · ${task.startTime}` : ""}</dd></div>
                  <div><dt>Deadline</dt><dd>{task.dueDate}{task.dueTime ? ` · ${task.dueTime}` : ""}</dd></div>
                  <div><dt>Logged / estimated hours</dt><dd>{task.actualHours || 0}h / {task.estimatedHours || 0}h</dd></div>
                </dl>
                <EmployeeProgress value={task.progressPercent} label="Task progress" />
                {task.adminFeedback && <div className={styles.note}><h3>Admin feedback</h3><p>{task.adminFeedback}</p></div>}
                {task.submissionUrl && <a className={styles.link} href={task.submissionUrl} target="_blank" rel="noopener noreferrer"><EmployeeIcon>link</EmployeeIcon>View deliverable</a>}
                {task.adminAttachments && task.adminAttachments.length > 0 && (
                  <AttachmentList attachments={task.adminAttachments} title="Admin Brief & Attachments" />
                )}
                {task.submissionAttachments && task.submissionAttachments.length > 0 && (
                  <AttachmentList attachments={task.submissionAttachments} title="My Submitted Files" />
                )}
                <div className={styles.cardActions}>
                  {timing.locked ? <><button type="button" className={styles.secondaryButton} onClick={() => setViewingTask(task)}><EmployeeIcon>visibility</EmployeeIcon>View Task Details</button><p className={styles.lockHint}>Execution unlocks at the scheduled start time.</p></>
                    : task.status === "completed" ? <button type="button" className={styles.secondaryButton} onClick={() => setViewingTask(task)}><EmployeeIcon>task_alt</EmployeeIcon>Completed · View Details</button>
                    : <><button type="button" className={styles.primaryButton} disabled={startingTaskId === task.id}
                        onClick={() => timing.ready ? handleStartTask(task) : handleOpenEdit(task)}>
                        <EmployeeIcon>{timing.ready ? "play_arrow" : "edit_note"}</EmployeeIcon>{startingTaskId === task.id ? "Starting…" : timing.ready ? "Start Now" : "Update Progress"}
                      </button><button type="button" className={styles.iconButton} onClick={() => setViewingTask(task)} aria-label={`View details for ${task.title}`}><EmployeeIcon>visibility</EmployeeIcon></button></>}
                </div>
              </article>;
            })}
          </div>}

        {selectedTask && <EmployeeDialog title="Update task progress" description="Share your progress, working hours, and latest deliverable." icon="edit_note" onClose={() => setSelectedTask(null)}>
          <form onSubmit={handleSaveUpdate} className={styles.form}>
            <div className={styles.note}><h3>{selectedTask.title}</h3><p>Due: {selectedTask.dueDate} {selectedTask.dueTime ? `at ${selectedTask.dueTime}` : ""}</p></div>
            <CustomSelectField<TaskStatus> label="Current status" value={editStatus} className={styles.customField}
              onChange={(value) => { setEditStatus(value); if (value === "completed" && editProgress < 100) setEditProgress(100); }}
              options={(["todo", "in_progress", "in_review", "completed", "blocked"] as TaskStatus[]).map((value) => ({ value, label: TASK_STATUS_LABELS[value] }))} />
            <div className={styles.rangeField}><div><label htmlFor="employee-task-progress">Progress</label><strong>{editProgress}%</strong></div>
              <input id="employee-task-progress" type="range" min="0" max="100" step="5" value={editProgress} onChange={(event) => setEditProgress(Number(event.target.value))} />
            </div>
            <label className={styles.field}>Actual hours worked
              <input type="number" step="0.5" min="0" value={editActualHours} onChange={(event) => setEditActualHours(Number(event.target.value))} placeholder="e.g. 4.5" />
            </label>
            <label className={styles.field}>Progress notes (optional)
              <textarea rows={4} value={editNotes} onChange={(event) => setEditNotes(event.target.value)} placeholder="What changed? Share completed work or current blockers…" />
            </label>
            <label className={styles.field}>Deliverable URL (optional)
              <input type="url" value={editSubmissionUrl} onChange={(event) => setEditSubmissionUrl(event.target.value)} placeholder="https://github.com/… or your design link" />
            </label>
            <AttachmentPicker
              label="Deliverable files / attachments (optional)"
              hint="Upload project files, PDFs, design exports, or zip archives (max 5 files, up to 10 MB each)"
              storageFolder={`task-submissions/${selectedTask.id}`}
              value={editSubmissionAttachments}
              onChange={setEditSubmissionAttachments}
            />
            {updateSuccess && <p className={styles.feedback} role="status">Task progress updated successfully!</p>}
            {updateError && <p className={styles.feedback} data-tone="danger" role="alert">{updateError}</p>}
            <div className={styles.formActions}><button type="button" className={styles.secondaryButton} onClick={() => setSelectedTask(null)}>Cancel</button><button type="submit" className={styles.primaryButton} disabled={isUpdating || updateSuccess}>{isUpdating ? "Saving…" : "Save Updates"}<EmployeeIcon>check</EmployeeIcon></button></div>
          </form>
        </EmployeeDialog>}

        {viewingTask && viewingTiming && <EmployeeDialog title="Task details" icon="description" onClose={() => setViewingTask(null)} wide>
          <div className={styles.detailSummary}>
            <div className={styles.badgeRow}><EmployeeBadge tone={viewingTask.priority}>{TASK_PRIORITY_LABELS[viewingTask.priority]}</EmployeeBadge>{viewingTask.category && <EmployeeBadge>{viewingTask.category}</EmployeeBadge>}<EmployeeBadge tone={viewingTask.status}>{TASK_STATUS_LABELS[viewingTask.status]}</EmployeeBadge></div>
            <h3>{viewingTask.title}</h3>
            {viewingTiming.locked && viewingTiming.start && <div className={styles.timing} data-tone="warning"><div><strong><EmployeeIcon>lock_clock</EmployeeIcon>Execution locked · Starts in</strong><span className={styles.timer}>{formatCountdown(viewingTiming.start, now)}</span></div><p>You can review the scope now. Work unlocks at the scheduled start time.</p></div>}
            {viewingTiming.ready && <div className={styles.timing}><div><strong><EmployeeIcon>play_circle</EmployeeIcon>Ready to begin</strong><button type="button" className={styles.primaryButton} disabled={startingTaskId === viewingTask.id} onClick={() => { handleStartTask(viewingTask); setViewingTask(null); }}>Start Now</button></div></div>}
            {viewingTiming.overdue && viewingTiming.due && <div className={styles.timing} data-tone="danger"><div><strong><EmployeeIcon>event_busy</EmployeeIcon>Overdue by</strong><span className={styles.timer}>{formatOverdue(viewingTiming.due, now)}</span></div><p>The deadline has passed. Please update the remaining deliverables.</p></div>}
            <div className={styles.detailStats}>
              <div><span>Start schedule</span><strong>{viewingTask.startDate || viewingTask.assignedDate}</strong><small>{viewingTask.startTime || "09:00"}</small></div>
              <div><span>Target deadline</span><strong>{viewingTask.dueDate}</strong><small>{viewingTask.dueTime || "18:00"}</small></div>
              <div><span>Working hours</span><strong>{viewingTask.actualHours || 0}h logged</strong><small>{viewingTask.estimatedHours || 0}h estimated</small></div>
            </div>
            <EmployeeProgress value={viewingTask.progressPercent} />
            <div className={styles.note}><h3>Scope of work & deliverables</h3><p>{viewingTask.description || "No specific scope details provided. Please consult with your engineering lead."}</p></div>
            {viewingTask.employeeNotes && <div className={styles.note}><h3>Your progress notes</h3><p>{viewingTask.employeeNotes}</p></div>}
            {viewingTask.adminFeedback && <div className={styles.note}><h3>Administrator guidance</h3><p>{viewingTask.adminFeedback}</p></div>}
            {viewingTask.submissionUrl && <a href={viewingTask.submissionUrl} target="_blank" rel="noopener noreferrer" className={styles.link}><EmployeeIcon>link</EmployeeIcon>Open deliverable</a>}
            {viewingTask.adminAttachments && viewingTask.adminAttachments.length > 0 && (
              <AttachmentList attachments={viewingTask.adminAttachments} title="Admin Brief & Attachments" />
            )}
            {viewingTask.submissionAttachments && viewingTask.submissionAttachments.length > 0 && (
              <AttachmentList attachments={viewingTask.submissionAttachments} title="Submitted Deliverables & Files" />
            )}
            <div className={styles.formActions}><button type="button" className={styles.secondaryButton} onClick={() => setViewingTask(null)}>Close</button>
              {!viewingTiming.locked && <button type="button" className={styles.primaryButton} onClick={() => { const task = viewingTask; setViewingTask(null); handleOpenEdit(task); }}>Update Progress<EmployeeIcon>arrow_forward</EmployeeIcon></button>}
            </div>
          </div>
        </EmployeeDialog>}
      </div>
    </StaffLayout>
  );
}
