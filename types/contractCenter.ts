// types/contractCenter.ts
// ─────────────────────────────────────────────────────────────
// DevEngine Contract Center — Master Type Definitions
// ─────────────────────────────────────────────────────────────

// ════════════════════════════════════════════
// 1. SHARED ENUMS & UTILITIES
// ════════════════════════════════════════════

export type CCDocumentType =
  | "quotation"
  | "nda"
  | "service_agreement"
  | "sow"
  | "change_order"
  | "acceptance_certificate"
  | "handover_certificate"
  | "maintenance_agreement";

export const CC_DOCUMENT_TYPE_LABELS: Record<CCDocumentType, string> = {
  quotation: "Quotation",
  nda: "Non-Disclosure Agreement",
  service_agreement: "Service Agreement",
  sow: "Statement of Work",
  change_order: "Change Order",
  acceptance_certificate: "Acceptance Certificate",
  handover_certificate: "Handover Certificate",
  maintenance_agreement: "Maintenance Agreement",
};

export type CCCurrency = "BDT" | "USD" | "EUR" | "GBP" | "INR" | "AED" | "SGD" | string;

export interface CCAuditEvent {
  id?: string;
  action: string;
  performedBy: string;
  performedByEmail?: string;
  timestamp: string;
  details?: string;
  documentType?: CCDocumentType;
  documentId?: string;
  documentRef?: string;
  version?: string;
  previousValue?: string;
  newValue?: string;
  ipAddress?: string;
  metadata?: Record<string, any>;
}

export interface CCFileAttachment {
  id: string;
  fileName: string;
  fileUrl: string;
  storagePath: string;
  fileSize?: number;
  mimeType?: string;
  uploadedBy: string;
  uploadedAt: string;
  description?: string;
}

// ════════════════════════════════════════════
// 2. CLIENTS
// ════════════════════════════════════════════

export type CCClientType = "individual" | "organization";
export type CCClientStatus = "active" | "inactive" | "prospect" | "archived";

export interface CCClientContact {
  name: string;
  email: string;
  phone?: string;
  title?: string;
  isPrimary?: boolean;
}

export interface CCClient {
  id: string;
  clientNumber: string; // DEV-CLI-2026-0001
  clientType: CCClientType;
  legalName: string;
  organizationName?: string;
  businessRegistration?: string;
  primaryContactName: string;
  authorizedSignatoryName?: string;
  authorizedSignatoryTitle?: string;
  email: string;
  phone?: string;
  businessAddress?: string;
  noticeAddress?: string;
  country: string;
  jurisdiction?: string;
  preferredCurrency: CCCurrency;
  taxInfo?: string;
  internalNotes?: string;
  status: CCClientStatus;
  contacts?: CCClientContact[];
  // Metadata
  createdBy: string;
  createdAt: string;
  updatedBy?: string;
  updatedAt: string;
}

export const CC_CLIENT_STATUS_LABELS: Record<CCClientStatus, string> = {
  active: "Active",
  inactive: "Inactive",
  prospect: "Prospect",
  archived: "Archived",
};

// ════════════════════════════════════════════
// 3. PROJECTS & ENGAGEMENTS
// ════════════════════════════════════════════

export type CCProjectStatus =
  | "draft"
  | "proposal"
  | "negotiation"
  | "approved"
  | "active"
  | "on_hold"
  | "completed"
  | "cancelled"
  | "archived";

export const CC_PROJECT_STATUS_LABELS: Record<CCProjectStatus, string> = {
  draft: "Draft",
  proposal: "Proposal Stage",
  negotiation: "Under Negotiation",
  approved: "Approved",
  active: "Active",
  on_hold: "On Hold",
  completed: "Completed",
  cancelled: "Cancelled",
  archived: "Archived",
};

export type CCCommercialModel =
  | "fixed_price"
  | "itemized_fixed"
  | "hourly"
  | "daily_rate"
  | "milestone"
  | "monthly_retainer"
  | "time_and_materials"
  | "recurring_maintenance"
  | "custom";

export const CC_COMMERCIAL_MODEL_LABELS: Record<CCCommercialModel, string> = {
  fixed_price: "Fixed Price",
  itemized_fixed: "Itemized Fixed Price",
  hourly: "Hourly Billing",
  daily_rate: "Daily Rate",
  milestone: "Milestone-Based",
  monthly_retainer: "Monthly Retainer",
  time_and_materials: "Time & Materials",
  recurring_maintenance: "Recurring Maintenance",
  custom: "Custom",
};

export interface CCProject {
  id: string;
  projectNumber: string; // DEV-PRJ-2026-0001
  title: string;
  clientId: string;
  clientName?: string; // Denormalized for display
  projectType: string;
  description: string;
  objectives?: string;
  scope?: string;
  includedFeatures?: string[];
  excludedFeatures?: string[];
  technicalRequirements?: string;
  deliveryExpectations?: string;
  dependencies?: string;
  assumptions?: string;
  estimatedStartDate?: string;
  estimatedEndDate?: string;
  commercialModel: CCCommercialModel;
  currency: CCCurrency;
  approvedBudget?: number;
  // Related documents
  quotationIds?: string[];
  ndaId?: string;
  serviceAgreementId?: string;
  sowId?: string;
  changeOrderIds?: string[];
  status: CCProjectStatus;
  // Metadata
  createdBy: string;
  createdAt: string;
  updatedBy?: string;
  updatedAt: string;
}

// ════════════════════════════════════════════
// 4. QUOTATIONS & PROPOSALS
// ════════════════════════════════════════════

export type CCQuotationStatus =
  | "draft"
  | "internal_review"
  | "approved"
  | "sent"
  | "viewed"
  | "accepted"
  | "declined"
  | "changes_requested"
  | "expired"
  | "superseded"
  | "archived";

export const CC_QUOTATION_STATUS_LABELS: Record<CCQuotationStatus, string> = {
  draft: "Draft",
  internal_review: "Internal Review",
  approved: "Approved",
  sent: "Sent to Client",
  viewed: "Viewed by Client",
  accepted: "Accepted",
  declined: "Declined",
  changes_requested: "Changes Requested",
  expired: "Expired",
  superseded: "Superseded",
  archived: "Archived",
};

// Valid status transitions (state machine)
export const CC_QUOTATION_TRANSITIONS: Record<CCQuotationStatus, CCQuotationStatus[]> = {
  draft: ["internal_review", "archived"],
  internal_review: ["draft", "approved", "archived"],
  approved: ["sent", "draft", "archived"],
  sent: ["viewed", "accepted", "declined", "changes_requested", "expired", "superseded"],
  viewed: ["accepted", "declined", "changes_requested", "expired", "superseded"],
  accepted: ["superseded", "archived"],
  declined: ["superseded", "archived"],
  changes_requested: ["draft", "superseded", "archived"],
  expired: ["superseded", "archived"],
  superseded: ["archived"],
  archived: [],
};

export interface CCQuotationLineItem {
  id: string;
  name: string;
  description: string;
  quantity: number;
  unit: string; // "hours", "days", "units", "months", "fixed"
  unitPrice: number; // In minor units (paisa/cents) for precision
  discountPercent?: number;
  discountAmount?: number;
  taxRate?: number; // percentage
  taxInclusive?: boolean;
  lineTotal: number; // Calculated
  // Internal fields (admin-only)
  internalCost?: number;
  internalMarginPercent?: number;
  sortOrder: number;
}

export interface CCDeliveryPhase {
  id: string;
  phaseNumber: number;
  phaseName: string;
  description: string;
  objectives?: string;
  plannedStartDate?: string;
  targetCompletionDate?: string;
  deliverables: string[];
  acceptanceCriteria?: string;
  dependencies?: string[];
  responsibleRole?: string;
  milestoneAmount?: number;
  milestonePercent?: number;
  notes?: string;
  attachments?: CCFileAttachment[];
  sortOrder: number;
  // Tracking
  actualStartDate?: string;
  actualCompletionDate?: string;
  status?: "pending" | "in_progress" | "submitted" | "accepted" | "rejected";
  // History for rescheduling
  scheduleHistory?: Array<{
    plannedStart: string;
    plannedEnd: string;
    changedAt: string;
    changedBy: string;
    reason?: string;
  }>;
}

export interface CCPaymentMilestone {
  id: string;
  description: string;
  amount?: number;
  percentage?: number;
  dueDate?: string;
  triggerEvent?: string; // e.g. "Upon signing", "On Phase 1 completion"
  paymentCondition?: string;
  linkedPhaseId?: string;
  linkedDeliverableId?: string;
  // Tracking
  status: "pending" | "invoiced" | "paid" | "overdue" | "cancelled";
  paidDate?: string;
  paidAmount?: number;
  paymentReference?: string;
  receiptAttachment?: CCFileAttachment;
  sortOrder: number;
}

export interface CCQuotationScope {
  executiveSummary?: string;
  clientRequirements?: string;
  proposedSolution?: string;
  technicalApproach?: string;
  includedServices?: string[];
  deliverables?: string[];
  exclusions?: string[];
  assumptions?: string[];
  clientResponsibilities?: string[];
  thirdPartyServices?: string[];
  risksAndDependencies?: string[];
  deliveryPlan?: string;
  warrantyAndSupport?: string;
  paymentTerms?: string;
  changeRequestProcedure?: string;
  quotationValidity?: string;
  commercialTerms?: string;
  nextSteps?: string;
}

export interface CCQuotationTerms {
  validityDays: number;
  acceptanceMethod: string; // "written_approval" | "signed_agreement" | "online_acceptance"
  requiresDeposit: boolean;
  depositPercent?: number;
  depositAmount?: number;
  kickoffDependencies?: string[];
  scopeExclusions?: string;
  changeRequestPolicy?: string;
  priceInclusions?: string;
  isBindingOffer: boolean; // false = indicative, true = binding when accepted
  requiresSeparateAgreement: boolean; // true = separate service agreement needed
  additionalConditions?: string;
}

export interface CCQuotation {
  id: string;
  quotationNumber: string; // DEV-QUO-2026-0001
  title: string;
  version: number; // 1, 2, 3...
  parentQuotationId?: string; // If this is a revision
  issueDate: string;
  validUntilDate: string;
  // Parties
  clientId: string;
  clientName?: string;
  clientSnapshot?: Partial<CCClient>; // Frozen copy at issue time
  projectId?: string;
  projectTitle?: string;
  preparedBy: string;
  preparedByName?: string;
  // Commercial
  commercialModel: CCCommercialModel;
  currency: CCCurrency;
  lineItems: CCQuotationLineItem[];
  subtotal: number;
  totalDiscount: number;
  hasDiscount?: boolean;
  discountPercent?: number;
  totalTax: number;
  approvedExpenses: number;
  grandTotal: number;
  // Scope & delivery
  scope: CCQuotationScope;
  deliveryPhases: CCDeliveryPhase[];
  paymentSchedule: CCPaymentMilestone[];
  terms: CCQuotationTerms;
  // Status
  status: CCQuotationStatus;
  internalReviewNotes?: string;
  internalReviewedBy?: string;
  internalApprovedBy?: string;
  internalApprovedAt?: string;
  sentAt?: string;
  sentTo?: string;
  viewedAt?: string;
  clientResponseAt?: string;
  clientResponseNotes?: string;
  // Related documents
  relatedNdaId?: string;
  relatedAgreementId?: string;
  // PDF
  pdfUrl?: string;
  pdfStoragePath?: string;
  documentHash?: string; // SHA-256 of finalized PDF
  // Versioning
  revisionToken?: string;
  concurrencyVersion?: number;
  // Metadata
  auditTrail?: CCAuditEvent[];
  createdBy: string;
  createdAt: string;
  updatedBy?: string;
  updatedAt: string;
  isArchived?: boolean;
  archivedAt?: string;
  isDeleted?: boolean;
  deletedAt?: string;
}

// ════════════════════════════════════════════
// 5. NDAs
// ════════════════════════════════════════════

export type CCNDAType = "one_way" | "mutual";
export type CCNDAStatus =
  | "draft"
  | "internal_review"
  | "approved"
  | "sent"
  | "partially_signed"
  | "executed"
  | "expired"
  | "terminated"
  | "archived";

export const CC_NDA_STATUS_LABELS: Record<CCNDAStatus, string> = {
  draft: "Draft",
  internal_review: "Internal Review",
  approved: "Approved",
  sent: "Sent for Signing",
  partially_signed: "Partially Signed",
  executed: "Executed",
  expired: "Expired",
  terminated: "Terminated",
  archived: "Archived",
};

export interface CCNDA {
  id: string;
  ndaNumber: string; // DEV-NDA-2026-0001
  ndaType: CCNDAType;
  version: number;
  // Parties
  disclosingPartyName: string;
  disclosingPartyType?: CCClientType;
  disclosingPartyRep?: string;
  disclosingPartyRepTitle?: string;
  disclosingPartyEmail?: string;
  disclosingPartyAddress?: string;
  receivingPartyName: string;
  receivingPartyType?: CCClientType;
  receivingPartyRep?: string;
  receivingPartyRepTitle?: string;
  receivingPartyEmail?: string;
  receivingPartyAddress?: string;
  // For mutual NDAs
  isMutual: boolean;
  // Relationship
  clientId?: string;
  projectId?: string;
  purpose: string;
  // Dates
  effectiveDate: string;
  termMonths: number; // Agreement term
  confidentialityDurationMonths: number; // How long obligations last
  expiryDate?: string;
  // Legal
  governingLaw: string;
  disputeResolution: string;
  executionMethod: string; // "electronic" | "manual" | "in_person"
  // Template
  templateId?: string;
  templateVersion?: string;
  legalReviewStatus: "pending" | "reviewed" | "approved";
  legalReviewedBy?: string;
  legalReviewedAt?: string;
  // Clause customization
  customExclusions?: string[];
  customPermittedRecipients?: string[];
  additionalClauses?: string;
  // Status & execution
  status: CCNDAStatus;
  executedAt?: string;
  executedBy?: string;
  pdfUrl?: string;
  pdfStoragePath?: string;
  signedPdfUrl?: string;
  documentHash?: string;
  // Metadata
  auditTrail?: CCAuditEvent[];
  createdBy: string;
  createdAt: string;
  updatedBy?: string;
  updatedAt: string;
  isArchived?: boolean;
  archivedAt?: string;
  isDeleted?: boolean;
  deletedAt?: string;
}

// ════════════════════════════════════════════
// 6. SERVICE AGREEMENTS
// ════════════════════════════════════════════

export type CCServiceAgreementStatus =
  | "draft"
  | "internal_review"
  | "approved"
  | "sent"
  | "partially_signed"
  | "executed"
  | "active"
  | "amended"
  | "suspended"
  | "completed"
  | "terminated"
  | "archived";

export const CC_SERVICE_AGREEMENT_STATUS_LABELS: Record<CCServiceAgreementStatus, string> = {
  draft: "Draft",
  internal_review: "Internal Review",
  approved: "Approved",
  sent: "Sent for Signing",
  partially_signed: "Partially Signed",
  executed: "Executed",
  active: "Active",
  amended: "Amended",
  suspended: "Suspended",
  completed: "Completed",
  terminated: "Terminated",
  archived: "Archived",
};

export type CCIPOwnershipModel =
  | "client_ownership"
  | "client_license"
  | "devengine_ownership_licensed"
  | "custom";

export const CC_IP_OWNERSHIP_LABELS: Record<CCIPOwnershipModel, string> = {
  client_ownership: "Client receives ownership of project deliverables",
  client_license: "Client receives license to use deliverables",
  devengine_ownership_licensed: "DevEngine retains ownership, licenses usage rights",
  custom: "Custom arrangement (requires legal review)",
};

export interface CCServiceAgreementClauses {
  engagementDescription?: string;
  scopeOfWork?: string;
  devengineResponsibilities?: string[];
  clientResponsibilities?: string[];
  deliverablesAndMilestones?: string;
  projectSchedule?: string;
  acceptanceAndTesting?: string;
  feesAndPayment?: string;
  taxesAndExpenses?: string;
  latePaymentTerms?: string;
  scopeChanges?: string;
  ipOwnershipModel: CCIPOwnershipModel;
  ipDetails?: string;
  preExistingIP?: string;
  thirdPartyLicenses?: string;
  confidentialityRef?: string;
  dataProcessing?: string;
  securityRequirements?: string;
  warrantiesAndSupport?: string;
  limitationOfLiability?: string;
  indemnification?: string;
  terminationTerms?: string;
  exitObligations?: string;
  handoverRequirements?: string;
  disputeResolution: string;
  governingLaw: string;
  jurisdiction: string;
  notices?: string;
  entireAgreement?: string;
  severability: boolean;
  ipReviewFlag: boolean; // Requires IP legal review
  dataProtectionReviewFlag: boolean;
}

export interface CCServiceAgreement {
  id: string;
  agreementNumber: string; // DEV-AGR-2026-0001
  title: string;
  version: number;
  // Parties
  clientId: string;
  clientName?: string;
  clientSnapshot?: Partial<CCClient>;
  projectId?: string;
  projectTitle?: string;
  // Dates
  effectiveDate: string;
  termDescription?: string;
  // Linked documents
  quotationId?: string;
  quotationNumber?: string;
  ndaId?: string;
  ndaNumber?: string;
  sowId?: string;
  sowNumber?: string;
  // Clauses
  clauses: CCServiceAgreementClauses;
  // Commercial (synced from quotation)
  currency: CCCurrency;
  totalValue?: number;
  originalValue?: number;
  hasDiscount?: boolean;
  discountPercent?: number;
  paymentSchedule: CCPaymentMilestone[];
  // Template
  templateId?: string;
  templateVersion?: string;
  legalReviewStatus: "pending" | "reviewed" | "approved";
  legalReviewedBy?: string;
  legalReviewedAt?: string;
  // Status & execution
  status: CCServiceAgreementStatus;
  executedAt?: string;
  executedBy?: string;
  pdfUrl?: string;
  pdfStoragePath?: string;
  signedPdfUrl?: string;
  documentHash?: string;
  // Metadata
  changeOrderIds?: string[];
  auditTrail?: CCAuditEvent[];
  createdBy: string;
  createdAt: string;
  updatedBy?: string;
  updatedAt: string;
  isArchived?: boolean;
  archivedAt?: string;
  isDeleted?: boolean;
  deletedAt?: string;
}

// ════════════════════════════════════════════
// 7. STATEMENT OF WORK
// ════════════════════════════════════════════

export type CCSOWStatus =
  | "draft"
  | "internal_review"
  | "approved"
  | "sent"
  | "executed"
  | "amended"
  | "completed"
  | "archived";

export interface CCSOW {
  id: string;
  sowNumber: string; // DEV-SOW-2026-0001
  title: string;
  version: number;
  // Relations
  clientId: string;
  clientName?: string;
  projectId?: string;
  agreementId?: string;
  agreementNumber?: string;
  // Content
  projectObjectives: string;
  includedFunctionality: string[];
  excludedFunctionality: string[];
  technicalStack?: string;
  platforms?: string[];
  integrations?: string[];
  dataMigration?: string;
  hostingAndDeployment?: string;
  securityRequirements?: string;
  acceptanceTesting?: string;
  deliverables: CCDeliveryPhase[];
  clientProvidedMaterials?: string[];
  dependencies?: string[];
  thirdPartyServiceCosts?: string[];
  revisionLimits?: string;
  changeRequestProcedure?: string;
  warrantyBoundaries?: string;
  handoverChecklist?: string[];
  // Status
  status: CCSOWStatus;
  templateId?: string;
  executedAt?: string;
  pdfUrl?: string;
  pdfStoragePath?: string;
  documentHash?: string;
  auditTrail?: CCAuditEvent[];
  createdBy: string;
  createdAt: string;
  updatedBy?: string;
  updatedAt: string;
}

// ════════════════════════════════════════════
// 8. CHANGE ORDERS
// ════════════════════════════════════════════

export type CCChangeOrderStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "approved"
  | "rejected"
  | "executed"
  | "superseded"
  | "archived";

export const CC_CHANGE_ORDER_STATUS_LABELS: Record<CCChangeOrderStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  under_review: "Under Review",
  approved: "Approved",
  rejected: "Rejected",
  executed: "Executed",
  superseded: "Superseded",
  archived: "Archived",
};

export interface CCChangeOrder {
  id: string;
  changeOrderNumber: string; // DEV-CR-2026-0001
  version: number;
  // Relations
  projectId: string;
  projectTitle?: string;
  clientId: string;
  clientName?: string;
  originalAgreementId: string;
  originalAgreementNumber?: string;
  sowId?: string;
  // Content
  title: string;
  description: string;
  reason: string;
  addedDeliverables?: string[];
  removedDeliverables?: string[];
  modifiedDeliverables?: string[];
  impactOnDates?: string;
  additionalFees?: number;
  reducedFees?: number;
  revisedPaymentSchedule?: CCPaymentMilestone[];
  dependencies?: string;
  assumptions?: string;
  // Status & approval
  status: CCChangeOrderStatus;
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  effectiveDate?: string;
  // Execution
  executedAt?: string;
  pdfUrl?: string;
  pdfStoragePath?: string;
  documentHash?: string;
  // Metadata
  auditTrail?: CCAuditEvent[];
  createdBy: string;
  createdAt: string;
  updatedBy?: string;
  updatedAt: string;
}

// ════════════════════════════════════════════
// 9. SIGNATURES
// ════════════════════════════════════════════

export type CCSignerRole = "devengine_authorized" | "client_authorized" | "witness";

export type CCSignatureStatus =
  | "not_requested"
  | "invitation_sent"
  | "invitation_delivered"
  | "viewed"
  | "identity_pending"
  | "identity_verified"
  | "signed"
  | "declined"
  | "expired"
  | "cancelled";

export interface CCSignatureRequest {
  id: string;
  documentType: CCDocumentType;
  documentId: string;
  documentRef: string;
  documentVersion: number;
  documentHash?: string; // SHA-256 of the document being signed
  // Signers
  signers: CCSignerRecord[];
  signingOrder: "sequential" | "parallel";
  // Status
  status: "pending" | "in_progress" | "completed" | "cancelled" | "expired";
  completedAt?: string;
  expiresAt?: string;
  // Access token
  accessToken?: string; // Secure random token for client-facing page
  tokenExpiresAt?: string;
  // Metadata
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CCSignerRecord {
  id: string;
  name: string;
  email: string;
  role: CCSignerRole;
  title?: string;
  organization?: string;
  signingOrder?: number;
  // Status
  status: CCSignatureStatus;
  invitedAt?: string;
  viewedAt?: string;
  signedAt?: string;
  declinedAt?: string;
  declineReason?: string;
  // Signature evidence
  signatureMethod?: "typed" | "drawn" | "uploaded" | "provider";
  signatureDataUrl?: string; // For drawn signatures
  typedName?: string;
  ipAddress?: string;
  userAgent?: string;
  consentRecorded?: boolean;
  consentTimestamp?: string;
}

// ════════════════════════════════════════════
// 10. DELIVERY MILESTONES
// ════════════════════════════════════════════

export type CCMilestoneStatus =
  | "pending"
  | "in_progress"
  | "submitted"
  | "under_review"
  | "accepted"
  | "rejected"
  | "overdue";

export interface CCMilestoneRecord {
  id: string;
  projectId: string;
  projectTitle?: string;
  clientId: string;
  phaseId?: string;
  phaseName: string;
  description: string;
  deliverables: string[];
  acceptanceCriteria?: string;
  plannedDate: string;
  actualDate?: string;
  status: CCMilestoneStatus;
  submittedAt?: string;
  acceptedAt?: string;
  acceptedBy?: string;
  rejectedAt?: string;
  rejectionNotes?: string;
  linkedPaymentId?: string;
  attachments?: CCFileAttachment[];
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// ════════════════════════════════════════════
// 11. TEMPLATES & CLAUSE LIBRARY
// ════════════════════════════════════════════

export type CCTemplateType =
  | "quotation"
  | "technical_proposal"
  | "nda_one_way"
  | "nda_mutual"
  | "service_agreement"
  | "sow"
  | "change_order"
  | "acceptance_certificate"
  | "handover_certificate"
  | "maintenance_agreement"
  | "contractor_agreement"
  | "profit_participation";

export const CC_TEMPLATE_TYPE_LABELS: Record<CCTemplateType, string> = {
  quotation: "Software Development Quotation",
  technical_proposal: "Technical Proposal",
  nda_one_way: "One-Way NDA",
  nda_mutual: "Mutual NDA",
  service_agreement: "Software Development Services Agreement",
  sow: "Project Statement of Work",
  change_order: "Change Order",
  acceptance_certificate: "Deliverable Acceptance Certificate",
  handover_certificate: "Project Handover Certificate",
  maintenance_agreement: "Maintenance & Support Agreement",
  contractor_agreement: "Independent Contractor Agreement",
  profit_participation: "Project Profit Participation Agreement",
};

export type CCTemplateReviewStatus = "draft" | "under_review" | "approved" | "retired";

export interface CCDocumentTemplate {
  id: string;
  name: string;
  templateType: CCTemplateType;
  version: number;
  effectiveFrom: string;
  reviewStatus: CCTemplateReviewStatus;
  reviewedBy?: string;
  lastReviewedAt?: string;
  nextReviewDate?: string;
  jurisdiction: string;
  supportedVariants?: string[];
  variables: string[];
  configurableClauses: string[];
  requiredFields: string[];
  optionalClauses: string[];
  legalReviewStatus: "pending" | "reviewed" | "approved";
  supersededVersionId?: string;
  content?: string; // Template content / structure
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type CCClauseCategory =
  | "preamble"
  | "definitions"
  | "scope"
  | "commercial"
  | "payment"
  | "ip"
  | "confidentiality"
  | "data_protection"
  | "warranties"
  | "liability"
  | "indemnification"
  | "termination"
  | "dispute_resolution"
  | "governing_law"
  | "notices"
  | "boilerplate"
  | "signature"
  | "custom";

export interface CCClauseLibraryItem {
  id: string;
  title: string;
  category: CCClauseCategory;
  version: number;
  applicableDocTypes: CCDocumentType[];
  content: string;
  variables?: string[];
  isMandatory: boolean;
  defaultActive: boolean;
  sortOrder: number;
  legalReviewRequired: boolean;
  legalReviewWarning?: string;
  jurisdiction?: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// ════════════════════════════════════════════
// 12. CONTRACT CENTER SETTINGS
// ════════════════════════════════════════════

export interface CCNumberSequence {
  id: string; // e.g. "quotation", "nda", "agreement"
  prefix: string; // e.g. "DEV-QUO"
  currentYear: number;
  lastNumber: number;
  updatedAt: string;
}

export interface CCSettings {
  id: string;
  // Business profile
  legalBusinessName: string;
  brandName: string;
  registeredAddress?: string;
  businessAddress: string;
  officialEmail: string;
  officialPhone?: string;
  website: string;
  authorizedSignatories: Array<{ name: string; title: string; email: string }>;
  logoUrl?: string;
  registrationInfo?: string;
  jurisdictionDefaults: string;
  // Commercial
  defaultCurrency: CCCurrency;
  allowedCurrencies: CCCurrency[];
  numberingPrefixes: Record<string, string>;
  defaultQuoteValidityDays: number;
  discountApprovalLimitPercent: number;
  standardProjectCategories: string[];
  deliveryPhasePresets: string[];
  warrantyOptions: string[];
  approvedCommercialModels: CCCommercialModel[];
  // Legal
  defaultGoverningLaw: string;
  defaultDisputeResolution: string;
  defaultNDATermMonths: number;
  defaultConfidentialityMonths: number;
  defaultSigningMethod: string;
  requiredSignatories: number;
  legalReviewRequired: boolean;
  dataRetentionPolicy?: string;
  // Metadata
  updatedBy?: string;
  updatedAt: string;
}

// ════════════════════════════════════════════
// 13. DASHBOARD METRICS
// ════════════════════════════════════════════

export interface CCDashboardMetrics {
  totalQuotations: number;
  draftQuotations: number;
  pendingReview: number;
  awaitingClientResponse: number;
  acceptedQuotations: number;
  awaitingSignature: number;
  activeAgreements: number;
  activeNDAs: number;
  expiringNDAs: number;
  overdueProjects: number;
  pendingPayments: number;
  overduePayments: number;
}

// ════════════════════════════════════════════
// 14. DEFAULT VALUES
// ════════════════════════════════════════════

export const CC_DEFAULT_SETTINGS: Omit<CCSettings, "id"> = {
  legalBusinessName: "DevEngine Technology Operations",
  brandName: "DevEngine",
  businessAddress: "DevEngine Technology Operations, Dhaka, Bangladesh",
  officialEmail: process.env.NEXT_PUBLIC_ADMIN_EMAIL || "hamim.leon@gmail.com",
  website: process.env.NEXT_PUBLIC_BASE_URL || "https://thedevengine.vercel.app",
  authorizedSignatories: [
    {
      name: "MD. Abdul Hamim Leon",
      title: "CEO & Managing Director",
      email: process.env.NEXT_PUBLIC_ADMIN_EMAIL || "hamim.leon@gmail.com",
    },
  ],
  jurisdictionDefaults: "Dhaka, Bangladesh",
  defaultCurrency: "BDT",
  allowedCurrencies: ["BDT", "USD", "EUR", "GBP"],
  numberingPrefixes: {
    client: "DEV-CLI",
    project: "DEV-PRJ",
    quotation: "DEV-QUO",
    nda: "DEV-NDA",
    agreement: "DEV-AGR",
    sow: "DEV-SOW",
    change_order: "DEV-CR",
  },
  defaultQuoteValidityDays: 30,
  discountApprovalLimitPercent: 15,
  standardProjectCategories: [
    "Web Application",
    "Mobile Application",
    "SaaS Platform",
    "E-Commerce",
    "API Development",
    "UI/UX Design",
    "DevOps & Infrastructure",
    "Maintenance & Support",
    "Consulting",
    "Custom Software",
  ],
  deliveryPhasePresets: [
    "Discovery & Requirements",
    "Architecture & Design",
    "Core Development",
    "Testing & QA",
    "Deployment & Launch",
    "Post-Launch Support",
  ],
  warrantyOptions: [
    "30 Days Bug Fixes",
    "60 Days Bug Fixes",
    "90 Days Bug Fixes",
    "6 Months Full Support",
    "12 Months Maintenance",
  ],
  approvedCommercialModels: [
    "fixed_price",
    "itemized_fixed",
    "hourly",
    "milestone",
    "monthly_retainer",
    "time_and_materials",
    "recurring_maintenance",
  ],
  defaultGoverningLaw: "Laws of the People's Republic of Bangladesh",
  defaultDisputeResolution: "Amicable Executive Negotiation, followed by Arbitral Conciliation in Dhaka",
  defaultNDATermMonths: 24,
  defaultConfidentialityMonths: 36,
  defaultSigningMethod: "electronic",
  requiredSignatories: 2,
  legalReviewRequired: true,
  updatedAt: new Date().toISOString(),
};
