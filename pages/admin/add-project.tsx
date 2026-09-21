import { useState, useEffect } from "react";
import Head from "next/head";
import AdminLayout from "@/components/AdminLayout";
import { db, auth } from "@/lib/firebase";
import {
  collection,
  getDocs,
  setDoc,
  doc,
  getDoc,
  Timestamp,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/router";
import Link from "next/link";
import { CurrencyPricing } from "@/types/currency";
import { getAvailableCurrencies } from "@/lib/services/currencyService";
import HelixLoader from "@/components/HelixLoader";
import {
  DEFAULT_YOUTUBE_URL,
  DEFAULT_SNAPSHOT,
  DEFAULT_WHATS_INCLUDED,
  DEFAULT_NOT_INCLUDED,
  DEFAULT_FAQS,
  ProjectFAQ,
  getDefaultPricingPlans,
} from "@/types/project";

interface Tag {
  id: string;
  name: string;
}

const ADMIN_EMAIL =
  process.env.NEXT_PUBLIC_ADMIN_EMAIL || "hamim.leon@gmail.com";

export default function AddProjectPage() {
  const router = useRouter();

  // Auth gate
  const [authReady, setAuthReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [details, setDetails] = useState("");
  const [installation, setInstallation] = useState("");
  const [tools, setTools] = useState("");
  const [price, setPrice] = useState("");
  const [discount, setDiscount] = useState("");
  const [currencyPricing, setCurrencyPricing] = useState<CurrencyPricing[]>([]);
  const [category, setCategory] = useState("android");
  const [publishNow, setPublishNow] = useState(true);
  const [tags, setTags] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [createdSlug, setCreatedSlug] = useState("");

  // New cinematic detail fields
  const [youtubeUrl, setYoutubeUrl] = useState(DEFAULT_YOUTUBE_URL);
  const [snapshot, setSnapshot] = useState(DEFAULT_SNAPSHOT);
  const [story, setStory] = useState({
    idea: "",
    problem: "",
    solution: "",
    value: "",
  });
  const [whatsIncluded, setWhatsIncluded] = useState<string[]>(DEFAULT_WHATS_INCLUDED);
  const [notIncluded, setNotIncluded] = useState<string[]>(DEFAULT_NOT_INCLUDED);
  const [faqs, setFaqs] = useState<ProjectFAQ[]>(DEFAULT_FAQS);

  // Admin-only access check (wait for auth)
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      const ok = !!user && user.email === ADMIN_EMAIL;
      setIsAdmin(!!ok);
      setAuthReady(true);
      if (!ok) {
        router.replace("/login");
      }
    });
    return () => unsub();
  }, [router]);

  // Load tags & currencies
  useEffect(() => {
    (async () => {
      try {
        const tagSnap = await getDocs(collection(db, "tags"));
        const tagList = tagSnap.docs.map((d) => ({
          id: d.id,
          name: (d.data() as any).name,
        })) as Tag[];
        setAvailableTags(tagList);

        const currs = await getAvailableCurrencies();
        setCurrencyPricing(
          currs.map((c) => ({
            currency: c.code,
            symbol: c.symbol,
            regularPrice: "",
            discountPrice: "",
          }))
        );
      } catch (e) {
        console.error(e);
        setErrMsg("Failed to load tags and currencies. Please refresh.");
      }
    })();
  }, []);

  const handleTagToggle = (tagId: string) => {
    setTags((prev) =>
      prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId]
    );
  };

  const handleCurrencyPriceChange = (
    currencyCode: string,
    field: "regularPrice" | "discountPrice",
    value: string
  ) => {
    setCurrencyPricing((prev) =>
      prev.map((item) =>
        item.currency === currencyCode ? { ...item, [field]: value } : item
      )
    );
  };

  // Inclusions handlers
  const handleWhatsIncludedChange = (idx: number, val: string) => {
    setWhatsIncluded((prev) => {
      const next = [...prev];
      next[idx] = val;
      return next;
    });
  };
  const handleAddWhatsIncluded = () => {
    setWhatsIncluded((prev) => [...prev, "New included feature item"]);
  };
  const handleRemoveWhatsIncluded = (idx: number) => {
    setWhatsIncluded((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleNotIncludedChange = (idx: number, val: string) => {
    setNotIncluded((prev) => {
      const next = [...prev];
      next[idx] = val;
      return next;
    });
  };
  const handleAddNotIncluded = () => {
    setNotIncluded((prev) => [...prev, "Excluded feature item"]);
  };
  const handleRemoveNotIncluded = (idx: number) => {
    setNotIncluded((prev) => prev.filter((_, i) => i !== idx));
  };

  // FAQ handlers
  const handleFaqChange = (idx: number, field: "question" | "answer", val: string) => {
    setFaqs((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: val };
      return next;
    });
  };
  const handleAddFaq = () => {
    setFaqs((prev) => [
      ...prev,
      {
        question: "What is included with this build?",
        answer: "Complete source repository, documentation, and 12-month security patches.",
      },
    ]);
  };
  const handleRemoveFaq = (idx: number) => {
    setFaqs((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleResetDraft = () => {
    if (typeof window !== "undefined" && window.confirm("Reset all entered fields to blank draft?")) {
      setTitle("");
      setSubtitle("");
      setDetails("");
      setInstallation("");
      setTools("");
      setPrice("");
      setDiscount("");
      setCategory("android");
      setPublishNow(true);
      setTags([]);
      setYoutubeUrl(DEFAULT_YOUTUBE_URL);
      setSnapshot(DEFAULT_SNAPSHOT);
      setStory({ idea: "", problem: "", solution: "", value: "" });
      setWhatsIncluded(DEFAULT_WHATS_INCLUDED);
      setNotIncluded(DEFAULT_NOT_INCLUDED);
      setFaqs(DEFAULT_FAQS);
      setErrMsg("");
    }
  };

  const makeSlug = (s: string) =>
    s
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrMsg("");
    setLoading(true);

    try {
      const slug = makeSlug(title);
      if (!slug) {
        setErrMsg("Title is required to generate a valid project slug.");
        setLoading(false);
        return;
      }

      // Ensure unique slug
      const ref = doc(db, "projects", slug);
      const existing = await getDoc(ref);
      if (existing.exists()) {
        setErrMsg(
          "A project with this title or slug already exists. Please choose a distinct title."
        );
        setLoading(false);
        return;
      }

      const activePricing = currencyPricing.filter(
        (p) =>
          (p.regularPrice && p.regularPrice.trim() !== "") ||
          (p.discountPrice && p.discountPrice.trim() !== "")
      );
      const bdtPricing = activePricing.find((p) => p.currency === "BDT");

      const newProject = {
        slug,
        title: title.trim(),
        subtitle: subtitle.trim(),
        details: details.trim(),
        installation: installation.trim(),
        tools: tools.split(",").map((t) => t.trim()).filter(Boolean),
        pricing: activePricing,
        price: bdtPricing?.regularPrice || price.trim(),
        discount: bdtPricing?.discountPrice || discount.trim(),
        pricingPlans: getDefaultPricingPlans({
          price: bdtPricing?.regularPrice || price.trim(),
          discount: bdtPricing?.discountPrice || discount.trim(),
        }),
        category,
        tags,
        youtubeUrl: youtubeUrl.trim() || DEFAULT_YOUTUBE_URL,
        snapshot,
        story,
        whatsIncluded,
        notIncluded,
        faqs,
        isPublic: publishNow,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        createdBy: "hamim.leon@gmail.com",
      };

      await setDoc(ref, newProject);
      setCreatedSlug(slug);
      setSuccessMsg(`Project "${title.trim()}" published successfully!`);
    } catch (err) {
      console.error("Error adding project:", err);
      setErrMsg("Failed to create project. Please verify required fields and permissions.");
    } finally {
      setLoading(false);
    }
  };

  if (!authReady || !isAdmin) {
    return (
      <AdminLayout title="Add Project | DevEngine Admin">
        <Head>
          <title>Add Project | DevEngine Admin</title>
        </Head>
        <main className="flex items-center justify-center min-h-[calc(100vh-56px)] bg-[#07070f]">
          <HelixLoader size={48} color="#14b8a6" />
        </main>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Add Project | DevEngine Admin">
      <Head>
        <title>Add New Project | DevEngine Admin</title>
      </Head>

      <main className="max-w-6xl mx-auto px-4 sm:px-8 py-8 text-white space-y-8 font-sans">
        {/* ── HEADER BAR ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-white/[0.07]">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <span className="text-[11px] font-semibold tracking-wider text-teal-400 uppercase bg-teal-400/10 px-2.5 py-0.5 rounded-full border border-teal-400/20">
                Catalog Engine
              </span>
              <span className="flex items-center gap-1.5 text-[11px] text-gray-400">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                Drafting Mode
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Add New Project
            </h1>
            <p className="text-xs text-gray-400 mt-1 max-w-xl">
              Create a new project release with pricing, architecture specs, and live preview.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <Link
              href="/admin/manage-projects"
              className="px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-semibold text-gray-300 hover:text-white transition flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              <span>Back to Projects</span>
            </Link>

            <button
              type="button"
              onClick={handleResetDraft}
              className="px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-rose-500/10 border border-white/[0.08] hover:border-rose-500/30 text-xs font-medium text-gray-400 hover:text-rose-300 transition cursor-pointer"
            >
              Reset Draft
            </button>
          </div>
        </div>

        {/* ── ERROR BANNER ── */}
        {errMsg && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-[20px] text-rose-400">error</span>
              <span className="font-medium">{errMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrMsg("")}
              className="p-1 hover:bg-rose-500/20 rounded-lg text-rose-400 transition"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
        )}

        {/* ── SUCCESS MODAL ── */}
        {successMsg && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <div className="bg-[#0e0e1a] border border-teal-500/30 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-6 text-center animate-in fade-in zoom-in duration-200">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-teal-500/20 text-teal-300 border border-teal-500/40 flex items-center justify-center shadow-[0_0_20px_rgba(20,184,166,0.3)]">
                <span className="material-symbols-outlined text-[32px]">check_circle</span>
              </div>
              <div className="space-y-1.5">
                <h3 className="text-xl font-bold text-white tracking-tight">Project Published!</h3>
                <p className="text-xs text-gray-400 leading-relaxed">{successMsg}</p>
              </div>

              <div className="pt-2 flex flex-col gap-2.5">
                <Link
                  href="/admin/manage-projects"
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-400 to-emerald-400 text-black font-bold text-xs uppercase tracking-wider hover:opacity-90 transition shadow-lg flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">view_list</span>
                  <span>View in Projects Manager</span>
                </Link>

                {createdSlug && (
                  <Link
                    href={`/projects/${createdSlug}`}
                    target="_blank"
                    className="w-full py-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.1] text-xs font-semibold text-gray-300 hover:text-white transition flex items-center justify-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                    <span>Preview Live Storefront Page</span>
                  </Link>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setSuccessMsg("");
                    setCreatedSlug("");
                    setTitle("");
                    setSubtitle("");
                    setDetails("");
                    setInstallation("");
                    setTools("");
                  }}
                  className="w-full py-2.5 text-xs text-gray-400 hover:text-gray-200 transition"
                >
                  Create Another Project
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── MAIN FORM ── */}
        <form
          onSubmit={handleSubmit}
          className="bg-[#0c0c16]/95 border border-white/[0.08] rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-xl space-y-9"
        >
          {/* SECTION 1: TITLE & SUBTITLE */}
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Project Title <span className="text-teal-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. CraftyBay - Multi-Vendor E-Commerce"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full h-11 bg-black/40 border border-white/[0.08] focus:border-teal-400/70 focus:bg-black/60 focus:ring-1 focus:ring-teal-400/20 rounded-xl px-4 text-sm text-white placeholder-gray-500 font-sans transition outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Subtitle <span className="text-teal-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Flutter 3 shopping suite with clean architecture & Riverpod"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  className="w-full h-11 bg-black/40 border border-white/[0.08] focus:border-teal-400/70 focus:bg-black/60 focus:ring-1 focus:ring-teal-400/20 rounded-xl px-4 text-sm text-white placeholder-gray-500 font-sans transition outline-none"
                  required
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: MULTI-CURRENCY PRICING MATRIX */}
          <div className="bg-gradient-to-br from-teal-500/[0.03] to-transparent border border-teal-500/20 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/[0.06]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-teal-400/10 border border-teal-400/30 text-teal-300 flex items-center justify-center text-xs font-bold font-mono">
                    $
                  </span>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    Multi-Currency Pricing Matrix
                    <span className="bg-teal-500/20 text-teal-300 text-[10px] font-mono px-2 py-0.5 rounded-full border border-teal-500/30">
                      LIVE
                    </span>
                  </h3>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  Set regular and discount prices for all active currencies.
                </p>
              </div>

              <Link
                href="/admin/manage-currencies"
                target="_blank"
                className="text-xs text-teal-300 hover:text-teal-200 underline self-start sm:self-auto flex items-center gap-1 transition"
              >
                <span>Manage Currencies</span>
                <span className="material-symbols-outlined text-[13px]">open_in_new</span>
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currencyPricing.map((item) => (
                <div
                  key={item.currency}
                  className="bg-black/30 border border-white/[0.07] hover:border-teal-500/30 rounded-xl p-4 space-y-3 transition"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-lg bg-teal-400/10 border border-teal-400/20 text-teal-300 font-mono font-bold text-xs flex items-center justify-center">
                        {item.symbol}
                      </span>
                      <span className="text-xs font-bold text-white font-mono">
                        {item.currency} Price Setting
                      </span>
                    </div>

                    {item.currency === "BDT" && (
                      <span className="text-[10px] font-mono font-semibold text-teal-400 bg-teal-400/10 px-2 py-0.5 rounded border border-teal-400/20">
                        Base Currency
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-medium text-gray-400 mb-1">
                        Regular Price ({item.symbol})
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs text-gray-500 pointer-events-none">
                          {item.symbol}
                        </span>
                        <input
                          type="text"
                          value={item.regularPrice}
                          onChange={(e) =>
                            handleCurrencyPriceChange(
                              item.currency,
                              "regularPrice",
                              e.target.value
                            )
                          }
                          placeholder={item.currency === "BDT" ? "50,000" : "450"}
                          className="w-full h-10 pl-7 pr-3 bg-black/50 border border-white/[0.08] focus:border-teal-400/70 focus:ring-1 focus:ring-teal-400/20 rounded-lg text-xs font-mono text-white placeholder-gray-600 outline-none transition"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-medium text-teal-400/90 mb-1">
                        Discount Price ({item.symbol})
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs text-teal-400/70 pointer-events-none">
                          {item.symbol}
                        </span>
                        <input
                          type="text"
                          value={item.discountPrice || ""}
                          onChange={(e) =>
                            handleCurrencyPriceChange(
                              item.currency,
                              "discountPrice",
                              e.target.value
                            )
                          }
                          placeholder={item.currency === "BDT" ? "30,000" : "280"}
                          className="w-full h-10 pl-7 pr-3 bg-black/50 border border-white/[0.08] focus:border-teal-400/70 focus:ring-1 focus:ring-teal-400/20 rounded-xl text-xs font-mono text-white placeholder-gray-600 outline-none transition"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 3: DESCRIPTION & INSTALLATION */}
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Project Overview / Description <span className="text-teal-400">*</span>
              </label>
              <textarea
                placeholder="Detailed overview and key features of the project..."
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                className="w-full h-36 bg-black/40 border border-white/[0.08] focus:border-teal-400/70 focus:bg-black/60 focus:ring-1 focus:ring-teal-400/20 rounded-xl p-4 text-xs sm:text-sm text-white placeholder-gray-500 font-sans leading-relaxed outline-none transition resize-y"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Installation Instructions / Terminal Commands <span className="text-teal-400">*</span>
              </label>
              <textarea
                placeholder={`# 1. Clone repo\ngit clone https://github.com/org/project.git\n\n# 2. Install & run\nnpm install\nnpm run dev`}
                value={installation}
                onChange={(e) => setInstallation(e.target.value)}
                className="w-full h-28 bg-black/60 border border-white/[0.08] focus:border-teal-400/70 focus:bg-black/80 focus:ring-1 focus:ring-teal-400/20 rounded-xl p-4 font-mono text-xs text-teal-300 placeholder-gray-600 leading-relaxed outline-none transition resize-y"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Tools & Tech Stack (comma-separated) <span className="text-teal-400">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Flutter 3.24, Riverpod, Firebase, REST API, SQLite"
                value={tools}
                onChange={(e) => setTools(e.target.value)}
                className="w-full h-11 bg-black/40 border border-white/[0.08] focus:border-teal-400/70 focus:bg-black/60 focus:ring-1 focus:ring-teal-400/20 rounded-xl px-4 text-sm text-white placeholder-gray-500 font-sans outline-none transition"
                required
              />
            </div>
          </div>

          {/* SECTION 4: YOUTUBE DEMO VIDEO */}
          <div className="bg-gradient-to-br from-rose-500/[0.03] to-transparent border border-rose-500/20 rounded-2xl p-5 space-y-3 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-lg bg-rose-500/20 border border-rose-500/30 text-rose-400 flex items-center justify-center text-xs font-bold">
                  ▶
                </span>
                <h3 className="text-sm font-bold text-white">
                  YouTube Live Demo Video URL
                </h3>
              </div>
              <span className="text-[10px] font-mono text-rose-300 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                Embedded in Details Page
              </span>
            </div>
            <p className="text-xs text-gray-400">
              Connected to &quot;Watch Live Demo&quot; button and inline video viewer.
            </p>
            <input
              type="url"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=Wo9IFU0-qZo"
              className="w-full h-11 bg-black/40 border border-white/[0.08] focus:border-rose-400/70 focus:ring-1 focus:ring-rose-400/20 rounded-xl px-4 font-mono text-xs sm:text-sm text-white placeholder-gray-500 outline-none transition"
            />
          </div>

          {/* SECTION 5: SNAPSHOT SPECS METADATA */}
          <div className="bg-gradient-to-br from-cyan-500/[0.03] to-transparent border border-cyan-500/20 rounded-2xl p-5 space-y-3.5 shadow-xl">
            <div className="flex items-center gap-2 pb-1 border-b border-white/[0.06]">
              <span className="w-6 h-6 rounded-lg bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 flex items-center justify-center text-xs font-bold">
                ⚡
              </span>
              <h3 className="text-sm font-bold text-white">
                Project Snapshot Metadata
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-[11px] font-medium text-gray-400 mb-1">
                  Version
                </label>
                <input
                  type="text"
                  value={snapshot.version}
                  onChange={(e) =>
                    setSnapshot({ ...snapshot, version: e.target.value })
                  }
                  placeholder="v2.4.0"
                  className="w-full h-10 bg-black/40 border border-white/[0.08] focus:border-cyan-400/70 rounded-lg px-3 text-xs font-mono text-white placeholder-gray-500 outline-none transition"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-gray-400 mb-1">
                  Platform
                </label>
                <input
                  type="text"
                  value={snapshot.platform}
                  onChange={(e) =>
                    setSnapshot({ ...snapshot, platform: e.target.value })
                  }
                  placeholder="Cross-Platform"
                  className="w-full h-10 bg-black/40 border border-white/[0.08] focus:border-cyan-400/70 rounded-lg px-3 text-xs font-mono text-white placeholder-gray-500 outline-none transition"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-gray-400 mb-1">
                  Status
                </label>
                <input
                  type="text"
                  value={snapshot.status}
                  onChange={(e) =>
                    setSnapshot({ ...snapshot, status: e.target.value })
                  }
                  placeholder="Production Ready"
                  className="w-full h-10 bg-black/40 border border-white/[0.08] focus:border-cyan-400/70 rounded-lg px-3 text-xs font-mono text-white placeholder-gray-500 outline-none transition"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-gray-400 mb-1">
                  Release Cycle
                </label>
                <input
                  type="text"
                  value={snapshot.releaseDate}
                  onChange={(e) =>
                    setSnapshot({ ...snapshot, releaseDate: e.target.value })
                  }
                  placeholder="Q3 2026"
                  className="w-full h-10 bg-black/40 border border-white/[0.08] focus:border-cyan-400/70 rounded-lg px-3 text-xs font-mono text-white placeholder-gray-500 outline-none transition"
                />
              </div>
            </div>
          </div>

          {/* SECTION 6: ARCHITECTURE STORY */}
          <div className="bg-gradient-to-br from-purple-500/[0.03] to-transparent border border-purple-500/20 rounded-2xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center gap-2 pb-2 border-b border-white/[0.06]">
              <span className="w-6 h-6 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-300 flex items-center justify-center text-xs font-bold">
                📖
              </span>
              <h3 className="text-sm font-bold text-white">
                Understanding The Architecture & Story
              </h3>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-purple-300">
                  01 / The Core Vision (Idea)
                </label>
                <textarea
                  value={story.idea}
                  onChange={(e) =>
                    setStory({ ...story, idea: e.target.value })
                  }
                  placeholder="Why this project was conceived..."
                  className="w-full h-24 bg-black/40 border border-white/[0.08] focus:border-purple-400/70 rounded-xl p-3 text-xs text-white placeholder-gray-500 leading-relaxed outline-none transition resize-y"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-purple-300">
                  02 / The Bottleneck (Problem)
                </label>
                <textarea
                  value={story.problem}
                  onChange={(e) =>
                    setStory({ ...story, problem: e.target.value })
                  }
                  placeholder="Pain points and technical challenges faced..."
                  className="w-full h-24 bg-black/40 border border-white/[0.08] focus:border-purple-400/70 rounded-xl p-3 text-xs text-white placeholder-gray-500 leading-relaxed outline-none transition resize-y"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-purple-300">
                  03 / Engineering Breakthrough (Solution)
                </label>
                <textarea
                  value={story.solution}
                  onChange={(e) =>
                    setStory({ ...story, solution: e.target.value })
                  }
                  placeholder="How the codebase solves the bottleneck cleanly..."
                  className="w-full h-24 bg-black/40 border border-white/[0.08] focus:border-purple-400/70 rounded-xl p-3 text-xs text-white placeholder-gray-500 leading-relaxed outline-none transition resize-y"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-purple-300">
                  04 / Commercial Value (Impact)
                </label>
                <textarea
                  value={story.value}
                  onChange={(e) =>
                    setStory({ ...story, value: e.target.value })
                  }
                  placeholder="Measurable ROI and scale for engineering teams..."
                  className="w-full h-24 bg-black/40 border border-white/[0.08] focus:border-purple-400/70 rounded-xl p-3 text-xs text-white placeholder-gray-500 leading-relaxed outline-none transition resize-y"
                />
              </div>
            </div>
          </div>

          {/* SECTION 7: INCLUSIONS & EXCLUSIONS */}
          <div className="grid md:grid-cols-2 gap-5">
            {/* What's Included */}
            <div className="bg-gradient-to-br from-emerald-500/[0.03] to-transparent border border-emerald-500/20 rounded-2xl p-5 space-y-3 shadow-xl">
              <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 flex items-center justify-center text-xs font-bold">
                    ✓
                  </span>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    What&apos;s Included
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={handleAddWhatsIncluded}
                  className="text-[11px] bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded-lg font-semibold border border-emerald-500/30 transition flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[13px]">add</span>
                  <span>Add Item</span>
                </button>
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {whatsIncluded.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-emerald-400 text-xs shrink-0 font-bold">✓</span>
                    <input
                      type="text"
                      value={item}
                      onChange={(e) => handleWhatsIncludedChange(idx, e.target.value)}
                      className="w-full h-9 bg-black/40 border border-white/[0.08] focus:border-emerald-400/70 rounded-lg px-3 text-xs text-white placeholder-gray-500 outline-none transition"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveWhatsIncluded(idx)}
                      className="p-1 rounded-lg bg-white/[0.03] hover:bg-rose-500/20 text-gray-400 hover:text-rose-300 transition"
                      title="Remove"
                    >
                      <span className="material-symbols-outlined text-[14px]">close</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Not Included */}
            <div className="bg-gradient-to-br from-amber-500/[0.03] to-transparent border border-amber-500/20 rounded-2xl p-5 space-y-3 shadow-xl">
              <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-300 flex items-center justify-center text-xs font-bold">
                    ✕
                  </span>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Not Included
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={handleAddNotIncluded}
                  className="text-[11px] bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 px-2.5 py-1 rounded-lg font-semibold border border-amber-500/30 transition flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[13px]">add</span>
                  <span>Add Item</span>
                </button>
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {notIncluded.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-amber-400 text-xs shrink-0 font-bold">✕</span>
                    <input
                      type="text"
                      value={item}
                      onChange={(e) => handleNotIncludedChange(idx, e.target.value)}
                      className="w-full h-9 bg-black/40 border border-white/[0.08] focus:border-amber-400/70 rounded-lg px-3 text-xs text-white placeholder-gray-500 outline-none transition"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveNotIncluded(idx)}
                      className="p-1 rounded-lg bg-white/[0.03] hover:bg-rose-500/20 text-gray-400 hover:text-rose-300 transition"
                      title="Remove"
                    >
                      <span className="material-symbols-outlined text-[14px]">close</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* SECTION 8: DYNAMIC FAQ SECTION */}
          <div className="bg-gradient-to-br from-teal-500/[0.03] to-transparent border border-teal-500/20 rounded-2xl p-5 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-teal-500/20 border border-teal-500/30 text-teal-300 flex items-center justify-center text-xs font-bold">
                  ?
                </span>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Frequently Asked Questions (FAQ)
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Questions and answers displayed in the project FAQ accordion.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleAddFaq}
                className="px-3 py-1 bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 rounded-lg text-xs font-semibold border border-teal-500/30 transition flex items-center gap-1 self-start sm:self-auto cursor-pointer"
              >
                <span className="material-symbols-outlined text-[14px]">add</span>
                <span>Add FAQ</span>
              </button>
            </div>

            <div className="space-y-3">
              {faqs.map((faq, idx) => (
                <div
                  key={idx}
                  className="bg-black/30 border border-white/[0.07] hover:border-teal-500/30 p-4 rounded-xl space-y-2.5 transition"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-teal-400">
                      FAQ #{idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveFaq(idx)}
                      className="text-xs text-gray-400 hover:text-rose-400 px-2 py-0.5 rounded bg-white/[0.04] hover:bg-rose-500/10 transition"
                    >
                      Delete
                    </button>
                  </div>

                  <div>
                    <label className="block text-[10px] font-medium text-gray-400 mb-1">
                      Question
                    </label>
                    <input
                      type="text"
                      value={faq.question}
                      onChange={(e) => handleFaqChange(idx, "question", e.target.value)}
                      placeholder="e.g. Do you offer post-purchase deployment support?"
                      className="w-full h-10 bg-black/40 border border-white/[0.08] focus:border-teal-400/70 rounded-lg px-3 text-xs sm:text-sm font-medium text-white placeholder-gray-500 outline-none transition"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-medium text-gray-400 mb-1">
                      Answer
                    </label>
                    <textarea
                      value={faq.answer}
                      onChange={(e) => handleFaqChange(idx, "answer", e.target.value)}
                      placeholder="Detailed explanation..."
                      className="w-full h-18 bg-black/40 border border-white/[0.08] focus:border-teal-400/70 rounded-lg p-3 text-xs text-white placeholder-gray-500 leading-relaxed outline-none transition resize-y"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 9: CATEGORY & TAGS */}
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Category <span className="text-teal-400">*</span>
              </label>
              <div className="relative">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full h-11 bg-black/40 border border-white/[0.08] focus:border-teal-400/70 rounded-xl px-4 text-sm text-white font-medium outline-none transition cursor-pointer appearance-none"
                >
                  <option value="android">Android</option>
                  <option value="ios">iOS</option>
                  <option value="flutter">Flutter</option>
                  <option value="web">Web</option>
                  <option value="desktop">Desktop</option>
                </select>
                <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-[20px]">
                  expand_more
                </span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-gray-300">
                  Tags
                </label>
                <span className="text-[11px] font-mono text-gray-500">
                  {tags.length} selected
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {availableTags.map((tag) => {
                  const isSelected = tags.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition flex items-center gap-1.5 cursor-pointer select-none ${
                        isSelected
                          ? "bg-teal-500/20 border-teal-400/50 text-teal-300"
                          : "bg-white/[0.03] border-white/[0.08] text-gray-400 hover:text-white hover:border-white/20"
                      }`}
                      onClick={() => handleTagToggle(tag.id)}
                    >
                      {isSelected && (
                        <span className="material-symbols-outlined text-[13px]">check</span>
                      )}
                      <span>{tag.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* SECTION 10: PUBLISH TOGGLE */}
          <div
            onClick={() => setPublishNow(!publishNow)}
            className="bg-black/30 border border-white/[0.08] hover:border-teal-500/30 rounded-xl p-4 flex items-center justify-between gap-4 transition cursor-pointer"
          >
            <span className="text-xs sm:text-sm font-semibold text-white flex items-center gap-2">
              Publish immediately (visible on site)
            </span>

            <div className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                id="publishNow"
                type="checkbox"
                checked={publishNow}
                onChange={(e) => setPublishNow(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-500"></div>
            </div>
          </div>

          {/* SECTION 11: SUBMIT BUTTON */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-teal-400 via-teal-500 to-emerald-500 hover:from-teal-300 hover:via-teal-400 hover:to-emerald-400 text-black font-bold text-sm tracking-wide shadow-[0_0_25px_rgba(20,184,166,0.3)] hover:shadow-[0_0_35px_rgba(20,184,166,0.5)] transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <HelixLoader size={18} color="#000000" />
                  <span>Adding Project...</span>
                </>
              ) : (
                <span>Add Project</span>
              )}
            </button>
          </div>
        </form>
      </main>
    </AdminLayout>
  );
}
