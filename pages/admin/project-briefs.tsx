import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import AdminLayout from "@/components/AdminLayout";
import { EmployeeDialog, EmployeeIcon } from "@/components/staff/EmployeeUI";
import { AdminSelect } from "@/components/admin/AdminFormControls";
import { onAdminPageAccess } from "@/lib/services/staffAuth";
import { useAdminProfile } from "@/lib/services/adminProfileService";
import { blankBrief, briefMoney, briefTotals, getProjectBriefs, saveProjectBrief, deleteProjectBrief, getProjectBriefPublisher, publishProjectBrief, revokeProjectBriefShare, type ProjectBrief, type BriefCost } from "@/lib/services/projectBriefService";
import s from "@/components/admin/AdminWorkspace.module.css";

const SECTIONS: { key: "overview" | "objectives" | "technology" | "deliveryPlan" | "timeline" | "deliverables" | "assumptions" | "paymentTerms"; label: string; hint: string }[] = [
  { key: "overview", label: "Project overview", hint: "The client’s idea and the problem to solve" },
  { key: "objectives", label: "Goals & success criteria", hint: "What a successful delivery looks like" },
  { key: "technology", label: "Technology & architecture", hint: "Frontend, backend, database and integrations" },
  { key: "deliveryPlan", label: "Delivery plan", hint: "Discovery, design, development and launch" },
  { key: "timeline", label: "Timeline", hint: "Phases and expected delivery dates" },
  { key: "deliverables", label: "Deliverables", hint: "What the client will receive" },
  { key: "assumptions", label: "Assumptions & exclusions", hint: "Dependencies and costs outside this estimate" },
  { key: "paymentTerms", label: "Payment terms", hint: "Deposit, milestones and payment schedule" },
];
const PERIODS = { one_time: "One-time", monthly: "Monthly", yearly: "Yearly" };
function Totals({ brief }: { brief: ProjectBrief }) {
  const totals = briefTotals(brief);
  return <div className={s.summary}><div><span>One-time investment</span><strong>{briefMoney(totals.oneTime, brief.currency)}</strong></div><div><span>Monthly services</span><strong>{briefMoney(totals.monthly, brief.currency)}</strong></div><div><span>Annual services</span><strong>{briefMoney(totals.yearly, brief.currency)}</strong></div><div><span>Estimated first year</span><strong>{briefMoney(totals.firstYear, brief.currency)}</strong></div><small>One-time costs + 12 months of monthly services + annual services. Confirm taxes and third-party pricing before approval.</small></div>;
}
export default function ProjectBriefsPage() {
  const router = useRouter(); const profile = useAdminProfile();
  const [shareTarget, setShareTarget] = useState<ProjectBrief | null>(null);
  const [shareUrl, setShareUrl] = useState(""); const [shareBusy, setShareBusy] = useState(false); const [shareError, setShareError] = useState(""); const [shareNotice, setShareNotice] = useState("");
  const [briefs, setBriefs] = useState<ProjectBrief[]>([]); const [loading, setLoading] = useState(true);
  const [editor, setEditor] = useState<ProjectBrief | null>(null); const [detail, setDetail] = useState<ProjectBrief | null>(null); const [remove, setRemove] = useState<ProjectBrief | null>(null);
  const [busy, setBusy] = useState(false); const [exporting, setExporting] = useState(""); const [notice, setNotice] = useState(""); const [error, setError] = useState(""); const [editorError, setEditorError] = useState(""); const [dirty, setDirty] = useState(false); const [discard, setDiscard] = useState(false); const [search, setSearch] = useState("");
  useEffect(() => onAdminPageAccess(router, async () => {
    try { setBriefs(await getProjectBriefs()); } catch (error) { setError(error instanceof Error ? error.message : "Could not load project briefs."); } finally { setLoading(false); }
  }), [router]);
  function edit(brief: ProjectBrief) { setEditor(structuredClone(brief)); setDirty(false); setEditorError(""); setNotice(""); }
  function update<K extends keyof ProjectBrief>(key: K, value: ProjectBrief[K]) { setDirty(true); setEditor(current => current ? { ...current, [key]: value } : null); }
  function cost(id: string, key: keyof BriefCost, value: string | number) { if (editor) update("costs", editor.costs.map(item => item.id === id ? { ...item, [key]: value } : item)); }
  function closeEditor() { if (busy) return; if (dirty) setDiscard(true); else setEditor(null); }
  async function save(event: React.FormEvent) {
    event.preventDefault(); if (!editor || busy) return; setBusy(true); setEditorError("");
    try { const saved = await saveProjectBrief(editor); setBriefs(current => [saved, ...current.filter(item => item.id !== saved.id)]); setEditor(null); setDirty(false); setNotice("Project overview and budget saved."); }
    catch (error) { setEditorError(error instanceof Error ? error.message : "Could not save this project brief."); }
    finally { setBusy(false); }
  }
  async function exportPdf(brief: ProjectBrief) {
    if (exporting) return; setExporting(brief.id); setError(""); setNotice("");
    try {
      const { generateProjectBriefPdf } = await import("@/lib/utils/generateProjectBriefPdf");
      const publisher = await getProjectBriefPublisher(profile);
      const { pdf, filename } = await generateProjectBriefPdf(brief, publisher);
      pdf.save(filename); setNotice("Project PDF downloaded.");
    } catch (error) { setError(error instanceof Error ? error.message : "Could not export this PDF."); }
    finally { setExporting(""); }
  }
  async function openShare(brief: ProjectBrief) {
    if (shareBusy) return;
    setShareTarget(brief); setShareUrl(""); setShareBusy(true); setShareError(""); setShareNotice("");
    try {
      const published = await publishProjectBrief(brief.id);
      setBriefs(current => current.map(item => item.id === published.id ? published : item));
      setDetail(current => current?.id === published.id ? published : current);
      const base = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
      setShareTarget(published); setShareUrl(new URL(`/project-overview/${published.shareToken}`, base).href);
    } catch (error) { setShareError(error instanceof Error ? error.message : "Could not create a client link."); }
    finally { setShareBusy(false); }
  }
  async function copyShareLink() {
    try { await navigator.clipboard.writeText(shareUrl); setShareNotice("Client link copied."); }
    catch { setShareNotice("Select and copy the link above."); }
  }
  async function shareLink() {
    setShareError("");
    try { if (navigator.share) await navigator.share({ title: shareTarget?.title, url: shareUrl }); else await copyShareLink(); }
    catch (error) { if (!(error instanceof DOMException && error.name === "AbortError")) setShareError("Could not open sharing. Copy the link instead."); }
  }
  async function disableSharing() {
    if (!shareTarget || shareBusy) return; setShareBusy(true); setShareError("");
    try {
      await revokeProjectBriefShare(shareTarget.id);
      const withoutLink = (item: ProjectBrief) => { const { shareToken, ...privateBrief } = item; return privateBrief; };
      setBriefs(current => current.map(item => item.id === shareTarget.id ? withoutLink(item) : item));
      setDetail(current => current?.id === shareTarget.id ? withoutLink(current) : current);
      setShareTarget(null); setNotice("Client link disabled. Sharing again creates a new link.");
    } catch (error) { setShareError(error instanceof Error ? error.message : "Could not disable the link."); }
    finally { setShareBusy(false); }
  }
  async function deleteBrief() {
    if (!remove || busy) return; setBusy(true); setError("");
    try { await deleteProjectBrief(remove.id); setBriefs(current => current.filter(item => item.id !== remove.id)); setRemove(null); setNotice("Project brief deleted."); }
    catch (error) { setError(error instanceof Error ? error.message : "Could not delete this brief."); }
    finally { setBusy(false); }
  }
  const filtered = briefs.filter(item => `${item.title} ${item.client}`.toLowerCase().includes(search.toLowerCase()));
  return <AdminLayout title="Project Overviews & Budgets | DevEngine"><div className={s.page}>
    <div className={s.header}><div><p className={s.eyebrow}>Client planning / Admin only</p><h1>Plan it. Price it. Present it.</h1><p>Prepare a clear project plan and budget before work begins.</p></div><button className={s.primary} onClick={() => edit(blankBrief())}><EmployeeIcon>add</EmployeeIcon>New project brief</button></div>
    {notice && <div role="status" className={s.notice}>{notice}</div>}{error && !remove && <div role="alert" className={s.notice} data-error>{error}</div>}
    <div className={s.stats}><div className={s.stat}><span>Project briefs</span><strong>{briefs.length}</strong></div><div className={s.stat}><span>Drafts</span><strong>{briefs.filter(item => item.status === "draft").length}</strong></div><div className={s.stat}><span>Ready to share</span><strong>{briefs.filter(item => item.status === "ready").length}</strong></div></div>
    <div className={s.header}><div><h2>Project library</h2><p>Drafts stay private until you create a client link.</p></div><label className={s.search}><span className="sr-only">Search project briefs</span><input type="search" placeholder="Search projects or clients" value={search} onChange={event => setSearch(event.target.value)} /></label></div>
    {loading ? <p role="status">Loading project briefs…</p> : filtered.length ? <div className={s.cards}>{filtered.map(brief => <article className={`${s.panel} ${s.card}`} key={brief.id}><div className={s.cardTop}><span className={s.eyebrow}>{brief.client}</span><span className={s.tag} data-status={brief.status}>{brief.status === "ready" ? "Ready to share" : "Draft"}</span></div><h2>{brief.title}</h2><p>{brief.overview.slice(0, 180) || "Add an overview to describe the project."}</p><div className={s.total}><span>First-year estimate</span><strong>{briefMoney(briefTotals(brief).firstYear, brief.currency)}</strong></div><p>Updated {new Date(brief.updatedAt).toLocaleDateString()}</p><div className={s.actions}><button className={s.button} onClick={() => setDetail(brief)}>View details</button><button className={s.button} onClick={() => edit(brief)}>Edit</button><button className={s.button} disabled={!!exporting} onClick={() => exportPdf(brief)}><EmployeeIcon>download</EmployeeIcon>{exporting === brief.id ? "Preparing…" : "PDF"}</button><button className={s.button} disabled={!!exporting} onClick={() => openShare(brief)}><EmployeeIcon>share</EmployeeIcon>Share link</button><button className={s.danger} aria-label={`Delete ${brief.title}`} onClick={() => { setError(""); setRemove(brief); }}><EmployeeIcon>delete</EmployeeIcon></button></div></article>)}</div> : <div className={`${s.panel} ${s.empty}`}><EmployeeIcon>description</EmployeeIcon><h2>{search ? "No matching projects" : "Your next project starts here."}</h2><p>{search ? "Try a different search." : "Capture the plan, technology, deliverables and costs in one client-ready document."}</p>{!search && <button className={s.primary} onClick={() => edit(blankBrief())}>Create a project brief</button>}</div>}
    {editor && <EmployeeDialog wide title={editor.id ? "Edit project brief" : "New project brief"} description="Create a plan your client can understand." icon="description" onClose={closeEditor}><form onSubmit={save} className={s.page}>
      {editorError && <div role="alert" className={s.notice} data-error>{editorError}</div>}
      <fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}><div className={s.grid}>
        <label className={s.field}>Project title *<input required maxLength={160} placeholder="Project name" value={editor.title} onChange={event => update("title", event.target.value)} /></label><label className={s.field}>Client name *<input required maxLength={160} placeholder="Client or company" value={editor.client} onChange={event => update("client", event.target.value)} /></label><label className={s.field}>Client email<input type="email" placeholder="client@company.com" value={editor.clientEmail} onChange={event => update("clientEmail", event.target.value)} /></label><label className={s.field}>Document status<AdminSelect value={editor.status} onChange={event => update("status", event.target.value as ProjectBrief["status"])}><option value="draft">Draft</option><option value="ready">Ready to share</option></AdminSelect></label>
        {SECTIONS.map(section => <label className={`${s.field} ${section.key === "overview" ? s.full : ""}`} key={section.key}>{section.label}<textarea maxLength={16000} placeholder={section.hint} value={editor[section.key]} onChange={event => update(section.key, event.target.value)} /></label>)}
      </div>
      <section style={{ marginTop: 32 }}><div className={s.header}><div><h2>Budget breakdown</h2><p>Separate project investment from ongoing services.</p></div><label className={s.field}>Currency<AdminSelect value={editor.currency} onChange={event => update("currency", event.target.value)}>{["BDT", "USD", "EUR", "GBP", "INR", "AUD", "CAD", "SGD", "AED", "SAR"].map(code => <option key={code} value={code}>{code}</option>)}</AdminSelect></label></div>
      <div className={s.list}>{editor.costs.map(item => <div className={s.cost} key={item.id}><label className={s.field}>Cost item<input required maxLength={160} value={item.title} placeholder="Design, server, deployment…" onChange={event => cost(item.id, "title", event.target.value)} /></label><label className={s.field}>Quantity<input required type="number" min="0.01" max="1000000" step="0.01" value={Number.isFinite(item.quantity) ? item.quantity : ""} onChange={event => cost(item.id, "quantity", event.target.value === "" ? NaN : Number(event.target.value))} /></label><label className={s.field}>Unit cost<input required type="number" min="0" max="100000000000" step="0.01" value={Number.isFinite(item.amount) ? item.amount : ""} onChange={event => cost(item.id, "amount", event.target.value === "" ? NaN : Number(event.target.value))} /></label><label className={s.field}>Billing<AdminSelect value={item.period} onChange={event => cost(item.id, "period", event.target.value)}>{Object.entries(PERIODS).map(([key, title]) => <option value={key} key={key}>{title}</option>)}</AdminSelect></label><button type="button" className={s.danger} onClick={() => update("costs", editor.costs.filter(cost => cost.id !== item.id))} aria-label={`Remove ${item.title || "cost item"}`}><EmployeeIcon>delete</EmployeeIcon></button></div>)}</div>
      <button type="button" className={s.button} disabled={editor.costs.length >= 60} style={{ marginTop: 16 }} onClick={() => update("costs", [...editor.costs, { id: crypto.randomUUID(), title: "", quantity: 1, amount: 0, period: "one_time" }])}><EmployeeIcon>add</EmployeeIcon>Add budget item</button><Totals brief={editor} /></section>
      </fieldset><div className={s.actions}><button type="button" className={s.button} disabled={busy} onClick={closeEditor}>Cancel</button><button type="submit" className={s.primary} disabled={busy}>{busy ? "Saving…" : "Save project brief"}</button></div>
    </form></EmployeeDialog>}
    {detail && <EmployeeDialog wide title={detail.title} description={`Prepared for ${detail.client}`} icon="description" onClose={() => setDetail(null)}><div className={s.detail}>{SECTIONS.filter(section => detail[section.key].trim()).map(section => <section key={section.key}><h3>{section.label}</h3><p>{detail[section.key]}</p></section>)}<section><h3>Budget breakdown · {detail.currency}</h3><div className={s.tableWrap}><table className={s.table}><thead><tr><th>Item</th><th>Quantity</th><th>Cost</th><th>Billing</th></tr></thead><tbody>{detail.costs.map(item => <tr key={item.id}><td>{item.title}</td><td>{item.quantity}</td><td>{briefMoney(item.quantity * item.amount, detail.currency)}</td><td>{PERIODS[item.period]}</td></tr>)}</tbody></table></div><Totals brief={detail} /></section><div className={s.actions}><button className={s.primary} disabled={!!exporting} onClick={() => exportPdf(detail)}>Download PDF</button><button className={s.button} disabled={!!exporting} onClick={() => openShare(detail)}>Share project link</button></div></div></EmployeeDialog>}
    {shareTarget && <EmployeeDialog title="Share project overview" description={shareTarget.title} icon="share" onClose={() => { if (!shareBusy) setShareTarget(null); }}><div className={s.page}>
      <p style={{ color: "var(--devengine-muted)", lineHeight: 1.8 }}>Anyone with this link can view this project and download the PDF. Saved changes update the shared view.</p>
      {shareBusy && !shareUrl ? <p role="status">Preparing client link…</p> : null}
      {shareError && <div className={s.notice} role="alert" data-error>{shareError}</div>}
      {shareNotice && <p role="status">{shareNotice}</p>}
      {shareUrl && <><label className={s.field}>Client view link<input readOnly value={shareUrl} onFocus={event => event.target.select()} /></label><div className={s.actions}><button className={s.primary} onClick={copyShareLink}>Copy link</button><button className={s.button} onClick={shareLink}>Share link</button><a className={s.button} href={shareUrl} target="_blank" rel="noopener noreferrer">Open client view</a></div><div className={s.actions}><button className={s.danger} disabled={shareBusy} onClick={disableSharing}>{shareBusy ? "Disabling…" : "Disable client link"}</button></div></>}
      {!shareUrl && !shareBusy && <button className={s.button} onClick={() => openShare(shareTarget)}>Retry</button>}
    </div></EmployeeDialog>}
    {remove && <EmployeeDialog title="Delete this project brief?" description="This permanently removes the saved document." icon="delete" onClose={() => { if (!busy) setRemove(null); }}><p>{remove.title} · {remove.client}</p>{error && <p role="alert">{error}</p>}<div className={s.actions}><button className={s.button} disabled={busy} onClick={() => setRemove(null)}>Cancel</button><button className={s.danger} disabled={busy} onClick={deleteBrief}>{busy ? "Deleting…" : "Delete permanently"}</button></div></EmployeeDialog>}
    {discard && <EmployeeDialog title="Discard unsaved changes?" icon="edit_note" onClose={() => setDiscard(false)}><p>Your latest edits have not been saved.</p><div className={s.actions}><button className={s.button} onClick={() => setDiscard(false)}>Keep editing</button><button className={s.danger} onClick={() => { setDiscard(false); setEditor(null); setDirty(false); }}>Discard changes</button></div></EmployeeDialog>}
  </div></AdminLayout>;
}
