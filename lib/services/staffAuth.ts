import { useEffect, useState } from "react";
import { useRouter, type NextRouter } from "next/router";
import { type User, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import type { StaffMember } from "@/types/staff";
import { hasStudioModule, modulesForAdminRoute } from "@/lib/staffModules";

export const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "hamim.leon@gmail.com";
const isOwner = (user: User) => user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

// Kept for callers using the old API; authorization always reads current grants.
export async function getCachedStaffByUid(uid: string): Promise<StaffMember | null> {
  try {
    const snap = await getDoc(doc(db, "staff_members", uid));
    return snap.exists() ? { ...snap.data(), id: snap.id, uid } as StaffMember : null;
  } catch {
    return null;
  }
}

interface AccessState {
  user: User | null;
  authorized: boolean;
  isAdmin: boolean;
  isStaff: boolean;
  staff: StaffMember | null;
}
const denied: AccessState = { user: null, authorized: false, isAdmin: false, isStaff: false, staff: null };
type RequiredModules = string | string[] | undefined;

function staffMayEnter(staff: StaffMember, required: RequiredModules) {
  if (staff.status !== "active") return false;
  if (required === undefined) return true;
  return (Array.isArray(required) ? required : [required]).some((key) => hasStudioModule(staff, key));
}

/** Re-evaluate grants and suspension live; discard callbacks from old sessions. */
export function subscribeStudioAccess(required: RequiredModules, onChange: (state: AccessState) => void) {
  let stopRecord: (() => void) | undefined;
  let generation = 0;
  const stopAuth = onAuthStateChanged(auth, (user) => {
    const current = ++generation;
    stopRecord?.();
    stopRecord = undefined;
    if (!user) { onChange(denied); return; }
    if (isOwner(user)) { onChange({ user, authorized: true, isAdmin: true, isStaff: false, staff: null }); return; }
    stopRecord = onSnapshot(doc(db, "staff_members", user.uid), (snapshot) => {
      if (current !== generation) return;
      const staff = snapshot.exists() ? { ...snapshot.data(), id: snapshot.id, uid: user.uid } as StaffMember : null;
      onChange({ user, staff, authorized: !!staff && staffMayEnter(staff, required), isAdmin: false, isStaff: staff?.status === "active" });
    }, () => {
      if (current === generation) onChange({ ...denied, user });
    });
  });
  return () => { generation++; stopRecord?.(); stopAuth(); };
}

function redirectDenied(router: NextRouter, state: AccessState) {
  const destination = state.isStaff ? "/staff/dashboard" : state.user ? "/staff" : `/login?redirect=${encodeURIComponent(router.asPath)}`;
  if (router.asPath !== destination) void router.replace(destination);
}

/** Shared entry guard for every delegated studio page. No admin impersonation. */
export function onAdminPageAccess(router: NextRouter, onAuthorized: (user: User) => void | Promise<void>, onDenied?: () => void) {
  let admittedUid: string | null = null;
  return subscribeStudioAccess(modulesForAdminRoute(router.pathname), (state) => {
    if (state.authorized && state.user) {
      if (admittedUid !== state.user.uid) {
        admittedUid = state.user.uid;
        void onAuthorized(state.user);
      }
    } else {
      admittedUid = null;
      onDenied?.();
      redirectDenied(router, state);
    }
  });
}

export function useAdminOrStaffAuth(required?: RequiredModules) {
  const router = useRouter();
  const [state, setState] = useState<AccessState>(denied);
  const [authReady, setAuthReady] = useState(false);
  const key = required === undefined ? undefined : JSON.stringify(Array.isArray(required) ? required : [required]);
  useEffect(() => {
    setAuthReady(false);
    setState(denied);
    return subscribeStudioAccess(key === undefined ? undefined : JSON.parse(key) as string[], (next) => {
      setState(next);
      setAuthReady(true);
      if (!next.authorized) redirectDenied(router, next);
    });
  }, [key, router]);
  // isAdmin remains the legacy page authorization flag, with the real role explicit.
  return { authReady, isAdmin: state.authorized, isAuthorized: state.authorized, isSuperAdmin: state.isAdmin, isStaff: state.isStaff, staffData: state.staff };
}

export async function checkUserAuthorized(user: User | null, requiredModule?: string) {
  if (!user) return { ok: false, isAdmin: false, isStaff: false, staff: null };
  if (isOwner(user)) return { ok: true, isAdmin: true, isStaff: false, staff: null };
  const staff = await getCachedStaffByUid(user.uid);
  return { ok: !!staff && staffMayEnter(staff, requiredModule), isAdmin: false, isStaff: staff?.status === "active", staff };
}

export function onAdminOrStaffAuthStateChanged(router: NextRouter, moduleKey: string | undefined,
  onAuthorized: (user: User, isStaff: boolean, staffData?: StaffMember | null) => void, onUnauthorized?: () => void) {
  return subscribeStudioAccess(moduleKey, (state) => {
    if (state.authorized && state.user) onAuthorized(state.user, state.isStaff, state.staff);
    else { onUnauthorized?.(); redirectDenied(router, state); }
  });
}
