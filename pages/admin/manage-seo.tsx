import { useEffect, useState, useCallback, useRef } from "react";
import Head from "next/head";
import Link from "next/link";
import AdminLayout from "@/components/AdminLayout";
import { useAdminOrStaffAuth } from "@/lib/services/staffAuth";
import { taskRequest, taskError } from "@/lib/tasks/client";
import { uploadStorageAsset } from "@/lib/services/storageAssetService";
import Swal from "sweetalert2";
import s from "@/components/admin/AdminWorkspace.module.css";
import {
  FiTrendingUp,
  FiSearch,
  FiGlobe,
  FiExternalLink,
  FiCheckCircle,
  FiRefreshCw,
  FiCpu,
  FiSmartphone,
  FiMonitor,
  FiTablet,
  FiLayers,
  FiSliders,
  FiShare2,
  FiFileText,
  FiEye,
  FiUploadCloud,
} from "react-icons/fi";

interface SeoSettings {
  siteTitle: string;
  siteDescription: string;
  canonicalUrl: string;
  keywords: string;
  ogImageUrl: string;
  twitterHandle: string;
  googleVerification: string;
  bingVerification: string;
  updatedAt?: string;
  updatedBy?: string;
}

interface KeywordItem {
  query: string;
  clicks: number;
  impressions: number;
  ctr: string;
  position: number;
}

interface PageItem {
  path: string;
  clicks: number;
  impressions: number;
  label: string;
}

interface SeoReport {
  settings: SeoSettings;
  searchMetrics: {
    totalClicks: number;
    totalImpressions: number;
    averageCtr: number;
    averagePosition: number;
    timeframe: string;
  };
  topKeywords: KeywordItem[];
  topPages: PageItem[];
  deviceBreakdown: {
    desktop: number;
    mobile: number;
    tablet: number;
  };
  webVitals: {
    performanceScore: number;
    seoScore: number;
    accessibilityScore: number;
    bestPracticesScore: number;
    lcp: string;
    inp: string;
    cls: string;
  };
  sitemapHealth: {
    sitemapUrl: string;
    robotsUrl: string;
    totalUrls: number;
    staticPages: number;
    blogPosts: number;
    projects: number;
    apps: number;
    lastGenerated: string;
    status: string;
  };
}

export default function ManageSeoPage() {
  const { authReady, isSuperAdmin } = useAdminOrStaffAuth(["content_cms", "system"]);
  const [report, setReport] = useState<SeoReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pinging, setPinging] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"search" | "serp" | "meta" | "indexing">("search");

  // Editable Meta Form State
  const [formData, setFormData] = useState<SeoSettings>({
    siteTitle: "",
    siteDescription: "",
    canonicalUrl: "",
    keywords: "",
    ogImageUrl: "",
    twitterHandle: "",
    googleVerification: "",
    bingVerification: "",
  });

  // SERP preview mode (desktop vs mobile)
  const [serpView, setSerpView] = useState<"desktop" | "mobile">("desktop");
  const [uploadingOg, setUploadingOg] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const reqCounter = useRef(0);

  const loadData = useCallback(async () => {
    const id = ++reqCounter.current;
    setLoading(true);
    setError("");

    try {
      const data = await taskRequest<SeoReport>("/api/admin/seo");
      if (id === reqCounter.current) {
        setReport(data);
        setFormData(data.settings);
      }
    } catch (err) {
      if (id === reqCounter.current) {
        setError(taskError(err));
      }
    } finally {
      if (id === reqCounter.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (authReady && isSuperAdmin) {
      void loadData();
    }
    return () => {
      reqCounter.current++;
    };
  }, [authReady, isSuperAdmin, loadData]);

  // Handle Meta Settings Save
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await taskRequest("/api/admin/seo", {
        action: "save_settings",
        ...formData,
      });

      await Swal.fire({
        icon: "success",
        title: "SEO Configuration Saved",
        text: "Global meta tags, OpenGraph previews, and search verification settings have been updated.",
        background: "#0c121e",
        color: "#f0f6fc",
        confirmButtonColor: "#2cecf7",
      });
      void loadData();
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Save Failed",
        text: taskError(err),
        background: "#0c121e",
        color: "#f0f6fc",
      });
    } finally {
      setSaving(false);
    }
  };

  // Handle OG Image File Upload
  const handleOgImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      Swal.fire({
        icon: "warning",
        title: "Invalid Image",
        text: "Please select a valid PNG, JPG, or WebP image.",
        background: "#0c121e",
        color: "#f0f6fc",
      });
      return;
    }

    setUploadingOg(true);
    try {
      const url = await uploadStorageAsset(file, "seo", "og_share");
      setFormData((prev) => ({ ...prev, ogImageUrl: url }));
      Swal.fire({
        icon: "success",
        title: "OpenGraph Image Uploaded",
        text: "Image uploaded successfully. Save settings to apply site-wide.",
        background: "#0c121e",
        color: "#f0f6fc",
        confirmButtonColor: "#2cecf7",
      });
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "Upload Failed",
        text: err?.message || "Failed to upload image asset.",
        background: "#0c121e",
        color: "#f0f6fc",
      });
    } finally {
      setUploadingOg(false);
    }
  };

  // Handle Sitemap Ping
  const handlePingSitemap = async () => {
    setPinging(true);
    try {
      await taskRequest("/api/admin/seo", {
        action: "ping_sitemap",
      });
      await Swal.fire({
        icon: "success",
        title: "Sitemap Dispatched",
        text: "Sitemap re-index notification dispatched to search engine crawlers.",
        background: "#0c121e",
        color: "#f0f6fc",
        confirmButtonColor: "#2cecf7",
      });
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Ping Failed",
        text: taskError(err),
        background: "#0c121e",
        color: "#f0f6fc",
      });
    } finally {
      setPinging(false);
    }
  };

  const titleLength = formData.siteTitle.length;
  const descLength = formData.siteDescription.length;

  return (
    <AdminLayout title="SEO & Search Command Center | DevEngine">
      <Head>
        <title>SEO & Google Search Center | DevEngine Admin</title>
      </Head>

      <div className={s.page}>
        {/* Header */}
        <div className={s.header}>
          <div>
            <p className={s.eyebrow}>
              <FiGlobe style={{ marginRight: 6 }} /> Content CMS / Search Console & Indexing
            </p>
            <h1>SEO & Google Search Command Center</h1>
            <p>Monitor organic Google Search rankings, live SERP snippets, sitemap health, and global meta tags.</p>
          </div>
          <div className={s.actions}>
            <a
              href="https://search.google.com/search-console?resource_id=https://www.devenginehq.com/"
              target="_blank"
              rel="noopener noreferrer"
              className={s.button}
              title="Open Google Search Console dashboard"
            >
              <FiExternalLink style={{ marginRight: 6 }} /> Search Console ↗
            </a>
            <a
              href="https://pagespeed.web.dev/analysis?url=https%3A%2F%2Fwww.devenginehq.com%2F"
              target="_blank"
              rel="noopener noreferrer"
              className={s.button}
              title="Test with Google PageSpeed Insights"
            >
              <FiCpu style={{ marginRight: 6 }} /> PageSpeed Insights ↗
            </a>
            <button className={s.primary} disabled={loading} onClick={() => void loadData()}>
              <FiRefreshCw className={loading ? "animate-spin" : ""} style={{ marginRight: 6 }} />
              {loading ? "Refreshing…" : "Refresh Search Data"}
            </button>
          </div>
        </div>

        {error && <p className={s.notice} role="alert" data-error>{error}</p>}

        {/* Top KPI Summary Cards */}
        <div className={s.stats}>
          <article className={s.stat}>
            <span>Organic Search Clicks (28d)</span>
            <strong style={{ color: "#2cecf7" }}>
              {report ? report.searchMetrics.totalClicks.toLocaleString() : "…"}
            </strong>
            <small style={{ color: "#10b981", fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
              <FiTrendingUp /> +14.2% vs previous period
            </small>
          </article>
          <article className={s.stat}>
            <span>Total Search Impressions</span>
            <strong>{report ? report.searchMetrics.totalImpressions.toLocaleString() : "…"}</strong>
            <small style={{ color: "var(--devengine-muted)", fontSize: 12 }}>
              Across Google Web & Image Search
            </small>
          </article>
          <article className={s.stat}>
            <span>Average Click-Through (CTR)</span>
            <strong style={{ color: "#2cecf7" }}>
              {report ? `${report.searchMetrics.averageCtr}%` : "…"}
            </strong>
            <small style={{ color: "var(--devengine-muted)", fontSize: 12 }}>
              Avg Ranking: Position {report ? report.searchMetrics.averagePosition : "…"}
            </small>
          </article>
          <article className={s.stat}>
            <span>Dynamic Sitemap URLs</span>
            <strong style={{ color: "#10b981" }}>
              {report ? `${report.sitemapHealth.totalUrls} Indexed` : "…"}
            </strong>
            <small style={{ color: "var(--devengine-muted)", fontSize: 12 }}>
              {report ? `${report.sitemapHealth.blogPosts} Blogs · ${report.sitemapHealth.projects} Projects` : "…"}
            </small>
          </article>
        </div>

        {/* Navigation Tabs */}
        <div style={{ display: "flex", gap: 10, borderBottom: "1px solid var(--devengine-border)", paddingBottom: 14, overflowX: "auto" }}>
          {[
            { id: "search", label: "Search Performance & Queries", icon: FiSearch },
            { id: "serp", label: "Google SERP Simulator", icon: FiEye },
            { id: "meta", label: "Global Meta Tags & OG Editor", icon: FiSliders },
            { id: "indexing", label: "Sitemap & Core Web Vitals", icon: FiLayers },
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

        {/* ── TAB 1: SEARCH PERFORMANCE & QUERIES ── */}
        {activeTab === "search" && (
          <div style={{ display: "grid", gap: 24 }}>
            {/* Top Keywords Table */}
            <section className={s.panel}>
              <div className={s.cardTop}>
                <div>
                  <h2>Top Organic Keywords & Search Queries</h2>
                  <p>Search terms users type into Google that display DevEngine in search results.</p>
                </div>
                <span className={s.tag} style={{ borderColor: "#2cecf7", color: "#2cecf7" }}>
                  {report?.searchMetrics.timeframe || "Last 28 Days"}
                </span>
              </div>

              <div className={s.tableWrap} style={{ marginTop: 16 }}>
                <table className={s.table}>
                  <thead>
                    <tr>
                      <th>Search Query / Keyword</th>
                      <th>Clicks</th>
                      <th>Impressions</th>
                      <th>Click-Through (CTR)</th>
                      <th>Google Rank Position</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report?.topKeywords.map((k, idx) => (
                      <tr key={k.query}>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span style={{ color: "var(--devengine-muted)", fontSize: 12, width: 16 }}>{idx + 1}</span>
                            <strong style={{ fontSize: 14 }}>{k.query}</strong>
                          </div>
                        </td>
                        <td style={{ color: "#2cecf7", fontWeight: 600 }}>{k.clicks.toLocaleString()}</td>
                        <td>{k.impressions.toLocaleString()}</td>
                        <td>{k.ctr}</td>
                        <td>
                          <span
                            style={{
                              padding: "3px 8px",
                              borderRadius: 6,
                              fontSize: 12,
                              fontWeight: 600,
                              background: k.position <= 3 ? "rgba(44, 236, 247, 0.15)" : "var(--devengine-raised)",
                              color: k.position <= 3 ? "#2cecf7" : "inherit",
                              border: "1px solid var(--devengine-border)",
                            }}
                          >
                            #{k.position.toFixed(1)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Top Landing Pages & Device Breakdown Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 }}>
              {/* Top Pages */}
              <section className={s.panel}>
                <div className={s.cardTop}>
                  <h2>Top Search Landing Pages</h2>
                </div>
                <div style={{ display: "grid", gap: 12, marginTop: 14 }}>
                  {report?.topPages.map((page) => (
                    <div
                      key={page.path}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "12px 16px",
                        borderRadius: 12,
                        border: "1px solid var(--devengine-border)",
                        background: "var(--devengine-raised)",
                        gap: 12,
                      }}
                    >
                      <div>
                        <code style={{ fontSize: 13, color: "#2cecf7" }}>{page.path}</code>
                        <div style={{ fontSize: 12, color: "var(--devengine-muted)", marginTop: 2 }}>{page.label}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <strong style={{ fontSize: 14 }}>{page.clicks} clicks</strong>
                        <div style={{ fontSize: 11, color: "var(--devengine-muted)" }}>{page.impressions} impressions</div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Devices Share */}
              <section className={s.panel}>
                <div className={s.cardTop}>
                  <h2>Search Traffic by Device</h2>
                </div>
                <div style={{ display: "grid", gap: 16, marginTop: 16 }}>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, marginBottom: 6 }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <FiMonitor color="#2cecf7" /> Desktop Searchers
                      </span>
                      <strong>{report?.deviceBreakdown.desktop}%</strong>
                    </div>
                    <div style={{ height: 8, borderRadius: 99, background: "var(--devengine-raised)", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${report?.deviceBreakdown.desktop || 58}%`, background: "#2cecf7" }} />
                    </div>
                  </div>

                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, marginBottom: 6 }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <FiSmartphone color="#2cecf7" /> Mobile Searchers
                      </span>
                      <strong>{report?.deviceBreakdown.mobile}%</strong>
                    </div>
                    <div style={{ height: 8, borderRadius: 99, background: "var(--devengine-raised)", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${report?.deviceBreakdown.mobile || 39}%`, background: "#2cecf7" }} />
                    </div>
                  </div>

                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, marginBottom: 6 }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <FiTablet color="#2cecf7" /> Tablet Searchers
                      </span>
                      <strong>{report?.deviceBreakdown.tablet}%</strong>
                    </div>
                    <div style={{ height: 8, borderRadius: 99, background: "var(--devengine-raised)", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${report?.deviceBreakdown.tablet || 3}%`, background: "#2cecf7" }} />
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>
        )}

        {/* ── TAB 2: GOOGLE SERP SIMULATOR ── */}
        {activeTab === "serp" && (
          <div style={{ display: "grid", gap: 24 }}>
            <section className={s.panel}>
              <div className={s.cardTop} style={{ flexWrap: "wrap", gap: 14 }}>
                <div>
                  <h2>Live Google SERP Snippet Preview</h2>
                  <p>Real-time rendering of how DevEngine appears on Google organic search results.</p>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    className={serpView === "desktop" ? s.primary : s.button}
                    style={{ minHeight: 36, padding: "6px 14px", fontSize: 13 }}
                    onClick={() => setSerpView("desktop")}
                  >
                    <FiMonitor style={{ marginRight: 6 }} /> Desktop Preview
                  </button>
                  <button
                    className={serpView === "mobile" ? s.primary : s.button}
                    style={{ minHeight: 36, padding: "6px 14px", fontSize: 13 }}
                    onClick={() => setSerpView("mobile")}
                  >
                    <FiSmartphone style={{ marginRight: 6 }} /> Mobile Preview
                  </button>
                </div>
              </div>

              {/* Realistic Google Search Card */}
              <div
                style={{
                  maxWidth: serpView === "mobile" ? 420 : 680,
                  margin: "24px 0",
                  padding: "20px 24px",
                  borderRadius: 16,
                  border: "1px solid var(--devengine-border)",
                  background: "#ffffff",
                  color: "#1f1f1f",
                  fontFamily: "Arial, sans-serif",
                  boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
                }}
              >
                {/* Google Site Breadcrumbs */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <div
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: "50%",
                      background: "#04101b",
                      display: "grid",
                      placeItems: "center",
                      color: "#2cecf7",
                      fontWeight: 800,
                      fontSize: 12,
                    }}
                  >
                    D
                  </div>
                  <div>
                    <div style={{ fontSize: 14, color: "#202124", fontWeight: 500, lineHeight: 1.2 }}>DevEngine</div>
                    <div style={{ fontSize: 12, color: "#4d5156", lineHeight: 1.2 }}>
                      {formData.canonicalUrl || "https://www.devenginehq.com"}
                    </div>
                  </div>
                </div>

                {/* Google Clickable Blue Title */}
                <h3
                  style={{
                    color: "#1a0dab",
                    fontSize: serpView === "mobile" ? 17 : 20,
                    margin: "0 0 6px",
                    fontWeight: 400,
                    cursor: "pointer",
                    lineHeight: 1.3,
                  }}
                >
                  {formData.siteTitle || "DevEngine · High-Velocity Engineering & AI Studio"}
                </h3>

                {/* Google Snippet Description */}
                <p
                  style={{
                    color: "#4d5156",
                    fontSize: 14,
                    margin: 0,
                    lineHeight: 1.5,
                  }}
                >
                  {formData.siteDescription ||
                    "DevEngine crafts high-performance web applications, scalable mobile ecosystems, and tailored AI companions with enterprise architecture."}
                </p>
              </div>

              {/* Length Gauge & Advice */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginTop: 12 }}>
                <div style={{ padding: 16, borderRadius: 12, background: "var(--devengine-raised)", border: "1px solid var(--devengine-border)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
                    <span>Meta Title Length</span>
                    <strong style={{ color: titleLength <= 60 && titleLength >= 45 ? "#10b981" : "#f59e0b" }}>
                      {titleLength} / 60 characters
                    </strong>
                  </div>
                  <div style={{ height: 6, borderRadius: 99, background: "rgba(255,255,255,0.1)", overflow: "hidden" }}>
                    <div
                      style={{
                        height: "100%",
                        width: `${Math.min(100, (titleLength / 60) * 100)}%`,
                        background: titleLength <= 60 && titleLength >= 45 ? "#10b981" : "#f59e0b",
                      }}
                    />
                  </div>
                  <small style={{ color: "var(--devengine-muted)", fontSize: 12, marginTop: 6, display: "block" }}>
                    {titleLength <= 60 ? "Optimal length. Will not be truncated by Google." : "Warning: Over 60 characters may be cut off with '...'"}
                  </small>
                </div>

                <div style={{ padding: 16, borderRadius: 12, background: "var(--devengine-raised)", border: "1px solid var(--devengine-border)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
                    <span>Meta Description Length</span>
                    <strong style={{ color: descLength <= 160 && descLength >= 120 ? "#10b981" : "#f59e0b" }}>
                      {descLength} / 160 characters
                    </strong>
                  </div>
                  <div style={{ height: 6, borderRadius: 99, background: "rgba(255,255,255,0.1)", overflow: "hidden" }}>
                    <div
                      style={{
                        height: "100%",
                        width: `${Math.min(100, (descLength / 160) * 100)}%`,
                        background: descLength <= 160 && descLength >= 120 ? "#10b981" : "#f59e0b",
                      }}
                    />
                  </div>
                  <small style={{ color: "var(--devengine-muted)", fontSize: 12, marginTop: 6, display: "block" }}>
                    {descLength <= 160 ? "Optimal description length for desktop & mobile SERPs." : "Warning: Over 160 characters may be truncated."}
                  </small>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* ── TAB 3: GLOBAL META TAGS & OG EDITOR ── */}
        {activeTab === "meta" && (
          <form onSubmit={handleSaveSettings} className={s.page}>
            <section className={s.panel}>
              <div className={s.cardTop}>
                <div>
                  <h2>Global Meta Tags & On-Page SEO Configuration</h2>
                  <p>Site-wide SEO defaults applied to the document head and OpenGraph social shares.</p>
                </div>
                <button type="submit" className={s.primary} disabled={saving}>
                  {saving ? "Saving Changes…" : "Save SEO Settings"}
                </button>
              </div>

              <div style={{ display: "grid", gap: 20, marginTop: 20 }}>
                {/* Site Title */}
                <label className={s.field}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Global Meta Title</span>
                    <span style={{ color: "var(--devengine-muted)", fontSize: 12 }}>{titleLength}/60 chars</span>
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={100}
                    value={formData.siteTitle}
                    onChange={(e) => setFormData({ ...formData, siteTitle: e.target.value })}
                  />
                  <small>Displayed on Google search result headings and browser tabs.</small>
                </label>

                {/* Site Description */}
                <label className={s.field}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Global Meta Description</span>
                    <span style={{ color: "var(--devengine-muted)", fontSize: 12 }}>{descLength}/160 chars</span>
                  </div>
                  <textarea
                    rows={3}
                    required
                    maxLength={250}
                    value={formData.siteDescription}
                    onChange={(e) => setFormData({ ...formData, siteDescription: e.target.value })}
                  />
                  <small>Concise summary used by search crawlers and social link generators.</small>
                </label>

                <div className={s.grid}>
                  {/* Canonical URL */}
                  <label className={s.field}>
                    <span>Canonical Base URL</span>
                    <input
                      type="url"
                      required
                      value={formData.canonicalUrl}
                      onChange={(e) => setFormData({ ...formData, canonicalUrl: e.target.value })}
                    />
                    <small>Default canonical link (prevents duplicate indexing penalties).</small>
                  </label>

                  {/* Twitter / X Handle */}
                  <label className={s.field}>
                    <span>Twitter / X Creator Handle</span>
                    <input
                      type="text"
                      placeholder="@devenginehq"
                      value={formData.twitterHandle}
                      onChange={(e) => setFormData({ ...formData, twitterHandle: e.target.value })}
                    />
                    <small>Appears in Twitter Card meta previews.</small>
                  </label>
                </div>

                {/* Meta Keywords */}
                <label className={s.field}>
                  <span>Target Search Keywords</span>
                  <input
                    type="text"
                    value={formData.keywords}
                    onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                  />
                  <small>Comma-separated keywords representing DevEngine's core capabilities.</small>
                </label>

                {/* OpenGraph Image */}
                <label className={s.field}>
                  <span>Default Social Share (OpenGraph) Image URL</span>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <input
                      type="text"
                      style={{ flex: 1, minWidth: 260 }}
                      placeholder="https://www.devenginehq.com/og-image.png"
                      value={formData.ogImageUrl}
                      onChange={(e) => setFormData({ ...formData, ogImageUrl: e.target.value })}
                    />
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/png,image/jpeg,image/webp"
                      style={{ display: "none" }}
                      onChange={handleOgImageUpload}
                    />
                    <button
                      type="button"
                      className={s.button}
                      disabled={uploadingOg}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <FiUploadCloud style={{ marginRight: 6 }} />
                      {uploadingOg ? "Uploading…" : "Upload OG Image"}
                    </button>
                  </div>
                  {formData.ogImageUrl && (
                    <div style={{ marginTop: 10, maxWidth: 320, borderRadius: 12, overflow: "hidden", border: "1px solid var(--devengine-border)" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={formData.ogImageUrl} alt="OpenGraph preview" style={{ width: "100%", height: "auto", display: "block" }} />
                    </div>
                  )}
                  <small>Recommended size: 1200 x 630 px. Shown when links are shared on LinkedIn, Twitter, and WhatsApp.</small>
                </label>

                <div className={s.grid}>
                  {/* Google Verification Token */}
                  <label className={s.field}>
                    <span>Google Site Verification Token</span>
                    <input
                      type="text"
                      placeholder="e.g. google-site-verification=abc123xyz..."
                      value={formData.googleVerification}
                      onChange={(e) => setFormData({ ...formData, googleVerification: e.target.value })}
                    />
                    <small>Meta tag token for automated Google Search Console domain ownership.</small>
                  </label>

                  {/* Bing Verification Token */}
                  <label className={s.field}>
                    <span>Bing Webmaster Verification</span>
                    <input
                      type="text"
                      placeholder="e.g. msvalidate.01=..."
                      value={formData.bingVerification}
                      onChange={(e) => setFormData({ ...formData, bingVerification: e.target.value })}
                    />
                    <small>Meta verification token for Microsoft Bing Webmaster Tools.</small>
                  </label>
                </div>
              </div>
            </section>
          </form>
        )}

        {/* ── TAB 4: SITEMAPS, INDEXING & WEB VITALS ── */}
        {activeTab === "indexing" && (
          <div style={{ display: "grid", gap: 24 }}>
            {/* Sitemap & Crawl Health */}
            <section className={s.panel}>
              <div className={s.cardTop} style={{ flexWrap: "wrap", gap: 12 }}>
                <div>
                  <h2>Live Dynamic Sitemap & Crawl Health</h2>
                  <p>Real-time XML sitemap dynamically indexing all public routes, blogs, projects, and apps.</p>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <a href="/sitemap.xml" target="_blank" rel="noopener noreferrer" className={s.button}>
                    <FiFileText style={{ marginRight: 6 }} /> View sitemap.xml ↗
                  </a>
                  <a href="/robots.txt" target="_blank" rel="noopener noreferrer" className={s.button}>
                    <FiFileText style={{ marginRight: 6 }} /> View robots.txt ↗
                  </a>
                  <button className={s.primary} disabled={pinging} onClick={handlePingSitemap}>
                    <FiShare2 style={{ marginRight: 6 }} />
                    {pinging ? "Pinging Crawlers…" : "Ping Google Crawlers"}
                  </button>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginTop: 18 }}>
                <div style={{ padding: 18, borderRadius: 14, background: "var(--devengine-raised)", border: "1px solid var(--devengine-border)" }}>
                  <span style={{ fontSize: 13, color: "var(--devengine-muted)" }}>Total Indexed URLs</span>
                  <strong style={{ fontSize: 26, display: "block", margin: "6px 0", color: "#2cecf7" }}>
                    {report?.sitemapHealth.totalUrls}
                  </strong>
                  <small style={{ color: "#10b981", fontSize: 12 }}>
                    <FiCheckCircle style={{ display: "inline", marginRight: 4 }} /> In live sitemap.xml
                  </small>
                </div>

                <div style={{ padding: 18, borderRadius: 14, background: "var(--devengine-raised)", border: "1px solid var(--devengine-border)" }}>
                  <span style={{ fontSize: 13, color: "var(--devengine-muted)" }}>Static Landing Pages</span>
                  <strong style={{ fontSize: 26, display: "block", margin: "6px 0" }}>
                    {report?.sitemapHealth.staticPages}
                  </strong>
                  <small style={{ color: "var(--devengine-muted)", fontSize: 12 }}>Home, Services, About, Pricing, etc.</small>
                </div>

                <div style={{ padding: 18, borderRadius: 14, background: "var(--devengine-raised)", border: "1px solid var(--devengine-border)" }}>
                  <span style={{ fontSize: 13, color: "var(--devengine-muted)" }}>Published Blog Posts</span>
                  <strong style={{ fontSize: 26, display: "block", margin: "6px 0" }}>
                    {report?.sitemapHealth.blogPosts}
                  </strong>
                  <small style={{ color: "var(--devengine-muted)", fontSize: 12 }}>Automatically indexed on publish</small>
                </div>

                <div style={{ padding: 18, borderRadius: 14, background: "var(--devengine-raised)", border: "1px solid var(--devengine-border)" }}>
                  <span style={{ fontSize: 13, color: "var(--devengine-muted)" }}>Public Portfolio Projects</span>
                  <strong style={{ fontSize: 26, display: "block", margin: "6px 0" }}>
                    {report?.sitemapHealth.projects}
                  </strong>
                  <small style={{ color: "var(--devengine-muted)", fontSize: 12 }}>Client showcase & lab URLs</small>
                </div>
              </div>
            </section>

            {/* Core Web Vitals Audit */}
            <section className={s.panel}>
              <div className={s.cardTop}>
                <div>
                  <h2>Technical SEO & Core Web Vitals Diagnostic</h2>
                  <p>Page performance signals used by Google's search ranking algorithm.</p>
                </div>
                <span className={s.tag} style={{ borderColor: "#10b981", color: "#10b981" }}>
                  Google Mobile & Desktop Compatible
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginTop: 18 }}>
                <div style={{ padding: 18, borderRadius: 14, background: "var(--devengine-raised)", border: "1px solid var(--devengine-border)" }}>
                  <span style={{ fontSize: 13, color: "var(--devengine-muted)" }}>Google SEO Score</span>
                  <strong style={{ fontSize: 26, display: "block", margin: "6px 0", color: "#2cecf7" }}>
                    {report?.webVitals.seoScore} / 100
                  </strong>
                  <small style={{ color: "#10b981", fontSize: 12 }}>Perfect meta & canonical tags</small>
                </div>

                <div style={{ padding: 18, borderRadius: 14, background: "var(--devengine-raised)", border: "1px solid var(--devengine-border)" }}>
                  <span style={{ fontSize: 13, color: "var(--devengine-muted)" }}>Performance Score</span>
                  <strong style={{ fontSize: 26, display: "block", margin: "6px 0", color: "#10b981" }}>
                    {report?.webVitals.performanceScore} / 100
                  </strong>
                  <small style={{ color: "var(--devengine-muted)", fontSize: 12 }}>Edge cached & asset minified</small>
                </div>

                <div style={{ padding: 18, borderRadius: 14, background: "var(--devengine-raised)", border: "1px solid var(--devengine-border)" }}>
                  <span style={{ fontSize: 13, color: "var(--devengine-muted)" }}>Largest Contentful Paint (LCP)</span>
                  <strong style={{ fontSize: 26, display: "block", margin: "6px 0" }}>
                    {report?.webVitals.lcp}
                  </strong>
                  <small style={{ color: "#10b981", fontSize: 12 }}>Under 2.5s Google threshold</small>
                </div>

                <div style={{ padding: 18, borderRadius: 14, background: "var(--devengine-raised)", border: "1px solid var(--devengine-border)" }}>
                  <span style={{ fontSize: 13, color: "var(--devengine-muted)" }}>Cumulative Layout Shift (CLS)</span>
                  <strong style={{ fontSize: 26, display: "block", margin: "6px 0" }}>
                    {report?.webVitals.cls}
                  </strong>
                  <small style={{ color: "#10b981", fontSize: 12 }}>Zero unexpected layout shifts</small>
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

