import DocumentPage, { DocumentIcon, documentSearchText, type DocumentSection } from "@/components/features/DocumentPage";
import { useDocumentConfig } from "@/hooks/useDocumentConfig";
import { getTermsConfig, DEFAULT_TERMS_CONFIG } from "@/lib/services/termsService";
import styles from "@/components/features/Documents.module.css";

export default function TermsPage() {
  const config = useDocumentConfig("terms", DEFAULT_TERMS_CONFIG, getTermsConfig);
  const sections: DocumentSection[] = [
    { ...config.agreement, id: "agreement" }, { ...config.eligibility, id: "eligibility" }, { ...config.accounts, id: "accounts" },
    { id: "software-purchases", number: "04", title: config.lifecycle.title, searchText: documentSearchText(config.lifecycle), paragraphs: [config.lifecycle.description], content: <ol className={styles.flow}>{config.lifecycle.steps.map((step) => <li className={styles.flowNode} key={step.id}><DocumentIcon name={step.icon} /><strong>{step.title}</strong></li>)}</ol> },
    { id: "custom-dev", number: "05", title: config.paymentStructure.title, searchText: documentSearchText(config.paymentStructure), content: <div className={styles.phaseList}>{config.paymentStructure.phases.map((phase, index) => <div key={index} className={styles.phase}><div><span className={styles.phaseLabel}>Phase</span><h3>{phase.phase}</h3></div><div><span className={styles.phaseLabel}>Description</span><p>{phase.description}</p></div><div><span className={styles.phaseLabel}>Obligation</span><strong>{phase.obligation}</strong></div></div>)}</div> },
    { id: "ip", number: "06", title: config.intellectualProperty.title, searchText: documentSearchText(config.intellectualProperty), content: <div className={styles.cards}><div className={styles.card}><span className={styles.iconTile}><DocumentIcon name="dns" /></span><h3>DEVENGINE OWNED</h3><ul>{config.intellectualProperty.devEngineOwned.map((item, index) => <li key={index}>{item}</li>)}</ul></div><div className={styles.card}><span className={styles.iconTile}><DocumentIcon name="key" /></span><h3>CLIENT OWNED</h3><ul>{config.intellectualProperty.clientOwned.map((item, index) => <li key={index}>{item}</li>)}</ul></div></div> },
  ];
  return <DocumentPage title={config.header.title} subtitle={config.header.subtitle} badge={config.header.badgeText} icon="contract" metadata={[`Last Updated: ${config.header.lastUpdated}`, config.header.statusText]} sections={sections} />;
}
