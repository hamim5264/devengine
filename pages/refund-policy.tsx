import Link from "next/link";
import DocumentPage, { DocumentCallout, DocumentIcon } from "@/components/features/DocumentPage";
import { useDocumentConfig } from "@/hooks/useDocumentConfig";
import { getRefundConfig, DEFAULT_REFUND_CONFIG } from "@/lib/services/refundService";
import styles from "@/components/features/Documents.module.css";

export default function RefundPolicyPage() {
  const config = useDocumentConfig("refund", DEFAULT_REFUND_CONFIG, getRefundConfig);
  return <DocumentPage title={config.header.title} subtitle={config.header.subtitle} badge={config.header.badgeText} icon="policy" metadata={[config.header.strictBadge, `Status: ${config.header.policyStatus}`, `Last Revised: ${config.header.lastUpdated}`]} sections={[config.corePolicy, config.digitalGoodsRationale, config.verificationAudit, config.disputeResolution, config.exceptionsNotice, config.contactSupport]} notice={<DocumentCallout title="Important Financial Notice Before Payment Submission" icon="info"><p>Digital architecture source code, repository invitations, and software licenses are non-tangible, irrevocable assets. Once verified and provisioned, purchases are strictly non-refundable. Please confirm all technical requirements prior to sending payment.</p></DocumentCallout>} footer={<><DocumentCallout title="Cross-Reference: Commercial License Agreement" icon="description"><p>Learn more about your commercial usage rights, permitted production deployments, source code access, and intellectual property terms.</p><Link href="/commercial-license" className={styles.secondaryButton}>Read Commercial License Agreement <DocumentIcon name="arrow_forward" /></Link></DocumentCallout><DocumentCallout title="Need Pre-Purchase Support?" icon="support_agent"><p>Reach our engineering team directly via WhatsApp (+880 1724879284) for project architecture consultations.</p></DocumentCallout></>} />;
}
