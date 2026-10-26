import { useState } from "react";
import { AdminSelect } from "@/components/admin/AdminFormControls";
import { devKittyError, getDevKittyModels } from "@/lib/devkitty/client";
import type { DevKittyModel, DevKittySettings } from "@/types/devkitty";
import s from "@/components/admin/AdminWorkspace.module.css";
import k from "./DevKittyAdmin.module.css";
const FREE = "openrouter/free", PAID = "google/gemini-2.5-flash";
export default function DevKittyModelSettings({ settings, onChange }: { settings: DevKittySettings; onChange: (patch: Partial<DevKittySettings>) => void }) {
  const [models, setModels] = useState<DevKittyModel[]>([]), [search, setSearch] = useState(""), [loading, setLoading] = useState(false), [error, setError] = useState("");
  const mode = settings.billingMode || "free";
  const freeModel = settings.freeModel || FREE, paidModel = settings.paidModel || PAID;
  function configure(patch: Partial<DevKittySettings>) {
    const next = { billingMode: mode, freeModel, paidModel, ...patch };
    onChange({ ...next, model: next.billingMode === "free" ? next.freeModel : next.paidModel });
  }
  async function load() {
    setLoading(true); setError("");
    try { setModels(await getDevKittyModels()); } catch (error) { setError(devKittyError(error)); } finally { setLoading(false); }
  }
  return <div className={`${s.full} ${k.modelSettings}`}>
    <div className={k.sectionHeader}><div><h3>Model & spending mode</h3><p>Save settings to apply your mode and model choices.</p></div><button className={s.button} type="button" disabled={loading} onClick={load}>{loading ? "Loading…" : "Load live models"}</button></div>
    <div className={k.modeGrid} aria-label="AI spending mode">{[
      { value: "free" as const, title: "Free only", description: "$0 token pricing. Paid models and paid web lookup are blocked." },
      { value: "paid" as const, title: "Paid models", description: "Use your paid model and provider credits. Web lookup may cost extra." },
    ].map(item => <button type="button" key={item.value} className={k.modeCard} aria-pressed={mode === item.value} onClick={() => configure({ billingMode: item.value })}><span className={k.modeMarker} aria-hidden="true" /><span><strong>{item.title}</strong><small>{item.description}</small></span></button>)}</div>
    <p className={k.routingNote}>{mode === "free" ? "Free mode never falls back to paid models. If free capacity is unavailable, DevKitty asks the user to try again. Live weather/news lookup is unavailable in this mode." : "Paid inference is allowed only while this mode is saved. Your free model stays configured for switching back."}</p>
    {!!models.length && <input className="transparent-input" type="search" aria-label="Find an AI model" placeholder="Find a model" value={search} onChange={event => setSearch(event.target.value)} />}
    <div className={s.grid}>{(["free", "paid"] as const).map(kind => {
      const value = kind === "free" ? freeModel : paidModel;
      const selected = models.find(model => model.id === value);
      const available = models.filter(model => model.free === (kind === "free") && `${model.name} ${model.id}`.toLowerCase().includes(search.toLowerCase())).slice(0, 150);
      return <label key={kind} className={s.field}>{kind === "free" ? "Free model" : "Paid model"}<AdminSelect value={value} onChange={event => configure(kind === "free" ? { freeModel: event.target.value } : { paidModel: event.target.value })}>
        {!available.some(model => model.id === value) && <option value={value}>{value === FREE ? "OpenRouter · Free Models Router" : value}</option>}
        {kind === "free" && value !== FREE && !available.some(model => model.id === FREE) && <option value={FREE}>OpenRouter · Free Models Router</option>}
        {available.map(model => <option value={model.id} key={model.id}>{model.name}</option>)}
      </AdminSelect><small>{kind === "free" ? "Zero-priced free variants only. The free router selects an available free model automatically." : selected ? `$${selected.inputPricePerMillion.toFixed(3)} input / $${selected.outputPricePerMillion.toFixed(3)} output per million tokens.` : "Load the catalog for current pricing. This model is not used in free mode."}</small></label>;
    })}</div>
    {error && <p role="alert">{error}</p>}
  </div>;
}
