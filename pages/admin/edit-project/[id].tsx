import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Head from "next/head";
import AdminLayout from "@/components/AdminLayout";
import {
  doc,
  getDoc,
  setDoc,
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
  const [uploadingImage, setUploadingImage] = useState(false);
  const [project, setProject] = useState<any>(null);
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [bdtToUsdRate, setBdtToUsdRate] = useState<number>(1 / 122);

  // Categories & Inline Creator
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

  const [toolsInput, setToolsInput] = useState<string>("");

  // Tags & Inline Creator
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [tagSearch, setTagSearch] = useState("");
  const [isCreatingTag, setIsCreatingTag] = useState(false);

  // Bulk Inclusions & Exclusions
  const [bulkIncludedInput, setBulkIncludedInput] = useState("");
  const [bulkNotIncludedInput, setBulkNotIncludedInput] = useState("");

  // Plan Feature Inputs
  const [tierFeatureInputs, setTierFeatureInputs] = useState<{ [tierIdx: number]: string }>({});

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

  // Load project + tags + exchange rate
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

        // live exchange rate
        getBdtToUsdRate().then((rate) => {
          if (rate && rate > 0) setBdtToUsdRate(rate);
        });

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

        // dynamic categories
        const dbCats = await getLabCategories();
        const base = ["android", "ios", "flutter", "web", "desktop"];
        const mergedCats = Array.from(
          new Set([
            ...base,
            (data.category || "").toLowerCase(),
            ...dbCats.map((c) => c.slug || c.name.toLowerCase()),
          ].filter(Boolean))
        );
        setAvailableCategories(mergedCats);

        const loadedImages = Array.isArray(data.images) && data.images.length > 0
          ? data.images
          : (data.imageUrl || data.image ? [data.imageUrl || data.image] : []);

        // normalize fields
        const normalized = {
          title: data.title || "",
          subtitle: data.subtitle || "",
          images: loadedImages,
          imageUrl: loadedImages[0] || data.imageUrl || data.image || "",
          image: loadedImages[0] || data.imageUrl || data.image || "",
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
      setProject((prev: any) => ({
        ...prev,
        [field === "regularPrice" ? "price" : "discount"]: value,
      }));
    }
  };

  // ── INLINE CATEGORY & TAG CREATORS ──
  const handleCreateCategory = async (catName: string) => {
    const trimmed = catName.trim();
    if (!trimmed) return;
    setIsCreatingCategory(true);
    try {
      const slug = await createLabCategory({ name: trimmed });
      if (!availableCategories.includes(slug)) {
        setAvailableCategories((prev) => [...prev, slug]);
      }
      setProject((prev: any) => ({ ...prev, category: slug }));
      setCategorySearch("");
      setCategoryDropdownOpen(false);
    } catch (err: any) {
      setErrMsg(err?.message || "Failed to create category.");
    } finally {
      setIsCreatingCategory(false);
    }
  };

  const handleCreateTag = async (tagName: string) => {
    const trimmed = tagName.trim();
    if (!trimmed) return;
    const slug = (trimmed.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-")) || "tag";

    setIsCreatingTag(true);
    try {
      const ref = doc(db, "tags", slug);
      await setDoc(ref, { name: trimmed, createdAt: new Date() });
      const newTagItem: Tag = { id: slug, name: trimmed };
      setAvailableTags((prev) => {
        const exists = prev.some((t) => t.id === slug);
        return exists ? prev : [...prev, newTagItem].sort((a, b) => a.name.localeCompare(b.name));
      });
      // Toggle new tag on
      setProject((prev: any) => {
        const curTags = Array.isArray(prev?.tags) ? prev.tags : [];
        return { ...prev, tags: curTags.includes(slug) ? curTags : [...curTags, slug] };
      });
      setTagSearch("");
    } catch (err: any) {
      setErrMsg(err?.message || "Failed to create tag.");
    } finally {
      setIsCreatingTag(false);
    }
  };

  // ── MULTI-IMAGE HANDLERS (1 Mandatory, Max 5) ──
  const handleAddImageUrl = () => {
    const trimmed = imageUrlInput.trim();
    if (!trimmed) return;
    const currentImages = Array.isArray(project?.images) ? project.images : [];
    if (currentImages.length >= 5) {
      setErrMsg("Maximum 5 project images allowed. Please remove an image first.");
      return;
    }
    setErrMsg("");
    setProject((prev: any) => {
      const updated = [...(prev.images || []), trimmed];
      return {
        ...prev,
        images: updated,
        imageUrl: updated[0] || "",
        image: updated[0] || "",
      };
    });
    setImageUrlInput("");
  };

  const handleRemoveImage = (index: number) => {
    setProject((prev: any) => {
      const updated = (prev.images || []).filter((_: any, i: number) => i !== index);
      return {
        ...prev,
        images: updated,
        imageUrl: updated[0] || "",
        image: updated[0] || "",
      };
    });
  };

  const handleSetCoverImage = (index: number) => {
    if (index === 0) return;
    setProject((prev: any) => {
      const next = [...(prev.images || [])];
      const [selected] = next.splice(index, 1);
      const updated = [selected, ...next];
      return {
        ...prev,
        images: updated,
        imageUrl: updated[0] || "",
        image: updated[0] || "",
      };
    });
  };

  const handleMoveImage = (fromIdx: number, toIdx: number) => {
    setProject((prev: any) => {
      const cur = [...(prev.images || [])];
      if (toIdx < 0 || toIdx >= cur.length) return prev;
      const [moved] = cur.splice(fromIdx, 1);
      cur.splice(toIdx, 0, moved);
      return {
        ...prev,
        images: cur,
        imageUrl: cur[0] || "",
        image: cur[0] || "",
      };
    });
  };

  const handleImageFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const currentImages = Array.isArray(project?.images) ? project.images : [];
    const remainingSlots = 5 - currentImages.length;
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
        const url = await uploadProjectImage(file, (id as string) || "project");
        uploadedUrls.push(url);
      }
      setProject((prev: any) => {
        const updated = [...(prev.images || []), ...uploadedUrls].slice(0, 5);
        return {
          ...prev,
          images: updated,
          imageUrl: updated[0] || "",
          image: updated[0] || "",
        };
      });
    } catch (err: any) {
      console.error("Multi-image upload failed:", err);
      setErrMsg(err?.message || "Failed to upload some images.");
    } finally {
      setUploadingImage(false);
      if (e.target) e.target.value = "";
    }
  };

  // ── INCLUSIONS HANDLERS (With Bulk Comma-Separated Support) ──
  const handleWhatsIncludedChange = (idx: number, val: string) => {
    setProject((prev: any) => {
      const next = [...(prev.whatsIncluded || [])];
      next[idx] = val;
      return { ...prev, whatsIncluded: next };
    });
  };

  const handleAddWhatsIncluded = (rawText?: string) => {
    const textToProcess = rawText !== undefined ? rawText : bulkIncludedInput;
    if (!textToProcess.trim()) {
      setProject((prev: any) => ({
        ...prev,
        whatsIncluded: [...(prev.whatsIncluded || []), "New included feature item"],
      }));
      return;
    }
    const parts = textToProcess.includes(",")
      ? textToProcess.split(",").map((s) => s.trim()).filter(Boolean)
      : [textToProcess.trim()].filter(Boolean);

    if (parts.length > 0) {
      setProject((prev: any) => ({
        ...prev,
        whatsIncluded: [...(prev.whatsIncluded || []), ...parts],
      }));
      if (rawText === undefined) setBulkIncludedInput("");
    }
  };

  const handleSplitWhatsIncluded = (idx: number) => {
    const current = project?.whatsIncluded?.[idx];
    if (!current || !current.includes(",")) return;
    const parts = current.split(",").map((s: string) => s.trim()).filter(Boolean);
    if (parts.length > 1) {
      setProject((prev: any) => {
        const next = [...(prev.whatsIncluded || [])];
        next.splice(idx, 1, ...parts);
        return { ...prev, whatsIncluded: next };
      });
    }
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

  const handleAddNotIncluded = (rawText?: string) => {
    const textToProcess = rawText !== undefined ? rawText : bulkNotIncludedInput;
    if (!textToProcess.trim()) {
      setProject((prev: any) => ({
        ...prev,
        notIncluded: [...(prev.notIncluded || []), "New excluded item"],
      }));
      return;
    }
    const parts = textToProcess.includes(",")
      ? textToProcess.split(",").map((s) => s.trim()).filter(Boolean)
      : [textToProcess.trim()].filter(Boolean);

    if (parts.length > 0) {
      setProject((prev: any) => ({
        ...prev,
        notIncluded: [...(prev.notIncluded || []), ...parts],
      }));
      if (rawText === undefined) setBulkNotIncludedInput("");
    }
  };

  const handleSplitNotIncluded = (idx: number) => {
    const current = project?.notIncluded?.[idx];
    if (!current || !current.includes(",")) return;
    const parts = current.split(",").map((s: string) => s.trim()).filter(Boolean);
    if (parts.length > 1) {
      setProject((prev: any) => {
        const next = [...(prev.notIncluded || [])];
        next.splice(idx, 1, ...parts);
        return { ...prev, notIncluded: next };
      });
    }
  };

  const handleRemoveNotIncluded = (idx: number) => {
    setProject((prev: any) => ({
      ...prev,
      notIncluded: (prev.notIncluded || []).filter((_: any, i: number) => i !== idx),
    }));
  };

  // ── FAQ HANDLERS ──
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

  // ── 3-TIER PRICING PLANS HANDLERS ──
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

  const handlePlanPriceChange = (tierIdx: number, bdtValue: string) => {
    setProject((prev: any) => {
      const nextPlans = [...(prev.pricingPlans || [])];
      const convertedUsd = convertBdtToUsd(bdtValue, bdtToUsdRate);
      nextPlans[tierIdx] = {
        ...nextPlans[tierIdx],
        price: bdtValue,
        usdPrice: bdtValue.trim() === "" ? "" : (convertedUsd || nextPlans[tierIdx].usdPrice || ""),
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

  const handleAddPlanFeature = (tierIdx: number, rawText?: string) => {
    const textToProcess = rawText !== undefined ? rawText : (tierFeatureInputs[tierIdx] || "");
    const parts = textToProcess.includes(",")
      ? textToProcess.split(",").map((s) => s.trim()).filter(Boolean)
      : [textToProcess.trim()].filter(Boolean);

    const itemsToAdd = parts.length > 0 ? parts : ["New Plan Feature"];

    setProject((prev: any) => {
      const nextPlans = [...(prev.pricingPlans || [])];
      const newItems = itemsToAdd.map((txt) => ({ text: txt, included: true }));
      nextPlans[tierIdx] = {
        ...nextPlans[tierIdx],
        features: [...(nextPlans[tierIdx]?.features || []), ...newItems],
      };
      return { ...prev, pricingPlans: nextPlans };
    });
    if (rawText === undefined) {
      setTierFeatureInputs((prev) => ({ ...prev, [tierIdx]: "" }));
    }
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

    const currentImages = Array.isArray(project.images) ? project.images : [];
    if (currentImages.length === 0 && !project.imageUrl?.trim()) {
      setErrMsg("At least one project image is mandatory (up to 5 allowed).");
      return;
    }

    const primaryCover = currentImages[0] || project.imageUrl?.trim() || "";

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
        images: currentImages.length > 0 ? currentImages : [primaryCover],
        imageUrl: primaryCover,
        image: primaryCover,
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
                      (project.images || []).length > 0
                        ? "bg-teal-500/15 text-teal-300 border-teal-500/30"
                        : "bg-amber-500/15 text-amber-300 border-amber-500/30"
                    }`}>
                      {(project.images || []).length} / 5 Images {(project.images || []).length === 0 ? "(1 Mandatory)" : ""}
                    </span>
                  </h3>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  At least 1 cover image is mandatory. Add up to 5 images for an adaptive multi-angle showcase grid on the live site.
                </p>
              </div>

              {(project.images || []).length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm("Clear all project images? At least 1 will be needed before saving.")) {
                      setProject({ ...project, images: [], imageUrl: "", image: "" });
                    }
                  }}
                  className="self-start sm:self-auto px-2.5 py-1 rounded-lg bg-white/[0.03] hover:bg-rose-500/10 border border-white/[0.08] hover:border-rose-500/30 text-gray-400 hover:text-rose-300 text-[11px] font-medium transition flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[14px]">delete</span>
                  <span>Clear All</span>
                </button>
              )}
            </div>

            {/* Empty state alert */}
            {(!project.images || project.images.length === 0) && (
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
                      disabled={(project.images || []).length >= 5}
                      className="w-full h-10 bg-black/40 border border-white/[0.08] focus:border-teal-400/70 rounded-xl pl-9 pr-3 text-xs text-white placeholder-gray-500 font-mono transition outline-none disabled:opacity-50"
                    />
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-[15px]">
                      link
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddImageUrl}
                    disabled={!imageUrlInput.trim() || (project.images || []).length >= 5}
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
                    id="edit-project-multi-files"
                    accept="image/*"
                    multiple
                    onChange={handleImageFileUpload}
                    className="hidden"
                    disabled={uploadingImage || (project.images || []).length >= 5}
                  />
                  <label
                    htmlFor="edit-project-multi-files"
                    className={`w-full h-10 rounded-xl border border-dashed flex items-center justify-center gap-2 px-4 text-xs font-semibold transition cursor-pointer ${
                      (project.images || []).length >= 5
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
                    ) : (project.images || []).length >= 5 ? (
                      <span>Maximum 5 Images Reached</span>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-teal-400 text-[17px]">
                          cloud_upload
                        </span>
                        <span>Click to Upload (Up to {5 - (project.images || []).length} remaining)</span>
                      </>
                    )}
                  </label>
                </div>
              </div>
            </div>

            {/* Gallery Image Thumbnails & Management List */}
            {(project.images || []).length > 0 && (
              <div className="pt-2">
                <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2.5">
                  Current Gallery Images ({(project.images || []).length} of 5)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  {(project.images || []).map((imgUrl: string, idx: number) => {
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
                            {idx < (project.images || []).length - 1 && (
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
                    What&apos;s Included ({(project.whatsIncluded || []).length})
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
                {(project.whatsIncluded || []).map((item: string, idx: number) => (
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
                    Not Included ({(project.notIncluded || []).length})
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
                {(project.notIncluded || []).map((item: string, idx: number) => (
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

          {/* SECTION 9: 3-TIER PRICING PLANS MANAGEMENT (With BDT Auto-Conversion & Bulk Comma) */}
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
                  Configure Individual Module, Studio License, and Enterprise Custom storefront tiers. Typing BDT automatically calculates USD.
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
                    Active: {project.category}
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
                        const isSelected = (project.category || "").toLowerCase() === cat.toLowerCase();
                        return (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => {
                              setProject({ ...project, category: cat });
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
                    Tags ({(project.tags || []).length} selected)
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
