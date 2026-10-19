import Head from "next/head";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getStaffByUid } from "@/lib/services/staffService";
import {
  getStaffLeaveRequests,
  submitLeaveRequest,
  getStaffOffDaySwapRequests,
  submitOffDaySwapRequest,
} from "@/lib/services/staffEcoService";
import StaffLayout from "@/components/StaffLayout";
import CustomDatePickerField from "@/components/staff/CustomDatePickerField";
import CustomSelectField from "@/components/staff/CustomSelectField";
import { EmployeeHeading, EmployeeIcon, EmployeeBadge, EmployeeEmpty, EmployeeLoading, EmployeeDialog } from "@/components/staff/EmployeeUI";
import styles from "@/components/staff/EmployeeExperience.module.css";
import type { StaffMember } from "@/types/staff";
import type {
  LeaveRequest,
  LeaveType,
  OffDaySwapRequest,
  EcoAttachment,
} from "@/types/staffEcoSystem";
import { LEAVE_TYPE_LABELS } from "@/types/staffEcoSystem";
import AttachmentPicker from "@/components/common/AttachmentPicker";
import AttachmentList from "@/components/common/AttachmentList";

export default function StaffLeavesPage() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [staffData, setStaffData] = useState<StaffMember | null>(null);

  const [activeTab, setActiveTab] = useState<"leaves" | "swaps">("leaves");
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [swaps, setSwaps] = useState<OffDaySwapRequest[]>([]);

  // Apply Leave Modal
  const [showApplyLeaveModal, setShowApplyLeaveModal] = useState(false);
  const [leaveForm, setLeaveForm] = useState<{
    leaveType: LeaveType;
    startDate: string;
    endDate: string;
    reason: string;
    emergencyContact: string;
    attachments: EcoAttachment[];
  }>({
    leaveType: "casual",
    startDate: "",
    endDate: "",
    reason: "",
    emergencyContact: "",
    attachments: [],
  });
  const [isSubmittingLeave, setIsSubmittingLeave] = useState(false);
  const [leaveSuccessMsg, setLeaveSuccessMsg] = useState("");
  const [leaveError, setLeaveError] = useState("");

  // Off-Day Swap Modal
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [swapForm, setSwapForm] = useState({
    currentOffDate: "",
    requestedWorkDate: "",
    reason: "",
  });
  const [isSubmittingSwap, setIsSubmittingSwap] = useState(false);
  const [swapSuccessMsg, setSwapSuccessMsg] = useState("");
  const [swapError, setSwapError] = useState("");

  const loadData = async (staff: StaffMember) => {
    try {
      const [leavesData, swapsData] = await Promise.all([
        getStaffLeaveRequests(staff.id),
        getStaffOffDaySwapRequests(staff.id),
      ]);
      setLeaves(leavesData);
      setSwaps(swapsData);
    } catch (err) {
      console.error("Error loading leave & swap data:", err);
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

  const handleSubmitLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffData || !leaveForm.startDate || !leaveForm.endDate || !leaveForm.reason.trim()) return;
    setIsSubmittingLeave(true);
    setLeaveError("");
    setLeaveSuccessMsg("");
    try {
      const created = await submitLeaveRequest({
        staffId: staffData.id,
        staffUid: staffData.uid,
        staffName: staffData.name,
        staffEmail: staffData.email,
        staffType: staffData.staffType,
        leaveType: leaveForm.leaveType,
        startDate: leaveForm.startDate,
        endDate: leaveForm.endDate,
        reason: leaveForm.reason,
        emergencyContact: leaveForm.emergencyContact,
        attachments: leaveForm.attachments,
      });

      setLeaves((prev) => [created, ...prev]);
      setLeaveSuccessMsg("Leave application submitted for approval!");
      setTimeout(() => {
        setShowApplyLeaveModal(false);
        setLeaveSuccessMsg("");
        setLeaveForm({
          leaveType: "casual",
          startDate: "",
          endDate: "",
          reason: "",
          emergencyContact: "",
          attachments: [],
        });
      }, 1200);
    } catch (err) {
      console.error("Submit leave failed:", err);
      setLeaveError(err instanceof Error ? err.message : "Could not submit your leave request. Please try again.");
    } finally {
      setIsSubmittingLeave(false);
    }
  };

  const handleSubmitSwap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffData || !swapForm.currentOffDate || !swapForm.requestedWorkDate || !swapForm.reason.trim()) return;
    setIsSubmittingSwap(true);
    setSwapError("");
    setSwapSuccessMsg("");
    try {
      const created = await submitOffDaySwapRequest({
        staffId: staffData.id,
        staffUid: staffData.uid,
        staffName: staffData.name,
        staffEmail: staffData.email,
        staffType: staffData.staffType,
        currentOffDate: swapForm.currentOffDate,
        requestedWorkDate: swapForm.requestedWorkDate,
        reason: swapForm.reason,
      });
      setSwaps((prev) => [created, ...prev]);
      setSwapSuccessMsg("Off-day swap request submitted for approval!");
      setTimeout(() => {
        setShowSwapModal(false);
        setSwapSuccessMsg("");
        setSwapForm({ currentOffDate: "", requestedWorkDate: "", reason: "" });
      }, 1200);
    } catch (err) {
      console.error("Submit swap failed:", err);
      setSwapError(err instanceof Error ? err.message : "Could not submit your swap request. Please try again.");
    } finally {
      setIsSubmittingSwap(false);
    }
  };

  if (!authReady || !staffData) return <EmployeeLoading />;

  const pendingLeaves = leaves.filter((leave) => leave.status === "pending").length;
  const pendingSwaps = swaps.filter((swap) => swap.status === "pending").length;

  return (
    <StaffLayout title="Leaves & Off-Day Swaps | DevEngine Portal">
      <Head><title>Leaves & Off-Day Swaps | DevEngine Portal</title></Head>
      <div className={styles.page}>
        <EmployeeHeading eyebrow="Make room for life" icon="beach_access" title="Leaves & Off-Day Swaps"
          description="Plan your time away, adjust your schedule, and follow every request through to a decision."
          actions={<><button type="button" className={styles.secondaryButton} onClick={() => { setSwapError(""); setShowSwapModal(true); }}><EmployeeIcon>swap_horiz</EmployeeIcon>Swap Off-Day</button><button type="button" className={styles.primaryButton} onClick={() => { setLeaveError(""); setShowApplyLeaveModal(true); }}><EmployeeIcon>add</EmployeeIcon>Apply for Leave</button></>} />

        <div className={styles.schedule}>
          <div><p><EmployeeIcon>calendar_today</EmployeeIcon>Assigned off-days</p><strong>{(staffData.assignedOffDays || ["Friday", "Saturday"]).join(", ")}</strong></div>
          <div><p><EmployeeIcon>schedule</EmployeeIcon>Your shift</p><strong>{staffData.shiftHours ? `${staffData.shiftHours.start} – ${staffData.shiftHours.end}` : "09:00 AM – 06:00 PM"}</strong></div>
          <div><p><EmployeeIcon>pending_actions</EmployeeIcon>Awaiting review</p><strong>{pendingLeaves} leave {pendingLeaves === 1 ? "request" : "requests"} · {pendingSwaps} {pendingSwaps === 1 ? "swap" : "swaps"}</strong></div>
        </div>

        <div className={styles.tabs} role="group" aria-label="Request type">
          <button type="button" className={styles.tab} aria-pressed={activeTab === "leaves"} onClick={() => setActiveTab("leaves")}>Leave applications<span>{leaves.length}</span></button>
          <button type="button" className={styles.tab} aria-pressed={activeTab === "swaps"} onClick={() => setActiveTab("swaps")}>Off-day swaps<span>{swaps.length}</span></button>
        </div>

        {activeTab === "leaves" && (leaves.length === 0 ? <EmployeeEmpty icon="event_available" title="Your time-off plans start here" description="Once you apply for leave, your dates, approval status, and admin remarks will appear here."><button type="button" className={styles.primaryButton} onClick={() => setShowApplyLeaveModal(true)}><EmployeeIcon>add</EmployeeIcon>Apply for Leave</button></EmployeeEmpty>
          : <section className={styles.tablePanel} aria-labelledby="leave-applications-heading">
            <div className={styles.sectionHeading}><div><h2 id="leave-applications-heading">Your leave applications</h2><p>Dates, decisions, and everything in between.</p></div><EmployeeBadge tone="pending">{pendingLeaves} pending</EmployeeBadge></div>
            <div className={styles.tableWrap}><table className={styles.table}>
              <thead><tr><th>Leave type</th><th>Duration</th><th>Days</th><th>Reason</th><th>Status</th><th>Admin remark</th><th>Applied</th></tr></thead>
              <tbody>{leaves.map((leave) => <tr key={leave.id}>
                <td data-label="Leave type">{LEAVE_TYPE_LABELS[leave.leaveType] || leave.leaveType}</td>
                <td data-label="Duration"><div className={styles.dateRange}>{leave.startDate}<span>→</span>{leave.endDate}</div></td>
                <td data-label="Days">{leave.totalDays} {leave.totalDays === 1 ? "day" : "days"}</td>
                <td data-label="Reason" className={styles.longCell}>
                  <div>{leave.reason}</div>
                  {leave.attachments && leave.attachments.length > 0 && (
                    <div style={{ marginTop: 6 }}>
                      <AttachmentList attachments={leave.attachments} />
                    </div>
                  )}
                </td>
                <td data-label="Status"><EmployeeBadge tone={leave.status}>{leave.status}</EmployeeBadge></td>
                <td data-label="Admin remark" className={styles.longCell}>{leave.adminRemark || "—"}</td>
                <td data-label="Applied">{leave.createdAt ? new Date(leave.createdAt).toLocaleDateString() : "—"}</td>
              </tr>)}</tbody>
            </table></div>
          </section>)}
        {activeTab === "swaps" && (swaps.length === 0 ? <EmployeeEmpty icon="swap_horiz" title="A schedule that works for you" description="Need to move an off-day? Submit a swap request and follow its approval here."><button type="button" className={styles.secondaryButton} onClick={() => setShowSwapModal(true)}><EmployeeIcon>swap_horiz</EmployeeIcon>Request a Swap</button></EmployeeEmpty>
          : <section className={styles.tablePanel} aria-labelledby="swap-requests-heading">
            <div className={styles.sectionHeading}><div><h2 id="swap-requests-heading">Your off-day swaps</h2><p>Keep track of the days you're exchanging.</p></div><EmployeeBadge tone="pending">{pendingSwaps} pending</EmployeeBadge></div>
            <div className={styles.tableWrap}><table className={styles.table}>
              <thead><tr><th>Off-day to work</th><th>Requested day off</th><th>Reason</th><th>Status</th><th>Admin remark</th><th>Submitted</th></tr></thead>
              <tbody>{swaps.map((swap) => <tr key={swap.id}>
                <td data-label="Off-day to work">{swap.currentOffDate}</td><td data-label="Requested day off">{swap.requestedWorkDate}</td>
                <td data-label="Reason" className={styles.longCell}>{swap.reason}</td>
                <td data-label="Status"><EmployeeBadge tone={swap.status}>{swap.status}</EmployeeBadge></td>
                <td data-label="Admin remark" className={styles.longCell}>{swap.adminRemark || "—"}</td>
                <td data-label="Submitted">{swap.createdAt ? new Date(swap.createdAt).toLocaleDateString() : "—"}</td>
              </tr>)}</tbody>
            </table></div>
          </section>)}

        {showApplyLeaveModal && <EmployeeDialog title="Apply for leave" description="Choose your leave type and dates. Your request will go to the admin for approval." icon="beach_access" onClose={() => setShowApplyLeaveModal(false)}>
          <form className={styles.form} onSubmit={handleSubmitLeave}>
            <CustomSelectField<LeaveType> label="Leave type" className={styles.customField} value={leaveForm.leaveType}
              onChange={(leaveType) => setLeaveForm({ ...leaveForm, leaveType })}
              options={(Object.keys(LEAVE_TYPE_LABELS) as LeaveType[]).map((value) => ({ value, label: LEAVE_TYPE_LABELS[value] }))} />
            <div className={styles.formColumns}>
              <CustomDatePickerField label="Start date" className={styles.customField} align="left" required value={leaveForm.startDate}
                onChange={(startDate) => setLeaveForm({ ...leaveForm, startDate, endDate: leaveForm.endDate && leaveForm.endDate < startDate ? "" : leaveForm.endDate })} />
              <CustomDatePickerField label="End date" className={styles.customField} align="right" required value={leaveForm.endDate} minDate={leaveForm.startDate || undefined}
                onChange={(endDate) => setLeaveForm({ ...leaveForm, endDate })} />
            </div>
            <label className={styles.field}>Reason for leave
              <textarea required rows={4} value={leaveForm.reason} onChange={(event) => setLeaveForm({ ...leaveForm, reason: event.target.value })} placeholder="Tell us why you need this time away…" />
            </label>
            <label className={styles.field}>Emergency contact (optional)
              <input type="text" value={leaveForm.emergencyContact} onChange={(event) => setLeaveForm({ ...leaveForm, emergencyContact: event.target.value })} placeholder="Phone number or alternative contact" />
            </label>
            <AttachmentPicker
              label="Supporting documents (Optional)"
              hint="Max 5 files · up to 10 MB each"
              folder="leave_attachments"
              prefix={staffData?.id}
              value={leaveForm.attachments}
              onChange={(attachments) => setLeaveForm({ ...leaveForm, attachments })}
            />
            {leaveSuccessMsg && <p className={styles.feedback} role="status">{leaveSuccessMsg}</p>}
            {leaveError && <p className={styles.feedback} data-tone="danger" role="alert">{leaveError}</p>}
            <div className={styles.formActions}><button type="button" className={styles.secondaryButton} onClick={() => setShowApplyLeaveModal(false)}>Cancel</button><button type="submit" className={styles.primaryButton} disabled={isSubmittingLeave || !!leaveSuccessMsg || !leaveForm.startDate || !leaveForm.endDate}>{isSubmittingLeave ? "Submitting…" : "Submit Leave Request"}<EmployeeIcon>arrow_forward</EmployeeIcon></button></div>
          </form>
        </EmployeeDialog>}
        {showSwapModal && <EmployeeDialog title="Request an off-day swap" description="Select the off-day you will work, then the day you would like to take off instead." icon="swap_horiz" onClose={() => setShowSwapModal(false)}>
          <form className={styles.form} onSubmit={handleSubmitSwap}>
            <CustomDatePickerField label="Scheduled off-day (you will work)" required align="left" className={styles.customField} value={swapForm.currentOffDate} onChange={(currentOffDate) => setSwapForm({ ...swapForm, currentOffDate })} />
            <CustomDatePickerField label="Requested day off" required align="left" className={styles.customField} value={swapForm.requestedWorkDate} onChange={(requestedWorkDate) => setSwapForm({ ...swapForm, requestedWorkDate })} />
            <label className={styles.field}>Reason for the swap
              <textarea required rows={4} value={swapForm.reason} onChange={(event) => setSwapForm({ ...swapForm, reason: event.target.value })} placeholder="What would you like to adjust, and why?" />
            </label>
            {swapSuccessMsg && <p className={styles.feedback} role="status">{swapSuccessMsg}</p>}
            {swapError && <p className={styles.feedback} data-tone="danger" role="alert">{swapError}</p>}
            <div className={styles.formActions}><button type="button" className={styles.secondaryButton} onClick={() => setShowSwapModal(false)}>Cancel</button><button type="submit" className={styles.primaryButton} disabled={isSubmittingSwap || !!swapSuccessMsg || !swapForm.currentOffDate || !swapForm.requestedWorkDate}>{isSubmittingSwap ? "Submitting…" : "Submit Swap Request"}<EmployeeIcon>arrow_forward</EmployeeIcon></button></div>
          </form>
        </EmployeeDialog>}
      </div>
    </StaffLayout>
  );
}
