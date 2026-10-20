import AdminStatusChip, { normalizeAdminStatus } from "./AdminStatusChip";
import Link from "next/link";
import { AdminDateInput, AdminSelect } from "./AdminFormControls";
import { CommunicationDashboard } from "@/components/communication/CommunicationEntry";
import s from "./AdminOverview.module.css";

type Period = "all" | "today" | "date" | "month" | "range";
type Order = { id: string; buyerName: string; buyerEmail: string; projectTitle: string; amount: number; currency: string; status: string; date: string | null };
interface Props {
  orders: Order[]; revenue: number; usdRevenue: number;
  analytics: { totalViews: number; todayViews: number; uniqueVisitors: number };
  inventory: { title: string; count: number; total: number; icon: string; href: string }[];
  activities: { id: string; name: string; action: string; details: string; time: string }[];
  events: { id: string; title: string; description: string; time: string }[];
  period: Period; setPeriod: (value: Period) => void; periodLabel: string;
  date: string; setDate: (value: string) => void; month: string; setMonth: (value: string) => void;
  start: string; setStart: (value: string) => void; end: string; setEnd: (value: string) => void;
  refreshing: boolean; refreshedAt: Date; refresh: () => void;
  syncing: boolean; sync: () => void; progress: { step: string; current: number; total: number } | null;
  notice: { type: string; message: string } | null;
}
const Icon = ({ children }: { children: string }) => <span className="material-symbols-outlined" aria-hidden="true">{children}</span>;
const number = (value: number) => value.toLocaleString("en-US");
const compact = (value: number) => Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);
const money = (value: number) => `৳${number(value)}`;
const shortcuts = [
  ["Projects", "folder", "/admin/manage-projects"], ["Launchpad", "rocket_launch", "/admin/manage-launchpad"],
  ["Lab", "science", "/admin/manage-lab"], ["Services", "devices", "/admin/manage-services"],
  ["Reviews", "star", "/admin/manage-reviews"], ["About & team", "groups", "/admin/manage-about"],
  ["Blog", "edit_note", "/admin/manage-blog"], ["Careers", "work", "/admin/manage-careers"],
  ["Landing", "view_quilt", "/admin/manage-landing"], ["Archive", "inventory_2", "/admin/manage-archive"],
  ["Social links", "share", "/admin/manage-socials"], ["Network", "hub", "/admin/manage-network"],
];
export default function AdminOverview(p: Props) {
  const pending = p.orders.filter(order => ["pending", "pending_verification", "processing", "unpaid"].includes(normalizeAdminStatus(order.status))).length;
  const completed = p.orders.filter(order => ["paid", "completed", "verified", "approved", "success"].includes(normalizeAdminStatus(order.status))).length;
  const monthTotals = new Map<string, number>();
  p.orders.forEach(order => { if (order.date) { const date = new Date(order.date); const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`; monthTotals.set(key, (monthTotals.get(key) || 0) + (order.currency === "USD" ? order.amount * 120 : order.amount)); } });
  const months = [...monthTotals.keys()].sort().slice(-6);
  const peak = Math.max(1, ...months.map(month => monthTotals.get(month) || 0));
  const recent = [...p.orders].sort((a, b) => (b.date || "").localeCompare(a.date || "")).slice(0, 8);
  return <div className={s.overview}>
    <div className={s.hero}>
      <div><p className={s.eyebrow}><span /> YOUR STUDIO AT A GLANCE</p><h1>Clarity. Control. Momentum.</h1><p className={s.description}>The numbers, people, and work moving DevEngine forward.</p></div>
      <div className={s.heroActions}><time>{new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}</time><div><button className={s.button} onClick={p.refresh} disabled={p.refreshing}><span className={p.refreshing ? s.spinning : ""}><Icon>refresh</Icon></span>{p.refreshing ? "Updating" : "Refresh"}</button><Link className={s.primary} href="/admin/add-project"><Icon>add</Icon>New project</Link></div></div>
    </div>
    <nav className={s.workspaceNav} aria-label="Studio navigation">{[["Overview", "/admin/dashboard", "space_dashboard"], ["Commerce", "/admin/manage-orders", "shopping_bag"], ["Contracts", "/admin/contract-center", "description"], ["People", "/admin/manage-staff", "groups"], ["Content", "/admin/manage-landing", "view_quilt"]].map(([label, href, icon], index) => <Link key={href} href={href} aria-current={index === 0 ? "page" : undefined}><Icon>{icon}</Icon>{label}</Link>)}</nav>
    <section className={s.filters} aria-label="Reporting period"><div><span className={s.smallLabel}>REPORTING PERIOD</span><strong>{p.periodLabel}</strong></div><div className={s.filterControls}>
      <AdminSelect aria-label="Reporting period" value={p.period} onChange={event => p.setPeriod(event.target.value as Period)}><option value="all">All time</option><option value="today">Today</option><option value="date">Specific date</option><option value="month">By month</option><option value="range">Date range</option></AdminSelect>
      {p.period === "date" && <AdminDateInput aria-label="Report date" value={p.date} onChange={event => p.setDate(event.target.value)} />}
      {p.period === "month" && <AdminDateInput type="month" aria-label="Report month" value={p.month} onChange={event => p.setMonth(event.target.value)} />}
      {p.period === "range" && <><AdminDateInput aria-label="Start date" value={p.start} max={p.end || undefined} onChange={event => p.setStart(event.target.value)} /><span className={s.rangeArrow}>→</span><AdminDateInput aria-label="End date" value={p.end} min={p.start || undefined} onChange={event => p.setEnd(event.target.value)} /></>}
    </div></section>
    <div className={s.metrics}>
      {[
        { title: "Recorded order value", value: money(p.revenue), detail: `$${number(p.usdRevenue)} USD equivalent · selected period`, icon: "payments" },
        { title: "Orders received", value: number(p.orders.length), detail: `${pending} awaiting payment or review`, icon: "shopping_bag" },
        { title: "Website views", value: number(p.analytics.totalViews), detail: `${number(p.analytics.uniqueVisitors)} unique visitors · all time`, icon: "visibility" },
        { title: "Catalog projects", value: number(p.inventory[0]?.count || 0), detail: `${p.inventory[0]?.total || 0} total projects in the studio`, icon: "deployed_code" },
      ].map((metric, index) => <article className={s.metric} data-featured={index === 0 || undefined} key={metric.title}><div><span>{metric.title}</span><span className={s.metricIcon}><Icon>{metric.icon}</Icon></span></div><strong>{metric.value}</strong><p>{metric.detail}</p></article>)}
    </div>
    <div className={s.analysisGrid}>
      <section className={s.panel}><div className={s.panelHeading}><div><span className={s.smallLabel}>BUSINESS PERFORMANCE</span><h2>Order value over time</h2></div><span className={s.tag}>BDT equivalent</span></div>
        {months.length ? <><div className={s.chart} role="img" aria-label={months.map(month => `${month}: ${money(monthTotals.get(month) || 0)}`).join(", ")}><div className={s.chartGuides} aria-hidden="true"><span>{compact(peak)}</span><span>{compact(peak / 2)}</span><span>0</span></div><div className={s.chartBars}>{months.map(month => { const amount = monthTotals.get(month) || 0; return <div key={month} className={s.barColumn}><span>{money(Math.round(amount))}</span><div className={s.barTrack}><div className={s.bar} style={{ height: `${Math.max(2, amount / peak * 100)}%` }} /></div><time>{new Date(`${month}-01T12:00:00`).toLocaleDateString("en-US", { month: "short", year: "2-digit" })}</time></div>; })}</div></div><p className={s.chartNote}>Monthly totals from the selected orders. USD values use the existing ৳120 exchange rate.</p></> : <div className={s.empty}><Icon>bar_chart</Icon><strong>No dated orders in this period</strong><p>Monthly activity appears as orders are recorded.</p></div>}
      </section>
      <section className={s.panel}><div className={s.panelHeading}><div><span className={s.smallLabel}>OPERATIONS</span><h2>Keep work moving.</h2></div><Icon>arrow_outward</Icon></div><Link className={s.actionRow} href="/admin/manage-orders"><span className={s.rowIcon}><Icon>pending_actions</Icon></span><div><strong>Payment review</strong><small>Orders awaiting attention</small></div><b>{pending}</b><Icon>chevron_right</Icon></Link><Link className={s.actionRow} href="/admin/manage-orders"><span className={s.rowIcon}><Icon>task_alt</Icon></span><div><strong>Confirmed orders</strong><small>Paid, approved, or completed</small></div><b>{completed}</b><Icon>chevron_right</Icon></Link><Link className={s.actionRow} href="/admin/manage-attendance"><span className={s.rowIcon}><Icon>calendar_month</Icon></span><div><strong>Team attendance</strong><small>Punches, shifts, and requests</small></div><Icon>arrow_outward</Icon></Link><Link className={s.actionRow} href="/admin/manage-work-updates"><span className={s.rowIcon}><Icon>checklist</Icon></span><div><strong>Daily work updates</strong><small>Review the team's latest output</small></div><Icon>arrow_outward</Icon></Link><div className={s.trafficNote}><Icon>public</Icon><span><strong>{number(p.analytics.todayViews)}</strong> website views today</span></div></section>
    </div>
    <CommunicationDashboard />
    <div className={s.analysisGrid}>
      <section className={s.panel}><div className={s.panelHeading}><div><span className={s.smallLabel}>COMMERCE</span><h2>Latest orders</h2></div><Link className={s.textLink} href="/admin/manage-orders">View all<Icon>arrow_outward</Icon></Link></div>{recent.length ? <div className={s.tableWrap}><table><thead><tr><th>Customer / project</th><th>Order value</th><th>Status</th><th>Date</th></tr></thead><tbody>{recent.map(order => <tr key={order.id}><td><div className={s.customer}><span>{(order.buyerName || "G").slice(0, 2).toUpperCase()}</span><div><strong>{order.buyerName || "Guest"}</strong><small>{order.projectTitle || order.buyerEmail || "Project order"}</small></div></div></td><td className={s.amount}>{order.currency === "USD" ? "$" : "৳"}{number(order.amount)}</td><td><AdminStatusChip status={order.status} /></td><td>{order.date ? new Date(order.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}</td></tr>)}</tbody></table></div> : <div className={s.empty}><Icon>shopping_bag</Icon><strong>No orders in this period</strong><p>Choose another reporting period to explore more.</p></div>}</section>
      <section className={s.panel}><div className={s.panelHeading}><div><span className={s.smallLabel}>STUDIO INVENTORY</span><h2>Built to move forward.</h2></div><Icon>layers</Icon></div><div className={s.inventory}>{p.inventory.map(item => <Link href={item.href} key={item.title}><Icon>{item.icon}</Icon><span>{item.title}<small>{item.total} total</small></span><strong>{item.count}</strong><Icon>chevron_right</Icon></Link>)}</div><p className={s.chartNote}>Counts follow the reporting period. Totals show the full catalog.</p></section>
    </div>
    <div className={s.equalGrid}>
      <section className={s.panel}><div className={s.panelHeading}><div><span className={s.smallLabel}>PEOPLE & WORK</span><h2>Team activity</h2></div><Link className={s.textLink} href="/admin/manage-work-updates">Open workspace<Icon>arrow_outward</Icon></Link></div><div className={s.feed}>{p.activities.slice(0, 6).map(activity => <div className={s.feedItem} key={activity.id}><span className={s.avatar}>{activity.name.slice(0, 1).toUpperCase()}</span><div><strong>{activity.name}</strong><span>{activity.action}</span><p>{activity.details}</p><small>{activity.time}</small></div></div>)}{!p.activities.length && <div className={s.empty}><Icon>groups</Icon><strong>Your team's next move starts here.</strong><p>Attendance, tasks, and work updates appear in this feed.</p></div>}</div></section>
      <section className={s.panel}><div className={s.panelHeading}><div><span className={s.smallLabel}>WORKSPACE DIRECTORY</span><h2>Everything in reach.</h2></div><Icon>apps</Icon></div><div className={s.shortcutGrid}>{shortcuts.map(([label, icon, href]) => <Link key={href} href={href}><Icon>{icon}</Icon><span>{label}</span><Icon>arrow_outward</Icon></Link>)}</div></section>
    </div>
    <section className={s.panel}><div className={s.panelHeading}><div><span className={s.smallLabel}>PLATFORM</span><h2>Recent activity</h2></div></div>{p.events.length > 0 ? <div className={s.eventGrid}>{p.events.slice(0, 6).map(event => <article key={event.id}><span className={s.eventDot} /><div><strong>{event.title}</strong><p>{event.description}</p><small>{event.time}</small></div></article>)}</div> : <div className={s.empty}><Icon>monitoring</Icon><strong>No recent activity recorded yet</strong><p>Real-time visits, blog reads, and client interactions appear here as they occur.</p></div>}</section>
    <details className={s.system}><summary><Icon>settings</Icon><span>System tools</span><small>Updated {p.refreshedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</small><Icon>expand_more</Icon></summary><div><p>Restore or synchronize the public content modules.</p><button className={s.button} disabled={p.syncing} onClick={p.sync}><Icon>sync</Icon>{p.syncing ? "Synchronizing…" : "Synchronize content"}</button>{p.progress && <p role="status">{p.progress.step} · {p.progress.current} / {p.progress.total}</p>}{p.notice && <p role="status">{p.notice.message}</p>}</div></details>
  </div>;
}
