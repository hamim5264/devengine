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
