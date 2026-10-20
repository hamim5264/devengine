// lib/services/certificateService.ts
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
import { db } from "@/lib/firebase";
import type {
  EmployeeCertificate,
  CertificateType,
  CertificateStatus,
} from "@/types/certificate";
import { CERTIFICATE_TYPE_LABELS } from "@/types/certificate";
import { communicationCollections, nowISO } from "@/lib/services/communicationService";

const CERTIFICATES_COLLECTION = "employee_certificates";

/** Generate human-readable certificate sequence number e.g. DE-EXP-2026-9812 */
export function generateCertificateNumber(type: CertificateType): string {
  const prefixMap: Record<CertificateType, string> = {
    experience: "EXP",
    resignation_relieving: "REL",
    internship: "INT",
    salary: "SAL",
    recommendation: "REC",
    custom: "CRT",
  };
  const prefix = prefixMap[type] || "CRT";
  const year = new Date().getFullYear();
  const random = Math.floor(1000 + Math.random() * 9000);
  return `DE-${prefix}-${year}-${random}`;
}

/** Generate secure 10-char alphanumeric verification hash */
export function generateVerificationCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 10; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/** Default professional letter/statement templates for each certificate type */
export function getDefaultCertificateBody(
  type: CertificateType,
  employeeName: string,
  role: string,
  joiningDate?: string,
  lastWorkingDay?: string
): string {
  const formattedJoin = joiningDate
    ? new Date(joiningDate).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "the date of employment";
  const formattedExit = lastWorkingDay
    ? new Date(lastWorkingDay).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "present";

  switch (type) {
    case "experience":
      return `This is to certify that ${employeeName} has been employed with DevEngine Systems Inc. as a ${role} from ${formattedJoin} to ${formattedExit}. During this tenure, they have demonstrated high technical competence, professional dedication, and strong teamwork capabilities. We appreciate their valuable contributions to our engineering milestones and wish them continued success in all future professional endeavors.`;

    case "resignation_relieving":
      return `This is to certify that ${employeeName}, formerly designated as ${role} at DevEngine Systems Inc. from ${formattedJoin} to ${formattedExit}, has been officially relieved of their organizational duties following their formal resignation. All company obligations, code repositories, asset handovers, and clearance procedures have been completed satisfactorily. They carry no outstanding liabilities with the organization. We wish them the absolute best in their next career steps.`;

    case "internship":
      return `This is to certify that ${employeeName} has successfully completed an intensive Software Engineering & Systems Internship at DevEngine Systems Inc. from ${formattedJoin} to ${formattedExit}. During this apprenticeship, they actively engaged in practical software architecture, agile sprints, and real-world system delivery under senior engineering mentorship. Their performance, inquisitiveness, and work ethic have been commendable.`;

    case "salary":
      return `This is an official employment and remuneration verification statement for ${employeeName}, who is currently engaged as an active ${role} at DevEngine Systems Inc., having joined on ${formattedJoin}. This document confirms their active employment standing, contract terms, and official compensation schedule as recorded in company financial records.`;

    case "recommendation":
      return `It is with immense pleasure that we provide this formal Letter of Recommendation for ${employeeName}, who has served as ${role} at DevEngine Systems Inc. since ${formattedJoin}. Throughout their service, they have proven themselves to be an exceptionally adept problem solver, proactive collaborator, and trustworthy professional. We strongly endorse their capabilities and have no doubt they will be an asset to any organization they join.`;

    default:
      return `This official certificate is presented to ${employeeName} in recognition of their exemplary dedication, service, and technical contribution as ${role} at DevEngine Systems Inc.`;
  }
}

/** Employee submits a request for a certificate */
export async function requestCertificate(input: {
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  employeeRole: string;
  department?: string;
  joiningDate?: string;
  lastWorkingDay?: string;
  type: CertificateType;
  reason: string;
  employeeNotes?: string;
}): Promise<EmployeeCertificate> {
  const colRef = collection(db, CERTIFICATES_COLLECTION);
  const newDoc = doc(colRef);
  const now = nowISO();
  const certNumber = generateCertificateNumber(input.type);
  const vCode = generateVerificationCode();

  const certificate: EmployeeCertificate = {
    id: newDoc.id,
    certificateNumber: certNumber,
    type: input.type,
    status: "pending",
    employeeId: input.employeeId,
    employeeName: input.employeeName,
    employeeEmail: input.employeeEmail,
    employeeRole: input.employeeRole,
    department: input.department || "",
    joiningDate: input.joiningDate || "",
    lastWorkingDay: input.lastWorkingDay || "",
    reason: input.reason.trim(),
    employeeNotes: input.employeeNotes?.trim() || "",
    customTitle: CERTIFICATE_TYPE_LABELS[input.type].toUpperCase(),
    recipientSalutation: "To Whom It May Concern",
    certificateBody: getDefaultCertificateBody(
      input.type,
      input.employeeName,
      input.employeeRole,
      input.joiningDate,
      input.lastWorkingDay
    ),
    performanceRating: "Excellent",
    conductRemarks: "Character and conduct during tenure have been exemplary.",
    issuedBy: "Hamim Leon",
    signatoryTitle: "Chief Executive Officer",
    verificationCode: vCode,
    companyName: "DevEngine Systems Inc.",
    companyAddress: "Dhaka, Bangladesh",
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(newDoc, certificate);

  // Send notification to Admin Activity Inbox
  try {
    const notifRef = doc(collection(db, communicationCollections.notifications));
    await setDoc(notifRef, {
      id: notifRef.id,
      recipientId: "admin",
      title: "New Certificate Request",
      body: `${input.employeeName} submitted a request for ${CERTIFICATE_TYPE_LABELS[input.type]}.`,
      href: "/admin/manage-certificates",
      kind: "certificate",
      read: false,
      createdAt: now,
    });
  } catch (err) {
    console.warn("[CertificateService] Admin notification warning:", err);
  }

  return certificate;
}

/** Admin proactively creates / issues a certificate directly */
export async function createDirectCertificate(input: {
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  employeeRole: string;
  department?: string;
  joiningDate?: string;
  lastWorkingDay?: string;
  type: CertificateType;
  customTitle?: string;
  certificateBody?: string;
  performanceRating?: string;
  conductRemarks?: string;
  basicSalary?: number;
  grossSalary?: number;
  currency?: string;
  issuedBy?: string;
  signatoryTitle?: string;
  deliverImmediately?: boolean;
}): Promise<EmployeeCertificate> {
  const colRef = collection(db, CERTIFICATES_COLLECTION);
  const newDoc = doc(colRef);
  const now = nowISO();
  const certNumber = generateCertificateNumber(input.type);
  const vCode = generateVerificationCode();
  const isDelivered = Boolean(input.deliverImmediately);

  const certificate: EmployeeCertificate = {
    id: newDoc.id,
    certificateNumber: certNumber,
    type: input.type,
    status: isDelivered ? "delivered" : "in_review",
    employeeId: input.employeeId,
    employeeName: input.employeeName,
    employeeEmail: input.employeeEmail,
    employeeRole: input.employeeRole,
    department: input.department || "",
    joiningDate: input.joiningDate || "",
    lastWorkingDay: input.lastWorkingDay || "",
    reason: "Administrative Issuance",
    employeeNotes: "",
    customTitle: input.customTitle || CERTIFICATE_TYPE_LABELS[input.type].toUpperCase(),
    recipientSalutation: "To Whom It May Concern",
    certificateBody:
      input.certificateBody ||
      getDefaultCertificateBody(
        input.type,
        input.employeeName,
        input.employeeRole,
        input.joiningDate,
        input.lastWorkingDay
      ),
    performanceRating: input.performanceRating || "Excellent",
    conductRemarks: input.conductRemarks || "Character and conduct during tenure have been exemplary.",
    basicSalary: input.basicSalary ?? 0,
    grossSalary: input.grossSalary ?? 0,
    currency: input.currency || "BDT",
    ...(isDelivered ? { issuedAt: now } : {}),
    issuedBy: input.issuedBy || "Hamim Leon",
    signatoryTitle: input.signatoryTitle || "Chief Executive Officer",
    verificationCode: vCode,
    companyName: "DevEngine Systems Inc.",
    companyAddress: "Dhaka, Bangladesh",
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(newDoc, certificate);

  if (isDelivered) {
    try {
      const notifRef = doc(collection(db, communicationCollections.notifications));
      await setDoc(notifRef, {
        id: notifRef.id,
        recipientId: input.employeeId,
        title: "Official Certificate Delivered",
        body: `Your ${CERTIFICATE_TYPE_LABELS[input.type]} has been prepared and delivered. Download your official PDF now.`,
        href: "/staff/certificates",
        kind: "certificate",
        read: false,
        createdAt: now,
      });
    } catch (err) {
      console.warn("[CertificateService] Employee notification warning:", err);
    }
  }

  return certificate;
}

/** Admin delivers & finalizes certificate to employee */
export async function deliverCertificate(
  id: string,
  customizations?: Partial<EmployeeCertificate>
): Promise<void> {
  const targetRef = doc(db, CERTIFICATES_COLLECTION, id);
  const snap = await getDoc(targetRef);
  if (!snap.exists()) throw new Error("Certificate not found.");
  const current = snap.data() as EmployeeCertificate;

  const now = nowISO();
  const updates: Partial<EmployeeCertificate> = {
    ...customizations,
    status: "delivered",
    issuedAt: now,
    updatedAt: now,
  };

  await updateDoc(targetRef, updates as any);

  // Send real-time notification to Employee
  try {
    const notifRef = doc(collection(db, communicationCollections.notifications));
    await setDoc(notifRef, {
      id: notifRef.id,
      recipientId: current.employeeId,
      title: "Certificate Approved & Delivered",
      body: `Your ${CERTIFICATE_TYPE_LABELS[current.type]} is officially ready to view and download as a verified PDF.`,
      href: "/staff/certificates",
      kind: "certificate",
      read: false,
      createdAt: now,
    });
  } catch (err) {
    console.warn("[CertificateService] Employee notification warning:", err);
  }
}

/** Admin rejects certificate request */
export async function rejectCertificate(
  id: string,
  rejectionReason: string,
  adminRemarks?: string
): Promise<void> {
  const targetRef = doc(db, CERTIFICATES_COLLECTION, id);
  const snap = await getDoc(targetRef);
  if (!snap.exists()) throw new Error("Certificate not found.");
  const current = snap.data() as EmployeeCertificate;

  const now = nowISO();
  await updateDoc(targetRef, {
    status: "rejected",
    rejectionReason: rejectionReason.trim(),
    adminRemarks: adminRemarks?.trim() || "",
    updatedAt: now,
  });

  // Send notification to Employee
  try {
    const notifRef = doc(collection(db, communicationCollections.notifications));
    await setDoc(notifRef, {
      id: notifRef.id,
      recipientId: current.employeeId,
      title: "Certificate Request Update",
      body: `Your request for ${CERTIFICATE_TYPE_LABELS[current.type]} was not approved: ${rejectionReason.trim()}`,
      href: "/staff/certificates",
      kind: "certificate",
      read: false,
      createdAt: now,
    });
  } catch (err) {
    console.warn("[CertificateService] Employee rejection notification warning:", err);
  }
}

/** Update certificate details (draft / edits) */
export async function updateCertificate(
  id: string,
  updates: Partial<EmployeeCertificate>
): Promise<void> {
  const targetRef = doc(db, CERTIFICATES_COLLECTION, id);
  await updateDoc(targetRef, {
    ...updates,
    updatedAt: nowISO(),
  } as any);
}

/** Delete certificate record */
export async function deleteCertificate(id: string): Promise<void> {
  await deleteDoc(doc(db, CERTIFICATES_COLLECTION, id));
}

/** Fetch all certificates for admin */
export async function getCertificates(): Promise<EmployeeCertificate[]> {
  try {
    const colRef = collection(db, CERTIFICATES_COLLECTION);
    const q = query(colRef, orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ ...d.data(), id: d.id } as EmployeeCertificate));
  } catch (error) {
    throw error;
  }
}

/** Fetch certificates for specific staff member */
export async function getCertificatesForStaff(employeeUid: string): Promise<EmployeeCertificate[]> {
  try {
    const colRef = collection(db, CERTIFICATES_COLLECTION);
    const q = query(colRef, where("employeeId", "==", employeeUid));
    const snap = await getDocs(q);
    const items = snap.docs.map((d) => ({ ...d.data(), id: d.id } as EmployeeCertificate));
    // Sort in-memory to avoid needing a composite index
    return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch {
    return [];
  }
}
