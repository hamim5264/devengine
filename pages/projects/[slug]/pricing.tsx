import React, { useEffect, useState, useMemo } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { db, auth } from "@/lib/firebase";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import LandingNavbar from "@/components/landing/LandingNavbar";
import LandingFooter from "@/components/landing/LandingFooter";
import HelixLoader from "@/components/HelixLoader";
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

const ADMIN_EMAIL =
  process.env.NEXT_PUBLIC_ADMIN_EMAIL || "hamim.leon@gmail.com";
const WHATSAPP_NUMBER = "8801724879284";

export default function ProjectPricingPage() {
  const router = useRouter();
  const { slug } = router.query;

  const [project, setProject] = useState<ProjectItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Selected plan modal
  const [activePlanModal, setActivePlanModal] = useState<ProjectPricingTier | null>(null);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  // Check admin
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setIsAdmin(user?.email === ADMIN_EMAIL);
    });
    return () => unsub();
  }, []);

  // Fetch project data
  useEffect(() => {
    if (!slug) return;

    const fetchProject = async () => {
      setLoading(true);
      setNotFound(false);
      try {
        const slugStr = String(slug).trim();
        const ref = doc(db, "projects", slugStr);
        let snap = await getDoc(ref);

        if (!snap.exists()) {
          const qSlug = query(
            collection(db, "projects"),
            where("slug", "==", slugStr)
          );
          const slugSnap = await getDocs(qSlug);
          if (!slugSnap.empty) {
            snap = slugSnap.docs[0];
          }
        }

        if (!snap.exists()) {
          const qLower = query(
            collection(db, "projects"),
            where("slug", "==", slugStr.toLowerCase())
          );
          const lowerSnap = await getDocs(qLower);
          if (!lowerSnap.empty) {
            snap = lowerSnap.docs[0];
          }
        }

        if (!snap.exists()) {
          const allSnap = await getDocs(collection(db, "projects"));
          const match = allSnap.docs.find((d) => {
            const dData = d.data() as any;
            const s = slugStr.toLowerCase();
            const dSlug = (dData.slug || "").toLowerCase();
            const dTitle = (dData.title || "").toLowerCase();
            return (
              d.id.toLowerCase() === s ||
              dSlug === s ||
              dSlug.replace(/[^a-z0-9]/g, "") === s.replace(/[^a-z0-9]/g, "") ||
              dTitle.replace(/[^a-z0-9]+/g, "-").includes(s) ||
              s.includes(d.id.toLowerCase())
            );
          });
          if (match) snap = match;
        }

        if (!snap || !snap.exists()) {
          setNotFound(true);
          return;
        }

        const data = snap.data() as any;
        setProject({
          id: snap.id,
          slug: data.slug || snap.id,
          title: data.title || "Untitled Project",
          subtitle: data.subtitle || "",
          details: data.details || "",
          description: data.description || "",
          category: data.category || "General",
          platform: data.platform || "Cross-Platform",
          version: data.version || "1.0.0",
          status: data.status || "Active",
          releaseDate: data.releaseDate || "Q4 2024",
          price: data.price ?? "0",
          discount: data.discount,
          pricing: data.pricing,
          youtubeUrl: data.youtubeUrl || "",
          snapshot: data.snapshot,
          whatsIncluded: data.whatsIncluded,
          notIncluded: data.notIncluded,
          installation: data.installation,
          faqs: data.faqs,
          pricingPlans: data.pricingPlans,
          technicalSpecs: data.technicalSpecs,
          tags: data.tags || [],
          image: data.image || "",
          images: data.images || [],
          isPublic: data.isPublic ?? true,
        });
      } catch (err) {
        console.error("Error fetching project:", err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [slug]);

  // Compute 3 pricing plans
  const pricingPlans = useMemo(() => {
    return getDefaultPricingPlans(project || undefined);
  }, [project]);

  // Technical specs
  const specs: TechnicalSpecRow[] = useMemo(() => {
    if (project?.technicalSpecs && project.technicalSpecs.length > 0) {
      return project.technicalSpecs;
    }
    return DEFAULT_TECHNICAL_SPECS;
  }, [project]);

  // Handle plan CTA click
  const handlePlanClick = (plan: ProjectPricingTier) => {
    setActivePlanModal(plan);
  };

  // WhatsApp link generator (BDT + USD)
  const getWhatsAppUrl = (plan: ProjectPricingTier) => {
    const projectTitle = project?.title || "DevEngine System";
    const bdtText = plan.currencySymbol ? `${plan.currencySymbol} ${plan.price}` : plan.price;
    const usdText = formatUsdPrice(plan.usdPrice, plan.price);
    const priceText = usdText ? `${bdtText} (approx. ${usdText})` : bdtText;
    const msg = encodeURIComponent(
      `Hello DevEngine,\n\nI want to acquire the "${plan.name}" license for "${projectTitle}" (${priceText}).\n\nPlease provide licensing agreements and deployment access details.`
    );
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`;
  };

  // Online checkout URL
  const getCheckoutUrl = (plan: ProjectPricingTier) => {
    const cleanAmount = plan.price.replace(/[^0-9]/g, "");
    return `/checkout?slug=${project?.slug || project?.id}&plan=${plan.id}&amount=${cleanAmount || "1"}`;
  };

  if (loading) {
    return (
      <div className={styles.pricingPageRoot}>
        <LandingNavbar />
        <main className="min-h-screen pt-44 pb-32 flex flex-col items-center justify-center text-center">
          <HelixLoader size={54} color="#2cecf7" />
          <p className="mt-6 font-mono text-xs uppercase tracking-widest text-[var(--devengine-muted)]">
            Initializing Pricing Matrix…
          </p>
        </main>
        <LandingFooter />
      </div>
    );
  }

  if (notFound || !project) {
    return (
      <div className={styles.pricingPageRoot}>
        <LandingNavbar />
        <main className="min-h-screen pt-44 pb-32 flex flex-col items-center justify-center px-6 text-center">
          <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mb-6 text-rose-400">
            <span className="material-symbols-outlined text-3xl">error</span>
          </div>
          <h1 className="font-space text-3xl font-bold mb-2">
            Project Pricing Not Found
          </h1>
          <p className="text-[var(--devengine-muted)] max-w-md mb-8 text-sm">
            The requested project repository could not be located or may currently be restricted.
          </p>
          <div className="flex gap-4">
            <Link
              href="/projects"
              className="px-6 py-2.5 rounded-xl bg-[var(--devengine-surface)] border border-[var(--devengine-border)] text-sm font-bold transition hover:border-[#2cecf7]"
            >
              Browse Projects
            </Link>
            <Link
              href="/"
              className="px-6 py-2.5 rounded-xl bg-[#2cecf7] text-[#02040a] text-sm font-bold transition hover:bg-[#53f2fb]"
            >
              Return Home
            </Link>
          </div>
        </main>
        <LandingFooter />
      </div>
    );
  }

  return (
    <div className={styles.pricingPageRoot}>
      <Head>
        <title>{project.title} — Licensing & Pricing Plans | DevEngine</title>
        <meta
          name="description"
          content={`Transparent licensing tiers for ${project.title}. Commercial source code access, developer support, and full enterprise architecture.`}
        />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      {/* Atmospheric Ambient Lighting Canvas */}
      <div className={styles.ambientCanvas} aria-hidden="true">
        <span className={styles.ambientBlobA} />
        <span className={styles.ambientBlobB} />
      </div>

      <LandingNavbar />

      <main className={styles.mainContainer}>
        {/* ══════════════════════════════════════════════════════
            BREADCRUMBS & CONTEXT
        ══════════════════════════════════════════════════════ */}
        <div className={styles.breadcrumbsRow}>
          <div className={styles.breadcrumbsLeft}>
            <Link href="/" className={styles.breadcrumbLink}>Home</Link>
            <span>/</span>
            <Link href="/projects" className={styles.breadcrumbLink}>Projects</Link>
            <span>/</span>
            <Link href={`/projects/${project.slug}`} className={styles.breadcrumbActive}>
              {project.title}
            </Link>
            <span>/</span>
            <span>Pricing</span>
          </div>

          <Link
            href={`/projects/${project.slug}`}
            className={styles.backBtn}
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            <span>Back to Architecture Overview</span>
          </Link>
        </div>

        {/* ══════════════════════════════════════════════════════
            HERO HEADER
        ══════════════════════════════════════════════════════ */}
        <section className={styles.heroSection}>
          <div className={styles.protocolPill}>
            <span className={styles.protocolDot} />
            <span className={styles.protocolText}>
              DevEngine Licensing Protocol
            </span>
          </div>

          <h1 className={styles.heroHeading}>
            Fair Pricing.<br />
            <span className={styles.heroGradientText}>
              For Extraordinary Engineering.
            </span>
          </h1>

          <p className={styles.heroSubtitle}>
            Transparent, high-fidelity licensing models designed for{" "}
            <strong className="text-[var(--devengine-text)]">{project.title}</strong>. No hidden
            fees, just pure architectural power, production code, and lifetime agility.
          </p>

          {/* Project Snapshot Card */}
          <div className={styles.projectMetaStrip}>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Repository:</span>
              <span className={styles.metaVal}>{project.title}</span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Category:</span>
              <span className={styles.metaCategory}>{project.category}</span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Status:</span>
              <span className={styles.metaStatus}>{project.status}</span>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════
            PRICING TIERS — BENTO GRID
        ══════════════════════════════════════════════════════ */}
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
                {/* Popular Badge */}
                {isStudio && (
                  <div className={styles.popularBadge}>
                    {tier.badge || "Most Popular"}
                  </div>
                )}

                {/* Plan Header */}
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

                {/* Dual Price Display: BDT + Dollar */}
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

                {/* Features List */}
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

                {/* Action CTA Button */}
                <button
                  type="button"
                  onClick={() => handlePlanClick(tier)}
                  className={isStudio ? styles.ctaBtnPrimary : styles.ctaBtnSecondary}
                >
                  <span>{tier.buttonText}</span>
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
              </div>
            );
          })}
        </section>

        {/* ══════════════════════════════════════════════════════
            TECHNICAL SPECIFICATIONS MATRIX
        ══════════════════════════════════════════════════════ */}
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

        {/* ══════════════════════════════════════════════════════
            GLOBAL BENEFITS ("What You Get With Every Project")
        ══════════════════════════════════════════════════════ */}
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

        {/* ══════════════════════════════════════════════════════
            FREQUENTLY ASKED QUESTIONS (FAQ)
        ══════════════════════════════════════════════════════ */}
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
            {(project.faqs || DEFAULT_FAQS).map((faq, index) => {
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

      {/* ══════════════════════════════════════════════════════
          PLAN CHECKOUT / ACQUISITION MODAL
      ══════════════════════════════════════════════════════ */}
      {activePlanModal && (
        <div
          className={styles.modalBackdrop}
          onClick={() => setActivePlanModal(null)}
        >
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setActivePlanModal(null)}
              className={styles.modalCloseBtn}
              aria-label="Close modal"
            >
              ✕
            </button>

            {/* Header */}
            <div className="mb-5">
              <div className={styles.protocolPill} style={{ marginBottom: "0.75rem" }}>
                <span className={styles.protocolDot} />
                <span className={styles.protocolText}>Plan Selected</span>
              </div>
              <h3 className={styles.planName} style={{ marginBottom: "0.25rem" }}>
                {activePlanModal.name}
              </h3>
              <p className="font-mono text-xs text-[var(--devengine-muted)]">
                Target Repository: <strong className="text-[#2cecf7]">{project.title}</strong>
              </p>
            </div>

            {/* Price Badge with BDT & USD */}
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

            {/* Plan Highlights */}
            <div className="mb-6">
              <div className="font-mono text-xs text-[var(--devengine-muted)] uppercase tracking-wider mb-2 font-semibold">
                Included in this license:
              </div>
              <ul className="space-y-2">
                {activePlanModal.features.filter((f) => f.included).slice(0, 4).map((feat, i) => (
                  <li key={i} className="flex items-center gap-2 text-xs">
                    <span className="material-symbols-outlined text-[#2cecf7] text-base">check</span>
                    <span>{feat.text}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Acquisition Options */}
            <div className="space-y-3">
              {/* Option 1: Secure Checkout Page */}
              <Link
                href={getCheckoutUrl(activePlanModal)}
                className={styles.ctaBtnPrimary}
              >
                <span className="material-symbols-outlined text-xl">shopping_cart_checkout</span>
                <span>Proceed to Secure Checkout</span>
              </Link>

              {/* Option 2: WhatsApp Instant Inquiry */}
              <a
                href={getWhatsAppUrl(activePlanModal)}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.ctaBtnSecondary}
              >
                <span className="material-symbols-outlined text-base">chat</span>
                <span>Inquire / Checkout via WhatsApp</span>
              </a>

              <p className="text-[11px] font-mono text-[var(--devengine-muted)] text-center pt-2">
                🔒 Protected by DevEngine Commercial License Agreement & NDA
              </p>
            </div>
          </div>
        </div>
      )}

      <LandingFooter />
    </div>
  );
}
