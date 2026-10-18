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
  /** Company official contact email / gmail shown on PDFs */
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
  /** Official company phone / WhatsApp helpline (e.g. +880 1724 879284) */
  contactPhone?: string;
  /** Physical / Operational Headquarters Address */
  companyAddress?: string;
  /** Company legal/studio name displayed in invoice Column 2 (e.g. DEVENGINE SYSTEMS INC.) */
  companyLegalName?: string;
  /** Company subtitle/studio descriptor (e.g. Official Enterprise Software Studio) */
  companyStudioDescriptor?: string;
  /** Last updated timestamp */
  updatedAt?: string;
  /** Who last updated */
  updatedBy?: string;
}

/** Default fallback values (official domain devenginehq.com & portfolio thedevhamim.vercel.app) */
export const DEFAULT_PDF_BRANDING: PdfBrandingSettings = {
  companyWebsiteUrl: "https://devenginehq.com",
  companyEmail: "devenginesoftsolution@gmail.com",
  founderEmail: "hamim.leon@gmail.com",
  developerPortfolioUrl: "https://thedevhamim.vercel.app",
  clientPortalBaseUrl: "https://devenginehq.com",
  signatoryName: "MD. Abdul Hamim Leon",
  signatoryTitle: "Founder and CEO, DevEngine",
  contactPhone: "+880 1724 879284",
  companyAddress: "Banasree, Rampura, Dhaka 1219",
  companyLegalName: "DEVENGINE SYSTEMS INC.",
  companyStudioDescriptor: "Official Enterprise Software Studio",
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
        contactPhone: data.contactPhone || DEFAULT_PDF_BRANDING.contactPhone,
        companyAddress: data.companyAddress || DEFAULT_PDF_BRANDING.companyAddress,
        companyLegalName: data.companyLegalName || DEFAULT_PDF_BRANDING.companyLegalName,
        companyStudioDescriptor: data.companyStudioDescriptor || DEFAULT_PDF_BRANDING.companyStudioDescriptor,
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
      contactPhone: (settings.contactPhone || DEFAULT_PDF_BRANDING.contactPhone!).trim(),
      companyAddress: (settings.companyAddress || DEFAULT_PDF_BRANDING.companyAddress!).trim(),
      companyLegalName: (settings.companyLegalName || DEFAULT_PDF_BRANDING.companyLegalName!).trim(),
      companyStudioDescriptor: (settings.companyStudioDescriptor || DEFAULT_PDF_BRANDING.companyStudioDescriptor!).trim(),
      updatedBy,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

/**
 * Reset PDF branding settings to official factory defaults.
 */
export async function resetPdfBrandingSettings(updatedBy: string): Promise<void> {
  await savePdfBrandingSettings(DEFAULT_PDF_BRANDING, updatedBy);
}
