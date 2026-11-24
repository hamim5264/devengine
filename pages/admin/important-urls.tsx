import Head from "next/head";
import { useEffect, useMemo, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import HelixLoader from "@/components/HelixLoader";
import styles from "@/components/admin/ImportantUrls.module.css";
import { useAdminOrStaffAuth } from "@/lib/services/staffAuth";

const PRODUCTION_ORIGIN = "https://www.devenginehq.com";

const LINKS = [
  { key: "super-admin", label: "Super-admin sign in", description: "Secure owner access to the DevEngine admin console.", path: "/login", icon: "admin_panel_settings" },
  { key: "sub-admin", label: "Sub-admin sign in", description: "Sub-admins use the same secure sign-in and open only their granted modules.", path: "/login", icon: "manage_accounts" },
  { key: "employee", label: "Employee portal", description: "Dedicated sign-in page for employee accounts and workspaces.", path: "/employee/login", icon: "badge" },
  { key: "staff", label: "Staff workspace", description: "Team workspace sign-in for staff dashboards, tasks, and notices.", path: "/staff/login", icon: "groups" },
  { key: "customer", label: "Marketplace customer account", description: "Customer sign-in and registration for purchases, favorites, and deliveries.", path: "/landing-page-designs/account", icon: "account_circle" },
  { key: "client", label: "Client project portal", description: "Project overview access. Share the matching project link and access details with each client.", path: "/project-overview", icon: "folder_shared" },
] as const;

export default function ImportantUrlsPage() {
  const { authReady, isAuthorized } = useAdminOrStaffAuth(["system"]);
  const [copied, setCopied] = useState("");

  useEffect(() => {
    if (!copied) return;
    const timeout = window.setTimeout(() => setCopied(""), 2400);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  const links = useMemo(() => LINKS.map((item) => ({ ...item, url: `${PRODUCTION_ORIGIN}${item.path}` })), []);
  const copy = async (value: string, key: string) => {
    try { await navigator.clipboard.writeText(value); setCopied(key); }
    catch { setCopied("copy-error"); }
  };
  const copyAll = () => void copy(links.map((item) => `${item.label}: ${item.url}`).join("\n"), "all");

  if (!authReady || !isAuthorized) return <main className="min-h-screen grid place-items-center bg-[var(--devengine-page)]"><HelixLoader size={48} color="#2cecf7" /></main>;

  return <AdminLayout title="Important URLs | DevEngine Admin">
    <Head><title>Important URLs | DevEngine Admin</title><meta name="robots" content="noindex" /></Head>
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid gap-6">
        <header className={styles.hero}>
          <div>
            <p className={styles.eyebrow}>System / Quick access</p>
            <h1>Important URLs</h1>
            <p>Keep every essential sign-in and portal address in one reliable place. These are always production links for devenginehq.com.</p>
            <span className={styles.domain}><span className="material-symbols-outlined">language</span>Production · www.devenginehq.com</span>
          </div>
          <button type="button" className={styles.copyAll} onClick={copyAll}><span className="material-symbols-outlined">content_copy</span>{copied === "all" ? "Copied all URLs" : "Copy all URLs"}</button>
        </header>

        <section className={styles.grid} aria-label="Important system links">
          {links.map((item, index) => <article className={styles.card} key={item.key}>
            <span className={styles.cardNumber}>{String(index + 1).padStart(2, "0")}</span>
            <div className={styles.cardTop}>
              <span className={styles.icon}><span className="material-symbols-outlined">{item.icon}</span></span>
              <div><h2>{item.label}</h2><p>{item.description}</p></div>
            </div>
            <div className={styles.urlBlock}><span className={styles.urlLabel}>Production URL</span><code className={styles.url} title={item.url}>{item.url}</code></div>
            <div className={styles.actions}>
              <a className={styles.open} href={item.url} target="_blank" rel="noreferrer">Open link <span className="material-symbols-outlined">open_in_new</span></a>
              <button type="button" className={styles.copy} onClick={() => void copy(item.url, item.key)} aria-label={`Copy ${item.label} URL`}><span className="material-symbols-outlined">{copied === item.key ? "check" : "content_copy"}</span>{copied === item.key ? "Copied" : "Copy URL"}</button>
            </div>
          </article>)}
        </section>

        <aside className={styles.note}><span className="material-symbols-outlined">verified_user</span><span><strong>Access stays protected.</strong> A direct link only opens the correct sign-in or portal page; permissions, role checks, and client access controls still apply after sign-in.</span></aside>
        {copied === "copy-error" && <p className={styles.status} role="status">Clipboard access was unavailable. Select the URL above and copy it manually.</p>}
      </div>
    </main>
  </AdminLayout>;
}
