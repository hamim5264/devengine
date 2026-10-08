// types/staffEcoSystem.ts

export type AttendanceStatus =
  | "present"
  | "late"
  | "half_day"
  | "remote"
  | "on_leave"
  | "absent"
  | "on_break";

export type RequestStatus = "pending" | "approved" | "rejected";
export type LeaveRequestStatus = RequestStatus;

export type LeaveType =
  | "casual"
  | "sick"
  | "emergency"
  | "maternity_paternity"
  | "unpaid"
  | "other";

export type BreakType = "lunch" | "tea" | "personal" | "meeting" | "other";

export interface AttendanceBreak {
  id: string;
  startTime: string; // ISO timestamp
  endTime?: string; // ISO timestamp
  durationMinutes?: number;
  breakType: BreakType;
  note?: string;
}

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
  clockOutTimestamp?: string; // ISO timestamp
  totalHours?: number; // Total gross hours
  breaks?: AttendanceBreak[];
  currentBreak?: AttendanceBreak | null;
  totalBreakMinutes?: number;
  netWorkHours?: number; // Total active hours excluding breaks
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

export interface OffDaySwapRequest {
  id: string;
  staffId: string;
  staffUid: string;
  staffName: string;
  staffEmail: string;
  staffType: string;
  currentOffDate: string; // "YYYY-MM-DD" - scheduled off day
  requestedWorkDate: string; // "YYYY-MM-DD" - date they want to swap to take off
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

export type TaskPriority = "urgent" | "high" | "normal" | "low";
export type TaskStatus = "todo" | "in_progress" | "in_review" | "completed" | "blocked";

export interface EmployeeTask {
  id: string;
  title: string;
  description: string;
  assignedToStaffId: string;
  assignedToStaffUid: string;
  assignedToName: string;
  assignedToEmail: string;
  assignedBy?: string; // Admin or manager email
  priority: TaskPriority;
  category?: string; // "Frontend", "Backend", "UI Design", "QA", "General", etc.
  assignedDate: string; // "YYYY-MM-DD"
  dueDate: string; // "YYYY-MM-DD"
  dueTime?: string; // "18:00"
  status: TaskStatus;
  progressPercent: number; // 0 - 100
  employeeNotes?: string;
  submissionUrl?: string; // GitHub PR, Figma link, Drive link, etc.
  adminFeedback?: string;
  estimatedHours?: number;
  actualHours?: number;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export const BREAK_TYPE_LABELS: Record<BreakType, string> = {
  lunch: "Lunch Break",
  tea: "Tea / Coffee Break",
  personal: "Personal Break",
  meeting: "Team Meeting",
  other: "Short Break",
};

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  urgent: "Urgent",
  high: "High",
  normal: "Normal",
  low: "Low",
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  in_review: "In Review",
  completed: "Completed",
  blocked: "Blocked",
};

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
  on_break: "On Break",
};
