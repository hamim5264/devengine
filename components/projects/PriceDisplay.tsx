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

        // Curated, elegant cyber badge themes per currency
        const badgeTheme = isBdt
          ? "bg-[#08182b] border-[#38f2ff]/30 text-[#38f2ff]"
          : isUsd
          ? "bg-[#061d1e] border-emerald-400/30 text-emerald-400"
          : "bg-[#18112e] border-purple-400/30 text-purple-300";

        const textTheme = isBdt
          ? "text-[#38f2ff]"
          : isUsd
          ? "text-emerald-400"
          : "text-purple-300";

        const regularClean = cleanCurrencyValue(p.regularPrice);
        const discountClean = cleanCurrencyValue(p.discountPrice);

        return (
          <div
            key={p.currency}
            className={`inline-flex items-baseline gap-2 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg border shadow-md ${badgeTheme}`}
          >
            <span className="text-[10px] sm:text-[11px] font-mono font-bold uppercase tracking-wider text-gray-400">
              {p.currency}
            </span>
            <span
              className={`font-space font-bold ${
                size === "lg"
                  ? "text-xl sm:text-2xl"
                  : size === "sm"
                  ? "text-sm sm:text-base"
                  : "text-base sm:text-lg"
              } ${textTheme}`}
            >
              {discountClean || regularClean}
            </span>
            {discountClean && regularClean && (
              <span className="text-[11px] sm:text-xs font-mono line-through text-gray-400/80">
                {regularClean}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
