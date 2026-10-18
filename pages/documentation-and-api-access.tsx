import { useState } from "react";
import DocumentPage, { CopyControl, DocumentIcon, documentSearchText, type DocumentSection } from "@/components/features/DocumentPage";
import { useDocumentConfig } from "@/hooks/useDocumentConfig";
import { getDocumentationConfig, DEFAULT_DOCUMENTATION_CONFIG } from "@/lib/services/documentationService";
import type { DocGuideItem } from "@/types/documentation";
import styles from "@/components/features/Documents.module.css";

function GuideCollection({ guides }: { guides: DocGuideItem[] }) {
  const [query, setQuery] = useState("");
  const filtered = guides.filter((guide) => documentSearchText([guide.title, guide.description, guide.tag]).toLowerCase().includes(query.trim().toLowerCase()));
  return <><div className={styles.guideToolbar}><label className={styles.guideSearch}><span className={styles.srOnly}>Search documentation guides</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search guides…" /></label><span role="status">{filtered.length} guide{filtered.length === 1 ? "" : "s"}</span></div>{filtered.length ? <div className={styles.cards}>{filtered.map((guide) => <div key={guide.id} className={`${styles.card} ${styles.guideCard}`}><span className={styles.iconTile}><DocumentIcon name={guide.icon || "menu_book"} /></span><span className={styles.tag}>{guide.tag}</span><h3>{guide.title}</h3><p>{guide.description}</p></div>)}</div> : <div className={styles.empty}><p>No guides match this search.</p><button type="button" className={styles.secondaryButton} onClick={() => setQuery("")}>Show all guides</button></div>}</>;
}

export default function DocumentationAndApiAccessPage() {
  const config = useDocumentConfig("documentation", DEFAULT_DOCUMENTATION_CONFIG, getDocumentationConfig);
  const api = config.apiAccess;
  const sections: DocumentSection[] = [
    { id: "quickstart", number: "01", title: config.quickStart.title, searchText: documentSearchText(config.quickStart), content: <div className={styles.codeBlock}><div className={styles.codeHeader}><span>{config.quickStart.terminalLabel}</span><CopyControl value={config.quickStart.codeSnippet} label="Copy code" /></div><pre tabIndex={0} aria-label={config.quickStart.terminalLabel}><code>{config.quickStart.codeSnippet}</code></pre></div> },
    { id: "guides", number: "02", title: config.guides.title, searchText: documentSearchText(config.guides), content: <GuideCollection guides={config.guides.guides} /> },
    { id: "api-access", number: "03", title: api.sectionTitle, searchText: documentSearchText(api), paragraphs: [api.description], content: <><div className={styles.metadata}><span>REST &amp; GraphQL</span><span>{api.rateLimit}</span></div><dl className={styles.specs}><div><dt>BASE URL</dt><dd><code>{api.baseUrl}</code><CopyControl value={api.baseUrl} label="Copy URL" /></dd></div><div><dt>AUTH HEADER</dt><dd><code>{api.authHeader}</code><CopyControl value={api.authHeader} label="Copy header" /></dd></div></dl><h3>Featured Endpoints</h3>{[{ method: api.endpoint1Method, path: api.endpoint1Path, description: api.endpoint1Desc }, { method: api.endpoint2Method, path: api.endpoint2Path, description: api.endpoint2Desc }].map((endpoint, index) => <div className={styles.endpoint} key={index}><div><span className={styles.tag}>{endpoint.method}</span><code>{endpoint.path}</code></div><p>{endpoint.description}</p></div>)}</> },
  ];
  return <DocumentPage title={`${config.header.title} ${config.header.titleHighlight}`.trim()} subtitle={config.header.subtitle} badge={config.header.releaseBadge} metadata={[`Last Updated: ${config.header.lastUpdated}`]} icon="menu_book" sections={sections} footer={<a href="https://github.com/hamim5264" target="_blank" rel="noopener noreferrer" className={styles.secondaryButton}>Contribute on GitHub <DocumentIcon name="north_east" /></a>} />;
}
