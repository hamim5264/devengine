import { useEffect, useState } from "react";
import Link from "next/link";
import HeaderControls from "@/components/HeaderControls";
import { MaintenanceConfig, DEFAULT_MAINTENANCE_CONFIG } from "@/types/maintenance";
import UpdateLogBody from "@/components/update-log/UpdateLogBody";
import NetworkTopologyBody from "@/components/network/NetworkTopologyBody";
import s from "./MaintenanceScreen.module.css";

export default function MaintenanceScreen({ config = DEFAULT_MAINTENANCE_CONFIG, onRefresh, isAdminPreview = false }: {
  config?: MaintenanceConfig; onRefresh?: () => void | Promise<void>; isAdminPreview?: boolean;
}) {
  const [tab, setTab] = useState("status");
  const [now, setNow] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState("");
  useEffect(() => { setNow(Date.now()); const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  const target = Date.parse(config.targetEndTime);
  const remaining = now && Number.isFinite(target) ? Math.max(0, target - now) : 0;
  const numbers = [Math.floor(remaining / 86400000), Math.floor(remaining / 3600000) % 24, Math.floor(remaining / 60000) % 60, Math.floor(remaining / 1000) % 60];
  const progress = Math.min(100, Math.max(0, Number(config.progressPercentage) || 0));
  async function refresh() {
    if (isAdminPreview) { setNotice("Preview is showing your current maintenance settings."); return; }
    setRefreshing(true); setNotice("");
    try { if (onRefresh) await onRefresh(); else window.location.reload(); }
    catch { setNotice("Unable to refresh. Please try again."); }
    finally { setRefreshing(false); }
  }
  return <div className={s.page}>
    <div className={s.ambient} aria-hidden="true" />
    <header className={s.header}>
      <Link href="/" className={s.brand}><span className="material-symbols-outlined" aria-hidden="true">deployed_code</span>DevEngine<span className={s.context}>{isAdminPreview ? "Preview" : "Service status"}</span></Link>
      <HeaderControls />
    </header>
    <main className={s.main}>
      <nav className={s.tabs} aria-label="Maintenance information">{[["status", "Service status"], ["updates", "Release updates"], ["network", "Network"]].map(([key, label]) => <button key={key} type="button" aria-current={tab === key ? "page" : undefined} onClick={() => setTab(key)}>{label}</button>)}</nav>
      {tab === "status" ? <div className={s.status}>
        <div className={s.intro}><span className={s.badge}><i />{config.badge || "Scheduled maintenance"}</span><h1>{config.title || "We’re building something better."}</h1><p>{config.message || "We’re making improvements. Thank you for your patience."}</p></div>
        <section className={s.panel} aria-label="Maintenance progress">
          <div className={s.panelHeading}><span>Estimated return</span><span>{!config.targetEndTime ? "To be announced" : remaining > 0 ? "Work in progress" : "Final updates in progress"}</span></div>
          <div className={s.countdown} aria-label="Time remaining">{numbers.map((number, index) => <div key={index}><strong>{String(number).padStart(2, "0")}</strong><span>{["Days", "Hours", "Minutes", "Seconds"][index]}</span></div>)}</div>
          <div className={s.progressLabel}><span>Overall progress</span><strong>{progress}%</strong></div>
          <div className={s.track} role="progressbar" aria-label="Maintenance completion" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}><div style={{ width: `${progress}%` }} /></div>
          {config.progressPhases?.length ? <div className={s.phases}>{config.progressPhases.map((phase, index) => <div key={index}><span>{phase.label}</span><strong>{phase.percent}%</strong></div>)}</div> : null}
        </section>
        <div className={s.services}><article><span className="material-symbols-outlined" aria-hidden="true">deployed_code</span><div><span>Core services</span><strong>{config.coreServicesStatus || "Updating services"}</strong></div></article><article><span className="material-symbols-outlined" aria-hidden="true">database</span><div><span>Database</span><strong>{config.databaseStatus || "Maintenance in progress"}</strong></div></article></div>
        <div className={s.actions}><p>Your next visit will use the latest service status.</p><button type="button" onClick={refresh} disabled={refreshing}><span className="material-symbols-outlined" aria-hidden="true">refresh</span>{refreshing ? "Refreshing…" : "Check for updates"}</button></div>
        {notice && <p role="alert">{notice}</p>}
      </div> : <section className={s.feed}><p className={s.eyebrow}>DevEngine / {tab === "updates" ? "Release updates" : "Infrastructure"}</p><h1>{tab === "updates" ? "What we’re improving." : "Our connected network."}</h1>{tab === "updates" ? <UpdateLogBody /> : <NetworkTopologyBody />}</section>}
    </main><footer className={s.footer}><span className={s.footerDot} />DevEngine · Built to move forward.</footer>
  </div>;
}
