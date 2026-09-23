import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  AvailableCurrency,
  CurrencyPricing,
  DEFAULT_CURRENCIES,
} from "@/types/currency";

const CURRENCY_DOC_REF = doc(db, "archive_config", "currencies");

export async function getAvailableCurrencies(): Promise<AvailableCurrency[]> {
  try {
    const snap = await getDoc(CURRENCY_DOC_REF);
    if (snap.exists() && Array.isArray(snap.data()?.list)) {
      return snap.data().list;
    }
  } catch (err) {
    console.error("Error fetching available currencies:", err);
  }
  return DEFAULT_CURRENCIES;
}

export async function saveAvailableCurrencies(
  currencies: AvailableCurrency[]
): Promise<void> {
  await setDoc(CURRENCY_DOC_REF, {
    list: currencies,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Extracts all currency pricing options for a project.
 * If project.pricing is stored in DB, returns that.
 * Otherwise, generates BDT and an initial USD price from legacy price/discount.
 */
export function getProjectPrices(project: {
  price?: string | number;
  discount?: string | number;
  pricing?: CurrencyPricing[];
}): CurrencyPricing[] {
  if (Array.isArray(project.pricing) && project.pricing.length > 0) {
    return project.pricing.filter(
      (p) =>
        (p.regularPrice && p.regularPrice.trim() !== "") ||
        (p.discountPrice && p.discountPrice.trim() !== "")
    );
  }

  const list: CurrencyPricing[] = [];
  if (project.price) {
    const rawBdtPrice = String(project.price).replace(/[^0-9]/g, "");
    const rawBdtDiscount = project.discount
      ? String(project.discount).replace(/[^0-9]/g, "")
      : "";

    // Primary BDT
    list.push({
      currency: "BDT",
      symbol: "৳",
      regularPrice: String(project.price),
      discountPrice: project.discount ? String(project.discount) : undefined,
    });

    // Default USD approximation (~110 BDT per USD)
    const numPrice = parseInt(rawBdtPrice, 10);
    const numDiscount = parseInt(rawBdtDiscount, 10);
    if (!isNaN(numPrice) && numPrice > 0) {
      const usdRegular = Math.max(1, Math.round(numPrice / 110));
      const usdDiscount =
        !isNaN(numDiscount) && numDiscount > 0
          ? Math.max(1, Math.round(numDiscount / 110))
          : undefined;

      list.push({
        currency: "USD",
        symbol: "$",
        regularPrice: usdRegular.toLocaleString("en-US"),
        discountPrice: usdDiscount ? usdDiscount.toLocaleString("en-US") : undefined,
      });
    }
  }

  return list;
}

// Cached exchange rate to avoid repeated API hits
let cachedRate: { rate: number; timestamp: number } | null = null;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Fetches the current live BDT to USD conversion rate.
 * Uses open.er-api.com (free, open, no key needed).
 * Falls back to 1 / 122 (~0.0082) if offline or network fails.
 */
export async function getBdtToUsdRate(): Promise<number> {
  const now = Date.now();
  if (cachedRate && now - cachedRate.timestamp < CACHE_TTL_MS) {
    return cachedRate.rate;
  }

  try {
    const res = await fetch("https://open.er-api.com/v6/latest/BDT");
    if (res.ok) {
      const data = await res.json();
      if (data?.rates?.USD && typeof data.rates.USD === "number") {
        cachedRate = { rate: data.rates.USD, timestamp: now };
        return data.rates.USD;
      }
    }
  } catch (err) {
    console.warn("Failed to fetch live BDT-to-USD exchange rate, using fallback:", err);
  }

  // Fallback rate ~ 1 USD = 122 BDT
  return 1 / 122;
}

/**
 * Converts a BDT amount string or number to USD string.
 * Rounds to standard whole dollars (or returns empty string if invalid).
 */
export function convertBdtToUsd(
  bdtAmount: number | string,
  rate?: number
): string {
  if (bdtAmount === "" || bdtAmount === undefined || bdtAmount === null) return "";
  const cleaned = String(bdtAmount).replace(/[^0-9.]/g, "");
  if (!cleaned) return "";
  const numeric = typeof bdtAmount === "number" ? bdtAmount : parseFloat(cleaned);
  if (isNaN(numeric) || numeric < 0) return "";
  if (numeric === 0) return "0";
  const effectiveRate = rate && rate > 0 ? rate : 1 / 122;
  const usdValue = Math.max(1, Math.round(numeric * effectiveRate));
  return String(usdValue);
}

