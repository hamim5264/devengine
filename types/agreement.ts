export type AgreementType =
  | "profit_participation"
  | "hourly"
  | "milestone"
  | "fixed_completion"
  | "hybrid"
  | "retainer";

export const AGREEMENT_TYPE_LABELS: Record<AgreementType, string> = {
  profit_participation: "Project Profit Participation Agreement",
  hourly: "Hourly Payment Agreement",
  milestone: "Phase / Milestone Based Agreement",
  fixed_completion: "Fixed / Completion Payment Agreement",
  hybrid: "Fixed + Profit Participation Agreement",
  retainer: "Monthly / Retainer Agreement",
};

export type AgreementStatus =
  | "draft"
  | "preview"
  | "finalized"
  | "sent"
  | "signed"
  | "active"
  | "completed"
  | "terminated"
  | "cancelled";

export const AGREEMENT_STATUS_LABELS: Record<AgreementStatus, string> = {
  draft: "Draft",
  preview: "Preview",
  finalized: "Finalized",
  sent: "Sent to Contributor",
  signed: "Signed & Executed",
  active: "Active",
  completed: "Completed",
  terminated: "Terminated",
  cancelled: "Cancelled",
};

export interface AgreementMilestone {
  id: string;
  phaseNumber: number;
  phaseName: string;
  description: string;
  deliverables: string;
  startDate?: string;
  expectedCompletionDate?: string;
  paymentAmount: number;
  paymentPercentage?: number;
  paymentTrigger: string;
  acceptanceCriteria: string;
  status?: "pending" | "in_progress" | "submitted" | "accepted" | "paid";
}

export interface AgreementDeliverable {
  id: string;
  title: string;
  description: string;
  acceptanceCriteria: string;
  deadline?: string;
  priority: "Low" | "Medium" | "High" | "Critical";
}

export interface AgreementProfitTerms {
  participationPercentage: number;
  profitBasis: string; // default: "Net Distributable Project Profit"
  vestingCondition: string;
  profitStartTrigger: string;
  paymentFrequency: string;
  profitCalculationMethod: string;
  eligibleProjectExpenses: string[];
  contributorCompletionRequirement: string;
  postTerminationParticipation: string;
  participationDuration: string;
  reportingMethod: string;
  minProfitCondition?: string;
  maxProfitCondition?: string;
}

export interface AgreementCompensation {
  model: AgreementType;
  currency: string; // "BDT" | "USD"
  fixedAmount?: number;
  hourlyRate?: number;
  estimatedHours?: number;
  maxApprovedHours?: number;
  timesheetRequirement?: boolean;
  paymentFrequency?: string; // "Weekly" | "Bi-weekly" | "Monthly" | "On Milestone" | "Upon Completion"
  paymentMethod?: string;
  overtimePolicy?: string;
  invoiceRequirement?: boolean;
  paymentDuePeriodDays?: number;
  profitTerms?: AgreementProfitTerms;
  milestones?: AgreementMilestone[];
  totalContractValue?: number;
  monthlyRetainerAmount?: number;
  additionalHourlyRate?: number;
  availabilityHoursPerWeek?: number;
}

export interface ProjectInfo {
  projectId?: string;
  projectName: string;
  description: string;
  clientName?: string;
  companyName?: string;
  projectType: string;
  startDate: string;
  expectedCompletionDate: string;
  agreementEffectiveDate: string;
  projectStatus: string;
}

export interface DeveloperInfo {
  developerId?: string;
  fullName: string;
  professionalName?: string;
  role: string;
  email: string;
  phone: string;
  address: string;
  identificationId?: string;
  emergencyContact?: string;
}

export interface DevEngineInfo {
  companyName: string;
  ceoName: string;
  ceoTitle: string;
  companyEmail: string;
  companyWebsite: string;
  companyAddress: string;
}

export interface AgreementTerms {
  noticePeriodDays: number;
  bugFixPeriodDays: number;
  confidentialityDurationYears: number;
  paymentDuePeriodDays: number;
  acceptancePeriodDays: number;
  terminationNoticeDays: number;
  disputeResolutionMethod: string;
  governingLaw: string;
  jurisdiction: string;
  nonSolicitationYears: number;
}

export interface AgreementAuditRecord {
  action: string;
  performedBy: string;
  timestamp: string;
  details?: string;
}

export interface AgreementRecord {
  id: string; // Firestore document ID
  agreementNumber: string; // DEV-AGR-YYYY-XXXX
  agreementType: AgreementType;
  agreementTypeLabel: string;
  status: AgreementStatus;
  version: string;
  project: ProjectInfo;
  developer: DeveloperInfo;
  devengine: DevEngineInfo;
  compensation: AgreementCompensation;
  deliverables: AgreementDeliverable[];
  terms: AgreementTerms;
  customClauses?: { title: string; content: string }[];
  pdfUrl?: string;
  storagePath?: string;
  finalizedAt?: string;
  finalizedBy?: string;
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  updatedAt: string;
  auditTrail?: AgreementAuditRecord[];
}

export const DEFAULT_DEVENGINE_INFO: DevEngineInfo = {
  companyName: "DevEngine",
  ceoName: "MD. Abdul Hamim Leon",
  ceoTitle: "Chief Executive Officer",
  companyEmail: process.env.NEXT_PUBLIC_ADMIN_EMAIL || "hamim.leon@gmail.com",
  companyWebsite: process.env.NEXT_PUBLIC_BASE_URL || "https://thedevengine.vercel.app",
  companyAddress: "DevEngine Technology Operations, Dhaka, Bangladesh",
};

export const DEFAULT_AGREEMENT_TERMS: AgreementTerms = {
  noticePeriodDays: 14,
  bugFixPeriodDays: 30,
  confidentialityDurationYears: 3,
  paymentDuePeriodDays: 7,
  acceptancePeriodDays: 7,
  terminationNoticeDays: 14,
  disputeResolutionMethod: "Amicable Negotiation, followed by Arbitral Conciliation",
  governingLaw: "Laws of the People's Republic of Bangladesh",
  jurisdiction: "Competent Courts of Dhaka, Bangladesh",
  nonSolicitationYears: 2,
};

export const DEFAULT_PROFIT_EXPENSES = [
  "Payment Gateway & Processing Charges",
  "Cloud Infrastructure, Server & Database Hosting (AWS/GCP/Vercel/Supabase)",
  "Third-Party APIs, Microservices & LLM Compute Costs",
  "App Store, Play Store & Platform Merchant Fees",
  "Applicable Indirect Taxes & Value Added Tax (VAT)",
  "Attributable Direct Customer Acquisition & Marketing Expenses",
  "Authorized Third-Party Licensing & Asset Royalties",
];
