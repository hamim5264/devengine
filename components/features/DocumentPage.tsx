import { useEffect, useId, useRef, useState, type ReactNode, type MouseEvent } from "react";
import Head from "next/head";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/router";
import { useTheme } from "@/context/ThemeContext";
import HeaderControls from "@/components/HeaderControls";
import LandingFooter from "@/components/landing/LandingFooter";
import styles from "./Documents.module.css";

export interface DocumentSection {
  id: string;
  number?: string;
  title: string;
  paragraphs?: string[];
  bullets?: string[];
  content?: ReactNode;
  searchText?: string;
}

const RESOURCES = [
  { href: "/commercial-license", label: "Commercial License Agreement" },
  { href: "/refund-policy", label: "No-Return & Refund Policy" },
  { href: "/privacy-policy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms & Conditions" },
  { href: "/security-protocol", label: "Security Protocol" },
  { href: "/documentation-and-api-access", label: "Documentation & API Access" },
];

export function DocumentIcon({ name }: { name: string }) {
  return <span className="material-symbols-outlined" aria-hidden="true">{name}</span>;
}

/** Index the same CMS strings rendered in rich sections, without hiding their contents. */
export function documentSearchText(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(documentSearchText).join(" ");
  if (value && typeof value === "object") return Object.values(value).map(documentSearchText).join(" ");
  return "";
}

export function CopyControl({ value, label = "Copy", link = false }: { value: string; label?: string; link?: boolean }) {
  const [status, setStatus] = useState<"idle" | "copied" | "manual">("idle");
  const [manualValue, setManualValue] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputId = useId();
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const copy = async () => {
    const content = link ? `${window.location.origin}${window.location.pathname}#${encodeURIComponent(value)}` : value;
    try {
      await navigator.clipboard.writeText(content);
      setStatus("copied");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setStatus("idle"), 2500);
    } catch { setManualValue(content); setStatus("manual"); }
  };
  return <div className={styles.copyControl}><button type="button" className={styles.copyButton} onClick={copy} aria-label={status === "copied" ? "Copied" : label}><DocumentIcon name={status === "copied" ? "check" : link ? "link" : "content_copy"} /><span>{status === "copied" ? "Copied" : link ? "Link" : label}</span></button><span role="status" className={styles.srOnly}>{status === "copied" ? "Copied to clipboard." : ""}</span>{status === "manual" && <div className={styles.copyFallback}><label htmlFor={inputId}>Select and copy:</label><textarea id={inputId} readOnly rows={2} value={manualValue} onFocus={(event) => event.currentTarget.select()} /><button type="button" className={styles.textButton} onClick={() => setStatus("idle")}>Close</button></div>}</div>;
}

export function DocumentCallout({ title, children, icon = "info" }: { title: string; children: ReactNode; icon?: string }) {
  return <div className={styles.callout}><DocumentIcon name={icon} /><div><h3>{title}</h3><div className={styles.prose}>{children}</div></div></div>;
}

export default function DocumentPage({ title, subtitle, badge, metadata = [], sections, notice, footer, icon = "description" }: { title: string; subtitle: string; badge: string; metadata?: string[]; sections: DocumentSection[]; notice?: ReactNode; footer?: ReactNode; icon?: string }) {
  const { theme } = useTheme();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(sections[0]?.id || "");
  const progress = useRef<HTMLDivElement>(null);
  const main = useRef<HTMLElement>(null);
  const topButton = useRef<HTMLButtonElement>(null);
  const mobileContents = useRef<HTMLDetailsElement>(null);
  const searchId = useId();
  const normalized = query.toLowerCase().trim();
  const visible = sections.filter((section) => !normalized || `${section.number || ""} ${section.title} ${(section.paragraphs || []).join(" ")} ${(section.bullets || []).join(" ")} ${section.searchText || ""}`.toLowerCase().includes(normalized));
  const sectionIds = visible.map((section) => section.id).join("|");

  useEffect(() => {
    const container = main.current;
    if (!container) return;
    let frame = 0;
    const paint = () => {
      frame = 0;
      const bounds = container.getBoundingClientRect();
      const distance = Math.max(1, bounds.height - window.innerHeight + 80);
      const amount = Math.min(1, Math.max(0, (80 - bounds.top) / distance));
      if (progress.current) progress.current.style.transform = `scaleX(${amount})`;
      if (topButton.current) topButton.current.hidden = window.scrollY < 500;
    };
    const schedule = () => { if (!frame) frame = window.requestAnimationFrame(paint); };
    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    const resize = new ResizeObserver(schedule);
    resize.observe(container);
    return () => { window.removeEventListener("scroll", schedule); window.removeEventListener("resize", schedule); resize.disconnect(); window.cancelAnimationFrame(frame); };
  }, []);

  useEffect(() => {
    const ids = sectionIds.split("|").filter(Boolean);
    const observer = new IntersectionObserver((entries) => {
      const entered = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (entered[0]) setActive(entered[0].target.id);
    }, { rootMargin: "-100px 0px -50% 0px", threshold: 0 });
    ids.forEach((id) => { const section = document.getElementById(id); if (section) observer.observe(section); });
    return () => observer.disconnect();
  }, [sectionIds]);

  const navigate = (event: MouseEvent<HTMLAnchorElement>, id: string) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const target = document.getElementById(id);
    if (!target) return;
    event.preventDefault();
    if (mobileContents.current) mobileContents.current.open = false;
    target.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    setActive(id);
    window.history.replaceState(null, "", `#${encodeURIComponent(id)}`);
  };
  const contents = <nav className={styles.contentsNav} aria-label="Document sections">{visible.map((section, index) => <a key={section.id} href={`#${encodeURIComponent(section.id)}`} onClick={(event) => navigate(event, section.id)} aria-current={active === section.id ? "location" : undefined}><span>{section.number || String(index + 1).padStart(2, "0")}</span><span>{section.title}</span></a>)}</nav>;

  return <div className={styles.page}>
    <Head><title>{title} | DevEngine</title><meta name="description" content={subtitle} /></Head>
    <div ref={progress} className={styles.progress} aria-hidden="true" />
    <a className={styles.skipLink} href="#document-content">Skip to document</a>
    <header className={styles.documentHeader}><div className={styles.headerInner}><Link href="/home" aria-label="DevEngine home" className={styles.logo}><Image src={theme === "light" ? "/assets/DevEngine-logo-on-light1.png" : "/assets/DevEngine-logo-on-dark2.png"} alt="DevEngine" width={2400} height={600} priority /></Link><div className={styles.headerActions}><HeaderControls /><Link href="/home" className={styles.secondaryButton}><DocumentIcon name="west" /><span>Home</span></Link></div></div></header>
    <main ref={main} className={styles.main}>
      <div className={styles.hero}><span className={styles.eyebrow}><DocumentIcon name={icon} />{badge}</span><h1>{title}</h1><p>{subtitle}</p>{metadata.length > 0 && <div className={styles.metadata}>{metadata.filter(Boolean).map((item, index) => <span key={index}>{item}</span>)}</div>}{notice}</div>
      <div className={styles.searchRow}><div className={styles.search}><label className={styles.srOnly} htmlFor={searchId}>Search this document</label><DocumentIcon name="search" /><input id={searchId} type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search this document…" />{query && <button type="button" onClick={() => setQuery("")} aria-label="Clear document search"><DocumentIcon name="close" /></button>}</div><span role="status">{normalized ? `${visible.length} of ${sections.length} sections match` : `${sections.length} sections`}</span></div>
      <div className={styles.layout}><div className={styles.sidebar}><div className={styles.desktopContents}><h2>On this page</h2>{contents}</div><details ref={mobileContents} className={styles.mobileContents}><summary>On this page <DocumentIcon name="expand_more" /></summary>{contents}</details><nav className={styles.resourceNav} aria-label="Policies and resources"><h2>Policies & resources</h2>{RESOURCES.map((resource) => <Link key={resource.href} href={resource.href} aria-current={router.pathname === resource.href ? "page" : undefined}>{resource.label}<DocumentIcon name="north_east" /></Link>)}</nav></div>
        <article id="document-content" className={styles.content} tabIndex={-1}>{visible.length ? visible.map((section) => <section key={section.id} id={section.id} className={styles.section}><div className={styles.sectionHeader}><div><span className={styles.sectionNumber}>{section.number || String(sections.indexOf(section) + 1).padStart(2, "0")}</span><h2>{section.title}</h2></div><CopyControl value={section.id} label={`Link to ${section.title}`} link /></div><div className={styles.prose}>{section.paragraphs?.map((paragraph, index) => <p key={index}>{paragraph}</p>)}{section.bullets && section.bullets.length > 0 && <ul>{section.bullets.map((bullet, index) => <li key={index}>{bullet}</li>)}</ul>}{section.content}</div></section>) : <div className={styles.empty}><DocumentIcon name="search_off" /><h2>No matching sections.</h2><p>Try a different word, or show the full document.</p><button type="button" className={styles.button} onClick={() => setQuery("")}>Show all sections</button></div>}{footer && <div className={styles.documentFooter}>{footer}</div>}<button className={styles.textButton} type="button" onClick={() => window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" })}><DocumentIcon name="north" />Back to top</button></article>
      </div>
    </main>
    <LandingFooter />
    <button ref={topButton} hidden type="button" className={styles.toTop} aria-label="Back to top" onClick={() => window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" })}><DocumentIcon name="north" /></button>
  </div>;
}
