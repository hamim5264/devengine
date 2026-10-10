export type AgreementType =
  | "profit_participation"
  | "revenue_sharing"
  | "hourly"
  | "fixed_completion"
  | "milestone"
  | "hybrid"
  | "retainer"
  | "custom";

export const AGREEMENT_TYPE_LABELS: Record<AgreementType, string> = {
  profit_participation: "Project Profit Participation Agreement",
  revenue_sharing: "Revenue Sharing Agreement",
  hourly: "Hourly / Time-Based Compensation Agreement",
  fixed_completion: "Fixed Completion Payment Agreement",
  milestone: "Phase / Milestone-Based Payment Agreement",
  hybrid: "Hybrid Compensation (Base Fee + Profit Share)",
  retainer: "Monthly Retainer Agreement",
  custom: "Custom Commercial Terms Agreement",
};

export type AgreementStatus =
  | "draft"
  | "validated"
  | "ready_for_signature"
  | "partially_signed"
  | "executed"
  | "finalized" // pre-execution locked draft snapshot
  | "signed" // legacy alias
  | "active" // legacy alias
  | "amended"
  | "superseded"
  | "completed"
  | "terminated"
  | "cancelled";

export const AGREEMENT_STATUS_LABELS: Record<AgreementStatus, string> = {
  draft: "Draft (In Progress)",
  validated: "Validated (Pre-Flight Passed)",
  ready_for_signature: "Ready for Execution",
  partially_signed: "Partially Executed",
  executed: "Executed (Binding Contract)",
  finalized: "Finalized Snapshot (Unsigned)",
  signed: "Signed (Legacy)",
  active: "Active (Legacy)",
  amended: "Amended via Executed Addendum",
  superseded: "Superseded by New Version",
  completed: "Contract Completed",
  terminated: "Terminated",
  cancelled: "Revoked / Cancelled",
};

export type ProfitDurationModel =
  | "fixed_period_from_release"
  | "fixed_period_from_start"
  | "ongoing_indefinite"
  | "during_active_service_only"
  | "continuing_post_service"
  | "until_specified_event"
  | "custom_duration";

export const PROFIT_DURATION_LABELS: Record<ProfitDurationModel, string> = {
  fixed_period_from_release: "Fixed Period from Production Release",
  fixed_period_from_start: "Fixed Period from Participation Start Date",
  ongoing_indefinite: "Ongoing with No Fixed Expiry Date",
  during_active_service_only: "During Active Service Only",
  continuing_post_service: "Continuing After Active Service Ends",
  until_specified_event: "Until Specified Milestones / Cap Achieved",
  custom_duration: "Custom Negotiated Term",
};

export type PostServiceTreatment =
  | "full_continuing"
  | "pro_rata_vested"
  | "fixed_post_period"
  | "ceases_upon_exit"
  | "custom_post_treatment";

export const POST_SERVICE_TREATMENT_LABELS: Record<PostServiceTreatment, string> = {
  full_continuing: "Full contractual participation continues unimpaired",
  pro_rata_vested: "Pro-rata vested share continues based on completed deliverables",
  fixed_post_period: "Continues for a defined sunset period post-service",
  ceases_upon_exit: "Ceases immediately upon conclusion of active services",
  custom_post_treatment: "Governed by customized separation terms",
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
  dependencies?: string[];
  status?: "pending" | "in_progress" | "submitted" | "accepted" | "paid";
}

export interface AgreementDeliverable {
  id: string;
  title: string;
  description: string;
  acceptanceCriteria: string;
  priority: "Low" | "Medium" | "High" | "Critical";
  deadline?: string;
  dependencies?: string[];
  reviewPeriodDays?: number;
  acceptanceStatus?: "pending" | "in_progress" | "submitted" | "accepted";
  documentationRequired?: boolean;
}

export interface OngoingMaintenanceTerms {
  isIncluded: boolean;
  expectedServices: string;
  commitmentType: "part_time" | "full_time" | "on_call" | "hourly_bank";
  workloadDescription: string;
  responseTargetHours: number;
  bugFixObligation: string;
  updatesAndQualityReviews: string;
  excludedServices: string;
  additionalFeatureBilling: string;
  maintenanceDurationMonths: number;
  reviewSchedule: string;
}

export interface AgreementProfitTerms {
  participationPercentage: number;
  profitBasis: string; // "Net Distributable Project Profit" | "Gross Project Revenue"
  isRevenueShareModel?: boolean;
  vestingCondition: string;
  profitStartTrigger: string;
  paymentFrequency: string; // "Quarterly" | "Monthly" | "Semi-Annually" | "Annually"
  profitCalculationMethod: string;
  eligibleProjectExpenses: string[];
  customExpenseCategories?: string[];
  contributorCompletionRequirement: string;
  // Duration & Post-Service configuration
  durationModel: ProfitDurationModel;
  participationDurationMonths?: number;
  participationDurationDescription: string;
  postServiceTreatment: PostServiceTreatment;
  postServiceDurationMonths?: number;
  postTerminationParticipation: string;
  // Material event handling
  breachTreatment: string;
  voluntaryDepartureTreatment: string;
  projectSaleOrTransferTreatment: string;
  projectDiscontinuationTreatment: string;
  corporateEquityGranted: boolean; // MUST DEFAULT TO FALSE
  equityArrangementNotes?: string;
  minimumGuaranteedPayment?: number | null;
  maximumProfitCap?: number | null;
  accountingAuditProcedure: string;
  reportingMethod: string;
  reconciliationDeadlineDays: number;
  paymentDeadlineDays?: number; // alias
  postServiceSunsetMonths?: number; // alias
  currencyConversionRules?: string;
}

export interface AgreementCompensation {
  model: AgreementType;
  currency: string; // "BDT" | "USD"
  fixedAmount?: number;
  hourlyRate?: number;
  estimatedHours?: number;
  maxApprovedHours?: number;
  timesheetRequirement?: boolean;
  paymentFrequency?: string;
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
  customTermsText?: string;
  maintenanceTerms?: OngoingMaintenanceTerms;
}

export interface ProjectInfo {
  projectId?: string;
  projectName: string;
  description: string;
  clientName?: string;
  companyName?: string;
  projectType: string;
  technicalScopeAndArchitecture?: string;
  // Precise date distinctions
  agreementEffectiveDate: string;
  workCommencementDate: string;
  targetCompletionDate: string;
  plannedLaunchDate: string;
  actualLaunchDate?: string;
  documentGenerationDate?: string;
  actualSignatureDate?: string;
  // Backwards compatibility aliases
  startDate?: string;
  expectedCompletionDate?: string;
  projectStatus: string;
  additionalNotes?: string;
}

export interface DeveloperInfo {
  developerId?: string;
  legalName: string; // Legal full name
  fullName: string;  // Preserved for backwards compatibility
  professionalName?: string; // e.g. "Mishu"
  role: string;
  partyType: "individual" | "registered_company" | "entity";
  companyRegistrationNumber?: string;
  authorizedSignatoryName?: string;
  email: string;
  phone: string;
  address: string;
  identificationId?: string;
  emergencyContact?: string;
}

export interface DevEngineInfo {
  companyName: string;
  legalEntityName: string;
  ceoName: string;
  ceoTitle: string;
  authorizedSignatoryName?: string;
  authorizedSignatoryTitle?: string;
  authorizedRepresentativeTitle: string;
  companyEmail: string;
  companyWebsite: string;
  companyAddress: string;
  companyRegistrationJurisdiction: string;
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
  // Enhanced configurable provisions
  ipOwnershipModel: "work_for_hire" | "assignment_upon_payment" | "exclusive_license" | "custom";
  preExistingIpDisclosed: boolean;
  preExistingIpDescription?: string;
  preExistingIpDisclosure?: string[];
  thirdPartyLicensesAllowed: string;
  moralRightsWaiver: "explicit_waiver" | "moral_rights_retained" | "custom_attribution";
  personalDataProtectionClause: boolean;
  securityBreachNotificationHours: number;
  repositoryOwnershipHandover: boolean;
  changeRequestWrittenRequirement: boolean;
  nonCompeteIncluded: boolean; // default: false, requires legal warning
  nonCompeteDurationYears?: number;
  severabilityIncluded: boolean;
  electronicSignatureAccepted: boolean;
}

export interface AgreementAuditRecord {
  action: string;
  performedBy: string;
  timestamp: string;
  details?: string;
  version?: string;
}

export interface ClauseAmendmentDiff {
  clauseId: string;
  clauseTitle: string;
  originalText: string;
  replacementText: string;
  rationale: string;
}

export interface AgreementAddendumRecord {
  id: string; // e.g. DEV-ADD-2026-0001
  addendumNumber: string;
  parentAgreementId: string;
  parentAgreementNumber: string;
  projectTitle: string;
  contributorName: string;
  effectiveDate: string;
  status: "draft" | "ready_for_signature" | "executed";
  amendedClauses: ClauseAmendmentDiff[];
  unchangedAffirmation: string;
  precedenceClause: string;
  pdfUrl?: string;
  storagePath?: string;
  signedPdfUrl?: string;
  executedAt?: string;
  executedBy?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  auditTrail?: AgreementAuditRecord[];
}

export interface AgreementClauseTemplate {
  id: string;
  title: string;
  category: "preamble" | "commercial" | "ip" | "confidentiality" | "termination" | "governing_law" | "boilerplate" | "custom";
  version: number;
  applicableModels: AgreementType[];
  content: string;
  requiredVariables: string[];
  isMandatory: boolean;
  defaultActive: boolean;
  sortOrder: number;
  legalReviewWarning?: string;
}

export interface AgreementRecord {
  id: string;
  agreementNumber: string; // DEV-AGR-YYYY-XXXX
  agreementType: AgreementType;
  agreementTypeLabel: string;
  status: AgreementStatus;
  version: string; // e.g. "1.0", "1.1"
  revisionToken?: string;
  concurrencyVersion?: number;
  templateVersion?: string;
  project: ProjectInfo;
  developer: DeveloperInfo;
  devengine: DevEngineInfo;
  company?: DevEngineInfo; // alias for devengine
  compensation: AgreementCompensation;
  deliverables: AgreementDeliverable[];
  terms: AgreementTerms;
  customClauses?: { id?: string; title: string; content: string }[];
  appliedClauseIds?: string[];
  pdfUrl?: string;
  storagePath?: string;
  signedPdfUrl?: string;
  signatureMetadata?: {
    signedBy?: string;
    signingMethod?: "electronic" | "manual_upload" | "in_person";
    signedAt?: string;
    ipAddress?: string;
    verifiedByAdmin?: boolean;
  };
  finalizedAt?: string;
  finalizedBy?: string;
  executedAt?: string;
  executedBy?: string;
  addendaIds?: string[];
  latestAddendumNumber?: string;
  parentAgreementId?: string; // If this record is an amendment version
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  updatedAt: string;
  auditTrail?: AgreementAuditRecord[];
}

export const DEFAULT_DEVENGINE_INFO: DevEngineInfo = {
  companyName: "DevEngine",
  legalEntityName: "DevEngine Technology Operations",
  ceoName: "MD. Abdul Hamim Leon",
  ceoTitle: "Chief Executive Officer",
  authorizedRepresentativeTitle: "CEO & Managing Director",
  companyEmail: process.env.NEXT_PUBLIC_ADMIN_EMAIL || "hamim.leon@gmail.com",
  companyWebsite: process.env.NEXT_PUBLIC_BASE_URL || "https://thedevengine.vercel.app",
  companyAddress: "DevEngine Technology Operations, Dhaka, Bangladesh",
  companyRegistrationJurisdiction: "Dhaka, Bangladesh",
};

export const DEFAULT_AGREEMENT_TERMS: AgreementTerms = {
  noticePeriodDays: 14,
  bugFixPeriodDays: 30,
  confidentialityDurationYears: 3,
  paymentDuePeriodDays: 7,
  acceptancePeriodDays: 7,
  terminationNoticeDays: 14,
  disputeResolutionMethod: "Amicable Executive Negotiation, followed by Arbitral Conciliation in Dhaka",
  governingLaw: "Laws of the People's Republic of Bangladesh",
  jurisdiction: "Competent Courts of Dhaka, Bangladesh",
  nonSolicitationYears: 2,
  ipOwnershipModel: "work_for_hire",
  preExistingIpDisclosed: false,
  thirdPartyLicensesAllowed: "Permissive Open Source Licenses (MIT, Apache 2.0, BSD-3-Clause)",
  moralRightsWaiver: "explicit_waiver",
  personalDataProtectionClause: true,
  securityBreachNotificationHours: 48,
  repositoryOwnershipHandover: true,
  changeRequestWrittenRequirement: true,
  nonCompeteIncluded: false, // Default: false (avoiding unconscionable universal restrictions)
  severabilityIncluded: true,
  electronicSignatureAccepted: true,
};

export const DEFAULT_PROFIT_EXPENSES = [
  "Payment Gateway & Processing Charges",
  "Cloud Infrastructure, Server & Database Hosting (AWS/GCP/Vercel/Supabase)",
  "Third-Party APIs, Microservices & LLM Inference Compute Costs",
  "App Store, Play Store & Platform Merchant Fees",
  "Applicable Indirect Taxes & Value Added Tax (VAT)",
  "Attributable Direct Customer Acquisition & Marketing Expenses",
  "Authorized Third-Party Licensing & Asset Royalties",
];
