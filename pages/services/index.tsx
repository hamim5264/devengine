import React, { useEffect, useState, useMemo } from "react";
import Head from "next/head";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import LandingNavbar from "@/components/landing/LandingNavbar";
import LandingFooter from "@/components/landing/LandingFooter";
import HelixLoader from "@/components/HelixLoader";
import { getCachedData, setCachedData } from "@/lib/utils/cacheService";
import { DevEngineService } from "@/types/service";
import {
  getPublicServices,
  submitServiceInquiry,
  DEFAULT_SERVICES,
} from "@/lib/services/servicesService";

const CATEGORIES = [
  { name: "All", icon: "apps" },
  { name: "Web Architecture", icon: "language" },
  { name: "Mobile Engineering", icon: "phone_iphone" },
  { name: "AI & Machine Learning", icon: "psychology" },
  { name: "Cloud & DevOps", icon: "cloud" },
  { name: "Enterprise Systems", icon: "dns" },
];

const ENGINEERING_STEPS = [
  {
    step: "01",
    title: "System Discovery & Architecture",
    description:
      "Deep technical breakdown of user flows, system dependencies, API specs, database schemas, and security boundaries.",
    icon: "architecture",
  },
  {
    step: "02",
    title: "Agile Sprint Execution",
    description:
      "Rapid, milestone-driven development pods writing clean, 100% type-safe code with automated testing at every pull request.",
    icon: "code_blocks",
  },
  {
    step: "03",
    title: "Zero-Defect QA & Hardening",
    description:
      "Penetration testing, stress load benchmarking, Lighthouse performance optimization, and cross-platform verification.",
    icon: "verified_user",
  },
  {
    step: "04",
    title: "Automated Deployment & Telemetry",
    description:
      "Zero-downtime CI/CD container deployment, real-time error tracing via Sentry, and 99.99% cloud uptime monitoring.",
    icon: "rocket_launch",
  },
];

export default function ServicesPage() {
  const [services, setServices] = useState<DevEngineService[]>(() => {
    return getCachedData<DevEngineService[]>("services_list", DEFAULT_SERVICES);
  });
  const [loading, setLoading] = useState(() => {
    const cached = getCachedData<DevEngineService[] | null>("services_list", null);
    return !cached || cached.length === 0;
  });
  const [selectedCategory, setSelectedCategory] = useState("All");

  // Modal State for Project Inquiry
  const [inquiryModalOpen, setInquiryModalOpen] = useState(false);
  const [selectedServiceForInquiry, setSelectedServiceForInquiry] =
    useState<DevEngineService | null>(null);
  const [submittingInquiry, setSubmittingInquiry] = useState(false);
  const [inquirySubmitted, setInquirySubmitted] = useState(false);
  const [form, setForm] = useState({
    clientName: "",
    clientEmail: "",
    clientPhone: "",
    projectDetails: "",
    budgetRange: "$1k - $3k",
    estimatedTimeline: "1-2 Months",
  });

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await getPublicServices();
        if (mounted && data.length > 0) {
          setServices(data);
          setCachedData("services_list", data);
        }
      } catch (err) {
        console.error("Failed to load services:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const filteredServices = useMemo(() => {
    if (selectedCategory === "All") return services;
    return services.filter((s) => s.category === selectedCategory);
  }, [services, selectedCategory]);

  const handleOpenInquiry = (service?: DevEngineService) => {
    setSelectedServiceForInquiry(service || null);
    setInquirySubmitted(false);
    setInquiryModalOpen(true);
  };

  const handleInquirySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.clientName || !form.clientEmail || !form.projectDetails) {
      alert("Please fill in your name, email, and project details.");
      return;
    }

    try {
      setSubmittingInquiry(true);
      await submitServiceInquiry({
        serviceId: selectedServiceForInquiry?.id || "general",
        serviceTitle: selectedServiceForInquiry?.title || "General Engineering Inquiry",
        clientName: form.clientName,
        clientEmail: form.clientEmail,
        clientPhone: form.clientPhone,
        projectDetails: form.projectDetails,
        budgetRange: form.budgetRange,
        estimatedTimeline: form.estimatedTimeline,
      });
      setInquirySubmitted(true);
    } catch (err: any) {
      alert("Failed to submit inquiry: " + (err?.message || "Please try again."));
    } finally {
      setSubmittingInquiry(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-[var(--devengine-page)] z-50 flex items-center justify-center">
        <HelixLoader size={80} color="#2cecf7" text="LOADING SERVICES..." />
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Engineering Services & Technical Solutions | DevEngine</title>
        <meta
          name="description"
          content="Explore DevEngine's full-stack web architectures, mobile app engineering, bespoke AI integrations, and cloud infrastructure solutions."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      <div className="min-h-screen bg-[var(--devengine-page)] text-[var(--devengine-text)] relative overflow-x-hidden transition-colors duration-300">
        {/* Ambient Cyber Light Canvas (Light & Dark Compatible) */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          <div className="absolute -top-[15%] -left-[10%] w-[min(60vw,750px)] aspect-square rounded-full bg-[radial-gradient(circle,rgba(44,236,247,0.18),transparent_70%)] blur-[90px] opacity-30 dark:opacity-45" />
          <div className="absolute top-[35%] -right-[10%] w-[min(55vw,680px)] aspect-square rounded-full bg-[radial-gradient(circle,rgba(44,236,247,0.14),transparent_70%)] blur-[90px] opacity-25 dark:opacity-35" />
          <div className="absolute bottom-[5%] left-[20%] w-[min(50vw,600px)] aspect-square rounded-full bg-[radial-gradient(circle,rgba(44,236,247,0.12),transparent_70%)] blur-[90px] opacity-20 dark:opacity-30" />
          <div className="absolute inset-0 bg-[linear-gradient(var(--devengine-border)_1px,transparent_1px),linear-gradient(90deg,var(--devengine-border)_1px,transparent_1px)] bg-[size:50px_50px] opacity-15 dark:opacity-25 [mask-image:radial-gradient(ellipse_90%_80%_at_50%_50%,#000_30%,transparent_85%)]" />
        </div>

        <LandingNavbar />

        <main className="relative z-10 w-full pt-28 sm:pt-36 pb-24 selection:bg-[#2cecf7] selection:text-[#02040a]">
          {/* ═════════════════════════════════════════════════════════════════
              HERO SECTION
          ═════════════════════════════════════════════════════════════════ */}
          <section className="w-full max-w-[1780px] 2xl:max-w-[1920px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 text-center mb-16 sm:mb-20">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              {/* Pill Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-50 dark:bg-[#2cecf7]/10 border border-cyan-200 dark:border-[#2cecf7]/30 text-[#0284c7] dark:text-[#2cecf7] mb-6 sm:mb-7 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-[#0284c7] dark:bg-[#2cecf7] animate-pulse" />
                <span className="font-jetbrains text-[11px] uppercase tracking-widest font-bold">
                  Engineering Capabilities &amp; Enterprise Solutions
                </span>
              </div>

              {/* Solid, Crisp High-Contrast Headline */}
              <h1 className="font-[family-name:var(--font-site,'Poppins',sans-serif)] font-extrabold text-3xl sm:text-5xl md:text-6xl lg:text-7xl tracking-tight mb-5 sm:mb-6 leading-[1.14] max-w-5xl mx-auto">
                <span className="text-slate-950 dark:text-slate-50">
                  Architecting Scalable Software &amp;
                </span>{" "}
                <br className="hidden sm:inline" />
                <span className="text-[#0284c7] dark:text-[#2cecf7]">
                  Next-Gen Platforms
                </span>
              </h1>

              <p className="font-sans text-sm sm:text-base md:text-lg text-slate-600 dark:text-slate-300 max-w-3xl mx-auto mb-9 sm:mb-10 leading-relaxed font-normal">
                From high-throughput Next.js microservices and silky 120 FPS mobile apps to bespoke AI orchestration and cloud automation. We engineer turnkey digital systems with zero compromises.
              </p>

              {/* Quick Action CTAs */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 sm:gap-4">
                <a
                  href="/home#contact"
                  className="w-full sm:w-auto px-8 sm:px-9 py-3.5 sm:py-4 rounded-xl bg-[#2cecf7] text-[#02040a] font-mono font-bold text-xs sm:text-sm uppercase tracking-wider shadow-md shadow-[#2cecf7]/25 hover:bg-[#53f2fb] hover:shadow-lg hover:shadow-[#2cecf7]/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 flex items-center justify-center gap-2.5 cursor-pointer whitespace-nowrap"
                >
                  <span className="material-symbols-outlined text-base font-bold">terminal</span>
                  <span>Request Project Consultation</span>
                </a>

                <a
                  href="#catalog"
                  className="w-full sm:w-auto px-8 sm:px-9 py-3.5 sm:py-4 rounded-xl bg-white dark:bg-[#0a0f1d] hover:bg-slate-50 dark:hover:bg-[#111827] text-slate-900 dark:text-white font-mono font-semibold text-xs sm:text-sm uppercase tracking-wider border border-slate-200 dark:border-cyan-500/30 hover:border-[#2cecf7] shadow-xs hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 flex items-center justify-center gap-2.5 cursor-pointer whitespace-nowrap"
                >
                  <span>Explore Capabilities</span>
                  <span className="material-symbols-outlined text-base text-[#0284c7] dark:text-[#2cecf7]">
                    arrow_downward
                  </span>
                </a>
              </div>
            </motion.div>

            {/* Key Metrics Strip */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15, ease: "easeOut" }}
              className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-5 max-w-5xl mx-auto mt-14 pt-8 border-t border-slate-200/80 dark:border-white/10"
            >
              <div className="bg-white dark:bg-[#0a0f1d] p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-cyan-500/20 shadow-xs hover:border-[#2cecf7] transition-all">
                <div className="font-[family-name:var(--font-site,'Poppins',sans-serif)] font-extrabold text-2xl sm:text-3xl text-slate-900 dark:text-white">
                  99.99%
                </div>
                <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1 font-semibold">
                  Uptime Architecture
                </div>
              </div>

              <div className="bg-white dark:bg-[#0a0f1d] p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-cyan-500/20 shadow-xs hover:border-[#2cecf7] transition-all">
                <div className="font-[family-name:var(--font-site,'Poppins',sans-serif)] font-extrabold text-2xl sm:text-3xl text-[#0284c7] dark:text-[#2cecf7]">
                  100%
                </div>
                <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1 font-semibold">
                  Type-Safe Code
                </div>
              </div>

              <div className="bg-white dark:bg-[#0a0f1d] p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-cyan-500/20 shadow-xs hover:border-[#2cecf7] transition-all">
                <div className="font-[family-name:var(--font-site,'Poppins',sans-serif)] font-extrabold text-2xl sm:text-3xl text-slate-900 dark:text-white">
                  &lt; 30 Days
                </div>
                <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1 font-semibold">
                  Avg. MVP Delivery
                </div>
              </div>

              <div className="bg-white dark:bg-[#0a0f1d] p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-cyan-500/20 shadow-xs hover:border-[#2cecf7] transition-all">
                <div className="font-[family-name:var(--font-site,'Poppins',sans-serif)] font-extrabold text-2xl sm:text-3xl text-emerald-600 dark:text-emerald-400">
                  24/7
                </div>
                <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1 font-semibold">
                  Active Monitoring
                </div>
              </div>
            </motion.div>
          </section>

          {/* ═════════════════════════════════════════════════════════════════
              SERVICES CATALOG & BENTO GRID
          ═════════════════════════════════════════════════════════════════ */}
          <section id="catalog" className="w-full max-w-[1780px] 2xl:max-w-[1920px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 mb-24 scroll-mt-28">
            {/* Command Header & Filter Bar */}
            <div className="bg-white/95 dark:bg-[#0a0f1d]/95 backdrop-blur-2xl p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/90 dark:border-cyan-500/20 shadow-lg shadow-slate-200/40 dark:shadow-black/60 mb-8 sm:mb-10 space-y-4">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 bg-cyan-50 dark:bg-[#2cecf7]/10 text-[#0284c7] dark:text-[#2cecf7] px-3 py-1 rounded-full font-jetbrains text-xs uppercase tracking-widest font-bold mb-2 border border-cyan-200 dark:border-[#2cecf7]/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0284c7] dark:bg-[#2cecf7]" />
                    SERVICE PORTFOLIO
                  </div>
                  <h2 className="font-[family-name:var(--font-site,'Poppins',sans-serif)] font-bold text-2xl sm:text-3xl lg:text-4xl text-slate-900 dark:text-white tracking-tight">
                    Engineering Capabilities
                  </h2>
                  <p className="font-sans text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 max-w-2xl">
                    Select a domain to inspect our specialized architectures, deliverables, and tech stacks.
                  </p>
                </div>

                {/* Service Count Telemetry */}
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-500/20 text-xs font-mono text-emerald-700 dark:text-emerald-400 font-semibold shrink-0 self-start md:self-auto">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Showing {filteredServices.length} Specialized Offerings</span>
                </div>
              </div>

              {/* Category Filter Pills (Scrollbar-Free, Responsive, and Light/Dark Adaptable) */}
              <div className="flex items-center gap-2 overflow-x-auto py-1 scroll-smooth border-t border-slate-100 dark:border-slate-800/80 pt-3 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                {CATEGORIES.map((cat) => {
                  const count =
                    cat.name === "All"
                      ? services.length
                      : services.filter((s) => s.category === cat.name).length;
                  const isSelected = selectedCategory === cat.name;

                  return (
                    <button
                      key={cat.name}
                      onClick={() => setSelectedCategory(cat.name)}
                      className={`whitespace-nowrap px-4 py-2 rounded-full font-mono text-xs tracking-wide transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                        isSelected
                          ? "bg-[#2cecf7] text-[#02040a] font-bold shadow-md shadow-[#2cecf7]/20 border border-[#2cecf7]"
                          : "bg-slate-50 dark:bg-[#111827] text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white border border-slate-200/80 dark:border-slate-700/80 hover:border-[#2cecf7] shadow-2xs"
                      }`}
                    >
                      <span className="material-symbols-outlined text-base">
                        {cat.icon}
                      </span>
                      <span>{cat.name}</span>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.2 rounded-full ${
                          isSelected
                            ? "bg-[#02040a]/15 text-[#02040a] font-bold"
                            : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold"
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Services Cards Grid with Smooth Animated Layout */}
            {loading ? (
              <div className="py-24 flex flex-col items-center justify-center">
                <HelixLoader size={48} color="#2cecf7" />
                <p className="mt-4 font-mono text-xs text-slate-500 uppercase tracking-widest">
                  Compiling Engineering Catalog…
                </p>
              </div>
            ) : filteredServices.length === 0 ? (
              <div className="p-12 text-center bg-white dark:bg-[#0a0f1d] rounded-3xl border border-slate-200 dark:border-cyan-500/20 max-w-md mx-auto my-12 shadow-sm">
                <span className="material-symbols-outlined text-3xl text-slate-400 mb-2">
                  search_off
                </span>
                <h3 className="font-bold text-slate-900 dark:text-white mb-1">
                  No offerings found
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  No services matching the selected category.
                </p>
                <button
                  onClick={() => setSelectedCategory("All")}
                  className="px-4 py-2 bg-[#2cecf7] text-[#02040a] rounded-full text-xs font-mono font-bold hover:bg-[#53f2fb] transition cursor-pointer"
                >
                  Show All Services
                </button>
              </div>
            ) : (
              <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
                <AnimatePresence mode="popLayout">
                  {filteredServices.map((service) => (
                    <motion.div
                      layout
                      key={service.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.28, ease: "easeOut" }}
                      whileHover={{ y: -6, transition: { duration: 0.2 } }}
                      className="bg-white dark:bg-[#0a0f1d] rounded-3xl border border-slate-200/90 dark:border-cyan-500/20 shadow-md shadow-slate-200/40 dark:shadow-black/60 hover:border-[#2cecf7] hover:shadow-xl hover:shadow-[#2cecf7]/10 transition-all duration-300 group flex flex-col justify-between p-6 sm:p-7 relative overflow-hidden"
                    >
                      {/* Top Cyber Accent Strip */}
                      <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#2cecf7] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                      <div>
                        {/* Top Row: Icon & Status Badge */}
                        <div className="flex items-center justify-between gap-3 mb-5">
                          <div className="w-12 h-12 rounded-2xl bg-cyan-50 dark:bg-cyan-500/10 border border-cyan-200/70 dark:border-cyan-500/25 text-[#0284c7] dark:text-[#2cecf7] flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                            <span className="material-symbols-outlined text-2xl">
                              {service.icon || "layers"}
                            </span>
                          </div>

                          {service.badge && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-[#0284c7] dark:text-[#2cecf7] font-mono text-[10px] uppercase tracking-wider font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#0284c7] dark:bg-[#2cecf7] animate-pulse" />
                              {service.badge}
                            </span>
                          )}
                        </div>

                        {/* Title & Tagline */}
                        <h3 className="font-[family-name:var(--font-site,'Poppins',sans-serif)] font-bold text-xl sm:text-2xl text-slate-900 dark:text-white mb-1.5 group-hover:text-[#0284c7] dark:group-hover:text-[#2cecf7] transition-colors leading-snug">
                          {service.title}
                        </h3>
                        <p className="font-sans text-xs sm:text-sm text-[#0284c7] dark:text-[#2cecf7] font-semibold mb-3 leading-snug line-clamp-2">
                          {service.tagline}
                        </p>

                        {/* Clean Description */}
                        <p className="font-sans text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-3 mb-5">
                          {service.description}
                        </p>

                        {/* Key Deliverables - High Contrast 3 Items */}
                        {service.deliverables && service.deliverables.length > 0 && (
                          <div className="mb-5 py-3 border-y border-slate-100 dark:border-slate-800/80">
                            <div className="font-mono text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold mb-2.5 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#0284c7] dark:bg-[#2cecf7]" />
                              <span>Key Deliverables</span>
                            </div>
                            <div className="space-y-1.5">
                              {service.deliverables.slice(0, 3).map((d, i) => (
                                <div key={i} className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                                  <span className="text-emerald-600 dark:text-[#2cecf7] text-xs font-bold shrink-0">✓</span>
                                  <span className="truncate">{d}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Tech Stack Chips */}
                        {service.techStack && service.techStack.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 mb-6">
                            {service.techStack.slice(0, 4).map((tech, i) => (
                              <span
                                key={i}
                                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 font-mono text-[10px] text-slate-700 dark:text-slate-300 group-hover:border-[#2cecf7]/40 transition-colors"
                              >
                                {tech}
                              </span>
                            ))}
                            {service.techStack.length > 4 && (
                              <span className="px-2 py-1 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-[10px] text-slate-500 dark:text-slate-400">
                                +{service.techStack.length - 4}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Bottom Footer: Timeline & Action Button */}
                      <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-1.5 font-mono text-xs text-slate-500 dark:text-slate-400">
                          <span className="material-symbols-outlined text-sm text-[#0284c7] dark:text-[#2cecf7]">schedule</span>
                          <span>{service.timeline || "2-4 Weeks Sprint"}</span>
                        </div>

                        <button
                          onClick={() => handleOpenInquiry(service)}
                          className="bg-[#2cecf7] hover:bg-[#53f2fb] text-[#02040a] font-mono font-bold text-xs uppercase tracking-wider px-4 py-2 rounded-xl border border-[#2cecf7] transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                        >
                          <span>Inquire</span>
                          <span className="material-symbols-outlined text-sm transition-transform group-hover:translate-x-0.5">
                            arrow_forward
                          </span>
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </section>

          {/* ═════════════════════════════════════════════════════════════════
              THE DEVENGINE METHOD (ENGINEERING LIFECYCLE)
          ═════════════════════════════════════════════════════════════════ */}
          <section className="w-full max-w-[1780px] 2xl:max-w-[1920px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 mb-24">
            <div className="bg-white/95 dark:bg-[#0a0f1d]/95 backdrop-blur-2xl p-6 sm:p-10 lg:p-12 rounded-3xl border border-slate-200/90 dark:border-cyan-500/20 shadow-lg shadow-slate-200/40 dark:shadow-black/60">
              <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-14">
                <div className="inline-flex items-center gap-2 bg-cyan-50 dark:bg-[#2cecf7]/10 text-[#0284c7] dark:text-[#2cecf7] px-3 py-1 rounded-full font-jetbrains text-xs uppercase tracking-widest font-bold mb-3 border border-cyan-200 dark:border-[#2cecf7]/20">
                  THE DEVENGINE STANDARD
                </div>
                <h2 className="font-[family-name:var(--font-site,'Poppins',sans-serif)] font-bold text-3xl sm:text-4xl lg:text-5xl text-slate-900 dark:text-white tracking-tight mb-4">
                  How We Execute
                </h2>
                <p className="font-sans text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                  Every system we deliver follows an exhaustive four-phase engineering lifecycle designed for speed, transparency, and zero technical debt.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
                {ENGINEERING_STEPS.map((s, idx) => (
                  <motion.div
                    key={idx}
                    whileHover={{ y: -4, transition: { duration: 0.2 } }}
                    className="bg-slate-50 dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 relative overflow-hidden group hover:border-[#2cecf7] hover:shadow-md transition-all duration-300 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <span className="font-[family-name:var(--font-site,'Poppins',sans-serif)] font-extrabold text-3xl sm:text-4xl text-[#0284c7] dark:text-[#2cecf7] font-mono">
                          {s.step}
                        </span>
                        <div className="w-9 h-9 rounded-xl bg-white dark:bg-[#0a0f1d] border border-slate-200 dark:border-slate-700/80 text-[#0284c7] dark:text-[#2cecf7] flex items-center justify-center">
                          <span className="material-symbols-outlined text-lg">
                            {s.icon}
                          </span>
                        </div>
                      </div>

                      <h4 className="font-[family-name:var(--font-site,'Poppins',sans-serif)] font-bold text-base sm:text-lg text-slate-900 dark:text-white mb-2 leading-snug">
                        {s.title}
                      </h4>
                      <p className="font-sans text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                        {s.description}
                      </p>
                    </div>

                    <div className="mt-5 pt-3 border-t border-slate-200/60 dark:border-slate-800/80 flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500 font-semibold">
                      <span>Phase {s.step}</span>
                      <span>● Verified</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* ═════════════════════════════════════════════════════════════════
              BOTTOM CTA BANNER
          ═════════════════════════════════════════════════════════════════ */}
          <section className="w-full max-w-[1780px] 2xl:max-w-[1920px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 mb-20">
            <div className="bg-gradient-to-br from-cyan-50/90 via-sky-50/70 to-white dark:from-[#0a0f1d] dark:via-[#111827] dark:to-[#060a14] rounded-3xl p-8 sm:p-12 lg:p-14 border border-cyan-200/90 dark:border-cyan-500/30 shadow-xl shadow-cyan-500/5 relative overflow-hidden">
              <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8 text-center lg:text-left">
                <div className="max-w-xl">
                  <span className="px-3 py-1 rounded-full bg-cyan-100 dark:bg-[#2cecf7]/10 border border-cyan-300 dark:border-[#2cecf7]/30 text-[#0284c7] dark:text-[#2cecf7] font-mono text-[10px] uppercase tracking-widest font-bold inline-block mb-3">
                    Ready to Deploy?
                  </span>
                  <h3 className="font-[family-name:var(--font-site,'Poppins',sans-serif)] font-bold text-2xl sm:text-3xl lg:text-4xl text-slate-900 dark:text-white mb-3 tracking-tight">
                    Have a Unique Product Vision? Let&apos;s Build It.
                  </h3>
                  <p className="font-sans text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    Partner with DevEngine for high-velocity engineering, direct architectural consultation, and production-grade delivery.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3.5 shrink-0 w-full sm:w-auto">
                  <a
                    href="/home#contact"
                    className="w-full sm:w-auto bg-[#2cecf7] text-[#02040a] font-mono font-bold text-xs sm:text-sm uppercase tracking-wider px-7 py-3.5 sm:py-4 rounded-xl shadow-md shadow-[#2cecf7]/25 hover:bg-[#53f2fb] hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer whitespace-nowrap border border-[#2cecf7] flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-base font-bold">terminal</span>
                    <span>Start Project Inquiry</span>
                  </a>

                  <a
                    href="https://wa.me/8801724879284?text=Hello%20DevEngine,%20I%20would%20like%20to%20inquire%20about%20your%20services."
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30 font-mono font-semibold text-xs sm:text-sm uppercase tracking-wider px-7 py-3.5 sm:py-4 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap shadow-xs"
                  >
                    <span className="material-symbols-outlined text-lg text-emerald-600 dark:text-emerald-400">chat</span>
                    <span>Chat on WhatsApp</span>
                  </a>
                </div>
              </div>
            </div>
          </section>
        </main>

        {/* ═════════════════════════════════════════════════════════════════
            INTERACTIVE PROJECT INQUIRY MODAL (LIGHT/DARK ADAPTABLE)
        ═════════════════════════════════════════════════════════════════ */}
        <AnimatePresence>
          {inquiryModalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/85 backdrop-blur-md"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 16 }}
                transition={{ duration: 0.25 }}
                className="bg-white dark:bg-[#0a0f1d] text-slate-900 dark:text-white border border-slate-200 dark:border-cyan-500/30 rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl relative max-h-[90vh] overflow-y-auto"
              >
                {/* Close Button */}
                <button
                  onClick={() => setInquiryModalOpen(false)}
                  className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-600 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition cursor-pointer"
                >
                  ✕
                </button>

                {inquirySubmitted ? (
                  <div className="text-center py-8 space-y-4">
                    <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-500/20 border border-emerald-300 dark:border-emerald-500/40 text-emerald-600 dark:text-emerald-300 flex items-center justify-center mx-auto text-3xl font-bold">
                      ✓
                    </div>
                    <h3 className="font-[family-name:var(--font-site,'Poppins',sans-serif)] font-bold text-2xl text-slate-900 dark:text-white">
                      Inquiry Received!
                    </h3>
                    <p className="font-sans text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto leading-relaxed">
                      Thank you, <span className="text-[#0284c7] dark:text-[#2cecf7] font-bold">{form.clientName}</span>. A DevEngine lead architect will review your project requirements and respond within 24 hours.
                    </p>
                    <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                      <a
                        href="https://wa.me/8801724879284?text=Hello%20DevEngine,%20I%20just%20submitted%20a%20consultation%20inquiry."
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/20 hover:bg-emerald-100 dark:hover:bg-emerald-500/30 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/40 text-xs font-mono font-bold uppercase tracking-wider transition"
                      >
                        <span className="material-symbols-outlined text-base">chat</span>
                        <span>Chat on WhatsApp</span>
                      </a>
                      <button
                        onClick={() => setInquiryModalOpen(false)}
                        className="bg-[#2cecf7] hover:bg-[#53f2fb] text-[#02040a] font-mono font-bold text-xs uppercase tracking-wider px-8 py-3 rounded-xl transition cursor-pointer"
                      >
                        Close Window
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleInquirySubmit} className="space-y-4">
                    <div>
                      <span className="px-2.5 py-0.5 rounded-full bg-cyan-50 dark:bg-[#2cecf7]/10 border border-cyan-200 dark:border-[#2cecf7]/30 text-[#0284c7] dark:text-[#2cecf7] font-mono text-[10px] uppercase font-bold tracking-wider inline-block mb-1.5">
                        Direct Consultation
                      </span>
                      <h3 className="font-[family-name:var(--font-site,'Poppins',sans-serif)] font-bold text-2xl text-slate-900 dark:text-white">
                        {selectedServiceForInquiry
                          ? `Inquire: ${selectedServiceForInquiry.title}`
                          : "Start a Project Consultation"}
                      </h3>
                      <p className="font-sans text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Tell us about your system goals, architecture requirements, and timeline.
                      </p>
                    </div>

                    {/* Instant WhatsApp Quick Connect */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-500/25">
                      <div className="flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300 font-sans">
                        <span className="material-symbols-outlined text-base text-emerald-600 dark:text-emerald-400 shrink-0">chat</span>
                        <span>Prefer instant chat? Connect directly:</span>
                      </div>
                      <a
                        href="https://wa.me/8801724879284?text=Hello%20DevEngine,%20I%20would%20like%20to%20consult%20about%20a%20project."
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-xs uppercase tracking-wider transition shrink-0 self-start sm:self-auto shadow-xs"
                      >
                        <span>WhatsApp</span>
                        <span className="material-symbols-outlined text-sm">open_in_new</span>
                      </a>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block text-xs font-mono text-slate-600 dark:text-slate-300 mb-1 font-semibold">
                          Your Name *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Alex Morgan"
                          value={form.clientName}
                          onChange={(e) =>
                            setForm({ ...form, clientName: e.target.value })
                          }
                          className="w-full bg-slate-50 dark:bg-[#111827] border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#2cecf7] focus:ring-2 focus:ring-[#2cecf7]/20 transition"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-mono text-slate-600 dark:text-slate-300 mb-1 font-semibold">
                          Email Address *
                        </label>
                        <input
                          type="email"
                          required
                          placeholder="alex@company.com"
                          value={form.clientEmail}
                          onChange={(e) =>
                            setForm({ ...form, clientEmail: e.target.value })
                          }
                          className="w-full bg-slate-50 dark:bg-[#111827] border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#2cecf7] focus:ring-2 focus:ring-[#2cecf7]/20 transition"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-mono text-slate-600 dark:text-slate-300 mb-1 font-semibold">
                          Phone / WhatsApp (Optional)
                        </label>
                        <input
                          type="text"
                          placeholder="+1 (555) 000-0000"
                          value={form.clientPhone}
                          onChange={(e) =>
                            setForm({ ...form, clientPhone: e.target.value })
                          }
                          className="w-full bg-slate-50 dark:bg-[#111827] border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#2cecf7] focus:ring-2 focus:ring-[#2cecf7]/20 transition"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-mono text-slate-600 dark:text-slate-300 mb-1 font-semibold">
                          Estimated Budget
                        </label>
                        <select
                          value={form.budgetRange}
                          onChange={(e) =>
                            setForm({ ...form, budgetRange: e.target.value })
                          }
                          className="w-full bg-slate-50 dark:bg-[#111827] border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#2cecf7] focus:ring-2 focus:ring-[#2cecf7]/20 transition cursor-pointer"
                        >
                          <option value="Under $1,000">Under $1,000</option>
                          <option value="$1,000 - $3,000">$1,000 - $3,000</option>
                          <option value="$3,000 - $8,000">$3,000 - $8,000</option>
                          <option value="$8,000+">$8,000+ (Enterprise)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-mono text-slate-600 dark:text-slate-300 mb-1 font-semibold">
                        Project Overview &amp; Requirements *
                      </label>
                      <textarea
                        rows={4}
                        required
                        placeholder="Briefly describe what you want to engineer, key features, platform targets, and any deadlines..."
                        value={form.projectDetails}
                        onChange={(e) =>
                          setForm({ ...form, projectDetails: e.target.value })
                        }
                        className="w-full bg-slate-50 dark:bg-[#111827] border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#2cecf7] focus:ring-2 focus:ring-[#2cecf7]/20 transition resize-none"
                      />
                    </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={submittingInquiry}
                        className="w-full bg-[#2cecf7] hover:bg-[#53f2fb] text-[#02040a] font-mono font-bold text-xs uppercase tracking-wider py-3.5 rounded-xl shadow-md shadow-[#2cecf7]/25 transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {submittingInquiry ? (
                          <>
                            <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                            <span>Submitting Consultation...</span>
                          </>
                        ) : (
                          <>
                            <span>Submit Project Inquiry</span>
                            <span className="material-symbols-outlined text-sm font-bold">send</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <LandingFooter />
      </div>
    </>
  );
}
