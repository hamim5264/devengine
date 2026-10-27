import { auth } from "@/lib/firebase";

const dismissed = new Set<string>();

/** Revisit incomplete profiles on the next login, without repeating on navigation. */
export function staffProfileSession(uid: string): string {
  return `staff_profile_prompt:${uid}:${auth.currentUser?.metadata.lastSignInTime || "session"}`;
}

export function hasDismissedStaffProfile(key: string): boolean {
  if (dismissed.has(key)) return true;
  try { return sessionStorage.getItem(key) === "1"; } catch { return false; }
}

export function dismissStaffProfile(key: string): void {
  dismissed.add(key);
  try { sessionStorage.setItem(key, "1"); } catch { /* In-memory fallback above. */ }
}
