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
  /** Company official contact email shown on PDFs */
  companyEmail: string;
  /** Founder direct contact email shown on PDFs */
  founderEmail?: string;
  /** Developer portfolio URL shown on invoice PDF */
  developerPortfolioUrl: string;
  /** Custom portal domain/base URL for QR codes and client links (e.g. https://devenginehq.com) */
  clientPortalBaseUrl?: string;
  /** Primary signatory name on documents */
  signatoryName?: string;
  /** Primary signatory title on documents */
  signatoryTitle?: string;
  /** Last updated timestamp */
  updatedAt?: string;
  /** Who last updated */
  updatedBy?: string;
}

/** Default fallback values (using official custom domain devenginehq.com & two emails) */
export const DEFAULT_PDF_BRANDING: PdfBrandingSettings = {
  companyWebsiteUrl: "https://devenginehq.com",
  companyEmail: "devenginesoftsolution@gmail.com",
  founderEmail: "hamim.leon@gmail.com",
  developerPortfolioUrl: "https://devenginehq.com",
  clientPortalBaseUrl: "https://devenginehq.com",
  signatoryName: "MD. Abdul Hamim Leon",
  signatoryTitle: "Managing Director & CEO",
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
        founderEmail: data.founderEmail || DEFAULT_PDF_BRANDING.founderEmail,
        developerPortfolioUrl: data.developerPortfolioUrl || DEFAULT_PDF_BRANDING.developerPortfolioUrl,
        clientPortalBaseUrl: data.clientPortalBaseUrl || DEFAULT_PDF_BRANDING.clientPortalBaseUrl,
        signatoryName: data.signatoryName || DEFAULT_PDF_BRANDING.signatoryName,
        signatoryTitle: data.signatoryTitle || DEFAULT_PDF_BRANDING.signatoryTitle,
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
  settings: Partial<PdfBrandingSettings>,
  updatedBy: string
): Promise<void> {
  await setDoc(
    doc(db, "app_settings", "pdf_branding"),
    {
      companyWebsiteUrl: (settings.companyWebsiteUrl || DEFAULT_PDF_BRANDING.companyWebsiteUrl).trim(),
      companyEmail: (settings.companyEmail || DEFAULT_PDF_BRANDING.companyEmail).trim(),
      founderEmail: (settings.founderEmail || DEFAULT_PDF_BRANDING.founderEmail!).trim(),
      developerPortfolioUrl: (settings.developerPortfolioUrl || DEFAULT_PDF_BRANDING.developerPortfolioUrl).trim(),
      clientPortalBaseUrl: (settings.clientPortalBaseUrl || DEFAULT_PDF_BRANDING.clientPortalBaseUrl!).trim(),
      signatoryName: (settings.signatoryName || DEFAULT_PDF_BRANDING.signatoryName!).trim(),
      signatoryTitle: (settings.signatoryTitle || DEFAULT_PDF_BRANDING.signatoryTitle!).trim(),
      updatedBy,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}
