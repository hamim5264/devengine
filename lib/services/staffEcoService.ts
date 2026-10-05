// lib/services/staffEcoService.ts
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type {
  AttendanceRecord,
  AttendanceRegularizationRequest,
  DailyWorkUpdate,
  LeaveRequest,
  RequestStatus,
  AttendanceStatus,
} from "@/types/staffEcoSystem";

const ATTENDANCE_COLLECTION = "staff_attendance";
const ATTENDANCE_REQ_COLLECTION = "staff_attendance_requests";
const WORK_UPDATES_COLLECTION = "staff_work_updates";
const LEAVES_COLLECTION = "staff_leave_requests";

// Helper: Get local date string YYYY-MM-DD
export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatTimeString(date: Date = new Date()): string {
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

// ─────────────────────────────────────────────────────────────
// 1. ATTENDANCE OPERATIONS
// ─────────────────────────────────────────────────────────────

/**
 * Clock in staff for today.
 * Prevents clocking in for past or future dates directly.
 */
export async function clockInStaff(params: {
  staffId: string;
  staffUid: string;
  staffName: string;
  staffEmail: string;
  staffType: string;
  status?: AttendanceStatus;
  note?: string;
}): Promise<AttendanceRecord> {
  const today = getTodayDateString();
  const docId = `att_${params.staffId}_${today}`;
  const nowIso = new Date().toISOString();
  const timeStr = formatTimeString();

  const ref = doc(db, ATTENDANCE_COLLECTION, docId);
  const existing = await getDoc(ref);

  if (existing.exists()) {
    const data = existing.data() as AttendanceRecord;
    // Already clocked in, return existing
    return data;
  }

  const record: AttendanceRecord = {
    id: docId,
    staffId: params.staffId,
    staffUid: params.staffUid,
    staffName: params.staffName,
    staffEmail: params.staffEmail,
    staffType: params.staffType,
    date: today,
    clockInTime: timeStr,
    clockInTimestamp: nowIso,
    status: params.status || "present",
    note: params.note || "",
    isRegularized: false,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  await setDoc(ref, record);
  return record;
}

/**
 * Clock out staff for today
 */
export async function clockOutStaff(
  staffId: string,
  note?: string
): Promise<AttendanceRecord | null> {
  const today = getTodayDateString();
  const docId = `att_${staffId}_${today}`;
  const nowIso = new Date().toISOString();
  const timeStr = formatTimeString();

  const ref = doc(db, ATTENDANCE_COLLECTION, docId);
  const existing = await getDoc(ref);
  if (!existing.exists()) return null;

  const current = existing.data() as AttendanceRecord;
  const updates: Partial<AttendanceRecord> = {
    clockOutTime: timeStr,
    updatedAt: nowIso,
  };
  if (note) updates.note = note;

  await updateDoc(ref, updates);
  return { ...current, ...updates };
}

/**
 * Get staff attendance record for a specific date
 */
export async function getStaffAttendanceForDate(
  staffId: string,
  date: string = getTodayDateString()
): Promise<AttendanceRecord | null> {
  try {
    const docId = `att_${staffId}_${date}`;
    const snap = await getDoc(doc(db, ATTENDANCE_COLLECTION, docId));
    if (!snap.exists()) return null;
    return snap.data() as AttendanceRecord;
  } catch {
    return null;
  }
}

/**
 * Fetch staff attendance history (recent 60 days)
 */
export async function getStaffAttendanceHistory(
  staffId: string,
  maxRecords: number = 60
): Promise<AttendanceRecord[]> {
  try {
    const colRef = collection(db, ATTENDANCE_COLLECTION);
    const q = query(
      colRef,
      where("staffId", "==", staffId),
      orderBy("date", "desc"),
      limit(maxRecords)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as AttendanceRecord);
  } catch (err) {
    console.error("[staffEcoService] getStaffAttendanceHistory err:", err);
    return [];
  }
}

/**
 * Admin: Get all attendance records for a specific date
 */
export async function getAllAttendanceForDate(
  date: string = getTodayDateString()
): Promise<AttendanceRecord[]> {
  try {
    const colRef = collection(db, ATTENDANCE_COLLECTION);
    const q = query(colRef, where("date", "==", date));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as AttendanceRecord);
  } catch (err) {
    console.error("[staffEcoService] getAllAttendanceForDate err:", err);
    return [];
  }
}

/**
 * Admin: Manually upsert attendance for any staff member
 */
export async function adminUpsertAttendance(
  record: Omit<AttendanceRecord, "createdAt" | "updatedAt" | "id"> & {
    id?: string;
  }
): Promise<void> {
  const docId = record.id || `att_${record.staffId}_${record.date}`;
  const nowIso = new Date().toISOString();
  const docRef = doc(db, ATTENDANCE_COLLECTION, docId);
  const snap = await getDoc(docRef);

  if (snap.exists()) {
    await updateDoc(docRef, {
      ...record,
      updatedAt: nowIso,
    });
  } else {
    await setDoc(docRef, {
      ...record,
      id: docId,
      createdAt: nowIso,
      updatedAt: nowIso,
    });
  }
}

// ─────────────────────────────────────────────────────────────
// 2. MISSED ATTENDANCE REGULARIZATION REQUESTS
// ─────────────────────────────────────────────────────────────

/**
 * Staff submits a missed attendance request for a PAST date.
 * Enforces targetDate < today.
 */
export async function submitMissedAttendanceRequest(params: {
  staffId: string;
  staffUid: string;
  staffName: string;
  staffEmail: string;
  staffType: string;
  targetDate: string; // YYYY-MM-DD
  clockInTime: string;
  clockOutTime?: string;
  reason: string;
}): Promise<AttendanceRegularizationRequest> {
  const today = getTodayDateString();
  if (params.targetDate >= today) {
    throw new Error(
      "Missed attendance requests are only for past dates. Use today's Clock-in instead."
    );
  }

  const reqId = `att_req_${params.staffId}_${params.targetDate}_${Date.now()}`;
  const nowIso = new Date().toISOString();

  const reqData: AttendanceRegularizationRequest = {
    id: reqId,
    staffId: params.staffId,
    staffUid: params.staffUid,
    staffName: params.staffName,
    staffEmail: params.staffEmail,
    staffType: params.staffType,
    targetDate: params.targetDate,
    clockInTime: params.clockInTime,
    clockOutTime: params.clockOutTime || "",
    reason: params.reason,
    status: "pending",
    createdAt: nowIso,
  };

  await setDoc(doc(db, ATTENDANCE_REQ_COLLECTION, reqId), reqData);
  return reqData;
}

/**
 * Get staff's attendance regularization requests
 */
export async function getStaffAttendanceRequests(
  staffId: string
): Promise<AttendanceRegularizationRequest[]> {
  try {
    const colRef = collection(db, ATTENDANCE_REQ_COLLECTION);
    const q = query(
      colRef,
      where("staffId", "==", staffId),
      orderBy("createdAt", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as AttendanceRegularizationRequest);
  } catch (err) {
    console.error("[staffEcoService] getStaffAttendanceRequests err:", err);
    return [];
  }
}

/**
 * Admin: Get all attendance regularization requests
 */
export async function getAllAttendanceRequests(
  statusFilter?: RequestStatus
): Promise<AttendanceRegularizationRequest[]> {
  try {
    const colRef = collection(db, ATTENDANCE_REQ_COLLECTION);
    let q = query(colRef, orderBy("createdAt", "desc"));
    if (statusFilter) {
      q = query(
        colRef,
        where("status", "==", statusFilter),
        orderBy("createdAt", "desc")
      );
    }
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as AttendanceRegularizationRequest);
  } catch (err) {
    console.error("[staffEcoService] getAllAttendanceRequests err:", err);
    return [];
  }
}

/**
 * Admin: Review attendance regularization request (Approve / Reject)
 * If approved, automatically creates the attendance record for the missed date!
 */
export async function reviewAttendanceRequest(params: {
  requestId: string;
  decision: "approved" | "rejected";
  adminRemark?: string;
  adminEmail: string;
}): Promise<void> {
  const reqRef = doc(db, ATTENDANCE_REQ_COLLECTION, params.requestId);
  const snap = await getDoc(reqRef);
  if (!snap.exists()) throw new Error("Request not found");

  const req = snap.data() as AttendanceRegularizationRequest;
  const nowIso = new Date().toISOString();

  await updateDoc(reqRef, {
    status: params.decision,
    adminRemark: params.adminRemark || "",
    reviewedBy: params.adminEmail,
    reviewedAt: nowIso,
  });

  // If approved, create official attendance record for that missed date
  if (params.decision === "approved") {
    const docId = `att_${req.staffId}_${req.targetDate}`;
    const attendanceDoc: AttendanceRecord = {
      id: docId,
      staffId: req.staffId,
      staffUid: req.staffUid,
      staffName: req.staffName,
      staffEmail: req.staffEmail,
      staffType: req.staffType,
      date: req.targetDate,
      clockInTime: req.clockInTime,
      clockOutTime: req.clockOutTime || undefined,
      status: "present",
      note: `Regularized by Admin (${params.adminEmail}): ${req.reason}`,
      isRegularized: true,
      regularizedRequestId: req.id,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    await setDoc(doc(db, ATTENDANCE_COLLECTION, docId), attendanceDoc);
  }
}

// ─────────────────────────────────────────────────────────────
// 3. DAILY WORK UPDATE OPERATIONS
// ─────────────────────────────────────────────────────────────

/**
 * Staff submits or updates their daily work report
 */
export async function submitDailyWorkUpdate(params: {
  staffId: string;
  staffUid: string;
  staffName: string;
  staffEmail: string;
  staffType: string;
  date?: string; // Defaults to today
  tasksCompleted: string;
  tasksInProgress?: string;
  blockers?: string;
  hoursWorked: number;
  projectLinks?: string;
}): Promise<DailyWorkUpdate> {
  const dateStr = params.date || getTodayDateString();
  const docId = `work_${params.staffId}_${dateStr}`;
  const nowIso = new Date().toISOString();

  const ref = doc(db, WORK_UPDATES_COLLECTION, docId);
  const existing = await getDoc(ref);

  const data: DailyWorkUpdate = {
    id: docId,
    staffId: params.staffId,
    staffUid: params.staffUid,
    staffName: params.staffName,
    staffEmail: params.staffEmail,
    staffType: params.staffType,
    date: dateStr,
    tasksCompleted: params.tasksCompleted,
    tasksInProgress: params.tasksInProgress || "",
    blockers: params.blockers || "",
    hoursWorked: Number(params.hoursWorked) || 0,
    projectLinks: params.projectLinks || "",
    createdAt: existing.exists() ? existing.data()?.createdAt : nowIso,
    updatedAt: nowIso,
    reviewedByAdmin: existing.exists() ? existing.data()?.reviewedByAdmin : false,
    adminFeedback: existing.exists() ? existing.data()?.adminFeedback : "",
  };

  await setDoc(ref, data);
  return data;
}

/**
 * Get staff work update for a specific date
 */
export async function getStaffWorkUpdateForDate(
  staffId: string,
  date: string = getTodayDateString()
): Promise<DailyWorkUpdate | null> {
  try {
    const docId = `work_${staffId}_${date}`;
    const snap = await getDoc(doc(db, WORK_UPDATES_COLLECTION, docId));
    if (!snap.exists()) return null;
    return snap.data() as DailyWorkUpdate;
  } catch {
    return null;
  }
}

/**
 * Get staff work updates history
 */
export async function getStaffWorkUpdates(
  staffId: string,
  maxCount: number = 30
): Promise<DailyWorkUpdate[]> {
  try {
    const colRef = collection(db, WORK_UPDATES_COLLECTION);
    const q = query(
      colRef,
      where("staffId", "==", staffId),
      orderBy("date", "desc"),
      limit(maxCount)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as DailyWorkUpdate);
  } catch (err) {
    console.error("[staffEcoService] getStaffWorkUpdates err:", err);
    return [];
  }
}

/**
 * Admin: Get all work updates (optionally filtered by date or staff)
 */
export async function getAllWorkUpdates(params?: {
  date?: string;
  staffId?: string;
  limitCount?: number;
}): Promise<DailyWorkUpdate[]> {
  try {
    const colRef = collection(db, WORK_UPDATES_COLLECTION);
    const snap = await getDocs(query(colRef, limit(params?.limitCount || 100)));
    let list = snap.docs.map((d) => d.data() as DailyWorkUpdate);

    if (params?.date) {
      list = list.filter((u) => u.date === params.date);
    }
    if (params?.staffId) {
      const sid = params.staffId.toLowerCase();
      list = list.filter(
        (u) =>
          u.staffId === params.staffId ||
          u.staffUid === params.staffId ||
          u.staffEmail?.toLowerCase() === sid
      );
    }

    list.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    return list;
  } catch (err) {
    console.error("[staffEcoService] getAllWorkUpdates err:", err);
    return [];
  }
}

/**
 * Admin: Add feedback or review remark to a staff work update
 */
export async function addAdminFeedbackToWorkUpdate(
  updateId: string,
  feedback: string
): Promise<void> {
  const ref = doc(db, WORK_UPDATES_COLLECTION, updateId);
  await updateDoc(ref, {
    adminFeedback: feedback,
    reviewedByAdmin: true,
    reviewedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

// ─────────────────────────────────────────────────────────────
// 4. LEAVE APPLICATION OPERATIONS
// ─────────────────────────────────────────────────────────────

/**
 * Staff submits a leave application
 */
export async function submitLeaveRequest(params: {
  staffId: string;
  staffUid: string;
  staffName: string;
  staffEmail: string;
  staffType: string;
  leaveType: LeaveRequest["leaveType"];
  startDate: string;
  endDate: string;
  reason: string;
  emergencyContact?: string;
}): Promise<LeaveRequest> {
  // Calculate total days
  const start = new Date(params.startDate);
  const end = new Date(params.endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

  const id = `leave_${params.staffId}_${Date.now()}`;
  const nowIso = new Date().toISOString();

  const req: LeaveRequest = {
    id,
    staffId: params.staffId,
    staffUid: params.staffUid,
    staffName: params.staffName,
    staffEmail: params.staffEmail,
    staffType: params.staffType,
    leaveType: params.leaveType,
    startDate: params.startDate,
    endDate: params.endDate,
    totalDays: isNaN(diffDays) || diffDays < 1 ? 1 : diffDays,
    reason: params.reason,
    emergencyContact: params.emergencyContact || "",
    status: "pending",
    createdAt: nowIso,
  };

  await setDoc(doc(db, LEAVES_COLLECTION, id), req);
  return req;
}

/**
 * Get staff's leave applications
 */
export async function getStaffLeaveRequests(staffId: string): Promise<LeaveRequest[]> {
  try {
    const colRef = collection(db, LEAVES_COLLECTION);
    const q = query(
      colRef,
      where("staffId", "==", staffId),
      orderBy("createdAt", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as LeaveRequest);
  } catch (err) {
    console.error("[staffEcoService] getStaffLeaveRequests err:", err);
    return [];
  }
}

/**
 * Admin: Get all leave requests (optionally filtered by status)
 */
export async function getAllLeaveRequests(
  statusFilter?: RequestStatus
): Promise<LeaveRequest[]> {
  try {
    const colRef = collection(db, LEAVES_COLLECTION);
    let q = query(colRef, orderBy("createdAt", "desc"));
    if (statusFilter) {
      q = query(
        colRef,
        where("status", "==", statusFilter),
        orderBy("createdAt", "desc")
      );
    }
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as LeaveRequest);
  } catch (err) {
    console.error("[staffEcoService] getAllLeaveRequests err:", err);
    return [];
  }
}

/**
 * Admin: Review leave request (Approve / Reject)
 */
export async function reviewLeaveRequest(params: {
  requestId?: string;
  leaveId?: string;
  decision: "approved" | "rejected";
  adminRemark?: string;
  adminEmail: string;
}): Promise<void> {
  const targetId = params.leaveId || params.requestId || "";
  const ref = doc(db, LEAVES_COLLECTION, targetId);
  const nowIso = new Date().toISOString();

  await updateDoc(ref, {
    status: params.decision,
    adminRemark: params.adminRemark || "",
    reviewedBy: params.adminEmail,
    reviewedAt: nowIso,
  });
}
