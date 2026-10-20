// types/certificate.ts

export type CertificateType =
  | "experience"
  | "resignation_relieving"
  | "internship"
  | "salary"
  | "recommendation"
  | "custom";

export type CertificateStatus = "pending" | "in_review" | "delivered" | "rejected";

export const CERTIFICATE_TYPE_LABELS: Record<CertificateType, string> = {
  experience: "Experience & Service Certificate",
  resignation_relieving: "Relieving & Release Certificate",
  internship: "Internship Completion Certificate",
  salary: "Salary & Employment Verification",
  recommendation: "Letter of Recommendation",
  custom: "Custom Certificate",
};

export const CERTIFICATE_TYPE_ICONS: Record<CertificateType, string> = {
  experience: "verified",
  resignation_relieving: "logout",
  internship: "school",
  salary: "payments",
  recommendation: "thumb_up",
  custom: "workspace_premium",
};

export const CERTIFICATE_STATUS_CONFIG: Record<
  CertificateStatus,
  { label: string; bg: string; text: string; border: string; icon: string }
> = {
  pending: {
    label: "Pending Review",
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    border: "border-amber-500/30",
    icon: "hourglass_top",
  },
  in_review: {
    label: "Under Review",
    bg: "bg-cyan-500/10",
    text: "text-cyan-400",
    border: "border-cyan-500/30",
    icon: "sync",
  },
  delivered: {
    label: "Delivered / Ready",
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    border: "border-emerald-500/30",
    icon: "check_circle",
  },
  rejected: {
    label: "Request Rejected",
    bg: "bg-rose-500/10",
    text: "text-rose-400",
    border: "border-rose-500/30",
    icon: "cancel",
  },
};

export interface EmployeeCertificate {
  id: string;
  certificateNumber: string; // e.g. "DE-EXP-2026-0042"
  type: CertificateType;
  status: CertificateStatus;

  // Employee Information
  employeeId: string; // Staff member UID
  employeeName: string;
  employeeEmail: string;
  employeeRole: string;
  department?: string;
  joiningDate?: string;
  lastWorkingDay?: string; // For resigned/relieved staff

  // Request Information
  reason: string; // Employee's stated purpose (e.g., Higher studies, Job application)
  employeeNotes?: string;

  // Certificate Issuance Content (Admin prepared)
  customTitle?: string; // e.g. "CERTIFICATE OF APPRECIATION & SERVICE"
  recipientSalutation?: string; // e.g. "To Whom It May Concern"
  certificateBody?: string;
  performanceRating?: string; // "Outstanding" | "Excellent" | "Very Good" | "Good"
  conductRemarks?: string; // e.g. "Character and conduct during tenure have been exemplary."
  
  // Salary details (if salary certificate)
  basicSalary?: number;
  grossSalary?: number;
  currency?: string;

  // Admin & Verification Meta
  issuedAt?: string;
  issuedBy?: string; // Signatory Name e.g. "Hamim Leon"
  signatoryTitle?: string; // "Chief Executive Officer, DevEngine Systems"
  verificationCode: string; // Unique alphanumeric hash for external verification
  companyName: string;
  companyAddress: string;

  // Rejection handling
  rejectionReason?: string;
  adminRemarks?: string;

  createdAt: string;
  updatedAt: string;
}
