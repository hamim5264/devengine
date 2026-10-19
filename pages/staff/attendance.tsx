import Head from "next/head";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/router";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getStaffByUid } from "@/lib/services/staffService";
import {
  getTodayDateString,
  getStaffAttendanceForDate,
  getStaffAttendanceHistory,
  getStaffAttendanceRequests,
  clockInStaff,
  startStaffBreak,
  endStaffBreak,
  clockOutStaff,
  submitMissedAttendanceRequest,
  getYearlyAttendanceHistory,
} from "@/lib/services/staffEcoService";
import StaffLayout from "@/components/StaffLayout";
import AttendanceHeatmap from "@/components/AttendanceHeatmap";
import HelixLoader from "@/components/HelixLoader";
import CustomDatePickerField from "@/components/staff/CustomDatePickerField";
import CustomSelectField from "@/components/staff/CustomSelectField";
import styles from "@/components/staff/Attendance.module.css";
import type { StaffMember } from "@/types/staff";
import type {
  AttendanceRecord,
  AttendanceRegularizationRequest,
  BreakType,
  EcoAttachment,
} from "@/types/staffEcoSystem";
import {
  ATTENDANCE_STATUS_LABELS,
  BREAK_TYPE_LABELS,
} from "@/types/staffEcoSystem";
import AttachmentPicker from "@/components/common/AttachmentPicker";
import AttachmentList from "@/components/common/AttachmentList";

function AttendanceIcon({ children }: { children: string }) {
  return <span className="material-symbols-outlined" aria-hidden="true">{children}</span>;
}

function AttendanceDialog({ title, icon, onClose, children }: {
  title: string; icon: string; onClose: () => void; children: ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;
    };
  }, []);
  return (
    <dialog ref={dialogRef} className={styles.dialog} aria-labelledby={titleId}
      onCancel={(event) => { event.preventDefault(); onClose(); }}>
      <div className={styles.dialogHeading}>
        <div className={styles.headingGroup}>
          <span className={styles.iconTile}><AttendanceIcon>{icon}</AttendanceIcon></span>
          <h2 id={titleId}>{title}</h2>
        </div>
        <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Close dialog">
          <AttendanceIcon>close</AttendanceIcon>
        </button>
      </div>
      <div className={styles.dialogBody}>
        {children}
      </div>
    </dialog>
  );
}

function AttendanceStatus({ status, children }: { status: string; children: ReactNode }) {
  return <span className={styles.statusBadge} data-status={status}>{children}</span>;
}

export default function StaffAttendancePage() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [staffData, setStaffData] = useState<StaffMember | null>(null);

  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord | null>(null);
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([]);
  const [yearAttendance, setYearAttendance] = useState<AttendanceRecord[]>([]);
  const [missedRequests, setMissedRequests] = useState<AttendanceRegularizationRequest[]>([]);
  const [activeTab, setActiveTab] = useState<"matrix" | "history" | "requests">("matrix");

  const [isClockingIn, setIsClockingIn] = useState(false);
  const [isClockingOut, setIsClockingOut] = useState(false);
  const [isStartingBreak, setIsStartingBreak] = useState(false);
  const [isEndingBreak, setIsEndingBreak] = useState(false);

  // Break modal
  const [showBreakModal, setShowBreakModal] = useState(false);
  const [selectedBreakType, setSelectedBreakType] = useState<BreakType>("lunch");
  const [breakNote, setBreakNote] = useState("");

  // Missed Request Modal
  const [showMissedModal, setShowMissedModal] = useState(false);
  const [missedForm, setMissedForm] = useState<{
    targetDate: string;
    clockInTime: string;
    clockOutTime: string;
    reason: string;
    attachments: EcoAttachment[];
  }>({
    targetDate: "",
    clockInTime: "09:30 AM",
    clockOutTime: "06:30 PM",
    reason: "",
    attachments: [],
  });
  const [isSubmittingMissed, setIsSubmittingMissed] = useState(false);
  const [missedSuccess, setMissedSuccess] = useState("");
  const [missedError, setMissedError] = useState("");

  const loadData = async (staff: StaffMember) => {
    try {
      const today = getTodayDateString();
      const [todayRec, history, yearRecs, reqs] = await Promise.all([
        getStaffAttendanceForDate(staff.id, today),
        getStaffAttendanceHistory(staff.id, 90),
        getYearlyAttendanceHistory(staff.id),
        getStaffAttendanceRequests(staff.id),
      ]);
      setTodayAttendance(todayRec);
      setAttendanceHistory(history);
      const combinedYear = [...yearRecs];
      if (todayRec && !combinedYear.some((r) => r.date === todayRec.date)) {
        combinedYear.push(todayRec);
      } else if (todayRec) {
        const idx = combinedYear.findIndex((r) => r.date === todayRec.date);
        if (idx !== -1) combinedYear[idx] = todayRec;
      }
      setYearAttendance(combinedYear);
      setMissedRequests(reqs);
    } catch (err) {
      console.error("Error loading attendance:", err);
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
      await loadData(staff);
      setAuthReady(true);
    });
    return () => unsub();
  }, [router]);

  const handleClockIn = async () => {
    if (!staffData || isClockingIn) return;
    setIsClockingIn(true);
    try {
      const rec = await clockInStaff({
        staffId: staffData.id,
        staffUid: staffData.uid,
        staffName: staffData.name,
        staffEmail: staffData.email,
        staffType: staffData.staffType,
      });
      setTodayAttendance(rec);
      await loadData(staffData);
    } finally {
      setIsClockingIn(false);
    }
  };

  const handleStartBreak = async () => {
    if (!staffData || isStartingBreak) return;
    setIsStartingBreak(true);
    try {
      const rec = await startStaffBreak(staffData.id, selectedBreakType, breakNote);
      setTodayAttendance(rec);
      setShowBreakModal(false);
      setBreakNote("");
      await loadData(staffData);
    } finally {
      setIsStartingBreak(false);
    }
  };

  const handleEndBreak = async () => {
    if (!staffData || isEndingBreak) return;
    setIsEndingBreak(true);
    try {
      const rec = await endStaffBreak(staffData.id);
      setTodayAttendance(rec);
      await loadData(staffData);
    } finally {
      setIsEndingBreak(false);
    }
  };

  const handleClockOut = async () => {
    if (!staffData || isClockingOut) return;
    setIsClockingOut(true);
    try {
      const rec = await clockOutStaff(staffData.id);
      if (rec) {
        setTodayAttendance(rec);
        await loadData(staffData);
      }
    } finally {
      setIsClockingOut(false);
    }
  };

  const handleSubmitMissed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffData || !missedForm.targetDate || !missedForm.reason.trim()) return;
    setIsSubmittingMissed(true);
    setMissedError("");
    setMissedSuccess("");
    try {
      const req = await submitMissedAttendanceRequest({
        staffId: staffData.id,
        staffUid: staffData.uid,
        staffName: staffData.name,
        staffEmail: staffData.email,
        staffType: staffData.staffType,
        targetDate: missedForm.targetDate,
        clockInTime: missedForm.clockInTime,
        clockOutTime: missedForm.clockOutTime,
        reason: missedForm.reason,
        attachments: missedForm.attachments,
      });
      setMissedRequests((prev) => [req, ...prev]);
      setMissedSuccess("Regularization request submitted to admin for approval.");
      setTimeout(() => {
        setShowMissedModal(false);
        setMissedSuccess("");
        setMissedForm({
          targetDate: "",
          clockInTime: "09:30 AM",
          clockOutTime: "06:30 PM",
          reason: "",
          attachments: [],
        });
      }, 1500);
    } catch (err: any) {
      setMissedError(err?.message || "Failed to submit request");
    } finally {
      setIsSubmittingMissed(false);
    }
  };

  if (!authReady || !staffData) {
    return (
      <div className={styles.loading}>
        <HelixLoader size={44} color="#2cecf7" />
      </div>
    );
  }

  const isCheckedIn = !!todayAttendance && !todayAttendance.clockOutTime;
  const isOnBreak = !!todayAttendance?.currentBreak;
  const isShiftConcluded = !!todayAttendance?.clockOutTime;
  const today = getTodayDateString();
  const yesterday = new Date(`${today}T12:00:00`);
  yesterday.setDate(yesterday.getDate() - 1);
  const latestMissedDate = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;

  return (
    <StaffLayout title="Attendance & Heatmap | DevEngine Portal">
      <Head><title>Attendance & Heatmap | DevEngine Portal</title></Head>
      <div className={styles.page}>
        <div className={styles.pageHeading}>
          <div>
            <p className={styles.eyebrow}>Your working rhythm</p>
            <div className={styles.headingGroup}>
              <span className={styles.iconTile}><AttendanceIcon>calendar_month</AttendanceIcon></span>
              <h1>Attendance, Breaks & Shifts</h1>
            </div>
            <p className={styles.description}>Your time, at a glance. Track shifts, review breaks, and keep every punch up to date.</p>
          </div>
          <button type="button" onClick={() => setShowMissedModal(true)} className={styles.secondaryButton}>
            <AttendanceIcon>history_toggle_off</AttendanceIcon>Regularize Missed Punch
          </button>
        </div>

        <section className={styles.punchCard} aria-label="Today's punch status">
          <div className={styles.punchSummary}>
            <span className={styles.punchIcon}><AttendanceIcon>{isOnBreak ? "coffee" : isShiftConcluded ? "task_alt" : "schedule"}</AttendanceIcon></span>
            <div className={styles.punchCopy}>
              <p className={styles.eyebrow}>Today's punch · {today}</p>
              <h2>{isOnBreak ? "A little time to recharge." : isShiftConcluded ? "Your shift is complete." : isCheckedIn ? "You're on the clock." : "Ready when you are."}</h2>
              <div className={styles.punchDetails} aria-live="polite">
                {todayAttendance ? <>
                  <span><i className={styles.statusDot} />In: {todayAttendance.clockInTime}</span>
                  {todayAttendance.clockOutTime && <span>Out: {todayAttendance.clockOutTime}</span>}
                  {!!todayAttendance.totalBreakMinutes && <span>{todayAttendance.totalBreakMinutes} min of breaks</span>}
                </> : <span>Not clocked in today</span>}
              </div>
            </div>
          </div>
          <div className={styles.actions}>
            {!todayAttendance ? (
              <button type="button" onClick={handleClockIn} disabled={isClockingIn} className={styles.primaryButton}>
                <AttendanceIcon>login</AttendanceIcon>{isClockingIn ? "Clocking In…" : "Clock In"}
              </button>
            ) : isCheckedIn && !isOnBreak ? <>
              <button type="button" onClick={() => setShowBreakModal(true)} className={styles.secondaryButton}>
                <AttendanceIcon>coffee</AttendanceIcon>Take Break
              </button>
              <button type="button" onClick={handleClockOut} disabled={isClockingOut} className={styles.primaryButton}>
                <AttendanceIcon>logout</AttendanceIcon>{isClockingOut ? "Concluding…" : "Clock Out"}
              </button>
            </> : isOnBreak ? (
              <button type="button" onClick={handleEndBreak} disabled={isEndingBreak} className={styles.primaryButton}>
                <AttendanceIcon>play_arrow</AttendanceIcon>{isEndingBreak ? "Resuming…" : "Resume Work"}
              </button>
            ) : isShiftConcluded ? (
              <span className={styles.shiftComplete}><AttendanceIcon>task_alt</AttendanceIcon>Shift concluded · {todayAttendance.netWorkHours ?? todayAttendance.totalHours ?? 0} hrs</span>
            ) : null}
          </div>
        </section>

        <div className={styles.tabs} role="group" aria-label="Attendance views">
          {([
            { value: "matrix", label: "Attendance overview", icon: "calendar_view_month" },
            { value: "history", label: "Logs & breaks", icon: "format_list_bulleted", count: attendanceHistory.length },
            { value: "requests", label: "Missed punch requests", icon: "history", count: missedRequests.length },
          ] as const).map((tab) => (
            <button key={tab.value} type="button" aria-pressed={activeTab === tab.value}
              className={styles.tab} onClick={() => setActiveTab(tab.value)}>
              <AttendanceIcon>{tab.icon}</AttendanceIcon><span>{tab.label}</span>
              {"count" in tab && <span className={styles.tabCount}>{tab.count}</span>}
            </button>
          ))}
        </div>

        <div key={activeTab} className={styles.tabContent}>
          {activeTab === "matrix" && (
            <AttendanceHeatmap records={yearAttendance} variant="employee" className={styles.matrix}
              assignedOffDays={staffData.assignedOffDays || ["Friday", "Saturday"]} />
          )}
          {activeTab === "history" && (
            <section className={styles.recordsPanel} aria-labelledby="attendance-log-heading">
              <div className={styles.sectionHeading}>
                <div><p className={styles.eyebrow}>Shift history</p><h2 id="attendance-log-heading">Attendance logs & breaks</h2></div>
                <span className={styles.recordCount}>{attendanceHistory.length} records</span>
              </div>
              {attendanceHistory.length === 0 ? (
                <div className={styles.emptyState}><AttendanceIcon>event_note</AttendanceIcon><h3>Your attendance starts here</h3><p>Clock in to start building your shift history.</p></div>
              ) : (
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead><tr><th>Date</th><th>Status</th><th>Clock in</th><th>Clock out</th><th>Breaks taken</th><th>Net work hours</th><th>Notes</th></tr></thead>
                    <tbody>{attendanceHistory.map((rec) => (
                      <tr key={rec.id}>
                        <td data-label="Date" className={styles.dateCell}>{rec.date}</td>
                        <td data-label="Status"><AttendanceStatus status={rec.status}>{ATTENDANCE_STATUS_LABELS[rec.status] || rec.status}</AttendanceStatus></td>
                        <td data-label="Clock in">{rec.clockInTime || "—"}</td>
                        <td data-label="Clock out">{rec.clockOutTime || "—"}</td>
                        <td data-label="Breaks taken">{rec.totalBreakMinutes ? `${rec.totalBreakMinutes} mins (${rec.breaks?.length || 1} breaks)` : "0 mins"}</td>
                        <td data-label="Net work hours" className={styles.hoursCell}>{rec.netWorkHours != null ? `${rec.netWorkHours} hrs` : rec.totalHours != null ? `${rec.totalHours} hrs` : "—"}</td>
                        <td data-label="Notes" className={styles.notesCell}>{rec.note || "—"}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </section>
          )}
          {activeTab === "requests" && (
            <section className={styles.recordsPanel} aria-labelledby="attendance-requests-heading">
              <div className={styles.sectionHeading}>
                <div><p className={styles.eyebrow}>Keep your record complete</p><h2 id="attendance-requests-heading">Missed punch requests</h2></div>
                <span className={styles.recordCount}>{missedRequests.length} requests</span>
              </div>
              {missedRequests.length === 0 ? (
                <div className={styles.emptyState}><AttendanceIcon>history_toggle_off</AttendanceIcon><h3>No missed punch requests</h3><p>Forgot a punch? Submit the date and hours for admin review.</p><button type="button" className={styles.secondaryButton} onClick={() => setShowMissedModal(true)}>Create a request<AttendanceIcon>arrow_forward</AttendanceIcon></button></div>
              ) : (
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead><tr><th>Target date</th><th>Claimed hours</th><th>Reason</th><th>Status</th><th>Admin remark</th><th>Submitted</th></tr></thead>
                    <tbody>{missedRequests.map((req) => (
                      <tr key={req.id}>
                        <td data-label="Target date" className={styles.dateCell}>{req.targetDate}</td>
                        <td data-label="Claimed hours">{req.clockInTime} – {req.clockOutTime || "N/A"}</td>
                        <td data-label="Reason" className={styles.notesCell}>
                          <div>{req.reason}</div>
                          {req.attachments && req.attachments.length > 0 && (
                            <div style={{ marginTop: 5 }}>
                              <AttachmentList attachments={req.attachments} />
                            </div>
                          )}
                        </td>
                        <td data-label="Status"><AttendanceStatus status={req.status}>{req.status}</AttendanceStatus></td>
                        <td data-label="Admin remark" className={styles.notesCell}>{req.adminRemark || "—"}</td>
                        <td data-label="Submitted">{req.createdAt ? new Date(req.createdAt).toLocaleDateString() : "—"}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </section>
          )}
        </div>

        {showBreakModal && (
          <AttendanceDialog title="Start a work break" icon="coffee" onClose={() => setShowBreakModal(false)}>
            <p className={styles.dialogDescription}>Choose your break type. You can resume work when you're ready.</p>
            <div className={styles.form}>
              <CustomSelectField<BreakType> label="Break type" value={selectedBreakType} onChange={setSelectedBreakType}
                className={styles.customField}
                options={(["lunch", "tea", "meeting", "personal"] as BreakType[]).map((value) => ({
                  value, label: BREAK_TYPE_LABELS[value], description: value === "lunch" ? "Up to 60 minutes" : "Up to 20 minutes",
                }))} />
              <label className={styles.field}>Optional note
                <input type="text" value={breakNote} onChange={(event) => setBreakNote(event.target.value)} placeholder="Anything you'd like to add?" />
              </label>
              <div className={styles.formActions}>
                <button type="button" className={styles.secondaryButton} onClick={() => setShowBreakModal(false)}>Cancel</button>
                <button type="button" onClick={handleStartBreak} disabled={isStartingBreak} className={styles.primaryButton}>{isStartingBreak ? "Starting…" : "Start Break"}<AttendanceIcon>coffee</AttendanceIcon></button>
              </div>
            </div>
          </AttendanceDialog>
        )}
        {showMissedModal && (
          <AttendanceDialog title="Regularize missed punch" icon="history_toggle_off" onClose={() => setShowMissedModal(false)}>
            <p className={styles.dialogDescription}>Add your missed date and working hours. Your admin will review the request.</p>
            <form onSubmit={handleSubmitMissed} className={styles.form}>
              <CustomDatePickerField label="Missed date (past dates only)" required value={missedForm.targetDate}
                maxDate={latestMissedDate} align="left" className={styles.customField}
                onChange={(targetDate) => setMissedForm((form) => ({ ...form, targetDate }))} />
              <div className={styles.formColumns}>
                <label className={styles.field}>Clock in time
                  <input type="text" required value={missedForm.clockInTime} onChange={(event) => setMissedForm({ ...missedForm, clockInTime: event.target.value })} placeholder="09:30 AM" />
                </label>
                <label className={styles.field}>Clock out time
                  <input type="text" value={missedForm.clockOutTime} onChange={(event) => setMissedForm({ ...missedForm, clockOutTime: event.target.value })} placeholder="06:30 PM" />
                </label>
              </div>
              <p className={styles.fieldHint}>Use a time such as 09:30 AM or 06:30 PM.</p>
              <label className={styles.field}>Reason for the missed punch
                <textarea required rows={4} value={missedForm.reason} onChange={(event) => setMissedForm({ ...missedForm, reason: event.target.value })} placeholder="Tell us what happened on this day…" />
              </label>
              <AttachmentPicker
                label="Supporting documents (Optional)"
                hint="Max 5 files · up to 10 MB each"
                folder="attendance_attachments"
                prefix={staffData?.id}
                value={missedForm.attachments}
                onChange={(attachments) => setMissedForm((form) => ({ ...form, attachments }))}
              />
              {!missedForm.targetDate && <p className={styles.fieldHint}>Select a past date to submit your request.</p>}
              {missedSuccess && <p className={styles.successMessage} role="status">{missedSuccess}</p>}
              {missedError && <p className={styles.errorMessage} role="alert">{missedError}</p>}
              <div className={styles.formActions}>
                <button type="button" className={styles.secondaryButton} onClick={() => setShowMissedModal(false)}>Cancel</button>
                <button type="submit" disabled={isSubmittingMissed || !missedForm.targetDate} className={styles.primaryButton}>{isSubmittingMissed ? "Submitting…" : "Submit Request"}<AttendanceIcon>arrow_forward</AttendanceIcon></button>
              </div>
            </form>
          </AttendanceDialog>
        )}
      </div>
    </StaffLayout>
  );
}
