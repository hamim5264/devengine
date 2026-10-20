import { useState, type ReactNode } from "react";
import Head from "next/head";
import Link from "next/link";
import HeaderControls from "@/components/HeaderControls";
import LandingFooter from "@/components/landing/LandingFooter";
import HelixLoader from "@/components/HelixLoader";
import MarkdownViewer from "@/components/MarkdownViewer";
import type { AppPolicy } from "@/types/appLegal";
import s from "./AppLegal.module.css";

export const AppLegalIcon = ({ children }: { children: string }) => <span className="material-symbols-outlined" aria-hidden="true">{children}</span>;
type Page = "showcase" | "privacy" | "terms" | "deletion";
const sections: { page: Page; path: string; title: string; icon: string }[] = [
  { page: "showcase", path: "", title: "App overview", icon: "apps" },
  { page: "privacy", path: "/privacy-policy", title: "Privacy policy", icon: "privacy_tip" },
  { page: "terms", path: "/terms", title: "Terms & conditions", icon: "description" },
  { page: "deletion", path: "/data-deletion", title: "Data deletion", icon: "manage_accounts" },
];
export function AppLegalState({ loading = false, title }: { loading?: boolean; title?: string }) {
  if (loading) {
    return (
      <div className={s.page}>
        <div className={s.state}>
          <HelixLoader color="#2cecf7" size={44} />
          <p>Loading app details…</p>
        </div>
      </div>
    );
  }

  return (
    <div className={s.page}>
      <header className={`${s.header} navbar app-legal-navbar`}>
        <div className={s.headerInner}>
          <Link className={s.back} href="/home">
            <AppLegalIcon>arrow_back</AppLegalIcon>
            <span>DevEngine</span>
          </Link>
          <div className={s.headerActions}>
            <HeaderControls />
          </div>
        </div>
      </header>
      <div className={s.state}>
        <AppLegalIcon>search_off</AppLegalIcon>
        <h1>{title || "This page is unavailable."}</h1>
        <p>The app or document could not be found.</p>
        <Link href="/home" className={s.primary}>
          Return to DevEngine
          <AppLegalIcon>arrow_forward</AppLegalIcon>
        </Link>
      </div>
    </div>
  );
}
export function AppLegalShell({ app, page, children, copied, onCopy, onPrint }: { app: AppPolicy; page: Page; children: ReactNode; copied?: boolean; onCopy?: () => void; onPrint?: () => void }) {
  const section = sections.find(item => item.page === page)!;
  const title = page === "showcase" ? app.appName : section.title;
  return <div className={s.page}>
    <Head><title>{page === "showcase" ? app.appName : `${section.title} · ${app.appName}`} | DevEngine</title><meta name="description" content={page === "showcase" ? app.appSubtitle || `Explore ${app.appName}, its store links, and app policies.` : `${section.title} for ${app.appName}. App details, policies, and support from DevEngine.`} /><meta name="viewport" content="width=device-width, initial-scale=1" /></Head>
    <header className={`${s.header} navbar app-legal-navbar`}><div className={s.headerInner}>
      <Link className={s.back} href={page === "showcase" ? "/home" : `/apps/${app.slug}`}><AppLegalIcon>arrow_back</AppLegalIcon><span>{page === "showcase" ? "DevEngine" : app.appName}</span></Link>
      <div className={s.headerActions}><HeaderControls />{onCopy && <button className={s.iconButton} onClick={onCopy} aria-label={copied ? "Link copied" : "Copy page link"} title={copied ? "Link copied" : "Copy link"}><AppLegalIcon>{copied ? "check" : "link"}</AppLegalIcon><span>{copied ? "Copied" : "Copy link"}</span></button>}{onPrint && <button className={s.iconButton} onClick={onPrint} aria-label="Print document" title="Print"><AppLegalIcon>print</AppLegalIcon><span>Print</span></button>}</div>
    </div></header>
    <main className={s.main}>
      <section className={s.hero}>
        <div className={s.identity}><div className={s.logo}>{app.logoUrl ? <img src={app.logoUrl} alt={`${app.appName} icon`} /> : <AppLegalIcon>deployed_code</AppLegalIcon>}</div><div className={s.heroText}><p className={s.eyebrow}>{page === "showcase" ? "DEVENGINE / APPLICATIONS" : `${app.appName} / APP POLICIES`}</p><h1>{title}</h1>{page === "showcase" && app.appSubtitle && <p className={s.subtitle}>{app.appSubtitle}</p>}<div className={s.meta}>{app.category && <span>{app.category}</span>}{app.packageName && <code>{app.packageName}</code>}{page !== "showcase" && app.effectiveDate && <span>Effective {app.effectiveDate}</span>}</div></div></div>
        <nav className={s.tabs} aria-label="App pages">{sections.map(item => <Link href={`/apps/${app.slug}${item.path}`} key={item.page} aria-current={item.page === page ? "page" : undefined}><AppLegalIcon>{item.icon}</AppLegalIcon>{item.title}</Link>)}</nav>
      </section>
      <div className={s.content}>{children}</div>
      <aside className={s.support}><span className={s.supportIcon}><AppLegalIcon>support_agent</AppLegalIcon></span><div><h2>Here to help.</h2><p>Questions about {app.appName} or your data?</p></div><a href={`mailto:${app.contactEmail || "support@devengine.com"}`}>{app.contactEmail || "support@devengine.com"}<AppLegalIcon>arrow_outward</AppLegalIcon></a></aside>
      <div className={s.publisher}><span>Published by DevEngine</span>{app.effectiveDate && <span>Last updated: {app.effectiveDate}</span>}</div>
    </main>
    <div className={s.footer}><LandingFooter /></div>
  </div>;
}
export function AppLegalDocument({
  content,
  app,
  pageTitle,
}: {
  content: string;
  app?: AppPolicy;
  pageTitle?: string;
}) {
  const [copiedPkg, setCopiedPkg] = useState(false);

  const handleCopyPkg = () => {
    if (!app?.packageName) return;
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(app.packageName);
      setCopiedPkg(true);
      setTimeout(() => setCopiedPkg(false), 2000);
    }
  };

  return (
    <article className={s.document}>
      {app && (
        <div className={s.docHeader}>
          <div className={s.docHeaderTop}>
            <div className={s.complianceBadge}>
              <span className={s.badgeDot} />
              <AppLegalIcon>verified_user</AppLegalIcon>
              <span>OFFICIAL COMPLIANCE STANDARD</span>
            </div>
            <span className={s.docUpdated}>
              <AppLegalIcon>calendar_today</AppLegalIcon>
              <span>{app.effectiveDate ? `Effective ${app.effectiveDate}` : "Current Version"}</span>
            </span>
          </div>

          <div className={s.docMetricsGrid}>
            <div className={s.docMetricCard}>
              <span className={s.metricLabel}>Application Identifier (Package ID)</span>
              <div className={s.metricValueRow}>
                <code>{app.packageName || "com.devengine.app"}</code>
                <button
                  type="button"
                  onClick={handleCopyPkg}
                  className={s.copyPkgBtn}
                  title={copiedPkg ? "Copied Package ID" : "Copy Package ID"}
                  aria-label="Copy package identifier"
                >
                  <AppLegalIcon>{copiedPkg ? "done" : "content_copy"}</AppLegalIcon>
                  <span>{copiedPkg ? "Copied" : "Copy"}</span>
                </button>
              </div>
            </div>

            <div className={s.docMetricCard}>
              <span className={s.metricLabel}>Developer & Publisher</span>
              <div className={s.metricValueRow}>
                <strong>DevEngine</strong>
                <span className={s.verifiedPublisherBadge}>
                  <AppLegalIcon>verified</AppLegalIcon>
                  <span>Verified</span>
                </span>
              </div>
            </div>

            <div className={s.docMetricCard}>
              <span className={s.metricLabel}>Legal & Support Contact</span>
              <div className={s.metricValueRow}>
                <a href={`mailto:${app.contactEmail || "support@devengine.com"}`} className={s.contactLink}>
                  <AppLegalIcon>mail</AppLegalIcon>
                  <span>{app.contactEmail || "support@devengine.com"}</span>
                </a>
              </div>
            </div>
          </div>

          {/* 4 Pillars Trust Highlights */}
          <div className={s.pillarsGrid}>
            <div className={s.pillarItem}>
              <span className={s.pillarIcon}><AppLegalIcon>lock</AppLegalIcon></span>
              <div>
                <strong>Encrypted Storage</strong>
                <small>TLS in transit & secure at rest</small>
              </div>
            </div>
            <div className={s.pillarItem}>
              <span className={s.pillarIcon}><AppLegalIcon>shield</AppLegalIcon></span>
              <div>
                <strong>Zero Sale of Data</strong>
                <small>Never sold to data brokers</small>
              </div>
            </div>
            <div className={s.pillarItem}>
              <span className={s.pillarIcon}><AppLegalIcon>manage_accounts</AppLegalIcon></span>
              <div>
                <strong>User Data Rights</strong>
                <small>Direct deletion available anytime</small>
              </div>
            </div>
            <div className={s.pillarItem}>
              <span className={s.pillarIcon}><AppLegalIcon>policy</AppLegalIcon></span>
              <div>
                <strong>Store Compliant</strong>
                <small>Google Play & App Store standard</small>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className={s.documentBody}>
        <MarkdownViewer content={content} />
      </div>
    </article>
  );
}

export function AppShowcaseContent({ app }: { app: AppPolicy }) {
  const [statusModal, setStatusModal] = useState<{
    open: boolean;
    platform: "play" | "apple";
    title: string;
    icon: string;
    message: string;
  } | null>(null);

  const openPlayStatus = () => {
    setStatusModal({
      open: true,
      platform: "play",
      title: "Google Play Edition",
      icon: "/assets/playstore.png",
      message:
        app.playStoreStatusMsg?.trim() ||
        `The Google Play edition of ${app.appName} is currently under active development. Testing, compliance review, and store deployment preparations are underway. Full release will be available on Google Play soon!`,
    });
  };

  const openAppStoreStatus = () => {
    setStatusModal({
      open: true,
      platform: "apple",
      title: "Apple App Store Edition",
      icon: "/assets/appstore.png",
      message:
        app.appStoreStatusMsg?.trim() ||
        `The Apple App Store edition of ${app.appName} is currently under development. iOS architecture optimization and App Store review are in progress. Coming soon for iPhone and iPad!`,
    });
  };

  return (
    <>
      <section className={s.downloads} aria-label="Download app">
        <div>
          <span className={s.eyebrow}>MADE FOR YOUR EVERYDAY</span>
          <h2>Find your next app.</h2>
          <p>Get {app.appName} from your preferred store.</p>
        </div>

        <div className={s.storeLinks}>
          {/* Google Play Button */}
          {app.playStoreUrl ? (
            <a
              href={app.playStoreUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={s.storeBtn}
            >
              <img src="/assets/playstore.png" alt="Google Play" className={s.storeIconImg} />
              <div className={s.storeBtnText}>
                <small>GET IT ON</small>
                <strong>Google Play</strong>
              </div>
              <AppLegalIcon>arrow_outward</AppLegalIcon>
            </a>
          ) : (
            <button
              type="button"
              onClick={openPlayStatus}
              className={`${s.storeBtn} ${s.storeBtnPending}`}
              title="Under development - Tap for status"
            >
              <img src="/assets/playstore.png" alt="Google Play" className={s.storeIconImg} />
              <div className={s.storeBtnText}>
                <small>
                  <span>GET IT ON</span>
                  <span className={s.pendingTag}>COMING SOON</span>
                </small>
                <strong>Google Play</strong>
              </div>
              <AppLegalIcon>info</AppLegalIcon>
            </button>
          )}

          {/* Apple App Store Button */}
          {app.appStoreUrl ? (
            <a
              href={app.appStoreUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={s.storeBtn}
            >
              <img src="/assets/appstore.png" alt="App Store" className={s.storeIconImg} />
              <div className={s.storeBtnText}>
                <small>DOWNLOAD ON THE</small>
                <strong>App Store</strong>
              </div>
              <AppLegalIcon>arrow_outward</AppLegalIcon>
            </a>
          ) : (
            <button
              type="button"
              onClick={openAppStoreStatus}
              className={`${s.storeBtn} ${s.storeBtnPending}`}
              title="Under development - Tap for status"
            >
              <img src="/assets/appstore.png" alt="App Store" className={s.storeIconImg} />
              <div className={s.storeBtnText}>
                <small>
                  <span>DOWNLOAD ON THE</span>
                  <span className={s.pendingTag}>COMING SOON</span>
                </small>
                <strong>App Store</strong>
              </div>
              <AppLegalIcon>info</AppLegalIcon>
            </button>
          )}
        </div>
      </section>

      {/* Formal Store Status Modal */}
      {statusModal && (
        <div
          className={s.storeModalOverlay}
          onClick={() => setStatusModal(null)}
          role="dialog"
          aria-modal="true"
        >
          <div className={s.storeModalCard} onClick={(e) => e.stopPropagation()}>
            <div className={s.storeModalHeader}>
              <div className={s.storeModalIconBox}>
                <img src={statusModal.icon} alt={statusModal.title} />
              </div>
              <button
                type="button"
                className={s.storeModalCloseBtn}
                onClick={() => setStatusModal(null)}
                aria-label="Close dialog"
              >
                <AppLegalIcon>close</AppLegalIcon>
              </button>
            </div>

            <div className={s.storeModalTitleGroup}>
              <h3 className={s.storeModalTitle}>{statusModal.title}</h3>
              <div className={s.storeModalStatusPill}>
                <span className={s.storeModalPillDot} />
                <span>Under Development • Coming Soon</span>
              </div>
            </div>

            <div className={s.storeModalMessage}>
              <p>{statusModal.message}</p>
            </div>

            <button
              type="button"
              className={s.storeModalActionBtn}
              onClick={() => setStatusModal(null)}
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {app.description && (
        <section className={s.about}>
          <p className={s.eyebrow}>THE APPLICATION</p>
          <h2>About {app.appName}</h2>
          <p>{app.description}</p>
        </section>
      )}

      <section>
        <div className={s.sectionHeading}>
          <p className={s.eyebrow}>TRANSPARENCY, MADE SIMPLE</p>
          <h2>Your app. Your information.</h2>
          <p>Read the policies and manage requests for your account.</p>
        </div>
        <div className={s.legalGrid}>
          {[
            {
              path: "privacy-policy",
              icon: "privacy_tip",
              title: "Privacy policy",
              description: "How information is collected, used, and protected.",
              action: "Read privacy policy",
            },
            {
              path: "terms",
              icon: "description",
              title: "Terms & conditions",
              description: "The terms that apply when you use this application.",
              action: "Read terms",
            },
            {
              path: "data-deletion",
              icon: "manage_accounts",
              title: "Account & data deletion",
              description: "Explore deletion options and submit a request online.",
              action: "Manage your data",
            },
          ].map((item) => (
            <Link
              className={s.legalCard}
              href={`/apps/${app.slug}/${item.path}`}
              key={item.path}
            >
              <span className={s.cardIcon}>
                <AppLegalIcon>{item.icon}</AppLegalIcon>
              </span>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
              <span className={s.cardAction}>
                {item.action}
                <AppLegalIcon>arrow_forward</AppLegalIcon>
              </span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
export { s as appLegalStyles };
