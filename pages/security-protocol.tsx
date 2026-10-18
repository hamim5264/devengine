import DocumentPage, { DocumentCallout, DocumentIcon, documentSearchText, type DocumentSection } from "@/components/features/DocumentPage";
import { useDocumentConfig } from "@/hooks/useDocumentConfig";
import { getSecurityConfig, DEFAULT_SECURITY_CONFIG } from "@/lib/services/securityService";
import styles from "@/components/features/Documents.module.css";

export default function SecurityProtocolPage() {
  const config = useDocumentConfig("security", DEFAULT_SECURITY_CONFIG, getSecurityConfig);
  const encryption = config.encryption;
  const infrastructure = config.infrastructure;
  const access = config.accessControl;
  const sections: DocumentSection[] = [
    { id: "encryption", number: "01", title: encryption.title, searchText: documentSearchText(encryption), paragraphs: [encryption.description], bullets: [encryption.bullet1, encryption.bullet2, encryption.bullet3], content: <><div className={styles.flow}>{[{ title: encryption.node1Title, description: encryption.node1Desc, badge: encryption.node1Badge, icon: "devices" }, { title: encryption.node2Title, description: encryption.node2Desc, badge: encryption.node2Badge, icon: "encrypted" }].map((node, index) => <div className={styles.flowNode} key={index}><DocumentIcon name={node.icon} /><strong>{node.title}</strong><span>{node.description}</span><span className={styles.tag}>{node.badge}</span></div>)}</div><DocumentCallout title={encryption.diagramTitle} icon="lock"><p>{encryption.diagramDesc}</p></DocumentCallout></> },
    { id: "infrastructure", number: "02", title: infrastructure.title, searchText: documentSearchText(infrastructure), paragraphs: [infrastructure.description], content: <div className={styles.rows}>{[{ region: infrastructure.cluster1Region, badge: infrastructure.cluster1Badge }, { region: infrastructure.cluster2Region, badge: infrastructure.cluster2Badge }, { region: infrastructure.cluster3Region, badge: infrastructure.cluster3Badge }].map((cluster, index) => <div className={styles.row} key={index}><strong>{cluster.region}</strong><span className={styles.tag}>{cluster.badge}</span></div>)}</div> },
    { id: "access-control", number: "03", title: access.title, searchText: documentSearchText(access), paragraphs: [access.description], content: <div className={styles.cards}><div className={styles.card}><span className={styles.iconTile}><DocumentIcon name="key" /></span><h3>{access.method1Title}</h3><p>{access.method1Desc}</p></div><div className={styles.card}><span className={styles.iconTile}><DocumentIcon name="fingerprint" /></span><h3>{access.method2Title}</h3><p>{access.method2Desc}</p></div></div> },
  ];
  return <DocumentPage title={config.header.title} subtitle={config.header.subtitle} badge={config.header.statusBadge} icon="verified_user" sections={sections} />;
}
