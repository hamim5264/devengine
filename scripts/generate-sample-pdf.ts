import fs from "fs";
import path from "path";
import { AgreementRecord } from "../types/agreement";
import { createDefaultAgreement } from "../lib/agreements/templateEngine";
import { generateAgreementPdf } from "../lib/utils/generateAgreementPdf";

async function main() {
  console.log("Generating sample agreement PDF with long title and long contributor role...");

  const testRecord: AgreementRecord = {
    ...createDefaultAgreement("profit_participation"),
    id: "test_sample_001",
    agreementNumber: "DEV-AGR-2026-0002",
    status: "finalized",
    version: "2.1",
    project: {
      projectName: "BLUME — Autonomous Neural Agent & Distributed Emotional Memory Platform V2",
      description: "Autonomous cognitive neural engine supporting multimodal streaming context memory and real-time safe alignment.",
      projectType: "Autonomous AI & High-Performance Distributed Systems",
      technicalScopeAndArchitecture: "Next.js 15, FastAPI Python ML microservices, pgvector memory pipelines, Triton Inference Server, and low-latency WebSockets.",
      agreementEffectiveDate: "2026-10-15",
      workCommencementDate: "2026-10-15",
      targetCompletionDate: "2026-11-20",
      plannedLaunchDate: "2026-11-20",
      projectStatus: "In Active Development",
      additionalNotes: "Subject to quarterly audited profit distribution schedules.",
    },
    developer: {
      legalName: "Sabiha Jahan",
      fullName: "Sabiha Jahan",
      professionalName: "Mishu",
      // DELIBERATELY VERY LONG ROLE TITLE TO TEST OVERFLOW PROTECTION
      role: "Principal AI Development Partner, Lead Neural Context Architect & High-Performance Cognitive Systems Engineer — BLUME Platform",
      partyType: "individual",
      email: "mishu.ai@blume-partner.org",
      phone: "+880 1711-223344",
      address: "Suite 804, Tower 3, Gulshan Financial Technology District, Dhaka-1212, People's Republic of Bangladesh",
      identificationId: "NID-9876543210-BD",
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
      companyAddress: "DevEngine Studio Headquarters, Banani, Dhaka, Bangladesh",
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
        profitCalculationMethod: "Gross Project Receipts less verified deductible direct operating expenses",
        eligibleProjectExpenses: [
          "Infrastructure & Cloud Hosting Costs (AWS, Vercel, Supabase, Neon)",
          "Third-Party AI & LLM Inference APIs (OpenAI, Anthropic, Gemini)",
          "Payment Processing & Gateway Fees (Stripe, SSLCommerz, bKash)",
          "App Store & Platform Commissions (Apple App Store, Google Play 15-30%)",
          "Dedicated GPU Cluster Leases & Model Fine-Tuning Infrastructure",
        ],
        contributorCompletionRequirement: "Delivery of Mori core architecture, memory pipelines, and production handover.",
        durationModel: "ongoing_indefinite",
        participationDurationDescription: "Ongoing with no fixed expiry date",
        postServiceTreatment: "full_continuing",
        postTerminationParticipation: "Full contractual participation continues unimpaired following active service conclusion.",
        breachTreatment: "Participation terminates solely upon adjudicated material breach of confidentiality or IP covenants.",
        voluntaryDepartureTreatment: "Participation continues for completed vested deliverables with complete handover.",
        projectSaleOrTransferTreatment: "Successor entity assumes all ongoing profit participation obligations without diminution.",
        projectDiscontinuationTreatment: "Ceases only upon genuine bona fide permanent platform discontinuation.",
        corporateEquityGranted: false,
        accountingAuditProcedure: "Contributor may inspect quarterly itemized revenue and hosting cost statements with 10 business days prior notice.",
        reportingMethod: "Itemized quarterly reconciliation statement provided via encrypted transmission.",
        reconciliationDeadlineDays: 15,
      },
    },
    deliverables: [
      {
        id: "d1",
        title: "Mori Core Architecture & Context Memory Engine",
        description: "Vector memory pipeline, personality matrix, and low-latency cognitive response router.",
        acceptanceCriteria: "Passes automated regression benchmarks with latency below 400ms across 1,000 synthetic dialogue turns.",
        priority: "Critical",
        deadline: "2026-10-30",
        reviewPeriodDays: 10,
        acceptanceStatus: "pending",
        documentationRequired: true,
      },
      {
        id: "d2",
        title: "Conversation Quality, Emotional Memory & Safety Guardrails",
        description: "Guardrails, emotional alignment filters, and prompt safety layers preventing hallucinations.",
        acceptanceCriteria: "Zero safety policy violations across safety test battery; benchmark accuracy > 99.2%.",
        priority: "Critical",
        deadline: "2026-11-10",
        reviewPeriodDays: 10,
        acceptanceStatus: "pending",
        documentationRequired: true,
      },
      {
        id: "d3",
        title: "AI Integration, Testing & Production Handover",
        description: "Production containerization, staging verification, and handover documentation.",
        acceptanceCriteria: "Complete operational runbook, passing health check probes, and staging sign-off.",
        priority: "High",
        deadline: "2026-11-20",
        reviewPeriodDays: 10,
        acceptanceStatus: "pending",
        documentationRequired: true,
      },
      {
        id: "d4",
        title: "Post-Launch AI Maintenance Support",
        description: "Ongoing prompt tuning, regression monitoring, and monthly model evaluations.",
        acceptanceCriteria: "Monthly SLA adherence report delivered within 5 days following month-end.",
        priority: "Medium",
        deadline: "Ongoing Maintenance",
        reviewPeriodDays: 14,
        acceptanceStatus: "pending",
        documentationRequired: true,
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

  const { doc } = await generateAgreementPdf(testRecord, { download: false });
  const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

  const outputPath = path.join(process.cwd(), "sample_agreement_test.pdf");
  fs.writeFileSync(outputPath, pdfBuffer);

  const pagesCount = doc.getNumberOfPages();
  console.log(`PDF successfully generated!`);
  console.log(`Total Pages: ${pagesCount}`);
  console.log(`File Size: ${(pdfBuffer.length / 1024).toFixed(1)} KB`);
  console.log(`Saved to: ${outputPath}`);
}

main().catch((err) => {
  console.error("Error generating PDF:", err);
  process.exit(1);
});
