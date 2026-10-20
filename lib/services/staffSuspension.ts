import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";

export const STAFF_SUSPENSION_EVENT = "devengine:staff-suspended";
const STORAGE_KEY = "devengine_staff_suspension";
export interface StaffSuspensionNotice { uid?: string; email?: string; reason: string; at: number }
let pending: { uid: string; promise: Promise<void> } | null = null;
export function getStaffSuspensionNotice(): StaffSuspensionNotice | null {
  if (typeof window === "undefined") return null;
  try { const notice = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "null"); return notice && typeof notice.reason === "string" ? notice : null; } catch { return null; }
}
export function clearStaffSuspensionNotice() {
  try { sessionStorage.removeItem(STORAGE_KEY); } catch {}
}
export function announceStaffSuspension(notice: Omit<StaffSuspensionNotice, "at">) {
  const next = { ...notice, reason: notice.reason.trim() || "Your employee account has been suspended.", at: Date.now() };
  try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next)); localStorage.removeItem("isStaff"); localStorage.removeItem("staffUid"); } catch {}
  window.dispatchEvent(new CustomEvent(STAFF_SUSPENSION_EVENT, { detail: next }));
}
/** Record the reason before any route guard redirects, then end the Auth session. */
export function enforceStaffSuspension(staff: { id?: string; uid?: string; email?: string; suspensionReason?: string }): Promise<void> {
  const uid = staff.uid || staff.id || "";
  if (pending?.uid === uid) return pending.promise;
  if (!uid || auth.currentUser?.uid !== uid) return Promise.resolve();
  announceStaffSuspension({ uid, email: staff.email, reason: staff.suspensionReason || "Your employee account has been suspended." });
  const promise = signOut(auth).finally(() => { pending = null; });
  pending = { uid, promise };
  return promise;
}
