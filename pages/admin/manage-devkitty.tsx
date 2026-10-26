import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import AdminLayout from "@/components/AdminLayout";
import { EmployeeDialog, EmployeeIcon } from "@/components/staff/EmployeeUI";
import { onAdminPageAccess } from "@/lib/services/staffAuth";
import { readDevKittyAdmin, devKittyAdminAction, devKittyError } from "@/lib/devkitty/client";
import type { DevKittyAdminState, DevKittySettings, DevKittyKnowledge, DevKittyRole } from "@/types/devkitty";
import s from "@/components/admin/AdminWorkspace.module.css";
import k from "@/components/devkitty/DevKittyAdmin.module.css";
import DevKittyUsage from "@/components/devkitty/DevKittyUsage";
import DevKittyModelSettings from "@/components/devkitty/DevKittyModelSettings";
const ROLES: { key: DevKittyRole; label: string; description: string }[] = [
  { key: "visitor", label: "Visitors & clients", description: "Published content, services, projects and public page links." },
  { key: "employee", label: "Employees", description: "Their own workspace, tasks, requests and daily updates." },
  { key: "admin", label: "Administrator", description: "Studio activity and management guidance." },
];
function Switch({ value, onChange, label, disabled = false }: { value: boolean; onChange: (value: boolean) => void; label: string; disabled?: boolean }) {
  return <button className={k.switch} type="button" role="switch" aria-label={label} aria-checked={value} disabled={disabled} onClick={() => onChange(!value)}><span /></button>;
}
export default function ManageDevKitty() {
  const router = useRouter(); const [data, setData] = useState<DevKittyAdminState | null>(null), [settings, setSettings] = useState<DevKittySettings | null>(null);
  const [loading, setLoading] = useState(true), [saving, setSaving] = useState(false), [error, setError] = useState(""), [notice, setNotice] = useState("");
  const [switching, setSwitching] = useState(false);
  const [apiKey, setApiKey] = useState(""), [showKey, setShowKey] = useState(false), [removeKey, setRemoveKey] = useState(false);
  const [knowledge, setKnowledge] = useState<DevKittyKnowledge | null>(null), [knowledgeError, setKnowledgeError] = useState(""), [deleting, setDeleting] = useState<DevKittyKnowledge | null>(null);
  async function load() { const result = await readDevKittyAdmin(); setData(result); setSettings(result.settings); }
  useEffect(() => onAdminPageAccess(router, async () => {
    try { await load(); } catch (error) { setError(devKittyError(error)); } finally { setLoading(false); }
  }), [router]);
  function update<Key extends keyof DevKittySettings>(key: Key, value: DevKittySettings[Key]) { setSettings(current => current ? { ...current, [key]: value } : current); setNotice(""); }
  async function toggleService(enabled: boolean) {
    if (switching || saving) return;
    setSwitching(true); setError(""); setNotice("");
    try {
      await devKittyAdminAction({ action: "setEnabled", enabled });
      setSettings(current => current ? { ...current, enabled } : current);
      setData(current => current ? { ...current, settings: { ...current.settings, enabled } } : current);
      window.dispatchEvent(new Event("devkitty_settings_updated"));
      setNotice(enabled ? "DevKitty is online. AI replies are enabled." : "DevKitty is in maintenance. Users receive your maintenance message.");
    } catch (error) { setError(devKittyError(error)); }
    finally { setSwitching(false); }
  }
  async function save(event: React.FormEvent) {
    event.preventDefault(); if (!settings || saving || switching) return; setSaving(true); setError(""); setNotice("");
    try { await devKittyAdminAction({ action: "save", settings, ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {}), removeKey }); setApiKey(""); setShowKey(false); setRemoveKey(false); await load(); window.dispatchEvent(new Event("devkitty_settings_updated")); setNotice("DevKitty settings saved."); }
    catch (error) { setError(devKittyError(error)); }
    finally { setSaving(false); }
  }
  async function saveKnowledge(event: React.FormEvent) {
    event.preventDefault(); if (!knowledge) return; setSaving(true); setKnowledgeError("");
    try { await devKittyAdminAction({ action: "saveKnowledge", item: knowledge }); setKnowledge(null); const result = await readDevKittyAdmin(); setData(result); setNotice("Knowledge note saved. DevKitty will use it for the selected audiences."); }
    catch (error) { setKnowledgeError(devKittyError(error)); } finally { setSaving(false); }
  }
  async function deleteKnowledge() {
    if (!deleting) return; setSaving(true); setKnowledgeError("");
    try { await devKittyAdminAction({ action: "deleteKnowledge", id: deleting.id }); setDeleting(null); const result = await readDevKittyAdmin(); setData(result); setNotice("Knowledge note deleted."); }
    catch (error) { setKnowledgeError(devKittyError(error)); } finally { setSaving(false); }
  }
  return <AdminLayout title="DevKitty Control Center | DevEngine"><div className={s.page}>
    <div className={s.header}><div><p className={s.eyebrow}>DevKitty / Admin control</p><h1>A thoughtful companion. Your rules.</h1><p>Connect the AI, shape its personality and control what each role can access.</p></div><button type="submit" form="devkitty-settings" className={s.primary} disabled={saving || !settings}>{saving ? "Saving…" : "Save settings"}</button></div>
    {error && <div className={s.notice} data-error role="alert">{error}{!settings && <button className={s.button} onClick={async () => { setLoading(true); setError(""); try { await load(); } catch (error) { setError(devKittyError(error)); } finally { setLoading(false); } }}>Reconnect</button>}</div>}
    {notice && <div className={s.notice} role="status">{notice}</div>}
    {loading ? <p role="status">Loading DevKitty controls…</p> : settings && data && <>
      <div className={s.stats}><div className={s.stat}><span>AI connection</span><strong className={k.metric}>{data.configured ? "Key configured" : "Not connected"}</strong><span>{data.keyHint || "Add a replacement key below"}</span></div><div className={s.stat}><span>Messages today · UTC</span><strong>{data.usage.requests || 0}</strong><span>{data.usage.successful || 0} completed · {data.usage.errors || 0} failed</span></div><div className={s.stat}><span>Tokens today</span><strong>{((data.usage.inputTokens || 0) + (data.usage.outputTokens || 0)).toLocaleString()}</strong><span>Provider-reported spend: {data.usage.costSamples ? `$${(data.usage.reportedCost || 0).toFixed(4)}` : data.usage.successful ? "See OpenRouter usage" : "$0.0000"}</span></div></div>
      <form id="devkitty-settings" onSubmit={save} className={s.page}>
        <fieldset disabled={saving} className={k.fieldset}>
          <section className={`${s.panel} ${k.service}`} data-online={data.settings.enabled}><div className={k.sectionHeader}><div><p className={s.eyebrow}>Service control</p><h2>{data.settings.enabled ? "DevKitty is online" : "DevKitty is under maintenance"}</h2><p>Applies to everyone immediately. While off, replies use your maintenance message without AI charges.</p></div><div className={k.toggleRow}><span>{switching ? "Updating…" : data.settings.enabled ? "Online" : "Maintenance"}</span><Switch label="DevKitty master service switch" value={data.settings.enabled} disabled={switching || saving} onChange={toggleService} /></div></div><label className={s.field}>Maintenance reply<textarea maxLength={600} rows={3} value={settings.maintenanceMessage || "I’m currently undergoing maintenance, bunny. I’ll be back shortly. Thank you for your patience."} onChange={event => update("maintenanceMessage", event.target.value)} /><small>Save settings to update this message. The master switch saves instantly.</small></label></section>
          <section className={s.panel}><div className={k.sectionHeader}><div><h2>Connection & model</h2><p>Your API key is saved through the server and never returned to the browser.</p></div></div><div className={s.grid}>
            <label className={`${s.field} ${s.full}`}>OpenRouter API key<div className={k.keyInput}><input type={showKey ? "text" : "password"} value={apiKey} placeholder={data.configured ? "Leave blank to keep the saved key" : "Paste your new OpenRouter key"} autoComplete="new-password" spellCheck={false} onChange={event => { setApiKey(event.target.value); setRemoveKey(false); }} /><button type="button" className={s.button} onClick={() => setShowKey(value => !value)} aria-label={showKey ? "Hide API key" : "Show API key"}><EmployeeIcon>{showKey ? "visibility_off" : "visibility"}</EmployeeIcon></button></div><small>Your saved key works with both free and paid models. Free mode blocks paid inference.</small></label>
            {data.configured && <label className={k.checkbox}><input type="checkbox" checked={removeKey} onChange={event => { setRemoveKey(event.target.checked); if (event.target.checked) setApiKey(""); }} />Remove the saved key when I save</label>}
            <DevKittyModelSettings settings={settings} onChange={patch => { setSettings(current => current ? { ...current, ...patch } : current); setNotice(""); }} />
          </div></section>
          <section className={s.panel}><h2>Behaviour & voice</h2><p>DevKitty always uses “bunny”. Facts come from live records and your knowledge notes.</p><label className={s.field}>General instructions<textarea maxLength={4000} value={settings.instructions} onChange={event => update("instructions", event.target.value)} placeholder="Tone, style and how DevKitty should help" /></label></section>
          <div className={k.roleGrid}>{ROLES.map(role => {
            const enabledKey = role.key === "visitor" ? "publicEnabled" : `${role.key}Enabled` as "employeeEnabled" | "adminEnabled";
            const greetingKey = `${role.key}Greeting` as "visitorGreeting" | "employeeGreeting" | "adminGreeting";
            const instructionsKey = `${role.key}Instructions` as "visitorInstructions" | "employeeInstructions" | "adminInstructions";
            return <section key={role.key} className={s.panel}><div className={k.sectionHeader}><h2>{role.label}</h2><Switch label={`Allow ${role.label}`} value={settings[enabledKey]} onChange={value => update(enabledKey, value)} /></div><p>{role.description}</p><label className={s.field}>Greeting<textarea maxLength={600} value={settings[greetingKey]} onChange={event => update(greetingKey, event.target.value)} /><small>Use {"{name}"} for their name.</small></label><label className={s.field}>Role instructions<textarea maxLength={4000} value={settings[instructionsKey]} onChange={event => update(instructionsKey, event.target.value)} /></label></section>;
          })}</div>
          <section className={s.panel}><h2>Context & experience</h2><div className={k.options}>{[
            ["autoEmployeeGreeting", "Welcome employees automatically", "Greet each employee once per sign-in when they reach their dashboard."],
            ["employeeDataEnabled", "Use the employee’s own records", "Their assignments, work updates, attendance and requests. No other employee’s private records."],
            ["adminDataEnabled", "Use admin workspace records", "Read relevant studio summaries for the verified administrator."],
            ["webSearchEnabled", "Allow paid web lookup", "Only available in paid mode. Free mode blocks this setting on the server."],
            ["requireZeroRetention", "Require zero-retention providers", "Only compatible providers will be used. Provider data collection is denied in all modes."],
          ].map(([key, title, description]) => <div className={k.option} key={key}><div><strong>{title}</strong><p>{description}</p></div><Switch label={title} value={key === "webSearchEnabled" && settings.billingMode !== "paid" ? false : settings[key as keyof DevKittySettings] as boolean} disabled={key === "webSearchEnabled" && settings.billingMode !== "paid"} onChange={value => update(key as "autoEmployeeGreeting", value)} /></div>)}</div></section>
          <section className={s.panel}><h2>Usage & response limits</h2><p>Caps apply on the server. They cannot be bypassed by changing the browser interface.</p><div className={s.grid}>
            {[
              ["dailyMessageLimit", "Daily messages across the studio", 1, 100000, 1], ["messagesPerMinute", "Messages per minute per visitor", 1, 30, 1],
              ["visitorDailyLimit", "Daily messages per visitor", 1, 500, 1], ["maxOutputTokens", "Maximum response tokens", 256, 2048, 1], ["temperature", "Creativity", 0, 1, 0.05],
            ].map(([key, label, min, max, step]) => <label className={s.field} key={key}>{label}<input type="number" required min={min} max={max} step={step} value={settings[key as keyof DevKittySettings] as number} onChange={event => update(key as "temperature", Number(event.target.value))} /></label>)}
          </div></section>
        </fieldset>
      </form>
      <DevKittyUsage revision={`${data.keyHint}:${notice}`} settings={data.settings} />
      <section className={s.panel}><div className={k.sectionHeader}><div><h2>Curated knowledge</h2><p>Add verified FAQs and company guidance. Choose exactly who may receive each note.</p></div><button type="button" className={s.primary} onClick={() => { setKnowledgeError(""); setKnowledge({ title: "", content: "", audiences: ["visitor"], keywords: "", url: "", enabled: true }); }}><EmployeeIcon>add</EmployeeIcon>Add knowledge</button></div>
        {data.knowledge.length ? <div className={k.knowledgeList}>{data.knowledge.map(item => <article className={k.knowledge} key={item.id}><div><strong>{item.title}</strong><p>{item.audiences.map(role => ROLES.find(item => item.key === role)?.label).join(" · ")}{!item.enabled && " · Paused"}</p></div><div className={s.actions}><button className={s.button} type="button" onClick={() => { setKnowledgeError(""); setKnowledge(structuredClone(item)); }}>Edit</button><button className={s.danger} type="button" onClick={() => { setKnowledgeError(""); setDeleting(item); }}>Delete</button></div></article>)}</div> : <p>No curated notes yet. DevKitty can still retrieve published studio content.</p>}
      </section>
    </>}
    {knowledge && <EmployeeDialog wide title={knowledge.id ? "Edit knowledge note" : "Add knowledge note"} icon="menu_book" onClose={() => { if (!saving) setKnowledge(null); }}><form onSubmit={saveKnowledge} className={s.page}>{knowledgeError && <p role="alert">{knowledgeError}</p>}<label className={s.field}>Title<input required maxLength={160} value={knowledge.title} onChange={event => setKnowledge({ ...knowledge, title: event.target.value })} /></label><label className={s.field}>Verified content<textarea required maxLength={12000} rows={8} value={knowledge.content} placeholder="Company facts, an FAQ or approved guidance" onChange={event => setKnowledge({ ...knowledge, content: event.target.value })} /></label><div><p className={s.field}>Who can receive this information?</p><div className={k.audiences}>{ROLES.map(role => <label key={role.key} data-selected={knowledge.audiences.includes(role.key)}><input type="checkbox" checked={knowledge.audiences.includes(role.key)} onChange={event => setKnowledge({ ...knowledge, audiences: event.target.checked ? [...knowledge.audiences, role.key] : knowledge.audiences.filter(item => item !== role.key) })} />{role.label}</label>)}</div></div><div className={s.grid}><label className={s.field}>Keywords<input maxLength={500} value={knowledge.keywords} placeholder="Topics people may ask about" onChange={event => setKnowledge({ ...knowledge, keywords: event.target.value })} /></label><label className={s.field}>Related page<input maxLength={300} value={knowledge.url} placeholder="/services" onChange={event => setKnowledge({ ...knowledge, url: event.target.value })} /></label></div><label className={k.checkbox}><input type="checkbox" checked={knowledge.enabled} onChange={event => setKnowledge({ ...knowledge, enabled: event.target.checked })} />Use this knowledge note</label><div className={s.actions}><button type="button" className={s.button} disabled={saving} onClick={() => setKnowledge(null)}>Cancel</button><button type="submit" className={s.primary} disabled={saving}>{saving ? "Saving…" : "Save knowledge"}</button></div></form></EmployeeDialog>}
    {deleting && <EmployeeDialog title="Delete knowledge note?" icon="delete" onClose={() => { if (!saving) setDeleting(null); }}><p>{deleting.title}</p>{knowledgeError && <p role="alert">{knowledgeError}</p>}<div className={s.actions}><button className={s.button} disabled={saving} onClick={() => setDeleting(null)}>Cancel</button><button className={s.danger} disabled={saving} onClick={deleteKnowledge}>{saving ? "Deleting…" : "Delete note"}</button></div></EmployeeDialog>}
  </div></AdminLayout>;
}
