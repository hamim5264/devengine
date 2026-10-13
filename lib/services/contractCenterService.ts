// lib/services/contractCenterService.ts
// ─────────────────────────────────────────────────────────────
// DevEngine Contract Center — Firestore CRUD & Business Logic
// ─────────────────────────────────────────────────────────────

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
  limit,
  runTransaction,
  writeBatch,
  serverTimestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import type {
  CCClient,
  CCProject,
  CCQuotation,
  CCNDA,
  CCServiceAgreement,
  CCSOW,
  CCChangeOrder,
  CCSignatureRequest,
  CCMilestoneRecord,
  CCDocumentTemplate,
  CCClauseLibraryItem,
  CCAuditEvent,
  CCSettings,
  CCNumberSequence,
  CCDashboardMetrics,
  CCQuotationStatus,
} from "@/types/contractCenter";

// ════════════════════════════════════════════
// COLLECTION NAMES
// ════════════════════════════════════════════

export const COLLECTIONS = {
  clients: "cc_clients",
  projects: "cc_projects",
  quotations: "cc_quotations",
  ndas: "cc_ndas",
  agreements: "cc_service_agreements",
  sow: "cc_sow",
  changeOrders: "cc_change_orders",
  signatures: "cc_signatures",
  milestones: "cc_milestones",
  templates: "cc_templates",
  clauses: "cc_clauses",
  auditTrail: "cc_audit_trail",
  numberSequences: "cc_number_sequences",
  settings: "cc_settings",
} as const;

// ════════════════════════════════════════════
// UTILITY: Clean undefined for Firestore
// ════════════════════════════════════════════

function cleanForFirestore<T>(data: T): T {
  if (data === null || data === undefined) return null as any;
  return JSON.parse(JSON.stringify(data));
}

// ════════════════════════════════════════════
// NUMBER SEQUENCE (Concurrency-safe)
// ════════════════════════════════════════════

export async function generateNextNumber(
  type: string,
  prefix: string = "DEV"
): Promise<string> {
  const currentYear = new Date().getFullYear();
  const seqId = `${type}_${currentYear}`;
  const seqRef = doc(db, COLLECTIONS.numberSequences, seqId);

  try {
    const nextNum = await runTransaction(db, async (transaction) => {
      const seqDoc = await transaction.get(seqRef);
      let lastNumber = 0;

      if (seqDoc.exists()) {
        lastNumber = seqDoc.data().lastNumber || 0;
      }

      const newNumber = lastNumber + 1;
      transaction.set(seqRef, {
        id: seqId,
        prefix,
        currentYear,
        lastNumber: newNumber,
        updatedAt: new Date().toISOString(),
      });

      return newNumber;
    });

    const padded = String(nextNum).padStart(4, "0");
    return `${prefix}-${currentYear}-${padded}`;
  } catch (err) {
    // Fallback: use timestamp-based unique number
    console.error("Transaction failed for number generation:", err);
    const fallback = Date.now().toString().slice(-6);
    return `${prefix}-${currentYear}-${fallback}`;
  }
}

// ════════════════════════════════════════════
// AUDIT TRAIL (Append-only)
// ════════════════════════════════════════════

export async function recordAuditEvent(event: Omit<CCAuditEvent, "id">): Promise<string> {
  try {
    const colRef = collection(db, COLLECTIONS.auditTrail);
    const newDoc = doc(colRef);
    const record: CCAuditEvent = {
      ...event,
      id: newDoc.id,
      timestamp: event.timestamp || new Date().toISOString(),
    };
    await setDoc(newDoc, cleanForFirestore(record));
    return newDoc.id;
  } catch (err) {
    console.error("Failed to record audit event:", err);
    throw err;
  }
}

export async function getAuditTrail(
  filtersOrLimit?: number | {
    documentType?: string;
    documentId?: string;
    performedBy?: string;
  },
  maxResults: number = 100
): Promise<CCAuditEvent[]> {
  try {
    const actualLimit = typeof filtersOrLimit === "number" ? filtersOrLimit : maxResults;
    const filters = typeof filtersOrLimit === "object" ? filtersOrLimit : undefined;

    const colRef = collection(db, COLLECTIONS.auditTrail);
    let q = query(colRef, orderBy("timestamp", "desc"), limit(actualLimit));
    const snap = await getDocs(q);
    let results: CCAuditEvent[] = [];
    snap.forEach((d) => results.push({ id: d.id, ...d.data() } as CCAuditEvent));
    
    // Client-side filtering (Firestore compound queries require indexes)
    if (filters?.documentType) {
      results = results.filter((r) => r.documentType === filters.documentType);
    }
    if (filters?.documentId) {
      results = results.filter((r) => r.documentId === filters.documentId);
    }
    if (filters?.performedBy) {
      results = results.filter((r) => r.performedBy === filters.performedBy);
    }
    
    return results;
  } catch (err) {
    console.error("Failed to load audit trail:", err);
    return [];
  }
}

// ════════════════════════════════════════════
// CLIENTS
// ════════════════════════════════════════════

export async function createClient(
  client: Omit<CCClient, "id" | "clientNumber" | "createdAt" | "updatedAt"> & {
    createdAt?: string;
    updatedAt?: string;
  },
  _performedBy?: string
): Promise<string> {
  const colRef = collection(db, COLLECTIONS.clients);
  const newDoc = doc(colRef);
  const clientNumber = await generateNextNumber("client", "DEV-CLI");
  const now = new Date().toISOString();

  const record: CCClient = {
    ...client,
    id: newDoc.id,
    clientNumber,
    createdAt: client.createdAt || now,
    updatedAt: now,
  };

  await setDoc(newDoc, cleanForFirestore(record));
  await recordAuditEvent({
    action: "Client Created",
    performedBy: _performedBy || client.createdBy,
    timestamp: now,
    documentType: "quotation",
    documentId: newDoc.id,
    documentRef: clientNumber,
    details: `Created client: ${client.legalName}`,
  });
  return newDoc.id;
}

export async function getClients(): Promise<CCClient[]> {
  try {
    const snap = await getDocs(
      query(collection(db, COLLECTIONS.clients), orderBy("createdAt", "desc"))
    );
    const results: CCClient[] = [];
    snap.forEach((d) => results.push({ id: d.id, ...d.data() } as CCClient));
    return results;
  } catch (err) {
    console.error("Failed to load clients:", err);
    // Fallback without orderBy (index might not exist yet)
    try {
      const snap = await getDocs(collection(db, COLLECTIONS.clients));
      const results: CCClient[] = [];
      snap.forEach((d) => results.push({ id: d.id, ...d.data() } as CCClient));
      return results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch {
      return [];
    }
  }
}

export async function getClient(id: string): Promise<CCClient | null> {
  try {
    const snap = await getDoc(doc(db, COLLECTIONS.clients, id));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as CCClient;
  } catch (err) {
    console.error(`Failed to fetch client ${id}:`, err);
    return null;
  }
}

export async function updateClient(
  id: string,
  updates: Partial<CCClient>,
  userEmail: string
): Promise<void> {
  const now = new Date().toISOString();
  await updateDoc(doc(db, COLLECTIONS.clients, id), cleanForFirestore({
    ...updates,
    updatedBy: userEmail,
    updatedAt: now,
  }));
  await recordAuditEvent({
    action: "Client Updated",
    performedBy: userEmail,
    timestamp: now,
    documentId: id,
    details: `Updated client record`,
  });
}

export async function deleteClient(id: string, userEmail: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTIONS.clients, id));
  await recordAuditEvent({
    action: "Client Deleted",
    performedBy: userEmail,
    timestamp: new Date().toISOString(),
    documentId: id,
  });
}

// ════════════════════════════════════════════
// PROJECTS
// ════════════════════════════════════════════

export async function createProject(
  project: Omit<CCProject, "id" | "projectNumber" | "createdAt" | "updatedAt"> & {
    createdAt?: string;
    updatedAt?: string;
  },
  _performedBy?: string
): Promise<string> {
  const colRef = collection(db, COLLECTIONS.projects);
  const newDoc = doc(colRef);
  const projectNumber = await generateNextNumber("project", "DEV-PRJ");
  const now = new Date().toISOString();

  const record: CCProject = {
    ...project,
    id: newDoc.id,
    projectNumber,
    createdAt: project.createdAt || now,
    updatedAt: now,
  };

  await setDoc(newDoc, cleanForFirestore(record));
  await recordAuditEvent({
    action: "Project Created",
    performedBy: _performedBy || project.createdBy,
    timestamp: now,
    documentId: newDoc.id,
    documentRef: projectNumber,
    details: `Created project: ${project.title}`,
  });
  return newDoc.id;
}

export async function getProjects(clientId?: string): Promise<CCProject[]> {
  try {
    const colRef = collection(db, COLLECTIONS.projects);
    const snap = await getDocs(colRef);
    let results: CCProject[] = [];
    snap.forEach((d) => results.push({ id: d.id, ...d.data() } as CCProject));
    if (clientId) {
      results = results.filter((p) => p.clientId === clientId);
    }
    return results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    console.error("Failed to load projects:", err);
    return [];
  }
}

export async function getProject(id: string): Promise<CCProject | null> {
  try {
    const snap = await getDoc(doc(db, COLLECTIONS.projects, id));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as CCProject;
  } catch (err) {
    console.error(`Failed to fetch project ${id}:`, err);
    return null;
  }
}

export async function updateProject(
  id: string,
  updates: Partial<CCProject>,
  userEmail: string
): Promise<void> {
  const now = new Date().toISOString();
  await updateDoc(doc(db, COLLECTIONS.projects, id), cleanForFirestore({
    ...updates,
    updatedBy: userEmail,
    updatedAt: now,
  }));
}

// ════════════════════════════════════════════
// QUOTATIONS
// ════════════════════════════════════════════

export async function createQuotation(
  quotation: any,
  _performedBy?: string
): Promise<string> {
  const colRef = collection(db, COLLECTIONS.quotations);
  const newDoc = doc(colRef);
  const quotationNumber = await generateNextNumber("quotation", "DEV-QUO");
  const now = new Date().toISOString();

  const record: CCQuotation = {
    ...quotation,
    id: newDoc.id,
    quotationNumber,
    revisionToken: `rev_${Date.now()}`,
    concurrencyVersion: 1,
    createdAt: quotation.createdAt || now,
    updatedAt: now,
    auditTrail: [
      {
        action: "Quotation Created",
        performedBy: quotation.createdBy,
        timestamp: now,
        details: `Created ${quotationNumber} v${quotation.version || 1}`,
      },
    ],
  };

  await setDoc(newDoc, cleanForFirestore(record));
  await recordAuditEvent({
    action: "Quotation Created",
    performedBy: quotation.createdBy,
    timestamp: now,
    documentType: "quotation",
    documentId: newDoc.id,
    documentRef: quotationNumber,
    details: `Created quotation: ${quotation.title}`,
  });
  return newDoc.id;
}

export async function getQuotations(filters?: {
  clientId?: string;
  projectId?: string;
  status?: CCQuotationStatus;
}): Promise<CCQuotation[]> {
  try {
    const snap = await getDocs(collection(db, COLLECTIONS.quotations));
    let results: CCQuotation[] = [];
    snap.forEach((d) => results.push({ id: d.id, ...d.data() } as CCQuotation));
    
    if (filters?.clientId) results = results.filter((q) => q.clientId === filters.clientId);
    if (filters?.projectId) results = results.filter((q) => q.projectId === filters.projectId);
    if (filters?.status) results = results.filter((q) => q.status === filters.status);
    
    return results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    console.error("Failed to load quotations:", err);
    return [];
  }
}

export async function getQuotation(id: string): Promise<CCQuotation | null> {
  try {
    const snap = await getDoc(doc(db, COLLECTIONS.quotations, id));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as CCQuotation;
  } catch (err) {
    console.error(`Failed to fetch quotation ${id}:`, err);
    return null;
  }
}

export async function updateQuotation(
  id: string,
  updates: Partial<CCQuotation>,
  userEmail: string,
  expectedRevisionToken?: string
): Promise<void> {
  const docRef = doc(db, COLLECTIONS.quotations, id);
  const now = new Date().toISOString();

  const existingSnap = await getDoc(docRef);
  if (!existingSnap.exists()) throw new Error(`Quotation ${id} not found.`);
  const existing = existingSnap.data() as CCQuotation;

  // Concurrency check
  if (expectedRevisionToken && existing.revisionToken && expectedRevisionToken !== existing.revisionToken) {
    throw new Error("Conflict: This quotation was modified since you opened it. Please refresh.");
  }

  // Guard: sent/accepted quotations need new revision for substantive edits
  const lockedStatuses: CCQuotationStatus[] = ["sent", "viewed", "accepted", "expired"];
  if (lockedStatuses.includes(existing.status) && !updates.status) {
    throw new Error(
      "This quotation has been sent. Create a new revision to make substantive edits."
    );
  }

  const auditTrail = [...(existing.auditTrail || [])];
  auditTrail.push({
    action: "Quotation Updated",
    performedBy: userEmail,
    timestamp: now,
    details: updates.status ? `Status changed to ${updates.status}` : "Content updated",
  });

  const payload = cleanForFirestore({
    ...updates,
    revisionToken: `rev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    concurrencyVersion: (existing.concurrencyVersion || 1) + 1,
    updatedBy: userEmail,
    updatedAt: now,
    auditTrail,
  });

  await updateDoc(docRef, payload);
}

export async function duplicateQuotation(
  id: string,
  userEmail: string
): Promise<string> {
  const original = await getQuotation(id);
  if (!original) throw new Error("Original quotation not found");

  const { id: _id, quotationNumber: _num, ...rest } = original;
  return await createQuotation({
    ...rest,
    title: `${original.title} (Copy)`,
    version: 1,
    parentQuotationId: original.id,
    status: "draft",
    pdfUrl: undefined,
    pdfStoragePath: undefined,
    documentHash: undefined,
    sentAt: undefined,
    viewedAt: undefined,
    clientResponseAt: undefined,
    internalApprovedBy: undefined,
    internalApprovedAt: undefined,
    createdBy: userEmail,
  });
}

// ════════════════════════════════════════════
// QUOTATION CALCULATIONS (Decimal-safe)
// ════════════════════════════════════════════

export function calculateQuotationTotals(
  lineItems: CCQuotation["lineItems"],
  approvedExpenses: number = 0
): {
  subtotal: number;
  totalDiscount: number;
  totalTax: number;
  grandTotal: number;
  lineItems: CCQuotation["lineItems"];
} {
  let subtotal = 0;
  let totalDiscount = 0;
  let totalTax = 0;

  const calculatedItems = lineItems.map((item) => {
    const baseAmount = Math.round(item.quantity * item.unitPrice * 100) / 100;
    
    let discountAmount = 0;
    if (item.discountPercent && item.discountPercent > 0) {
      discountAmount = Math.round(baseAmount * (item.discountPercent / 100) * 100) / 100;
    } else if (item.discountAmount && item.discountAmount > 0) {
      discountAmount = item.discountAmount;
    }

    const afterDiscount = baseAmount - discountAmount;

    let taxAmount = 0;
    if (item.taxRate && item.taxRate > 0 && !item.taxInclusive) {
      taxAmount = Math.round(afterDiscount * (item.taxRate / 100) * 100) / 100;
    }

    const lineTotal = Math.round((afterDiscount + taxAmount) * 100) / 100;

    subtotal += baseAmount;
    totalDiscount += discountAmount;
    totalTax += taxAmount;

    return { ...item, lineTotal };
  });

  const grandTotal = Math.round((subtotal - totalDiscount + totalTax + approvedExpenses) * 100) / 100;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    totalDiscount: Math.round(totalDiscount * 100) / 100,
    totalTax: Math.round(totalTax * 100) / 100,
    grandTotal,
    lineItems: calculatedItems,
  };
}

// ════════════════════════════════════════════
// NDAs
// ════════════════════════════════════════════

export async function createNDA(
  nda: Omit<CCNDA, "id" | "ndaNumber" | "createdAt" | "updatedAt" | "version"> & {
    version?: number;
    createdAt?: string;
    updatedAt?: string;
  },
  _performedBy?: string
): Promise<string> {
  const colRef = collection(db, COLLECTIONS.ndas);
  const newDoc = doc(colRef);
  const ndaNumber = await generateNextNumber("nda", "DEV-NDA");
  const now = new Date().toISOString();

  const record: CCNDA = {
    ...nda,
    id: newDoc.id,
    ndaNumber,
    version: nda.version ?? 1,
    createdAt: nda.createdAt || now,
    updatedAt: now,
    auditTrail: [{
      action: "NDA Created",
      performedBy: _performedBy || nda.createdBy,
      timestamp: now,
      details: `Created ${nda.isMutual ? "Mutual" : "One-Way"} NDA`,
    }],
  };

  await setDoc(newDoc, cleanForFirestore(record));
  await recordAuditEvent({
    action: "NDA Created",
    performedBy: _performedBy || nda.createdBy,
    timestamp: now,
    documentType: "nda",
    documentId: newDoc.id,
    documentRef: ndaNumber,
  });
  return newDoc.id;
}

export async function getNDAs(clientId?: string): Promise<CCNDA[]> {
  try {
    const snap = await getDocs(collection(db, COLLECTIONS.ndas));
    let results: CCNDA[] = [];
    snap.forEach((d) => results.push({ id: d.id, ...d.data() } as CCNDA));
    if (clientId) results = results.filter((n) => n.clientId === clientId);
    return results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    console.error("Failed to load NDAs:", err);
    return [];
  }
}

export async function getNDA(id: string): Promise<CCNDA | null> {
  try {
    const snap = await getDoc(doc(db, COLLECTIONS.ndas, id));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as CCNDA;
  } catch (err) {
    console.error(`Failed to fetch NDA ${id}:`, err);
    return null;
  }
}

export async function updateNDA(
  id: string,
  updates: Partial<CCNDA>,
  userEmail: string
): Promise<void> {
  const now = new Date().toISOString();
  const docRef = doc(db, COLLECTIONS.ndas, id);
  const existing = (await getDoc(docRef)).data() as CCNDA;
  const auditTrail = [...(existing?.auditTrail || [])];
  auditTrail.push({
    action: "NDA Updated",
    performedBy: userEmail,
    timestamp: now,
    details: updates.status ? `Status: ${updates.status}` : "Content updated",
  });

  await updateDoc(docRef, cleanForFirestore({
    ...updates,
    updatedBy: userEmail,
    updatedAt: now,
    auditTrail,
  }));
}

// ════════════════════════════════════════════
// SERVICE AGREEMENTS
// ════════════════════════════════════════════

export async function createServiceAgreement(
  agreement: Omit<CCServiceAgreement, "id" | "agreementNumber" | "createdAt" | "updatedAt" | "version"> & {
    version?: number;
    createdAt?: string;
    updatedAt?: string;
  },
  _performedBy?: string
): Promise<string> {
  const colRef = collection(db, COLLECTIONS.agreements);
  const newDoc = doc(colRef);
  const agreementNumber = await generateNextNumber("agreement", "DEV-AGR");
  const now = new Date().toISOString();

  const record: CCServiceAgreement = {
    ...agreement,
    id: newDoc.id,
    agreementNumber,
    version: agreement.version ?? 1,
    createdAt: agreement.createdAt || now,
    updatedAt: now,
    auditTrail: [{
      action: "Service Agreement Created",
      performedBy: _performedBy || agreement.createdBy,
      timestamp: now,
    }],
  };

  await setDoc(newDoc, cleanForFirestore(record));
  await recordAuditEvent({
    action: "Service Agreement Created",
    performedBy: _performedBy || agreement.createdBy,
    timestamp: now,
    documentType: "service_agreement",
    documentId: newDoc.id,
    documentRef: agreementNumber,
  });
  return newDoc.id;
}

export async function getServiceAgreements(clientId?: string): Promise<CCServiceAgreement[]> {
  try {
    const snap = await getDocs(collection(db, COLLECTIONS.agreements));
    let results: CCServiceAgreement[] = [];
    snap.forEach((d) => results.push({ id: d.id, ...d.data() } as CCServiceAgreement));
    if (clientId) results = results.filter((a) => a.clientId === clientId);
    return results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    console.error("Failed to load service agreements:", err);
    return [];
  }
}

export async function getServiceAgreement(id: string): Promise<CCServiceAgreement | null> {
  try {
    const snap = await getDoc(doc(db, COLLECTIONS.agreements, id));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as CCServiceAgreement;
  } catch (err) {
    console.error(`Failed to fetch service agreement ${id}:`, err);
    return null;
  }
}

export async function updateServiceAgreement(
  id: string,
  updates: Partial<CCServiceAgreement>,
  userEmail: string
): Promise<void> {
  const now = new Date().toISOString();
  const docRef = doc(db, COLLECTIONS.agreements, id);
  const existing = (await getDoc(docRef)).data() as CCServiceAgreement;

  // Guard: executed agreements cannot be directly edited
  if (existing?.status === "executed" || existing?.status === "active") {
    if (!["amended", "suspended", "completed", "terminated"].includes(updates.status || "")) {
      throw new Error(
        "This agreement has been executed. Create a Change Order to modify terms."
      );
    }
  }

  const auditTrail = [...(existing?.auditTrail || [])];
  auditTrail.push({
    action: "Service Agreement Updated",
    performedBy: userEmail,
    timestamp: now,
    details: updates.status ? `Status: ${updates.status}` : "Content updated",
  });

  await updateDoc(docRef, cleanForFirestore({
    ...updates,
    updatedBy: userEmail,
    updatedAt: now,
    auditTrail,
  }));
}

export async function archiveServiceAgreement(
  id: string,
  isArchived: boolean,
  userEmail: string
): Promise<void> {
  const now = new Date().toISOString();
  const docRef = doc(db, COLLECTIONS.agreements, id);
  const existing = (await getDoc(docRef)).data() as CCServiceAgreement;
  const auditTrail = [...(existing?.auditTrail || [])];
  auditTrail.push({
    action: isArchived ? "Agreement Archived" : "Agreement Unarchived",
    performedBy: userEmail,
    timestamp: now,
    details: isArchived ? "Moved to Archived" : "Restored to Active",
  });
  await updateDoc(docRef, {
    isArchived,
    archivedAt: isArchived ? now : null,
    updatedBy: userEmail,
    updatedAt: now,
    auditTrail,
  });
}

export async function softDeleteServiceAgreement(
  id: string,
  userEmail: string
): Promise<void> {
  const now = new Date().toISOString();
  const docRef = doc(db, COLLECTIONS.agreements, id);
  const existing = (await getDoc(docRef)).data() as CCServiceAgreement;
  const auditTrail = [...(existing?.auditTrail || [])];
  auditTrail.push({
    action: "Agreement Sent to Recycle Bin",
    performedBy: userEmail,
    timestamp: now,
    details: "Moved to Recycle Bin",
  });
  await updateDoc(docRef, {
    isDeleted: true,
    deletedAt: now,
    updatedBy: userEmail,
    updatedAt: now,
    auditTrail,
  });
}

export async function restoreServiceAgreement(
  id: string,
  userEmail: string
): Promise<void> {
  const now = new Date().toISOString();
  const docRef = doc(db, COLLECTIONS.agreements, id);
  const existing = (await getDoc(docRef)).data() as CCServiceAgreement;
  const auditTrail = [...(existing?.auditTrail || [])];
  auditTrail.push({
    action: "Agreement Restored",
    performedBy: userEmail,
    timestamp: now,
    details: "Restored from Recycle Bin to Active",
  });
  await updateDoc(docRef, {
    isDeleted: false,
    deletedAt: null,
    updatedBy: userEmail,
    updatedAt: now,
    auditTrail,
  });
}

export async function permanentlyDeleteServiceAgreement(
  id: string,
  userEmail: string
): Promise<void> {
  const docRef = doc(db, COLLECTIONS.agreements, id);
  await recordAuditEvent({
    action: "Service Agreement Permanently Deleted",
    performedBy: userEmail,
    timestamp: new Date().toISOString(),
    documentType: "service_agreement",
    documentId: id,
    documentRef: id,
  });
  await deleteDoc(docRef);
}

// ── QUOTATION ARCHIVE & RECYCLE BIN ──

export async function archiveQuotation(
  id: string,
  isArchived: boolean,
  userEmail: string
): Promise<void> {
  const now = new Date().toISOString();
  const docRef = doc(db, COLLECTIONS.quotations, id);
  const existing = (await getDoc(docRef)).data() as CCQuotation;
  const auditTrail = [...(existing?.auditTrail || [])];
  auditTrail.push({
    action: isArchived ? "Quotation Archived" : "Quotation Unarchived",
    performedBy: userEmail,
    timestamp: now,
  });
  await updateDoc(docRef, {
    isArchived,
    archivedAt: isArchived ? now : null,
    updatedBy: userEmail,
    updatedAt: now,
    auditTrail,
  });
}

export async function softDeleteQuotation(
  id: string,
  userEmail: string
): Promise<void> {
  const now = new Date().toISOString();
  const docRef = doc(db, COLLECTIONS.quotations, id);
  const existing = (await getDoc(docRef)).data() as CCQuotation;
  const auditTrail = [...(existing?.auditTrail || [])];
  auditTrail.push({
    action: "Quotation Sent to Recycle Bin",
    performedBy: userEmail,
    timestamp: now,
  });
  await updateDoc(docRef, {
    isDeleted: true,
    deletedAt: now,
    updatedBy: userEmail,
    updatedAt: now,
    auditTrail,
  });
}

export async function restoreQuotation(
  id: string,
  userEmail: string
): Promise<void> {
  const now = new Date().toISOString();
  const docRef = doc(db, COLLECTIONS.quotations, id);
  const existing = (await getDoc(docRef)).data() as CCQuotation;
  const auditTrail = [...(existing?.auditTrail || [])];
  auditTrail.push({
    action: "Quotation Restored",
    performedBy: userEmail,
    timestamp: now,
  });
  await updateDoc(docRef, {
    isDeleted: false,
    deletedAt: null,
    updatedBy: userEmail,
    updatedAt: now,
    auditTrail,
  });
}

export async function permanentlyDeleteQuotation(
  id: string,
  userEmail: string
): Promise<void> {
  const docRef = doc(db, COLLECTIONS.quotations, id);
  await recordAuditEvent({
    action: "Quotation Permanently Deleted",
    performedBy: userEmail,
    timestamp: new Date().toISOString(),
    documentType: "quotation",
    documentId: id,
    documentRef: id,
  });
  await deleteDoc(docRef);
}

// ── NDA ARCHIVE & RECYCLE BIN ──

export async function archiveNDA(
  id: string,
  isArchived: boolean,
  userEmail: string
): Promise<void> {
  const now = new Date().toISOString();
  const docRef = doc(db, COLLECTIONS.ndas, id);
  const existing = (await getDoc(docRef)).data() as CCNDA;
  const auditTrail = [...(existing?.auditTrail || [])];
  auditTrail.push({
    action: isArchived ? "NDA Archived" : "NDA Unarchived",
    performedBy: userEmail,
    timestamp: now,
  });
  await updateDoc(docRef, {
    isArchived,
    archivedAt: isArchived ? now : null,
    updatedBy: userEmail,
    updatedAt: now,
    auditTrail,
  });
}

export async function softDeleteNDA(
  id: string,
  userEmail: string
): Promise<void> {
  const now = new Date().toISOString();
  const docRef = doc(db, COLLECTIONS.ndas, id);
  const existing = (await getDoc(docRef)).data() as CCNDA;
  const auditTrail = [...(existing?.auditTrail || [])];
  auditTrail.push({
    action: "NDA Sent to Recycle Bin",
    performedBy: userEmail,
    timestamp: now,
  });
  await updateDoc(docRef, {
    isDeleted: true,
    deletedAt: now,
    updatedBy: userEmail,
    updatedAt: now,
    auditTrail,
  });
}

export async function restoreNDA(
  id: string,
  userEmail: string
): Promise<void> {
  const now = new Date().toISOString();
  const docRef = doc(db, COLLECTIONS.ndas, id);
  const existing = (await getDoc(docRef)).data() as CCNDA;
  const auditTrail = [...(existing?.auditTrail || [])];
  auditTrail.push({
    action: "NDA Restored",
    performedBy: userEmail,
    timestamp: now,
  });
  await updateDoc(docRef, {
    isDeleted: false,
    deletedAt: null,
    updatedBy: userEmail,
    updatedAt: now,
    auditTrail,
  });
}

export async function permanentlyDeleteNDA(
  id: string,
  userEmail: string
): Promise<void> {
  const docRef = doc(db, COLLECTIONS.ndas, id);
  await recordAuditEvent({
    action: "NDA Permanently Deleted",
    performedBy: userEmail,
    timestamp: new Date().toISOString(),
    documentType: "nda",
    documentId: id,
    documentRef: id,
  });
  await deleteDoc(docRef);
}

// ════════════════════════════════════════════
// CHANGE ORDERS
// ════════════════════════════════════════════

export async function createChangeOrder(
  order: any,
  _performedBy?: string
): Promise<string> {
  const colRef = collection(db, COLLECTIONS.changeOrders);
  const newDoc = doc(colRef);
  const changeOrderNumber = await generateNextNumber("change_order", "DEV-CR");
  const now = new Date().toISOString();

  const record: CCChangeOrder = {
    ...order,
    id: newDoc.id,
    changeOrderNumber,
    createdAt: order.createdAt || now,
    updatedAt: now,
    auditTrail: [{
      action: "Change Order Created",
      performedBy: _performedBy || order.createdBy,
      timestamp: now,
    }],
  };

  await setDoc(newDoc, cleanForFirestore(record));
  return newDoc.id;
}

export async function getChangeOrders(projectId?: string): Promise<CCChangeOrder[]> {
  try {
    const snap = await getDocs(collection(db, COLLECTIONS.changeOrders));
    let results: CCChangeOrder[] = [];
    snap.forEach((d) => results.push({ id: d.id, ...d.data() } as CCChangeOrder));
    if (projectId) results = results.filter((co) => co.projectId === projectId);
    return results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    console.error("Failed to load change orders:", err);
    return [];
  }
}

// ════════════════════════════════════════════
// SOW
// ════════════════════════════════════════════

export async function createSOW(sow: any, _performedBy?: string): Promise<string> {
  const colRef = collection(db, COLLECTIONS.sow);
  const newDoc = doc(colRef);
  const sowNumber = await generateNextNumber("sow", "DEV-SOW");
  const now = new Date().toISOString();

  const record: CCSOW = {
    ...sow,
    id: newDoc.id,
    sowNumber,
    createdAt: sow.createdAt || now,
    updatedAt: now,
  };

  await setDoc(newDoc, cleanForFirestore(record));
  return newDoc.id;
}

export async function getSOWs(projectId?: string): Promise<CCSOW[]> {
  try {
    const snap = await getDocs(collection(db, COLLECTIONS.sow));
    let results: CCSOW[] = [];
    snap.forEach((d) => results.push({ id: d.id, ...d.data() } as CCSOW));
    if (projectId) results = results.filter((s) => s.projectId === projectId);
    return results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    console.error("Failed to load SOWs:", err);
    return [];
  }
}

// ════════════════════════════════════════════
// MILESTONES
// ════════════════════════════════════════════

export async function getMilestones(projectId?: string): Promise<CCMilestoneRecord[]> {
  try {
    const snap = await getDocs(collection(db, COLLECTIONS.milestones));
    let results: CCMilestoneRecord[] = [];
    snap.forEach((d) => results.push({ id: d.id, ...d.data() } as CCMilestoneRecord));
    if (projectId) results = results.filter((m) => m.projectId === projectId);
    return results.sort((a, b) => new Date(a.plannedDate).getTime() - new Date(b.plannedDate).getTime());
  } catch (err) {
    console.error("Failed to load milestones:", err);
    return [];
  }
}

// ════════════════════════════════════════════
// TEMPLATES & CLAUSES
// ════════════════════════════════════════════

export async function getTemplates(): Promise<CCDocumentTemplate[]> {
  try {
    const snap = await getDocs(collection(db, COLLECTIONS.templates));
    const results: CCDocumentTemplate[] = [];
    snap.forEach((d) => results.push({ id: d.id, ...d.data() } as CCDocumentTemplate));
    return results;
  } catch (err) {
    console.error("Failed to load templates:", err);
    return [];
  }
}

export async function getClauses(): Promise<CCClauseLibraryItem[]> {
  try {
    const snap = await getDocs(collection(db, COLLECTIONS.clauses));
    const results: CCClauseLibraryItem[] = [];
    snap.forEach((d) => results.push({ id: d.id, ...d.data() } as CCClauseLibraryItem));
    return results.sort((a, b) => a.sortOrder - b.sortOrder);
  } catch (err) {
    console.error("Failed to load clauses:", err);
    return [];
  }
}

// ════════════════════════════════════════════
// SETTINGS
// ════════════════════════════════════════════

export async function getSettings(): Promise<CCSettings | null> {
  try {
    const snap = await getDoc(doc(db, COLLECTIONS.settings, "main"));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as CCSettings;
  } catch (err) {
    console.error("Failed to load CC settings:", err);
    return null;
  }
}

export async function saveSettings(
  settings: Omit<CCSettings, "id">,
  userEmail: string
): Promise<void> {
  await setDoc(doc(db, COLLECTIONS.settings, "main"), cleanForFirestore({
    ...settings,
    id: "main",
    updatedBy: userEmail,
    updatedAt: new Date().toISOString(),
  }));
}

// ════════════════════════════════════════════
// DASHBOARD METRICS
// ════════════════════════════════════════════

export async function getDashboardMetrics(): Promise<CCDashboardMetrics> {
  const [quotations, ndas, agreements, milestones] = await Promise.all([
    getQuotations(),
    getNDAs(),
    getServiceAgreements(),
    getMilestones(),
  ]);

  const now = new Date();

  return {
    totalQuotations: quotations.length,
    draftQuotations: quotations.filter((q) => q.status === "draft").length,
    pendingReview: quotations.filter((q) => q.status === "internal_review").length,
    awaitingClientResponse: quotations.filter((q) =>
      ["sent", "viewed"].includes(q.status)
    ).length,
    acceptedQuotations: quotations.filter((q) => q.status === "accepted").length,
    awaitingSignature: [
      ...agreements.filter((a) => ["sent", "partially_signed"].includes(a.status)),
      ...ndas.filter((n) => ["sent", "partially_signed"].includes(n.status)),
    ].length,
    activeAgreements: agreements.filter((a) =>
      ["executed", "active"].includes(a.status)
    ).length,
    activeNDAs: ndas.filter((n) => n.status === "executed").length,
    expiringNDAs: ndas.filter((n) => {
      if (n.status !== "executed" || !n.expiryDate) return false;
      const exp = new Date(n.expiryDate);
      const diff = (exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      return diff > 0 && diff <= 30;
    }).length,
    overdueProjects: milestones.filter((m) => {
      if (m.status === "accepted" || m.status === "rejected") return false;
      return new Date(m.plannedDate) < now;
    }).length,
    pendingPayments: 0, // Will be calculated from payment schedules
    overduePayments: 0,
  };
}

// ════════════════════════════════════════════
// PDF UPLOAD HELPER
// ════════════════════════════════════════════

export async function uploadDocumentPDF(
  documentType: string,
  documentId: string,
  documentRef: string,
  version: number,
  pdfBlob: Blob
): Promise<{ pdfUrl: string; storagePath: string }> {
  const filename = `${documentRef}_v${version}_${Date.now()}.pdf`;
  const storagePath = `contract-center/${documentType}/${documentId}/${filename}`;
  const storageRef = ref(storage, storagePath);

  await uploadBytes(storageRef, pdfBlob);
  const pdfUrl = await getDownloadURL(storageRef);

  return { pdfUrl, storagePath };
}

// ════════════════════════════════════════════
// CONVENIENCE ALIASES & WORKFLOW HELPERS
// ════════════════════════════════════════════

export const getQuotationById = getQuotation;
export const getNDAById = getNDA;
export const getServiceAgreementById = getServiceAgreement;
export const getClientById = getClient;
export const getDocumentTemplates = getTemplates;
export const getClauseLibrary = getClauses;
export const getContractSettings = getSettings;
export const saveContractSettings = saveSettings;

export async function createQuotationRevision(id: string, userEmail: string): Promise<string> {
  const original = await getQuotation(id);
  if (!original) throw new Error("Original quotation not found");
  const { id: _id, quotationNumber: _num, ...rest } = original;
  return await createQuotation({
    ...rest,
    version: (original.version || 1) + 1,
    parentQuotationId: original.id,
    status: "draft",
    pdfUrl: undefined,
    pdfStoragePath: undefined,
    documentHash: undefined,
    sentAt: undefined,
    viewedAt: undefined,
    clientResponseAt: undefined,
    internalApprovedBy: undefined,
    internalApprovedAt: undefined,
    createdBy: userEmail,
  });
}

export async function transitionQuotationStatus(
  id: string,
  newStatus: CCQuotationStatus,
  userEmail: string,
  notes?: string
): Promise<void> {
  await updateQuotation(id, { status: newStatus }, userEmail);
  if (notes) {
    await recordAuditEvent({
      action: `Quotation Status -> ${newStatus}`,
      performedBy: userEmail,
      timestamp: new Date().toISOString(),
      documentId: id,
      documentType: "quotation",
      details: notes,
    });
  }
}

export async function createSignatureRequest(
  req: any,
  userEmail: string
): Promise<string> {
  const colRef = collection(db, COLLECTIONS.signatures);
  const newDoc = doc(colRef);
  const now = new Date().toISOString();
  const record = {
    ...req,
    id: newDoc.id,
    createdAt: req.createdAt || now,
    updatedAt: now,
  };
  await setDoc(newDoc, cleanForFirestore(record));
  return newDoc.id;
}

export async function getSignatureRequests(): Promise<CCSignatureRequest[]> {
  try {
    const snap = await getDocs(collection(db, COLLECTIONS.signatures));
    const results: CCSignatureRequest[] = [];
    snap.forEach((d) => results.push({ id: d.id, ...d.data() } as CCSignatureRequest));
    return results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    console.error("Failed to load signature requests:", err);
    return [];
  }
}

export async function recordMilestonePayment(
  quotationId: string,
  milestoneId: string,
  amount: number,
  paymentReference: string,
  userEmail: string
): Promise<void> {
  const quo = await getQuotation(quotationId);
  if (!quo || !quo.paymentSchedule) return;
  const updatedSchedule = quo.paymentSchedule.map((m) => {
    if (m.id === milestoneId) {
      return {
        ...m,
        status: "paid" as const,
        paidDate: new Date().toISOString(),
        paidAmount: amount,
        paymentReference,
      };
    }
    return m;
  });
  await updateQuotation(quotationId, { paymentSchedule: updatedSchedule }, userEmail);
  await recordAuditEvent({
    action: "Milestone Payment Recorded",
    performedBy: userEmail,
    timestamp: new Date().toISOString(),
    documentId: quotationId,
    documentType: "quotation",
    details: `Milestone ${milestoneId} settled with reference ${paymentReference}`,
  });
}

export async function createMilestone(
  milestone: any,
  userEmail: string
): Promise<string> {
  const colRef = collection(db, COLLECTIONS.milestones);
  const newDoc = doc(colRef);
  const now = new Date().toISOString();
  const record = {
    ...milestone,
    id: newDoc.id,
    createdAt: milestone.createdAt || now,
    updatedAt: now,
  };
  await setDoc(newDoc, cleanForFirestore(record));
  return newDoc.id;
}

export async function updateMilestoneStatus(
  id: string,
  status: any,
  userEmail: string
): Promise<void> {
  const now = new Date().toISOString();
  await updateDoc(doc(db, COLLECTIONS.milestones, id), cleanForFirestore({
    status,
    updatedBy: userEmail,
    updatedAt: now,
  }));
}

export async function createDocumentTemplate(
  tpl: any,
  userEmail: string
): Promise<string> {
  const colRef = collection(db, COLLECTIONS.templates);
  const newDoc = doc(colRef);
  const now = new Date().toISOString();
  const record = {
    ...tpl,
    id: newDoc.id,
    createdAt: tpl.createdAt || now,
    updatedAt: now,
  };
  await setDoc(newDoc, cleanForFirestore(record));
  return newDoc.id;
}

export async function createClause(
  clause: any,
  userEmail: string
): Promise<string> {
  const colRef = collection(db, COLLECTIONS.clauses);
  const newDoc = doc(colRef);
  const now = new Date().toISOString();
  const record = {
    ...clause,
    id: newDoc.id,
    createdAt: clause.createdAt || now,
    updatedAt: now,
  };
  await setDoc(newDoc, cleanForFirestore(record));
  return newDoc.id;
}

