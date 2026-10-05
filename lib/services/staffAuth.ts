import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { User, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import type { StaffMember } from "@/types/staff";

export const ADMIN_EMAIL =
  process.env.NEXT_PUBLIC_ADMIN_EMAIL || "hamim.leon@gmail.com";

// In-memory cache for staff record to avoid unnecessary Firestore roundtrips
let cachedStaff: { uid: string; data: StaffMember; timestamp: number } | null = null;

export async function getCachedStaffByUid(uid: string): Promise<StaffMember | null> {
  if (cachedStaff && cachedStaff.uid === uid && Date.now() - cachedStaff.timestamp < 30000) {
    return cachedStaff.data;
  }
  try {
    const snap = await getDoc(doc(db, "staff_members", uid));
    if (!snap.exists()) return null;
    const data = { id: snap.id, ...snap.data() } as StaffMember;
    cachedStaff = { uid, data, timestamp: Date.now() };
    return data;
  } catch (err) {
    console.error("[StaffAuth] Failed to load staff record:", err);
    return null;
  }
}

/**
 * Custom React hook for admin & staff authentication
 * - If super admin: always grants access
 * - If staff: checks if account is active and (if moduleKey is provided) if module is allowed
 * - If unauthorized: safely redirects to appropriate fallback
 */
export function useAdminOrStaffAuth(moduleKey?: string) {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isStaff, setIsStaff] = useState(false);
  const [staffData, setStaffData] = useState<StaffMember | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setAuthReady(true);
        router.replace("/login");
        return;
      }

      // 1. Super Admin check
      if (user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
        setIsAdmin(true);
        setIsStaff(false);
        setStaffData(null);
        setAuthReady(true);
        return;
      }

      // 2. Staff Member check
      const staff = await getCachedStaffByUid(user.uid);
      if (staff && staff.status === "active") {
        if (!moduleKey || staff.allowedModules?.includes(moduleKey)) {
          setIsAdmin(true); // Treat as authorized in page UI
          setIsStaff(true);
          setStaffData(staff);
          setAuthReady(true);
          return;
        }

        // Staff is active, but does not have permission for this specific module
        router.replace("/staff/dashboard");
        return;
      }

      // 3. Not admin and not active staff
      router.replace("/login");
    });

    return () => unsub();
  }, [router, moduleKey]);

  return { authReady, isAdmin, isStaff, staffData };
}

/**
 * Imperative check for server/API or one-off verification
 */
export async function checkUserAuthorized(
  user: User | null,
  requiredModule?: string
): Promise<{ ok: boolean; isAdmin: boolean; isStaff: boolean; staff: StaffMember | null }> {
  if (!user) return { ok: false, isAdmin: false, isStaff: false, staff: null };

  if (user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
    return { ok: true, isAdmin: true, isStaff: false, staff: null };
  }

  const staff = await getCachedStaffByUid(user.uid);
  if (!staff || staff.status !== "active") {
    return { ok: false, isAdmin: false, isStaff: false, staff: null };
  }

  if (requiredModule && !staff.allowedModules?.includes(requiredModule)) {
    return { ok: false, isAdmin: false, isStaff: true, staff };
  }

  return { ok: true, isAdmin: false, isStaff: true, staff };
}

/**
 * Universal auth listener for Admin & Staff module pages
 */
export function onAdminOrStaffAuthStateChanged(
  router: any,
  moduleKey: string | undefined,
  onAuthorized: (user: User, isStaff: boolean, staffData?: StaffMember | null) => void,
  onUnauthorized?: () => void
) {
  return onAuthStateChanged(auth, async (user) => {
    if (!user) {
      if (onUnauthorized) onUnauthorized();
      else router.replace("/login");
      return;
    }

    const adminEmail = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || "hamim.leon@gmail.com").toLowerCase();
    if (user.email?.toLowerCase() === adminEmail) {
      onAuthorized(user, false, null);
      return;
    }

    const staff = await getCachedStaffByUid(user.uid);
    if (staff && staff.status === "active") {
      if (!moduleKey || (staff.allowedModules || []).includes(moduleKey) || (staff.allowedModules || []).includes("all")) {
        onAuthorized(user, true, staff);
        return;
      }
      // Staff member does not have permission for this module
      router.replace("/staff/dashboard");
      return;
    }

    if (onUnauthorized) onUnauthorized();
    else router.replace("/login");
  });
}

