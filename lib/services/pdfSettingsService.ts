import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

/** The Firestore document path for PDF settings */
const PDF_SETTINGS_DOC = "app_settings/pdf_branding";

export interface PdfBrandingSettings {
  /** Primary company website URL shown on PDFs (agreement + invoice) */
  companyWebsiteUrl: string;
  /** Company contact email shown on PDFs */
  companyEmail: string;
  /** Developer portfolio URL shown on invoice PDF */
  developerPortfolioUrl: string;
  /** Last updated timestamp */
  updatedAt?: string;
  /** Who last updated */
  updatedBy?: string;
}

/** Default fallback values (matches current hardcoded values) */
export const DEFAULT_PDF_BRANDING: PdfBrandingSettings = {
  companyWebsiteUrl: "https://thedevengine.vercel.app",
  companyEmail: "hamim.leon@gmail.com",
  developerPortfolioUrl: "https://thedevhamim.vercel.app/",
};

/**
 * Fetch PDF branding settings from Firestore.
 * Falls back to DEFAULT_PDF_BRANDING if the document doesn't exist.
 */
export async function getPdfBrandingSettings(): Promise<PdfBrandingSettings> {
  try {
    const snap = await getDoc(doc(db, "app_settings", "pdf_branding"));
    if (snap.exists()) {
      const data = snap.data();
      return {
        companyWebsiteUrl: data.companyWebsiteUrl || DEFAULT_PDF_BRANDING.companyWebsiteUrl,
        companyEmail: data.companyEmail || DEFAULT_PDF_BRANDING.companyEmail,
        developerPortfolioUrl: data.developerPortfolioUrl || DEFAULT_PDF_BRANDING.developerPortfolioUrl,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString?.() || data.updatedAt || "",
        updatedBy: data.updatedBy || "",
      };
    }
    return { ...DEFAULT_PDF_BRANDING };
  } catch (err) {
    console.warn("Failed to fetch PDF branding settings, using defaults:", err);
    return { ...DEFAULT_PDF_BRANDING };
  }
}

/**
 * Save PDF branding settings to Firestore.
 */
export async function savePdfBrandingSettings(
  settings: Pick<PdfBrandingSettings, "companyWebsiteUrl" | "companyEmail" | "developerPortfolioUrl">,
  updatedBy: string
): Promise<void> {
  await setDoc(doc(db, "app_settings", "pdf_branding"), {
    companyWebsiteUrl: settings.companyWebsiteUrl.trim(),
    companyEmail: settings.companyEmail.trim(),
    developerPortfolioUrl: settings.developerPortfolioUrl.trim(),
    updatedBy,
    updatedAt: serverTimestamp(),
  });
}
