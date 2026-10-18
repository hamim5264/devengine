import Link from "next/link";
import DocumentPage, { DocumentCallout, DocumentIcon } from "@/components/features/DocumentPage";
import { useDocumentConfig } from "@/hooks/useDocumentConfig";
import { getLicenseConfig, DEFAULT_LICENSE_CONFIG } from "@/lib/services/licenseService";
import styles from "@/components/features/Documents.module.css";

export default function CommercialLicensePage() {
  const config = useDocumentConfig("license", DEFAULT_LICENSE_CONFIG, getLicenseConfig);
  return <DocumentPage title={config.header.title} subtitle={config.header.subtitle} badge={config.header.badgeText} icon="gavel" metadata={[`Last updated: ${config.header.lastUpdated}`, config.header.statusText, config.header.version]} sections={[config.grantOfLicense, config.permittedUses, config.restrictions, config.sourceCodeRights, config.intellectualProperty, config.warrantiesAndLiability, config.termination, config.auditAndCompliance]} footer={<DocumentCallout title="Cross-Reference: Strict No Return / No Refund Policy" icon="policy"><p>All digital software licenses, architecture blueprints, and source repositories delivered under this agreement are governed by the DevEngine Strict No-Return Policy. Digital goods cannot be refunded once delivered.</p><Link className={styles.secondaryButton} href="/refund-policy">Read Strict No Return &amp; Refund Policy <DocumentIcon name="arrow_forward" /></Link></DocumentCallout>} />;
}
