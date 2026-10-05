import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { AppPolicy, AppDataDeletionRequest } from "@/types/appLegal";

const POLICIES_COLLECTION = "app_policies";
const DELETIONS_COLLECTION = "app_data_deletion_requests";

/**
 * Fetch all App Policies from Firestore
 */
export async function getAllAppPolicies(): Promise<AppPolicy[]> {
  try {
    const q = query(collection(db, POLICIES_COLLECTION), orderBy("updatedAt", "desc"));
    const snap = await getDocs(q);
    const list: AppPolicy[] = [];
    snap.forEach((d) => {
      list.push({ id: d.id, ...d.data() } as AppPolicy);
    });
    return list;
  } catch (err) {
    // If index or ordering fails, try fallback without order
    try {
      const snap = await getDocs(collection(db, POLICIES_COLLECTION));
      const list: AppPolicy[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as AppPolicy);
      });
      return list.sort((a, b) => {
        const timeA = a.updatedAt?.toMillis ? a.updatedAt.toMillis() : 0;
        const timeB = b.updatedAt?.toMillis ? b.updatedAt.toMillis() : 0;
        return timeB - timeA;
      });
    } catch (fallbackErr) {
      console.error("Error fetching app policies:", fallbackErr);
      return [];
    }
  }
}

/**
 * Fetch single App Policy by slug (publicly accessible)
 */
export async function getAppPolicyBySlug(slug: string): Promise<AppPolicy | null> {
  if (!slug) return null;
  const cleanSlug = slug.trim().toLowerCase();

  try {
    // Try query by slug field
    const q = query(
      collection(db, POLICIES_COLLECTION),
      where("slug", "==", cleanSlug)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      const first = snap.docs[0];
      return { id: first.id, ...first.data() } as AppPolicy;
    }

    // Try direct document ID fallback
    const directDoc = await getDoc(doc(db, POLICIES_COLLECTION, cleanSlug));
    if (directDoc.exists()) {
      return { id: directDoc.id, ...directDoc.data() } as AppPolicy;
    }

    return null;
  } catch (err) {
    console.error(`Error fetching app policy for slug "${slug}":`, err);
    return null;
  }
}

/**
 * Create a new App Policy
 */
export async function createAppPolicy(
  data: Omit<AppPolicy, "id" | "createdAt" | "updatedAt">
): Promise<string> {
  const cleanSlug = (data.slug || data.appName.toLowerCase().replace(/[^a-z0-9]+/g, "-")).replace(/^-|-$/g, "");
  
  // Use slug as doc ID or let Firestore generate ID
  const docRef = doc(db, POLICIES_COLLECTION, cleanSlug || Date.now().toString());
  
  await setDoc(docRef, {
    ...data,
    slug: cleanSlug,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}

/**
 * Update an existing App Policy
 */
export async function updateAppPolicy(
  id: string,
  data: Partial<AppPolicy>
): Promise<void> {
  const docRef = doc(db, POLICIES_COLLECTION, id);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Delete an App Policy
 */
export async function deleteAppPolicy(id: string): Promise<void> {
  const docRef = doc(db, POLICIES_COLLECTION, id);
  await deleteDoc(docRef);
}

/**
 * Upload App Logo: attempts Firebase Storage first, falls back to local /api/upload-image
 */
export async function uploadAppLogo(
  file: File,
  appSlugOrName: string = "app"
): Promise<string> {
  const cleanExt = (file.name.split(".").pop() || "png").toLowerCase();
  const safeName = appSlugOrName.toLowerCase().replace(/[^a-z0-9_-]/g, "_");
  const filename = `logo_${safeName}_${Date.now()}.${cleanExt}`;

  // 1. Try Firebase Storage
  try {
    const storageRef = ref(storage, `apps/${filename}`);
    await uploadBytes(storageRef, file);
    const downloadUrl = await getDownloadURL(storageRef);
    if (downloadUrl) return downloadUrl;
  } catch (storageErr) {
    console.warn("[AppLegalService] Firebase Storage upload failed, attempting fallback:", storageErr);
  }

  // 2. Fallback to /api/upload-image
  try {
    const base64Data = await fileToBase64(file);
    const res = await fetch("/api/upload-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename,
        base64Data,
        folder: "apps",
      }),
    });
    const data = await res.json();
    if (res.ok && data?.url) {
      return data.url;
    }
    throw new Error(data?.error || "Upload fallback failed");
  } catch (apiErr: any) {
    console.error("[AppLegalService] Local upload fallback also failed:", apiErr);
    throw new Error(apiErr?.message || "Failed to upload app logo.");
  }
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
  });
}

/**
 * Submit user data deletion request (public form)
 */
export async function submitDataDeletionRequest(
  data: Omit<AppDataDeletionRequest, "id" | "createdAt" | "status">
): Promise<string> {
  const colRef = collection(db, DELETIONS_COLLECTION);
  const docRef = await addDoc(colRef, {
    ...data,
    status: "pending",
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Get all data deletion requests (Admin only)
 */
export async function getAllDataDeletionRequests(): Promise<AppDataDeletionRequest[]> {
  try {
    const q = query(collection(db, DELETIONS_COLLECTION), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    const list: AppDataDeletionRequest[] = [];
    snap.forEach((d) => {
      list.push({ id: d.id, ...d.data() } as AppDataDeletionRequest);
    });
    return list;
  } catch (err) {
    try {
      const snap = await getDocs(collection(db, DELETIONS_COLLECTION));
      const list: AppDataDeletionRequest[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as AppDataDeletionRequest);
      });
      return list;
    } catch (fallbackErr) {
      console.error("Error fetching data deletion requests:", fallbackErr);
      return [];
    }
  }
}

/**
 * Update deletion request status (Admin only)
 */
export async function updateDataDeletionRequestStatus(
  id: string,
  status: AppDataDeletionRequest["status"]
): Promise<void> {
  const docRef = doc(db, DELETIONS_COLLECTION, id);
  await updateDoc(docRef, { status, updatedAt: serverTimestamp() });
}
