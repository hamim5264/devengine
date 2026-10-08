// lib/services/staffService.ts
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
} from "firebase/firestore";
import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updatePassword,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import type { StaffMember, StaffType, StaffRole } from "@/types/staff";
import { DEFAULT_STAFF_ROLES, ROLE_COLOR_PRESETS } from "@/types/staff";

const STAFF_COLLECTION = "staff_members";
const STAFF_ROLES_COLLECTION = "staff_roles";

// ── Secondary Firebase App (avoids signing out admin) ──
function getSecondaryAuth() {
  const secondaryAppName = "__staffCreator__";
  const existing = getApps().find((a) => a.name === secondaryAppName);
  const secondaryApp = existing
    ? existing
    : initializeApp(
        {
          apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
          authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
          storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
          messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
          appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
        },
        secondaryAppName,
      );
  return getAuth(secondaryApp);
}

// ── Helpers ──

/** Generate email from full name: "John Smith" → "john.devengine@gmail.com" */
export function generateStaffEmail(name: string): string {
  const firstName = name.trim().split(/\s+/)[0] || "staff";
  return `${firstName.toLowerCase().replace(/[^a-z0-9]/g, "")}.devengine@gmail.com`;
}

/** Generate random 8-char alphanumeric password */
export function generateStaffPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let pw = "";
  for (let i = 0; i < 8; i++) {
    pw += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pw;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
  });
}

/** Upload staff avatar via Firebase Storage with fallback to /api/upload-image */
export async function uploadStaffAvatar(
  file: File,
  staffIdentifier: string = "staff"
): Promise<string> {
  const cleanExt = (file.name.split(".").pop() || "png").toLowerCase();
  const filename = `${staffIdentifier.replace(/[^a-zA-Z0-9_-]/g, "_")}_${Date.now()}.${cleanExt}`;

  // 1. Try Firebase Storage
  try {
    const storageRef = ref(storage, `staff/${filename}`);
    await uploadBytes(storageRef, file);
    const downloadUrl = await getDownloadURL(storageRef);
    if (downloadUrl) return downloadUrl;
  } catch (storageErr) {
    console.warn("[StaffService] Firebase Storage upload failed, trying local fallback:", storageErr);
  }

  // 2. Fallback to API endpoint
  try {
    const base64Data = await fileToBase64(file);
    const res = await fetch("/api/upload-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename,
        base64Data,
        folder: "staff",
      }),
    });
    const data = await res.json();
    if (res.ok && data?.url) {
      return data.url;
    }
    throw new Error(data?.error || "Upload fallback failed");
  } catch (apiErr: any) {
    console.error("[StaffService] Fallback upload error:", apiErr);
    throw new Error(apiErr?.message || "Failed to upload avatar image.");
  }
}

// ── CRUD Staff Accounts ──

/** Create a new staff account (Firebase Auth + Firestore) */
export async function createStaffAccount(data: {
  name: string;
  email: string;
  password: string;
  staffType: StaffType;
  allowedModules: string[];
  avatarUrl?: string;
  assignedOffDays?: string[];
  shiftHours?: { start: string; end: string; name?: string };
  agreementId?: string;
}): Promise<StaffMember> {
  const secondaryAuth = getSecondaryAuth();

  // 1. Create Firebase Auth user on secondary app
  const cred = await createUserWithEmailAndPassword(
    secondaryAuth,
    data.email,
    data.password,
  );
  const uid = cred.user.uid;

  // Sign out secondary immediately
  await firebaseSignOut(secondaryAuth);

  // 2. Save to Firestore (Doc ID = Auth UID)
  const id = uid;
  const now = new Date().toISOString();
  const staffMember: StaffMember = {
    id,
    uid,
    name: data.name,
    email: data.email,
    password: data.password, // Persisted for admin visibility, edit and recovery
    avatarUrl: data.avatarUrl || "",
    staffType: data.staffType,
    allowedModules: data.allowedModules,
    status: "active",
    assignedOffDays: data.assignedOffDays || ["Friday", "Saturday"],
    shiftHours: data.shiftHours || { start: "09:00", end: "18:00", name: "Standard Shift" },
    agreementId: data.agreementId || "",
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(doc(db, STAFF_COLLECTION, id), staffMember);
  return staffMember;
}

/** Fetch all staff members */
export async function getStaffMembers(): Promise<StaffMember[]> {
  try {
    const colRef = collection(db, STAFF_COLLECTION);
    const q = query(colRef, orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ ...d.data(), id: d.id } as StaffMember));
  } catch {
    return [];
  }
}

/** Fetch single staff member by Firestore ID */
export async function getStaffById(id: string): Promise<StaffMember | null> {
  try {
    const snap = await getDoc(doc(db, STAFF_COLLECTION, id));
    if (!snap.exists()) return null;
    return { ...snap.data(), id: snap.id } as StaffMember;
  } catch {
    return null;
  }
}

/** Fetch staff member by Firebase Auth UID (doc ID = UID) */
export async function getStaffByUid(uid: string): Promise<StaffMember | null> {
  try {
    const snap = await getDoc(doc(db, STAFF_COLLECTION, uid));
    if (!snap.exists()) return null;
    return { ...snap.data(), id: snap.id } as StaffMember;
  } catch {
    return null;
  }
}

/** Update staff member (Firestore + Firebase Auth password if changed) */
export async function updateStaffMember(
  id: string,
  data: Partial<Pick<StaffMember, "name" | "staffType" | "allowedModules" | "status" | "password" | "avatarUrl">>,
  credentials?: { email: string; oldPassword?: string }
): Promise<void> {
  // If password was edited and we know the previous password, update secondary Firebase Auth
  if (data.password && credentials?.email && credentials?.oldPassword && data.password !== credentials.oldPassword) {
    try {
      const secondaryAuth = getSecondaryAuth();
      const userCred = await signInWithEmailAndPassword(secondaryAuth, credentials.email, credentials.oldPassword);
      await updatePassword(userCred.user, data.password);
      await firebaseSignOut(secondaryAuth);
    } catch (authErr) {
      console.warn("[StaffService] Secondary Firebase Auth password sync warning:", authErr);
      // Secondary auth sign-in might fail if password was already changed; Firestore update still proceeds.
    }
  }

  await updateDoc(doc(db, STAFF_COLLECTION, id), {
    ...data,
    updatedAt: new Date().toISOString(),
  });
}

/** Delete staff member from Firestore */
export async function deleteStaffMember(id: string): Promise<void> {
  await deleteDoc(doc(db, STAFF_COLLECTION, id));
}

// ── CRUD Staff Roles ──

/** Fetch all staff roles (Default roles merged with Firestore custom roles) */
export async function getStaffRoles(): Promise<StaffRole[]> {
  try {
    const colRef = collection(db, STAFF_ROLES_COLLECTION);
    const snap = await getDocs(colRef);
    const customRoles: StaffRole[] = snap.docs.map((d) => ({
      ...d.data(),
      id: d.id,
      isCustom: true,
    } as StaffRole));

    // Map default roles, allowing custom roles to override if same key exists
    const rolesMap = new Map<string, StaffRole>();
    for (const def of DEFAULT_STAFF_ROLES) {
      rolesMap.set(def.key, { ...def });
    }
    for (const cust of customRoles) {
      rolesMap.set(cust.key, cust);
    }

    return Array.from(rolesMap.values());
  } catch (err) {
    console.error("[StaffService] Error loading roles:", err);
    return DEFAULT_STAFF_ROLES;
  }
}

/** Create a new custom role */
export async function createStaffRole(data: {
  label: string;
  key?: string;
  description?: string;
  color?: { bg: string; text: string; border: string; hex?: string };
  defaultModules?: string[];
}): Promise<StaffRole> {
  const rawKey = data.key || data.label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  const key = rawKey || `role_${Date.now()}`;
  const now = new Date().toISOString();

  // If no color provided, assign one from presets
  const color = data.color || ROLE_COLOR_PRESETS[Math.floor(Math.random() * ROLE_COLOR_PRESETS.length)];

  const role: StaffRole = {
    id: key,
    key,
    label: data.label.trim(),
    description: data.description || "",
    color,
    defaultModules: data.defaultModules || ["overview"],
    isCustom: true,
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(doc(db, STAFF_ROLES_COLLECTION, key), role);
  return role;
}

/** Update an existing custom role */
export async function updateStaffRole(id: string, data: Partial<StaffRole>): Promise<void> {
  await updateDoc(doc(db, STAFF_ROLES_COLLECTION, id), {
    ...data,
    updatedAt: new Date().toISOString(),
  });
}

/** Delete a custom role */
export async function deleteStaffRole(id: string): Promise<void> {
  await deleteDoc(doc(db, STAFF_ROLES_COLLECTION, id));
}
