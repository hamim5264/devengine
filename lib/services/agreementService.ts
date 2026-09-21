import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { AgreementRecord, AgreementStatus } from "@/types/agreement";

const AGREEMENTS_COLLECTION = "agreements";

/**
 * Generate sequential or timestamped Agreement ID like DEV-AGR-2026-0001
 */
export async function generateNextAgreementNumber(): Promise<string> {
  const currentYear = new Date().getFullYear();
  try {
    const colRef = collection(db, AGREEMENTS_COLLECTION);
    const snap = await getDocs(colRef);
    const count = snap.size + 1;
    const padded = String(count).padStart(4, "0");
    return `DEV-AGR-${currentYear}-${padded}`;
  } catch (err) {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    return `DEV-AGR-${currentYear}-${randomSuffix}`;
  }
}

/**
 * Fetch all agreements sorted by creation date descending
 */
export async function getAgreements(): Promise<AgreementRecord[]> {
  try {
    const colRef = collection(db, AGREEMENTS_COLLECTION);
    const q = query(colRef, orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    const results: AgreementRecord[] = [];
    snap.forEach((docSnap) => {
      results.push({ id: docSnap.id, ...(docSnap.data() as any) });
    });
    return results;
  } catch (err) {
    console.error("Failed to load agreements:", err);
    // Fallback if index on createdAt is still warming up
    try {
      const snap = await getDocs(collection(db, AGREEMENTS_COLLECTION));
      const results: AgreementRecord[] = [];
      snap.forEach((docSnap) => {
        results.push({ id: docSnap.id, ...(docSnap.data() as any) });
      });
      return results.sort(
        (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );
    } catch (fallbackErr) {
      console.error("Fallback load failed:", fallbackErr);
      return [];
    }
  }
}

/**
 * Fetch single agreement by ID
 */
export async function getAgreement(id: string): Promise<AgreementRecord | null> {
  try {
    const docRef = doc(db, AGREEMENTS_COLLECTION, id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return { id: snap.id, ...(snap.data() as any) };
  } catch (err) {
    console.error(`Failed to fetch agreement ${id}:`, err);
    throw err;
  }
}

/**
 * Recursively strips undefined keys so Firestore never throws 'Unsupported field value: undefined'
 */
function cleanForFirestore<T>(data: T): T {
  if (data === null || data === undefined) return null as any;
  return JSON.parse(JSON.stringify(data));
}

/**
 * Create a new agreement document
 */
export async function createAgreement(record: Omit<AgreementRecord, "id">): Promise<string> {
  try {
    const colRef = collection(db, AGREEMENTS_COLLECTION);
    const newDoc = doc(colRef);
    const now = new Date().toISOString();

    const data: AgreementRecord = {
      ...record,
      id: newDoc.id,
      createdAt: record.createdAt || now,
      updatedAt: now,
    };

    const sanitizedData = cleanForFirestore(data);
    await setDoc(newDoc, sanitizedData);
    return newDoc.id;
  } catch (err) {
    console.error("Error creating agreement:", err);
    throw err;
  }
}

/**
 * Update an existing agreement document
 */
export async function updateAgreement(
  id: string,
  updates: Partial<AgreementRecord>,
  userEmail: string = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "hamim.leon@gmail.com"
): Promise<void> {
  try {
    const docRef = doc(db, AGREEMENTS_COLLECTION, id);
    const now = new Date().toISOString();

    const existingSnap = await getDoc(docRef);
    const existing = existingSnap.data() as AgreementRecord | undefined;
    const auditTrail = existing?.auditTrail || [];

    auditTrail.push({
      action: "Agreement Updated",
      performedBy: userEmail,
      timestamp: now,
      details: `Status: ${updates.status || existing?.status || "Draft"}`,
    });

    const payload = cleanForFirestore({
      ...updates,
      updatedAt: now,
      updatedBy: userEmail,
      auditTrail,
    });

    await updateDoc(docRef, payload);
  } catch (err) {
    console.error(`Error updating agreement ${id}:`, err);
    throw err;
  }
}

/**
 * Duplicate an existing agreement as a new Draft
 */
export async function duplicateAgreement(
  id: string,
  userEmail: string = "hamim.leon@gmail.com"
): Promise<string> {
  try {
    const original = await getAgreement(id);
    if (!original) throw new Error("Original agreement not found");

    const newNumber = await generateNextAgreementNumber();
    const now = new Date().toISOString();

    const duplicatePayload: Omit<AgreementRecord, "id"> = {
      ...original,
      agreementNumber: newNumber,
      status: "draft",
      version: "1.0",
      pdfUrl: undefined,
      storagePath: undefined,
      finalizedAt: undefined,
      finalizedBy: undefined,
      createdBy: userEmail,
      createdAt: now,
      updatedBy: userEmail,
      updatedAt: now,
      project: {
        ...original.project,
        projectName: `${original.project.projectName} (Copy)`,
        agreementEffectiveDate: now.split("T")[0],
      },
      auditTrail: [
        {
          action: "Agreement Duplicated",
          performedBy: userEmail,
          timestamp: now,
          details: `Cloned from agreement ${original.agreementNumber} (${original.id})`,
        },
      ],
    };

    return await createAgreement(duplicatePayload);
  } catch (err) {
    console.error(`Error duplicating agreement ${id}:`, err);
    throw err;
  }
}

/**
 * Update agreement lifecycle status
 */
export async function updateAgreementStatus(
  id: string,
  newStatus: AgreementStatus,
  userEmail: string = "hamim.leon@gmail.com"
): Promise<void> {
  try {
    const docRef = doc(db, AGREEMENTS_COLLECTION, id);
    const now = new Date().toISOString();

    const existingSnap = await getDoc(docRef);
    const existing = existingSnap.data() as AgreementRecord | undefined;
    const auditTrail = existing?.auditTrail || [];

    auditTrail.push({
      action: `Status Changed to ${newStatus}`,
      performedBy: userEmail,
      timestamp: now,
    });

    await updateDoc(docRef, {
      status: newStatus,
      updatedAt: now,
      updatedBy: userEmail,
      auditTrail,
    });
  } catch (err) {
    console.error(`Error updating agreement status for ${id}:`, err);
    throw err;
  }
}

/**
 * Finalize agreement, upload PDF to Firebase Storage, store URL, and lock status
 */
export async function finalizeAgreement(
  id: string,
  userEmail: string = "hamim.leon@gmail.com",
  pdfBlob?: Blob
): Promise<{ pdfUrl?: string }> {
  try {
    const docRef = doc(db, AGREEMENTS_COLLECTION, id);
    const now = new Date().toISOString();
    let pdfUrl: string | undefined = undefined;
    let storagePath: string | undefined = undefined;

    if (pdfBlob) {
      try {
        storagePath = `agreements/${id}/agreement.pdf`;
        const storageRef = ref(storage, storagePath);

        const uploadTask = uploadBytes(storageRef, pdfBlob, {
          contentType: "application/pdf",
        }).then((snapshot) => getDownloadURL(snapshot.ref));

        const timeoutTask = new Promise<string>((_, reject) =>
          setTimeout(() => reject(new Error("Storage upload timed out (exceeded 4s)")), 4000)
        );

        pdfUrl = await Promise.race([uploadTask, timeoutTask]);
      } catch (storageErr) {
        console.warn("Storage upload completed with fallback or timed out:", storageErr);
      }
    }

    const existingSnap = await getDoc(docRef);
    const existing = existingSnap.data() as AgreementRecord | undefined;
    const auditTrail = existing?.auditTrail || [];

    auditTrail.push({
      action: "Agreement Finalized",
      performedBy: userEmail,
      timestamp: now,
      details: pdfUrl ? "PDF generated and securely archived to cloud storage" : "Finalized without storage upload",
    });

    const payload: any = {
      status: "finalized",
      finalizedAt: now,
      finalizedBy: userEmail,
      updatedAt: now,
      updatedBy: userEmail,
      auditTrail,
    };

    if (pdfUrl) {
      payload.pdfUrl = pdfUrl;
      payload.storagePath = storagePath;
    }

    await updateDoc(docRef, cleanForFirestore(payload));
    return { pdfUrl };
  } catch (err) {
    console.error(`Error finalizing agreement ${id}:`, err);
    throw err;
  }
}

/**
 * Delete agreement document
 */
export async function deleteAgreement(id: string): Promise<void> {
  try {
    const docRef = doc(db, AGREEMENTS_COLLECTION, id);
    await deleteDoc(docRef);
  } catch (err) {
    console.error(`Error deleting agreement ${id}:`, err);
    throw err;
  }
}
