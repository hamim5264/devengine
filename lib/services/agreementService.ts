import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import {
  AgreementRecord,
  AgreementStatus,
  AgreementAddendumRecord,
  AgreementClauseTemplate,
} from "@/types/agreement";

const AGREEMENTS_COLLECTION = "agreements";
const ADDENDA_COLLECTION = "agreement_addenda";
const TEMPLATES_COLLECTION = "agreement_templates";

/**
 * Generate sequential Agreement ID like DEV-AGR-2026-0001
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
 * Generate Addendum ID like DEV-ADD-2026-0001
 */
export async function generateNextAddendumNumber(parentAgreementNumber?: string): Promise<string> {
  const currentYear = new Date().getFullYear();
  try {
    const colRef = collection(db, ADDENDA_COLLECTION);
    const snap = await getDocs(colRef);
    const count = snap.size + 1;
    const padded = String(count).padStart(4, "0");
    if (parentAgreementNumber) {
      return `${parentAgreementNumber}-ADD-${padded}`;
    }
    return `DEV-ADD-${currentYear}-${padded}`;
  } catch (err) {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    return `DEV-ADD-${currentYear}-${randomSuffix}`;
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
    console.error("Failed to load agreements with order:", err);
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
      revisionToken: `rev_${Date.now()}`,
      concurrencyVersion: 1,
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
 * Update an existing agreement document with optimistic locking and executed-state guards
 */
export async function updateAgreement(
  id: string,
  updates: Partial<AgreementRecord>,
  userEmail: string = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "hamim.leon@gmail.com",
  expectedRevisionToken?: string
): Promise<void> {
  try {
    const docRef = doc(db, AGREEMENTS_COLLECTION, id);
    const now = new Date().toISOString();

    const existingSnap = await getDoc(docRef);
    if (!existingSnap.exists()) {
      throw new Error(`Agreement ${id} not found.`);
    }

    const existing = existingSnap.data() as AgreementRecord;

    // Guard: Prevent direct modification of Executed contracts without Addendum
    if (existing.status === "executed" && updates.status !== "amended" && updates.status !== "superseded" && updates.status !== "terminated") {
      throw new Error("This agreement has been signed and executed. To modify commercial or legal terms, create a formal Contract Addendum.");
    }

    // Concurrency check
    if (expectedRevisionToken && existing.revisionToken && expectedRevisionToken !== existing.revisionToken) {
      throw new Error("Conflict detected: This agreement was modified by another administrator since you opened it. Please refresh and review changes.");
    }

    const auditTrail = existing.auditTrail || [];
    auditTrail.push({
      action: "Agreement Updated",
      performedBy: userEmail,
      timestamp: now,
      details: `Status: ${updates.status || existing.status || "Draft"} • Version: ${updates.version || existing.version || "1.0"}`,
      version: updates.version || existing.version || "1.0",
    });

    const nextConcurrency = (existing.concurrencyVersion || 1) + 1;
    const newRevisionToken = `rev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const payload = cleanForFirestore({
      ...updates,
      concurrencyVersion: nextConcurrency,
      revisionToken: newRevisionToken,
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
 * Record genuine signature execution and transition status to 'executed'
 */
export async function recordAgreementSignature(
  id: string,
  params: {
    signedBy: string;
    signingMethod: "electronic" | "manual_upload" | "in_person";
    signedPdfUrl?: string;
    adminEmail?: string;
  }
): Promise<void> {
  const docRef = doc(db, AGREEMENTS_COLLECTION, id);
  const now = new Date().toISOString();
  const existingSnap = await getDoc(docRef);
  if (!existingSnap.exists()) throw new Error("Agreement not found");
  const existing = existingSnap.data() as AgreementRecord;

  const auditTrail = existing.auditTrail || [];
  auditTrail.push({
    action: "Agreement Formally Executed",
    performedBy: params.adminEmail || "Admin",
    timestamp: now,
    details: `Executed via ${params.signingMethod} by ${params.signedBy}`,
  });

  const payload: Partial<AgreementRecord> = {
    status: "executed",
    executedAt: now,
    executedBy: params.signedBy,
    signedPdfUrl: params.signedPdfUrl || existing.pdfUrl,
    signatureMetadata: {
      signedBy: params.signedBy,
      signingMethod: params.signingMethod,
      signedAt: now,
      verifiedByAdmin: true,
    },
    updatedAt: now,
    auditTrail,
  };

  await updateDoc(docRef, cleanForFirestore(payload));
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
      signedPdfUrl: undefined,
      signatureMetadata: undefined,
      finalizedAt: undefined,
      finalizedBy: undefined,
      executedAt: undefined,
      executedBy: undefined,
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
 * Finalize agreement snapshot, upload PDF to Firebase Storage, store URL, and lock status
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
        const agreementSnap = await getDoc(docRef);
        const agreementData = agreementSnap.data() as AgreementRecord | undefined;
        const filename = `${agreementData?.agreementNumber || id}_v${agreementData?.version || "1.0"}_${Date.now()}.pdf`;
        storagePath = `agreements/${id}/${filename}`;
        const storageRef = ref(storage, storagePath);

        const uploadTimeout = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Storage upload timed out after 5s")), 5000)
        );

        await Promise.race([uploadBytes(storageRef, pdfBlob), uploadTimeout]);
        pdfUrl = await getDownloadURL(storageRef);
      } catch (storageErr) {
        console.warn("Storage upload skipped or timed out, finalizing Firestore record:", storageErr);
      }
    }

    const existingSnap = await getDoc(docRef);
    const existing = existingSnap.data() as AgreementRecord | undefined;
    const auditTrail = existing?.auditTrail || [];

    auditTrail.push({
      action: "Agreement Snapshot Finalized",
      performedBy: userEmail,
      timestamp: now,
      details: pdfUrl ? "PDF generated and securely archived to cloud storage" : "Finalized snapshot recorded without cloud upload",
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

/**
 * Find agreement linked to a staff member (by agreementId, staffId, or contributorEmail)
 */
export async function getAgreementForStaff(params: {
  agreementId?: string;
  staffId?: string;
  staffEmail?: string;
}): Promise<AgreementRecord | null> {
  try {
    if (params.agreementId) {
      const agr = await getAgreement(params.agreementId);
      if (agr) return agr;
    }

    const colRef = collection(db, AGREEMENTS_COLLECTION);
    const snap = await getDocs(colRef);
    const emailNorm = params.staffEmail?.trim().toLowerCase();

    for (const docSnap of snap.docs) {
      const data = { id: docSnap.id, ...docSnap.data() } as AgreementRecord;
      if (
        (data as any).staffId === params.staffId ||
        (data as any).staffUid === params.staffId ||
        (emailNorm && (
          data.developer?.email?.trim().toLowerCase() === emailNorm ||
          (data as any).contributor?.contributorEmail?.trim().toLowerCase() === emailNorm
        ))
      ) {
        return data;
      }
    }
    return null;
  } catch (err) {
    console.error("Error in getAgreementForStaff:", err);
    return null;
  }
}

/* ========================================================
   ADDENDUM & AMENDMENT MANAGEMENT SERVICES (PHASE 4 & 6)
======================================================== */

/**
 * Create a new Contract Addendum linked to parent agreement
 */
export async function createAgreementAddendum(
  data: Omit<AgreementAddendumRecord, "id">,
  userEmail: string = "hamim.leon@gmail.com"
): Promise<string> {
  try {
    const colRef = collection(db, ADDENDA_COLLECTION);
    const newDoc = doc(colRef);
    const now = new Date().toISOString();

    const record: AgreementAddendumRecord = {
      ...data,
      id: newDoc.id,
      createdAt: now,
      updatedAt: now,
      createdBy: userEmail,
      auditTrail: [
        {
          action: "Addendum Draft Created",
          performedBy: userEmail,
          timestamp: now,
          details: `Linked to parent agreement ${data.parentAgreementNumber}`,
        },
      ],
    };

    await setDoc(newDoc, cleanForFirestore(record));

    // Link addendum reference to parent agreement record
    const parentDocRef = doc(db, AGREEMENTS_COLLECTION, data.parentAgreementId);
    const parentSnap = await getDoc(parentDocRef);
    if (parentSnap.exists()) {
      const parentData = parentSnap.data() as AgreementRecord;
      const existingAddenda = parentData.addendaIds || [];
      if (!existingAddenda.includes(newDoc.id)) {
        await updateDoc(parentDocRef, {
          addendaIds: [...existingAddenda, newDoc.id],
          latestAddendumNumber: data.addendumNumber,
          updatedAt: now,
        });
      }
    }

    return newDoc.id;
  } catch (err) {
    console.error("Error creating agreement addendum:", err);
    throw err;
  }
}

/**
 * Fetch all addenda for a parent agreement
 */
export async function getAddendaForAgreement(parentAgreementId: string): Promise<AgreementAddendumRecord[]> {
  try {
    const colRef = collection(db, ADDENDA_COLLECTION);
    const q = query(colRef, where("parentAgreementId", "==", parentAgreementId));
    const snap = await getDocs(q);
    const results: AgreementAddendumRecord[] = [];
    snap.forEach((d) => {
      results.push({ id: d.id, ...(d.data() as any) });
    });
    return results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    console.error(`Error loading addenda for agreement ${parentAgreementId}:`, err);
    return [];
  }
}

/**
 * Fetch a single addendum by ID
 */
export async function getAgreementAddendum(id: string): Promise<AgreementAddendumRecord | null> {
  try {
    const docRef = doc(db, ADDENDA_COLLECTION, id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return { id: snap.id, ...(snap.data() as any) };
  } catch (err) {
    console.error(`Error fetching addendum ${id}:`, err);
    throw err;
  }
}

/**
 * Update an addendum draft
 */
export async function updateAgreementAddendum(
  id: string,
  updates: Partial<AgreementAddendumRecord>,
  userEmail: string = "hamim.leon@gmail.com"
): Promise<void> {
  try {
    const docRef = doc(db, ADDENDA_COLLECTION, id);
    const now = new Date().toISOString();
    const existingSnap = await getDoc(docRef);
    const existing = existingSnap.data() as AgreementAddendumRecord | undefined;
    const auditTrail = existing?.auditTrail || [];

    auditTrail.push({
      action: "Addendum Updated",
      performedBy: userEmail,
      timestamp: now,
    });

    const payload = cleanForFirestore({
      ...updates,
      updatedAt: now,
      auditTrail,
    });

    await updateDoc(docRef, payload);
  } catch (err) {
    console.error(`Error updating addendum ${id}:`, err);
    throw err;
  }
}

/**
 * Finalize an addendum, store PDF, and update parent agreement status to 'amended'
 */
export async function finalizeAgreementAddendum(
  id: string,
  userEmail: string = "hamim.leon@gmail.com",
  pdfBlob?: Blob
): Promise<{ pdfUrl?: string }> {
  try {
    const docRef = doc(db, ADDENDA_COLLECTION, id);
    const now = new Date().toISOString();
    let pdfUrl: string | undefined = undefined;

    if (pdfBlob) {
      try {
        const addendumSnap = await getDoc(docRef);
        const addendumData = addendumSnap.data() as AgreementAddendumRecord | undefined;
        const filename = `${addendumData?.addendumNumber || id}_${Date.now()}.pdf`;
        const storageRef = ref(storage, `addenda/${id}/${filename}`);
        await uploadBytes(storageRef, pdfBlob);
        pdfUrl = await getDownloadURL(storageRef);
      } catch (storageErr) {
        console.warn("Storage upload for addendum skipped:", storageErr);
      }
    }

    const existingSnap = await getDoc(docRef);
    const existing = existingSnap.data() as AgreementAddendumRecord;
    const auditTrail = existing.auditTrail || [];

    auditTrail.push({
      action: "Addendum Finalized & Executed",
      performedBy: userEmail,
      timestamp: now,
      details: "Takes legal precedence over amended clauses in parent contract.",
    });

    const payload: Partial<AgreementAddendumRecord> = {
      status: "executed",
      executedAt: now,
      executedBy: userEmail,
      updatedAt: now,
      auditTrail,
    };
    if (pdfUrl) payload.pdfUrl = pdfUrl;

    await updateDoc(docRef, cleanForFirestore(payload));

    // Update parent agreement status to 'amended'
    if (existing.parentAgreementId) {
      const parentDocRef = doc(db, AGREEMENTS_COLLECTION, existing.parentAgreementId);
      const parentSnap = await getDoc(parentDocRef);
      if (parentSnap.exists()) {
        const parentAudit = (parentSnap.data() as AgreementRecord).auditTrail || [];
        parentAudit.push({
          action: "Agreement Amended via Addendum",
          performedBy: userEmail,
          timestamp: now,
          details: `Addendum ${existing.addendumNumber} formally executed.`,
        });
        await updateDoc(parentDocRef, {
          status: "amended",
          latestAddendumNumber: existing.addendumNumber,
          updatedAt: now,
          auditTrail: parentAudit,
        });
      }
    }

    return { pdfUrl };
  } catch (err) {
    console.error(`Error finalizing addendum ${id}:`, err);
    throw err;
  }
}
