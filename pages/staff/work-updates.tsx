import Head from "next/head";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getStaffByUid } from "@/lib/services/staffService";
import {
  getTodayDateString,
  getStaffWorkUpdates,
  submitDailyWorkUpdate,
} from "@/lib/services/staffEcoService";
import StaffLayout from "@/components/StaffLayout";
import { EmployeeHeading, EmployeeIcon, EmployeeMetric, EmployeeBadge, EmployeeSearch, EmployeeEmpty, EmployeeLoading, EmployeeDialog } from "@/components/staff/EmployeeUI";
import styles from "@/components/staff/EmployeeExperience.module.css";
import type { StaffMember } from "@/types/staff";
import type { DailyWorkUpdate } from "@/types/staffEcoSystem";

export default function StaffWorkUpdatesPage() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [staffData, setStaffData] = useState<StaffMember | null>(null);

  const [workUpdates, setWorkUpdates] = useState<DailyWorkUpdate[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  // Editor Modal
  const [showEditor, setShowEditor] = useState(false);
  const [editDate, setEditDate] = useState(getTodayDateString());
  const [form, setForm] = useState({
    tasksCompleted: "",
    tasksInProgress: "",
    blockers: "",
    hoursWorked: 8,
    projectLinks: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [saveError, setSaveError] = useState("");

  const loadUpdates = async (staff: StaffMember) => {
    try {
      const updates = await getStaffWorkUpdates(staff.id, 50);
      setWorkUpdates(updates);

      // Check if today already has an update
      const today = getTodayDateString();
      const todayUpdate = updates.find((u) => u.date === today);
      if (todayUpdate) {
        setForm({
          tasksCompleted: todayUpdate.tasksCompleted || "",
          tasksInProgress: todayUpdate.tasksInProgress || "",
          blockers: todayUpdate.blockers || "",
          hoursWorked: todayUpdate.hoursWorked || 8,
          projectLinks: todayUpdate.projectLinks || "",
        });
      }
    } catch (err) {
      console.error("Error loading work updates:", err);
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
      await loadUpdates(staff);
      setAuthReady(true);
    });
    return () => unsub();
  }, [router]);

  const handleOpenEditor = (targetDate: string = getTodayDateString()) => {
    setEditDate(targetDate);
    setSaveError("");
    setSuccessMsg("");
    const existing = workUpdates.find((u) => u.date === targetDate);
    if (existing) {
      setForm({
        tasksCompleted: existing.tasksCompleted || "",
        tasksInProgress: existing.tasksInProgress || "",
        blockers: existing.blockers || "",
        hoursWorked: existing.hoursWorked || 8,
        projectLinks: existing.projectLinks || "",
      });
    } else {
      setForm({
        tasksCompleted: "",
        tasksInProgress: "",
        blockers: "",
        hoursWorked: 8,
        projectLinks: "",
      });
    }
    setShowEditor(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffData || !form.tasksCompleted.trim()) return;
    setIsSubmitting(true);
    setSaveError("");
    setSuccessMsg("");
    try {
      const updated = await submitDailyWorkUpdate({
        staffId: staffData.id,
        staffUid: staffData.uid,
        staffName: staffData.name,
        staffEmail: staffData.email,
        staffType: staffData.staffType,
        date: editDate,
        tasksCompleted: form.tasksCompleted,
        tasksInProgress: form.tasksInProgress,
        blockers: form.blockers,
        hoursWorked: Number(form.hoursWorked) || 0,
        projectLinks: form.projectLinks,
      });

      setWorkUpdates((prev) => {
        const filtered = prev.filter((u) => u.id !== updated.id);
        return [updated, ...filtered].sort((a, b) => b.date.localeCompare(a.date));
      });

      setSuccessMsg("Daily work update saved successfully!");
      setTimeout(() => {
        setShowEditor(false);
        setSuccessMsg("");
      }, 1200);
    } catch (err) {
      console.error("Save error:", err);
      setSaveError(err instanceof Error ? err.message : "Your report could not be saved. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!authReady || !staffData) return <EmployeeLoading />;

  const today = getTodayDateString();
  const todayEntry = workUpdates.find((u) => u.date === today);
  const totalHoursLogged = workUpdates.reduce((sum, u) => sum + (u.hoursWorked || 0), 0);

  const filteredUpdates = workUpdates.filter((u) => {
    const q = searchTerm.toLowerCase();
    return (
      u.date.includes(q) ||
      u.tasksCompleted.toLowerCase().includes(q) ||
      (u.tasksInProgress && u.tasksInProgress.toLowerCase().includes(q)) ||
      (u.blockers && u.blockers.toLowerCase().includes(q))
    );
  });

  return (
    <StaffLayout title="Daily Work Updates | Employee Portal">
      <Head><title>Daily Work Updates | Employee Portal</title></Head>
      <div className={styles.page}>
        <EmployeeHeading eyebrow="Small steps. Shared progress." icon="edit_note" title="Daily Work Updates"
          description="A clear record of what moved forward, what's next, and where you need a hand."
          actions={<button type="button" className={styles.primaryButton} onClick={() => handleOpenEditor()}><EmployeeIcon>{todayEntry ? "edit_note" : "add_task"}</EmployeeIcon>{todayEntry ? "Edit Today's Report" : "Submit Today's Report"}</button>} />

        <div className={styles.updateOverview}>
          <div className={styles.statusSummary}><span className={styles.iconTile}><EmployeeIcon>{todayEntry ? "task_alt" : "pending_actions"}</EmployeeIcon></span><div><p>Today's status · {today}</p><h2>{todayEntry ? "Your report is submitted." : "Your day, ready to be shared."}</h2><p>{todayEntry ? "You can return to add updates or make changes." : "Keep your team informed with a quick daily report."}</p></div></div>
          <EmployeeMetric label="Total reports" icon="description" value={workUpdates.length} />
          <EmployeeMetric label="Hours logged" icon="schedule" value={`${totalHoursLogged}h`} />
        </div>

        <EmployeeSearch value={searchTerm} onChange={setSearchTerm} label="Search work reports" placeholder="Search completed tasks, dates, or blockers…" />
        <div className={styles.sectionHeading}><h2>Your work journal</h2><span aria-live="polite">{filteredUpdates.length} {filteredUpdates.length === 1 ? "report" : "reports"}</span></div>
        {filteredUpdates.length === 0 ? <EmployeeEmpty icon="description" title={workUpdates.length === 0 ? "Make your progress visible" : "No matching reports"}
          description={workUpdates.length === 0 ? "Your daily reports will appear here. Start with what you completed today." : "Try another date, task, or blocker to find a report."}>
          {workUpdates.length === 0 ? <button type="button" className={styles.primaryButton} onClick={() => handleOpenEditor()}>Write Today's Report<EmployeeIcon>arrow_forward</EmployeeIcon></button> : <button type="button" className={styles.secondaryButton} onClick={() => setSearchTerm("")}>Clear search</button>}
        </EmployeeEmpty> : <div className={styles.reportGrid}>
          {filteredUpdates.map((update) => <article key={update.id} className={styles.report}>
            <div className={styles.reportHeading}>
              <div><h2>{new Date(`${update.date}T00:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</h2>
                <div className={styles.badgeRow}><EmployeeBadge tone="accent">{update.hoursWorked} {update.hoursWorked === 1 ? "hour" : "hours"}</EmployeeBadge>{update.date === today && <EmployeeBadge>Today</EmployeeBadge>}{update.reviewedByAdmin && <EmployeeBadge tone="approved">Reviewed</EmployeeBadge>}</div>
              </div>
              <button type="button" className={styles.textButton} onClick={() => handleOpenEditor(update.date)} aria-label={`Edit work report for ${update.date}`}><EmployeeIcon>edit</EmployeeIcon>Edit Report</button>
            </div>
            <div className={styles.reportSection}><h3>Tasks completed</h3><p>{update.tasksCompleted}</p></div>
            {(update.tasksInProgress || update.blockers) && <div className={styles.reportColumns}>
              {update.tasksInProgress && <div className={styles.note}><h4>In progress / next up</h4><p>{update.tasksInProgress}</p></div>}
              {update.blockers && <div className={styles.note} data-tone="danger"><h4><EmployeeIcon>error_outline</EmployeeIcon>Blockers / support needed</h4><p>{update.blockers}</p></div>}
            </div>}
            {update.projectLinks && <div className={styles.reportSection}><h3>Related links</h3><a className={styles.link} href={update.projectLinks.startsWith("http") ? update.projectLinks : `https://${update.projectLinks}`} target="_blank" rel="noopener noreferrer"><EmployeeIcon>open_in_new</EmployeeIcon>{update.projectLinks}</a></div>}
            {update.adminFeedback && <div className={styles.note}><h4>Administrator feedback</h4><p>{update.adminFeedback}</p></div>}
          </article>)}
        </div>}

        {showEditor && <EmployeeDialog title={workUpdates.some((update) => update.date === editDate) ? "Edit your work report" : "Write your work report"}
          description={`Your update for ${editDate}. Share the outcome, next steps, and any support you need.`} icon="edit_note" onClose={() => setShowEditor(false)} wide>
          <form onSubmit={handleSubmit} className={styles.form}>
            <label className={styles.field}>Tasks completed *
              <textarea required rows={5} value={form.tasksCompleted} onChange={(event) => setForm({ ...form, tasksCompleted: event.target.value })} placeholder={"• Fixed the authentication issue\n• Deployed the staging build\n• Tested the API endpoints"} />
            </label>
            <div className={styles.formColumns}>
              <label className={styles.field}>In progress / next up
                <input type="text" value={form.tasksInProgress} onChange={(event) => setForm({ ...form, tasksInProgress: event.target.value })} placeholder="e.g. Preparing release notes" />
              </label>
              <label className={styles.field}>Hours worked *
                <input type="number" min="0.5" max="24" step="0.5" required value={form.hoursWorked} onChange={(event) => setForm({ ...form, hoursWorked: parseFloat(event.target.value) || 0 })} />
              </label>
            </div>
            <label className={styles.field}>Blockers / support needed (optional)
              <textarea rows={3} value={form.blockers} onChange={(event) => setForm({ ...form, blockers: event.target.value })} placeholder="Any obstacles, dependencies, or pending approvals?" />
            </label>
            <label className={styles.field}>Project / PR / design link (optional)
              <input type="text" value={form.projectLinks} onChange={(event) => setForm({ ...form, projectLinks: event.target.value })} placeholder="https://github.com/…" />
            </label>
            {successMsg && <p className={styles.feedback} role="status">{successMsg}</p>}
            {saveError && <p className={styles.feedback} data-tone="danger" role="alert">{saveError}</p>}
            <div className={styles.formActions}><button type="button" className={styles.secondaryButton} onClick={() => setShowEditor(false)}>Cancel</button><button type="submit" className={styles.primaryButton} disabled={isSubmitting || !!successMsg}>{isSubmitting ? "Saving…" : "Save Daily Update"}<EmployeeIcon>check</EmployeeIcon></button></div>
          </form>
        </EmployeeDialog>}
      </div>
    </StaffLayout>
  );
}
