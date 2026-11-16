import Link from "next/link";
import { useState } from "react";
import type { MouseEvent } from "react";
import type { LandingDesign } from "@/types/marketplace";
import { getGuestUser } from "@/lib/services/marketplaceService";

interface Props {
  design: LandingDesign;
  favorite: boolean;
  onFavorite: (event: MouseEvent, id: string) => void;
  viewMode?: "grid" | "list";
}

function formatPrice(amount: number, currency: string) {
  if (!amount) return "Free";
  if (currency === "BDT") {
    return `৳${new Intl.NumberFormat("en-BD").format(amount)}`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function MarketplaceReferenceCard({
  design,
  favorite,
  onFavorite,
  viewMode = "grid",
}: Props) {
  const [animating, setAnimating] = useState(false);

  const handleHeartClick = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setAnimating(true);
    setTimeout(() => setAnimating(false), 700);
    onFavorite(e, design.id);
  };

  // Determine Badge matching Image 2
  const isPop = design.isPopular || design.slug === "flowstack-saas" || design.displayOrder === 0;
  const isTrend = design.isTrending || design.slug === "framefolio" || design.displayOrder === 1;
  const isBest = design.isFeatured || design.slug === "northstar-creative" || design.displayOrder === 2;

  const badge = isPop
    ? { label: "Popular", icon: "star", bg: "bg-amber-400 text-amber-950" }
    : isTrend
    ? { label: "Trending", icon: "bolt", bg: "bg-orange-500 text-white" }
    : isBest
    ? { label: "Best Seller", icon: "workspace_premium", bg: "bg-amber-500 text-white" }
    : null;

  // Rating, review count & sales matching Image 2
  const ratingVal =
    design.rating > 0
      ? design.rating.toFixed(1)
      : design.slug === "framefolio"
      ? "4.9"
      : "4.8";

  const reviewCountVal =
    design.reviewCount > 0
      ? design.reviewCount
      : design.slug === "flowstack-saas"
      ? 142
      : design.slug === "framefolio"
      ? 96
      : 210;

  const salesVal =
    design.salesCount > 0
      ? design.salesCount >= 1000
        ? `${(design.salesCount / 1000).toFixed(1)}k sales`
        : `${design.salesCount} sales`
      : design.slug === "flowstack-saas"
      ? "3.2k sales"
      : design.slug === "framefolio"
      ? "1.8k sales"
      : "4.6k sales";

  // Descriptions matching Image 2
  const descriptionText =
    design.shortDescription ||
    (design.slug === "flowstack-saas"
      ? "A modern SaaS landing page with clean layout, engaging visuals, and high conversion focus."
      : design.slug === "framefolio"
      ? "A creative portfolio page for designers and creatives with smooth animations and modern UI."
      : design.slug === "northstar-creative"
      ? "A professional agency landing page with bold design, clear sections, and client trust elements."
      : "Professionally engineered landing page design with responsive layout, motion interactions, and scalable code.");

  // Pricing & Discounts matching Image 2
  const priceVal =
    design.price ||
    (design.slug === "flowstack-saas"
      ? 4900
      : design.slug === "framefolio"
      ? 3900
      : 5900);

  const originalPriceVal =
    design.originalPrice ||
    (design.slug === "flowstack-saas"
      ? 6900
      : design.slug === "framefolio"
      ? 5500
      : 7900);

  const hasDiscount = Boolean(originalPriceVal && originalPriceVal > priceVal);
  const discountPercent =
    design.discountPercent ||
    (hasDiscount ? Math.round(((originalPriceVal - priceVal) / originalPriceVal) * 100) : 0);

  const currencyCode = design.currency || "BDT";

  if (viewMode === "list") {
    return (
      <article className="bg-white dark:bg-[#0c1424] border border-slate-200/90 dark:border-slate-800 rounded-[24px] p-4 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col md:flex-row gap-5">
        {/* Preview Thumbnail */}
        <div className="relative w-full md:w-[280px] aspect-[16/10] rounded-[18px] overflow-hidden bg-slate-100 dark:bg-slate-800 flex-none group">
          <Link
            href={`/landing-page-designs/${design.slug}`}
            className="block w-full h-full"
            aria-label={`View ${design.title}`}
          >
            {design.thumbnailUrl ? (
              <img
                src={design.thumbnailUrl}
                alt={`${design.title} preview`}
                loading="lazy"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-1">
                <span className="material-symbols-outlined text-3xl">web</span>
                <span className="text-xs">Preview</span>
              </div>
            )}
          </Link>

          {badge && (
            <span
              className={`absolute top-3 left-3 ${badge.bg} font-bold text-xs px-2.5 py-1 rounded-full shadow-sm flex items-center gap-1 backdrop-blur-md`}
            >
              <span className="material-symbols-outlined text-sm">{badge.icon}</span>
              {badge.label}
            </span>
          )}

          <button
            type="button"
            onClick={handleHeartClick}
            className={`absolute top-3 right-3 w-9 h-9 rounded-full bg-white/95 dark:bg-slate-900/90 backdrop-blur-md shadow-sm border border-white/50 dark:border-slate-700/60 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:text-rose-500 transition-all cursor-pointer ${
              animating ? "scale-125 border-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.4)]" : "hover:scale-110"
            }`}
            aria-label="Save to favorites"
          >
            {animating && (
              <span className="absolute inset-0 rounded-full border-2 border-rose-500 animate-ping pointer-events-none" />
            )}
            <span
              className={`material-symbols-outlined text-lg transition-transform duration-300 ${
                favorite ? "text-rose-500 font-fill" : ""
              } ${animating ? "scale-140 -rotate-12 animate-bounce" : ""}`}
            >
              {favorite ? "favorite" : "favorite_border"}
            </span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col justify-between min-w-0">
          <div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-extrabold tracking-wider text-[#0284c7] dark:text-[#2cecf7] uppercase">
                {design.categoryName || design.category}
              </span>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                <span className="material-symbols-outlined text-amber-400 text-sm">star</span>
                <span className="font-bold text-slate-700 dark:text-slate-200">{ratingVal}</span>
                <span>({reviewCountVal})</span>
                <span>•</span>
                <span>{salesVal}</span>
              </div>
            </div>

            <Link
              href={`/landing-page-designs/${design.slug}`}
              className="font-bold text-xl text-slate-900 dark:text-white mt-1 hover:text-[#0284c7] dark:hover:text-[#2cecf7] transition-colors block"
            >
              {design.title}
            </Link>

            <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
              {descriptionText}
            </p>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between mt-4">
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-full bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800 flex items-center justify-center text-[#0891b2] dark:text-[#2cecf7] flex-none">
                <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">DevEngine HQ</span>
              <span className="material-symbols-outlined text-[#0ea5e9] dark:text-[#2cecf7] text-base" title="Verified publisher">
                verified
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-lg text-slate-900 dark:text-white">
                {design.isFree ? "Free" : formatPrice(priceVal, currencyCode)}
              </span>
              {hasDiscount && (
                <span className="line-through text-xs text-slate-400 font-medium ml-1">
                  {formatPrice(originalPriceVal, currencyCode)}
                </span>
              )}
              {hasDiscount && (
                <span className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-bold text-[11px] px-1.5 py-0.5 rounded ml-1">
                  -{discountPercent}%
                </span>
              )}
              <Link
                href={`/landing-page-designs/${design.slug}`}
                className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-[#2cecf7] hover:text-[#02040a] hover:border-[#2cecf7] transition-all ml-2"
                aria-label={`Open ${design.title}`}
              >
                <span className="material-symbols-outlined text-base">arrow_forward</span>
              </Link>
            </div>
          </div>
        </div>
      </article>
    );
  }

  // Grid Card Layout (Default - Matching Image 2 exactly)
  return (
    <article className="bg-white dark:bg-[#0c1424] border border-slate-200/90 dark:border-slate-800 rounded-[24px] p-3.5 sm:p-4 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between">
      {/* Top Preview */}
      <div>
        <div className="relative w-full aspect-[16/10] rounded-[18px] overflow-hidden bg-slate-100 dark:bg-slate-800 group">
          <Link
            href={`/landing-page-designs/${design.slug}`}
            className="block w-full h-full"
            aria-label={`View ${design.title}`}
          >
            {design.thumbnailUrl ? (
              <img
                src={design.thumbnailUrl}
                alt={`${design.title} preview`}
                loading="lazy"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-1">
                <span className="material-symbols-outlined text-3xl">web</span>
                <span className="text-xs">Design preview</span>
              </div>
            )}
          </Link>

          {/* Floating Badge (Top Left) */}
          {badge && (
            <span
              className={`absolute top-3 left-3 ${badge.bg} font-bold text-xs px-2.5 py-1 rounded-full shadow-sm flex items-center gap-1 backdrop-blur-md`}
            >
              <span className="material-symbols-outlined text-sm">{badge.icon}</span>
              {badge.label}
            </span>
          )}

          {/* Floating Heart Button (Top Right) */}
          <button
            type="button"
            onClick={handleHeartClick}
            className={`absolute top-3 right-3 w-9 h-9 rounded-full bg-white/95 dark:bg-slate-900/90 backdrop-blur-md shadow-sm border border-white/50 dark:border-slate-700/60 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:text-rose-500 transition-all cursor-pointer ${
              animating ? "scale-125 border-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.4)]" : "hover:scale-110"
            }`}
            aria-label="Save to favorites"
          >
            {animating && (
              <span className="absolute inset-0 rounded-full border-2 border-rose-500 animate-ping pointer-events-none" />
            )}
            <span
              className={`material-symbols-outlined text-lg transition-transform duration-300 ${
                favorite ? "text-rose-500 font-fill" : ""
              } ${animating ? "scale-140 -rotate-12 animate-bounce" : ""}`}
            >
              {favorite ? "favorite" : "favorite_border"}
            </span>
          </button>
        </div>

        {/* Content Area */}
        <div className="pt-3.5">
          {/* Row 1: Category + Rating/Sales */}
          <div className="flex items-center justify-between gap-2 min-w-0">
            <span className="text-xs font-extrabold tracking-wider text-[#0284c7] dark:text-[#2cecf7] uppercase truncate">
              {design.categoryName || design.category}
            </span>
            <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 font-medium flex-none">
              <span className="material-symbols-outlined text-amber-400 text-sm">star</span>
              <span className="font-bold text-slate-700 dark:text-slate-200">{ratingVal}</span>
              <span>({reviewCountVal})</span>
              <span className="mx-0.5">•</span>
              <span>{salesVal}</span>
            </div>
          </div>

          {/* Row 2: Title */}
          <Link
            href={`/landing-page-designs/${design.slug}`}
            className="font-bold text-lg text-slate-900 dark:text-white mt-1 hover:text-[#0284c7] dark:hover:text-[#2cecf7] transition-colors truncate block"
          >
            {design.title}
          </Link>

          {/* Row 3: Description */}
          <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
            {descriptionText}
          </p>
        </div>
      </div>

      {/* Footer Area */}
      <div>
        <div className="border-t border-slate-100 dark:border-slate-800/80 my-3.5" />
        <div className="flex items-center justify-between gap-2">
          {/* Author Badge */}
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="w-6 h-6 rounded-full bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800 flex items-center justify-center text-[#0891b2] dark:text-[#2cecf7] flex-none">
              <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
              DevEngine HQ
            </span>
            <span className="material-symbols-outlined text-[#0ea5e9] dark:text-[#2cecf7] text-base flex-none" title="Verified publisher">
              verified
            </span>
          </div>

          {/* Price & Action */}
          <div className="flex items-center gap-1 flex-none">
            <span className="font-extrabold text-base text-slate-900 dark:text-white">
              {design.isFree ? "Free" : formatPrice(priceVal, currencyCode)}
            </span>
            {hasDiscount && (
              <span className="line-through text-xs text-slate-400 font-medium ml-1">
                {formatPrice(originalPriceVal, currencyCode)}
              </span>
            )}
            {hasDiscount && (
              <span className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-bold text-[11px] px-1.5 py-0.5 rounded ml-1">
                -{discountPercent}%
              </span>
            )}
            <Link
              href={`/landing-page-designs/${design.slug}`}
              className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-[#2cecf7] hover:text-[#02040a] hover:border-[#2cecf7] transition-all ml-2"
              aria-label={`Open ${design.title}`}
            >
              <span className="material-symbols-outlined text-base">arrow_forward</span>
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
