// types/staffEcoSystem.ts

export type AttendanceStatus =
  | "present"
  | "late"
  | "half_day"
  | "remote"
  | "on_leave"
  | "absent";

export type RequestStatus = "pending" | "approved" | "rejected";
export type LeaveRequestStatus = RequestStatus;

export type LeaveType =
  | "casual"
  | "sick"
  | "emergency"
  | "maternity_paternity"
  | "unpaid"
  | "other";

export interface AttendanceRecord {
  id: string; // e.g. "attendance_{staffId}_{YYYY-MM-DD}"
  staffId: string;
  staffUid: string;
  staffName: string;
  staffEmail: string;
  staffType: string;
  date: string; // "YYYY-MM-DD"
  clockInTime: string; // ISO string or time string e.g. "09:30 AM"
  clockInTimestamp?: string; // ISO timestamp
  clockOutTime?: string; // ISO string or time string e.g. "06:00 PM"
  totalHours?: number; // e.g. 8.5
  status: AttendanceStatus;
  note?: string;
  isRegularized?: boolean; // true if created via approved missed date request
  regularizedRequestId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceRegularizationRequest {
  id: string;
  staffId: string;
  staffUid: string;
  staffName: string;
  staffEmail: string;
  staffType: string;
  targetDate: string; // "YYYY-MM-DD" (must be < today)
  clockInTime: string; // e.g. "09:30 AM"
  clockOutTime?: string; // e.g. "06:00 PM"
  reason: string;
  status: RequestStatus;
  adminRemark?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
}

export interface DailyWorkUpdate {
  id: string; // e.g. "work_{staffId}_{YYYY-MM-DD}"
  staffId: string;
  staffUid: string;
  staffName: string;
  staffEmail: string;
  staffType: string;
  date: string; // "YYYY-MM-DD"
  tasksCompleted: string; // Bullet points or detailed description
  tasksInProgress?: string;
  blockers?: string;
  hoursWorked: number;
  projectLinks?: string;
  adminFeedback?: string;
  reviewedByAdmin?: boolean;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LeaveRequest {
  id: string;
  staffId: string;
  staffUid: string;
  staffName: string;
  staffEmail: string;
  staffType: string;
  leaveType: LeaveType;
  startDate: string; // "YYYY-MM-DD"
  endDate: string; // "YYYY-MM-DD"
  totalDays: number;
  reason: string;
  emergencyContact?: string;
  status: RequestStatus;
  adminRemark?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
}

export const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  casual: "Casual Leave",
  sick: "Sick Leave",
  emergency: "Emergency Leave",
  maternity_paternity: "Maternity / Paternity",
  unpaid: "Unpaid Leave",
  other: "Other Leave",
};

export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
  present: "Present",
  late: "Late Arrival",
  half_day: "Half Day",
  remote: "Remote / WFH",
  on_leave: "On Leave",
  absent: "Absent",
};
