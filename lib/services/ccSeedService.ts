// lib/services/ccSeedService.ts
// ─────────────────────────────────────────────────────────────
// DevEngine Contract Center — Demonstration & Sample Data Seeder
// ─────────────────────────────────────────────────────────────

import { db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { COLLECTIONS } from "./contractCenterService";
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
  CCAuditEvent,
} from "@/types/contractCenter";

export async function seedContractCenterDemoData(adminEmail: string = "hamim.leon@gmail.com"): Promise<{
  clients: number;
  projects: number;
  quotations: number;
  ndas: number;
  agreements: number;
  sows: number;
  changeOrders: number;
  milestones: number;
}> {
  const now = new Date();
  const pastDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const recentDate = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();
  const nowDate = now.toISOString();

  // 1. CLIENTS
  const clientApexId = "client_apex_fintech";
  const clientApex: CCClient = {
    id: clientApexId,
    clientNumber: "DEV-CLI-2026-0001",
    clientType: "organization",
    legalName: "Apex FinTech Solutions Ltd",
    organizationName: "Apex FinTech Bangladesh",
    businessRegistration: "C-184920/2022",
    primaryContactName: "Tanvir Ahmed",
    authorizedSignatoryName: "Tanvir Ahmed",
    authorizedSignatoryTitle: "Chief Technology Officer",
    email: "tanvir.ahmed@apexfintech.com.bd",
    phone: "+880 1712-345678",
    businessAddress: "Level 14, Simpletree Anarkali, 89 Gulshan Avenue, Dhaka-1212",
    noticeAddress: "legal@apexfintech.com.bd",
    country: "Bangladesh",
    jurisdiction: "Dhaka, Bangladesh",
    preferredCurrency: "BDT",
    taxInfo: "TIN: 489201928312 | BIN: 002910291-0101",
    internalNotes: "Tier-1 Strategic Corporate Client. Core banking API & MFS integration.",
    status: "active",
    contacts: [
      {
        name: "Tanvir Ahmed",
        email: "tanvir.ahmed@apexfintech.com.bd",
        title: "CTO",
        phone: "+880 1712-345678",
        isPrimary: true,
      },
      {
        name: "Farhana Yasmin",
        email: "farhana.y@apexfintech.com.bd",
        title: "Head of Product",
        phone: "+880 1819-987654",
      },
    ],
    createdBy: adminEmail,
    createdAt: pastDate,
    updatedAt: nowDate,
  };

  const clientNexusId = "client_nexus_logistics";
  const clientNexus: CCClient = {
    id: clientNexusId,
    clientNumber: "DEV-CLI-2026-0002",
    clientType: "organization",
    legalName: "Nexus Retail & OmniLogistics Ltd",
    organizationName: "Nexus Global Logistics",
    businessRegistration: "C-198302/2023",
    primaryContactName: "Sadia Rahman",
    authorizedSignatoryName: "Sadia Rahman",
    authorizedSignatoryTitle: "Managing Director",
    email: "sadia.rahman@nexuslogistics.com.bd",
    phone: "+880 1911-223344",
    businessAddress: "Agrabad Commercial Area, Chittagong-4100",
    noticeAddress: "contracts@nexuslogistics.com.bd",
    country: "Bangladesh",
    jurisdiction: "Chittagong, Bangladesh",
    preferredCurrency: "BDT",
    taxInfo: "TIN: 391029481023 | BIN: 001928374-0202",
    internalNotes: "National multi-warehouse inventory ERP and real-time tracking.",
    status: "active",
    createdBy: adminEmail,
    createdAt: pastDate,
    updatedAt: nowDate,
  };

  await setDoc(doc(db, COLLECTIONS.clients, clientApexId), clientApex);
  await setDoc(doc(db, COLLECTIONS.clients, clientNexusId), clientNexus);

  // 2. PROJECTS
  const projectApexId = "proj_apex_core_banking";
  const projectApex: CCProject = {
    id: projectApexId,
    projectNumber: "DEV-PRJ-2026-0001",
    title: "NextGen Mobile Banking & Core MFS Engine",
    clientId: clientApexId,
    clientName: clientApex.legalName,
    projectType: "Enterprise Financial System",
    description: "High-throughput transaction engine, biometrics authentication, QR payment processing, and automated bank reconciliation.",
    commercialModel: "milestone",
    currency: "BDT",
    approvedBudget: 1250000,
    status: "active",
    estimatedStartDate: pastDate.split("T")[0],
    estimatedEndDate: "2026-12-31",
    createdBy: adminEmail,
    createdAt: pastDate,
    updatedAt: nowDate,
  };

  const projectNexusId = "proj_nexus_omni_erp";
  const projectNexus: CCProject = {
    id: projectNexusId,
    projectNumber: "DEV-PRJ-2026-0002",
    title: "Multi-Branch Warehouse & Omni-Channel ERP",
    clientId: clientNexusId,
    clientName: clientNexus.legalName,
    projectType: "Supply Chain & Retail ERP",
    description: "Centralized inventory synchronization, automated purchase ordering, barcode scanner support, and real-time fleet delivery routing.",
    commercialModel: "milestone",
    currency: "BDT",
    approvedBudget: 780000,
    status: "approved",
    estimatedStartDate: recentDate.split("T")[0],
    estimatedEndDate: "2026-11-30",
    createdBy: adminEmail,
    createdAt: recentDate,
    updatedAt: nowDate,
  };

  await setDoc(doc(db, COLLECTIONS.projects, projectApexId), projectApex);
  await setDoc(doc(db, COLLECTIONS.projects, projectNexusId), projectNexus);

  // 3. COMMERCIAL QUOTATIONS
  const quoteApexId = "quote_dev_qt_0001";
  const quoteApex: CCQuotation = {
    id: quoteApexId,
    quotationNumber: "DEV-QT-0001",
    version: 1,
    title: "NextGen Core Banking & MFS Payment Architecture",
    clientId: clientApexId,
    clientName: clientApex.legalName,
    clientSnapshot: clientApex,
    projectId: projectApexId,
    projectTitle: projectApex.title,
    commercialModel: "milestone",
    currency: "BDT",
    issueDate: pastDate.split("T")[0],
    validUntilDate: "2026-12-31",
    preparedBy: adminEmail,
    preparedByName: "Hamim Leon",
    lineItems: [
      {
        id: "del_1",
        name: "High-Concurrency Transaction Engine",
        description: "ISO 8583 compliant microservice architecture handling 5,000+ TPS with Redis caching and PostgreSQL cluster.",
        quantity: 1,
        unit: "fixed",
        unitPrice: 450000,
        lineTotal: 450000,
        sortOrder: 1,
      },
      {
        id: "del_2",
        name: "Multi-Factor & Biometric Auth Gateway",
        description: "FIDO2 WebAuthn & biometric face/fingerprint authentication with hardware-backed encryption.",
        quantity: 1,
        unit: "fixed",
        unitPrice: 280000,
        lineTotal: 280000,
        sortOrder: 2,
      },
      {
        id: "del_3",
        name: "Real-Time Settlement & Reconciliation API",
        description: "Automated end-of-day bank ledger clearing and NPSB/BEFTN gateway integrations.",
        quantity: 1,
        unit: "fixed",
        unitPrice: 320000,
        lineTotal: 320000,
        sortOrder: 3,
      },
      {
        id: "del_4",
        name: "Admin Analytics Dashboard & Audit Logging",
        description: "Full-fidelity reporting console with role-based access control, exportable compliance sheets, and live transaction graph.",
        quantity: 1,
        unit: "fixed",
        unitPrice: 200000,
        lineTotal: 200000,
        sortOrder: 4,
      },
    ],
    subtotal: 1250000,
    totalDiscount: 0,
    totalTax: 0,
    approvedExpenses: 0,
    grandTotal: 1250000,
    scope: {
      executiveSummary: "Comprehensive proposal for deploying DevEngine's enterprise-grade MFS financial gateway with dedicated 24/7 SLA.",
    },
    deliveryPhases: [],
    paymentSchedule: [
      {
        id: "ms_quote_1",
        description: "Advance Mobilization Deposit (30%)",
        percentage: 30,
        amount: 375000,
        dueDate: pastDate.split("T")[0],
        status: "paid",
        paidDate: pastDate,
        sortOrder: 1,
      },
      {
        id: "ms_quote_2",
        description: "Core Engine Beta Staging Release (40%)",
        percentage: 40,
        amount: 500000,
        dueDate: recentDate.split("T")[0],
        status: "invoiced",
        sortOrder: 2,
      },
      {
        id: "ms_quote_3",
        description: "Production Go-Live & Final Signoff (30%)",
        percentage: 30,
        amount: 375000,
        dueDate: "2026-12-15",
        status: "pending",
        sortOrder: 3,
      },
    ],
    terms: {
      validityDays: 30,
      acceptanceMethod: "signed_agreement",
      requiresDeposit: true,
      depositAmount: 375000,
      depositPercent: 30,
      isBindingOffer: true,
      requiresSeparateAgreement: true,
    },
    status: "accepted",
    viewedAt: recentDate,
    createdBy: adminEmail,
    createdAt: pastDate,
    updatedAt: nowDate,
  };

  const quoteNexusId = "quote_dev_qt_0002";
  const quoteNexus: CCQuotation = {
    id: quoteNexusId,
    quotationNumber: "DEV-QT-0002",
    version: 1,
    title: "Multi-Branch Warehouse & Omni-Channel ERP System",
    clientId: clientNexusId,
    clientName: clientNexus.legalName,
    clientSnapshot: clientNexus,
    projectId: projectNexusId,
    projectTitle: projectNexus.title,
    commercialModel: "milestone",
    currency: "BDT",
    issueDate: recentDate.split("T")[0],
    validUntilDate: "2026-12-31",
    preparedBy: adminEmail,
    preparedByName: "Hamim Leon",
    lineItems: [
      {
        id: "del_nx_1",
        name: "Central Inventory & Barcode Tracking",
        description: "Automated stock balance sync across 12 branch warehouses with low-stock SMS alerts.",
        quantity: 1,
        unit: "fixed",
        unitPrice: 300000,
        lineTotal: 300000,
        sortOrder: 1,
      },
      {
        id: "del_nx_2",
        name: "Point-of-Sale (POS) Offline Sync Engine",
        description: "Local indexedDB sync allowing cashiers to bill customers without active internet.",
        quantity: 1,
        unit: "fixed",
        unitPrice: 280000,
        lineTotal: 280000,
        sortOrder: 2,
      },
      {
        id: "del_nx_3",
        name: "Vendor Procurement & Purchase Order Workflow",
        description: "Multi-tier approval matrix for bulk supplier purchase orders and GRN matching.",
        quantity: 1,
        unit: "fixed",
        unitPrice: 200000,
        lineTotal: 200000,
        sortOrder: 3,
      },
    ],
    subtotal: 780000,
    totalDiscount: 0,
    totalTax: 0,
    approvedExpenses: 0,
    grandTotal: 780000,
    scope: {
      executiveSummary: "Multi-branch retail and distribution ERP suite connecting 12 warehouse hubs.",
    },
    deliveryPhases: [],
    paymentSchedule: [
      {
        id: "ms_nx_1",
        description: "Advance Kickoff Payment (40%)",
        percentage: 40,
        amount: 312000,
        dueDate: recentDate.split("T")[0],
        status: "paid",
        paidDate: recentDate,
        sortOrder: 1,
      },
      {
        id: "ms_nx_2",
        description: "UAT Pilot & Multi-Branch Rollout (60%)",
        percentage: 60,
        amount: 468000,
        dueDate: "2026-11-20",
        status: "pending",
        sortOrder: 2,
      },
    ],
    terms: {
      validityDays: 30,
      acceptanceMethod: "online_acceptance",
      requiresDeposit: true,
      depositAmount: 312000,
      depositPercent: 40,
      isBindingOffer: true,
      requiresSeparateAgreement: true,
    },
    status: "sent",
    viewedAt: recentDate,
    createdBy: adminEmail,
    createdAt: recentDate,
    updatedAt: nowDate,
  };

  await setDoc(doc(db, COLLECTIONS.quotations, quoteApexId), quoteApex);
  await setDoc(doc(db, COLLECTIONS.quotations, quoteNexusId), quoteNexus);

  // 4. NON-DISCLOSURE AGREEMENTS (NDAs)
  const ndaApexId = "nda_dev_nda_0001";
  const ndaApex: CCNDA = {
    id: ndaApexId,
    ndaNumber: "DEV-NDA-0001",
    version: 1,
    ndaType: "mutual",
    isMutual: true,
    clientId: clientApexId,
    disclosingPartyName: "DevEngine Technologies",
    receivingPartyName: clientApex.legalName,
    purpose: "Mutual disclosure of confidential MFS architecture, banking protocols, and proprietary source code.",
    termMonths: 36,
    governingLaw: "Bangladesh",
    disputeResolution: "Arbitration under the Arbitration Act, 2001 of Bangladesh",
    status: "executed",
    executionMethod: "electronic",
    legalReviewStatus: "approved",
    executedAt: pastDate,
    executedBy: adminEmail,
    confidentialityDurationMonths: 36,
    effectiveDate: pastDate.split("T")[0],
    expiryDate: "2029-10-01",
    createdBy: adminEmail,
    createdAt: pastDate,
    updatedAt: nowDate,
    auditTrail: [
      {
        action: "NDA Executed",
        performedBy: clientApex.email,
        timestamp: pastDate,
        details: "Mutually signed by Hamim Leon and Tanvir Ahmed",
      },
    ],
  };

  const ndaNexusId = "nda_dev_nda_0002";
  const ndaNexus: CCNDA = {
    id: ndaNexusId,
    ndaNumber: "DEV-NDA-0002",
    version: 1,
    ndaType: "one_way",
    isMutual: false,
    clientId: clientNexusId,
    disclosingPartyName: "DevEngine Technologies",
    receivingPartyName: clientNexus.legalName,
    purpose: "Evaluation of proprietary logistics algorithms and ERP database structures.",
    termMonths: 24,
    governingLaw: "Bangladesh",
    disputeResolution: "Arbitration Act, 2001",
    status: "executed",
    executionMethod: "electronic",
    legalReviewStatus: "approved",
    executedAt: recentDate,
    executedBy: adminEmail,
    confidentialityDurationMonths: 24,
    effectiveDate: recentDate.split("T")[0],
    expiryDate: "2028-10-01",
    createdBy: adminEmail,
    createdAt: recentDate,
    updatedAt: nowDate,
  };

  await setDoc(doc(db, COLLECTIONS.ndas, ndaApexId), ndaApex);
  await setDoc(doc(db, COLLECTIONS.ndas, ndaNexusId), ndaNexus);

  // 5. MASTER SERVICE AGREEMENTS (MSAs)
  const agreementApexId = "agr_dev_agr_0001";
  const agreementApex: CCServiceAgreement = {
    id: agreementApexId,
    agreementNumber: "DEV-AGR-0001",
    version: 1,
    title: "Master Software Engineering & Technology Services Agreement",
    clientId: clientApexId,
    clientName: clientApex.legalName,
    clientSnapshot: clientApex,
    quotationId: quoteApexId,
    quotationNumber: quoteApex.quotationNumber,
    effectiveDate: pastDate.split("T")[0],
    currency: "BDT",
    totalValue: 1250000,
    clauses: {
      ipOwnershipModel: "client_ownership",
      scopeOfWork: "Custom MFS core banking transaction processing infrastructure.",
      feesAndPayment: "Total engagement fee of BDT 1,250,000 payable via milestone schedule.",
      ipDetails: "Upon receipt of full contract price (BDT 1,250,000), DevEngine transfers all rights, title, and ownership in customized source code and deliverables.",
      warrantiesAndSupport: "DevEngine warrants deliverables for 90 days following deployment.",
      limitationOfLiability: "Liability capped at the total amount paid under this agreement.",
      governingLaw: "Bangladesh",
      jurisdiction: "Dhaka, Bangladesh",
      disputeResolution: "Arbitration Act 2001, Dhaka",
      severability: true,
      ipReviewFlag: false,
      dataProtectionReviewFlag: false,
    },
    paymentSchedule: quoteApex.paymentSchedule,
    legalReviewStatus: "approved",
    status: "active",
    executedAt: pastDate,
    executedBy: adminEmail,
    createdBy: adminEmail,
    createdAt: pastDate,
    updatedAt: nowDate,
    auditTrail: [
      {
        action: "MSA Activated",
        performedBy: adminEmail,
        timestamp: pastDate,
        details: "Agreement executed and counter-signed with full milestone schedules.",
      },
    ],
  };

  const agreementNexusId = "agr_dev_agr_0002";
  const agreementNexus: CCServiceAgreement = {
    id: agreementNexusId,
    agreementNumber: "DEV-AGR-0002",
    version: 1,
    title: "Enterprise Cloud Application & ERP License Agreement",
    clientId: clientNexusId,
    clientName: clientNexus.legalName,
    clientSnapshot: clientNexus,
    quotationId: quoteNexusId,
    quotationNumber: quoteNexus.quotationNumber,
    effectiveDate: recentDate.split("T")[0],
    currency: "BDT",
    totalValue: 780000,
    clauses: {
      ipOwnershipModel: "client_ownership",
      governingLaw: "Bangladesh",
      jurisdiction: "Chittagong, Bangladesh",
      disputeResolution: "Arbitration Act 2001, Chittagong",
      severability: true,
      ipReviewFlag: false,
      dataProtectionReviewFlag: false,
    },
    paymentSchedule: quoteNexus.paymentSchedule,
    legalReviewStatus: "approved",
    status: "active",
    executedAt: recentDate,
    executedBy: adminEmail,
    createdBy: adminEmail,
    createdAt: recentDate,
    updatedAt: nowDate,
  };

  await setDoc(doc(db, COLLECTIONS.agreements, agreementApexId), agreementApex);
  await setDoc(doc(db, COLLECTIONS.agreements, agreementNexusId), agreementNexus);

  // 6. STATEMENTS OF WORK (SOW)
  const sowApexId = "sow_dev_sow_0001";
  const sowApex: CCSOW = {
    id: sowApexId,
    sowNumber: "DEV-SOW-0001",
    title: "Phase 1: Core Transaction Processing Architecture & Security",
    version: 1,
    agreementId: agreementApexId,
    agreementNumber: agreementApex.agreementNumber,
    projectId: projectApexId,
    clientId: clientApexId,
    clientName: clientApex.legalName,
    projectObjectives: "Deployment of primary microservices, biometric gateway, and database read-replicas.",
    includedFunctionality: [
      "Containerized microservices cluster with 5,000 TPS capacity",
      "Porichoy national identity biometric matching API",
      "Automated BEFTN/NPSB clearing integration",
    ],
    excludedFunctionality: [
      "Legacy mainframe COBOL migration",
      "Physical POS card embossing hardware",
    ],
    deliverables: [],
    status: "approved",
    createdBy: adminEmail,
    createdAt: pastDate,
    updatedAt: nowDate,
  };

  await setDoc(doc(db, COLLECTIONS.sow, sowApexId), sowApex);

  // 7. CHANGE ORDERS
  const changeApexId = "co_dev_cr_0001";
  const changeApex: CCChangeOrder = {
    id: changeApexId,
    changeOrderNumber: "DEV-CR-0001",
    version: 1,
    originalAgreementId: agreementApexId,
    originalAgreementNumber: agreementApex.agreementNumber,
    projectId: projectApexId,
    projectTitle: projectApex.title,
    clientId: clientApexId,
    clientName: clientApex.legalName,
    title: "Integration of Bangladesh NID Face Recognition Verification API",
    description: "Integrate official Bangladesh Porichoy API for instant voter KYC matching with liveness detection.",
    reason: "Regulatory mandate for real-time Porichoy national identity biometric matching.",
    additionalFees: 120000,
    impactOnDates: "10 Days",
    status: "approved",
    createdBy: adminEmail,
    createdAt: recentDate,
    updatedAt: nowDate,
  };

  await setDoc(doc(db, COLLECTIONS.changeOrders, changeApexId), changeApex);

  // 8. SIGNATURE REQUEST RECORD
  const sigReqApexId = "sig_req_apex_0001";
  const sigReqApex: CCSignatureRequest = {
    id: sigReqApexId,
    documentType: "service_agreement",
    documentId: agreementApexId,
    documentRef: agreementApex.agreementNumber,
    documentVersion: 1,
    signingOrder: "parallel",
    status: "completed",
    signers: [
      {
        id: "signer_apex_1",
        name: clientApex.authorizedSignatoryName || "Tanvir Ahmed",
        email: clientApex.email,
        role: "client_authorized",
        title: "CTO",
        organization: clientApex.legalName,
        status: "signed",
        signedAt: pastDate,
        signatureMethod: "drawn",
        signatureDataUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        ipAddress: "103.205.71.4",
        consentRecorded: true,
        consentTimestamp: pastDate,
      },
    ],
    completedAt: pastDate,
    createdBy: adminEmail,
    createdAt: pastDate,
    updatedAt: nowDate,
  };

  await setDoc(doc(db, COLLECTIONS.signatures, sigReqApexId), sigReqApex);

  // 9. DELIVERY & PAYMENT MILESTONES
  const ms1Id = "ms_apex_1";
  const ms1: CCMilestoneRecord = {
    id: ms1Id,
    projectId: projectApexId,
    projectTitle: projectApex.title,
    clientId: clientApexId,
    phaseName: "Phase 1: Architecture",
    description: "Detailed system design document and repository scaffolding.",
    deliverables: ["Architecture Blueprint", "Schema Design"],
    plannedDate: pastDate.split("T")[0],
    actualDate: pastDate.split("T")[0],
    status: "accepted",
    acceptedAt: pastDate,
    acceptedBy: clientApex.primaryContactName,
    createdBy: adminEmail,
    createdAt: pastDate,
    updatedAt: pastDate,
  };

  const ms2Id = "ms_apex_2";
  const ms2: CCMilestoneRecord = {
    id: ms2Id,
    projectId: projectApexId,
    projectTitle: projectApex.title,
    clientId: clientApexId,
    phaseName: "Phase 2: Core Engine",
    description: "Delivery of API gateway, transaction worker queues, and staging testing.",
    deliverables: ["Transaction Gateway", "Worker Queues"],
    plannedDate: "2026-11-15",
    status: "under_review",
    submittedAt: recentDate,
    createdBy: adminEmail,
    createdAt: pastDate,
    updatedAt: nowDate,
  };

  const ms3Id = "ms_apex_3";
  const ms3: CCMilestoneRecord = {
    id: ms3Id,
    projectId: projectApexId,
    projectTitle: projectApex.title,
    clientId: clientApexId,
    phaseName: "Phase 3: Production Go-Live",
    description: "Cloud deployment, load test signoff, and staff training.",
    deliverables: ["Cloud Kubernetes Cluster", "Admin Portal"],
    plannedDate: "2026-12-15",
    status: "in_progress",
    createdBy: adminEmail,
    createdAt: pastDate,
    updatedAt: nowDate,
  };

  await setDoc(doc(db, COLLECTIONS.milestones, ms1Id), ms1);
  await setDoc(doc(db, COLLECTIONS.milestones, ms2Id), ms2);
  await setDoc(doc(db, COLLECTIONS.milestones, ms3Id), ms3);

  // 10. AUDIT TRAIL
  const aud1: CCAuditEvent = {
    action: "Contract Center Demo Seeded",
    performedBy: adminEmail,
    timestamp: nowDate,
    details: "Populated realistic enterprise clients, quotations, NDAs, and MSAs in BDT (৳)",
  };
  await setDoc(doc(db, COLLECTIONS.auditTrail, `aud_seed_${Date.now()}`), aud1);

  return {
    clients: 2,
    projects: 2,
    quotations: 2,
    ndas: 2,
    agreements: 2,
    sows: 1,
    changeOrders: 1,
    milestones: 3,
  };
}
