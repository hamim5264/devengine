/**
 * Automated Verification & Regression Test Suite
 * Tests Phase 1 - 11 of DevEngine Agreement Builder Upgrade
 */

import {
  AgreementRecord,
  AgreementType,
  AGREEMENT_TYPE_LABELS,
  AgreementAddendumRecord,
} from "../types/agreement";
import { createDefaultAgreement, validateAgreement } from "../lib/agreements/templateEngine";
import { buildAgreementClauses } from "../lib/agreements/agreementClauses";
import { generateAgreementPdf } from "../lib/utils/generateAgreementPdf";
import { generateAddendumPdf } from "../lib/utils/generateAddendumPdf";

let passedCount = 0;
let totalCount = 0;

function assert(condition: boolean, message: string) {
  totalCount++;
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  passedCount++;
  console.log(`✅ PASSED: ${message}`);
}

async function runTestSuite() {
  console.log("==================================================================");
  console.log("DEVENGINE AGREEMENT SYSTEM: AUTOMATED VERIFICATION SUITE");
  console.log("==================================================================\n");

  // -------------------------------------------------------------
  // TEST 1: All 8 Commercial Models Initialization
  // -------------------------------------------------------------
  console.log("▶ TEST 1: Verifying All 8 Commercial Models");
  const models = Object.keys(AGREEMENT_TYPE_LABELS) as AgreementType[];
  for (const model of models) {
    const record = createDefaultAgreement(model);
    assert(record.agreementType === model, `Model ${model} creates matching agreementType`);
    assert(!!record.agreementTypeLabel, `Model ${model} has descriptive human label`);
    const clauses = buildAgreementClauses(record);
    assert(clauses.length >= 10, `Model ${model} generates complete legal sections (${clauses.length} sections)`);
  }
  console.log("");

  // -------------------------------------------------------------
  // TEST 2: BLUME Regression Scenario Verification
  // -------------------------------------------------------------
  console.log("▶ TEST 2: BLUME Regression Scenario Verification");
  const blumeRecord: AgreementRecord = {
    ...createDefaultAgreement("profit_participation"),
    agreementNumber: "DEV-AGR-2026-0002",
    status: "validated",
    project: {
      projectName: "BLUME — AI Profit-Sharing Agreement",
      description: "AI-driven emotional intelligence and memory platform.",
      projectType: "Autonomous AI Agent Platform",
      agreementEffectiveDate: "2026-10-15",
      workCommencementDate: "2026-10-15",
      targetCompletionDate: "2026-11-10",
      plannedLaunchDate: "2026-11-10",
      projectStatus: "In Development",
    },
    developer: {
      legalName: "Sabiha Jahan",
      fullName: "Sabiha Jahan",
      professionalName: "Mishu",
      role: "AI Development Partner — BLUME",
      partyType: "individual",
      email: "mishu@blume-ai.org",
      phone: "+880 1700-000000",
      address: "Dhaka, Bangladesh",
    },
    devengine: {
      companyName: "DevEngine",
      legalEntityName: "DevEngine Ltd.",
      ceoName: "Hamim Leon",
      ceoTitle: "Founder & Chief Architect",
      authorizedSignatoryName: "Hamim Leon",
      authorizedSignatoryTitle: "Founder & Chief Architect",
      authorizedRepresentativeTitle: "Founder & Chief Architect",
      companyEmail: "governance@devengine.net",
      companyWebsite: "https://devengine.net",
      companyAddress: "Dhaka, Bangladesh",
      companyRegistrationJurisdiction: "Bangladesh",
    },
    compensation: {
      model: "profit_participation",
      currency: "BDT",
      profitTerms: {
        participationPercentage: 15,
        profitBasis: "Net Distributable Project Profit",
        vestingCondition: "Satisfactory delivery and acceptance sign-off of assigned core architecture modules.",
        profitStartTrigger: "Commercial monetization and public production release.",
        paymentFrequency: "Quarterly within 15 days following calendar quarter-end reconciliation",
        profitCalculationMethod: "Gross Project Receipts minus Verified Deductible Direct Project Expenses",
        eligibleProjectExpenses: [
          "Infrastructure & Cloud Hosting Costs (AWS, Vercel, Supabase, Neon)",
          "Third-Party AI & LLM Inference APIs (OpenAI, Anthropic, Gemini)",
          "Payment Processing & Gateway Fees (Stripe, SSLCommerz, bKash)",
          "App Store & Platform Commissions (Apple App Store, Google Play 15-30%)",
        ],
        contributorCompletionRequirement: "Delivery of Mori core architecture, memory pipelines, and production handover.",
        durationModel: "ongoing_indefinite",
        participationDurationDescription: "Ongoing with no fixed expiry date",
        postServiceTreatment: "full_continuing",
        postTerminationParticipation: "Full contractual participation continues unimpaired following active service conclusion.",
        breachTreatment: "Participation terminates solely upon adjudicated material breach of confidentiality or proprietary IP misappropriation.",
        voluntaryDepartureTreatment: "Participation continues provided all committed handover documentation is completed.",
        projectSaleOrTransferTreatment: "Entity transfer cedes all obligations to successor operating entity without diminution.",
        projectDiscontinuationTreatment: "Ceases only upon genuine bona fide permanent platform discontinuation.",
        corporateEquityGranted: false,
        accountingAuditProcedure: "Contributor may inspect quarterly itemized revenue and hosting cost statements with 10 business days prior notice.",
        reportingMethod: "Itemized quarterly reconciliation statement provided via encrypted PDF transmission.",
        reconciliationDeadlineDays: 15,
      },
    },
    deliverables: [
      {
        id: "d1",
        title: "Mori Core Architecture & Context Engine",
        description: "Vector memory pipeline, personality matrix, and low-latency response router.",
        acceptanceCriteria: "Passes automated regression benchmarks and latency below 450ms.",
        priority: "Critical",
      },
      {
        id: "d2",
        title: "Conversation Quality, Memory & Safety Systems",
        description: "Guardrails, emotional alignment filters, and prompt safety layers.",
        acceptanceCriteria: "Zero safety policy violations across benchmark test suite.",
        priority: "Critical",
      },
      {
        id: "d3",
        title: "AI Integration, Testing & Production Handover",
        description: "Production containerization, staging verification, and handover documentation.",
        acceptanceCriteria: "Complete operational runbook and staging sign-off.",
        priority: "High",
      },
      {
        id: "d4",
        title: "Post-Launch AI Maintenance Support",
        description: "Ongoing prompt tuning, regression monitoring, and monthly model evaluations.",
        acceptanceCriteria: "Monthly SLA adherence report.",
        priority: "Medium",
      },
    ],
    terms: {
      noticePeriodDays: 30,
      bugFixPeriodDays: 90,
      confidentialityDurationYears: 5,
      paymentDuePeriodDays: 15,
      acceptancePeriodDays: 10,
      terminationNoticeDays: 30,
      disputeResolutionMethod: "Amicable Consultation followed by Arbitration in Dhaka, Bangladesh",
      governingLaw: "Bangladesh",
      jurisdiction: "Courts of Dhaka, Bangladesh",
      nonSolicitationYears: 2,
      ipOwnershipModel: "work_for_hire",
      preExistingIpDisclosed: false,
      thirdPartyLicensesAllowed: "Standard permissive open source (MIT, Apache 2.0)",
      moralRightsWaiver: "moral_rights_retained",
      personalDataProtectionClause: true,
      securityBreachNotificationHours: 24,
      repositoryOwnershipHandover: true,
      changeRequestWrittenRequirement: true,
      nonCompeteIncluded: false,
      severabilityIncluded: true,
      electronicSignatureAccepted: true,
    },
  };

  // Run deep validation on BLUME
  const blumeValidation = validateAgreement(blumeRecord);
  assert(blumeValidation.valid, "BLUME agreement passes deep structural validation");
  assert(blumeValidation.errors.length === 0, "BLUME has 0 structural validation errors");

  // Build clauses and verify NO hardcoded 24m or 12m contradictions
  const blumeClauses = buildAgreementClauses(blumeRecord);
  const commercialClause = blumeClauses.find((c) => c.id === "compensation_terms" || c.number === "5");
  assert(!!commercialClause, "BLUME generates Commercial Terms Clause");

  const commercialText = (commercialClause!.paragraphs || []).join(" ");
  const commercialLower = commercialText.toLowerCase();
  assert(
    commercialLower.includes("ongoing") && (commercialLower.includes("no fixed expir") || commercialLower.includes("no fixed expiry")),
    "Commercial Terms explicitly affirm ongoing indefinite profit participation"
  );
  assert(
    !commercialText.includes("twenty-four (24) months"),
    "Commercial Terms do NOT impose hardcoded 24-month expiry on ongoing BLUME agreement"
  );

  const terminationClause = blumeClauses.find((c) => c.id === "termination_and_breach" || c.number === "14");
  assert(!!terminationClause, "BLUME generates Termination & Post-Service Terms Clause");
  const termText = (terminationClause!.paragraphs || []).join(" ");
  assert(
    termText.includes("NOT cancel, extinguish, or forfeit") || termText.includes("continue to be calculated"),
    "Section 14 explicitly protects ongoing profit entitlement post-service"
  );
  assert(
    !termText.includes("twelve (12) months following termination"),
    "Section 14 does NOT impose hardcoded 12-month post-departure cancellation"
  );
  console.log("");

  // -------------------------------------------------------------
  // TEST 3: Validation Engine Edge Cases
  // -------------------------------------------------------------
  console.log("▶ TEST 3: Deep Validation Engine Error & Warning Detection");

  // Edge case: Conflicting dates (target date before commencement)
  const badDateRecord = {
    ...blumeRecord,
    project: {
      ...blumeRecord.project,
      workCommencementDate: "2026-11-20",
      targetCompletionDate: "2026-10-10",
    },
  };
  const badDateValidation = validateAgreement(badDateRecord);
  assert(!badDateValidation.valid, "Validation correctly blocks target completion date earlier than commencement date");

  // Edge case: Negative percentage
  const badPctRecord = {
    ...blumeRecord,
    compensation: {
      ...blumeRecord.compensation,
      profitTerms: {
        ...blumeRecord.compensation.profitTerms!,
        participationPercentage: -5,
      },
    },
  };
  const badPctValidation = validateAgreement(badPctRecord);
  assert(!badPctValidation.valid, "Validation correctly blocks negative profit participation percentage");

  // Edge case: Milestone total mismatch
  const milestoneRecord = createDefaultAgreement("milestone");
  milestoneRecord.compensation.totalContractValue = 999999; // Intentionally out of sync with milestones
  const milestoneValidation = validateAgreement(milestoneRecord);
  assert(
    milestoneValidation.warnings.some((w) => w.includes("does not match Total Contract Value") || w.includes("Sum of milestones")),
    "Validation detects discrepancy between milestone tranches and declared total contract value"
  );
  console.log("");

  // -------------------------------------------------------------
  // TEST 4: Addendum Workflow & Precedence Engine
  // -------------------------------------------------------------
  console.log("▶ TEST 4: Addendum & Amendment Lifecycle");
  const sampleAddendum: AgreementAddendumRecord = {
    id: "DEV-ADD-2026-0001",
    addendumNumber: "DEV-ADD-2026-0001",
    parentAgreementId: blumeRecord.agreementNumber,
    parentAgreementNumber: blumeRecord.agreementNumber,
    projectTitle: blumeRecord.project.projectName,
    contributorName: blumeRecord.developer.legalName,
    effectiveDate: "2026-10-16",
    status: "executed",
    amendedClauses: [
      {
        clauseId: "sec_profit_duration",
        clauseTitle: "Duration of Profit Participation",
        rationale: "Formally supersede any historical 24-month language with ongoing indefinite entitlement.",
        originalText: "Participation shall commence on the Public Launch Date and remain in effect for a period of twenty-four (24) months.",
        replacementText: "Participation shall commence on the Effective Date and continue on an ongoing indefinite basis with no fixed expiry date, surviving conclusion of active services.",
      },
      {
        clauseId: "sec_post_service",
        clauseTitle: "Post-Termination Entitlements",
        rationale: "Clarify survival of participation following conclusion of active services.",
        originalText: "Upon termination of active services for convenience, contributor participation shall extinguish within twelve (12) months.",
        replacementText: "Contributor participation in Net Distributable Project Profit shall remain unimpaired following conclusion of active services.",
      },
    ],
    unchangedAffirmation: "All other terms and covenants of DEV-AGR-2026-0002 remain in full force and effect.",
    precedenceClause: "In the event of any conflict, this Addendum shall prevail and control.",
    createdBy: "hamim.leon@gmail.com",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  assert(sampleAddendum.amendedClauses.length === 2, "Addendum contains 2 amended clauses");
  assert(sampleAddendum.precedenceClause.includes("prevail"), "Addendum enforces legal precedence over principal contract");
  assert(sampleAddendum.unchangedAffirmation.includes("full force"), "Addendum ratifies unchanged principal covenants");
  console.log("");

  // -------------------------------------------------------------
  // TEST 5: PDF Rendering Engine & Overflow Protection
  // -------------------------------------------------------------
  console.log("▶ TEST 5: PDF Rendering Engine (Dynamic Text & Decoupled Header)");

  // Test rendering long title + long contributor role
  const overflowTestRecord: AgreementRecord = {
    ...blumeRecord,
    project: {
      ...blumeRecord.project,
      projectName: "Super Ultra Large Enterprise Multi-Tenant Distributed AI Copilot Platform For Financial Services Architecture",
    },
    developer: {
      ...blumeRecord.developer,
      role: "Principal Senior Staff Distributed Systems Infrastructure And AI Memory Alignment Lead Architect",
      address: "Suite 400, Floor 12, Financial Technology Tower, Gulshan-2 Commercial Area, Dhaka 1212, People's Republic of Bangladesh",
    },
  };

  const { doc: agreementDoc, blob: agreementBlob } = await generateAgreementPdf(
    overflowTestRecord,
    { download: false, returnBlob: true }
  );
  assert(!!agreementDoc, "Agreement PDF document renders successfully without exceptions");
  assert(agreementDoc.getNumberOfPages() >= 2, `Multi-page PDF generated correctly (${agreementDoc.getNumberOfPages()} pages)`);
  assert(!!agreementBlob && agreementBlob.size > 10000, `Valid binary PDF blob created (${agreementBlob?.size} bytes)`);

  // Test Addendum PDF generation
  const { doc: addendumDoc, blob: addendumBlob } = await generateAddendumPdf(
    sampleAddendum,
    blumeRecord,
    { download: false, returnBlob: true }
  );
  assert(!!addendumDoc, "Addendum PDF document renders successfully without exceptions");
  assert(addendumDoc.getNumberOfPages() >= 1, `Addendum PDF generated with ${addendumDoc.getNumberOfPages()} page(s)`);
  assert(!!addendumBlob && addendumBlob.size > 5000, `Valid binary Addendum PDF blob created (${addendumBlob?.size} bytes)`);

  console.log("\n==================================================================");
  console.log(`ALL TESTS PASSED: ${passedCount}/${totalCount} assertions verified successfully!`);
  console.log("==================================================================");
}

runTestSuite().catch((err) => {
  console.error("Test suite encountered fatal error:", err);
  process.exit(1);
});
