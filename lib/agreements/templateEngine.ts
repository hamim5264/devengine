import {
  AgreementRecord,
  AgreementType,
  AGREEMENT_TYPE_LABELS,
  DEFAULT_DEVENGINE_INFO,
  DEFAULT_AGREEMENT_TERMS,
  DEFAULT_PROFIT_EXPENSES,
} from "@/types/agreement";

/**
 * Creates a pristine default AgreementRecord for any given AgreementType
 */
export function createDefaultAgreement(
  type: AgreementType = "profit_participation",
  agreementNumber: string = "DEV-AGR-2026-0001",
  creatorEmail: string = "hamim.leon@gmail.com"
): AgreementRecord {
  const now = new Date().toISOString();
  const effectiveDate = new Date().toISOString().split("T")[0];

  return {
    id: "",
    agreementNumber,
    agreementType: type,
    agreementTypeLabel: AGREEMENT_TYPE_LABELS[type],
    status: "draft",
    version: "1.0",
    project: {
      projectId: "",
      projectName: "",
      description: "",
      clientName: "",
      companyName: "DevEngine",
      projectType: "Full-Stack Web Application",
      startDate: effectiveDate,
      expectedCompletionDate: "",
      agreementEffectiveDate: effectiveDate,
      projectStatus: "In Development",
    },
    developer: {
      developerId: "",
      fullName: "",
      professionalName: "",
      role: "Full-Stack Software Engineer",
      email: "",
      phone: "",
      address: "",
      identificationId: "",
      emergencyContact: "",
    },
    devengine: { ...DEFAULT_DEVENGINE_INFO },
    compensation: {
      model: type,
      currency: "BDT",
      fixedAmount: type === "fixed_completion" ? 50000 : type === "hybrid" ? 25000 : 0,
      hourlyRate: type === "hourly" ? 500 : 0,
      estimatedHours: type === "hourly" ? 40 : 0,
      maxApprovedHours: type === "hourly" ? 80 : 0,
      timesheetRequirement: true,
      paymentFrequency: type === "hourly" ? "Monthly" : type === "profit_participation" ? "Quarterly" : "On Milestone Acceptance",
      paymentMethod: "Bank Wire Transfer / Electronic Disbursement",
      invoiceRequirement: true,
      paymentDuePeriodDays: 7,
      profitTerms: {
        participationPercentage: 10,
        profitBasis: "Net Distributable Project Profit",
        vestingCondition: "100% completion and successful deployment of all assigned project modules",
        profitStartTrigger: "Upon initial commercial monetization and positive net cash flow receipt",
        paymentFrequency: "Quarterly within 15 days following calendar quarter end",
        profitCalculationMethod: "Gross Receipts less eligible project deductions",
        eligibleProjectExpenses: [...DEFAULT_PROFIT_EXPENSES],
        contributorCompletionRequirement: "Substantial completion of core project architecture",
        postTerminationParticipation: "Vested share payable for 12 months if departed in good standing",
        participationDuration: "24 months from public release",
        reportingMethod: "Quarterly itemized reconciliation statement provided by DevEngine",
        minProfitCondition: "No minimum revenue threshold",
        maxProfitCondition: "Uncapped",
      },
      milestones: [
        {
          id: "m1",
          phaseNumber: 1,
          phaseName: "Architecture, DB Schema & Wireframes",
          description: "System design, high-level architecture blueprint, and database models.",
          deliverables: "Architecture doc, Prisma/Firestore schema, UI mockups",
          startDate: effectiveDate,
          expectedCompletionDate: "",
          paymentAmount: 20000,
          paymentPercentage: 20,
          paymentTrigger: "Upon approval of system design and repository setup",
          acceptanceCriteria: "Zero architectural bottlenecks, security review approved",
          status: "pending",
        },
        {
          id: "m2",
          phaseNumber: 2,
          phaseName: "Core Business Logic & API Development",
          description: "Implementation of backend routes, business operations, and state machine.",
          deliverables: "Clean API endpoints, unit tests, integration tests",
          startDate: "",
          expectedCompletionDate: "",
          paymentAmount: 40000,
          paymentPercentage: 40,
          paymentTrigger: "Upon passing all automated test suites and integration verification",
          acceptanceCriteria: "90%+ test coverage, automated CI/CD pipeline green",
          status: "pending",
        },
        {
          id: "m3",
          phaseNumber: 3,
          phaseName: "Frontend Integration & Production Release",
          description: "Responsive UI implementation, user flows, and final deployment.",
          deliverables: "Production deployment, documentation, code handover",
          startDate: "",
          expectedCompletionDate: "",
          paymentAmount: 40000,
          paymentPercentage: 40,
          paymentTrigger: "Upon production launch and client acceptance sign-off",
          acceptanceCriteria: "Zero critical bugs, sub-second latency, CEO acceptance",
          status: "pending",
        },
      ],
      totalContractValue: 100000,
      monthlyRetainerAmount: 30000,
      additionalHourlyRate: 600,
      availabilityHoursPerWeek: 20,
    },
    deliverables: [
      {
        id: "d1",
        title: "System Architecture & Core Engine",
        description: "Technical architecture, database schemas, and foundational service layers.",
        acceptanceCriteria: "Clean modular code structure, TypeScript compliance, security verified.",
        priority: "Critical",
      },
      {
        id: "d2",
        title: "Frontend Application & User Interface",
        description: "Responsive client-side interface, modern styling, and interactive user journeys.",
        acceptanceCriteria: "Pixel-perfect implementation, mobile responsiveness, dark mode support.",
        priority: "High",
      },
      {
        id: "d3",
        title: "Testing, CI/CD Pipeline & Production Handover",
        description: "Automated test suites, build scripts, deployment configuration, and technical documentation.",
        acceptanceCriteria: "End-to-end tests passing, documentation approved by DevEngine lead.",
        priority: "High",
      },
    ],
    terms: { ...DEFAULT_AGREEMENT_TERMS },
    createdBy: creatorEmail,
    createdAt: now,
    updatedBy: creatorEmail,
    updatedAt: now,
    auditTrail: [
      {
        action: "Agreement Draft Created",
        performedBy: creatorEmail,
        timestamp: now,
        details: `Created new draft for ${AGREEMENT_TYPE_LABELS[type]}`,
      },
    ],
  };
}

/**
 * Validates an agreement before preview or finalization
 */
export function validateAgreement(record: AgreementRecord): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!record.project.projectName?.trim()) {
    errors.push("Project Name is required.");
  }
  if (!record.developer.fullName?.trim()) {
    errors.push("Contributor Full Legal Name is required.");
  }
  if (!record.developer.email?.trim() || !record.developer.email.includes("@")) {
    errors.push("A valid Contributor Email address is required.");
  }
  if (!record.project.agreementEffectiveDate) {
    errors.push("Agreement Effective Date is required.");
  }

  // Type-specific validations
  if (record.agreementType === "profit_participation") {
    const p = record.compensation.profitTerms?.participationPercentage;
    if (p === undefined || p <= 0 || p > 100) {
      errors.push("Profit participation percentage must be greater than 0% and at most 100%.");
    }
  } else if (record.agreementType === "hourly") {
    const r = record.compensation.hourlyRate;
    if (!r || r <= 0) {
      errors.push("Hourly rate must be a positive number.");
    }
  } else if (record.agreementType === "milestone") {
    if (!record.compensation.milestones || record.compensation.milestones.length === 0) {
      errors.push("At least one project milestone must be defined.");
    }
  } else if (record.agreementType === "fixed_completion") {
    const f = record.compensation.fixedAmount || record.compensation.totalContractValue;
    if (!f || f <= 0) {
      errors.push("Total fixed completion payment must be greater than 0.");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
