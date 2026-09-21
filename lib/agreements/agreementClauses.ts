import { AgreementRecord } from "@/types/agreement";

export interface AgreementClauseSection {
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

/**
 * Builds all 35 standard and dynamic legal clauses tailored to the agreement
 */
export function buildAgreementClauses(record: AgreementRecord): AgreementClauseSection[] {
  const { agreementType, project, developer, devengine, compensation, terms, deliverables } = record;
  const currency = compensation.currency || "BDT";

  const sections: AgreementClauseSection[] = [];

  // 1. PARTIES
  sections.push({
    number: "1",
    title: "PARTIES & CAPACITY",
    paragraphs: [
      `This Agreement is entered into on ${project.agreementEffectiveDate || "the Effective Date"} by and between:`,
      `DEVENGINE, a software engineering enterprise under the executive direction of ${devengine.ceoName}, ${devengine.ceoTitle}, having operational headquarters at ${devengine.companyAddress} (hereinafter referred to as the "Company" or "DevEngine"); and`,
      `${developer.fullName.toUpperCase()}${developer.professionalName ? ` (Professionally known as "${developer.professionalName}")` : ""}, acting in the capacity of ${developer.role}, residing at ${developer.address || "the address on record"}, with contact email ${developer.email} and telephone ${developer.phone} (hereinafter referred to as the "Contributor" or "Developer").`,
      `The Company and the Contributor may individually be referred to as a "Party" and collectively as the "Parties".`,
    ],
  });

  // 2. PURPOSE OF ENGAGEMENT
  sections.push({
    number: "2",
    title: "PURPOSE & APPOINTMENT",
    paragraphs: [
      `The Company hereby engages the Contributor as an independent technical contributor to provide engineering, design, architecture, or related technology services for the project identified as "${project.projectName}" (the "Project").`,
      `The Contributor agrees to perform the work with the highest standard of professional competence, industry best practices, and fidelity to the Company's architectural specifications and deadlines.`,
    ],
  });

  // 3. PROJECT OVERVIEW & TIMELINE
  sections.push({
    number: "3",
    title: "PROJECT OVERVIEW & TIMELINE",
    paragraphs: [
      `Project Title: ${project.projectName}${project.projectId ? ` (Ref: ${project.projectId})` : ""}`,
      `Project Nature / Domain: ${project.projectType || "Commercial Software Development"}`,
      `Project Synopsis: ${project.description || "Design, development, testing, and deployment of designated software subsystems as specified by DevEngine."}`,
      `Commencement Date: ${project.startDate || project.agreementEffectiveDate || "Upon Execution"}`,
      `Anticipated Target Completion: ${project.expectedCompletionDate || "As determined by project milestones"}`,
    ],
  });

  // 4. SCOPE OF WORK & DELIVERABLES
  const deliverableRows = deliverables && deliverables.length > 0
    ? deliverables.map((d, idx) => [
        `${idx + 1}`,
        d.title,
        d.description,
        d.acceptanceCriteria,
        d.priority,
        d.deadline || "Per Schedule",
      ])
    : [
        ["1", "Core Architecture & Implementation", "Implementation of specified software modules as outlined in project documentation", "Zero critical defects, code review approved", "High", "Per Schedule"],
      ];

  sections.push({
    number: "4",
    title: "SCOPE OF WORK & FORMAL DELIVERABLES",
    paragraphs: [
      `The Contributor shall develop and deliver the following scheduled deliverables. Each deliverable shall undergo formal technical evaluation by the Company prior to acceptance:`,
    ],
    tableData: {
      headers: ["#", "Deliverable Name", "Technical Specification", "Acceptance Criteria", "Priority", "Target Due"],
      rows: deliverableRows,
    },
  });

  // 5. COMPENSATION & PAYMENT TERMS (Dynamic based on Agreement Type)
  if (agreementType === "profit_participation") {
    const pt = compensation.profitTerms || {
      participationPercentage: 10,
      profitBasis: "Net Distributable Project Profit",
      vestingCondition: "Successful completion and deployment of all agreed project deliverables",
      profitStartTrigger: "Upon initial commercial monetization and realization of positive net project revenue",
      paymentFrequency: "Quarterly within 15 days following calendar quarter-end",
      profitCalculationMethod: "Calculated from gross receipts less agreed deductible operating expenses",
      eligibleProjectExpenses: [],
      contributorCompletionRequirement: "100% completion of assigned core deliverables",
      postTerminationParticipation: "Ceases upon voluntary abandonment; pro-rata vesting applies if terminated without cause",
      participationDuration: "24 months from official public release date",
      reportingMethod: "Itemized quarterly financial statement provided by DevEngine accounting",
    };

    sections.push({
      number: "5",
      title: "COMPENSATION: CONTRACTUAL PROJECT PROFIT PARTICIPATION",
      paragraphs: [
        `5.1 Contractual Participation: The Contributor shall be entitled to a contractual profit participation equal to ${pt.participationPercentage}% (the "Participation Percentage") of the ${pt.profitBasis || "Net Distributable Project Profit"} directly generated by the Project.`,
        `5.2 Non-Equity Distinction: The Parties explicitly acknowledge and agree that this contractual profit participation constitutes an economic compensation model for services rendered and DOES NOT represent, convey, or constitute legal ownership, corporate equity, capital shares, voting rights, or partnership status in DevEngine or any of its parent, subsidiary, or affiliated ventures.`,
        `5.3 Net Distributable Project Profit Formula: Net Distributable Project Profit shall be defined and calculated as:`,
        `    Gross Project Cash Receipts Received by DevEngine`,
        `    MINUS Applicable Customer Refunds and Chargebacks`,
        `    MINUS Payment Processing, Merchant, and Gateway Surcharges`,
        `    MINUS Direct Cloud Hosting, Server Infrastructure, and Compute Costs (AWS/GCP/Vercel/Supabase)`,
        `    MINUS Third-Party APIs, Model Inference, and Microservice Subscription Charges`,
        `    MINUS Applicable Indirect Taxes, Value Added Tax (VAT), and Withholding Levies`,
        `    MINUS Authorized Project Marketing, Distribution, and App Store Platform Commission Fees`,
        `    MINUS Agreed Operational Expenditures directly attributable to the Project.`,
        `5.4 Calculation & Vesting: ${pt.vestingCondition}. The participation entitlement shall activate ${pt.profitStartTrigger}.`,
        `5.5 Payment & Distribution Frequency: Net profit distributions shall occur on a ${pt.paymentFrequency} basis, subject to written reconciliation statements provided to the Contributor via ${pt.reportingMethod}.`,
        `5.6 Duration & Post-Termination: Contributor participation shall endure for ${pt.participationDuration}. ${pt.postTerminationParticipation}.`,
      ],
    });
  } else if (agreementType === "hourly") {
    sections.push({
      number: "5",
      title: "COMPENSATION: HOURLY BILLABLE ENGAGEMENT",
      paragraphs: [
        `5.1 Hourly Rate: The Company agrees to compensate the Contributor at the rate of ${currency} ${Number(compensation.hourlyRate || 0).toLocaleString()} per verified billable hour.`,
        `5.2 Hours Allocation: The estimated commitment is ${compensation.estimatedHours || "as required"} hours, with a strict ceiling of ${compensation.maxApprovedHours || "capped per written approval"} maximum approved hours without prior written executive authorization from DevEngine.`,
        `5.3 Timesheets & Verification: The Contributor shall submit detailed weekly timesheets itemizing tasks accomplished, git commit hashes, and hours expended. ${compensation.invoiceRequirement ? "Submission of a formal invoice is mandatory for billing cycle reconciliation." : ""}`,
        `5.4 Payment Terms: Approved timesheets shall be disbursed on a ${compensation.paymentFrequency || "Monthly"} schedule, within ${compensation.paymentDuePeriodDays || terms.paymentDuePeriodDays || 7} business days of invoice acceptance via ${compensation.paymentMethod || "Bank Transfer / Electronic Funds Transfer"}.`,
      ],
    });
  } else if (agreementType === "milestone") {
    const milestoneRows = compensation.milestones && compensation.milestones.length > 0
      ? compensation.milestones.map((m) => [
          `Phase ${m.phaseNumber}`,
          m.phaseName,
          m.deliverables,
          m.acceptanceCriteria,
          `${currency} ${Number(m.paymentAmount).toLocaleString()}`,
          m.expectedCompletionDate || "TBD",
        ])
      : [
          ["Phase 1", "Planning & Architecture", "Architecture blueprint", "CEO approval", `${currency} 20,000`, "Sprint 1"],
          ["Phase 2", "Core Development", "Functional modules", "Automated tests pass", `${currency} 50,000`, "Sprint 2"],
          ["Phase 3", "Deployment & Handover", "Production release", "Acceptance sign-off", `${currency} 30,000`, "Sprint 3"],
        ];

    const totalVal = compensation.milestones && compensation.milestones.length > 0
      ? compensation.milestones.reduce((acc, curr) => acc + Number(curr.paymentAmount || 0), 0)
      : compensation.totalContractValue || 0;

    sections.push({
      number: "5",
      title: "COMPENSATION: MILESTONE & PHASE-BASED SCHEDULE",
      paragraphs: [
        `5.1 Fixed Milestone Schedule: The total contract valuation for the Project is agreed at ${currency} ${Number(totalVal).toLocaleString()} (the "Total Contract Value"). Payment shall be released strictly upon the formal review, acceptance, and sign-off of each respective phase by DevEngine:`,
      ],
      tableData: {
        headers: ["Phase #", "Phase Name", "Phase Deliverables", "Acceptance Threshold", "Disbursement Amount", "Target Window"],
        rows: milestoneRows,
      },
    });
  } else if (agreementType === "fixed_completion") {
    sections.push({
      number: "5",
      title: "COMPENSATION: FIXED PROJECT COMPLETION FEE",
      paragraphs: [
        `5.1 Fixed Total Fee: The Company shall pay the Contributor a fixed aggregate fee of ${currency} ${Number(compensation.fixedAmount || compensation.totalContractValue || 0).toLocaleString()} for the comprehensive, end-to-end delivery of the Project.`,
        `5.2 Payment Trigger: The full fee shall become payable only upon the complete delivery, automated test pass, security audit, and formal written acceptance of all Project deliverables by the Company.`,
        `5.3 Disbursement Window: Payment shall be remitted within ${terms.paymentDuePeriodDays || 7} business days following written sign-off via ${compensation.paymentMethod || "Direct Bank Remittance / Digital Payment"}.`,
      ],
    });
  } else if (agreementType === "hybrid") {
    const pt = compensation.profitTerms;
    sections.push({
      number: "5",
      title: "COMPENSATION: HYBRID BASE & PROFIT PARTICIPATION",
      paragraphs: [
        `5.1 Base Fixed Fee: The Contributor shall receive an initial guaranteed base fee of ${currency} ${Number(compensation.fixedAmount || 0).toLocaleString()} distributed according to the agreed project delivery milestones.`,
        `5.2 Supplementary Profit Participation: In addition to the base compensation, the Contributor shall receive a ${pt?.participationPercentage || 5}% contractual participation in the Net Distributable Project Profit generated by the Project, governed by the terms of Section 6.`,
        `5.3 Equity Clarification: This hybrid structure does not constitute company shares, corporate equity, or partnership in DevEngine.`,
      ],
    });
  } else {
    // Retainer
    sections.push({
      number: "5",
      title: "COMPENSATION: MONTHLY RETAINER & COMMITMENT",
      paragraphs: [
        `5.1 Monthly Retainer Fee: The Company shall pay the Contributor a fixed recurring retainer fee of ${currency} ${Number(compensation.monthlyRetainerAmount || compensation.fixedAmount || 0).toLocaleString()} per calendar month.`,
        `5.2 Dedicated Availability: The Contributor pledges an availability of approximately ${compensation.availabilityHoursPerWeek || 20} hours per week toward Project requirements. Additional authorized hours beyond the scope shall be compensated at ${currency} ${Number(compensation.additionalHourlyRate || 0).toLocaleString()} per hour.`,
        `5.3 Disbursement: The retainer shall be payable on a monthly basis within ${terms.paymentDuePeriodDays || 7} days of the close of each active service month.`,
      ],
    });
  }

  // 6. INTELLECTUAL PROPERTY & WORK-FOR-HIRE
  sections.push({
    number: "6",
    title: "INTELLECTUAL PROPERTY & ASSIGNMENT OF RIGHTS",
    paragraphs: [
      `6.1 Work Made for Hire: The Contributor expressly acknowledges that all software code, scripts, system designs, documentation, architectural diagrams, algorithms, UI components, APIs, database schemas, and other works of authorship created by the Contributor in connection with this Project constitute "work made for hire" exclusively owned by DevEngine.`,
      `6.2 Absolute Assignment: To the extent any work product may not be deemed work made for hire by law, the Contributor hereby irrevocably assigns, transfers, and conveys to DevEngine, unconditionally and perpetually, all worldwide right, title, interest, copyright, patent rights, trade secrets, and intellectual property rights in and to all such work product.`,
      `6.3 Moral Rights Waiver: The Contributor irrevocably waives all moral rights (including rights of attribution and integrity) in the work product in favor of DevEngine and its assigns.`,
    ],
  });

  // 7. SOURCE CODE & WORK PRODUCT INTEGRITY
  sections.push({
    number: "7",
    title: "SOURCE CODE REPOSITORIES & SECURITY PROTOCOL",
    paragraphs: [
      `7.1 Repository Commits: All source code must be continuously committed to the Company's authorized private repositories (e.g. GitHub/GitLab). The Contributor shall not maintain detached private forks or store uncommitted proprietary assets on personal machines without encrypted backup.`,
      `7.2 Clean Code Standards: The Contributor guarantees that all deliverables shall be original, devoid of malicious logic, spyware, backdoors, or undeclared telemetry, and compliant with modern security standards (OWASP Top 10).`,
    ],
  });

  // 8. CONFIDENTIALITY & NON-DISCLOSURE
  sections.push({
    number: "8",
    title: "CONFIDENTIAL INFORMATION & NON-DISCLOSURE",
    paragraphs: [
      `8.1 Scope: "Confidential Information" encompasses all proprietary information disclosed by DevEngine, including source code, customer lists, architectural blueprints, financial metrics, profit margins, client identities, API keys, credentials, and strategic plans.`,
      `8.2 Non-Disclosure Obligation: The Contributor shall hold all Confidential Information in strictest confidence and shall not copy, disclose, publish, or disseminate such information to any third party without explicit written consent from DevEngine.`,
      `8.3 Duration: The obligations under this section shall remain in effect throughout the term of this Agreement and for a period of ${terms.confidentialityDurationYears || 3} years following termination or conclusion of engagement.`,
    ],
  });

  // 9. DATA PROTECTION, PRIVACY & SECURITY CREDENTIALS
  sections.push({
    number: "9",
    title: "DATA PROTECTION, PRIVACY & ACCESS CREDENTIALS",
    paragraphs: [
      `9.1 Credential Protocol: All SSH keys, database URIs, cloud console credentials, and API tokens provided to the Contributor remain the exclusive property of DevEngine and must be handled with utmost security.`,
      `9.2 Immediate Revocation: Upon conclusion of tasks or upon Company demand, the Contributor shall immediately cease use of and securely purge all local cached credentials and temporary environment configs.`,
    ],
  });

  // 10. THIRD-PARTY & OPEN SOURCE LICENSING
  sections.push({
    number: "10",
    title: "THIRD-PARTY & OPEN SOURCE SOFTWARE COMPLIANCE",
    paragraphs: [
      `10.1 Permitted Licensing: The Contributor shall only incorporate open-source libraries licensed under permissive terms (e.g. MIT, Apache 2.0, BSD). Incorporation of viral copyleft licenses (such as GPL, AGPL) that would mandate open-sourcing DevEngine proprietary assets is strictly prohibited without prior written executive authorization.`,
    ],
  });

  // 11. QUALITY ASSURANCE, ACCEPTANCE & BUG FIX WARRANTY
  sections.push({
    number: "11",
    title: "QUALITY ASSURANCE & BUG-FIX WARRANTY",
    paragraphs: [
      `11.1 Acceptance Review: The Company shall have an acceptance review period of ${terms.acceptancePeriodDays || 7} business days following receipt of each deliverable to test and verify compliance with technical benchmarks.`,
      `11.2 Bug-Fix Warranty: The Contributor warrants all delivered code against functional bugs, logic errors, and specification deviations for a period of ${terms.bugFixPeriodDays || 30} days following final deployment, during which the Contributor shall remedy all verified defects promptly at no additional cost.`,
    ],
  });

  // 12. NON-SOLICITATION & NON-INTERFERENCE
  sections.push({
    number: "12",
    title: "NON-SOLICITATION OF CLIENTS & PERSONNEL",
    paragraphs: [
      `During the term of this Agreement and for a period of ${terms.nonSolicitationYears || 2} years following its termination, the Contributor shall not directly or indirectly solicit, divert, or contract with any client, partner, or personnel of DevEngine introduced through this Project.`,
    ],
  });

  // 13. INDEPENDENT CONTRACTOR RELATIONSHIP
  sections.push({
    number: "13",
    title: "INDEPENDENT CONTRACTOR RELATIONSHIP",
    paragraphs: [
      `13.1 Independent Status: The Contributor performs all duties hereunder as an independent contractor and not as an employee, agent, partner, or joint venturer of DevEngine.`,
      `13.2 Taxes & Benefits: The Contributor assumes sole responsibility for all personal income taxes, statutory filings, and social insurances applicable to compensation received under this Agreement.`,
    ],
  });

  // 14. TERMINATION & POST-TERMINATION RIGHTS
  sections.push({
    number: "14",
    title: "TERMINATION & EFFECT OF TERMINATION",
    paragraphs: [
      `14.1 Termination for Convenience: Either Party may terminate this Agreement upon ${terms.terminationNoticeDays || 14} days' written notice to the other Party.`,
      `14.2 Termination for Cause: DevEngine may terminate this Agreement with immediate effect in the event of gross breach of confidentiality, willful misconduct, intentional code sabotage, or unexcused abandonment of scheduled deliverables.`,
      `14.3 Post-Termination Settlement: Upon termination, DevEngine shall pay the Contributor for approved, accepted deliverables completed prior to the effective termination date, and the Contributor shall promptly hand over all repositories, assets, and documentation.`,
    ],
  });

  // 15. DISPUTE RESOLUTION & GOVERNING LAW
  sections.push({
    number: "15",
    title: "DISPUTE RESOLUTION & GOVERNING LAW",
    paragraphs: [
      `15.1 Amicable Negotiation: The Parties shall endeavor to resolve any dispute arising under this Agreement amicably through good-faith executive discussion within 15 days of notice.`,
      `15.2 Dispute Forum: Failing amicable settlement, the dispute shall be resolved in accordance with ${terms.disputeResolutionMethod}.`,
      `15.3 Governing Law: This Agreement shall be governed by, construed, and enforced in accordance with the ${terms.governingLaw}. The Parties submit to the exclusive jurisdiction of the ${terms.jurisdiction}.`,
    ],
  });

  // 16. ENTIRE AGREEMENT, AMENDMENTS & SEVERABILITY
  sections.push({
    number: "16",
    title: "ENTIRE AGREEMENT & MISCELLANEOUS",
    paragraphs: [
      `16.1 Entire Agreement: This Agreement constitutes the complete, final, and exclusive agreement between the Parties concerning the Project and supersedes all prior verbal understandings, emails, or drafts.`,
      `16.2 Amendments: No alteration, waiver, or amendment of this Agreement shall be binding unless executed in writing by authorized representatives of both Parties.`,
      `16.3 Severability: If any provision of this Agreement is held invalid or unenforceable, the remaining provisions shall remain in full force and effect.`,
      `16.4 Electronic Counterparts: This Agreement may be executed in counterparts, each of which shall be deemed an original, and transmission of electronic signatures shall have the same binding legal effect as manual execution.`,
    ],
  });

  return sections;
}
