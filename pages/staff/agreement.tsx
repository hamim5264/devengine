import Head from "next/head";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getStaffByUid } from "@/lib/services/staffService";
import { getAgreementForStaff } from "@/lib/services/agreementService";
import { generateAgreementPdf } from "@/lib/utils/generateAgreementPdf";
import StaffLayout from "@/components/StaffLayout";
import { EmployeeHeading, EmployeeIcon, EmployeeBadge, EmployeeEmpty, EmployeeLoading } from "@/components/staff/EmployeeUI";
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
        const agr = await getAgreementForStaff({
          agreementId: staff.agreementId,
          staffId: staff.id,
          staffEmail: staff.email,
        });
        setAgreement(agr);
      } catch (err) {
        console.error("Failed to load staff agreement:", err);
      } finally {
        setLoading(false);
        setAuthReady(true);
      }
    });
    return () => unsub();
  }, [router]);

  const handleDownloadPdf = async () => {
    if (!agreement) return;
    setIsDownloadingPdf(true);
    try {
      await generateAgreementPdf(agreement, { download: true });
    } catch (err) {
      console.error("Failed to generate agreement PDF:", err);
      alert("Failed to generate PDF. Please try again or contact administration.");
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  if (!authReady || loading) return <EmployeeLoading />;

  return (
    <StaffLayout title="Employment Agreement | DevEngine Portal">
      <Head><title>Employment Agreement | DevEngine Portal</title></Head>
      <div className={styles.page}>
        <EmployeeHeading eyebrow="The foundation of working together" icon="gavel" title="Employment Agreement & Contract"
          description="Your official contract, compensation details, and employment terms, clearly organized in one place."
          actions={agreement ? <button type="button" className={styles.primaryButton} onClick={handleDownloadPdf} disabled={isDownloadingPdf}><EmployeeIcon>download</EmployeeIcon>{isDownloadingPdf ? "Preparing Contract…" : "Download Official PDF"}</button> : undefined} />

        {!agreement ? <>
          <EmployeeEmpty icon="description" title="Agreement Under Preparation"
            description="Your official employment agreement is currently being finalized by the DevEngine HR & legal department. Once executed, your full terms, compensation schedule, and signed legal contract will appear here.">
            <div className={styles.actions}><EmployeeBadge tone="pending">Awaiting agreement</EmployeeBadge><a className={styles.secondaryButton} href="mailto:hamim.leon@gmail.com"><EmployeeIcon>mail</EmployeeIcon>Contact HR</a></div>
            <a className={styles.link} href="mailto:hamim.leon@gmail.com">hamim.leon@gmail.com</a>
          </EmployeeEmpty>
          <div className={styles.schedule} aria-label="Agreement sections available once prepared">
            <div><p><EmployeeIcon>payments</EmployeeIcon>Compensation details</p><strong>Payment terms & schedule</strong></div>
            <div><p><EmployeeIcon>checklist</EmployeeIcon>Responsibilities</p><strong>Scope & deliverables</strong></div>
            <div><p><EmployeeIcon>verified</EmployeeIcon>Official document</p><strong>Your signed contract</strong></div>
          </div>
        </> : <>
          <section className={`${styles.panel} ${styles.agreementSummary}`} aria-labelledby="contract-summary-title">
            <div>
              <div className={styles.badgeRow}><EmployeeBadge tone="accent">{AGREEMENT_STATUS_LABELS[agreement.status] || agreement.status}</EmployeeBadge><EmployeeBadge>Ref: {agreement.agreementNumber}</EmployeeBadge><EmployeeBadge>v{agreement.version || 1}.0</EmployeeBadge></div>
              <h2 id="contract-summary-title">{agreement.agreementTypeLabel || AGREEMENT_TYPE_LABELS[agreement.agreementType]}</h2>
              <p>Executed between DevEngine Systems and {agreement.developer?.fullName || (agreement as any).contributor?.contributorName || staffData?.name}</p>
            </div>
            <dl className={styles.details}>
              <div><dt>Effective date</dt><dd>{agreement.project?.agreementEffectiveDate || "N/A"}</dd></div>
              {agreement.project?.expectedCompletionDate && <div><dt>End date</dt><dd>{agreement.project.expectedCompletionDate}</dd></div>}
              <div><dt>Jurisdiction</dt><dd>{agreement.terms?.jurisdiction || "Dhaka, Bangladesh"}</dd></div>
            </dl>
          </section>

          <div className={styles.agreementGrid}>
            <section className={styles.agreementCard}>
              <h3><EmployeeIcon>payments</EmployeeIcon>Compensation</h3>
              <strong>{agreement.compensation?.currency === "BDT" ? "৳" : "$"}{(agreement.compensation?.monthlyRetainerAmount || agreement.compensation?.fixedAmount || agreement.compensation?.totalContractValue || 0).toLocaleString()}</strong>
              <p>{agreement.compensation?.paymentFrequency || "Monthly Retainer"} • Currency: {agreement.compensation?.currency || "BDT"}</p>
              {agreement.compensation?.hourlyRate ? <p>Hourly Rate: {agreement.compensation.currency === "BDT" ? "৳" : "$"}{agreement.compensation.hourlyRate}/hr</p> : null}
            </section>
            <section className={styles.agreementCard}>
              <h3><EmployeeIcon>schedule</EmployeeIcon>Working schedule</h3>
              <strong>{staffData?.shiftHours ? `${staffData.shiftHours.start} - ${staffData.shiftHours.end}` : "Standard Shift (09:00 - 18:00)"}</strong>
              <p>Availability: {agreement.compensation?.availabilityHoursPerWeek || 40} hrs/week</p>
              <p>Scheduled Off-Days: {(staffData?.assignedOffDays || ["Friday", "Saturday"]).join(", ")}</p>
            </section>
            <section className={styles.agreementCard}>
              <h3><EmployeeIcon>verified</EmployeeIcon>Contract term</h3>
              <strong>{agreement.terms?.terminationNoticeDays ? `${agreement.terms.terminationNoticeDays} Days Notice` : "30 Days Notice"}</strong>
              <p>Mutual written termination with full prorated payout</p><p>IP Protection: Full Work-for-Hire Assignment</p>
            </section>
          </div>

          <div className={styles.agreementBody}>
            <section className={styles.panel} aria-labelledby="agreement-scope-title">
              <div className={styles.sectionHeading}><h2 id="agreement-scope-title">Scope of Services & Position Responsibilities</h2></div>
              <p>{agreement.project?.description || "Contributor is engaged to provide professional engineering, software design, code review, product deployment, and technical maintenance under DevEngine standards."}</p>
              {agreement.deliverables && agreement.deliverables.length > 0 && <div className={styles.stack}>
                <p className={styles.eyebrow}>Key Performance Deliverables</p>
                {agreement.deliverables.map((deliverable) => <div key={deliverable.id} className={styles.deliverable}><div><strong>{deliverable.title}</strong><EmployeeBadge tone={deliverable.priority}>{deliverable.priority} Priority</EmployeeBadge></div><p>{deliverable.description}</p></div>)}
              </div>}
            </section>
            <section className={styles.panel} aria-labelledby="agreement-legal-title">
              <div className={styles.sectionHeading}><h2 id="agreement-legal-title">Legal Clauses & Intellectual Property Summary</h2></div>
              <div className={styles.note}><h3>1. Work Made for Hire & IP Assignment</h3><p>All source code, designs, algorithms, architectures, and deliverables created during the term belong exclusively to DevEngine Systems.</p></div>
              <div className={styles.note}><h3>2. Strict Non-Disclosure (NDA)</h3><p>Confidential business metrics, source repos, client data, and proprietary frameworks must not be disclosed or leaked to any third parties.</p></div>
              <div className={styles.note}><h3>3. Non-Solicitation</h3><p>Contributor agrees not to solicit company clients or personnel for independent commercial endeavors for {agreement.terms?.nonSolicitationYears || 2} years following termination.</p></div>
              <div className={styles.note}><h3>4. Payment Timelines</h3><p>All compensations are processed within {agreement.compensation?.paymentDuePeriodDays || 7} business days of the designated payment cycle.</p></div>
            </section>
          </div>
          <div className={styles.downloadBanner}>
            <div><h3>Need a Signed Hard Copy or PDF?</h3><p>You can download the publication-grade multi-page legal contract PDF at any time.</p></div>
            <button type="button" className={styles.primaryButton} onClick={handleDownloadPdf} disabled={isDownloadingPdf}><EmployeeIcon>download</EmployeeIcon>{isDownloadingPdf ? "Preparing Contract…" : "Download PDF Contract"}</button>
          </div>
        </>}
      </div>
    </StaffLayout>
  );
}
