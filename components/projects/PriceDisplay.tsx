import React from "react";
import { CurrencyPricing } from "@/types/currency";

interface PriceDisplayProps {
  prices: CurrencyPricing[];
  align?: "left" | "right";
  size?: "sm" | "md" | "lg";
  stacked?: boolean;
}

/**
 * Cleans any embedded currency symbols or code fragments from the price string,
 * so we don't display redundant symbols like "BDT ৳ 100tk".
 */
export function cleanCurrencyValue(val?: string | number): string {
  if (!val && val !== 0) return "";
  let str = String(val).trim();
  str = str.replace(/[৳$€£₹]/g, "").trim();
  str = str.replace(/\b(tk|bdt|usd|eur|gbp)\b/gi, "").trim();
  str = str.replace(/\s+/g, " ");
  return str;
}

export default function PriceDisplay({
  prices,
  align = "left",
  size = "md",
  stacked = false,
}: PriceDisplayProps) {
  if (!prices || prices.length === 0) return null;

  return (
    <div
      className={`flex ${
        stacked ? "flex-col items-end" : "flex-wrap items-center"
      } gap-1.5 ${
        align === "right" ? "justify-end" : "justify-start"
      }`}
    >
      {prices.map((p) => {
        const isBdt = p.currency === "BDT";
        const isUsd = p.currency === "USD";

        // Curated, theme-adaptive cyber badge themes per currency
        const badgeTheme = isBdt
          ? "bg-[var(--devengine-soft)] border-[var(--devengine-border)] text-[var(--devengine-accent-text)]"
          : isUsd
          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
          : "bg-purple-500/10 border-purple-500/30 text-purple-700 dark:text-purple-300";

        const textTheme = isBdt
          ? "text-[var(--devengine-accent-text)]"
          : isUsd
          ? "text-emerald-700 dark:text-emerald-300"
          : "text-purple-700 dark:text-purple-300";

        const regularClean = cleanCurrencyValue(p.regularPrice);
        const discountClean = cleanCurrencyValue(p.discountPrice);

        return (
          <div
            key={p.currency}
            className={`inline-flex items-baseline gap-2 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl border shadow-sm transition-transform duration-200 hover:scale-[1.03] ${badgeTheme}`}
          >
            <span className="text-[11px] sm:text-xs font-mono font-extrabold uppercase tracking-wider opacity-85">
              {p.currency}
            </span>
            <span
              className={`font-space font-black tracking-tight ${
                size === "lg"
                  ? "text-2xl sm:text-3xl"
                  : size === "sm"
                  ? "text-base sm:text-lg"
                  : "text-lg sm:text-xl"
              } ${textTheme}`}
              style={{ fontFamily: 'var(--font-site, "Poppins"), sans-serif' }}
            >
              {discountClean || regularClean}
            </span>
            {discountClean && regularClean && (
              <span className="text-xs sm:text-[13px] font-mono line-through opacity-60">
                {regularClean}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
