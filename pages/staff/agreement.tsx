import Head from "next/head";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getStaffByUid } from "@/lib/services/staffService";
import {
  getAgreementForStaff,
  buildSynthesizedAgreementFromStaff,
} from "@/lib/services/agreementService";
import { generateAgreementPdf } from "@/lib/utils/generateAgreementPdf";
import StaffLayout from "@/components/StaffLayout";
import {
  EmployeeHeading,
  EmployeeIcon,
  EmployeeBadge,
  EmployeeEmpty,
  EmployeeLoading,
} from "@/components/staff/EmployeeUI";
import styles from "@/components/staff/EmployeeExperience.module.css";
import type { StaffMember } from "@/types/staff";
import type { AgreementRecord } from "@/types/agreement";
import {
  AGREEMENT_TYPE_LABELS,
  AGREEMENT_STATUS_LABELS,
} from "@/types/agreement";

export default function StaffAgreementPage() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [staffData, setStaffData] = useState<StaffMember | null>(null);
  const [agreement, setAgreement] = useState<AgreementRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/staff");
        return;
      }
      const staff = await getStaffByUid(user.uid);
      if (!staff || staff.status !== "active") {
        router.replace("/staff");
        return;
      }
      setStaffData(staff);

      try {
        let agr = await getAgreementForStaff({
          agreementId: staff.agreementId,
          staffId: staff.id,
          staffEmail: staff.email,
          staff,
        });
        if (!agr) {
          agr = buildSynthesizedAgreementFromStaff(staff);
        }
        setAgreement(agr);
      } catch (err) {
        console.error("Failed to load staff agreement:", err);
        setAgreement(buildSynthesizedAgreementFromStaff(staff));
      } finally {
        setLoading(false);
        setAuthReady(true);
      }
    });
    return () => unsub();
  }, [router]);

  const handleDownloadPdf = async () => {
    const docRecord = agreement || (staffData ? buildSynthesizedAgreementFromStaff(staffData) : null);
    if (!docRecord) return;
    setIsDownloadingPdf(true);
    try {
      await generateAgreementPdf(docRecord, { download: true });
    } catch (err) {
      console.error("Failed to generate agreement PDF:", err);
      alert("Failed to generate PDF contract. Please try again or contact administration.");
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const getCurrencySymbol = (curr?: string) => {
    if (!curr) return "৳";
    if (curr.toUpperCase() === "BDT") return "৳";
    if (curr.toUpperCase() === "USD") return "$";
    if (curr.toUpperCase() === "EUR") return "€";
    return curr + " ";
  };

  const formatPaymentMethod = (method?: string) => {
    switch (method?.toLowerCase()) {
      case "bank_transfer":
        return "Bank Transfer";
      case "bkash":
        return "bKash (MFS)";
      case "nagad":
        return "Nagad (MFS)";
      case "cash":
        return "Cash";
      case "wire":
        return "Wire Transfer";
      default:
        return method || "Bank Transfer";
    }
  };

  const formatEmploymentType = (type?: string) => {
    switch (type?.toLowerCase()) {
      case "probation":
        return "Probation Period";
      case "permanent":
        return "Permanent Employee";
      case "contract":
        return "Contractual";
      case "intern":
        return "Internship";
      default:
        return type || "Permanent Employee";
    }
  };

  if (!authReady || loading) return <EmployeeLoading />;

  const salary = staffData?.salaryManagement;
  const grossMonthly =
    salary?.grossSalary ||
    (salary?.basicSalary || 0) + (salary?.houseRent || 0) + (salary?.medical || 0) ||
    agreement?.compensation?.monthlyRetainerAmount ||
    0;
  const currencyCode = salary?.currency || agreement?.compensation?.currency || "BDT";
  const currencySymbol = getCurrencySymbol(currencyCode);

  return (
    <StaffLayout title="Employment Agreement | DevEngine Portal">
      <Head>
        <title>Employment Agreement | DevEngine Portal</title>
      </Head>
      <div className={styles.page}>
        <EmployeeHeading
          eyebrow="The foundation of working together"
          icon="gavel"
          title="Employment Agreement & Contract"
          description="Your official employment contract, compensation structure, and HR terms established during your onboarding."
          actions={
            <button
              type="button"
              className={styles.primaryButton}
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
            >
              <EmployeeIcon>download</EmployeeIcon>
              {isDownloadingPdf ? "Preparing Contract…" : "Download Official PDF"}
            </button>
          }
        />

        {/* 1. Header Overview Banner */}
        <section
          className={`${styles.panel} ${styles.agreementSummary}`}
          aria-labelledby="contract-summary-title"
        >
          <div>
            <div className={styles.badgeRow}>
              <EmployeeBadge tone="accent">
                {agreement ? AGREEMENT_STATUS_LABELS[agreement.status] || "Active In Service" : "Active In Service"}
              </EmployeeBadge>
              <EmployeeBadge>
                Ref: {agreement?.agreementNumber || `DEV-AGR-${new Date().getFullYear()}-${staffData?.id?.slice(0, 6).toUpperCase() || "HR"}`}
              </EmployeeBadge>
              <EmployeeBadge
                tone={staffData?.employmentType === "probation" ? "warning" : "accent"}
              >
                {formatEmploymentType(staffData?.employmentType)}
              </EmployeeBadge>
              <EmployeeBadge>v{agreement?.version || "1.0"}</EmployeeBadge>
            </div>
            <h2 id="contract-summary-title">
              {agreement?.agreementTypeLabel ||
                (staffData?.employmentType === "probation"
                  ? "Probationary Employment Agreement"
                  : "Permanent Employment Agreement")}
            </h2>
            <p>
              Executed between DevEngine Systems Inc. and{" "}
              <strong style={{ color: "var(--devengine-text)" }}>
                {staffData?.name || agreement?.developer?.fullName}
              </strong>{" "}
              ({staffData?.designation || staffData?.staffType || "Engineer"})
            </p>
          </div>
          <dl className={styles.details}>
            <div>
              <dt>Effective Date</dt>
              <dd>
                {staffData?.joiningDate ||
                  agreement?.project?.agreementEffectiveDate ||
                  "Onboarding Date"}
              </dd>
            </div>
            <div>
              <dt>Notice Period</dt>
              <dd>
                {salary?.noticePeriodDays || agreement?.terms?.terminationNoticeDays || 30} Days Written Notice
              </dd>
            </div>
            <div>
              <dt>Classification</dt>
              <dd>{formatEmploymentType(staffData?.employmentType)}</dd>
            </div>
            <div>
              <dt>Jurisdiction</dt>
              <dd>{agreement?.terms?.jurisdiction || "Dhaka, Bangladesh"}</dd>
            </div>
          </dl>
        </section>

        {/* 2. Three Key Cards: Salary Breakdown, Tenure/Status, and Schedule */}
        <div className={styles.agreementGrid}>
          {/* Column 1: Monthly Compensation & Structure */}
          <section className={styles.agreementCard}>
            <h3>
              <EmployeeIcon>payments</EmployeeIcon>Compensation Structure
            </h3>
            <strong>
              {currencySymbol}
              {grossMonthly.toLocaleString()}
            </strong>
            <p style={{ fontWeight: 600, color: "var(--devengine-text)" }}>
              Gross Monthly Remuneration • {currencyCode}
            </p>

            <div
              style={{
                marginTop: 14,
                paddingTop: 12,
                borderTop: "1px dashed var(--devengine-border)",
                display: "grid",
                gap: 7,
                fontSize: "0.85rem",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--devengine-muted)" }}>Basic Salary:</span>
                <span style={{ fontWeight: 600 }}>
                  {currencySymbol}
                  {(salary?.basicSalary || 0).toLocaleString()}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--devengine-muted)" }}>House Rent:</span>
                <span style={{ fontWeight: 600 }}>
                  {currencySymbol}
                  {(salary?.houseRent || 0).toLocaleString()}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--devengine-muted)" }}>Medical / Allowance:</span>
                <span style={{ fontWeight: 600 }}>
                  {currencySymbol}
                  {(salary?.medical || 0).toLocaleString()}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: 4,
                  paddingTop: 8,
                  borderTop: "1px solid var(--devengine-border)",
                }}
              >
                <span style={{ color: "var(--devengine-muted)" }}>Disbursement Mode:</span>
                <span style={{ fontWeight: 600, color: "#2cecf7" }}>
                  {formatPaymentMethod(salary?.paymentMethod)}
                </span>
              </div>
              {salary?.bankDetails ? (
                <div
                  style={{
                    fontSize: "0.8rem",
                    color: "var(--devengine-muted)",
                    overflowWrap: "anywhere",
                    marginTop: 2,
                  }}
                >
                  Account: <span style={{ color: "var(--devengine-text)" }}>{salary.bankDetails}</span>
                </div>
              ) : null}
            </div>
          </section>

          {/* Column 2: Tenure & Probation Management */}
          <section className={styles.agreementCard}>
            <h3>
              <EmployeeIcon>badge</EmployeeIcon>Tenure & Status
            </h3>
            <strong>{formatEmploymentType(staffData?.employmentType)}</strong>
            <p style={{ fontWeight: 600, color: "var(--devengine-text)" }}>
              Joining Date: {staffData?.joiningDate || agreement?.project?.agreementEffectiveDate || "Onboarding Date"}
            </p>

            <div
              style={{
                marginTop: 14,
                paddingTop: 12,
                borderTop: "1px dashed var(--devengine-border)",
                display: "grid",
                gap: 7,
                fontSize: "0.85rem",
              }}
            >
              {staffData?.employmentType === "probation" ? (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--devengine-muted)" }}>Probation Period:</span>
                    <span style={{ fontWeight: 600, color: "#f59e0b" }}>
                      {staffData.probationPeriodMonths || 3} Months
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--devengine-muted)" }}>Target End Date:</span>
                    <span style={{ fontWeight: 600, color: "#f59e0b" }}>
                      {staffData.probationEndDate || "Calculated by HR"}
                    </span>
                  </div>
                </>
              ) : (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--devengine-muted)" }}>Tenure Status:</span>
                  <span style={{ fontWeight: 600, color: "#10b981" }}>Confirmed Permanent</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--devengine-muted)" }}>Separation Notice:</span>
                <span style={{ fontWeight: 600 }}>
                  {salary?.noticePeriodDays || agreement?.terms?.terminationNoticeDays || 30} Days
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--devengine-muted)" }}>Department / Role:</span>
                <span style={{ fontWeight: 600, textTransform: "capitalize" }}>
                  {staffData?.designation || staffData?.staffType || "Engineering"}
                </span>
              </div>
            </div>
          </section>

          {/* Column 3: Working Schedule & Shift */}
          <section className={styles.agreementCard}>
            <h3>
              <EmployeeIcon>schedule</EmployeeIcon>Working Schedule
            </h3>
            <strong>
              {staffData?.shiftHours
                ? `${staffData.shiftHours.start} - ${staffData.shiftHours.end}`
                : "09:00 - 18:00"}
            </strong>
            <p style={{ fontWeight: 600, color: "var(--devengine-text)" }}>
              {staffData?.shiftHours?.name || "Standard Production Shift"} • 40 hrs/wk
            </p>

            <div
              style={{
                marginTop: 14,
                paddingTop: 12,
                borderTop: "1px dashed var(--devengine-border)",
                display: "grid",
                gap: 7,
                fontSize: "0.85rem",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--devengine-muted)" }}>Weekly Off-Days:</span>
                <span style={{ fontWeight: 600, color: "#2cecf7" }}>
                  {(staffData?.assignedOffDays || ["Friday", "Saturday"]).join(", ")}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--devengine-muted)" }}>Time Tracking:</span>
                <span style={{ fontWeight: 600 }}>Portal Attendance & Breaks</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--devengine-muted)" }}>Availability:</span>
                <span style={{ fontWeight: 600 }}>Full-Time Committed</span>
              </div>
            </div>
          </section>
        </div>

        {/* 3. Detailed Panels: Scope, Emergency Contact & Legal IP Clauses */}
        <div className={styles.agreementBody}>
          {/* Panel 1: Scope & Emergency Contact */}
          <section className={styles.panel} aria-labelledby="agreement-scope-title">
            <div className={styles.sectionHeading}>
              <h2 id="agreement-scope-title">Scope of Employment & Responsibilities</h2>
            </div>
            <p>
              {staffData?.name} is engaged to provide professional engineering, software design, code review, product architecture, testing, and technical maintenance under DevEngine Systems standards.
            </p>

            {/* Emergency Contact Block */}
            <div
              className={styles.note}
              style={{ borderLeft: "3px solid #2cecf7", marginTop: 8 }}
            >
              <h3 style={{ display: "flex", alignItems: "center", gap: 8, margin: "0 0 8px" }}>
                <EmployeeIcon>emergency</EmployeeIcon>Emergency Contact (HR File)
              </h3>
              {staffData?.emergencyContact?.name ? (
                <div style={{ display: "grid", gap: 5, fontSize: "0.92rem" }}>
                  <div>
                    <strong style={{ color: "var(--devengine-text)" }}>Contact Person:</strong>{" "}
                    {staffData.emergencyContact.name}{" "}
                    <span style={{ color: "var(--devengine-muted)" }}>
                      ({staffData.emergencyContact.relationship || "Contact"})
                    </span>
                  </div>
                  <div>
                    <strong style={{ color: "var(--devengine-text)" }}>Phone Number:</strong>{" "}
                    <a
                      href={`tel:${staffData.emergencyContact.phone}`}
                      style={{ color: "#2cecf7", textDecoration: "none", fontWeight: 600 }}
                    >
                      {staffData.emergencyContact.phone}
                    </a>
                  </div>
                </div>
              ) : (
                <p style={{ margin: 0, color: "var(--devengine-muted)", fontSize: "0.9rem" }}>
                  No emergency contact registered in HR file. Please inform administration if needed.
                </p>
              )}
            </div>

            {agreement?.deliverables && agreement.deliverables.length > 0 && (
              <div className={styles.stack} style={{ marginTop: 12 }}>
                <p className={styles.eyebrow}>Key Performance Deliverables</p>
                {agreement.deliverables.map((deliverable) => (
                  <div key={deliverable.id} className={styles.deliverable}>
                    <div>
                      <strong>{deliverable.title}</strong>
                      <EmployeeBadge tone={deliverable.priority}>
                        {deliverable.priority} Priority
                      </EmployeeBadge>
                    </div>
                    <p>{deliverable.description}</p>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Panel 2: Legal Clauses & Intellectual Property Summary */}
          <section className={styles.panel} aria-labelledby="agreement-legal-title">
            <div className={styles.sectionHeading}>
              <h2 id="agreement-legal-title">Legal Clauses & Intellectual Property Summary</h2>
            </div>
            <div className={styles.note}>
              <h3>1. Work Made for Hire & IP Assignment</h3>
              <p>
                All source code, designs, algorithms, architectures, documentation, and deliverables created during employment belong exclusively and perpetually to DevEngine Systems Inc.
              </p>
            </div>
            <div className={styles.note}>
              <h3>2. Strict Non-Disclosure (NDA)</h3>
              <p>
                Confidential business metrics, source code repositories, client data, security credentials, and proprietary systems must not be disclosed or shared with any third parties.
              </p>
            </div>
            <div className={styles.note}>
              <h3>3. Non-Solicitation</h3>
              <p>
                Employee agrees not to solicit DevEngine clients, partners, or team members for independent commercial endeavors for 2 years following separation.
              </p>
            </div>
            <div className={styles.note}>
              <h3>4. Payment Timelines & Disbursement</h3>
              <p>
                All compensations are processed via {formatPaymentMethod(salary?.paymentMethod)} within 7 business days of each monthly billing cycle to the registered account.
              </p>
            </div>
            <div className={styles.note}>
              <h3>5. Separation Notice Period</h3>
              <p>
                A minimum of {salary?.noticePeriodDays || 30} days prior written notice is required by either party prior to resignation or formal contract separation.
              </p>
            </div>
          </section>
        </div>

        {/* 4. Download Banner */}
        <div className={styles.downloadBanner}>
          <div>
            <h3>Official Signed Contract & Documentation</h3>
            <p>
              You can generate and download your publication-grade multi-page legal contract PDF with full clauses, compensation schedules, and official DevEngine seals at any time.
            </p>
          </div>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={handleDownloadPdf}
            disabled={isDownloadingPdf}
          >
            <EmployeeIcon>download</EmployeeIcon>
            {isDownloadingPdf ? "Preparing Contract…" : "Download PDF Contract"}
          </button>
        </div>
      </div>
    </StaffLayout>
  );
}
