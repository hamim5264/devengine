import React, { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import LandingNavbar from "@/components/landing/LandingNavbar";
import LandingFooter from "@/components/landing/LandingFooter";
import HelixLoader from "@/components/HelixLoader";
import { getCachedData, setCachedData } from "@/lib/utils/cacheService";
import {
  ProjectItem,
  ProjectPricingTier,
  TechnicalSpecRow,
  getDefaultPricingPlans,
  DEFAULT_TECHNICAL_SPECS,
  DEFAULT_FAQS,
  formatUsdPrice,
} from "@/types/project";
import styles from "@/components/projects/ProjectPricing.module.css";

const WHATSAPP_NUMBER = "8801724879284";

export default function GeneralPricingPage() {
  const router = useRouter();
  const { project: queryProject } = router.query;

  const [projects, setProjects] = useState<ProjectItem[]>(() => {
    return getCachedData<ProjectItem[]>("archive_projects", []);
  });
  const [selectedProject, setSelectedProject] = useState<ProjectItem | null>(null);
  const [loading, setLoading] = useState(() => {
    const cached = getCachedData<ProjectItem[] | null>("archive_projects", null);
    return !cached || cached.length === 0;
  });
  const [activePlanModal, setActivePlanModal] = useState<ProjectPricingTier | null>(null);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(
          query(collection(db, "projects"), where("isPublic", "==", true))
        );
        const list: ProjectItem[] = snap.docs.map((d) => {
          const data = d.data() as any;
          return {
            id: d.id,
            slug: data.slug || d.id,
            title: data.title || "Untitled Project",
            subtitle: data.subtitle || "",
            category: data.category || "General",
            price: data.price ?? "0",
            discount: data.discount,
            pricing: data.pricing,
            pricingPlans: data.pricingPlans,
            technicalSpecs: data.technicalSpecs,
            tags: data.tags || [],
            isPublic: true,
          };
        });
        setProjects(list);
        setCachedData("archive_projects", list);

        if (queryProject) {
          const found = list.find(
            (p) =>
              p.slug === queryProject ||
              p.id === queryProject ||
              p.title.toLowerCase() === String(queryProject).toLowerCase()
          );
          if (found) setSelectedProject(found);
          else if (list.length > 0) setSelectedProject(list[0]);
        } else if (list.length > 0) {
          setSelectedProject(list[0]);
        }
      } catch (err) {
        console.error("Error fetching projects for pricing:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [queryProject]);

  const pricingPlans = getDefaultPricingPlans(selectedProject || undefined);
  const specs: TechnicalSpecRow[] =
    selectedProject?.technicalSpecs && selectedProject.technicalSpecs.length > 0
      ? selectedProject.technicalSpecs
      : DEFAULT_TECHNICAL_SPECS;

  const getWhatsAppUrl = (plan: ProjectPricingTier) => {
    const projectTitle = selectedProject?.title || "DevEngine System";
    const bdtText = plan.currencySymbol ? `${plan.currencySymbol} ${plan.price}` : plan.price;
    const usdText = formatUsdPrice(plan.usdPrice, plan.price);
    const priceText = usdText ? `${bdtText} (approx. ${usdText})` : bdtText;
    const msg = encodeURIComponent(
      `Hello DevEngine,\n\nI want to acquire the "${plan.name}" license for "${projectTitle}" (${priceText}).\n\nPlease provide licensing details.`
    );
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`;
  };

  const headElement = (
    <Head>
      <title>Software Pricing & Licensing Models | DevEngine</title>
      <meta
        name="description"
        content="Review DevEngine's software licensing options: individual module licenses, complete studio source code ownership, and dedicated development sprints."
      />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <link rel="canonical" href="https://www.devenginehq.com/pricing" />

      {/* OpenGraph */}
      <meta property="og:site_name" content="DevEngine" />
      <meta property="og:title" content="Software Pricing & Licensing Models | DevEngine" />
      <meta
        property="og:description"
        content="Review DevEngine's software licensing options: individual module licenses, complete studio source code ownership, and dedicated development sprints."
      />
      <meta property="og:type" content="website" />
      <meta property="og:url" content="https://www.devenginehq.com/pricing" />
      <meta property="og:image" content="https://www.devenginehq.com/dev_url_logo.png" />

      {/* Twitter Cards */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="Software Pricing & Licensing Models | DevEngine" />
      <meta
        name="twitter:description"
        content="Review DevEngine's software licensing options: individual module licenses, complete studio source code ownership, and dedicated development sprints."
      />
      <meta name="twitter:image" content="https://www.devenginehq.com/dev_url_logo.png" />
    </Head>
  );

  if (loading) {
    return (
      <div className={styles.pricingPageRoot}>
        {headElement}
        <LandingNavbar />
        <main className="min-h-screen pt-44 pb-32 flex flex-col items-center justify-center text-center">
          <HelixLoader size={54} color="#2cecf7" />
          <p className="mt-6 font-mono text-xs uppercase tracking-widest text-[var(--devengine-muted)]">
            Loading Pricing Experience…
          </p>
        </main>
        <LandingFooter />
      </div>
    );
  }

  return (
    <div className={styles.pricingPageRoot}>
      {headElement}

      {/* Atmospheric Ambient Canvas */}
      <div className={styles.ambientCanvas} aria-hidden="true">
        <span className={styles.ambientBlobA} />
        <span className={styles.ambientBlobB} />
      </div>

      <LandingNavbar />

      <main className={styles.mainContainer}>
        {/* Hero Section */}
        <section className={styles.heroSection}>
          <div className={styles.protocolPill}>
            <span className={styles.protocolDot} />
            <span className={styles.protocolText}>
              Premium Pricing Experience
            </span>
          </div>

          <h1 className={styles.heroHeading}>
            Fair Pricing.<br />
            <span className={styles.heroGradientText}>
              For Extraordinary Engineering.
            </span>
          </h1>

          <p className={styles.heroSubtitle}>
            Transparent, high-fidelity licensing models designed for serious software studios. No hidden fees, just pure architectural power.
          </p>

          {/* Project Selector (if projects exist) */}
          {projects.length > 0 && (
            <div className={styles.systemSelectorWrap}>
              <span className="font-mono text-xs text-[var(--devengine-muted)] px-2">Select System:</span>
              <div className="flex flex-wrap gap-2">
                {projects.slice(0, 6).map((p) => {
                  const isSel = selectedProject?.id === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedProject(p)}
                      className={`${styles.systemBtn} ${
                        isSel ? styles.systemBtnActive : ""
                      }`}
                    >
                      {p.title}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* Pricing Bento Grid */}
        <section className={styles.pricingGrid}>
          {pricingPlans.map((tier) => {
            const isStudio = tier.isPopular || tier.id === "studio";
            return (
              <div
                key={tier.id}
                className={`${styles.pricingCard} ${
                  isStudio ? styles.pricingCardPopular : ""
                }`}
              >
                {isStudio && (
                  <div className={styles.popularBadge}>
                    {tier.badge || "Most Popular"}
                  </div>
                )}

                <div className={styles.planHeader}>
                  <h3
                    className={`${styles.planName} ${
                      isStudio ? styles.planNamePopular : ""
                    }`}
                  >
                    {tier.name}
                  </h3>
                  <p className={styles.planTagline}>
                    {tier.tagline}
                  </p>
                </div>

                <div className={styles.priceWrap}>
                  <div className={styles.priceRow}>
                    <span className={styles.priceNumber}>
                      {tier.currencySymbol ? `${tier.currencySymbol} ` : ""}
                      {tier.price}
                    </span>
                    {formatUsdPrice(tier.usdPrice, tier.price) && (
                      <span className={styles.usdChip}>
                        <span className={styles.usdPrefix}>USD</span>
                        <span>{formatUsdPrice(tier.usdPrice, tier.price)}</span>
                      </span>
                    )}
                  </div>
                  <div className={styles.billingPeriodRow}>
                    <span>{tier.billingPeriod}</span>
                    <span>•</span>
                    <span>BDT & USD supported</span>
                  </div>
                </div>

                <ul className={styles.featureList}>
                  {tier.features.map((feat, idx) => (
                    <li key={idx} className={styles.featureItem}>
                      {feat.included ? (
                        <span className={`material-symbols-outlined ${styles.featureIconCheck}`}>
                          check_circle
                        </span>
                      ) : (
                        <span className={`material-symbols-outlined ${styles.featureIconCross}`}>
                          remove
                        </span>
                      )}
                      <span
                        className={
                          feat.included
                            ? styles.featureTextIncluded
                            : styles.featureTextExcluded
                        }
                      >
                        {feat.text}
                      </span>
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  onClick={() => setActivePlanModal(tier)}
                  className={isStudio ? styles.ctaBtnPrimary : styles.ctaBtnSecondary}
                >
                  <span>{tier.buttonText}</span>
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
              </div>
            );
          })}
        </section>

        {/* Technical Specifications Matrix */}
        <section className="mb-24">
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTag}>
              Engineering Matrix
            </span>
            <h2 className={styles.sectionTitle}>
              Technical Specifications Matrix
            </h2>
          </div>

          <div className={styles.tableCard}>
            <table className={styles.specTable}>
              <thead>
                <tr>
                  <th style={{ width: "28%" }}>Specification</th>
                  <th style={{ width: "24%", textAlign: "center" }}>Individual</th>
                  <th className={styles.studioTh} style={{ width: "24%", textAlign: "center" }}>
                    Studio
                  </th>
                  <th style={{ width: "24%", textAlign: "center" }}>Enterprise</th>
                </tr>
              </thead>
              <tbody>
                {specs.map((row, i) => (
                  <tr key={i} className={styles.specRow}>
                    <td className={styles.specFeatureName}>{row.feature}</td>
                    <td style={{ textAlign: "center" }}>{row.individual}</td>
                    <td className={styles.studioTd}>{row.studio}</td>
                    <td style={{ textAlign: "center" }}>{row.enterprise}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Global Benefits ("What You Get With Every Project") */}
        <section className="mb-24">
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTag}>
              Architectural Assurance
            </span>
            <h2 className={styles.sectionTitle}>
              What You Get With Every Project
            </h2>
          </div>

          <div className={styles.benefitsGrid}>
            <div className={styles.benefitCard}>
              <div className={styles.benefitIconWrap}>
                <span className="material-symbols-outlined">shield_locked</span>
              </div>
              <h4 className={styles.benefitHeading}>Security Hardened</h4>
              <p className={styles.benefitDescription}>
                Pen-tested architectures with built-in defense mechanisms against OWASP top 10 vulnerabilities.
              </p>
            </div>

            <div className={styles.benefitCard}>
              <div className={styles.benefitIconWrap}>
                <span className="material-symbols-outlined">code_blocks</span>
              </div>
              <h4 className={styles.benefitHeading}>Clean Architecture</h4>
              <p className={styles.benefitDescription}>
                Strict adherence to SOLID principles, modular components, and dependency injection for effortless extensibility.
              </p>
            </div>

            <div className={styles.benefitCard}>
              <div className={styles.benefitIconWrap}>
                <span className="material-symbols-outlined">menu_book</span>
              </div>
              <h4 className={styles.benefitHeading}>Rich Documentation</h4>
              <p className={styles.benefitDescription}>
                Comprehensive developer guides, API specs, database diagrams, and step-by-step setup guides.
              </p>
            </div>

            <div className={styles.benefitCard}>
              <div className={styles.benefitIconWrap}>
                <span className="material-symbols-outlined">rocket_launch</span>
              </div>
              <h4 className={styles.benefitHeading}>Fast Deployment</h4>
              <p className={styles.benefitDescription}>
                Pre-configured environment templates, Docker files, and automated deployment pipelines for instant staging.
              </p>
            </div>
          </div>
        </section>

        {/* Licensing FAQ */}
        <section className="mb-16">
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTag}>
              Knowledge Base
            </span>
            <h2 className={styles.sectionTitle}>
              Licensing FAQ
            </h2>
          </div>

          <div className={styles.faqStack}>
            {DEFAULT_FAQS.map((faq, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <div key={index} className={styles.faqItem}>
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                    className={styles.faqQuestionBtn}
                  >
                    <span className={styles.faqQuestion}>
                      {faq.question}
                    </span>
                    <span
                      className={`material-symbols-outlined ${styles.faqIcon} ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    >
                      expand_more
                    </span>
                  </button>
                  {isOpen && (
                    <div className={styles.faqAnswer}>
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* Plan Checkout / Acquisition Modal */}
      {activePlanModal && (
        <div
          className={styles.modalBackdrop}
          onClick={() => setActivePlanModal(null)}
        >
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setActivePlanModal(null)}
              className={styles.modalCloseBtn}
              aria-label="Close modal"
            >
              ✕
            </button>

            <div className="mb-5">
              <div className={styles.protocolPill} style={{ marginBottom: "0.75rem" }}>
                <span className={styles.protocolDot} />
                <span className={styles.protocolText}>Plan Selected</span>
              </div>
              <h3 className={styles.planName} style={{ marginBottom: "0.25rem" }}>
                {activePlanModal.name}
              </h3>
              <p className="font-mono text-xs text-[var(--devengine-muted)]">
                Target: <strong className="text-[#2cecf7]">{selectedProject?.title || "DevEngine System"}</strong>
              </p>
            </div>

            <div className={styles.modalPriceCard}>
              <div>
                <div className="font-mono text-[10px] uppercase text-[var(--devengine-muted)]">
                  Total Investment
                </div>
                <div className="flex flex-wrap items-baseline gap-2 mt-0.5">
                  <span className="font-space font-bold text-2xl sm:text-3xl text-[var(--devengine-text)]">
                    {activePlanModal.currencySymbol ? `${activePlanModal.currencySymbol} ` : ""}
                    {activePlanModal.price}
                  </span>
                  {formatUsdPrice(activePlanModal.usdPrice, activePlanModal.price) && (
                    <span className="font-mono text-sm font-bold text-emerald-500">
                      (≈ {formatUsdPrice(activePlanModal.usdPrice, activePlanModal.price)})
                    </span>
                  )}
                </div>
              </div>
              <span className="font-mono text-xs text-[var(--devengine-muted)] px-3 py-1 rounded-lg bg-[var(--devengine-surface)] border border-[var(--devengine-border)]">
                {activePlanModal.billingPeriod}
              </span>
            </div>

            <div className="space-y-3">
              {selectedProject && (
                <Link
                  href={`/checkout?slug=${selectedProject.slug}&plan=${activePlanModal.id}&amount=${activePlanModal.price.replace(/[^0-9]/g, "")}`}
                  className={styles.ctaBtnPrimary}
                >
                  <span className="material-symbols-outlined text-xl">shopping_cart_checkout</span>
                  <span>Proceed to Secure Checkout</span>
                </Link>
              )}

              <a
                href={getWhatsAppUrl(activePlanModal)}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.ctaBtnSecondary}
              >
                <span className="material-symbols-outlined text-base">chat</span>
                <span>Inquire / Checkout via WhatsApp</span>
              </a>
            </div>
          </div>
        </div>
      )}

      <LandingFooter />
    </div>
  );
}
