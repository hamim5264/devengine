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
  where,
  orderBy,
} from "firebase/firestore";
import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { db } from "@/lib/firebase";
import type { StaffMember, StaffType } from "@/types/staff";

const STAFF_COLLECTION = "staff_members";

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
  return `${firstName.toLowerCase()}.devengine@gmail.com`;
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

// ── CRUD ──

/** Create a new staff account (Firebase Auth + Firestore) */
export async function createStaffAccount(data: {
  name: string;
  email: string;
  password: string;
  staffType: StaffType;
  allowedModules: string[];
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

  // 2. Save to Firestore
  const id = uid; // Use auth UID as document ID for easy lookup
  const now = new Date().toISOString();
  const staffMember: StaffMember = {
    id,
    uid,
    name: data.name,
    email: data.email,
    staffType: data.staffType,
    allowedModules: data.allowedModules,
    status: "active",
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

/** Update staff member */
export async function updateStaffMember(
  id: string,
  data: Partial<Pick<StaffMember, "name" | "staffType" | "allowedModules" | "status">>,
): Promise<void> {
  await updateDoc(doc(db, STAFF_COLLECTION, id), {
    ...data,
    updatedAt: new Date().toISOString(),
  });
}

/** Delete staff member from Firestore (does not delete Firebase Auth user) */
export async function deleteStaffMember(id: string): Promise<void> {
  await deleteDoc(doc(db, STAFF_COLLECTION, id));
}
