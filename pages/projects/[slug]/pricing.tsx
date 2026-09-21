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

        if (!snap.exists()) {
          setNotFound(true);
          setProject(null);
        } else {
          const data = snap.data() as any;
          if (data.isPublic === false && !isAdmin) {
            setNotFound(true);
            setProject(null);
          } else {
            setProject({
              id: snap.id,
              slug: data.slug || snap.id,
              title: data.title || "Untitled System",
              subtitle: data.subtitle || "",
              category: data.category || "General",
              price: data.price ?? "0",
              discount: data.discount,
              pricing: Array.isArray(data.pricing) ? data.pricing : undefined,
              pricingPlans: Array.isArray(data.pricingPlans) ? data.pricingPlans : undefined,
              technicalSpecs: Array.isArray(data.technicalSpecs) ? data.technicalSpecs : undefined,
              tags: Array.isArray(data.tags) ? data.tags : [],
              tools: Array.isArray(data.tools) ? data.tools : [],
              isPublic: data.isPublic ?? true,
              imageUrl: data.imageUrl || data.image || "",
              details: data.details || "",
              installation: data.installation || "",
              youtubeUrl: data.youtubeUrl,
              version: data.version || data.snapshot?.version || "v2.0",
              platform: data.platform || data.snapshot?.platform || "Multi-Platform",
              status: data.status || data.snapshot?.status || "Production Ready",
              releaseDate: data.releaseDate || data.snapshot?.releaseDate || "2026",
              faqs: Array.isArray(data.faqs) && data.faqs.length > 0 ? data.faqs : DEFAULT_FAQS,
            });
          }
        }
      } catch (err) {
        console.error("Error loading project for pricing:", err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [slug, isAdmin]);

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
      <>
        <LandingNavbar />
        <main className="min-h-screen pt-44 pb-32 flex flex-col items-center justify-center text-white bg-[#030712]">
          <HelixLoader size={54} color="#38f2ff" />
          <p className="mt-6 font-mono text-xs uppercase tracking-widest text-gray-400">
            Initializing Pricing Matrix…
          </p>
        </main>
        <LandingFooter />
      </>
    );
  }

  if (notFound || !project) {
    return (
      <>
        <LandingNavbar />
        <main className="min-h-screen pt-44 pb-32 flex flex-col items-center justify-center text-white bg-[#030712] px-6 text-center">
          <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mb-6 text-rose-400">
            <span className="material-symbols-outlined text-3xl">error</span>
          </div>
          <h1 className="font-space text-3xl font-bold text-white mb-2">
            Project Pricing Not Found
          </h1>
          <p className="text-gray-400 max-w-md mb-8 text-sm">
            The requested project repository could not be located or may currently be restricted.
          </p>
          <div className="flex gap-4">
            <Link
              href="/projects"
              className="px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-sm font-bold transition"
            >
              Browse Projects
            </Link>
            <Link
              href="/"
              className="px-6 py-2.5 rounded-xl bg-[#38f2ff] hover:bg-[#00e1f0] text-black text-sm font-bold transition"
            >
              Return Home
            </Link>
          </div>
        </main>
        <LandingFooter />
      </>
    );
  }

  return (
    <>
      <Head>
        <title>{project.title} — Licensing & Pricing Plans | DevEngine</title>
        <meta
          name="description"
          content={`Transparent licensing tiers for ${project.title}. Commercial source code access, developer support, and full enterprise architecture.`}
        />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      {/* Global Background Styling */}
      <div className="fixed inset-0 bg-[#030712] z-[-10]" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(14,24,42,0.95)_0%,rgba(3,7,18,1)_100%)] z-[-9] pointer-events-none" />
      <div className="fixed inset-0 bg-[linear-gradient(to_right,rgba(132,148,149,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(132,148,149,0.04)_1px,transparent_1px)] bg-[size:40px_40px] z-[-8] pointer-events-none" />

      {/* Volumetric Sweeps */}
      <div className="fixed -top-40 -left-40 w-[600px] h-[600px] bg-[#38f2ff]/[0.07] rounded-full blur-[140px] pointer-events-none z-[-7]" />
      <div className="fixed bottom-0 right-0 w-[600px] h-[600px] bg-[#5448dc]/[0.07] rounded-full blur-[160px] pointer-events-none z-[-7]" />

      <LandingNavbar />

      <main className="min-h-screen pt-28 pb-32 px-4 sm:px-8 md:px-12 max-w-7xl mx-auto relative z-10 text-[#dde2f3] font-sans selection:bg-[#38f2ff] selection:text-[#030712]">
        {/* ══════════════════════════════════════════════════════
            BREADCRUMBS & CONTEXT
        ══════════════════════════════════════════════════════ */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8 pt-4 pb-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2 font-mono text-xs text-gray-400">
            <Link href="/" className="hover:text-white transition">Home</Link>
            <span>/</span>
            <Link href="/projects" className="hover:text-white transition">Projects</Link>
            <span>/</span>
            <Link href={`/projects/${project.slug}`} className="text-[#38f2ff] hover:underline font-bold">
              {project.title}
            </Link>
            <span>/</span>
            <span className="text-gray-300">Pricing</span>
          </div>

          <Link
            href={`/projects/${project.slug}`}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-mono text-gray-300 hover:text-white transition"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            <span>Back to Architecture Overview</span>
          </Link>
        </div>

        {/* ══════════════════════════════════════════════════════
            HERO HEADER
        ══════════════════════════════════════════════════════ */}
        <section className="mb-16 md:mb-20 text-center max-w-4xl mx-auto flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#38f2ff]/10 border border-[#38f2ff]/20 mb-6 backdrop-blur-sm shadow-[0_0_20px_rgba(56,242,255,0.12)]">
            <span className="w-2 h-2 rounded-full bg-[#38f2ff] animate-pulse" />
            <span className="font-mono text-[11px] text-[#38f2ff] uppercase tracking-widest font-bold">
              DevEngine Licensing Protocol
            </span>
          </div>

          <h1 className="font-space font-bold text-4xl sm:text-5xl md:text-6xl text-white mb-6 leading-tight tracking-tight">
            Fair Pricing.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#38f2ff] via-[#67e8f9] to-[#c4c0ff] drop-shadow-[0_0_35px_rgba(56,242,255,0.35)]">
              For Extraordinary Engineering.
            </span>
          </h1>

          <p className="font-sans text-base sm:text-lg text-gray-400 max-w-2xl leading-relaxed">
            Transparent, high-fidelity licensing models designed for{" "}
            <span className="text-white font-semibold">{project.title}</span>. No hidden fees, just pure architectural power, production code, and lifetime agility.
          </p>

          {/* Project Snapshot Card */}
          <div className="mt-8 px-5 py-3 rounded-2xl bg-[#08111f]/70 border border-white/10 backdrop-blur-xl flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="text-gray-400">Repository:</span>
              <span className="text-white font-bold">{project.title}</span>
            </div>
            <div className="w-1 h-1 rounded-full bg-gray-600 hidden sm:block" />
            <div className="flex items-center gap-2">
              <span className="text-gray-400">Category:</span>
              <span className="text-[#38f2ff] uppercase font-bold">{project.category}</span>
            </div>
            <div className="w-1 h-1 rounded-full bg-gray-600 hidden sm:block" />
            <div className="flex items-center gap-2">
              <span className="text-gray-400">Status:</span>
              <span className="text-emerald-400 font-bold">{project.status}</span>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════
            PRICING TIERS — BENTO GRID
        ══════════════════════════════════════════════════════ */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 mb-24 items-stretch">
          {pricingPlans.map((tier) => {
            const isStudio = tier.isPopular || tier.id === "studio";

            return (
              <div
                key={tier.id}
                className={`rounded-2xl p-7 lg:p-8 flex flex-col transition-all duration-300 relative ${
                  isStudio
                    ? "bg-[#0a1424]/90 border-2 border-[#38f2ff]/60 shadow-[0_0_40px_rgba(56,242,255,0.18)] md:-translate-y-4"
                    : "bg-[#08111f]/70 border border-white/10 hover:border-white/20 hover:shadow-xl"
                } backdrop-blur-xl`}
              >
                {/* Popular Badge */}
                {isStudio && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#38f2ff] text-[#030712] font-mono text-[10px] font-bold px-4 py-1 rounded-full uppercase tracking-widest shadow-[0_0_15px_rgba(56,242,255,0.6)]">
                    {tier.badge || "Most Popular"}
                  </div>
                )}

                {/* Plan Header */}
                <div className="mb-6 pt-1">
                  <h3 className={`font-space font-bold text-2xl mb-1.5 ${
                    isStudio ? "text-[#38f2ff]" : "text-white"
                  }`}>
                    {tier.name}
                  </h3>
                  <p className="font-sans text-sm text-gray-400">
                    {tier.tagline}
                  </p>
                </div>

                {/* Dual Price Display: BDT + Dollar */}
                <div
                  className={`mb-8 border-b pb-6 ${
                    isStudio ? "border-[#38f2ff]/20" : "border-white/10"
                  }`}
                >
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1.5">
                    <span className="font-space font-bold text-3xl sm:text-4xl lg:text-5xl text-white tracking-tight">
                      {tier.currencySymbol ? `${tier.currencySymbol} ` : ""}
                      {tier.price}
                    </span>
                    {formatUsdPrice(tier.usdPrice, tier.price) && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-xs sm:text-sm font-bold shadow-[0_0_12px_rgba(16,185,129,0.15)]">
                        <span className="text-[10px] text-emerald-400/70 font-normal">USD</span>
                        <span>{formatUsdPrice(tier.usdPrice, tier.price)}</span>
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="font-mono text-xs text-gray-400">
                      {tier.billingPeriod}
                    </span>
                    <span className="text-gray-600 text-xs">•</span>
                    <span className="font-mono text-[11px] text-gray-400">
                      BDT & USD supported
                    </span>
                  </div>
                </div>

                {/* Features List */}
                <ul className="flex-grow space-y-3.5 mb-8">
                  {tier.features.map((feat, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      {feat.included ? (
                        <span className="material-symbols-outlined text-[#38f2ff] text-[19px] mt-0.5 flex-shrink-0">
                          check_circle
                        </span>
                      ) : (
                        <span className="material-symbols-outlined text-gray-600 text-[19px] mt-0.5 flex-shrink-0">
                          remove
                        </span>
                      )}
                      <span className={`text-sm ${
                        feat.included ? "text-gray-200" : "text-gray-500 line-through"
                      }`}>
                        {feat.text}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* Action CTA Button */}
                <button
                  onClick={() => handlePlanClick(tier)}
                  className={`w-full py-4 rounded-xl font-mono text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 ${
                    isStudio
                      ? "bg-[#38f2ff] hover:bg-[#00e1f0] text-[#030712] shadow-[0_0_25px_rgba(56,242,255,0.4)] hover:shadow-[0_0_35px_rgba(56,242,255,0.6)] hover:scale-[1.02]"
                      : "bg-transparent hover:bg-white/[0.04] text-[#38f2ff] border border-[#38f2ff]/50 hover:border-[#38f2ff] hover:shadow-[0_0_20px_rgba(56,242,255,0.2)]"
                  }`}
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
          <div className="text-center mb-10">
            <span className="font-mono text-xs text-[#38f2ff] uppercase tracking-widest block mb-2 font-bold">
              Engineering Matrix
            </span>
            <h2 className="font-space font-bold text-3xl sm:text-4xl text-white">
              Technical Specifications Matrix
            </h2>
          </div>

          <div className="bg-[#08111f]/80 rounded-2xl overflow-x-auto border border-white/10 backdrop-blur-xl shadow-2xl">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-white/10 bg-[#0e1726]/60">
                  <th className="py-5 px-6 font-mono text-xs text-gray-400 uppercase tracking-wider w-1/4">
                    Specification
                  </th>
                  <th className="py-5 px-6 font-mono text-xs text-gray-400 uppercase tracking-wider w-1/4 text-center">
                    Individual
                  </th>
                  <th className="py-5 px-6 font-mono text-xs text-[#38f2ff] uppercase tracking-wider w-1/4 text-center bg-[#38f2ff]/5 border-x border-[#38f2ff]/20 font-bold">
                    Studio
                  </th>
                  <th className="py-5 px-6 font-mono text-xs text-gray-400 uppercase tracking-wider w-1/4 text-center">
                    Enterprise
                  </th>
                </tr>
              </thead>
              <tbody className="text-sm font-sans text-gray-300 divide-y divide-white/[0.06]">
                {specs.map((row, i) => (
                  <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-4 px-6 font-medium text-white">{row.feature}</td>
                    <td className="py-4 px-6 text-center text-gray-400">{row.individual}</td>
                    <td className="py-4 px-6 text-center text-[#38f2ff] bg-[#38f2ff]/5 border-x border-[#38f2ff]/20 font-semibold">
                      {row.studio}
                    </td>
                    <td className="py-4 px-6 text-center text-white">{row.enterprise}</td>
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
          <div className="text-center mb-12">
            <span className="font-mono text-xs text-[#38f2ff] uppercase tracking-widest block mb-2 font-bold">
              Architectural Assurance
            </span>
            <h2 className="font-space font-bold text-3xl sm:text-4xl text-white">
              What You Get With Every Project
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-[#08111f]/70 p-6 rounded-2xl border border-white/10 flex flex-col items-center text-center hover:border-[#38f2ff]/40 transition-colors backdrop-blur-xl">
              <div className="w-14 h-14 rounded-2xl bg-[#38f2ff]/10 border border-[#38f2ff]/30 flex items-center justify-center mb-5 text-[#38f2ff] shadow-[0_0_20px_rgba(56,242,255,0.2)]">
                <span className="material-symbols-outlined text-3xl">shield_locked</span>
              </div>
              <h4 className="font-space font-bold text-lg text-white mb-2">
                Security Hardened
              </h4>
              <p className="font-sans text-xs text-gray-400 leading-relaxed">
                Pen-tested architectures with built-in defense mechanisms against OWASP top 10 vulnerabilities.
              </p>
            </div>

            <div className="bg-[#08111f]/70 p-6 rounded-2xl border border-white/10 flex flex-col items-center text-center hover:border-[#38f2ff]/40 transition-colors backdrop-blur-xl">
              <div className="w-14 h-14 rounded-2xl bg-[#38f2ff]/10 border border-[#38f2ff]/30 flex items-center justify-center mb-5 text-[#38f2ff] shadow-[0_0_20px_rgba(56,242,255,0.2)]">
                <span className="material-symbols-outlined text-3xl">code_blocks</span>
              </div>
              <h4 className="font-space font-bold text-lg text-white mb-2">
                Clean Architecture
              </h4>
              <p className="font-sans text-xs text-gray-400 leading-relaxed">
                Strict adherence to SOLID principles, modular components, and dependency injection for effortless extensibility.
              </p>
            </div>

            <div className="bg-[#08111f]/70 p-6 rounded-2xl border border-white/10 flex flex-col items-center text-center hover:border-[#38f2ff]/40 transition-colors backdrop-blur-xl">
              <div className="w-14 h-14 rounded-2xl bg-[#38f2ff]/10 border border-[#38f2ff]/30 flex items-center justify-center mb-5 text-[#38f2ff] shadow-[0_0_20px_rgba(56,242,255,0.2)]">
                <span className="material-symbols-outlined text-3xl">menu_book</span>
              </div>
              <h4 className="font-space font-bold text-lg text-white mb-2">
                Rich Documentation
              </h4>
              <p className="font-sans text-xs text-gray-400 leading-relaxed">
                Comprehensive developer guides, API specs, database diagrams, and step-by-step setup guides.
              </p>
            </div>

            <div className="bg-[#08111f]/70 p-6 rounded-2xl border border-white/10 flex flex-col items-center text-center hover:border-[#38f2ff]/40 transition-colors backdrop-blur-xl">
              <div className="w-14 h-14 rounded-2xl bg-[#38f2ff]/10 border border-[#38f2ff]/30 flex items-center justify-center mb-5 text-[#38f2ff] shadow-[0_0_20px_rgba(56,242,255,0.2)]">
                <span className="material-symbols-outlined text-3xl">rocket_launch</span>
              </div>
              <h4 className="font-space font-bold text-lg text-white mb-2">
                Fast Deployment
              </h4>
              <p className="font-sans text-xs text-gray-400 leading-relaxed">
                Pre-configured environment templates, Docker files, and automated deployment pipelines for instant staging.
              </p>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════
            FREQUENTLY ASKED QUESTIONS (FAQ)
        ══════════════════════════════════════════════════════ */}
        <section className="mb-16">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-10">
              <span className="font-mono text-xs text-[#38f2ff] uppercase tracking-widest block mb-1 font-bold">
                Knowledge Base
              </span>
              <h2 className="font-space font-bold text-3xl text-white">
                Licensing FAQ
              </h2>
            </div>

            <div className="space-y-4">
              {(project.faqs || DEFAULT_FAQS).map((faq, index) => {
                const isOpen = openFaqIndex === index;
                return (
                  <div
                    key={index}
                    className="bg-[#08111f]/70 rounded-2xl border border-white/10 overflow-hidden backdrop-blur-xl transition"
                  >
                    <button
                      onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                      className="w-full p-5 text-left flex justify-between items-center gap-4 hover:text-[#38f2ff] transition-colors cursor-pointer"
                    >
                      <span className="font-space font-semibold text-base text-white">
                        {faq.question}
                      </span>
                      <span className="material-symbols-outlined text-[#38f2ff] transition-transform duration-200">
                        {isOpen ? "expand_less" : "expand_more"}
                      </span>
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-5 text-sm text-gray-300 leading-relaxed font-sans border-t border-white/5 pt-3">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      {/* ══════════════════════════════════════════════════════
          PLAN CHECKOUT / ACQUISITION MODAL
      ══════════════════════════════════════════════════════ */}
      {activePlanModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 sm:p-6 animate-fade-in">
          <div className="relative w-full max-w-lg bg-[#08111f] border border-[#38f2ff]/40 rounded-3xl p-6 sm:p-8 shadow-[0_0_80px_rgba(56,242,255,0.25)]">
            {/* Close Button */}
            <button
              onClick={() => setActivePlanModal(null)}
              className="absolute top-5 right-5 w-9 h-9 rounded-full bg-white/5 hover:bg-white/15 text-gray-400 hover:text-white flex items-center justify-center transition border border-white/10"
              aria-label="Close modal"
            >
              ✕
            </button>

            {/* Header */}
            <div className="mb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#38f2ff]/10 text-[#38f2ff] font-mono text-[10px] uppercase font-bold mb-3">
                <span className="w-1.5 h-1.5 rounded-full bg-[#38f2ff] animate-pulse" />
                <span>Plan Selected</span>
              </div>
              <h3 className="font-space font-bold text-2xl text-white mb-1">
                {activePlanModal.name}
              </h3>
              <p className="font-mono text-xs text-gray-400">
                Target Repository: <span className="text-[#38f2ff] font-bold">{project.title}</span>
              </p>
            </div>

            {/* Price Badge with BDT & USD */}
            <div className="p-4 rounded-2xl bg-[#0c182c] border border-white/10 mb-6 flex items-center justify-between">
              <div>
                <div className="font-mono text-[10px] uppercase text-gray-400">Total Investment</div>
                <div className="flex flex-wrap items-baseline gap-2 mt-0.5">
                  <span className="font-space font-bold text-2xl sm:text-3xl text-white">
                    {activePlanModal.currencySymbol ? `${activePlanModal.currencySymbol} ` : ""}
                    {activePlanModal.price}
                  </span>
                  {formatUsdPrice(activePlanModal.usdPrice, activePlanModal.price) && (
                    <span className="font-mono text-sm font-bold text-emerald-400">
                      (≈ {formatUsdPrice(activePlanModal.usdPrice, activePlanModal.price)})
                    </span>
                  )}
                </div>
              </div>
              <span className="font-mono text-xs text-gray-400 px-3 py-1 rounded-lg bg-white/5 border border-white/10">
                {activePlanModal.billingPeriod}
              </span>
            </div>

            {/* Plan Highlights */}
            <div className="mb-8">
              <div className="font-mono text-xs text-gray-400 uppercase tracking-wider mb-2.5 font-semibold">
                Included in this license:
              </div>
              <ul className="space-y-2">
                {activePlanModal.features.filter((f) => f.included).slice(0, 4).map((feat, i) => (
                  <li key={i} className="flex items-center gap-2 text-xs text-gray-200">
                    <span className="material-symbols-outlined text-[#38f2ff] text-base">check</span>
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
                className="w-full py-3.5 px-6 rounded-xl bg-[#38f2ff] hover:bg-[#00e1f0] text-[#030712] font-sans font-bold text-sm transition shadow-[0_0_25px_rgba(56,242,255,0.4)] hover:scale-[1.02] flex items-center justify-center gap-2.5 text-center cursor-pointer"
              >
                <span className="material-symbols-outlined text-xl">shopping_cart_checkout</span>
                <span>Proceed to Secure Checkout</span>
              </Link>

              {/* Option 2: WhatsApp Instant Inquiry */}
              <a
                href={getWhatsAppUrl(activePlanModal)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 px-6 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-sans font-semibold text-xs transition flex items-center justify-center gap-2 text-center"
              >
                <span className="material-symbols-outlined text-base">chat</span>
                <span>Inquire / Checkout via WhatsApp</span>
              </a>

              <p className="text-[11px] font-mono text-gray-500 text-center pt-2">
                🔒 Protected by DevEngine Commercial License Agreement & NDA
              </p>
            </div>
          </div>
        </div>
      )}

      <LandingFooter />
    </>
  );
}
