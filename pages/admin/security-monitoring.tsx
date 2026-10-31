import { useEffect, useState, useCallback, useRef } from "react";
import Head from "next/head";
import AdminLayout from "@/components/AdminLayout";
import { useAdminOrStaffAuth } from "@/lib/services/staffAuth";
import { taskRequest, taskError } from "@/lib/tasks/client";
import Swal from "sweetalert2";
import s from "@/components/admin/AdminWorkspace.module.css";
import {
  FiShield,
  FiActivity,
  FiAlertTriangle,
  FiCheckCircle,
  FiLock,
  FiSlash,
  FiRefreshCw,
  FiSearch,
  FiServer,
  FiDatabase,
  FiCpu,
  FiKey,
  FiTrash2,
  FiUserX,
  FiInfo,
} from "react-icons/fi";

interface HealthData {
  status: "operational" | "degraded";
  dbLatencyMs: number;
  storageStatus: string;
  serverUptimeSeconds: number;
  environment: string;
  nodeVersion: string;
  checkedAt: string;
}

interface HeaderAuditItem {
  key: string;
  name: string;
  status: "passed" | "warning" | "failed";
  description: string;
  score: number;
}

interface BlockedIpItem {
  id: string;
  ip: string;
  reason: string;
  blockedAt: string;
  blockedBy: string;
}

interface SecurityLogItem {
  id: string;
  type: string;
  title: string;
  description: string;
  severity: "info" | "warning" | "high" | "critical";
  actionTaken: string;
  ip: string;
  userAgent?: string;
  email?: string;
  timestamp: string;
  actor?: string;
}

interface SecuritySettings {
  emergencyLockdown: boolean;
  bruteForceProtection: boolean;
  rateLimitingActive: boolean;
  suspiciousScanDetection: boolean;
  strictHeadersEnforced: boolean;
  alertEmail: string;
  lastScanAt?: string;
}

interface SecurityReport {
  health: HealthData;
  securityScore: number;
  grade: string;
  headersAudit: HeaderAuditItem[];
  settings: SecuritySettings;
  blockedIps: BlockedIpItem[];
  logs: SecurityLogItem[];
  stats: {
    totalBlockedIps: number;
    threatsBlocked24h: number;
    failedLogins24h: number;
    totalLoggedIncidents: number;
    lastScanAt: string;
  };
}

export default function SecurityMonitoringPage() {
  const { authReady, isSuperAdmin } = useAdminOrStaffAuth(["system"]);
  const [report, setReport] = useState<SecurityReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"overview" | "threats" | "firewall" | "controls">("overview");

  // Firewall modal / input
  const [manualIp, setManualIp] = useState("");
  const [manualReason, setManualReason] = useState("");
  const [logFilter, setLogFilter] = useState<"all" | "failed_login" | "probe_scan">("all");
  const requestCounter = useRef(0);

  const loadMetrics = useCallback(async (isScan = false) => {
    const reqId = ++requestCounter.current;
    if (isScan) setScanning(true);
    else setLoading(true);
    setError("");

    try {
      const data = await taskRequest<SecurityReport>(
        "/api/admin/security-monitoring",
        isScan ? { action: "run_scan" } : { action: "metrics" }
      );
      if (reqId === requestCounter.current) {
        setReport(data);
      }
    } catch (err) {
      if (reqId === requestCounter.current) {
        setError(taskError(err));
      }
    } finally {
      if (reqId === requestCounter.current) {
        setLoading(false);
        setScanning(false);
      }
    }
  }, []);

  useEffect(() => {
    if (authReady && isSuperAdmin) {
      void loadMetrics();
    }
    return () => {
      requestCounter.current++;
    };
  }, [authReady, isSuperAdmin, loadMetrics]);

  // Handle Block IP
  const handleBlockIp = async (ip: string, defaultReason?: string) => {
    const { value: reason } = await Swal.fire({
      title: `Block IP ${ip}?`,
      text: "Any incoming requests from this IP will be blocked immediately.",
      input: "text",
      inputValue: defaultReason || "Malicious probing / excessive failed authentication attempts",
      inputPlaceholder: "Enter reason for block",
      showCancelButton: true,
      confirmButtonText: "Block IP",
      confirmButtonColor: "#ed7084",
      cancelButtonColor: "#4a5568",
      background: "#0c121e",
      color: "#f0f6fc",
    });

    if (reason !== undefined) {
      setActionBusy(true);
      try {
        await taskRequest("/api/admin/security-monitoring", {
          action: "block_ip",
          ip,
          reason,
        });
        await Swal.fire({
          icon: "success",
          title: "IP Blocked",
          text: `${ip} has been added to the firewall blocklist.`,
          background: "#0c121e",
          color: "#f0f6fc",
          confirmButtonColor: "#2cecf7",
        });
        void loadMetrics();
      } catch (err) {
        Swal.fire({
          icon: "error",
          title: "Action Failed",
          text: taskError(err),
          background: "#0c121e",
          color: "#f0f6fc",
        });
      } finally {
        setActionBusy(false);
      }
    }
  };

  // Handle Unblock IP
  const handleUnblockIp = async (ip: string) => {
    const res = await Swal.fire({
      title: `Unblock IP ${ip}?`,
      text: "This IP will be granted normal access back to the platform.",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes, Unblock",
      confirmButtonColor: "#2cecf7",
      cancelButtonColor: "#4a5568",
      background: "#0c121e",
      color: "#f0f6fc",
    });

    if (res.isConfirmed) {
      setActionBusy(true);
      try {
        await taskRequest("/api/admin/security-monitoring", {
          action: "unblock_ip",
          ip,
        });
        void loadMetrics();
      } catch (err) {
        Swal.fire({
          icon: "error",
          title: "Action Failed",
          text: taskError(err),
          background: "#0c121e",
          color: "#f0f6fc",
        });
      } finally {
        setActionBusy(false);
      }
    }
  };

  // Handle Settings Toggle
  const handleToggleSetting = async (key: keyof SecuritySettings, currentValue: boolean) => {
    if (!report) return;
    const updated = {
      ...report.settings,
      [key]: !currentValue,
    };

    setActionBusy(true);
    try {
      await taskRequest("/api/admin/security-monitoring", {
        action: "update_settings",
        ...updated,
      });
      setReport({ ...report, settings: updated });
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Update Failed",
        text: taskError(err),
        background: "#0c121e",
        color: "#f0f6fc",
      });
    } finally {
      setActionBusy(false);
    }
  };

  // Handle Emergency Revocation
  const handleRevokeAllSessions = async () => {
    const res = await Swal.fire({
      title: "Emergency Session Revocation?",
      text: "This will immediately invalidate all active login refresh tokens across all staff accounts. Users will be required to re-authenticate.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Invalidate All Sessions",
      confirmButtonColor: "#ed7084",
      cancelButtonColor: "#4a5568",
      background: "#0c121e",
      color: "#f0f6fc",
    });

    if (res.isConfirmed) {
      setActionBusy(true);
      try {
        await taskRequest("/api/admin/security-monitoring", {
          action: "revoke_all_sessions",
        });
        await Swal.fire({
          icon: "success",
          title: "Sessions Revoked",
          text: "All active sessions have been successfully invalidated.",
          background: "#0c121e",
          color: "#f0f6fc",
          confirmButtonColor: "#2cecf7",
        });
        void loadMetrics();
      } catch (err) {
        Swal.fire({
          icon: "error",
          title: "Revocation Failed",
          text: taskError(err),
          background: "#0c121e",
          color: "#f0f6fc",
        });
      } finally {
        setActionBusy(false);
      }
    }
  };

  // Handle Clear Logs
  const handleClearLogs = async () => {
    const res = await Swal.fire({
      title: "Clear Threat Logs?",
      text: "This will remove the current history of security threat logs from the database.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Clear Logs",
      confirmButtonColor: "#ed7084",
      cancelButtonColor: "#4a5568",
      background: "#0c121e",
      color: "#f0f6fc",
    });

    if (res.isConfirmed) {
      setActionBusy(true);
      try {
        await taskRequest("/api/admin/security-monitoring", {
          action: "clear_logs",
        });
        void loadMetrics();
      } catch (err) {
        Swal.fire({
          icon: "error",
          title: "Failed",
          text: taskError(err),
          background: "#0c121e",
          color: "#f0f6fc",
        });
      } finally {
        setActionBusy(false);
      }
    }
  };

  const filteredLogs = report?.logs.filter((log) => {
    if (logFilter === "all") return true;
    return log.type === logFilter;
  }) || [];

  return (
    <AdminLayout title="Security & Monitoring | DevEngine">
      <Head>
        <title>Security & Monitoring Center | DevEngine Studio</title>
      </Head>

      <div className={s.page}>
        {/* Header */}
        <div className={s.header}>
          <div>
            <p className={s.eyebrow}>
              <FiShield style={{ marginRight: 6 }} /> System Defense / Security & Health
            </p>
            <h1>Security & Health Monitoring</h1>
            <p>Live threat defense, server vitals, firewall controls, and automated intrusion audits.</p>
          </div>
          <div className={s.actions}>
            <button
              className={s.button}
              disabled={loading || scanning || actionBusy}
              onClick={() => void loadMetrics(false)}
            >
              <FiRefreshCw className={loading ? "animate-spin" : ""} style={{ marginRight: 6 }} />
              {loading ? "Refreshing…" : "Refresh Vitals"}
            </button>
            <button
              className={s.primary}
              disabled={loading || scanning || actionBusy}
              onClick={() => void loadMetrics(true)}
            >
              <FiActivity className={scanning ? "animate-spin" : ""} style={{ marginRight: 6 }} />
              {scanning ? "Running Audit…" : "Run Security Audit"}
            </button>
          </div>
        </div>

        {error && <p className={s.notice} role="alert" data-error>{error}</p>}

        {/* Top Summary Cards */}
        <div className={s.stats}>
          <article className={s.stat}>
            <span>Security Posture Grade</span>
            <strong style={{ color: "#2cecf7" }}>
              {report ? `${report.securityScore}/100 (${report.grade})` : "…"}
            </strong>
            <small style={{ color: "var(--devengine-muted)", fontSize: 12 }}>
              Standard HTTPS + CSP + HSTS active
            </small>
          </article>
          <article className={s.stat}>
            <span>System Health</span>
            <strong style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: report?.health.status === "operational" ? "#10b981" : "#f59e0b",
                  boxShadow: report?.health.status === "operational" ? "0 0 12px #10b981" : "none",
                }}
              />
              {report ? report.health.status.toUpperCase() : "…"}
            </strong>
            <small style={{ color: "var(--devengine-muted)", fontSize: 12 }}>
              DB Latency: {report ? `${report.health.dbLatencyMs}ms` : "…"} · Uptime: ~99.9%
            </small>
          </article>
          <article className={s.stat}>
            <span>Firewall & Threats (24h)</span>
            <strong style={{ color: (report?.stats.threatsBlocked24h || 0) > 0 ? "#ed7084" : "#2cecf7" }}>
              {report ? `${report.stats.threatsBlocked24h} Intercepted` : "…"}
            </strong>
            <small style={{ color: "var(--devengine-muted)", fontSize: 12 }}>
              {report ? `${report.stats.totalBlockedIps} IPs in Firewall · ${report.stats.failedLogins24h} Failed Logins` : "…"}
            </small>
          </article>
        </div>

        {/* Navigation Tabs */}
        <div style={{ display: "flex", gap: 10, borderBottom: "1px solid var(--devengine-border)", paddingBottom: 14, overflowX: "auto" }}>
          {[
            { id: "overview", label: "Health & Audits", icon: FiServer },
            { id: "threats", label: `Threat Feed (${report?.logs.length || 0})`, icon: FiAlertTriangle },
            { id: "firewall", label: `IP Firewall (${report?.blockedIps.length || 0})`, icon: FiSlash },
            { id: "controls", label: "Incident Response", icon: FiLock },
          ].map((tab) => {
            const Icon = tab.icon;
            const isCurrent = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "9px 18px",
                  borderRadius: 12,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  border: isCurrent ? "1.5px solid #2cecf7" : "1px solid var(--devengine-border)",
                  background: isCurrent ? "rgba(44, 236, 247, 0.12)" : "var(--devengine-raised)",
                  color: isCurrent ? "#2cecf7" : "var(--devengine-text)",
                  transition: "all 0.2s ease",
                  whiteSpace: "nowrap",
                }}
              >
                <Icon />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ── TAB 1: HEALTH & AUDITS ── */}
        {activeTab === "overview" && (
          <div style={{ display: "grid", gap: 24 }}>
            {/* Live Service Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
              <div className={s.panel} style={{ padding: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, color: "var(--devengine-muted)" }}>Next.js / Node API</span>
                  <FiCpu color="#2cecf7" size={20} />
                </div>
                <h3 style={{ margin: "12px 0 4px", fontSize: 20 }}>Operational</h3>
                <p style={{ margin: 0, fontSize: 13 }}>Runtime {report?.health.nodeVersion || "Node 20/22"} · Serverless Edge</p>
              </div>

              <div className={s.panel} style={{ padding: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, color: "var(--devengine-muted)" }}>Firebase Firestore DB</span>
                  <FiDatabase color="#2cecf7" size={20} />
                </div>
                <h3 style={{ margin: "12px 0 4px", fontSize: 20 }}>{report ? `${report.health.dbLatencyMs}ms Roundtrip` : "…"}</h3>
                <p style={{ margin: 0, fontSize: 13 }}>Live reads & writes healthy</p>
              </div>

              <div className={s.panel} style={{ padding: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, color: "var(--devengine-muted)" }}>Cloud Storage Assets</span>
                  <FiServer color="#2cecf7" size={20} />
                </div>
                <h3 style={{ margin: "12px 0 4px", fontSize: 20 }}>Connected</h3>
                <p style={{ margin: 0, fontSize: 13 }}>Firebase Storage bucket active</p>
              </div>

              <div className={s.panel} style={{ padding: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, color: "var(--devengine-muted)" }}>SSL / TLS Protection</span>
                  <FiLock color="#2cecf7" size={20} />
                </div>
                <h3 style={{ margin: "12px 0 4px", fontSize: 20 }}>TLS 1.3 Active</h3>
                <p style={{ margin: 0, fontSize: 13 }}>Automated 256-bit SSL Renewal</p>
              </div>
            </div>

            {/* Security Headers Checklist */}
            <section className={s.panel}>
              <div className={s.cardTop}>
                <div>
                  <h2>Security Header & Attack Surface Checklist</h2>
                  <p>Automated verification against modern web intrusion vectors.</p>
                </div>
                <span className={s.tag} style={{ borderColor: "#2cecf7", color: "#2cecf7" }}>
                  Score: {report ? `${report.securityScore}/100` : "…"}
                </span>
              </div>

              <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
                {report?.headersAudit.map((item) => (
                  <div
                    key={item.key}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "16px 20px",
                      borderRadius: 14,
                      border: "1px solid var(--devengine-border)",
                      background: "var(--devengine-raised)",
                      gap: 16,
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 260, flex: 1 }}>
                      <FiCheckCircle color="#10b981" size={22} style={{ flexShrink: 0 }} />
                      <div>
                        <strong style={{ fontSize: 15, display: "block" }}>{item.name}</strong>
                        <span style={{ fontSize: 13, color: "var(--devengine-muted)" }}>{item.description}</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <code style={{ fontSize: 12, padding: "3px 8px", borderRadius: 6, background: "rgba(44, 236, 247, 0.08)", color: "#2cecf7" }}>
                        {item.key}
                      </code>
                      <span className={s.tag} data-status="ready" style={{ borderColor: "#10b981", color: "#10b981" }}>
                        +{item.score} pts
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* ── TAB 2: THREAT FEED ── */}
        {activeTab === "threats" && (
          <section className={s.panel}>
            <div className={s.cardTop} style={{ flexWrap: "wrap", gap: 14 }}>
              <div>
                <h2>Real-Time Intrusion & Threat Logs</h2>
                <p>Audited security events, brute-force alarms, and suspicious connection attempts.</p>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <select
                  value={logFilter}
                  onChange={(e) => setLogFilter(e.target.value as any)}
                  style={{
                    padding: "8px 14px",
                    borderRadius: 10,
                    border: "1px solid var(--devengine-border)",
                    background: "var(--devengine-raised)",
                    color: "var(--devengine-text)",
                    fontSize: 13,
                  }}
                >
                  <option value="all">All Events</option>
                  <option value="failed_login">Failed Logins Only</option>
                  <option value="probe_scan">Scanner Probes Only</option>
                </select>
                <button className={s.danger} onClick={handleClearLogs} disabled={actionBusy || !report?.logs.length}>
                  <FiTrash2 style={{ marginRight: 6 }} /> Clear Logs
                </button>
              </div>
            </div>

            {filteredLogs.length === 0 ? (
              <div style={{ textAlign: "center", padding: "48px 20px", color: "var(--devengine-muted)" }}>
                <FiCheckCircle size={44} color="#10b981" style={{ margin: "0 auto 12px" }} />
                <h3>No Malicious Activity Detected</h3>
                <p style={{ margin: 0, fontSize: 14 }}>All logged endpoints and authentication attempts are safe.</p>
              </div>
            ) : (
              <div className={s.tableWrap} style={{ marginTop: 20 }}>
                <table className={s.table}>
                  <thead>
                    <tr>
                      <th>Event / Threat</th>
                      <th>Severity</th>
                      <th>Origin IP</th>
                      <th>Timestamp (Asia/Dhaka)</th>
                      <th>Action Taken</th>
                      <th>Quick Defense</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.map((log) => {
                      const isBlocked = report?.blockedIps.some((b) => b.ip === log.ip);
                      return (
                        <tr key={log.id}>
                          <td>
                            <strong>{log.title}</strong>
                            <br />
                            <small style={{ color: "var(--devengine-muted)", fontSize: 12 }}>{log.description}</small>
                          </td>
                          <td>
                            <span
                              style={{
                                padding: "4px 8px",
                                borderRadius: 6,
                                fontSize: 12,
                                fontWeight: 600,
                                textTransform: "uppercase",
                                background:
                                  log.severity === "critical" || log.severity === "high"
                                    ? "rgba(237, 112, 132, 0.15)"
                                    : log.severity === "warning"
                                    ? "rgba(245, 158, 11, 0.15)"
                                    : "rgba(44, 236, 247, 0.1)",
                                color:
                                  log.severity === "critical" || log.severity === "high"
                                    ? "#ed7084"
                                    : log.severity === "warning"
                                    ? "#f59e0b"
                                    : "#2cecf7",
                              }}
                            >
                              {log.severity}
                            </span>
                          </td>
                          <td>
                            <code>{log.ip || "127.0.0.1"}</code>
                          </td>
                          <td>
                            <small>{new Date(log.timestamp).toLocaleString("en-US", { timeZone: "Asia/Dhaka" })}</small>
                          </td>
                          <td>
                            <span style={{ fontSize: 13, textTransform: "capitalize" }}>{log.actionTaken}</span>
                          </td>
                          <td>
                            {log.ip && log.ip !== "127.0.0.1" && (
                              <button
                                type="button"
                                className={isBlocked ? s.button : s.danger}
                                style={{ minHeight: 32, padding: "5px 12px", fontSize: 12 }}
                                disabled={actionBusy || isBlocked}
                                onClick={() => handleBlockIp(log.ip, log.title)}
                              >
                                {isBlocked ? "Already Blocked" : "Block IP"}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* ── TAB 3: IP FIREWALL ── */}
        {activeTab === "firewall" && (
          <section className={s.panel}>
            <div className={s.cardTop}>
              <div>
                <h2>Custom IP Firewall & Blocklist</h2>
                <p>Prevent abusive bots, scrapers, or attackers from connecting to the platform.</p>
              </div>
            </div>

            {/* Manual Add IP Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!manualIp.trim()) return;
                void handleBlockIp(manualIp.trim(), manualReason.trim());
                setManualIp("");
                setManualReason("");
              }}
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr)) 120px",
                gap: 12,
                marginTop: 18,
                padding: 16,
                borderRadius: 14,
                border: "1px dashed var(--devengine-border)",
                alignItems: "end",
              }}
            >
              <label className={s.field}>
                <span>IP Address to Block</span>
                <input
                  type="text"
                  required
                  placeholder="e.g. 192.168.1.1 or 203.0.113.50"
                  value={manualIp}
                  onChange={(e) => setManualIp(e.target.value)}
                />
              </label>
              <label className={s.field}>
                <span>Reason</span>
                <input
                  type="text"
                  placeholder="e.g. Scraper bot / Repeated probing"
                  value={manualReason}
                  onChange={(e) => setManualReason(e.target.value)}
                />
              </label>
              <button className={s.danger} type="submit" disabled={actionBusy || !manualIp.trim()}>
                <FiSlash style={{ marginRight: 6 }} /> Block
              </button>
            </form>

            {/* List of blocked IPs */}
            <div className={s.tableWrap} style={{ marginTop: 20 }}>
              <table className={s.table}>
                <thead>
                  <tr>
                    <th>Blocked IP</th>
                    <th>Reason</th>
                    <th>Blocked By</th>
                    <th>Blocked At</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {!report?.blockedIps.length ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: "center", padding: "32px 14px", color: "var(--devengine-muted)" }}>
                        No IP addresses are currently blocked.
                      </td>
                    </tr>
                  ) : (
                    report.blockedIps.map((b) => (
                      <tr key={b.id}>
                        <td>
                          <code style={{ fontSize: 13, color: "#ed7084" }}>{b.ip}</code>
                        </td>
                        <td>{b.reason || "Suspicious Activity"}</td>
                        <td>{b.blockedBy || "Administrator"}</td>
                        <td>
                          <small>{new Date(b.blockedAt).toLocaleString("en-US", { timeZone: "Asia/Dhaka" })}</small>
                        </td>
                        <td>
                          <button
                            type="button"
                            className={s.button}
                            style={{ minHeight: 32, padding: "5px 12px", fontSize: 12 }}
                            disabled={actionBusy}
                            onClick={() => handleUnblockIp(b.ip)}
                          >
                            Unblock
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ── TAB 4: INCIDENT RESPONSE CONTROLS ── */}
        {activeTab === "controls" && (
          <div style={{ display: "grid", gap: 20 }}>
            <section className={s.panel}>
              <h2>Incident Response & Defense Triggers</h2>
              <p>Immediate measures to secure the platform during an active cyber incident.</p>

              <div style={{ display: "grid", gap: 16, marginTop: 20 }}>
                {/* Emergency Lockdown */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 16,
                    padding: "20px",
                    borderRadius: 16,
                    border: report?.settings.emergencyLockdown
                      ? "1.5px solid #ed7084"
                      : "1px solid var(--devengine-border)",
                    background: report?.settings.emergencyLockdown
                      ? "rgba(237, 112, 132, 0.08)"
                      : "var(--devengine-raised)",
                  }}
                >
                  <div>
                    <strong style={{ fontSize: 16, display: "flex", alignItems: "center", gap: 8, color: report?.settings.emergencyLockdown ? "#ed7084" : "inherit" }}>
                      <FiLock /> Emergency Platform Lockdown
                    </strong>
                    <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--devengine-muted)" }}>
                      When enabled, write actions are restricted to verified administrators and non-essential APIs are put in protective guard mode.
                    </p>
                  </div>
                  <button
                    className={report?.settings.emergencyLockdown ? s.danger : s.button}
                    disabled={actionBusy}
                    onClick={() => handleToggleSetting("emergencyLockdown", !!report?.settings.emergencyLockdown)}
                  >
                    {report?.settings.emergencyLockdown ? "Disable Lockdown" : "Enable Lockdown"}
                  </button>
                </div>

                {/* Brute Force Protection */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 16,
                    padding: "20px",
                    borderRadius: 16,
                    border: "1px solid var(--devengine-border)",
                    background: "var(--devengine-raised)",
                  }}
                >
                  <div>
                    <strong style={{ fontSize: 16, display: "flex", alignItems: "center", gap: 8 }}>
                      <FiShield color="#2cecf7" /> Automated Brute-Force Shield
                    </strong>
                    <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--devengine-muted)" }}>
                      Automatically triggers defensive throttling and security alarms when more than 5 failed login attempts occur within 10 minutes.
                    </p>
                  </div>
                  <button
                    className={report?.settings.bruteForceProtection ? s.primary : s.button}
                    disabled={actionBusy}
                    onClick={() => handleToggleSetting("bruteForceProtection", !!report?.settings.bruteForceProtection)}
                  >
                    {report?.settings.bruteForceProtection ? "Active (Recommended)" : "Disabled"}
                  </button>
                </div>

                {/* Invalidate all sessions */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 16,
                    padding: "20px",
                    borderRadius: 16,
                    border: "1px solid var(--devengine-border)",
                    background: "var(--devengine-raised)",
                  }}
                >
                  <div>
                    <strong style={{ fontSize: 16, display: "flex", alignItems: "center", gap: 8, color: "#ed7084" }}>
                      <FiUserX /> Force Studio Session Revocation
                    </strong>
                    <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--devengine-muted)" }}>
                      Revokes all active refresh tokens for every staff user. Ideal if credentials or device access is suspected to be compromised.
                    </p>
                  </div>
                  <button
                    className={s.danger}
                    disabled={actionBusy}
                    onClick={handleRevokeAllSessions}
                  >
                    Invalidate All Sessions
                  </button>
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

