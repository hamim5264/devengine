import {
  AgreementRecord,
  AgreementType,
  AGREEMENT_TYPE_LABELS,
  DEFAULT_DEVENGINE_INFO,
  DEFAULT_AGREEMENT_TERMS,
  DEFAULT_PROFIT_EXPENSES,
  ProfitDurationModel,
  PostServiceTreatment,
} from "@/types/agreement";

/**
 * Creates a pristine default AgreementRecord for any of the 8 supported AgreementTypes.
 * Does NOT hardcode universal 24-month or 12-month limits.
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
    agreementTypeLabel: AGREEMENT_TYPE_LABELS[type] || "Project Agreement",
    status: "draft",
    version: "1.0",
    revisionToken: `rev_${Date.now()}`,
    concurrencyVersion: 1,
    project: {
      projectId: "",
      projectName: "",
      description: "",
      clientName: "",
      companyName: "DevEngine",
      projectType: "Full-Stack Web & AI Application",
      technicalScopeAndArchitecture: "High-performance software architecture, secure backend services, and interactive user interfaces.",
      agreementEffectiveDate: effectiveDate,
      workCommencementDate: effectiveDate,
      targetCompletionDate: "",
      plannedLaunchDate: "",
      actualLaunchDate: "",
      projectStatus: "In Development",
      additionalNotes: "",
    },
    developer: {
      developerId: "",
      legalName: "",
      fullName: "",
      professionalName: "",
      role: "Senior Software Engineer",
      partyType: "individual",
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
      fixedAmount: type === "fixed_completion" ? 50000 : type === "hybrid" ? 30000 : 0,
      hourlyRate: type === "hourly" ? 1200 : 0,
      estimatedHours: type === "hourly" ? 40 : 0,
      maxApprovedHours: type === "hourly" ? 80 : 0,
      timesheetRequirement: true,
      paymentFrequency:
        type === "hourly"
          ? "Monthly"
          : type === "profit_participation" || type === "revenue_sharing"
          ? "Quarterly"
          : "On Milestone Acceptance",
      paymentMethod: "Electronic Bank Wire Transfer",
      invoiceRequirement: true,
      paymentDuePeriodDays: 7,
      profitTerms: {
        participationPercentage: 15,
        profitBasis: type === "revenue_sharing" ? "Gross Qualifying Project Revenue" : "Net Distributable Project Profit",
        isRevenueShareModel: type === "revenue_sharing",
        vestingCondition: "Completion and verified deployment of assigned core architectural deliverables",
        profitStartTrigger: "Upon initial commercial monetization and receipt of qualifying project revenue",
        paymentFrequency: "Quarterly within 15 days following calendar quarter end",
        profitCalculationMethod:
          type === "revenue_sharing"
            ? "Gross qualifying collections less payment gateway fees and refunds"
            : "Gross receipts collected less approved, itemized direct project operating expenses",
        eligibleProjectExpenses: type === "revenue_sharing" ? [] : [...DEFAULT_PROFIT_EXPENSES],
        contributorCompletionRequirement: "Substantial completion of core project architecture",
        durationModel: "ongoing_indefinite" as ProfitDurationModel,
        participationDurationDescription: "Ongoing with no fixed expiry date for so long as the Project generates profit",
        postServiceTreatment: "full_continuing" as PostServiceTreatment,
        postTerminationParticipation: "Full contractual participation continues unimpaired following active service",
        breachTreatment: "Accrued vested entitlements prior to notice protected; non-breaching remedies apply",
        voluntaryDepartureTreatment: "Vested entitlements on accepted deliverables continue unimpaired",
        projectSaleOrTransferTreatment: "Successor entity assumes ongoing profit participation obligations or negotiates buyout",
        projectDiscontinuationTreatment: "Participation continues until final commercial accounting and distribution",
        corporateEquityGranted: false,
        accountingAuditProcedure: "Contributor may inspect itemized quarterly reconciliation reports upon 14 business days notice",
        reportingMethod: "Quarterly itemized reconciliation statement provided by DevEngine accounting",
        reconciliationDeadlineDays: 15,
      },
      milestones: [
        {
          id: "m1",
          phaseNumber: 1,
          phaseName: "Core Architecture & Data Modeling",
          description: "Technical design, database schema, and foundational services.",
          deliverables: "System blueprint, schema definitions, repository structure",
          startDate: effectiveDate,
          expectedCompletionDate: "",
          paymentAmount: 25000,
          paymentPercentage: 25,
          paymentTrigger: "Upon code review and architecture sign-off",
          acceptanceCriteria: "Clean modular code, zero security vulnerabilities",
          status: "pending",
        },
        {
          id: "m2",
          phaseNumber: 2,
          phaseName: "Core Business Logic & API Endpoints",
          description: "Service handlers, workflows, and automated test suite.",
          deliverables: "Validated API endpoints, unit tests, integration tests",
          startDate: "",
          expectedCompletionDate: "",
          paymentAmount: 45000,
          paymentPercentage: 45,
          paymentTrigger: "Upon passing test suites and integration verification",
          acceptanceCriteria: "90%+ test coverage, automated pipeline passing",
          status: "pending",
        },
        {
          id: "m3",
          phaseNumber: 3,
          phaseName: "Production Release & Technical Handover",
          description: "Production deployment, performance optimization, and handover docs.",
          deliverables: "Deployed application, handover documentation",
          startDate: "",
          expectedCompletionDate: "",
          paymentAmount: 30000,
          paymentPercentage: 30,
          paymentTrigger: "Upon live production verification and client sign-off",
          acceptanceCriteria: "Zero critical bugs, sub-second latency verified",
          status: "pending",
        },
      ],
      totalContractValue: 100000,
      monthlyRetainerAmount: 35000,
      additionalHourlyRate: 800,
      availabilityHoursPerWeek: 20,
      customTermsText: "",
    },
    deliverables: [
      {
        id: "d1",
        title: "System Architecture & Foundation Layer",
        description: "Technical design, data schemas, security protocols, and repository structure.",
        acceptanceCriteria: "TypeScript compliance, modular clean code, security verified.",
        priority: "Critical",
      },
      {
        id: "d2",
        title: "Core Feature Engine & Implementation",
        description: "Implementation of primary business modules, responsive UI, and backend services.",
        acceptanceCriteria: "Meets technical specifications, passes automated unit & integration tests.",
        priority: "High",
      },
      {
        id: "d3",
        title: "Testing, Deployment & Documentation Handover",
        description: "End-to-end testing, production deployment, CI/CD pipeline, and architecture documentation.",
        acceptanceCriteria: "Passes deployment validation, documentation approved by DevEngine lead.",
        priority: "High",
      },
    ],
    terms: { ...DEFAULT_AGREEMENT_TERMS },
    customClauses: [],
    createdBy: creatorEmail,
    createdAt: now,
    updatedBy: creatorEmail,
    updatedAt: now,
    auditTrail: [
      {
        action: "Agreement Draft Initialized",
        performedBy: creatorEmail,
        timestamp: now,
        details: `Initialized new draft for ${AGREEMENT_TYPE_LABELS[type]}`,
        version: "1.0",
      },
    ],
  };
}

export interface AgreementValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  hasBlockingErrors: boolean;
  requiresLegalAcknowledgment: boolean;
}

/**
 * Validates an agreement with deep structural, commercial, and legal consistency checks.
 * Detects conflicting terms, mismatched numbers, impossible dates, and contract contradictions.
 */
export function validateAgreement(record: AgreementRecord): AgreementValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const devName = record.developer.legalName || record.developer.fullName;

  // 1. Mandatory Parties & Project Information
  if (!record.project.projectName?.trim()) {
    errors.push("Project Title is required.");
  }
  if (!devName?.trim()) {
    errors.push("Contributor Legal Full Name is required.");
  }
  if (!record.developer.role?.trim()) {
    errors.push("Contributor Designated Role is required.");
  }
  if (!record.developer.email?.trim() || !record.developer.email.includes("@")) {
    errors.push("A valid Contributor Email address is required.");
  }
  if (!record.project.agreementEffectiveDate) {
    errors.push("Agreement Effective Date is required.");
  }

  // 2. Date Chronology and Consistency
  const effective = record.project.agreementEffectiveDate ? new Date(record.project.agreementEffectiveDate).getTime() : 0;
  const commencement = record.project.workCommencementDate ? new Date(record.project.workCommencementDate).getTime() : 0;
  const completion = record.project.targetCompletionDate ? new Date(record.project.targetCompletionDate).getTime() : 0;

  if (commencement > 0 && completion > 0 && completion < commencement) {
    errors.push("Target Completion Date cannot precede Work Commencement Date.");
  }

  if (record.project.plannedLaunchDate && record.project.actualLaunchDate) {
    const planned = new Date(record.project.plannedLaunchDate).getTime();
    const actual = new Date(record.project.actualLaunchDate).getTime();
    if (actual < planned - 86400000 * 365) {
      warnings.push("Actual launch date is more than one year earlier than planned launch date. Please verify accuracy.");
    }
  }

  // 3. Commercial Model Validations
  const comp = record.compensation;

  if (record.agreementType === "profit_participation" || record.agreementType === "revenue_sharing") {
    const pt = comp.profitTerms;
    const pct = pt?.participationPercentage;
    if (pct === undefined || isNaN(pct) || pct <= 0 || pct > 100) {
      errors.push("Participation percentage must be greater than 0% and at most 100%.");
    }

    // Critical Contract Consistency Checks:
    if (pt?.durationModel === "ongoing_indefinite") {
      // Must not contradict with a finite months description
      if (pt.participationDurationMonths && pt.participationDurationMonths > 0) {
        warnings.push("Duration model is 'Ongoing with no fixed expiry', but a finite number of months is specified. The ongoing indefinite term takes precedence.");
      }
      if (!pt.projectSaleOrTransferTreatment?.trim()) {
        warnings.push("Ongoing participation: Treatment of Project Sale or Transfer is undefined. Please specify successor obligations.");
      }
      if (!pt.projectDiscontinuationTreatment?.trim()) {
        warnings.push("Ongoing participation: Treatment of Project Discontinuation is undefined. Please specify wind-down rules.");
      }
    }

    if (pt?.postServiceTreatment === "full_continuing") {
      if (pt.postServiceDurationMonths && pt.postServiceDurationMonths > 0) {
        warnings.push("Post-service treatment is set to 'Full continuing', but a limited post-service months duration is also present. Full continuing entitlement takes precedence.");
      }
    }

    // Revenue sharing vs Profit sharing check
    if (record.agreementType === "revenue_sharing" && pt?.eligibleProjectExpenses && pt.eligibleProjectExpenses.length > 2) {
      warnings.push("Revenue Sharing model usually deducts only refunds/processing fees, but multiple operating expense categories are selected. Verify whether Profit Participation was intended.");
    }

    if (pt?.corporateEquityGranted) {
      warnings.push("Corporate Equity grant is enabled. Corporate equity requires a separate formal shareholder or board resolution under corporate law.");
    }
  } else if (record.agreementType === "hourly") {
    const rate = comp.hourlyRate;
    if (!rate || isNaN(rate) || rate <= 0) {
      errors.push("Hourly billable rate must be a positive number.");
    }
  } else if (record.agreementType === "fixed_completion") {
    const amount = comp.fixedAmount || comp.totalContractValue;
    if (!amount || isNaN(amount) || amount <= 0) {
      errors.push("Fixed completion payment amount must be greater than 0.");
    }
  } else if (record.agreementType === "milestone") {
    const milestones = comp.milestones || [];
    if (milestones.length === 0) {
      errors.push("At least one phase milestone must be defined for milestone-based compensation.");
    } else {
      const sum = milestones.reduce((acc, m) => acc + Number(m.paymentAmount || 0), 0);
      if (sum <= 0) {
        errors.push("Sum of milestone payments must be greater than 0.");
      }
      if (comp.totalContractValue && comp.totalContractValue > 0 && Math.abs(sum - comp.totalContractValue) > 1) {
        warnings.push(`Sum of milestones (${sum.toLocaleString()} ${comp.currency}) does not match Total Contract Value (${comp.totalContractValue.toLocaleString()} ${comp.currency}).`);
      }
    }
  } else if (record.agreementType === "hybrid") {
    const base = comp.fixedAmount || 0;
    const pt = comp.profitTerms;
    const pct = pt?.participationPercentage || 0;
    if (base <= 0 && pct <= 0) {
      errors.push("Hybrid agreement must specify either a base fee, a profit share percentage, or both.");
    }
  } else if (record.agreementType === "retainer") {
    const retainer = comp.monthlyRetainerAmount || comp.fixedAmount || 0;
    if (retainer <= 0) {
      errors.push("Monthly retainer amount must be greater than 0.");
    }
  }

  // 4. Deliverables Validations
  const deliverables = record.deliverables || [];
  if (deliverables.length === 0) {
    warnings.push("No explicit deliverables listed. A generic architecture deliverable will be inserted into the contract.");
  }

  // 5. Legal Terms Warnings
  if (record.terms?.nonCompeteIncluded) {
    warnings.push("Non-compete clause is enabled. Broad non-competes against independent contractors may face legal enforceability challenges. Review recommended.");
  }

  const hasBlockingErrors = errors.length > 0;
  const requiresLegalAcknowledgment = warnings.length > 0;

  return {
    valid: !hasBlockingErrors,
    errors,
    warnings,
    hasBlockingErrors,
    requiresLegalAcknowledgment,
  };
}
