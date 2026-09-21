import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Head from "next/head";
import AdminLayout from "@/components/AdminLayout";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import Link from "next/link";
import { AvailableCurrency, CurrencyPricing } from "@/types/currency";
import {
  getAvailableCurrencies,
  getProjectPrices,
} from "@/lib/services/currencyService";
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

export default function EditProjectPage() {
  const router = useRouter();
  const { id } = router.query;

  // Admin gate
  const [authReady, setAuthReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Data
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [project, setProject] = useState<any>(null);
  const [toolsInput, setToolsInput] = useState<string>("");
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [currencyPricing, setCurrencyPricing] = useState<CurrencyPricing[]>([]);
  const [availableCurrencies, setAvailableCurrencies] = useState<AvailableCurrency[]>([]);
  const [errMsg, setErrMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Admin-only access check
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      const ok = !!user && user.email === ADMIN_EMAIL;
      setIsAdmin(ok);
      setAuthReady(true);
      if (!ok) router.replace("/login");
    });
    return () => unsub();
  }, [router]);

  // Load project + tags
  useEffect(() => {
    if (!authReady || !isAdmin || !id) return;

    const fetchAll = async () => {
      try {
        // tags
        const tagSnap = await getDocs(collection(db, "tags"));
        const tagList = tagSnap.docs.map((d) => ({
          id: d.id,
          name: (d.data() as any).name,
        })) as Tag[];
        setAvailableTags(tagList);

        // project
        const ref = doc(db, "projects", id as string);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          alert("Project not found");
          router.push("/admin/manage-projects");
          return;
        }
        const data = snap.data();

        // currencies & pricing
        const currs = await getAvailableCurrencies();
        setAvailableCurrencies(currs);

        const existingPrices = getProjectPrices({
          price: data.price,
          discount: data.discount,
          pricing: data.pricing,
        });

        const mergedPricing: CurrencyPricing[] = currs.map((c) => {
          const match = existingPrices.find((p) => p.currency === c.code);
          return {
            currency: c.code,
            symbol: c.symbol,
            regularPrice: match?.regularPrice || "",
            discountPrice: match?.discountPrice || "",
          };
        });

        existingPrices.forEach((ep) => {
          if (!mergedPricing.some((mp) => mp.currency === ep.currency)) {
            mergedPricing.push(ep);
          }
        });

        setCurrencyPricing(mergedPricing);

        // normalize fields
        const normalized = {
          title: data.title || "",
          subtitle: data.subtitle || "",
          price: data.price || "",
          discount: data.discount || "",
          category: data.category || "android",
          details: data.details || "",
          installation: data.installation || "",
          tags: Array.isArray(data.tags) ? data.tags : [],
          tools: Array.isArray(data.tools) ? data.tools : [],
          isPublic: typeof data.isPublic === "boolean" ? data.isPublic : false,
          youtubeUrl: data.youtubeUrl || DEFAULT_YOUTUBE_URL,
          snapshot: {
            version: data.snapshot?.version || DEFAULT_SNAPSHOT.version,
            platform: data.snapshot?.platform || DEFAULT_SNAPSHOT.platform,
            status: data.snapshot?.status || DEFAULT_SNAPSHOT.status,
            releaseDate: data.snapshot?.releaseDate || DEFAULT_SNAPSHOT.releaseDate,
          },
          story: {
            idea: data.story?.idea || "",
            problem: data.story?.problem || "",
            solution: data.story?.solution || "",
            value: data.story?.value || "",
          },
          whatsIncluded: Array.isArray(data.whatsIncluded) && data.whatsIncluded.length > 0
            ? data.whatsIncluded
            : DEFAULT_WHATS_INCLUDED,
          notIncluded: Array.isArray(data.notIncluded) && data.notIncluded.length > 0
            ? data.notIncluded
            : DEFAULT_NOT_INCLUDED,
          faqs: Array.isArray(data.faqs) && data.faqs.length > 0
            ? data.faqs
            : DEFAULT_FAQS,
          pricingPlans: Array.isArray(data.pricingPlans) && data.pricingPlans.length === 3
            ? data.pricingPlans
            : getDefaultPricingPlans({
                price: data.price,
                discount: data.discount,
                pricingPlans: data.pricingPlans,
              }),
        };

        setProject(normalized);
        setToolsInput(normalized.tools.join(", "));
        setLoading(false);
      } catch (e) {
        console.error(e);
        setErrMsg("Failed to load project. Check rules/network.");
        setLoading(false);
      }
    };

    fetchAll();
  }, [authReady, isAdmin, id, router]);

  const handleTagToggle = (tagId: string) => {
    setProject((prev: any) => {
      const current: string[] = Array.isArray(prev?.tags) ? prev.tags : [];
      return {
        ...prev,
        tags: current.includes(tagId)
          ? current.filter((t) => t !== tagId)
          : [...current, tagId],
      };
    });
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
    setProject((prev: any) => {
      const next = [...(prev.whatsIncluded || [])];
      next[idx] = val;
      return { ...prev, whatsIncluded: next };
    });
  };
  const handleAddWhatsIncluded = () => {
    setProject((prev: any) => ({
      ...prev,
      whatsIncluded: [...(prev.whatsIncluded || []), "New included feature item"],
    }));
  };
  const handleRemoveWhatsIncluded = (idx: number) => {
    setProject((prev: any) => ({
      ...prev,
      whatsIncluded: (prev.whatsIncluded || []).filter((_: any, i: number) => i !== idx),
    }));
  };

  const handleNotIncludedChange = (idx: number, val: string) => {
    setProject((prev: any) => {
      const next = [...(prev.notIncluded || [])];
      next[idx] = val;
      return { ...prev, notIncluded: next };
    });
  };
  const handleAddNotIncluded = () => {
    setProject((prev: any) => ({
      ...prev,
      notIncluded: [...(prev.notIncluded || []), "New excluded item"],
    }));
  };
  const handleRemoveNotIncluded = (idx: number) => {
    setProject((prev: any) => ({
      ...prev,
      notIncluded: (prev.notIncluded || []).filter((_: any, i: number) => i !== idx),
    }));
  };

  // FAQ Handlers
  const handleFaqChange = (idx: number, field: "question" | "answer", val: string) => {
    setProject((prev: any) => {
      const next = [...(prev.faqs || [])];
      next[idx] = { ...next[idx], [field]: val };
      return { ...prev, faqs: next };
    });
  };
  const handleAddFaq = () => {
    setProject((prev: any) => ({
      ...prev,
      faqs: [
        ...(prev.faqs || []),
        {
          question: "What is included with this build?",
          answer: "Complete source repository, documentation, and 12-month security patches.",
        },
      ],
    }));
  };
  const handleRemoveFaq = (idx: number) => {
    setProject((prev: any) => ({
      ...prev,
      faqs: (prev.faqs || []).filter((_: any, i: number) => i !== idx),
    }));
  };

  // Pricing plans handlers
  const handlePlanChange = (tierIdx: number, field: string, value: any) => {
    setProject((prev: any) => {
      const nextPlans = [...(prev.pricingPlans || [])];
      nextPlans[tierIdx] = {
        ...nextPlans[tierIdx],
        [field]: value,
      };
      return { ...prev, pricingPlans: nextPlans };
    });
  };

  const handlePlanFeatureChange = (tierIdx: number, featIdx: number, text: string) => {
    setProject((prev: any) => {
      const nextPlans = [...(prev.pricingPlans || [])];
      const nextFeatures = [...(nextPlans[tierIdx]?.features || [])];
      nextFeatures[featIdx] = {
        ...nextFeatures[featIdx],
        text,
      };
      nextPlans[tierIdx] = { ...nextPlans[tierIdx], features: nextFeatures };
      return { ...prev, pricingPlans: nextPlans };
    });
  };

  const handlePlanFeatureToggle = (tierIdx: number, featIdx: number) => {
    setProject((prev: any) => {
      const nextPlans = [...(prev.pricingPlans || [])];
      const nextFeatures = [...(nextPlans[tierIdx]?.features || [])];
      nextFeatures[featIdx] = {
        ...nextFeatures[featIdx],
        included: !nextFeatures[featIdx].included,
      };
      nextPlans[tierIdx] = { ...nextPlans[tierIdx], features: nextFeatures };
      return { ...prev, pricingPlans: nextPlans };
    });
  };

  const handleAddPlanFeature = (tierIdx: number) => {
    setProject((prev: any) => {
      const nextPlans = [...(prev.pricingPlans || [])];
      const nextFeatures = [
        ...(nextPlans[tierIdx]?.features || []),
        { text: "New Plan Feature", included: true },
      ];
      nextPlans[tierIdx] = { ...nextPlans[tierIdx], features: nextFeatures };
      return { ...prev, pricingPlans: nextPlans };
    });
  };

  const handleRemovePlanFeature = (tierIdx: number, featIdx: number) => {
    setProject((prev: any) => {
      const nextPlans = [...(prev.pricingPlans || [])];
      const nextFeatures = (nextPlans[tierIdx]?.features || []).filter(
        (_: any, i: number) => i !== featIdx
      );
      nextPlans[tierIdx] = { ...nextPlans[tierIdx], features: nextFeatures };
      return { ...prev, pricingPlans: nextPlans };
    });
  };

  const handleResetPlans = () => {
    if (typeof window !== "undefined" && window.confirm("Reset all 3 pricing tiers to standard defaults derived from this project's price?")) {
      setProject((prev: any) => ({
        ...prev,
        pricingPlans: getDefaultPricingPlans({ price: prev.price, discount: prev.discount }),
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    setErrMsg("");
    setSaving(true);

    try {
      const ref = doc(db, "projects", id as string);
      const activePricing = currencyPricing.filter(
        (p) =>
          (p.regularPrice && p.regularPrice.trim() !== "") ||
          (p.discountPrice && p.discountPrice.trim() !== "")
      );
      const bdtPricing = activePricing.find((p) => p.currency === "BDT");

      const payload = {
        ...project,
        pricing: activePricing,
        price: bdtPricing?.regularPrice || project.price,
        discount: bdtPricing?.discountPrice || project.discount,
        pricingPlans: project.pricingPlans,
        youtubeUrl: project.youtubeUrl || DEFAULT_YOUTUBE_URL,
        snapshot: project.snapshot,
        story: project.story,
        whatsIncluded: project.whatsIncluded,
        notIncluded: project.notIncluded,
        faqs: project.faqs,
        tools: toolsInput
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        updatedAt: Timestamp.now(),
      };

      await updateDoc(ref, payload);
      setSuccessMsg(`Project "${project.title}" updated successfully!`);
      setTimeout(() => {
        router.push("/admin/manage-projects");
      }, 1200);
    } catch (err) {
      console.error("Error updating project:", err);
      setErrMsg("Failed to update project. Please check required fields.");
    } finally {
      setSaving(false);
    }
  };

  if (!authReady || !isAdmin) {
    return (
      <AdminLayout title="Edit Project | DevEngine Admin">
        <main className="flex items-center justify-center min-h-[calc(100vh-56px)] bg-[#07070f]">
          <HelixLoader size={48} color="#14b8a6" />
        </main>
      </AdminLayout>
    );
  }

  if (loading || !project) {
    return (
      <AdminLayout title="Edit Project | DevEngine Admin">
        <main className="flex items-center justify-center min-h-[calc(100vh-56px)] bg-[#07070f]">
          <HelixLoader size={48} color="#14b8a6" />
        </main>
      </AdminLayout>
    );
  }

  const publicPath = `/projects/${project.slug || id}`;
  const pricingPath = `/projects/${project.slug || id}/pricing`;

  return (
    <AdminLayout title={`Edit ${project.title || "Project"} | DevEngine Admin`}>
      <Head>
        <title>Edit Project: {project.title} | DevEngine Admin</title>
      </Head>

      <main className="max-w-6xl mx-auto px-4 sm:px-8 py-8 text-white space-y-8 font-sans">
        {/* ── HEADER BAR ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-white/[0.07]">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <span className="text-[11px] font-semibold tracking-wider text-teal-400 uppercase bg-teal-400/10 px-2.5 py-0.5 rounded-full border border-teal-400/20">
                Catalog & Products / Edit CMS
              </span>
              <span className="flex items-center gap-1.5 text-[11px] text-gray-400 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                ID: {id}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Edit Project: {project.title}
            </h1>
            <p className="text-xs text-gray-400 mt-1 max-w-xl">
              Modify pricing matrix, release specifications, architecture story, and 3-tier licenses.
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

            <Link
              href={publicPath}
              target="_blank"
              className="px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-teal-500/10 border border-white/[0.08] hover:border-teal-500/30 text-xs font-semibold text-teal-300 hover:text-teal-200 transition flex items-center gap-1.5 cursor-pointer"
            >
              <span>View Public Page</span>
              <span className="material-symbols-outlined text-[14px]">open_in_new</span>
            </Link>
          </div>
        </div>

        {/* ── NOTIFICATIONS ── */}
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

        {successMsg && (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-[20px] text-emerald-400">check_circle</span>
              <span className="font-medium">{successMsg}</span>
            </div>
          </div>
        )}

        {/* ── MAIN FORM ── */}
        <form
          onSubmit={handleSubmit}
          className="bg-[#0c0c16]/95 border border-white/[0.08] rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-xl space-y-8"
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
                  value={project.title}
                  onChange={(e) =>
                    setProject({ ...project, title: e.target.value })
                  }
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
                  value={project.subtitle}
                  onChange={(e) =>
                    setProject({ ...project, subtitle: e.target.value })
                  }
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
                value={project.details}
                onChange={(e) =>
                  setProject({ ...project, details: e.target.value })
                }
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
                value={project.installation}
                onChange={(e) =>
                  setProject({ ...project, installation: e.target.value })
                }
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
                value={toolsInput}
                onChange={(e) => setToolsInput(e.target.value)}
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
              value={project.youtubeUrl || ""}
              onChange={(e) =>
                setProject({ ...project, youtubeUrl: e.target.value })
              }
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
                  value={project.snapshot?.version || ""}
                  onChange={(e) =>
                    setProject({
                      ...project,
                      snapshot: { ...project.snapshot, version: e.target.value },
                    })
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
                  value={project.snapshot?.platform || ""}
                  onChange={(e) =>
                    setProject({
                      ...project,
                      snapshot: { ...project.snapshot, platform: e.target.value },
                    })
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
                  value={project.snapshot?.status || ""}
                  onChange={(e) =>
                    setProject({
                      ...project,
                      snapshot: { ...project.snapshot, status: e.target.value },
                    })
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
                  value={project.snapshot?.releaseDate || ""}
                  onChange={(e) =>
                    setProject({
                      ...project,
                      snapshot: { ...project.snapshot, releaseDate: e.target.value },
                    })
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
                  value={project.story?.idea || ""}
                  onChange={(e) =>
                    setProject({
                      ...project,
                      story: { ...project.story, idea: e.target.value },
                    })
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
                  value={project.story?.problem || ""}
                  onChange={(e) =>
                    setProject({
                      ...project,
                      story: { ...project.story, problem: e.target.value },
                    })
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
                  value={project.story?.solution || ""}
                  onChange={(e) =>
                    setProject({
                      ...project,
                      story: { ...project.story, solution: e.target.value },
                    })
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
                  value={project.story?.value || ""}
                  onChange={(e) =>
                    setProject({
                      ...project,
                      story: { ...project.story, value: e.target.value },
                    })
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
                {(project.whatsIncluded || []).map((item: string, idx: number) => (
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
                {(project.notIncluded || []).map((item: string, idx: number) => (
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
              {(project.faqs || []).map((faq: ProjectFAQ, idx: number) => (
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

          {/* SECTION 9: 3-TIER PRICING PLANS MANAGEMENT (Upgraded with Perfect Grid Alignment) */}
          <div className="bg-gradient-to-br from-cyan-500/[0.03] to-transparent border border-cyan-500/30 rounded-2xl p-5 sm:p-6 space-y-5 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
                  <h3 className="text-sm sm:text-base font-bold text-white">
                    Pricing Plans (3-Tier Management)
                  </h3>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  Configure Individual Module, Studio License, and Enterprise Custom storefront tiers.
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                <Link
                  href={pricingPath}
                  target="_blank"
                  className="text-xs bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 px-3 py-1.5 rounded-xl border border-cyan-500/30 font-semibold flex items-center gap-1.5 transition"
                >
                  <span>Preview Storefront Tiers</span>
                  <span className="material-symbols-outlined text-[13px]">open_in_new</span>
                </Link>
                <button
                  type="button"
                  onClick={handleResetPlans}
                  className="text-xs bg-white/[0.04] hover:bg-white/[0.08] text-gray-400 hover:text-white px-3 py-1.5 rounded-xl border border-white/[0.08] transition"
                >
                  Reset Defaults
                </button>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-5">
              {(project.pricingPlans || []).map((tier: any, tIdx: number) => {
                const isPopular = !!tier.isPopular;
                return (
                  <div
                    key={tier.id || tIdx}
                    className={`rounded-2xl p-4 sm:p-5 border flex flex-col justify-between space-y-4 transition ${
                      isPopular
                        ? "bg-cyan-950/20 border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.12)]"
                        : "bg-black/30 border-white/[0.07]"
                    }`}
                  >
                    <div className="space-y-3.5">
                      {/* Header line */}
                      <div className="flex items-center justify-between gap-2 pb-1 border-b border-white/[0.06]">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/[0.06] text-gray-300 font-bold uppercase">
                          Tier {tIdx + 1}: {tier.id}
                        </span>

                        <label className="flex items-center gap-1.5 text-xs text-cyan-300 font-medium cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={isPopular}
                            onChange={(e) => handlePlanChange(tIdx, "isPopular", e.target.checked)}
                            className="rounded border-gray-600 text-cyan-500 focus:ring-0 cursor-pointer"
                          />
                          <span>Most Popular</span>
                        </label>
                      </div>

                      {/* Tier Name */}
                      <div>
                        <label className="block text-[10px] font-medium text-gray-400 mb-1">
                          Tier Name
                        </label>
                        <input
                          type="text"
                          value={tier.name || ""}
                          onChange={(e) => handlePlanChange(tIdx, "name", e.target.value)}
                          placeholder="e.g. Studio License"
                          className="w-full h-10 bg-black/50 border border-white/[0.08] focus:border-cyan-400/70 rounded-xl px-3 text-xs sm:text-sm font-bold text-white outline-none transition"
                        />
                      </div>

                      {/* Tagline */}
                      <div>
                        <label className="block text-[10px] font-medium text-gray-400 mb-1">
                          Tagline / Value Proposition
                        </label>
                        <input
                          type="text"
                          value={tier.tagline || ""}
                          onChange={(e) => handlePlanChange(tIdx, "tagline", e.target.value)}
                          placeholder="e.g. For full commercial ownership"
                          className="w-full h-9 bg-black/50 border border-white/[0.08] focus:border-cyan-400/70 rounded-xl px-3 text-xs text-white outline-none transition"
                        />
                      </div>

                      {/* Pricing Specs (BDT, USD, Period) */}
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[10px] font-medium text-gray-400 mb-1 truncate">
                            BDT (৳)
                          </label>
                          <input
                            type="text"
                            value={tier.price || ""}
                            onChange={(e) => handlePlanChange(tIdx, "price", e.target.value)}
                            placeholder="30,000"
                            className="w-full h-9 bg-black/50 border border-white/[0.08] focus:border-cyan-400/70 rounded-lg px-2.5 text-xs font-mono text-white outline-none transition"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-medium text-emerald-400 mb-1 truncate">
                            USD ($)
                          </label>
                          <input
                            type="text"
                            value={tier.usdPrice || ""}
                            onChange={(e) => handlePlanChange(tIdx, "usdPrice", e.target.value)}
                            placeholder="280"
                            className="w-full h-9 bg-black/50 border border-white/[0.08] focus:border-emerald-400/70 rounded-lg px-2.5 text-xs font-mono text-emerald-300 outline-none transition"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-medium text-gray-400 mb-1 truncate">
                            Period
                          </label>
                          <input
                            type="text"
                            value={tier.billingPeriod || ""}
                            onChange={(e) => handlePlanChange(tIdx, "billingPeriod", e.target.value)}
                            placeholder="one-time"
                            className="w-full h-9 bg-black/50 border border-white/[0.08] focus:border-cyan-400/70 rounded-lg px-2 text-xs font-mono text-white outline-none transition"
                          />
                        </div>
                      </div>

                      {/* CTA Button Text */}
                      <div>
                        <label className="block text-[10px] font-medium text-gray-400 mb-1">
                          Button CTA Text
                        </label>
                        <input
                          type="text"
                          value={tier.buttonText || ""}
                          onChange={(e) => handlePlanChange(tIdx, "buttonText", e.target.value)}
                          placeholder="Acquire License"
                          className="w-full h-9 bg-black/50 border border-white/[0.08] focus:border-cyan-400/70 rounded-lg px-3 text-xs font-mono text-white outline-none transition"
                        />
                      </div>
                    </div>

                    {/* Features Checklist */}
                    <div className="space-y-2 pt-3 border-t border-white/[0.06]">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-300">
                          Features ({tier.features?.length || 0})
                        </span>
                        <button
                          type="button"
                          onClick={() => handleAddPlanFeature(tIdx)}
                          className="text-[11px] text-cyan-400 hover:text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded-md transition cursor-pointer"
                        >
                          + Add
                        </button>
                      </div>

                      <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                        {(tier.features || []).map((feat: any, fIdx: number) => (
                          <div
                            key={fIdx}
                            className="flex items-center gap-2 bg-black/40 border border-white/[0.05] p-2 rounded-lg"
                          >
                            <input
                              type="checkbox"
                              checked={feat.included}
                              onChange={() => handlePlanFeatureToggle(tIdx, fIdx)}
                              title={feat.included ? "Mark as Excluded" : "Mark as Included"}
                              className="rounded text-cyan-500 focus:ring-0 cursor-pointer"
                            />
                            <input
                              type="text"
                              value={feat.text}
                              onChange={(e) => handlePlanFeatureChange(tIdx, fIdx, e.target.value)}
                              className={`bg-transparent text-xs w-full focus:outline-none ${
                                feat.included ? "text-gray-200" : "text-gray-500 line-through"
                              }`}
                            />
                            <button
                              type="button"
                              onClick={() => handleRemovePlanFeature(tIdx, fIdx)}
                              className="text-gray-500 hover:text-rose-400 text-xs px-1 cursor-pointer"
                              title="Delete feature"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECTION 10: CATEGORY & TAGS */}
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Category <span className="text-teal-400">*</span>
              </label>
              <div className="relative">
                <select
                  value={project.category}
                  onChange={(e) =>
                    setProject({ ...project, category: e.target.value })
                  }
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
                  {(project.tags || []).length} selected
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {availableTags.map((tag) => {
                  const isSelected = (project.tags || []).includes(tag.id);
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

          {/* SECTION 11: PUBLISH TOGGLE */}
          <div
            onClick={() => setProject({ ...project, isPublic: !project.isPublic })}
            className="bg-black/30 border border-white/[0.08] hover:border-teal-500/30 rounded-xl p-4 flex items-center justify-between gap-4 transition cursor-pointer"
          >
            <div className="space-y-0.5">
              <span className="text-xs sm:text-sm font-semibold text-white flex items-center gap-2">
                Published (visible on live site)
                {project.isPublic ? (
                  <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-mono px-2 py-0.5 rounded-full border border-emerald-500/30">
                    Live
                  </span>
                ) : (
                  <span className="bg-gray-500/20 text-gray-400 text-[10px] font-mono px-2 py-0.5 rounded-full border border-gray-500/30">
                    Draft
                  </span>
                )}
              </span>
              <p className="text-xs text-gray-400">
                When active, customers can discover and purchase this build on the storefront.
              </p>
            </div>

            <div className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                id="isPublic"
                type="checkbox"
                checked={!!project.isPublic}
                onChange={(e) =>
                  setProject({ ...project, isPublic: e.target.checked })
                }
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-500"></div>
            </div>
          </div>

          {/* SECTION 12: SUBMIT & CANCEL BUTTONS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-teal-400 via-teal-500 to-emerald-500 hover:from-teal-300 hover:via-teal-400 hover:to-emerald-400 text-black font-bold text-sm tracking-wide shadow-[0_0_25px_rgba(20,184,166,0.3)] hover:shadow-[0_0_35px_rgba(20,184,166,0.5)] transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {saving ? (
                <>
                  <HelixLoader size={18} color="#000000" />
                  <span>Saving Updates...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">save</span>
                  <span>Update Project</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => router.push("/admin/manage-projects")}
              className="w-full py-3.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 hover:text-white border border-white/[0.08] text-xs font-semibold transition flex items-center justify-center cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      </main>
    </AdminLayout>
  );
}
