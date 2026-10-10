import {
  AgreementRecord,
  AgreementType,
  ProfitDurationModel,
  PostServiceTreatment,
} from "@/types/agreement";

export interface AgreementClauseSection {
  id?: string;
  number: string;
  title: string;
  subsections?: {
    number: string;
    title?: string;
    content: string;
  }[];
  paragraphs?: string[];
  tableData?: {
    headers: string[];
    rows: string[][];
  };
}

export interface ClauseDefinition {
  id: string;
  title: string;
  category: "preamble" | "commercial" | "ip" | "confidentiality" | "termination" | "governing_law" | "boilerplate" | "custom";
  applicableModels: AgreementType[];
  isMandatory: boolean;
  legalReviewWarning?: string;
  generate: (record: AgreementRecord) => AgreementClauseSection | null;
}

/**
 * Global Registry of Standard, Modular, and Legal Clauses for DevEngine Agreements
 */
export const CLAUSE_DEFINITIONS: ClauseDefinition[] = [
  // 1. PARTIES & CAPACITY
  {
    id: "parties_and_capacity",
    title: "PARTIES & LEGAL CAPACITY",
    category: "preamble",
    applicableModels: [
      "profit_participation",
      "revenue_sharing",
      "hourly",
      "fixed_completion",
      "milestone",
      "hybrid",
      "retainer",
      "custom",
    ],
    isMandatory: true,
    generate: (record) => {
      const { project, developer, devengine } = record;
      const effectiveDate = project.agreementEffectiveDate || "the Effective Date";
      const devLegalName = (developer.legalName || developer.fullName || "Contributor").toUpperCase();
      const devProfName = developer.professionalName ? ` (Professionally known as "${developer.professionalName}")` : "";
      const devEntityInfo =
        developer.partyType === "registered_company"
          ? `, a registered corporate entity under registration no. ${developer.companyRegistrationNumber || "on file"}, represented by its authorized signatory ${developer.authorizedSignatoryName || devLegalName}`
          : "";

      return {
        id: "parties_and_capacity",
        number: "1",
        title: "PARTIES & LEGAL CAPACITY",
        paragraphs: [
          `This Project Agreement & Formal Contract (the "Agreement") is entered into and made legally binding as of ${effectiveDate} (the "Effective Date"), by and between:`,
          `${devengine.legalEntityName || devengine.companyName.toUpperCase()}, operating under the trade name "${devengine.companyName}", under the executive direction of ${devengine.ceoName}, ${devengine.ceoTitle} (${devengine.authorizedRepresentativeTitle}), having operational headquarters at ${devengine.companyAddress} (hereinafter referred to as the "Company" or "DevEngine"); and`,
          `${devLegalName}${devProfName}${devEntityInfo}, acting in the designated capacity of ${developer.role}, residing or having address at ${developer.address || "the address on record"}, reachable via official email ${developer.email} and telephone ${developer.phone || "on record"} (hereinafter referred to as the "Contributor" or "Developer").`,
          `The Company and the Contributor are each referred to individually as a "Party" and collectively as the "Parties". Each Party warrants that it possesses the full legal power, capacity, and authority to enter into and perform this Agreement.`,
        ],
      };
    },
  },

  // 2. PURPOSE OF ENGAGEMENT
  {
    id: "purpose_and_appointment",
    title: "PURPOSE & APPOINTMENT",
    category: "preamble",
    applicableModels: [
      "profit_participation",
      "revenue_sharing",
      "hourly",
      "fixed_completion",
      "milestone",
      "hybrid",
      "retainer",
      "custom",
    ],
    isMandatory: true,
    generate: (record) => {
      const { project, developer } = record;
      return {
        id: "purpose_and_appointment",
        number: "2",
        title: "PURPOSE & APPOINTMENT",
        paragraphs: [
          `The Company hereby engages the Contributor as an independent specialist contributor to provide engineering, architectural, design, testing, and implementation services for the project identified as "${project.projectName}" (the "Project").`,
          `The Contributor hereby accepts such appointment and covenants to execute all assigned tasks, deliverables, and technical responsibilities with professional diligence, architectural integrity, and strict adherence to the specifications, schedules, and quality benchmarks set forth herein.`,
        ],
      };
    },
  },

  // 3. PROJECT OVERVIEW & TIMELINE
  {
    id: "project_overview_and_timeline",
    title: "PROJECT OVERVIEW & TIMELINE",
    category: "preamble",
    applicableModels: [
      "profit_participation",
      "revenue_sharing",
      "hourly",
      "fixed_completion",
      "milestone",
      "hybrid",
      "retainer",
      "custom",
    ],
    isMandatory: true,
    generate: (record) => {
      const { project } = record;
      return {
        id: "project_overview_and_timeline",
        number: "3",
        title: "PROJECT OVERVIEW & TIMELINE",
        paragraphs: [
          `Project Title: ${project.projectName}${project.projectId ? ` (Reference ID: ${project.projectId})` : ""}`,
          `Domain / Classification: ${project.projectType || "Commercial Software Architecture"}`,
          `Technical Scope & Architecture: ${project.technicalScopeAndArchitecture || project.description || "Design, development, testing, and production deployment of software subsystems as designated by DevEngine."}`,
          `Agreement Effective Date: ${project.agreementEffectiveDate}`,
          `Work Commencement Date: ${project.workCommencementDate || project.agreementEffectiveDate}`,
          `Target Completion Date: ${project.targetCompletionDate || "Per Scheduled Milestones"}`,
          `Planned Production Release Target: ${project.plannedLaunchDate || "TBD upon milestone acceptance"} (Target projection only; does not constitute an actual launched state until formal release sign-off)`,
          project.actualLaunchDate ? `Actual Production Release Date: ${project.actualLaunchDate}` : "",
        ].filter(Boolean),
      };
    },
  },

  // 4. SCOPE OF WORK & FORMAL DELIVERABLES
  {
    id: "scope_and_deliverables",
    title: "SCOPE OF WORK & FORMAL DELIVERABLES",
    category: "commercial",
    applicableModels: [
      "profit_participation",
      "revenue_sharing",
      "hourly",
      "fixed_completion",
      "milestone",
      "hybrid",
      "retainer",
      "custom",
    ],
    isMandatory: true,
    generate: (record) => {
      const deliverables = record.deliverables || [];
      const deliverableRows =
        deliverables.length > 0
          ? deliverables.map((d, idx) => [
              `${idx + 1}`,
              d.title,
              d.description,
              d.acceptanceCriteria,
              d.priority,
              d.deadline || "Per Schedule",
            ])
          : [
              [
                "1",
                "Core Architecture & Systems Implementation",
                "Implementation of specified subsystems per technical specification",
                "Zero critical defects, code review approved by DevEngine lead",
                "High",
                "Per Schedule",
              ],
            ];

      return {
        id: "scope_and_deliverables",
        number: "4",
        title: "SCOPE OF WORK & FORMAL DELIVERABLES",
        paragraphs: [
          `The Contributor shall develop, implement, and deliver the technical work packages set forth below. Each deliverable shall undergo formal technical evaluation by the Company prior to acceptance sign-off:`,
        ],
        tableData: {
          headers: ["#", "Deliverable Name", "Technical Specification", "Acceptance Benchmark", "Priority", "Target Due Date"],
          rows: deliverableRows,
        },
      };
    },
  },

  // 5. COMMERCIAL COMPENSATION (Tailored dynamically to exact model)
  {
    id: "compensation_terms",
    title: "COMPENSATION & FINANCIAL TERMS",
    category: "commercial",
    applicableModels: [
      "profit_participation",
      "revenue_sharing",
      "hourly",
      "fixed_completion",
      "milestone",
      "hybrid",
      "retainer",
      "custom",
    ],
    isMandatory: true,
    generate: (record) => {
      const { agreementType, compensation, terms } = record;
      const currency = compensation.currency || "BDT";

      // 5A. PROFIT PARTICIPATION MODEL
      if (agreementType === "profit_participation") {
        const pt = compensation.profitTerms || {
          participationPercentage: 10,
          profitBasis: "Net Distributable Project Profit",
          isRevenueShareModel: false,
          vestingCondition: "Successful completion and deployment of all assigned project deliverables",
          profitStartTrigger: "Upon initial commercial monetization and realization of positive net cash flow",
          paymentFrequency: "Quarterly within 15 days following calendar quarter end",
          profitCalculationMethod: "Gross Receipts less eligible project operating deductions",
          eligibleProjectExpenses: [],
          contributorCompletionRequirement: "Substantial completion of core project deliverables",
          durationModel: "ongoing_indefinite" as ProfitDurationModel,
          participationDurationDescription: "Ongoing with no fixed expiry date",
          postServiceTreatment: "full_continuing" as PostServiceTreatment,
          postTerminationParticipation: "Full contractual participation continues unimpaired following active service",
          breachTreatment: "Subject to legal remedy and termination for cause; accrued vested profit rights prior to breach protected",
          voluntaryDepartureTreatment: "Participation continues for completed vested deliverables",
          projectSaleOrTransferTreatment: "Successor entity assumes all ongoing profit participation obligations",
          projectDiscontinuationTreatment: "Participation continues until final accounting and commercial wind-down",
          corporateEquityGranted: false,
          accountingAuditProcedure: "Contributor may inspect itemized quarterly reconciliation reports upon 14 days written notice",
          reportingMethod: "Quarterly itemized reconciliation statement provided by DevEngine accounting",
          reconciliationDeadlineDays: 15,
        };

        const durationClause =
          pt.durationModel === "ongoing_indefinite"
            ? `5.6 Entitlement Duration: The Contributor's contractual profit participation shall endure on an ONGOING BASIS WITH NO FIXED EXPIRY DATE for so long as the Project generates Net Distributable Project Profit.`
            : pt.durationModel === "fixed_period_from_release"
            ? `5.6 Entitlement Duration: The Contributor's contractual profit participation shall endure for a fixed term of ${pt.participationDurationMonths || 24} months commencing from the official public production release date of the Project.`
            : pt.durationModel === "fixed_period_from_start"
            ? `5.6 Entitlement Duration: The Contributor's contractual profit participation shall endure for a fixed term of ${pt.participationDurationMonths || 24} months commencing from the participation start date (${pt.profitStartTrigger}).`
            : `5.6 Entitlement Duration: ${pt.participationDurationDescription || "Governed by mutually agreed schedule."}`;

        const postServiceClause =
          pt.postServiceTreatment === "full_continuing"
            ? `5.7 Post-Service Continuance: The Parties expressly agree that the conclusion, termination, or transition of the Contributor's active development or maintenance services shall NOT terminate, diminish, or extinguish this profit participation entitlement. The Contributor's entitlement continues unimpaired so long as the Project produces Net Distributable Project Profit.`
            : pt.postServiceTreatment === "pro_rata_vested"
            ? `5.7 Post-Service Treatment: In the event active services conclude prior to completion of all deliverables, the Contributor shall retain a pro-rata vested percentage proportional to accepted deliverables verified by DevEngine.`
            : pt.postServiceTreatment === "fixed_post_period"
            ? `5.7 Post-Service Treatment: Upon conclusion of active services, profit participation shall continue for a sunset period of ${pt.postServiceDurationMonths || 12} months following departure date.`
            : `5.7 Post-Service Treatment: ${pt.postTerminationParticipation}`;

        const expensesList =
          pt.eligibleProjectExpenses && pt.eligibleProjectExpenses.length > 0
            ? pt.eligibleProjectExpenses.map((exp) => `       • ${exp}`).join("\n")
            : `       • Payment processing and gateway surcharges\n       • Cloud infrastructure, servers, and database compute\n       • Third-party APIs, microservices, and AI inference charges\n       • Platform commissions (App Store, Play Store)\n       • Applicable statutory indirect taxes (VAT)`;

        return {
          id: "compensation_terms",
          number: "5",
          title: "COMPENSATION: CONTRACTUAL PROJECT PROFIT PARTICIPATION",
          paragraphs: [
            `5.1 Contractual Participation Rate: The Contributor shall be entitled to an economic participation equal to ${pt.participationPercentage}% (the "Participation Percentage") of the ${pt.profitBasis || "Net Distributable Project Profit"} generated directly by the Project.`,
            `5.2 Express Non-Equity Clarification: The Parties explicitly agree that this contractual profit participation constitutes a commercial compensation arrangement for specialized technical services and DOES NOT convey, represent, or constitute legal ownership, shares, corporate equity, voting rights, or general partnership in DevEngine or any associated enterprise${pt.corporateEquityGranted ? " (except as explicitly provided in an executed separate Equity Grant Agreement)" : ""}.`,
            `5.3 Definition of Net Distributable Project Profit: Net Distributable Project Profit is defined and calculated strictly as:`,
            `    Gross Project Cash Receipts Collected by DevEngine from Commercialization of "${record.project.projectName}"`,
            `    LESS Customer Refunds and Chargebacks directly attributable to the Project`,
            `    LESS the following approved, itemized, and verifiable direct Project expenditures:`,
            expensesList,
            `    The Company shall not deduct generalized, unallocated corporate overhead or unrelated administrative expenses from the Project profit base.`,
            `5.4 Activation & Vesting: ${pt.vestingCondition}. Profit distribution entitlement activates ${pt.profitStartTrigger}.`,
            `5.5 Distribution Frequency & Statements: Net profit distributions shall occur on a ${pt.paymentFrequency} basis, within ${pt.reconciliationDeadlineDays || 15} days following the close of each calculation period, accompanied by an itemized written reconciliation statement via ${pt.reportingMethod}.`,
            durationClause,
            postServiceClause,
            `5.8 Material Events (Sale, Transfer, Discontinuation):`,
            `    (a) Project Sale or Transfer: ${pt.projectSaleOrTransferTreatment || "In the event of a commercial sale, assignment, or transfer of the Project, the Company shall require the acquirer to assume all ongoing profit participation obligations hereunder or negotiate a fair market buyout acceptable to the Contributor."}`,
            `    (b) Voluntary Departure: ${pt.voluntaryDepartureTreatment || "Voluntary departure from active services shall not impair already vested profit participation entitlements."}`,
            `    (c) Project Discontinuation: ${pt.projectDiscontinuationTreatment || "If the Company permanently discontinues commercial operation of the Project, profit participation ceases following final accounting and distribution of accrued net profits."}`,
            `    (d) Material Breach: ${pt.breachTreatment || "In the event of an uncured material breach by either Party, non-breaching remedies apply in accordance with Section 14."}`,
            `5.9 Inspection & Verification Rights: ${pt.accountingAuditProcedure || "Upon reasonable advance written notice of not less than 14 business days, the Contributor shall have the right to inspect relevant books, accounts, and reconciliation records pertaining directly to the calculation of Project net profit."}`,
          ],
        };
      }

      // 5B. REVENUE SHARING MODEL
      if (agreementType === "revenue_sharing") {
        const pt = compensation.profitTerms;
        const revPct = pt?.participationPercentage || 10;
        return {
          id: "compensation_terms",
          number: "5",
          title: "COMPENSATION: PROJECT REVENUE SHARING",
          paragraphs: [
            `5.1 Contractual Revenue Share Rate: The Contributor shall receive a contractual share equal to ${revPct}% of the Gross Qualifying Revenue directly collected by DevEngine from the commercial distribution of the Project.`,
            `5.2 Gross Qualifying Revenue Defined: Gross Qualifying Revenue encompasses all gross cash sums actually received by the Company from software license sales, subscriptions, user payments, or enterprise agreements for "${record.project.projectName}", less customer refunds and standard merchant payment processing surcharges only.`,
            `5.3 Distinction from Profit Share: This revenue-sharing model is calculated prior to the deduction of cloud infrastructure, personnel, marketing, or general operating expenses.`,
            `5.4 Non-Equity Acknowledgment: This agreement constitutes purely an economic payment model and does not confer corporate shares, stock, or equity in DevEngine.`,
            `5.5 Payment Schedule: Revenue distributions shall occur on a ${compensation.paymentFrequency || "Monthly"} schedule, within ${terms.paymentDuePeriodDays || 15} days following each calendar cycle with an accompanying revenue statement.`,
            `5.6 Duration & Post-Service: ${pt?.participationDurationDescription || "Governed by ongoing project commercialization terms."}`,
          ],
        };
      }

      // 5C. HOURLY TIME-BASED MODEL
      if (agreementType === "hourly") {
        return {
          id: "compensation_terms",
          number: "5",
          title: "COMPENSATION: HOURLY BILLABLE ENGAGEMENT",
          paragraphs: [
            `5.1 Hourly Rate: The Company agrees to compensate the Contributor at the rate of ${currency} ${Number(compensation.hourlyRate || 0).toLocaleString()} per verified billable hour.`,
            `5.2 Hours Allocation & Ceilings: The estimated commitment is ${compensation.estimatedHours || "as scheduled"} hours. The maximum billable ceiling is capped at ${compensation.maxApprovedHours || "as approved in writing"} hours. Work exceeding this cap requires prior written executive authorization.`,
            `5.3 Timesheets & Verification: The Contributor shall submit itemized timesheets describing tasks, code commits, and hours expended. ${compensation.invoiceRequirement ? "Submission of a formal invoice is mandatory for payment clearance." : ""}`,
            `5.4 Payment Schedule: Approved hours shall be disbursed on a ${compensation.paymentFrequency || "Monthly"} schedule, within ${compensation.paymentDuePeriodDays || terms.paymentDuePeriodDays || 7} business days of invoice acceptance via ${compensation.paymentMethod || "Electronic Bank Transfer"}.`,
          ],
        };
      }

      // 5D. FIXED COMPLETION PAYMENT MODEL
      if (agreementType === "fixed_completion") {
        const fixedVal = compensation.fixedAmount || compensation.totalContractValue || 0;
        return {
          id: "compensation_terms",
          number: "5",
          title: "COMPENSATION: FIXED PROJECT COMPLETION FEE",
          paragraphs: [
            `5.1 Fixed Total Fee: The Company shall pay the Contributor a fixed aggregate fee of ${currency} ${Number(fixedVal).toLocaleString()} (the "Total Fixed Contract Fee") for the complete, end-to-end delivery and handover of the Project.`,
            `5.2 Acceptance Trigger: The full fee becomes payable strictly upon full delivery, passing of automated test suites, resolution of critical bugs, and formal written acceptance sign-off by the Company.`,
            `5.3 Disbursement Window: Payment shall be disbursed within ${compensation.paymentDuePeriodDays || terms.paymentDuePeriodDays || 7} business days following formal acceptance sign-off via ${compensation.paymentMethod || "Electronic Bank Transfer"}.`,
          ],
        };
      }

      // 5E. PHASE / MILESTONE BASED MODEL
      if (agreementType === "milestone") {
        const milestones = compensation.milestones || [];
        const milestoneRows =
          milestones.length > 0
            ? milestones.map((m) => [
                `Phase ${m.phaseNumber}`,
                m.phaseName,
                m.deliverables,
                m.acceptanceCriteria,
                `${currency} ${Number(m.paymentAmount).toLocaleString()}`,
                m.expectedCompletionDate || "Per Schedule",
              ])
            : [
                ["Phase 1", "Core Architecture", "Foundational setup", "Code review approved", `${currency} 25,000`, "Sprint 1"],
                ["Phase 2", "Module Implementation", "Functional subsystems", "Test suite passing", `${currency} 50,000`, "Sprint 2"],
                ["Phase 3", "Deployment & Handover", "Production release", "Acceptance sign-off", `${currency} 25,000`, "Sprint 3"],
              ];

        const totalVal =
          milestones.length > 0
            ? milestones.reduce((sum, m) => sum + Number(m.paymentAmount || 0), 0)
            : compensation.totalContractValue || 0;

        return {
          id: "compensation_terms",
          number: "5",
          title: "COMPENSATION: MILESTONE & PHASE-BASED SCHEDULE",
          paragraphs: [
            `5.1 Total Milestone Valuation: The aggregate milestone contract valuation is agreed at ${currency} ${Number(totalVal).toLocaleString()}. Payments shall be released strictly upon the formal technical review, verification, and written sign-off of each respective phase:`,
          ],
          tableData: {
            headers: ["Phase #", "Phase Name", "Scope Deliverables", "Acceptance Benchmark", "Disbursement Amount", "Target Completion"],
            rows: milestoneRows,
          },
        };
      }

      // 5F. HYBRID COMPENSATION MODEL
      if (agreementType === "hybrid") {
        const pt = compensation.profitTerms;
        const fixedBase = compensation.fixedAmount || 0;
        const profitShare = pt?.participationPercentage || 5;

        return {
          id: "compensation_terms",
          number: "5",
          title: "COMPENSATION: HYBRID BASE & PROFIT PARTICIPATION",
          paragraphs: [
            `5.1 Base Guaranteed Fee: The Contributor shall receive a guaranteed base fee of ${currency} ${Number(fixedBase).toLocaleString()} disbursed in accordance with agreed development delivery milestones.`,
            `5.2 Supplementary Profit Participation: In addition to the base fee, the Contributor shall receive an ongoing contractual entitlement equal to ${profitShare}% of the Net Distributable Project Profit generated by the Project.`,
            `5.3 Net Profit Terms: Calculation, deductions, and payment frequency for the profit component shall be governed by the formula and terms outlined in Section 5.4 through 5.8.`,
            `5.4 Express Non-Equity Clarification: This hybrid structure does not constitute company shares, corporate equity, or partnership in DevEngine.`,
          ],
        };
      }

      // 5G. MONTHLY RETAINER MODEL
      if (agreementType === "retainer") {
        const retainerAmount = compensation.monthlyRetainerAmount || compensation.fixedAmount || 0;
        return {
          id: "compensation_terms",
          number: "5",
          title: "COMPENSATION: MONTHLY RETAINER & COMMITMENT",
          paragraphs: [
            `5.1 Recurring Monthly Retainer: The Company shall pay the Contributor a recurring retainer fee of ${currency} ${Number(retainerAmount).toLocaleString()} per active service month.`,
            `5.2 Dedicated Weekly Availability: The Contributor commits to an availability of approximately ${compensation.availabilityHoursPerWeek || 20} hours per week toward Project maintenance and development.`,
            `5.3 Additional Authorized Hours: Additional work authorized in writing beyond the base retainer scope shall be billable at ${currency} ${Number(compensation.additionalHourlyRate || 0).toLocaleString()} per hour.`,
            `5.4 Payment Terms: The retainer fee shall be payable monthly within ${terms.paymentDuePeriodDays || 7} days following the conclusion of each active service month.`,
          ],
        };
      }

      // 5H. CUSTOM TERMS MODEL
      return {
        id: "compensation_terms",
        number: "5",
        title: "COMPENSATION: CUSTOM COMMERCIAL TERMS",
        paragraphs: [
          `5.1 Negotiated Terms: The Parties agree to the following customized commercial compensation terms for this engagement:`,
          compensation.customTermsText || "Commercial terms as mutually executed in writing by the authorized representatives of both Parties.",
          `5.2 Payment Due Window: Remittances shall be payable within ${terms.paymentDuePeriodDays || 14} days of invoice acceptance via ${compensation.paymentMethod || "Electronic Bank Remittance"}.`,
        ],
      };
    },
  },

  // 6. INTELLECTUAL PROPERTY & WORK PRODUCT OWNERSHIP
  {
    id: "intellectual_property_ownership",
    title: "INTELLECTUAL PROPERTY & ASSIGNMENT OF RIGHTS",
    category: "ip",
    applicableModels: [
      "profit_participation",
      "revenue_sharing",
      "hourly",
      "fixed_completion",
      "milestone",
      "hybrid",
      "retainer",
      "custom",
    ],
    isMandatory: true,
    generate: (record) => {
      const { terms } = record;
      const model = terms.ipOwnershipModel || "work_for_hire";

      let ipClause = "";
      if (model === "work_for_hire") {
        ipClause = `6.1 Work Made for Hire & Absolute Assignment: All software code, scripts, architectures, UI elements, database schemas, algorithms, models, prompts, technical documentation, and other works created by the Contributor under this Agreement shall constitute "work made for hire" exclusively owned by DevEngine. To the extent any work product is not deemed work made for hire by law, the Contributor hereby irrevocably and perpetually assigns and transfers all worldwide right, title, interest, and intellectual property rights to DevEngine.`;
      } else if (model === "assignment_upon_payment") {
        ipClause = `6.1 Assignment Contingent on Payment: Intellectual property in deliverables shall vest in the Contributor until payment of agreed fees or initial profit distribution is remitted by DevEngine, upon which full, irrevocable ownership transfers automatically and perpetually to DevEngine.`;
      } else {
        ipClause = `6.1 Exclusive License: The Contributor grants DevEngine an exclusive, worldwide, perpetual, royalty-free license to use, reproduce, modify, deploy, sub-license, and commercialize all work product created under this Agreement.`;
      }

      const moralRightsText =
        terms.moralRightsWaiver === "explicit_waiver"
          ? `6.2 Moral Rights: The Contributor waives moral rights in the work product in favor of DevEngine and its successors.`
          : terms.moralRightsWaiver === "moral_rights_retained"
          ? `6.2 Moral Rights: The Contributor retains moral rights to be named as an author or contributor in technical credits, provided such attribution does not impede commercialization by DevEngine.`
          : `6.2 Attribution: Attribution shall be mutually agreed upon in writing between the Parties.`;

      const preExistingText = terms.preExistingIpDisclosed
        ? `6.3 Pre-Existing Intellectual Property: The Contributor retains ownership of pre-existing background tools, libraries, or reusable utilities disclosed herein: "${terms.preExistingIpDescription || "Standard public development tools"}". The Contributor grants DevEngine a perpetual, non-exclusive, royalty-free license to use such pre-existing tools as incorporated into the Project.`
        : `6.3 Warranty Against Pre-Existing Claims: The Contributor warrants that all deliverables are original and do not incorporate undisclosed proprietary third-party code.`;

      return {
        id: "intellectual_property_ownership",
        number: "6",
        title: "INTELLECTUAL PROPERTY & ASSIGNMENT OF RIGHTS",
        paragraphs: [ipClause, moralRightsText, preExistingText],
      };
    },
  },

  // 7. SOURCE CODE, REPOSITORIES & SECURITY PROTOCOLS
  {
    id: "source_code_and_repositories",
    title: "SOURCE CODE REPOSITORIES & SECURITY PROTOCOL",
    category: "ip",
    applicableModels: [
      "profit_participation",
      "revenue_sharing",
      "hourly",
      "fixed_completion",
      "milestone",
      "hybrid",
      "retainer",
      "custom",
    ],
    isMandatory: true,
    generate: () => ({
      id: "source_code_and_repositories",
      number: "7",
      title: "SOURCE CODE REPOSITORIES & SECURITY PROTOCOL",
      paragraphs: [
        `7.1 Authorized Private Repositories: All source code, schemas, and configurations must be committed continuously to DevEngine's authorized private repositories (e.g. GitHub/GitLab). The Contributor shall not maintain detached private forks or uncommitted proprietary assets on personal machines without encrypted backup.`,
        `7.2 Security Standards: The Contributor guarantees that all deliverables shall be free from known critical vulnerabilities, backdoors, spyware, or undeclared telemetry, adhering to modern software security standards (OWASP Top 10).`,
      ],
    }),
  },

  // 8. CONFIDENTIALITY & NON-DISCLOSURE
  {
    id: "confidentiality_and_nd",
    title: "CONFIDENTIAL INFORMATION & NON-DISCLOSURE",
    category: "confidentiality",
    applicableModels: [
      "profit_participation",
      "revenue_sharing",
      "hourly",
      "fixed_completion",
      "milestone",
      "hybrid",
      "retainer",
      "custom",
    ],
    isMandatory: true,
    generate: (record) => {
      const { terms } = record;
      return {
        id: "confidentiality_and_nd",
        number: "8",
        title: "CONFIDENTIAL INFORMATION & NON-DISCLOSURE",
        paragraphs: [
          `8.1 Scope: "Confidential Information" encompasses all non-public proprietary information disclosed by either Party, including source code, architectural blueprints, client identities, financial accounts, profit margins, product roadmaps, API keys, and business strategies.`,
          `8.2 Strict Non-Disclosure: The receiving Party shall hold all Confidential Information in strictest confidence, taking all reasonable precautions to prevent unauthorized disclosure, copying, or dissemination.`,
          `8.3 Duration: Confidentiality obligations shall endure throughout the term of engagement and for a period of ${terms.confidentialityDurationYears || 3} years following termination or conclusion of services. Trade secrets and source code shall remain confidential indefinitely.`,
        ],
      };
    },
  },

  // 9. DATA PROTECTION, PRIVACY & SECURITY BREACH NOTICE
  {
    id: "data_protection_and_privacy",
    title: "DATA PROTECTION, PRIVACY & BREACH NOTIFICATION",
    category: "confidentiality",
    applicableModels: [
      "profit_participation",
      "revenue_sharing",
      "hourly",
      "fixed_completion",
      "milestone",
      "hybrid",
      "retainer",
      "custom",
    ],
    isMandatory: true,
    generate: (record) => {
      const { terms } = record;
      return {
        id: "data_protection_and_privacy",
        number: "9",
        title: "DATA PROTECTION, PRIVACY & BREACH NOTIFICATION",
        paragraphs: [
          `9.1 Access Credentials: All SSH keys, database credentials, server passwords, cloud console access tokens, and API keys provided to the Contributor remain the exclusive property of DevEngine.`,
          `9.2 Immediate Security Breach Notice: In the event of any suspected security incident, credential leak, or unauthorized access involving Project data or repositories, the Contributor shall notify DevEngine executive leadership in writing within ${terms.securityBreachNotificationHours || 48} hours of discovery.`,
          `9.3 Credential Revocation: Upon conclusion of tasks or Company demand, the Contributor shall immediately cease use of and securely purge all cached development credentials, tokens, and environment secrets.`,
        ],
      };
    },
  },

  // 10. THIRD-PARTY & OPEN SOURCE LICENSING
  {
    id: "third_party_and_open_source",
    title: "THIRD-PARTY & OPEN SOURCE SOFTWARE COMPLIANCE",
    category: "ip",
    applicableModels: [
      "profit_participation",
      "revenue_sharing",
      "hourly",
      "fixed_completion",
      "milestone",
      "hybrid",
      "retainer",
      "custom",
    ],
    isMandatory: true,
    generate: (record) => {
      const { terms } = record;
      return {
        id: "third_party_and_open_source",
        number: "10",
        title: "THIRD-PARTY & OPEN SOURCE SOFTWARE COMPLIANCE",
        paragraphs: [
          `10.1 Permitted Licensing: The Contributor shall only incorporate open-source libraries licensed under permissive terms: ${terms.thirdPartyLicensesAllowed || "MIT, Apache 2.0, BSD-3-Clause"}.`,
          `10.2 Copyleft Prohibition: The incorporation of viral copyleft licenses (e.g. GPL, AGPL) that would mandate open-sourcing DevEngine proprietary assets or commercial engines is strictly prohibited without prior written executive authorization.`,
        ],
      };
    },
  },

  // 11. QUALITY ASSURANCE, ACCEPTANCE & BUG-FIX WARRANTY
  {
    id: "qa_acceptance_and_warranty",
    title: "QUALITY ASSURANCE, ACCEPTANCE & BUG-FIX WARRANTY",
    category: "commercial",
    applicableModels: [
      "profit_participation",
      "revenue_sharing",
      "hourly",
      "fixed_completion",
      "milestone",
      "hybrid",
      "retainer",
      "custom",
    ],
    isMandatory: true,
    generate: (record) => {
      const { terms } = record;
      return {
        id: "qa_acceptance_and_warranty",
        number: "11",
        title: "QUALITY ASSURANCE, ACCEPTANCE & BUG-FIX WARRANTY",
        paragraphs: [
          `11.1 Acceptance Review Window: The Company shall have an evaluation window of ${terms.acceptancePeriodDays || 7} business days following receipt of each deliverable to test compliance with agreed specifications.`,
          `11.2 Bug-Fix Warranty: The Contributor warrants all delivered code against functional bugs, logic errors, and specification deviations for a period of ${terms.bugFixPeriodDays || 30} days following final deployment, during which the Contributor shall remedy all verified defects promptly at no additional charge.`,
        ],
      };
    },
  },

  // 12. SCOPE CHANGES & WRITTEN CHANGE REQUESTS
  {
    id: "scope_changes_and_change_requests",
    title: "SCOPE CHANGES & CHANGE REQUEST PROTOCOL",
    category: "commercial",
    applicableModels: [
      "profit_participation",
      "revenue_sharing",
      "hourly",
      "fixed_completion",
      "milestone",
      "hybrid",
      "retainer",
      "custom",
    ],
    isMandatory: true,
    generate: () => ({
      id: "scope_changes_and_change_requests",
      number: "12",
      title: "SCOPE CHANGES & CHANGE REQUEST PROTOCOL",
      paragraphs: [
        `12.1 Written Requirement: Any material alteration to project scope, architecture, deliverables, compensation, or milestones must be documented in a written Change Request or Addendum signed by authorized representatives of both Parties.`,
        `12.2 Fee & Timeline Adjustments: Material scope expansions shall specify adjustments to timelines and compensation prior to commencement of work on such changes.`,
      ],
    }),
  },

  // 13. INDEPENDENT CONTRACTOR STATUS & STATUTORY TAXES
  {
    id: "independent_contractor_status",
    title: "INDEPENDENT CONTRACTOR RELATIONSHIP & TAXES",
    category: "boilerplate",
    applicableModels: [
      "profit_participation",
      "revenue_sharing",
      "hourly",
      "fixed_completion",
      "milestone",
      "hybrid",
      "retainer",
      "custom",
    ],
    isMandatory: true,
    generate: () => ({
      id: "independent_contractor_status",
      number: "13",
      title: "INDEPENDENT CONTRACTOR RELATIONSHIP & TAXES",
      paragraphs: [
        `13.1 Independent Contractor Status: The Contributor performs all services under this Agreement as an independent contractor. Nothing herein creates an employment relationship, agency, joint venture, or formal partnership between the Parties.`,
        `13.2 Taxes & Statutory Filings: The Contributor assumes full and exclusive responsibility for all personal income taxes, statutory social contributions, and tax filings applicable to payments received under this Agreement.`,
      ],
    }),
  },

  // 14. TERMINATION & POST-TERMINATION RIGHTS (CONSISTENT WITH DURATION SELECTION!)
  {
    id: "termination_and_post_termination",
    title: "TERMINATION & EFFECT OF TERMINATION",
    category: "termination",
    applicableModels: [
      "profit_participation",
      "revenue_sharing",
      "hourly",
      "fixed_completion",
      "milestone",
      "hybrid",
      "retainer",
      "custom",
    ],
    isMandatory: true,
    generate: (record) => {
      const { agreementType, compensation, terms } = record;
      const isProfitModel = agreementType === "profit_participation" || agreementType === "hybrid" || agreementType === "revenue_sharing";
      const pt = compensation.profitTerms;
      const isOngoingIndefinite = pt?.durationModel === "ongoing_indefinite" || pt?.postServiceTreatment === "full_continuing";

      const postTerminationParagraph = isOngoingIndefinite
        ? `14.3 Post-Termination Continuation of Vested Profit Entitlement: The Parties expressly acknowledge and agree that termination of active services (whether for convenience or upon scheduled completion) shall NOT cancel, extinguish, or forfeit the Contributor's ongoing contractual profit participation rights in "${record.project.projectName}". Net Distributable Project Profit participation earned on accepted deliverables shall continue to be calculated, reconciled, and disbursed in accordance with Section 5 for so long as the Project produces distributable profit.`
        : isProfitModel && pt?.postServiceTreatment === "pro_rata_vested"
        ? `14.3 Pro-Rata Vested Rights: In the event of termination of active services, the Contributor shall retain a pro-rata vested profit participation share based on verified completed deliverables.`
        : `14.3 Post-Termination Settlement: Upon termination, the Company shall remit payment for all approved, accepted deliverables completed prior to the effective date of termination.`;

      return {
        id: "termination_and_post_termination",
        number: "14",
        title: "TERMINATION & EFFECT OF TERMINATION",
        paragraphs: [
          `14.1 Termination for Convenience: Either Party may terminate active services under this Agreement upon ${terms.terminationNoticeDays || 14} days' written notice to the other Party.`,
          `14.2 Termination for Cause: Either Party may terminate this Agreement immediately upon written notice if the other Party commits a material breach of this Agreement and fails to cure such breach within 14 business days of receiving formal notice detailing the breach.`,
          postTerminationParagraph,
          `14.4 Repository & Asset Handover: Upon termination of active services, the Contributor shall promptly transfer all complete and in-progress repositories, assets, and documentation to the Company.`,
        ],
      };
    },
  },

  // 15. DISPUTE RESOLUTION & GOVERNING LAW
  {
    id: "dispute_resolution_and_governing_law",
    title: "DISPUTE RESOLUTION & GOVERNING LAW",
    category: "governing_law",
    applicableModels: [
      "profit_participation",
      "revenue_sharing",
      "hourly",
      "fixed_completion",
      "milestone",
      "hybrid",
      "retainer",
      "custom",
    ],
    isMandatory: true,
    generate: (record) => {
      const { terms } = record;
      return {
        id: "dispute_resolution_and_governing_law",
        number: "15",
        title: "DISPUTE RESOLUTION & GOVERNING LAW",
        paragraphs: [
          `15.1 Good Faith Negotiation: The Parties shall endeavor to resolve any dispute, difference, or controversy arising out of or in connection with this Agreement amicably through good-faith executive negotiations within 15 days of notice.`,
          `15.2 Dispute Forum: In the event amicable settlement is not reached, the dispute shall be resolved through ${terms.disputeResolutionMethod || "Arbitral Conciliation in Dhaka, Bangladesh"}.`,
          `15.3 Governing Law & Jurisdiction: This Agreement shall be governed by, construed, and enforced in accordance with the ${terms.governingLaw || "Laws of the People's Republic of Bangladesh"}. The Parties submit to the exclusive jurisdiction of the ${terms.jurisdiction || "Competent Courts of Dhaka, Bangladesh"}.`,
        ],
      };
    },
  },

  // 16. ENTIRE AGREEMENT, AMENDMENTS & ADDENDA PRECEDENCE
  {
    id: "entire_agreement_and_amendments",
    title: "ENTIRE AGREEMENT, AMENDMENTS & MISCELLANEOUS",
    category: "boilerplate",
    applicableModels: [
      "profit_participation",
      "revenue_sharing",
      "hourly",
      "fixed_completion",
      "milestone",
      "hybrid",
      "retainer",
      "custom",
    ],
    isMandatory: true,
    generate: () => ({
      id: "entire_agreement_and_amendments",
      number: "16",
      title: "ENTIRE AGREEMENT, AMENDMENTS & MISCELLANEOUS",
      paragraphs: [
        `16.1 Entire Agreement: This Agreement constitutes the complete, final, and exclusive agreement between the Parties with respect to the Project and supersedes all prior proposals, drafts, communications, and verbal understandings.`,
        `16.2 Amendments & Addenda: No modification, waiver, or amendment of this Agreement shall be legally binding unless executed in writing by authorized representatives of both Parties in the form of a formal Contract Addendum. Any duly executed Addendum referencing this Agreement shall take legal precedence over conflicting terms in this original instrument.`,
        `16.3 Severability: If any provision of this Agreement is held to be invalid or unenforceable by a court of competent jurisdiction, such invalidity shall not affect the remaining provisions, which shall continue in full force and effect.`,
        `16.4 Execution in Counterparts: This Agreement may be executed in counterparts and via electronic signature or digital transmission, each of which shall be deemed an original and together constitute a single binding legal instrument.`,
      ],
    }),
  },
];
