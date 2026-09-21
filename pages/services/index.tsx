import React, { useEffect, useState, useMemo } from "react";
import Head from "next/head";
import Link from "next/link";
import LandingNavbar from "@/components/landing/LandingNavbar";
import LandingFooter from "@/components/landing/LandingFooter";
import HelixLoader from "@/components/HelixLoader";
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
  const [services, setServices] = useState<DevEngineService[]>(DEFAULT_SERVICES);
  const [loading, setLoading] = useState(true);
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

      {/* Global Cyber Background Canvas */}
      <div className="fixed inset-0 bg-[#060a12] z-[-10]" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_50%_15%,rgba(14,24,42,0.95)_0%,rgba(3,7,18,1)_100%)] z-[-9] pointer-events-none" />
      <div className="fixed inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] z-[-8] pointer-events-none opacity-60" />

      {/* Ambient Lighting Orbs */}
      <div className="fixed top-20 left-1/4 w-[650px] h-[650px] bg-[#38f2ff]/6 rounded-full blur-[140px] pointer-events-none z-[-7]" />
      <div className="fixed top-1/2 right-1/4 w-[550px] h-[550px] bg-[#3495ea]/6 rounded-full blur-[130px] pointer-events-none z-[-7]" />

      <LandingNavbar />

      <main className="relative z-10 w-full text-[#dde2f3] font-sans selection:bg-[#38f2ff] selection:text-[#030712] pt-32 sm:pt-40 pb-24">
        {/* ═════════════════════════════════════════════════════════════════
            HERO SECTION
        ═════════════════════════════════════════════════════════════════ */}
        <section className="px-6 sm:px-12 md:px-20 max-w-7xl mx-auto text-center mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#38f2ff]/10 border border-[#38f2ff]/30 mb-8 shadow-[0_0_20px_rgba(56,242,255,0.15)]">
            <span className="w-2 h-2 rounded-full bg-[#38f2ff] animate-pulse" />
            <span className="font-jetbrains text-[11px] text-[#38f2ff] uppercase tracking-widest font-bold">
              Engineering Capabilities & Enterprise Solutions
            </span>
          </div>

          <h1 className="font-space font-bold text-4xl sm:text-6xl md:text-7xl text-white mb-6 leading-tight tracking-tight max-w-5xl mx-auto">
            Architecting Scalable Software &{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#38f2ff] via-[#00dbe8] to-[#3495ea] drop-shadow-[0_0_35px_rgba(56,242,255,0.35)]">
              Next-Gen Platforms
            </span>
          </h1>

          <p className="font-sans text-base sm:text-lg text-[#849495] max-w-3xl mx-auto mb-10 leading-relaxed">
            From high-throughput Next.js microservices and silky 120 FPS mobile apps to bespoke AI orchestration and cloud automation. We engineer turnkey digital systems with zero compromises.
          </p>

          {/* Quick Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-5">
            {/* Primary Hero Button: Link to Contact Section */}
            <a
              href="/home#contact"
              className="relative group overflow-hidden w-full sm:w-auto px-8 sm:px-9 py-4 rounded-xl bg-gradient-to-r from-[#38f2ff] via-[#22d3ee] to-[#00dbe8] text-[#030712] font-space font-bold text-xs sm:text-sm uppercase tracking-wider shadow-[0_0_30px_rgba(56,242,255,0.4)] hover:shadow-[0_0_50px_rgba(56,242,255,0.7)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-3 cursor-pointer whitespace-nowrap border-t border-white/40"
            >
              {/* Light Sweep Highlight */}
              <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none" />
              <span className="w-6 h-6 rounded-lg bg-black/15 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-base text-[#030712] font-bold group-hover:rotate-12 transition-transform">
                  terminal
                </span>
              </span>
              <span>Request Project Consultation</span>
            </a>

            {/* Secondary Hero Button */}
            <a
              href="#catalog"
              className="relative group overflow-hidden w-full sm:w-auto px-8 sm:px-9 py-4 rounded-xl bg-[#0e131f]/90 hover:bg-[#162032] text-white font-space font-semibold text-xs sm:text-sm uppercase tracking-wider border border-white/15 hover:border-[#38f2ff]/60 backdrop-blur-xl shadow-[0_4px_20px_rgba(0,0,0,0.5)] hover:shadow-[0_0_25px_rgba(56,242,255,0.25)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-3 cursor-pointer whitespace-nowrap"
            >
              <span>Explore Capabilities</span>
              <span className="w-6 h-6 rounded-lg bg-white/5 border border-white/10 group-hover:border-[#38f2ff]/40 flex items-center justify-center shrink-0 transition-colors">
                <span className="material-symbols-outlined text-base text-[#38f2ff] group-hover:translate-y-0.5 transition-transform">
                  arrow_downward
                </span>
              </span>
            </a>
          </div>

          {/* Key Metrics Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 max-w-4xl mx-auto mt-16 pt-10 border-t border-white/10">
            <div>
              <div className="font-space font-bold text-2xl sm:text-3xl text-white">
                99.99%
              </div>
              <div className="font-jetbrains text-xs text-[#849495] uppercase tracking-wider mt-1">
                Uptime Architecture
              </div>
            </div>
            <div>
              <div className="font-space font-bold text-2xl sm:text-3xl text-[#38f2ff]">
                100%
              </div>
              <div className="font-jetbrains text-xs text-[#849495] uppercase tracking-wider mt-1">
                Type-Safe Code
              </div>
            </div>
            <div>
              <div className="font-space font-bold text-2xl sm:text-3xl text-white">
                &lt; 30 Days
              </div>
              <div className="font-jetbrains text-xs text-[#849495] uppercase tracking-wider mt-1">
                Avg. MVP Delivery
              </div>
            </div>
            <div>
              <div className="font-space font-bold text-2xl sm:text-3xl text-[#38f2ff]">
                24/7
              </div>
              <div className="font-jetbrains text-xs text-[#849495] uppercase tracking-wider mt-1">
                Active Monitoring
              </div>
            </div>
          </div>
        </section>

        {/* ═════════════════════════════════════════════════════════════════
            SERVICES CATALOG & BENTO GRID
        ═════════════════════════════════════════════════════════════════ */}
        <section id="catalog" className="px-6 sm:px-12 md:px-20 max-w-7xl mx-auto mb-28 scroll-mt-28">
          {/* Header & Category Filter Bar */}
          <div className="mb-12 border-b border-white/10 pb-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
              <div>
                <div className="inline-flex items-center gap-2 mb-2">
                  <span className="w-4 h-[2px] bg-[#38f2ff]" />
                  <span className="font-jetbrains text-xs text-[#38f2ff] uppercase tracking-widest font-bold">
                    Service Portfolio
                  </span>
                </div>
                <h2 className="font-space font-bold text-3xl sm:text-4xl text-white tracking-tight">
                  Engineering Capabilities
                </h2>
                <p className="font-sans text-sm text-[#849495] mt-1.5">
                  Select a domain to inspect our specialized architectures, deliverables, and tech stacks.
                </p>
              </div>

              {/* Service Count Badge */}
              <div className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs font-jetbrains text-gray-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Showing {filteredServices.length} Specialized Offerings</span>
              </div>
            </div>

            {/* Category Filter Pills - Clean Wrapped Grid with Zero Native Scrollbars */}
            <div className="flex flex-wrap items-center gap-2.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.name}
                  onClick={() => setSelectedCategory(cat.name)}
                  className={`inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl font-space text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                    selectedCategory === cat.name
                      ? "bg-[#38f2ff] text-[#030712] font-bold shadow-[0_0_20px_rgba(56,242,255,0.35)] scale-[1.02]"
                      : "bg-[#0e131f]/90 text-gray-400 hover:text-white hover:bg-white/10 border border-white/10 hover:border-[#38f2ff]/30 font-jetbrains"
                  }`}
                >
                  <span className="material-symbols-outlined text-base">
                    {cat.icon}
                  </span>
                  <span>{cat.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Services Cards Grid */}
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center">
              <HelixLoader size={48} color="#38f2ff" />
              <p className="mt-4 font-jetbrains text-xs text-gray-400 uppercase tracking-widest">
                Loading Engineering Catalog…
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
              {filteredServices.map((service) => (
                <div
                  key={service.id}
                  className="relative rounded-3xl bg-gradient-to-b from-[#0e1526]/90 via-[#0a0f1d]/85 to-[#060a14]/95 border border-white/[0.08] hover:border-[#38f2ff]/40 shadow-[0_8px_30px_rgba(0,0,0,0.6)] hover:shadow-[0_12px_40px_rgba(56,242,255,0.12)] transition-all duration-300 group flex flex-col justify-between p-6 sm:p-7 overflow-hidden"
                >
                  {/* Glowing Top Accent Line */}
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#38f2ff]/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  
                  {/* Subtle Corner Glow Aura */}
                  <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#38f2ff]/5 rounded-full blur-2xl pointer-events-none group-hover:bg-[#38f2ff]/10 transition-colors" />

                  <div>
                    {/* Top Row: Icon & Status Badge */}
                    <div className="flex items-center justify-between gap-3 mb-5">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#38f2ff]/20 to-[#38f2ff]/5 border border-[#38f2ff]/30 text-[#38f2ff] flex items-center justify-center shadow-[0_0_15px_rgba(56,242,255,0.12)] group-hover:scale-105 transition-transform">
                        <span className="material-symbols-outlined text-2xl">
                          {service.icon || "layers"}
                        </span>
                      </div>

                      {service.badge && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-[#38f2ff] font-jetbrains text-[10px] uppercase tracking-wider font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#38f2ff] animate-pulse" />
                          {service.badge}
                        </span>
                      )}
                    </div>

                    {/* Title & Tagline */}
                    <h3 className="font-space font-bold text-xl sm:text-2xl text-white mb-2 group-hover:text-[#38f2ff] transition-colors leading-snug">
                      {service.title}
                    </h3>
                    <p className="font-sans text-xs sm:text-sm text-[#38f2ff]/80 font-medium mb-3 leading-snug line-clamp-2">
                      {service.tagline}
                    </p>

                    {/* Clean Description */}
                    <p className="font-sans text-xs sm:text-sm text-[#849495] leading-relaxed line-clamp-3 mb-5">
                      {service.description}
                    </p>

                    {/* Key Deliverables - Clean, Concise 3 Items */}
                    {service.deliverables && service.deliverables.length > 0 && (
                      <div className="mb-5 py-3 border-y border-white/[0.06]">
                        <div className="font-jetbrains text-[10px] text-gray-400 uppercase tracking-wider font-bold mb-2.5 flex items-center gap-1.5">
                          <span className="w-1 h-1 rounded-full bg-[#38f2ff]" />
                          <span>Key Deliverables</span>
                        </div>
                        <div className="space-y-1.5">
                          {service.deliverables.slice(0, 3).map((d, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs text-gray-300">
                              <span className="text-[#38f2ff] text-xs font-bold shrink-0">✓</span>
                              <span className="truncate">{d}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Tech Stack Chips - Minimal & Elegant */}
                    {service.techStack && service.techStack.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 mb-6">
                        {service.techStack.slice(0, 4).map((tech, i) => (
                          <span
                            key={i}
                            className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] font-jetbrains text-[10px] text-gray-300 group-hover:border-[#38f2ff]/20 transition-colors"
                          >
                            {tech}
                          </span>
                        ))}
                        {service.techStack.length > 4 && (
                          <span className="px-2 py-1 rounded-lg bg-white/[0.02] border border-white/5 font-jetbrains text-[10px] text-gray-400">
                            +{service.techStack.length - 4}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Bottom Footer: Timeline & Action Button */}
                  <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between gap-3">
                    <div className="flex items-center gap-1.5 font-jetbrains text-xs text-gray-400">
                      <span className="material-symbols-outlined text-sm text-[#38f2ff]/80">schedule</span>
                      <span>{service.timeline || "2-4 Weeks Sprint"}</span>
                    </div>

                    <button
                      onClick={() => handleOpenInquiry(service)}
                      className="bg-white/[0.06] hover:bg-[#38f2ff] text-white hover:text-[#030712] font-space font-semibold text-xs uppercase tracking-wider px-4 py-2 rounded-xl border border-white/10 hover:border-[#38f2ff] transition-all cursor-pointer flex items-center gap-1.5 group/btn shadow-sm"
                    >
                      <span>Inquire</span>
                      <span className="material-symbols-outlined text-sm group-hover/btn:translate-x-0.5 transition-transform">
                        arrow_forward
                      </span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ═════════════════════════════════════════════════════════════════
            THE DEVENGINE METHOD (ENGINEERING LIFECYCLE)
        ═════════════════════════════════════════════════════════════════ */}
        <section className="py-20 px-6 sm:px-12 md:px-20 max-w-7xl mx-auto mb-28 border-y border-white/10 relative">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="font-jetbrains text-xs text-[#38f2ff] uppercase tracking-widest font-bold mb-3">
              The DevEngine Standard
            </div>
            <h2 className="font-space font-bold text-3xl sm:text-5xl text-white tracking-tight mb-4">
              How We Execute
            </h2>
            <p className="font-sans text-sm sm:text-base text-[#849495] leading-relaxed">
              Every system we deliver follows an exhaustive four-phase engineering lifecycle designed for speed, transparency, and zero technical debt.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {ENGINEERING_STEPS.map((s, idx) => (
              <div
                key={idx}
                className="bg-[#0e131f]/70 border border-white/10 rounded-2xl p-6 relative overflow-hidden group hover:border-[#38f2ff]/40 transition-all duration-300"
              >
                <div className="font-space font-bold text-4xl text-[#38f2ff]/25 mb-4 group-hover:text-[#38f2ff] transition-colors">
                  {s.step}
                </div>
                <h4 className="font-space font-bold text-lg text-white mb-2">
                  {s.title}
                </h4>
                <p className="font-sans text-xs sm:text-sm text-[#849495] leading-relaxed">
                  {s.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ═════════════════════════════════════════════════════════════════
            BOTTOM CTA BANNER
        ═════════════════════════════════════════════════════════════════ */}
        <section className="px-6 sm:px-12 md:px-20 max-w-7xl mx-auto">
          <div className="bg-gradient-to-br from-[#0e131f] via-[#161c28] to-[#080e1a] rounded-3xl p-8 sm:p-14 border border-[#38f2ff]/25 shadow-2xl relative overflow-hidden">
            <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8 text-center lg:text-left">
              <div className="max-w-xl">
                <span className="px-3 py-1 rounded-full bg-[#38f2ff]/10 border border-[#38f2ff]/30 text-[#38f2ff] font-jetbrains text-[10px] uppercase tracking-widest font-bold inline-block mb-3">
                  Ready to Deploy?
                </span>
                <h3 className="font-space font-bold text-3xl sm:text-4xl text-white mb-3 tracking-tight">
                  Have a Unique Product Vision? Let&apos;s Build It.
                </h3>
                <p className="font-sans text-sm text-[#849495] leading-relaxed">
                  Partner with DevEngine for high-velocity engineering, direct architectural consultation, and production-grade delivery.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3.5 shrink-0">
                <a
                  href="/home#contact"
                  className="relative group overflow-hidden bg-gradient-to-r from-[#38f2ff] via-[#22d3ee] to-[#00dbe8] text-[#030712] font-space font-bold text-xs sm:text-sm uppercase tracking-wider px-8 py-4 rounded-xl shadow-[0_0_25px_rgba(56,242,255,0.35)] hover:shadow-[0_0_45px_rgba(56,242,255,0.6)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-300 cursor-pointer whitespace-nowrap border-t border-white/40 flex items-center justify-center gap-2.5"
                >
                  <span className="material-symbols-outlined text-base font-bold">terminal</span>
                  <span>Start Project Inquiry</span>
                </a>

                <a
                  href="https://wa.me/8801724879284?text=Hello%20DevEngine,%20I%20would%20like%20to%20inquire%20about%20your%20services."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative group overflow-hidden bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 hover:border-emerald-400 font-space font-semibold text-xs sm:text-sm uppercase tracking-wider px-7 py-4 rounded-xl transition-all duration-300 cursor-pointer flex items-center justify-center gap-2.5 whitespace-nowrap shadow-[0_0_20px_rgba(16,185,129,0.15)] hover:shadow-[0_0_35px_rgba(16,185,129,0.35)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
                >
                  <span className="material-symbols-outlined text-lg text-emerald-400">chat</span>
                  <span>Chat on WhatsApp</span>
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ═════════════════════════════════════════════════════════════════
          INTERACTIVE PROJECT INQUIRY MODAL
      ═════════════════════════════════════════════════════════════════ */}
      {inquiryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="bg-[#0e131f] border border-[#38f2ff]/30 rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-[0_0_60px_rgba(56,242,255,0.25)] relative max-h-[90vh] overflow-y-auto">
            {/* Close Button */}
            <button
              onClick={() => setInquiryModalOpen(false)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white flex items-center justify-center transition cursor-pointer"
            >
              ✕
            </button>

            {inquirySubmitted ? (
              <div className="text-center py-8 space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 flex items-center justify-center mx-auto text-3xl">
                  ✓
                </div>
                <h3 className="font-space font-bold text-2xl text-white">
                  Inquiry Received!
                </h3>
                <p className="font-sans text-sm text-[#849495] max-w-md mx-auto leading-relaxed">
                  Thank you, <span className="text-white font-bold">{form.clientName}</span>. A DevEngine lead architect will review your project requirements and respond within 24 hours.
                </p>
                <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <a
                    href="https://wa.me/8801724879284?text=Hello%20DevEngine,%20I%20just%20submitted%20a%20consultation%20inquiry."
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-space font-bold uppercase tracking-wider transition"
                  >
                    <span className="material-symbols-outlined text-base">chat</span>
                    <span>Chat on WhatsApp</span>
                  </a>
                  <button
                    onClick={() => setInquiryModalOpen(false)}
                    className="bg-[#38f2ff] hover:bg-[#00dbe8] text-[#030712] font-space font-bold text-xs uppercase tracking-wider px-8 py-3 rounded-xl transition cursor-pointer"
                  >
                    Close Window
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleInquirySubmit} className="space-y-4">
                <div>
                  <span className="px-2.5 py-0.5 rounded bg-[#38f2ff]/10 border border-[#38f2ff]/30 text-[#38f2ff] font-jetbrains text-[10px] uppercase font-bold tracking-wider inline-block mb-1">
                    Direct Consultation
                  </span>
                  <h3 className="font-space font-bold text-2xl text-white">
                    {selectedServiceForInquiry
                      ? `Inquire: ${selectedServiceForInquiry.title}`
                      : "Start a Project Consultation"}
                  </h3>
                  <p className="font-sans text-xs text-[#849495] mt-1">
                    Tell us about your system goals, architecture requirements, and timeline.
                  </p>
                </div>

                {/* Instant WhatsApp Quick Connect */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25">
                  <div className="flex items-center gap-2 text-xs text-emerald-300 font-sans">
                    <span className="material-symbols-outlined text-base text-emerald-400 shrink-0">chat</span>
                    <span>Prefer instant chat? Connect directly:</span>
                  </div>
                  <a
                    href="https://wa.me/8801724879284?text=Hello%20DevEngine,%20I%20would%20like%20to%20consult%20about%20a%20project."
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-space font-bold text-xs uppercase tracking-wider transition shrink-0 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                  >
                    <span>Chat on WhatsApp</span>
                    <span className="material-symbols-outlined text-sm">open_in_new</span>
                  </a>
                </div>


                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-xs font-mono text-gray-300 mb-1">
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
                      className="w-full bg-[#161c28] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#38f2ff]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-gray-300 mb-1">
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
                      className="w-full bg-[#161c28] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#38f2ff]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-mono text-gray-300 mb-1">
                      Phone / WhatsApp (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="+1 (555) 000-0000"
                      value={form.clientPhone}
                      onChange={(e) =>
                        setForm({ ...form, clientPhone: e.target.value })
                      }
                      className="w-full bg-[#161c28] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#38f2ff]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-gray-300 mb-1">
                      Estimated Budget
                    </label>
                    <select
                      value={form.budgetRange}
                      onChange={(e) =>
                        setForm({ ...form, budgetRange: e.target.value })
                      }
                      className="w-full bg-[#161c28] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#38f2ff]"
                    >
                      <option value="Under $1,000">Under $1,000</option>
                      <option value="$1,000 - $3,000">$1,000 - $3,000</option>
                      <option value="$3,000 - $8,000">$3,000 - $8,000</option>
                      <option value="$8,000+">$8,000+ (Enterprise)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono text-gray-300 mb-1">
                    Project Overview & Requirements *
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Briefly describe what you want to engineer, key features, platform targets, and any deadlines..."
                    value={form.projectDetails}
                    onChange={(e) =>
                      setForm({ ...form, projectDetails: e.target.value })
                    }
                    className="w-full bg-[#161c28] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#38f2ff] resize-none"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={submittingInquiry}
                    className="w-full bg-[#38f2ff] hover:bg-[#00dbe8] text-[#030712] font-sans font-bold text-xs uppercase tracking-wider py-3.5 rounded-xl shadow-[0_0_20px_rgba(56,242,255,0.3)] transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {submittingInquiry ? (
                      <>
                        <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                        <span>Submitting Consultation...</span>
                      </>
                    ) : (
                      <>
                        <span>Submit Project Inquiry</span>
                        <span className="material-symbols-outlined text-sm">send</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      <LandingFooter />
    </>
  );
}
