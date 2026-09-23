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
import {
  getAvailableCurrencies,
  getBdtToUsdRate,
  convertBdtToUsd,
} from "@/lib/services/currencyService";
import HelixLoader from "@/components/HelixLoader";
import { uploadProjectImage } from "@/lib/services/projectImageService";
import {
  getLabCategories,
  createLabCategory,
} from "@/lib/services/labCategoryService";
import {
  DEFAULT_YOUTUBE_URL,
  DEFAULT_SNAPSHOT,
  DEFAULT_WHATS_INCLUDED,
  DEFAULT_NOT_INCLUDED,
  DEFAULT_FAQS,
  ProjectFAQ,
  ProjectPricingTier,
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
  
  // Multi-image state (1 mandatory, max 5)
  const [images, setImages] = useState<string[]>([]);
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);

  const [details, setDetails] = useState("");
  const [installation, setInstallation] = useState("");
  const [tools, setTools] = useState("");
  const [price, setPrice] = useState("");
  const [discount, setDiscount] = useState("");
  const [currencyPricing, setCurrencyPricing] = useState<CurrencyPricing[]>([]);
  const [bdtToUsdRate, setBdtToUsdRate] = useState<number>(1 / 122);

  // Category state + Search & Instant Create
  const [category, setCategory] = useState("android");
  const [availableCategories, setAvailableCategories] = useState<string[]>([
    "android",
    "ios",
    "flutter",
    "web",
    "desktop",
  ]);
  const [categorySearch, setCategorySearch] = useState("");
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);

  // Tag state + Search & Instant Create
  const [tags, setTags] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [tagSearch, setTagSearch] = useState("");
  const [isCreatingTag, setIsCreatingTag] = useState(false);

  const [publishNow, setPublishNow] = useState(true);
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

  // Inclusions & Exclusions with bulk comma support
  const [whatsIncluded, setWhatsIncluded] = useState<string[]>(DEFAULT_WHATS_INCLUDED);
  const [bulkIncludedInput, setBulkIncludedInput] = useState("");
  const [notIncluded, setNotIncluded] = useState<string[]>(DEFAULT_NOT_INCLUDED);
  const [bulkNotIncludedInput, setBulkNotIncludedInput] = useState("");

  // FAQ state
  const [faqs, setFaqs] = useState<ProjectFAQ[]>(DEFAULT_FAQS);

  // 3-Tier Pricing Plans state
  const [pricingPlans, setPricingPlans] = useState<ProjectPricingTier[]>(() =>
    getDefaultPricingPlans()
  );
  const [tierFeatureInputs, setTierFeatureInputs] = useState<{ [tierIdx: number]: string }>({});

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

  // Load tags, currencies, categories & live exchange rate
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

        // Fetch live exchange rate
        const rate = await getBdtToUsdRate();
        if (rate && rate > 0) setBdtToUsdRate(rate);

        // Load dynamic categories
        const dbCats = await getLabCategories();
        const base = ["android", "ios", "flutter", "web", "desktop"];
        const merged = Array.from(
          new Set([...base, ...dbCats.map((c) => c.slug || c.name.toLowerCase())])
        );
        setAvailableCategories(merged);
      } catch (e) {
        console.error(e);
        setErrMsg("Failed to load tags, currencies, and categories. Please refresh.");
      }
    })();
  }, []);

  const handleTagToggle = (tagId: string) => {
    setTags((prev) =>
      prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId]
    );
  };

  const handleCreateTag = async (tagName: string) => {
    const trimmed = tagName.trim();
    if (!trimmed) return;
    const slug = makeSlug(trimmed);
    if (!slug) return;

    setIsCreatingTag(true);
    try {
      const ref = doc(db, "tags", slug);
      await setDoc(ref, { name: trimmed, createdAt: new Date() });
      const newTagItem: Tag = { id: slug, name: trimmed };
      setAvailableTags((prev) => {
        const exists = prev.some((t) => t.id === slug);
        return exists ? prev : [...prev, newTagItem].sort((a, b) => a.name.localeCompare(b.name));
      });
      setTags((prev) => (prev.includes(slug) ? prev : [...prev, slug]));
      setTagSearch("");
    } catch (err: any) {
      setErrMsg(err?.message || "Failed to create tag.");
    } finally {
      setIsCreatingTag(false);
    }
  };

  const handleCreateCategory = async (catName: string) => {
    const trimmed = catName.trim();
    if (!trimmed) return;
    setIsCreatingCategory(true);
    try {
      const slug = await createLabCategory({ name: trimmed });
      if (!availableCategories.includes(slug)) {
        setAvailableCategories((prev) => [...prev, slug]);
      }
      setCategory(slug);
      setCategorySearch("");
      setCategoryDropdownOpen(false);
    } catch (err: any) {
      setErrMsg(err?.message || "Failed to create category.");
    } finally {
      setIsCreatingCategory(false);
    }
  };

  const handleCurrencyPriceChange = (
    currencyCode: string,
    field: "regularPrice" | "discountPrice",
    value: string
  ) => {
    setCurrencyPricing((prev) => {
      let updated = prev.map((item) =>
        item.currency === currencyCode ? { ...item, [field]: value } : item
      );

      // Auto-convert BDT to USD in real-time
      if (currencyCode === "BDT") {
        const convertedUsd = convertBdtToUsd(value, bdtToUsdRate);
        updated = updated.map((item) => {
          if (item.currency === "USD") {
            return {
              ...item,
              [field]: convertedUsd,
            };
          }
          return item;
        });
      }

      return updated;
    });

    if (currencyCode === "BDT") {
      if (field === "regularPrice") {
        setPrice(value);
      } else if (field === "discountPrice") {
        setDiscount(value);
      }
    }
  };

  // ── MULTI-IMAGE HANDLERS (1 Mandatory, Max 5) ──
  const handleAddImageUrl = () => {
    const trimmed = imageUrlInput.trim();
    if (!trimmed) return;
    if (images.length >= 5) {
      setErrMsg("Maximum 5 project images allowed. Please remove an image first.");
      return;
    }
    setErrMsg("");
    setImages((prev) => [...prev, trimmed]);
    setImageUrlInput("");
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSetCoverImage = (index: number) => {
    if (index === 0) return;
    setImages((prev) => {
      const next = [...prev];
      const [selected] = next.splice(index, 1);
      return [selected, ...next];
    });
  };

  const handleMoveImage = (fromIdx: number, toIdx: number) => {
    setImages((prev) => {
      if (toIdx < 0 || toIdx >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
  };

  const handleImageFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = 5 - images.length;
    if (remainingSlots <= 0) {
      setErrMsg("Maximum 5 images allowed. Please remove an image before uploading more.");
      return;
    }

    const filesToUpload = Array.from(files).slice(0, remainingSlots);
    for (const file of filesToUpload) {
      if (!file.type.startsWith("image/")) {
        setErrMsg(`File "${file.name}" is not a valid image file.`);
        return;
      }
      if (file.size > 15 * 1024 * 1024) {
        setErrMsg(`"${file.name}" exceeds the 15MB file size limit.`);
        return;
      }
    }

    try {
      setUploadingImage(true);
      setErrMsg("");
      const uploadedUrls: string[] = [];
      for (const file of filesToUpload) {
        const url = await uploadProjectImage(file, makeSlug(title) || "project");
        uploadedUrls.push(url);
      }
      setImages((prev) => [...prev, ...uploadedUrls].slice(0, 5));
    } catch (err: any) {
      console.error("Multi-image upload failed:", err);
      setErrMsg(err?.message || "Failed to upload some images.");
    } finally {
      setUploadingImage(false);
      if (e.target) e.target.value = "";
    }
  };

  // ── 3-TIER PRICING PLANS HANDLERS ──
  const handlePlanChange = (tierIdx: number, field: string, value: any) => {
    setPricingPlans((prev) => {
      const next = [...prev];
      next[tierIdx] = { ...next[tierIdx], [field]: value };
      return next;
    });
  };

  // Real-time BDT -> USD live auto-conversion
  const handlePlanPriceChange = (tierIdx: number, bdtValue: string) => {
    setPricingPlans((prev) => {
      const next = [...prev];
      const convertedUsd = convertBdtToUsd(bdtValue, bdtToUsdRate);
      next[tierIdx] = {
        ...next[tierIdx],
        price: bdtValue,
        usdPrice: bdtValue.trim() === "" ? "" : (convertedUsd || next[tierIdx].usdPrice || ""),
      };
      return next;
    });
  };

  const handlePlanFeatureChange = (tierIdx: number, featIdx: number, text: string) => {
    setPricingPlans((prev) => {
      const next = [...prev];
      const nextFeatures = [...(next[tierIdx]?.features || [])];
      nextFeatures[featIdx] = { ...nextFeatures[featIdx], text };
      next[tierIdx] = { ...next[tierIdx], features: nextFeatures };
      return next;
    });
  };

  const handlePlanFeatureToggle = (tierIdx: number, featIdx: number) => {
    setPricingPlans((prev) => {
      const next = [...prev];
      const nextFeatures = [...(next[tierIdx]?.features || [])];
      nextFeatures[featIdx] = {
        ...nextFeatures[featIdx],
        included: !nextFeatures[featIdx].included,
      };
      next[tierIdx] = { ...next[tierIdx], features: nextFeatures };
      return next;
    });
  };

  // Bulk comma-separated add for tier features (e.g. "x, y, z")
  const handleAddPlanFeature = (tierIdx: number, rawText?: string) => {
    const textToProcess = rawText !== undefined ? rawText : (tierFeatureInputs[tierIdx] || "");
    const parts = textToProcess.includes(",")
      ? textToProcess.split(",").map((s) => s.trim()).filter(Boolean)
      : [textToProcess.trim()].filter(Boolean);

    const itemsToAdd = parts.length > 0 ? parts : ["New Plan Feature"];

    setPricingPlans((prev) => {
      const next = [...prev];
      const newItems = itemsToAdd.map((txt) => ({ text: txt, included: true }));
      next[tierIdx] = {
        ...next[tierIdx],
        features: [...(next[tierIdx]?.features || []), ...newItems],
      };
      return next;
    });

    if (rawText === undefined) {
      setTierFeatureInputs((prev) => ({ ...prev, [tierIdx]: "" }));
    }
  };

  const handleRemovePlanFeature = (tierIdx: number, featIdx: number) => {
    setPricingPlans((prev) => {
      const next = [...prev];
      const nextFeatures = (next[tierIdx]?.features || []).filter((_, i) => i !== featIdx);
      next[tierIdx] = { ...next[tierIdx], features: nextFeatures };
      return next;
    });
  };

  const handleResetPlans = () => {
    if (
      typeof window !== "undefined" &&
      window.confirm("Reset all 3 pricing tiers to standard defaults derived from project price?")
    ) {
      setPricingPlans(getDefaultPricingPlans({ price, discount }));
    }
  };

  // ── INCLUSIONS HANDLERS (With Bulk Comma-Separated Support) ──
  const handleWhatsIncludedChange = (idx: number, val: string) => {
    setWhatsIncluded((prev) => {
      const next = [...prev];
      next[idx] = val;
      return next;
    });
  };

  const handleAddWhatsIncluded = (rawText?: string) => {
    const textToProcess = rawText !== undefined ? rawText : bulkIncludedInput;
    if (!textToProcess.trim()) {
      setWhatsIncluded((prev) => [...prev, "New included feature item"]);
      return;
    }
    const parts = textToProcess.includes(",")
      ? textToProcess.split(",").map((s) => s.trim()).filter(Boolean)
      : [textToProcess.trim()].filter(Boolean);

    if (parts.length > 0) {
      setWhatsIncluded((prev) => [...prev, ...parts]);
      if (rawText === undefined) setBulkIncludedInput("");
    }
  };

  const handleSplitWhatsIncluded = (idx: number) => {
    const current = whatsIncluded[idx];
    if (!current || !current.includes(",")) return;
    const parts = current.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length > 1) {
      setWhatsIncluded((prev) => {
        const next = [...prev];
        next.splice(idx, 1, ...parts);
        return next;
      });
    }
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

  const handleAddNotIncluded = (rawText?: string) => {
    const textToProcess = rawText !== undefined ? rawText : bulkNotIncludedInput;
    if (!textToProcess.trim()) {
      setNotIncluded((prev) => [...prev, "Excluded feature item"]);
      return;
    }
    const parts = textToProcess.includes(",")
      ? textToProcess.split(",").map((s) => s.trim()).filter(Boolean)
      : [textToProcess.trim()].filter(Boolean);

    if (parts.length > 0) {
      setNotIncluded((prev) => [...prev, ...parts]);
      if (rawText === undefined) setBulkNotIncludedInput("");
    }
  };

  const handleSplitNotIncluded = (idx: number) => {
    const current = notIncluded[idx];
    if (!current || !current.includes(",")) return;
    const parts = current.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length > 1) {
      setNotIncluded((prev) => {
        const next = [...prev];
        next.splice(idx, 1, ...parts);
        return next;
      });
    }
  };

  const handleRemoveNotIncluded = (idx: number) => {
    setNotIncluded((prev) => prev.filter((_, i) => i !== idx));
  };

  // ── FAQ HANDLERS ──
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
      setImages([]);
      setImageUrlInput("");
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
      setPricingPlans(getDefaultPricingPlans());
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

      // Mandatory images check (1 to 5)
      if (images.length === 0) {
        setErrMsg("Please add at least 1 project image (max 5). The first image will serve as the cover.");
        setLoading(false);
        return;
      }

      if (images.length > 5) {
        setErrMsg("Maximum 5 project images allowed. Please remove excess images.");
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

      const primaryCoverImage = images[0];

      const newProject = {
        slug,
        title: title.trim(),
        subtitle: subtitle.trim(),
        imageUrl: primaryCoverImage,
        image: primaryCoverImage,
        images: images,
        details: details.trim(),
        installation: installation.trim(),
        tools: tools.split(",").map((t) => t.trim()).filter(Boolean),
        pricing: activePricing,
        price: bdtPricing?.regularPrice || price.trim(),
        discount: bdtPricing?.discountPrice || discount.trim(),
        pricingPlans: pricingPlans,
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
                    setImages([]);
                    setImageUrlInput("");
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

          {/* SECTION: MULTI-IMAGE MANAGEMENT (1 Mandatory, Max 5) */}
          <div className="bg-[#0e0e1a]/80 border border-white/[0.08] rounded-2xl p-5 sm:p-6 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/[0.06]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-teal-400/10 border border-teal-400/30 text-teal-300 flex items-center justify-center text-xs font-bold">
                    <span className="material-symbols-outlined text-[15px]">photo_library</span>
                  </span>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    Project Showcase & Gallery Images
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                      images.length > 0
                        ? "bg-teal-500/15 text-teal-300 border-teal-500/30"
                        : "bg-amber-500/15 text-amber-300 border-amber-500/30"
                    }`}>
                      {images.length} / 5 Images {images.length === 0 ? "(1 Mandatory)" : ""}
                    </span>
                  </h3>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  At least 1 cover image is mandatory. Add up to 5 images for an adaptive multi-angle showcase grid.
                </p>
              </div>

              {images.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm("Clear all added project images?")) setImages([]);
                  }}
                  className="self-start sm:self-auto px-2.5 py-1 rounded-lg bg-white/[0.03] hover:bg-rose-500/10 border border-white/[0.08] hover:border-rose-500/30 text-gray-400 hover:text-rose-300 text-[11px] font-medium transition flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[14px]">delete</span>
                  <span>Clear All</span>
                </button>
              )}
            </div>

            {/* Empty state alert */}
            {images.length === 0 && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[18px] text-amber-400">warning</span>
                <span>
                  <strong>1 image is mandatory:</strong> Please upload or paste at least one image. The first image will automatically act as the primary storefront cover.
                </span>
              </div>
            )}

            {/* Input Controls (URL & Multi-File Upload) */}
            <div className="grid md:grid-cols-2 gap-4 items-start">
              {/* Direct URL Add */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-gray-300 flex items-center justify-between">
                  <span>Add Image by URL</span>
                  <span className="text-[10px] font-mono text-gray-500">Unsplash / Cloudinary / Web Link</span>
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="url"
                      placeholder="https://images.unsplash.com/... or image link"
                      value={imageUrlInput}
                      onChange={(e) => setImageUrlInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddImageUrl();
                        }
                      }}
                      disabled={images.length >= 5}
                      className="w-full h-10 bg-black/40 border border-white/[0.08] focus:border-teal-400/70 rounded-xl pl-9 pr-3 text-xs text-white placeholder-gray-500 font-mono transition outline-none disabled:opacity-50"
                    />
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-[15px]">
                      link
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddImageUrl}
                    disabled={!imageUrlInput.trim() || images.length >= 5}
                    className="h-10 px-3.5 bg-teal-500/15 hover:bg-teal-500/25 border border-teal-500/40 text-teal-300 rounded-xl text-xs font-semibold transition disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <span className="material-symbols-outlined text-[15px]">add</span>
                    <span>Add</span>
                  </button>
                </div>
              </div>

              {/* Local File Upload */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-gray-300 flex items-center justify-between">
                  <span>Upload Local File(s)</span>
                  <span className="text-[10px] font-mono text-gray-500">Select single or multiple (Max 15MB each)</span>
                </label>
                <div>
                  <input
                    type="file"
                    id="add-project-multi-files"
                    accept="image/*"
                    multiple
                    onChange={handleImageFileUpload}
                    className="hidden"
                    disabled={uploadingImage || images.length >= 5}
                  />
                  <label
                    htmlFor="add-project-multi-files"
                    className={`w-full h-10 rounded-xl border border-dashed flex items-center justify-center gap-2 px-4 text-xs font-semibold transition cursor-pointer ${
                      images.length >= 5
                        ? "opacity-40 border-white/[0.08] bg-white/[0.02] pointer-events-none text-gray-500"
                        : uploadingImage
                        ? "border-teal-400/50 bg-teal-500/10 text-teal-300 pointer-events-none"
                        : "border-white/[0.15] bg-white/[0.02] hover:bg-white/[0.05] hover:border-teal-400/50 text-gray-300 hover:text-white"
                    }`}
                  >
                    {uploadingImage ? (
                      <>
                        <HelixLoader size={15} color="#14b8a6" />
                        <span>Uploading Images...</span>
                      </>
                    ) : images.length >= 5 ? (
                      <span>Maximum 5 Images Reached</span>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-teal-400 text-[17px]">
                          cloud_upload
                        </span>
                        <span>Click to Upload (Up to {5 - images.length} remaining)</span>
                      </>
                    )}
                  </label>
                </div>
              </div>
            </div>

            {/* Gallery Image Thumbnails & Management List */}
            {images.length > 0 && (
              <div className="pt-2">
                <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2.5">
                  Current Gallery Images ({images.length} of 5)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  {images.map((imgUrl, idx) => {
                    const isCover = idx === 0;
                    return (
                      <div
                        key={idx}
                        className={`relative rounded-xl overflow-hidden border p-2 bg-black/40 flex flex-col justify-between space-y-2 transition group ${
                          isCover
                            ? "border-teal-500/60 shadow-[0_0_15px_rgba(20,184,166,0.15)] ring-1 ring-teal-400/40"
                            : "border-white/[0.08] hover:border-white/20"
                        }`}
                      >
                        {/* Image Preview Container */}
                        <div className="relative w-full h-28 rounded-lg overflow-hidden bg-black/60 flex items-center justify-center">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={imgUrl}
                            alt={`Project upload ${idx + 1}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLElement).style.opacity = "0.3";
                            }}
                          />

                          {/* Badge indicator */}
                          <span
                            className={`absolute top-1.5 left-1.5 text-[9px] font-mono font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                              isCover
                                ? "bg-teal-500 text-black shadow-md"
                                : "bg-black/75 text-gray-300 border border-white/20"
                            }`}
                          >
                            {isCover ? "★ Cover" : `#${idx + 1}`}
                          </span>

                          {/* External preview link */}
                          <a
                            href={imgUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="absolute bottom-1.5 right-1.5 p-1 rounded-md bg-black/80 text-gray-300 hover:text-white opacity-0 group-hover:opacity-100 transition"
                            title="Open full image"
                          >
                            <span className="material-symbols-outlined text-[13px]">open_in_new</span>
                          </a>
                        </div>

                        {/* Controls */}
                        <div className="flex items-center justify-between gap-1 pt-1 border-t border-white/[0.06]">
                          <div className="flex items-center gap-1">
                            {!isCover && (
                              <button
                                type="button"
                                onClick={() => handleSetCoverImage(idx)}
                                className="text-[10px] px-2 py-0.5 rounded bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 transition cursor-pointer"
                                title="Make this the primary cover image"
                              >
                                Make Cover
                              </button>
                            )}
                            {idx > 0 && (
                              <button
                                type="button"
                                onClick={() => handleMoveImage(idx, idx - 1)}
                                className="p-1 rounded text-gray-400 hover:text-white bg-white/[0.04] transition"
                                title="Move left"
                              >
                                <span className="material-symbols-outlined text-[13px]">arrow_back</span>
                              </button>
                            )}
                            {idx < images.length - 1 && (
                              <button
                                type="button"
                                onClick={() => handleMoveImage(idx, idx + 1)}
                                className="p-1 rounded text-gray-400 hover:text-white bg-white/[0.04] transition"
                                title="Move right"
                              >
                                <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
                              </button>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveImage(idx)}
                            className="p-1 rounded text-gray-400 hover:text-rose-300 hover:bg-rose-500/10 transition"
                            title="Remove image"
                          >
                            <span className="material-symbols-outlined text-[14px]">delete</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
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

          {/* SECTION 7: INCLUSIONS & EXCLUSIONS (With Bulk Comma-Separated Support) */}
          <div className="grid md:grid-cols-2 gap-5">
            {/* What's Included */}
            <div className="bg-gradient-to-br from-emerald-500/[0.03] to-transparent border border-emerald-500/20 rounded-2xl p-5 space-y-3.5 shadow-xl">
              <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 flex items-center justify-center text-xs font-bold">
                    ✓
                  </span>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    What&apos;s Included ({whatsIncluded.length})
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => handleAddWhatsIncluded()}
                  className="text-[11px] bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded-lg font-semibold border border-emerald-500/30 transition flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[13px]">add</span>
                  <span>Add Line</span>
                </button>
              </div>

              {/* Bulk Quick Add Bar */}
              <div className="flex items-center gap-1.5 p-1 bg-black/40 border border-emerald-500/25 rounded-xl">
                <input
                  type="text"
                  placeholder="Paste or type comma-separated items: e.g. Clean Code, 100+ Screens, Riverpod"
                  value={bulkIncludedInput}
                  onChange={(e) => setBulkIncludedInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddWhatsIncluded();
                    }
                  }}
                  className="flex-1 h-8 bg-transparent px-2.5 text-xs text-white placeholder-gray-500 outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleAddWhatsIncluded()}
                  disabled={!bulkIncludedInput.trim()}
                  className="h-7 px-2.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded-lg text-[11px] font-semibold border border-emerald-500/30 transition disabled:opacity-40 disabled:pointer-events-none shrink-0"
                >
                  Add Items
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
                    {item.includes(",") && (
                      <button
                        type="button"
                        onClick={() => handleSplitWhatsIncluded(idx)}
                        className="px-2 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-[10px] font-mono border border-emerald-500/30 transition shrink-0"
                        title="Split comma-separated values into individual items"
                      >
                        Split
                      </button>
                    )}
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
            <div className="bg-gradient-to-br from-amber-500/[0.03] to-transparent border border-amber-500/20 rounded-2xl p-5 space-y-3.5 shadow-xl">
              <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-300 flex items-center justify-center text-xs font-bold">
                    ✕
                  </span>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Not Included ({notIncluded.length})
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => handleAddNotIncluded()}
                  className="text-[11px] bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 px-2.5 py-1 rounded-lg font-semibold border border-amber-500/30 transition flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[13px]">add</span>
                  <span>Add Line</span>
                </button>
              </div>

              {/* Bulk Quick Add Bar */}
              <div className="flex items-center gap-1.5 p-1 bg-black/40 border border-amber-500/25 rounded-xl">
                <input
                  type="text"
                  placeholder="Paste or type comma-separated items: e.g. Domain, Hosting, Custom API"
                  value={bulkNotIncludedInput}
                  onChange={(e) => setBulkNotIncludedInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddNotIncluded();
                    }
                  }}
                  className="flex-1 h-8 bg-transparent px-2.5 text-xs text-white placeholder-gray-500 outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleAddNotIncluded()}
                  disabled={!bulkNotIncludedInput.trim()}
                  className="h-7 px-2.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg text-[11px] font-semibold border border-amber-500/30 transition disabled:opacity-40 disabled:pointer-events-none shrink-0"
                >
                  Add Items
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
                    {item.includes(",") && (
                      <button
                        type="button"
                        onClick={() => handleSplitNotIncluded(idx)}
                        className="px-2 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-[10px] font-mono border border-amber-500/30 transition shrink-0"
                        title="Split comma-separated values into individual items"
                      >
                        Split
                      </button>
                    )}
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

          {/* SECTION 9: 3-TIER PRICING PLANS MANAGEMENT (With BDT Auto-Conversion & Comma Input) */}
          <div className="bg-gradient-to-br from-cyan-500/[0.03] to-transparent border border-cyan-500/30 rounded-2xl p-5 sm:p-6 space-y-5 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
                  <h3 className="text-sm sm:text-base font-bold text-white">
                    Pricing Plans (3-Tier Management)
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/30 text-cyan-300">
                    Live BDT ➔ USD Sync
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  Configure Individual, Studio, and Enterprise tiers. Typing BDT automatically converts to USD (editable).
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                <button
                  type="button"
                  onClick={handleResetPlans}
                  className="text-xs bg-white/[0.04] hover:bg-white/[0.08] text-gray-400 hover:text-white px-3 py-1.5 rounded-xl border border-white/[0.08] transition"
                >
                  Reset Standard Defaults
                </button>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-5">
              {pricingPlans.map((tier, tIdx) => {
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
                            onChange={(e) => handlePlanPriceChange(tIdx, e.target.value)}
                            placeholder="30000"
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
                      </div>

                      {/* Quick Add with Comma Separation */}
                      <div className="flex items-center gap-1.5 p-1 bg-black/60 border border-white/[0.08] rounded-lg">
                        <input
                          type="text"
                          placeholder="Add feature(s), comma-separated..."
                          value={tierFeatureInputs[tIdx] || ""}
                          onChange={(e) =>
                            setTierFeatureInputs((prev) => ({ ...prev, [tIdx]: e.target.value }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddPlanFeature(tIdx);
                            }
                          }}
                          className="flex-1 bg-transparent px-2 text-[11px] text-white placeholder-gray-500 outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddPlanFeature(tIdx)}
                          className="px-2 py-0.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 rounded text-[11px] font-semibold border border-cyan-500/30 transition shrink-0"
                        >
                          + Add
                        </button>
                      </div>

                      <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                        {(tier.features || []).map((feat, fIdx) => (
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

          {/* SECTION 10: SEARCHABLE CATEGORY & TAGS WITH INSTANT INLINE CREATION */}
          <div className="space-y-6">
            {/* Category Combobox / Instant Add */}
            <div className="bg-[#0e0e1a]/80 border border-white/[0.08] rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-teal-400 text-[18px]">category</span>
                  <label className="text-xs font-semibold text-gray-200 uppercase tracking-wider">
                    Category <span className="text-teal-400">*</span>
                  </label>
                  <span className="bg-teal-500/10 text-teal-300 font-mono text-[10px] px-2 py-0.5 rounded-full border border-teal-500/20 uppercase">
                    Active: {category}
                  </span>
                </div>
                <Link
                  href="/admin/manage-categories"
                  target="_blank"
                  className="text-[10px] font-mono text-teal-400 hover:text-teal-300 transition flex items-center gap-0.5"
                  title="Open dedicated Category Manager"
                >
                  <span>Manage All</span>
                  <span className="material-symbols-outlined text-[12px]">open_in_new</span>
                </Link>
              </div>

              {/* Search + Create Bar */}
              <div className="relative">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="Search categories or type new to create instant..."
                      value={categorySearch}
                      onChange={(e) => {
                        setCategorySearch(e.target.value);
                        setCategoryDropdownOpen(true);
                      }}
                      onFocus={() => setCategoryDropdownOpen(true)}
                      className="w-full h-11 bg-black/40 border border-white/[0.08] focus:border-teal-400/70 rounded-xl pl-9 pr-4 text-xs sm:text-sm text-white placeholder-gray-500 outline-none transition"
                    />
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[17px]">
                      search
                    </span>
                  </div>

                  {categorySearch.trim() && (
                    <button
                      type="button"
                      disabled={isCreatingCategory}
                      onClick={() => handleCreateCategory(categorySearch)}
                      className="h-11 px-3.5 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/40 text-xs font-semibold flex items-center gap-1.5 transition shrink-0 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[15px]">add</span>
                      <span>Create &quot;{categorySearch.trim()}&quot;</span>
                    </button>
                  )}
                </div>

                {/* Dropdown Options */}
                {categoryDropdownOpen && (
                  <div className="mt-2 p-2 bg-[#0a0a14] border border-white/[0.12] rounded-xl shadow-2xl space-y-1 max-h-52 overflow-y-auto z-20">
                    <div className="px-2 py-1 text-[10px] font-mono text-gray-500 uppercase tracking-wider">
                      Available Categories ({availableCategories.length})
                    </div>
                    {availableCategories
                      .filter((c) => c.toLowerCase().includes(categorySearch.toLowerCase()))
                      .map((cat) => {
                        const isSelected = category.toLowerCase() === cat.toLowerCase();
                        return (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => {
                              setCategory(cat);
                              setCategorySearch("");
                              setCategoryDropdownOpen(false);
                            }}
                            className={`w-full px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition cursor-pointer text-left capitalize ${
                              isSelected
                                ? "bg-teal-500/20 text-teal-300 border border-teal-500/30"
                                : "text-gray-300 hover:bg-white/[0.05] hover:text-white"
                            }`}
                          >
                            <span>{cat}</span>
                            {isSelected && (
                              <span className="material-symbols-outlined text-[14px] text-teal-400">
                                check
                              </span>
                            )}
                          </button>
                        );
                      })}

                    {categorySearch.trim() &&
                      !availableCategories.some(
                        (c) => c.toLowerCase() === categorySearch.trim().toLowerCase()
                      ) && (
                        <button
                          type="button"
                          onClick={() => handleCreateCategory(categorySearch)}
                          className="w-full px-3 py-2 rounded-lg text-xs font-semibold text-teal-300 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[14px]">add_circle</span>
                          <span>Create category &quot;{categorySearch.trim()}&quot; and select</span>
                        </button>
                      )}
                  </div>
                )}
              </div>
            </div>

            {/* Tags Combobox / Instant Add */}
            <div className="bg-[#0e0e1a]/80 border border-white/[0.08] rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-teal-400 text-[18px]">label</span>
                  <label className="text-xs font-semibold text-gray-200 uppercase tracking-wider">
                    Tags ({tags.length} selected)
                  </label>
                </div>
                <Link
                  href="/admin/manage-tags"
                  target="_blank"
                  className="text-[10px] font-mono text-teal-400 hover:text-teal-300 transition flex items-center gap-0.5"
                  title="Open dedicated Tag Manager"
                >
                  <span>Manage All</span>
                  <span className="material-symbols-outlined text-[12px]">open_in_new</span>
                </Link>
              </div>

              {/* Tag Search + Inline Create */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Search existing tags or type to create new..."
                    value={tagSearch}
                    onChange={(e) => setTagSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && tagSearch.trim()) {
                        e.preventDefault();
                        handleCreateTag(tagSearch);
                      }
                    }}
                    className="w-full h-10 bg-black/40 border border-white/[0.08] focus:border-teal-400/70 rounded-xl pl-9 pr-4 text-xs text-white placeholder-gray-500 outline-none transition"
                  />
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[16px]">
                    search
                  </span>
                </div>
                {tagSearch.trim() && (
                  <button
                    type="button"
                    disabled={isCreatingTag}
                    onClick={() => handleCreateTag(tagSearch)}
                    className="h-10 px-3.5 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/40 text-xs font-semibold flex items-center gap-1.5 transition shrink-0 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[15px]">add</span>
                    <span>Create &quot;{tagSearch.trim()}&quot;</span>
                  </button>
                )}
              </div>

              {/* Tag Pills */}
              <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pr-1">
                {availableTags
                  .filter((t) => t.name.toLowerCase().includes(tagSearch.toLowerCase()))
                  .map((tag) => {
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
