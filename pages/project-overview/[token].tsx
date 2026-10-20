import { useEffect, useState } from "react";
import type { GetServerSideProps } from "next";
import Head from "next/head";
import { useRouter } from "next/router";
import ThemeToggle from "@/components/ThemeToggle";
import { getSharedProjectBrief, briefMoney, briefTotals, type SharedProjectBrief } from "@/lib/services/projectBriefService";
import s from "@/components/project-brief/ProjectBriefClient.module.css";

const SECTIONS = [
  ["overview", "Project overview"], ["objectives", "Goals & success criteria"], ["technology", "Technology & architecture"],
  ["deliveryPlan", "Delivery plan"], ["timeline", "Timeline"], ["deliverables", "Deliverables"],
  ["assumptions", "Assumptions & exclusions"], ["paymentTerms", "Payment terms"],
] as const;
const PERIODS = { one_time: "One-time", monthly: "Monthly", yearly: "Yearly" };
function externalUrl(value: string) { try { const url = new URL(value); return ["https:", "http:"].includes(url.protocol) ? url.href : undefined; } catch { return undefined; } }
export default function ClientProjectOverview() {
  const router = useRouter(); const [document, setDocument] = useState<SharedProjectBrief | null>(null);
  const [loading, setLoading] = useState(true); const [retry, setRetry] = useState(0); const [notice, setNotice] = useState(""); const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!router.isReady) return; let active = true;
    setLoading(true); setDocument(null); setNotice("");
    const token = typeof router.query.token === "string" ? router.query.token : "";
    getSharedProjectBrief(token).then(value => { if (active) setDocument(value); }).catch(error => {
      if (active && error?.code !== "permission-denied") setNotice("The project could not load. Check your connection and try again.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [router.isReady, router.query.token, retry]);
  async function download() {
    if (!document || busy) return; setBusy(true); setNotice("");
    try {
      // Re-read the link before export so disabled or removed proposals cannot be fetched again.
      const token = typeof router.query.token === "string" ? router.query.token : "";
      const latest = await getSharedProjectBrief(token);
      if (!latest) { setDocument(null); return; }
      const { generateProjectBriefPdf } = await import("@/lib/utils/generateProjectBriefPdf");
      const { pdf, filename } = await generateProjectBriefPdf(latest.brief, latest.publisher);
      pdf.save(filename); setDocument(latest);
    } catch (error) {
      if ((error as { code?: string }).code === "permission-denied") { setDocument(null); setNotice(""); }
      else setNotice(error instanceof Error ? error.message : "Could not download the PDF. Please try again.");
    } finally { setBusy(false); }
  }
  const brief = document?.brief, publisher = document?.publisher;
  const totals = brief ? briefTotals(brief) : null;
  const date = brief ? new Date(brief.updatedAt) : null;
  return <div className={s.page}>
    <Head><title>{brief ? `${brief.title} | DevEngine Project Overview` : "Project Overview | DevEngine"}</title><meta name="robots" content="noindex, nofollow, noarchive" /><meta name="referrer" content="no-referrer" /></Head>
    <header className={s.header}><div className={s.brand}><img src="/assets/DevEngine-logo-on-light1.png" className={s.lightLogo} alt="DevEngine" /><img src="/assets/DevEngine-logo-on-dark2.png" className={s.darkLogo} alt="DevEngine" /><span>Project overview</span></div><div className={s.actions}><ThemeToggle />{brief && <button className={s.primary} disabled={busy} onClick={download}><span className="material-symbols-outlined" aria-hidden="true">download</span>{busy ? "Preparing…" : "Download PDF"}</button>}</div></header>
    <main className={s.main}>
      {loading ? <section className={s.state} role="status"><span className="material-symbols-outlined" aria-hidden="true">description</span><h1>Opening your project overview…</h1></section> : brief && publisher && totals ? <>
        <section className={s.hero}><div><p className={s.eyebrow}>Project overview & budget</p><h1>{brief.title}</h1><p className={s.subtitle}>Prepared for <strong>{brief.client}</strong></p><div className={s.tags}><span>{brief.status === "draft" ? "Draft for discussion" : "Prepared overview"}</span>{date && !Number.isNaN(date.getTime()) && <span>Updated {date.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}</span>}<span>{brief.currency}</span></div></div><aside className={s.developer}><span>Prepared by</span><strong>{publisher.developerName}</strong><p>{publisher.developerTitle}</p><a href={`mailto:${publisher.developerEmail}`}>{publisher.developerEmail}</a>{externalUrl(publisher.developerWebsite) && <a href={externalUrl(publisher.developerWebsite)} target="_blank" rel="noopener noreferrer">Developer portfolio ↗</a>}</aside></section>
        {notice && <p className={s.notice} role="alert">{notice}</p>}
        <div className={s.layout}><article className={s.document}>{SECTIONS.filter(([key]) => brief[key]?.trim()).map(([key, title], index) => <section className={s.section} key={key}><div className={s.sectionHeading}><span>{String(index + 1).padStart(2, "0")}</span><h2>{title}</h2></div><p>{brief[key]}</p></section>)}</article><aside className={s.summary}><p className={s.eyebrow}>Estimated investment</p><div className={s.grandTotal}><span>First-year estimate</span><strong>{briefMoney(totals.firstYear, brief.currency)}</strong></div><dl><div><dt>One-time costs</dt><dd>{briefMoney(totals.oneTime, brief.currency)}</dd></div><div><dt>Monthly services</dt><dd>{briefMoney(totals.monthly, brief.currency)}</dd></div><div><dt>Annual services</dt><dd>{briefMoney(totals.yearly, brief.currency)}</dd></div></dl><p className={s.note}>Includes one-time costs, 12 months of monthly services and annual services. Confirm taxes and third-party prices before approval.</p><button className={s.primary} disabled={busy} onClick={download}>{busy ? "Preparing PDF…" : "Download full proposal"}</button><p className={s.note}>An initial estimate for discussion. A signed agreement confirms the final scope and commitment.</p></aside></div>
        <section className={s.budget}><div className={s.sectionHeading}><span className="material-symbols-outlined" aria-hidden="true">receipt_long</span><h2>Budget breakdown</h2></div><div className={s.tableWrap}><table><thead><tr><th>Cost item</th><th>Quantity</th><th>Unit cost</th><th>Billing</th><th>Estimate</th></tr></thead><tbody>{brief.costs.map(item => <tr key={item.id}><td>{item.title}</td><td>{item.quantity}</td><td>{briefMoney(item.amount, brief.currency)}</td><td>{PERIODS[item.period]}</td><td>{briefMoney(item.amount * item.quantity, brief.currency)}</td></tr>)}</tbody></table></div></section>
        <footer className={s.footer}><div><strong>{publisher.companyName}</strong><p>{publisher.companyAddress}</p><a href={`mailto:${publisher.companyEmail}`}>{publisher.companyEmail}</a></div><div>{externalUrl(publisher.companyWebsite) && <a href={externalUrl(publisher.companyWebsite)} target="_blank" rel="noopener noreferrer">Company website ↗</a>}<span>Project planning · DevEngine</span></div></footer>
      </> : <section className={s.state}><span className="material-symbols-outlined" aria-hidden="true">link_off</span><h1>{notice ? "Unable to open this project" : "This project link is unavailable."}</h1><p>{notice || "The link may have been disabled or the project removed. Please ask your developer for an updated link."}</p><button className={s.button} onClick={() => setRetry(value => value + 1)}>Try again</button></section>}
    </main>
  </div>;
}
export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Cache-Control", "private, no-store");
  return { props: {} };
};
