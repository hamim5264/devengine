import DocumentPage, { DocumentCallout, DocumentIcon, documentSearchText, type DocumentSection } from "@/components/features/DocumentPage";
import { useDocumentConfig } from "@/hooks/useDocumentConfig";
import { getPrivacyConfig, DEFAULT_PRIVACY_CONFIG } from "@/lib/services/privacyService";
import styles from "@/components/features/Documents.module.css";

export default function PrivacyPolicyPage() {
  const config = useDocumentConfig("privacy", DEFAULT_PRIVACY_CONFIG, getPrivacyConfig);
  const sections: DocumentSection[] = [
    { id: "section-1", number: config.overview.sectionNum, title: config.overview.sectionTitle, searchText: documentSearchText(config.overview), paragraphs: [config.overview.leadText, config.overview.subText], content: <DocumentCallout title={config.overview.keyPrincipleTitle}><p>{config.overview.keyPrincipleText}</p></DocumentCallout> },
    { id: "section-2", number: config.informationCollected.sectionNum, title: config.informationCollected.sectionTitle, searchText: documentSearchText(config.informationCollected), content: <><h3>Information You Provide to Us</h3><p>{config.informationCollected.providedIntro}</p><div className={styles.cards}>{config.informationCollected.providedItems.map((item) => <div className={styles.card} key={item.id}><h3>{item.title}</h3><p>{item.description}</p></div>)}</div><h3>{config.informationCollected.autoTitle}</h3><p>{config.informationCollected.autoText}</p></> },
    { id: "section-3", number: config.dataFlow.sectionNum, title: config.dataFlow.sectionTitle, searchText: documentSearchText(config.dataFlow), paragraphs: [config.dataFlow.introText], content: <div className={styles.flow}>{[{ title: config.dataFlow.node1Label, description: config.dataFlow.node1Sub, icon: "person" }, { title: config.dataFlow.node2Label, description: config.dataFlow.node2Sub, icon: "dns" }, { title: config.dataFlow.node3Label, description: config.dataFlow.node3Sub, icon: "verified_user" }].map((node, index) => <div className={styles.flowNode} key={index}><DocumentIcon name={node.icon} /><strong>{node.title}</strong><span>{node.description}</span></div>)}</div> },
    { id: "section-4", number: config.cookies.sectionNum, title: config.cookies.sectionTitle, paragraphs: [config.cookies.paragraph1, config.cookies.paragraph2] },
    { id: "section-5", number: config.userRights.sectionNum, title: config.userRights.sectionTitle, searchText: documentSearchText(config.userRights), paragraphs: [config.userRights.introText], content: <div className={styles.cards}>{config.userRights.rights.map((right) => <div className={styles.card} key={right.id}><h3>{right.title}</h3><p>{right.description}</p></div>)}</div> },
  ];
  return <DocumentPage title={config.header.title} subtitle={config.header.subtitle} badge={config.header.badgeText} icon="privacy_tip" metadata={[config.header.lastUpdated]} sections={sections} />;
}
