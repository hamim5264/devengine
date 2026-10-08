// lib/services/employeeTaskService.ts
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type {
  EmployeeTask,
  TaskPriority,
  TaskStatus,
} from "@/types/staffEcoSystem";

const TASKS_COLLECTION = "employee_tasks";

/**
 * Admin: Create and assign a task to an employee
 */
export async function createEmployeeTask(params: {
  title: string;
  description: string;
  assignedToStaffId: string;
  assignedToStaffUid: string;
  assignedToName: string;
  assignedToEmail: string;
  assignedBy?: string;
  priority?: TaskPriority;
  category?: string;
  assignedDate?: string;
  dueDate: string;
  dueTime?: string;
  estimatedHours?: number;
}): Promise<EmployeeTask> {
  const taskId = `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const nowIso = new Date().toISOString();
  const today = new Date().toISOString().split("T")[0];

  const task: EmployeeTask = {
    id: taskId,
    title: params.title,
    description: params.description || "",
    assignedToStaffId: params.assignedToStaffId,
    assignedToStaffUid: params.assignedToStaffUid,
    assignedToName: params.assignedToName,
    assignedToEmail: params.assignedToEmail,
    assignedBy: params.assignedBy || "Admin",
    priority: params.priority || "normal",
    category: params.category || "General",
    assignedDate: params.assignedDate || today,
    dueDate: params.dueDate,
    dueTime: params.dueTime || "18:00",
    status: "todo",
    progressPercent: 0,
    employeeNotes: "",
    submissionUrl: "",
    adminFeedback: "",
    estimatedHours: Number(params.estimatedHours) || 0,
    actualHours: 0,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  await setDoc(doc(db, TASKS_COLLECTION, taskId), task);
  return task;
}

/**
 * Employee: Get all tasks assigned to a specific employee
 */
export async function getEmployeeTasks(
  staffId: string
): Promise<EmployeeTask[]> {
  try {
    const colRef = collection(db, TASKS_COLLECTION);
    const q = query(
      colRef,
      where("assignedToStaffId", "==", staffId),
      orderBy("dueDate", "asc")
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as EmployeeTask);
  } catch (err) {
    // If index not ready, fallback without orderBy
    try {
      const colRef = collection(db, TASKS_COLLECTION);
      const q = query(colRef, where("assignedToStaffId", "==", staffId));
      const snap = await getDocs(q);
      const list = snap.docs.map((d) => d.data() as EmployeeTask);
      list.sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""));
      return list;
    } catch (e) {
      console.error("[employeeTaskService] getEmployeeTasks error:", e);
      return [];
    }
  }
}

/**
 * Admin: Get all tasks across all employees with optional filters
 */
export async function getAllEmployeeTasks(params?: {
  staffId?: string;
  status?: TaskStatus;
}): Promise<EmployeeTask[]> {
  try {
    const colRef = collection(db, TASKS_COLLECTION);
    const snap = await getDocs(query(colRef, limit(200)));
    let list = snap.docs.map((d) => d.data() as EmployeeTask);

    if (params?.staffId) {
      list = list.filter((t) => t.assignedToStaffId === params.staffId);
    }
    if (params?.status) {
      list = list.filter((t) => t.status === params.status);
    }

    list.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
    return list;
  } catch (err) {
    console.error("[employeeTaskService] getAllEmployeeTasks error:", err);
    return [];
  }
}

/**
 * Employee or Admin: Update task status, progress, notes, or submission link
 */
export async function updateEmployeeTask(
  taskId: string,
  updates: Partial<EmployeeTask>
): Promise<void> {
  const ref = doc(db, TASKS_COLLECTION, taskId);
  const nowIso = new Date().toISOString();

  const payload: Record<string, any> = {
    ...updates,
    updatedAt: nowIso,
  };

  // If status is completed, record completedAt
  if (updates.status === "completed" && !updates.completedAt) {
    payload.completedAt = nowIso;
    if (updates.progressPercent === undefined) {
      payload.progressPercent = 100;
    }
  }

  await updateDoc(ref, payload);
}

/**
 * Admin: Review task, leave notes/feedback, or update status
 */
export async function adminReviewTask(
  taskId: string,
  feedback: string,
  newStatus?: TaskStatus
): Promise<void> {
  const ref = doc(db, TASKS_COLLECTION, taskId);
  const updates: Record<string, any> = {
    adminFeedback: feedback,
    updatedAt: new Date().toISOString(),
  };
  if (newStatus) {
    updates.status = newStatus;
  }
  await updateDoc(ref, updates);
}

/**
 * Admin: Delete a task
 */
export async function deleteEmployeeTask(taskId: string): Promise<void> {
  await deleteDoc(doc(db, TASKS_COLLECTION, taskId));
}
