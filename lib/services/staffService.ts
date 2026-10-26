import { uploadStorageAsset } from "@/lib/services/storageAssetService";
// lib/services/staffService.ts
import {
  collection,
  writeBatch,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  deleteField,
  query,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updatePassword,
  updateProfile,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage, auth } from "@/lib/firebase";
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


/** Persist staff avatars in Firebase Storage. */
export async function uploadStaffAvatar(file: File, staffIdentifier = "staff"): Promise<string> {
  return uploadStorageAsset(file, "staff", staffIdentifier, 10 * 1024 * 1024);
}

// ── CRUD Staff Accounts ──

/** Create a new staff account (Firebase Auth + Firestore) */
export async function createStaffAccount(data: {
  name: string;
  email: string;
  password: string;
  staffType: StaffType;
  allowedModules: string[];
  allowedSubModules?: Record<string, string[]>;
  apposAccess?: StaffMember["apposAccess"];
  avatarUrl?: string;
  assignedOffDays?: string[];
  shiftHours?: { start: string; end: string; name?: string };
  agreementId?: string;
  employmentType?: StaffMember["employmentType"];
  joiningDate?: string;
  probationPeriodMonths?: number;
  probationEndDate?: string;
  emergencyContact?: StaffMember["emergencyContact"];
  salaryManagement?: StaffMember["salaryManagement"];
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
    allowedSubModules: data.allowedSubModules || {},
    apposAccess: data.apposAccess || { registry: [], apps: {} },
    status: "active",
    assignedOffDays: data.assignedOffDays || ["Friday", "Saturday"],
    shiftHours: data.shiftHours || { start: "09:00", end: "18:00", name: "Standard Shift" },
    agreementId: data.agreementId || "",
    employmentType: data.employmentType || "permanent",
    joiningDate: data.joiningDate || now.split("T")[0],
    probationPeriodMonths: data.probationPeriodMonths,
    probationEndDate: data.probationEndDate,
    emergencyContact: data.emergencyContact,
    salaryManagement: data.salaryManagement,
    createdAt: now,
    updatedAt: now,
  };

  const batch = writeBatch(db);
  batch.set(doc(db, STAFF_COLLECTION, id), staffMember);
  batch.set(doc(db, "studio_people", id), { uid: id, name: staffMember.name, avatarUrl: staffMember.avatarUrl || "", role: "employee", status: "active", departmentIds: [], chatSuspended: false });
  await batch.commit();
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
  data: Partial<StaffMember>,
  credentials?: { email: string; oldPassword?: string }
): Promise<void> {
  if (data.status === "suspended" && !data.suspensionReason?.trim()) throw new Error("Add a reason before suspending this employee.");
  if ((data.suspensionReason || "").length > 1000) throw new Error("Keep the suspension reason within 1,000 characters.");
  if (data.password !== undefined && data.password !== credentials?.oldPassword && (data.password || credentials?.oldPassword) && data.password.length < 6) throw new Error("Password must contain at least 6 characters.");
  const clean = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(item => item === undefined ? null : clean(item));
    if (value && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined).map(([key, item]) => [key, clean(item)]));
    return value;
  };
  const removable = new Set(["probationPeriodMonths", "emergencyContact", "resignationDetails", "suspensionReason", "suspendedAt", "suspendedBy"]);
  const payload: Record<string, unknown> = {};
  Object.entries(data).forEach(([key, value]) => {
    if (key === "password" && value === "" && !credentials?.oldPassword) return;
    if (value !== undefined) payload[key] = clean(value);
    else if (removable.has(key)) payload[key] = deleteField();
  });
  if (data.status === "suspended") {
    payload.suspensionReason = data.suspensionReason!.trim();
    payload.suspendedBy = auth.currentUser?.uid || "";
    payload.suspendedAt = data.suspendedAt || new Date().toISOString();
  } else if (data.status === "active") {
    payload.suspensionReason = deleteField(); payload.suspendedAt = deleteField(); payload.suspendedBy = deleteField();
  }
  const batch = writeBatch(db);
  batch.update(doc(db, STAFF_COLLECTION, id), { ...payload, updatedAt: new Date().toISOString() });
  const directory = await getDoc(doc(db, "studio_people", id));
  if (directory.exists()) {
    const projection: Record<string, string> = {};
    if (data.name !== undefined) projection.name = data.name;
    if (data.avatarUrl !== undefined) projection.avatarUrl = data.avatarUrl;
    if (data.status !== undefined) projection.status = data.status;
    if (Object.keys(projection).length) batch.update(directory.ref, projection);
  }
  const changingPassword = !!data.password && data.password !== credentials?.oldPassword;
  const secondaryAuth = changingPassword ? getSecondaryAuth() : null;
  let passwordChanged = false;
  try {
    if (changingPassword) {
      if (!credentials?.email || !credentials.oldPassword) throw new Error("The current login password is unavailable. Reset the employee password before changing it here.");
      const account = await signInWithEmailAndPassword(secondaryAuth!, credentials.email, credentials.oldPassword);
      await updatePassword(account.user, data.password!);
      passwordChanged = true;
    }
    await batch.commit();
  } catch (error) {
    if (passwordChanged && secondaryAuth?.currentUser && credentials?.oldPassword) {
      try { await updatePassword(secondaryAuth.currentUser, credentials.oldPassword); }
      catch { throw new Error("The login password changed, but the employee profile could not be saved. Reset the login password before retrying."); }
    }
    throw error;
  } finally {
    if (secondaryAuth) await firebaseSignOut(secondaryAuth).catch(() => {});
  }
}

/** Subscribe to all staff members in real-time */
export function subscribeStaffMembers(callback: (staff: StaffMember[]) => void): () => void {
  const colRef = collection(db, STAFF_COLLECTION);
  const q = query(colRef, orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => ({ ...d.data(), id: d.id } as StaffMember));
      callback(list);
    },
    (err) => {
      console.warn("[StaffService] Failed to listen to staff members:", err);
    }
  );
}

/** Update own profile (name, avatarUrl, payment method, bank details, emergency contact) for logged-in staff member */
export async function updateStaffSelfProfile(
  staffId: string,
  data: {
    name: string;
    avatarUrl: string;
    paymentMethod?: string;
    bankDetails?: string;
    emergencyContact?: {
      name: string;
      relationship: string;
      phone: string;
    };
  }
): Promise<void> {
  const now = new Date().toISOString();
  const trimmedName = data.name.trim();
  const trimmedAvatarUrl = data.avatarUrl.trim();

  const docRef = doc(db, STAFF_COLLECTION, staffId);
  const snap = await getDoc(docRef);
  const existing = snap.exists() ? (snap.data() as StaffMember) : null;

  const updatePayload: Record<string, any> = {
    name: trimmedName,
    avatarUrl: trimmedAvatarUrl,
    updatedAt: now,
  };

  // Merge salaryManagement with updated paymentMethod / bankDetails
  if (data.paymentMethod !== undefined || data.bankDetails !== undefined) {
    const existingSalary = existing?.salaryManagement || {
      basicSalary: 0,
      grossSalary: 0,
      currency: "BDT",
      paymentMethod: "",
      noticePeriodDays: 30,
    };
    updatePayload.salaryManagement = {
      ...existingSalary,
      paymentMethod: data.paymentMethod !== undefined ? data.paymentMethod.trim() : (existingSalary.paymentMethod || ""),
      bankDetails: data.bankDetails !== undefined ? data.bankDetails.trim() : (existingSalary.bankDetails || ""),
    };
  }

  // Update emergencyContact
  if (data.emergencyContact !== undefined) {
    updatePayload.emergencyContact = {
      name: data.emergencyContact.name.trim(),
      relationship: data.emergencyContact.relationship.trim(),
      phone: data.emergencyContact.phone.trim(),
    };
  }

  // 1. Update staff_members doc
  await updateDoc(docRef, updatePayload);

  // 2. Sync to studio_people doc if it exists
  try {
    const directoryRef = doc(db, "studio_people", staffId);
    const directory = await getDoc(directoryRef);
    if (directory.exists()) {
      await updateDoc(directoryRef, {
        name: trimmedName,
        avatarUrl: trimmedAvatarUrl,
      });
    }
  } catch (err) {
    console.warn("[StaffService] studio_people sync warning:", err);
  }

  // 3. Update Firebase Auth user profile if currentUser matches
  if (auth.currentUser && auth.currentUser.uid === staffId) {
    try {
      await updateProfile(auth.currentUser, {
        displayName: trimmedName,
        photoURL: trimmedAvatarUrl || null,
      });
    } catch (authErr) {
      console.warn("[StaffService] Auth updateProfile warning:", authErr);
    }
  }
}

/** Delete staff member from Firestore */
export async function deleteStaffMember(id: string): Promise<void> {
  const batch = writeBatch(db);
  batch.delete(doc(db, STAFF_COLLECTION, id));
  const directory = await getDoc(doc(db, "studio_people", id));
  if (directory.exists()) batch.update(directory.ref, { status: "suspended", chatSuspended: true, departmentIds: [] });
  await batch.commit();
}

// ── CRUD Staff Roles ──

/** Fetch all staff roles (Default roles merged with Firestore custom roles) */
export async function getStaffRoles(): Promise<StaffRole[]> {
  try {
    const colRef = collection(db, STAFF_ROLES_COLLECTION);
    const snap = await getDocs(colRef);
    const firestoreRoles: StaffRole[] = snap.docs.map((d) => ({
      ...d.data(),
      id: d.id,
      isCustom: d.data().isCustom !== undefined ? d.data().isCustom : true,
    } as StaffRole));

    // Map default roles, allowing saved customizations in Firestore to merge and override
    const rolesMap = new Map<string, StaffRole>();
    for (const def of DEFAULT_STAFF_ROLES) {
      rolesMap.set(def.key, { ...def });
    }
    for (const role of firestoreRoles) {
      const existing = rolesMap.get(role.key);
      rolesMap.set(role.key, {
        ...(existing || {}),
        ...role,
        isCustom: existing ? (role.isCustom ?? false) : true,
      });
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
  defaultSubModules?: Record<string, string[]>;
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
    defaultSubModules: data.defaultSubModules || {},
    isCustom: true,
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(doc(db, STAFF_ROLES_COLLECTION, key), role);
  return role;
}

/** Update an existing role (custom or system default) */
export async function updateStaffRole(id: string, data: Partial<StaffRole>): Promise<void> {
  const docId = id || (data as any).key;
  await setDoc(
    doc(db, STAFF_ROLES_COLLECTION, docId),
    {
      ...data,
      id: docId,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}

/** Delete a custom role */
export async function deleteStaffRole(id: string): Promise<void> {
  await deleteDoc(doc(db, STAFF_ROLES_COLLECTION, id));
}
