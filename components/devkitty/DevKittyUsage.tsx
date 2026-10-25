import { useEffect, useState } from "react";
import { devKittyError, readDevKittyInsights } from "@/lib/devkitty/client";
import type { DevKittyInsights } from "@/types/devkitty";
import s from "@/components/admin/AdminWorkspace.module.css";
import k from "./DevKittyAdmin.module.css";
const dollars = (value: number | null | undefined) => value == null ? "Unavailable" : `$${value.toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 4 })}`;
export default function DevKittyUsage({ revision }: { revision: string }) {
  const [data, setData] = useState<DevKittyInsights | null>(null), [loading, setLoading] = useState(true), [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true); setError("");
    readDevKittyInsights().then(result => { if (active) setData(result); }).catch(error => { if (active) setError(devKittyError(error)); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [revision, refresh]);
  const provider = data?.provider;
  return <section className={s.panel}>
    <div className={k.sectionHeader}><div><h2>Credits & model usage</h2><p>Provider spending in USD. Model activity covers the last 30 UTC days.</p></div><button className={s.button} type="button" disabled={loading} onClick={() => setRefresh(value => value + 1)}>{loading ? "Refreshing…" : "Refresh usage"}</button></div>
    {error && <p role="alert">{error}</p>}
    {loading && !data && <p role="status">Loading provider details…</p>}
    {data && <>
      <div className={k.creditGrid} aria-label="Provider credits and spending">
        <div className={k.credit}><span>Account balance</span><strong>{dollars(provider?.accountBalance)}</strong><small>{provider?.accountBalance == null ? "Not exposed by this key’s permissions" : "Credits purchased less account usage"}</small></div>
        <div className={k.credit}><span>Key budget remaining</span><strong>{provider?.status === "connected" && provider.keyRemaining == null && provider.keyLimit == null ? "No key cap" : dollars(provider?.keyRemaining)}</strong><small>{provider?.keyLimit != null ? `${dollars(provider.keyLimit)} limit${provider.limitReset ? ` · resets ${provider.limitReset}` : ""}` : "Key allowance is separate from account balance"}</small></div>
        <div className={k.credit}><span>Key spending · all time</span><strong>{dollars(provider?.keyUsage)}</strong><small>Across all apps using this key</small></div>
      </div>
      <dl className={k.spendPeriods}><div><dt>Today · UTC</dt><dd>{dollars(provider?.dailyUsage)}</dd></div><div><dt>This week · UTC</dt><dd>{dollars(provider?.weeklyUsage)}</dd></div><div><dt>This month · UTC</dt><dd>{dollars(provider?.monthlyUsage)}</dd></div></dl>
      {provider?.status !== "connected" && <p role="status">{provider?.status === "not-configured" ? "Connect an OpenRouter key to view provider spending." : "The provider’s key details are temporarily unavailable. Refresh to try again."}</p>}
      <div className={k.sectionHeader}><h3>DevKitty activity by model</h3><span className={k.updated}>Since {data.usageReport.since} · UTC</span></div>
      {data.usageReport.models.length ? <div className={s.tableWrap} tabIndex={0} role="region" aria-label="Model usage, scroll horizontally"><table className={`${s.table} ${k.modelTable}`}><thead><tr><th scope="col">Model</th><th scope="col">AI calls</th><th scope="col">Input tokens</th><th scope="col">Output tokens</th><th scope="col">Reported spend</th></tr></thead><tbody>{data.usageReport.models.map(model => <tr key={model.model}><th scope="row">{model.model}</th><td>{model.calls.toLocaleString()}</td><td>{model.inputTokens.toLocaleString()}</td><td>{model.outputTokens.toLocaleString()}</td><td>{model.costSamples ? dollars(model.reportedCost) : "Not reported"}</td></tr>)}</tbody></table></div> : <p>No model activity recorded yet. New AI calls will appear here.</p>}
      <p className={k.updated}>Model tracking starts with this update; older totals stay in the summary above. One message may use multiple AI calls, including web lookups. Spend includes only costs reported by the provider.</p>
      <div className={s.actions}><a className={s.button} href="https://openrouter.ai/settings/credits" target="_blank" rel="noopener noreferrer">Credits & top-up ↗</a><a className={s.button} href="https://openrouter.ai/activity" target="_blank" rel="noopener noreferrer">Provider activity ↗</a><span className={k.updated}>Updated {new Date(data.provider.checkedAt).toLocaleString()}</span></div>
    </>}
  </section>;
}
