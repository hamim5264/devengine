// lib/services/ccPdfService.ts
// ─────────────────────────────────────────────────────────────
// DevEngine Contract Center — Document PDF Generator (jsPDF)
// Enhanced with Brand Watermark, Official Logo, QR Codes & CEO Signature
// ─────────────────────────────────────────────────────────────

import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import type {
  CCQuotation,
  CCNDA,
  CCServiceAgreement,
} from "@/types/contractCenter";
import { getPdfBrandingSettings, DEFAULT_PDF_BRANDING } from "@/lib/services/pdfSettingsService";

interface BrandPdfAssets {
  logoDarkBase64: string;
  logoLightBase64: string;
  signatureBase64: string;
}

/**
 * Fetch base64 data for DevEngine logo (dark & light) and CEO signature from API or filesystem
 */
async function getBrandPdfAssets(): Promise<BrandPdfAssets> {
  try {
    if (typeof window === "undefined") {
      const fs = await import("fs");
      const path = await import("path");
      const assetsDir = path.join(process.cwd(), "assets");
      const logoDarkPath = path.join(assetsDir, "DevEngine-logo-on-dark2.png");
      const logoLightPath = path.join(assetsDir, "DevEngine-logo-on-light1.png");
      const signaturePath = path.join(assetsDir, "founder_sign.png");

      let logoDarkBase64 = "";
      let logoLightBase64 = "";
      let signatureBase64 = "";

      if (fs.existsSync(logoDarkPath)) {
        logoDarkBase64 = `data:image/png;base64,${fs.readFileSync(logoDarkPath).toString("base64")}`;
      }
      if (fs.existsSync(logoLightPath)) {
        logoLightBase64 = `data:image/png;base64,${fs.readFileSync(logoLightPath).toString("base64")}`;
      }
      if (fs.existsSync(signaturePath)) {
        signatureBase64 = `data:image/png;base64,${fs.readFileSync(signaturePath).toString("base64")}`;
      }

      return {
        logoDarkBase64: logoDarkBase64 || logoLightBase64,
        logoLightBase64: logoLightBase64 || logoDarkBase64,
        signatureBase64,
      };
    }

    const res = await fetch("/api/receipt-assets");
    if (!res.ok) throw new Error("Assets API returned non-200");
    const data = await res.json();
    return {
      logoDarkBase64: data.logoDarkBase64 || data.logoBase64 || "",
      logoLightBase64: data.logoLightBase64 || data.logoBase64 || "",
      signatureBase64: data.signatureBase64 || "",
    };
  } catch (err) {
    console.warn("Could not fetch brand PDF assets:", err);
    return { logoDarkBase64: "", logoLightBase64: "", signatureBase64: "" };
  }
}

/**
 * Generate a high-resolution QR code DataURL
 */
async function generateQrDataUrl(url: string): Promise<string> {
  try {
    return await QRCode.toDataURL(url, {
      margin: 1,
      width: 140,
      color: {
        dark: "#0f172a",
        light: "#ffffff",
      },
      errorCorrectionLevel: "M",
    });
  } catch (err) {
    console.error("QR Code generation error:", err);
    return "";
  }
}

/**
 * Resolve client view / signing portal URL (prioritizing custom domain devenginehq.com)
 */
function getClientPortalUrl(
  documentId: string,
  type: "quotation" | "nda" | "agreement",
  branding?: any
): string {
  const domain =
    branding?.clientPortalBaseUrl?.trim() ||
    branding?.companyWebsiteUrl?.trim() ||
    "https://devenginehq.com";
  const base = domain.replace(/\/+$/, "");
  return `${base}/contract/view/${documentId}?type=${type}`;
}

/**
 * Top header banner with official DevEngine Logo
 */
function addHeader(
  doc: jsPDF,
  title: string,
  docNumber: string,
  pageNum: number,
  branding: any,
  assets: BrandPdfAssets
) {
  const pageWidth = doc.internal.pageSize.getWidth();

  // Dark brand banner top
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 26, "F");

  // Accent gradient line
  doc.setFillColor(236, 72, 153); // pink-500
  doc.rect(0, 26, pageWidth, 1.5, "F");

  // Render official DevEngine logo image if available (4:1 landscape ratio)
  let logoDrawn = false;
  const headerLogo = assets.logoDarkBase64 || assets.logoLightBase64;
  if (headerLogo) {
    try {
      doc.addImage(headerLogo, "PNG", 14, 4.5, 52, 13);
      logoDrawn = true;
    } catch (e) {
      console.warn("Could not render logo in header:", e);
    }
  }

  if (!logoDrawn) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text("DEVENGINE", 14, 14);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text("SOFTWARE & DIGITAL SOLUTIONS", 14, 20);
  }

  // Doc number right
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(244, 114, 182);
  doc.text(title.toUpperCase(), pageWidth - 14, 13, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225);
  doc.text(`REF: ${docNumber}`, pageWidth - 14, 19, { align: "right" });
}

/**
 * Subtle logo watermark rendered across background of every page
 */
function addWatermark(doc: jsPDF, assets: BrandPdfAssets) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // DevEngine Logo Watermark (subtle low-opacity logo in center of page)
  const watermarkImg = assets.logoLightBase64 || assets.logoDarkBase64;
  if (watermarkImg) {
    try {
      if (typeof (doc as any).GState === "function") {
        doc.saveGraphicsState();
        const gState = new (doc as any).GState({ opacity: 0.05 });
        doc.setGState(gState);
        const wmWidth = 120;
        const wmHeight = 30; // 4:1 aspect ratio
        doc.addImage(
          watermarkImg,
          "PNG",
          (pageWidth - wmWidth) / 2,
          (pageHeight - wmHeight) / 2 - 10,
          wmWidth,
          wmHeight
        );
        doc.restoreGraphicsState();
      }
    } catch (err) {
      // Fallback if GState is unavailable
    }
  }
}

/**
 * Footer with legal notice and page count
 */
function addFooter(doc: jsPDF, pageNum: number, totalPages: number, branding: any) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.4);
  doc.line(14, pageHeight - 16, pageWidth - 14, pageHeight - 16);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139); // slate-500
  const website = branding?.companyWebsiteUrl || DEFAULT_PDF_BRANDING.companyWebsiteUrl;
  const officialEmail = branding?.companyEmail || "devenginesoftsolution@gmail.com";
  const founderEmail = branding?.founderEmail || "hamim.leon@gmail.com";
  doc.text(
    `${website} • Official: ${officialEmail} • Founder: ${founderEmail} • Confidential & Binding`,
    14,
    pageHeight - 10
  );

  doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth - 14, pageHeight - 10, { align: "right" });
}

/**
 * Unified Execution & Verification Block
 * - Dual signature (NDA & Agreement): Two equal, spacious signature columns (Client + DevEngine CEO) + Full-width QR verification bar
 * - Single signature (Quotation): Side-by-side QR verification (left) + DevEngine CEO signature (right)
 */
function drawVerificationAndSignatureBlock(
  doc: jsPDF,
  startY: number,
  params: {
    documentRef: string;
    verificationUrl: string;
    qrDataUrl: string;
    assets: BrandPdfAssets;
    branding?: any;
    clientSignatoryName?: string;
    clientSignatoryTitle?: string;
    clientOrganization?: string;
    isDualSignature?: boolean;
  }
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const officialEmail = params.branding?.companyEmail || "devenginesoftsolution@gmail.com";
  const founderEmail = params.branding?.founderEmail || "hamim.leon@gmail.com";
  const signatoryName = params.branding?.signatoryName || "MD. Abdul Hamim Leon";
  const signatoryTitle = params.branding?.signatoryTitle || "Managing Director & CEO";

  let y = startY;

  if (params.isDualSignature) {
    // ── DUAL SIGNATURE (NDA & SERVICE AGREEMENT) ──
    const totalRequiredHeight = 84; // 52mm for signatures + 4mm gap + 28mm for verification bar
    if (y > pageHeight - totalRequiredHeight - 18) {
      doc.addPage();
      y = 36;
    }

    // Section Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text("AUTHORIZED EXECUTION & MUTUAL SIGNATURES", 14, y);
    y += 5;

    const cardWidth = (pageWidth - 28 - 6) / 2; // ~88mm each
    const cardHeight = 52;
    const clientX = 14;
    const ceoX = 14 + cardWidth + 6;

    // ── 1. CLIENT SIGNATURE CARD (LEFT) ──
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(clientX, y, cardWidth, cardHeight, 2, 2, "F");
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(clientX, y, cardWidth, cardHeight, 2, 2, "S");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text("CLIENT / COUNTERPARTY SIGNATURE", clientX + 6, y + 8);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text("Authorized Representative Execution", clientX + 6, y + 13);

    // Signature line
    const clientLineY = y + 31;
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.35);
    doc.line(clientX + 6, clientLineY, clientX + cardWidth - 6, clientLineY);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(params.clientSignatoryName || "Authorized Signatory", clientX + 6, clientLineY + 5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(params.clientSignatoryTitle || "Authorized Representative", clientX + 6, clientLineY + 9.5);
    doc.text(params.clientOrganization || "Client Organization", clientX + 6, clientLineY + 14);

    // ── 2. DEVENGINE CEO SIGNATURE CARD (RIGHT) ──
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(ceoX, y, cardWidth, cardHeight, 2, 2, "F");
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(ceoX, y, cardWidth, cardHeight, 2, 2, "S");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text("DEVENGINE AUTHORIZED SIGNATURE", ceoX + 6, y + 8);

    // Render attached CEO signature image right above the signature line
    if (params.assets.signatureBase64) {
      try {
        doc.addImage(params.assets.signatureBase64, "PNG", ceoX + 6, y + 13, 35, 14);
      } catch (e) {
        console.warn("Could not draw CEO signature:", e);
      }
    }

    const ceoLineY = y + 31;
    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.35);
    doc.line(ceoX + 6, ceoLineY, ceoX + cardWidth - 6, ceoLineY);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(signatoryName, ceoX + 6, ceoLineY + 5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`${signatoryTitle} • DevEngine`, ceoX + 6, ceoLineY + 9.5);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(16, 185, 129); // emerald-500
    doc.text("✓ Digitally Verified & Authorized", ceoX + 6, ceoLineY + 14);

    y += cardHeight + 4;

    // ── 3. FULL-WIDTH DIGITAL VERIFICATION & AUDIT BAR ──
    const barHeight = 27;
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, y, pageWidth - 28, barHeight, 2, 2, "F");
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, y, pageWidth - 28, barHeight, 2, 2, "S");

    // QR Code
    const qrSize = 21;
    if (params.qrDataUrl) {
      try {
        doc.addImage(params.qrDataUrl, "PNG", 18, y + 3, qrSize, qrSize);
      } catch (e) {
        console.warn("Could not draw QR code:", e);
      }
    }

    const qrTextX = 18 + qrSize + 5;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text("SCAN TO REVIEW, VERIFY & E-SIGN ONLINE", qrTextX, y + 7);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(
      "Scan with camera to view live document audit trail, deliverables, and verify signatures.",
      qrTextX,
      y + 11.5
    );

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(236, 72, 153); // pink-500
    doc.text(`Ref: ${params.documentRef}`, qrTextX, y + 16);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text(`  |  Official: ${officialEmail}  |  Founder: ${founderEmail}`, qrTextX + 28, y + 16);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    const truncatedUrl =
      params.verificationUrl.length > 55
        ? params.verificationUrl.substring(0, 52) + "..."
        : params.verificationUrl;
    doc.text(truncatedUrl, qrTextX, y + 21);

    return y + barHeight + 6;
  } else {
    // ── SINGLE SIGNATURE (QUOTATION) ──
    const blockHeight = 54;
    if (y > pageHeight - blockHeight - 20) {
      doc.addPage();
      y = 36;
    }

    // Section Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text("DOCUMENT VERIFICATION & AUTHORIZED EXECUTION", 14, y);
    y += 5;

    // Background Box
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, y, pageWidth - 28, blockHeight, 2, 2, "F");
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, y, pageWidth - 28, blockHeight, 2, 2, "S");

    // ── LEFT: QR CODE & DIGITAL VERIFICATION ──
    const qrSize = 25;
    if (params.qrDataUrl) {
      try {
        doc.addImage(params.qrDataUrl, "PNG", 18, y + 7, qrSize, qrSize);
      } catch (e) {
        console.warn("Could not draw QR code:", e);
      }
    }

    const qrTextX = 18 + qrSize + 4;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text("SCAN TO REVIEW & ACCEPT ONLINE", qrTextX, y + 10);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text("Scan with phone camera to view live proposal,", qrTextX, y + 15);
    doc.text("review deliverables, and execute digitally.", qrTextX, y + 19.5);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(236, 72, 153); // pink-500
    doc.text(`Ref: ${params.documentRef}`, qrTextX, y + 26);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    const truncatedUrl =
      params.verificationUrl.length > 40
        ? params.verificationUrl.substring(0, 38) + "..."
        : params.verificationUrl;
    doc.text(truncatedUrl, qrTextX, y + 31);

    // Divider
    const midX = pageWidth / 2 + 10;
    doc.setDrawColor(226, 232, 240);
    doc.line(midX - 6, y + 6, midX - 6, y + blockHeight - 6);

    // ── RIGHT: DEVENGINE CEO SIGNATURE ──
    const ceoColX = midX;
    const ceoColW = pageWidth - ceoColX - 18;

    if (params.assets.signatureBase64) {
      try {
        doc.addImage(params.assets.signatureBase64, "PNG", ceoColX + 4, y + 4, 35, 14);
      } catch (e) {
        console.warn("Could not draw CEO signature:", e);
      }
    }

    const lineY = y + 25;
    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.35);
    doc.line(ceoColX, lineY, ceoColX + ceoColW, lineY);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(signatoryName, ceoColX, lineY + 5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(signatoryTitle, ceoColX, lineY + 9.5);
    doc.text("DevEngine Technology Operations", ceoColX, lineY + 13.5);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(16, 185, 129); // emerald-500
    doc.text("✓ Digitally Verified & Authorized", ceoColX, lineY + 18.5);

    return y + blockHeight + 8;
  }
}

// ─────────────────────────────────────────────────────────────
// 1. QUOTATION PDF GENERATOR
// ─────────────────────────────────────────────────────────────
export async function generateQuotationPdf(
  quotation: CCQuotation,
  options: { download?: boolean } = { download: true }
): Promise<jsPDF> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const branding = await getPdfBrandingSettings();
  const assets = await getBrandPdfAssets();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const verificationUrl = getClientPortalUrl(quotation.id, "quotation", branding);
  const qrDataUrl = await generateQrDataUrl(verificationUrl);

  addHeader(doc, "Official Quotation", quotation.quotationNumber, 1, branding, assets);

  let y = 36;

  // Two column header: Left = Client Info, Right = Quotation Meta
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, y, pageWidth - 28, 38, 2, 2, "F");
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, y, pageWidth - 28, 38, 2, 2, "S");

  // Left Column - Client Info
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text("PREPARED FOR:", 20, y + 8);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  const clientName = quotation.clientName || quotation.clientSnapshot?.legalName || "Valued Client";
  doc.text(clientName, 20, y + 15);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  if (quotation.clientSnapshot?.organizationName) {
    doc.text(quotation.clientSnapshot.organizationName, 20, y + 20);
  }
  doc.text(`Attn: ${quotation.clientSnapshot?.primaryContactName || "Authorized Representative"}`, 20, y + 25);
  doc.text(`Email: ${quotation.clientSnapshot?.email || "N/A"}`, 20, y + 30);

  // Right Column - Meta details
  const midX = pageWidth / 2 + 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text("PROPOSAL DETAILS:", midX, y + 8);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Date of Issue: ${new Date(quotation.issueDate || quotation.createdAt).toLocaleDateString()}`, midX, y + 15);
  doc.text(`Valid Until: ${new Date(quotation.validUntilDate).toLocaleDateString()}`, midX, y + 20);
  doc.text(`Currency: ${quotation.currency}`, midX, y + 25);
  doc.text(`Status: ${quotation.status.toUpperCase()}`, midX, y + 30);

  y += 46;

  // Title / Overview
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text(quotation.title, 14, y);
  y += 6;

  const summary = quotation.scope?.executiveSummary || quotation.scope?.proposedSolution;
  if (summary) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    const splitSummary = doc.splitTextToSize(summary, pageWidth - 28);
    doc.text(splitSummary, 14, y);
    y += splitSummary.length * 4.5 + 4;
  }

  // Items Table Header
  doc.setFillColor(30, 41, 59);
  doc.rect(14, y, pageWidth - 28, 8, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text("#", 17, y + 5.5);
  doc.text("ITEM / DELIVERABLE", 26, y + 5.5);
  doc.text("QTY", pageWidth - 70, y + 5.5, { align: "right" });
  doc.text("UNIT PRICE", pageWidth - 42, y + 5.5, { align: "right" });
  doc.text("TOTAL", pageWidth - 18, y + 5.5, { align: "right" });
  y += 8;

  // Table rows
  const lineItems = quotation.lineItems || [];
  lineItems.forEach((item, index) => {
    const isEven = index % 2 === 0;
    const rowY = y;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);

    const descLines = doc.splitTextToSize(item.description || "", pageWidth - 100);
    const rowHeight = Math.max(8, descLines.length * 4 + 7);

    if (rowY + rowHeight > pageHeight - 65) {
      doc.addPage();
      addHeader(doc, "Official Quotation (Cont.)", quotation.quotationNumber, doc.getNumberOfPages(), branding, assets);
      y = 36;
      return;
    }

    if (!isEven) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, rowY, pageWidth - 28, rowHeight, "F");
    }

    doc.setDrawColor(241, 245, 249);
    doc.line(14, rowY + rowHeight, pageWidth - 14, rowY + rowHeight);

    doc.setFont("helvetica", "bold");
    doc.text(`${index + 1}`, 17, rowY + 5);
    doc.text(item.name, 26, rowY + 5);

    if (item.description) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(descLines, 26, rowY + 9);
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`${item.quantity} ${item.unit || "unit"}`, pageWidth - 70, rowY + 5, { align: "right" });
    doc.text(`${item.unitPrice.toLocaleString()} ${quotation.currency}`, pageWidth - 42, rowY + 5, { align: "right" });

    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(`${item.lineTotal.toLocaleString()} ${quotation.currency}`, pageWidth - 18, rowY + 5, { align: "right" });

    y += rowHeight;
  });

  y += 4;

  // Totals Box
  if (y > pageHeight - 75) {
    doc.addPage();
    addHeader(doc, "Official Quotation (Cont.)", quotation.quotationNumber, doc.getNumberOfPages(), branding, assets);
    y = 36;
  }

  const totalsBoxX = pageWidth - 90;
  doc.setFillColor(248, 250, 252);
  doc.rect(totalsBoxX, y, 76, 28, "F");
  doc.setDrawColor(226, 232, 240);
  doc.rect(totalsBoxX, y, 76, 28, "S");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text("Subtotal:", totalsBoxX + 6, y + 7);
  doc.text(`${quotation.subtotal.toLocaleString()} ${quotation.currency}`, pageWidth - 18, y + 7, { align: "right" });

  if (quotation.totalDiscount > 0) {
    const discountLabel = quotation.discountPercent ? `Discount (${quotation.discountPercent}%):` : "Discount:";
    doc.text(discountLabel, totalsBoxX + 6, y + 13);
    doc.text(`-${quotation.totalDiscount.toLocaleString()} ${quotation.currency}`, pageWidth - 18, y + 13, { align: "right" });
  }

  if (quotation.totalTax > 0) {
    doc.text("Tax:", totalsBoxX + 6, y + 18);
    doc.text(`+${quotation.totalTax.toLocaleString()} ${quotation.currency}`, pageWidth - 18, y + 18, { align: "right" });
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text("Grand Total:", totalsBoxX + 6, y + 24);
  doc.setTextColor(236, 72, 153); // pink-500
  doc.text(`${quotation.grandTotal.toLocaleString()} ${quotation.currency}`, pageWidth - 18, y + 24, { align: "right" });

  y += 34;

  // Payment Milestones schedule if available
  const paymentSchedule = quotation.paymentSchedule || [];
  if (paymentSchedule.length > 0) {
    if (y > pageHeight - 65) {
      doc.addPage();
      addHeader(doc, "Official Quotation (Cont.)", quotation.quotationNumber, doc.getNumberOfPages(), branding, assets);
      y = 36;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text("PAYMENT MILESTONE SCHEDULE", 14, y);
    y += 5;

    paymentSchedule.forEach((m, idx) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text(`• Milestone ${idx + 1}: ${m.description} (${m.percentage || 0}%)`, 18, y);
      doc.setFont("helvetica", "bold");
      doc.text(`${(m.amount || 0).toLocaleString()} ${quotation.currency}`, pageWidth - 18, y, { align: "right" });
      y += 5.5;
    });
    y += 4;
  }

  // Terms & Conditions
  if (y > pageHeight - 75) {
    doc.addPage();
    addHeader(doc, "Official Quotation (Cont.)", quotation.quotationNumber, doc.getNumberOfPages(), branding, assets);
    y = 36;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text("TERMS & ACCEPTANCE CONDITIONS:", 14, y);
  y += 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  const termsText =
    quotation.terms?.additionalConditions ||
    "Payment is due according to the agreed milestone schedule. All project assets and intellectual property will be transferred upon full payment. This quotation is valid for 30 days from the issue date.";
  const splitTerms = doc.splitTextToSize(termsText, pageWidth - 28);
  doc.text(splitTerms, 14, y);
  y += splitTerms.length * 4.2 + 6;

  // Draw QR Code & CEO Signature Execution Block
  drawVerificationAndSignatureBlock(doc, y, {
    documentRef: quotation.quotationNumber,
    verificationUrl,
    qrDataUrl,
    assets,
    branding,
    isDualSignature: false,
  });

  // Add watermarks, headers & footers to ALL pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addWatermark(doc, assets);
    addFooter(doc, i, totalPages, branding);
  }

  if (options.download) {
    doc.save(`${quotation.quotationNumber}.pdf`);
  }
  return doc;
}

// ─────────────────────────────────────────────────────────────
// 2. NDA PDF GENERATOR
// ─────────────────────────────────────────────────────────────
export async function generateNDAPdf(
  nda: CCNDA,
  options: { download?: boolean } = { download: true }
): Promise<jsPDF> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const branding = await getPdfBrandingSettings();
  const assets = await getBrandPdfAssets();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const verificationUrl = getClientPortalUrl(nda.id, "nda", branding);
  const qrDataUrl = await generateQrDataUrl(verificationUrl);

  addHeader(doc, "Non-Disclosure Agreement", nda.ndaNumber, 1, branding, assets);

  let y = 38;

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text(nda.isMutual ? "MUTUAL NON-DISCLOSURE AGREEMENT" : "ONE-WAY NON-DISCLOSURE AGREEMENT", 14, y);
  y += 7;

  // Introductory clause
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  const intro = `This Non-Disclosure Agreement ("Agreement") is entered into on ${new Date(nda.effectiveDate).toLocaleDateString()}, by and between:`;
  doc.text(intro, 14, y);
  y += 7;

  // Parties Box
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, y, pageWidth - 28, 35, 2, 2, "F");
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, y, pageWidth - 28, 35, 2, 2, "S");

  const officialEmail = branding?.companyEmail || "devenginesoftsolution@gmail.com";
  const founderEmail = branding?.founderEmail || "hamim.leon@gmail.com";

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text("PARTY 1: DEVENGINE", 20, y + 8);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text("DevEngine Technology Operations", 20, y + 14);
  doc.text(`Official: ${officialEmail}`, 20, y + 19);
  doc.text(`Founder: ${founderEmail}`, 20, y + 24);
  doc.text("Signatory: MD. Abdul Hamim Leon (CEO)", 20, y + 29);

  const midX = pageWidth / 2 + 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text("PARTY 2: COUNTERPARTY", midX, y + 8);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(nda.receivingPartyName, midX, y + 14);
  doc.text(`Representative: ${nda.receivingPartyRep || "Authorized Signatory"}`, midX, y + 19);
  if (nda.receivingPartyEmail) {
    doc.text(`Email: ${nda.receivingPartyEmail}`, midX, y + 24);
  }

  y += 43;

  // Standard clauses
  const clauses = [
    {
      title: "1. PURPOSE OF DISCLOSURE",
      body: nda.purpose || "The parties wish to explore a potential business engagement and develop technical collaboration, requiring the exchange of proprietary information.",
    },
    {
      title: "2. DEFINITION OF CONFIDENTIAL INFORMATION",
      body: "Confidential Information includes, without limitation, source code, software architecture, technical schematics, business roadmaps, trade secrets, financial models, customer data, and all proprietary materials disclosed directly or indirectly in oral, visual, or written form.",
    },
    {
      title: "3. OBLIGATIONS OF RECEIVING PARTY",
      body: "The receiving party agrees to hold all Confidential Information in strict confidence and use at least the same degree of care as it uses for its own confidential information, but in no case less than reasonable care. It shall not disclose information to any third party without prior written consent.",
    },
    {
      title: "4. DURATION & TERM",
      body: `This Agreement shall remain in effect for ${nda.termMonths || 24} months from the Effective Date. The confidentiality obligations regarding trade secrets and source code shall survive termination indefinitely.`,
    },
    {
      title: "5. GOVERNING LAW & DISPUTE RESOLUTION",
      body: `This Agreement shall be governed by and construed in accordance with the laws of ${nda.governingLaw || "Bangladesh"}. Any disputes shall be resolved through ${nda.disputeResolution || "arbitration in Dhaka, Bangladesh under the Arbitration Act, 2001"}.`,
    },
  ];

  clauses.forEach((cl) => {
    if (y > pageHeight - 55) {
      doc.addPage();
      addHeader(doc, "Non-Disclosure Agreement (Cont.)", nda.ndaNumber, doc.getNumberOfPages(), branding, assets);
      y = 36;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(cl.title, 14, y);
    y += 5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    const splitBody = doc.splitTextToSize(cl.body, pageWidth - 28);
    doc.text(splitBody, 14, y);
    y += splitBody.length * 4.2 + 5;
  });

  // Dual Execution & Verification Block (QR on left, CEO signature on right)
  drawVerificationAndSignatureBlock(doc, y + 4, {
    documentRef: nda.ndaNumber,
    verificationUrl,
    qrDataUrl,
    assets,
    branding,
    clientSignatoryName: nda.receivingPartyRep || nda.receivingPartyName,
    clientSignatoryTitle: "Authorized Signatory",
    clientOrganization: nda.receivingPartyName,
    isDualSignature: true,
  });

  // Add watermarks & footers to ALL pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addWatermark(doc, assets);
    addFooter(doc, i, totalPages, branding);
  }

  if (options.download) {
    doc.save(`${nda.ndaNumber}.pdf`);
  }
  return doc;
}

// ─────────────────────────────────────────────────────────────
// 3. SERVICE AGREEMENT PDF GENERATOR
// ─────────────────────────────────────────────────────────────
export async function generateServiceAgreementPdf(
  agreement: CCServiceAgreement,
  options: { download?: boolean } = { download: true }
): Promise<jsPDF> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const branding = await getPdfBrandingSettings();
  const assets = await getBrandPdfAssets();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const verificationUrl = getClientPortalUrl(agreement.id, "agreement", branding);
  const qrDataUrl = await generateQrDataUrl(verificationUrl);

  addHeader(doc, "Master Service Agreement", agreement.agreementNumber, 1, branding, assets);

  let y = 38;

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text(agreement.title.toUpperCase(), 14, y);
  y += 7;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(`Effective Date: ${new Date(agreement.effectiveDate).toLocaleDateString()}`, 14, y);
  y += 8;

  // Parties Box
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, y, pageWidth - 28, 35, 2, 2, "F");
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, y, pageWidth - 28, 35, 2, 2, "S");

  const officialEmailAgr = branding?.companyEmail || "devenginesoftsolution@gmail.com";
  const founderEmailAgr = branding?.founderEmail || "hamim.leon@gmail.com";

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text("SERVICE PROVIDER: DEVENGINE", 20, y + 8);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text("DevEngine Technology Operations", 20, y + 14);
  doc.text(`Official: ${officialEmailAgr}`, 20, y + 19);
  doc.text(`Founder: ${founderEmailAgr}`, 20, y + 24);
  doc.text("Signatory: MD. Abdul Hamim Leon (CEO)", 20, y + 29);

  const midX = pageWidth / 2 + 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  const clientName = agreement.clientName || agreement.clientSnapshot?.legalName || "Client";
  doc.text(`CLIENT: ${clientName.toUpperCase()}`, midX, y + 8);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(agreement.clientSnapshot?.organizationName || "Client Organization", midX, y + 14);
  doc.text(`Representative: ${agreement.clientSnapshot?.authorizedSignatoryName || agreement.clientSnapshot?.primaryContactName || "Authorized Signatory"}`, midX, y + 19);
  doc.text(`Email: ${agreement.clientSnapshot?.email || "N/A"}`, midX, y + 24);

  y += 43;

  // Financial summary
  const hasAgrDiscount = Boolean(agreement.hasDiscount && agreement.discountPercent && agreement.originalValue && agreement.originalValue > (agreement.totalValue || 0));
  if (hasAgrDiscount) {
    const origVal = agreement.originalValue || 0;
    const discAmount = origVal - (agreement.totalValue || 0);
    doc.setFillColor(243, 244, 246);
    doc.roundedRect(14, y, pageWidth - 28, 24, 1.5, 1.5, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text("Standard Value:", 20, y + 6.5);
    doc.text(`${origVal.toLocaleString()} ${agreement.currency}`, pageWidth - 20, y + 6.5, { align: "right" });
    doc.text(`Special Discount (${agreement.discountPercent}%):`, 20, y + 12);
    doc.text(`-${discAmount.toLocaleString()} ${agreement.currency}`, pageWidth - 20, y + 12, { align: "right" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text("NET TOTAL ENGAGEMENT VALUE:", 20, y + 18.5);
    doc.setFontSize(11);
    doc.setTextColor(236, 72, 153); // pink-500
    doc.text(`${(agreement.totalValue || 0).toLocaleString()} ${agreement.currency}`, pageWidth - 20, y + 18.5, { align: "right" });
    y += 30;
  } else {
    doc.setFillColor(243, 244, 246);
    doc.roundedRect(14, y, pageWidth - 28, 14, 1.5, 1.5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text("TOTAL ENGAGEMENT VALUE:", 20, y + 9);
    doc.setFontSize(11);
    doc.setTextColor(236, 72, 153); // pink-500
    doc.text(`${(agreement.totalValue || 0).toLocaleString()} ${agreement.currency}`, pageWidth - 20, y + 9, { align: "right" });
    y += 20;
  }

  // Standard MSA clauses
  const msaClauses = [
    {
      title: "1. SCOPE OF SERVICES",
      body: agreement.clauses?.scopeOfWork || "DevEngine shall perform software architecture, development, deployment, and digital engineering services as detailed in the applicable Statements of Work (SOWs) and quotations.",
    },
    {
      title: "2. INTELLECTUAL PROPERTY RIGHTS",
      body: agreement.clauses?.ipDetails || "Upon full payment of all contracted fees, DevEngine transfers all rights, title, and ownership in customized deliverables to the Client. DevEngine retains ownership of its pre-existing libraries, developer tooling, and proprietary frameworks.",
    },
    {
      title: "3. WARRANTIES & ACCEPTANCE",
      body: agreement.clauses?.warrantiesAndSupport || "DevEngine warrants that deliverables conform to the agreed technical specifications for a period of 90 days following commercial deployment.",
    },
    {
      title: "4. LIMITATION OF LIABILITY",
      body: agreement.clauses?.limitationOfLiability || "Neither party shall be liable for indirect, incidental, or consequential damages. The total aggregate liability under this Agreement shall not exceed the total fees paid by Client hereunder.",
    },
    {
      title: "5. GOVERNING LAW & JURISDICTION",
      body: `This Agreement is governed by the laws of ${agreement.clauses?.governingLaw || "Bangladesh"}, and disputes shall be subject to arbitration in Dhaka under the Arbitration Act, 2001.`,
    },
  ];

  msaClauses.forEach((cl) => {
    if (y > pageHeight - 55) {
      doc.addPage();
      addHeader(doc, "Master Service Agreement (Cont.)", agreement.agreementNumber, doc.getNumberOfPages(), branding, assets);
      y = 36;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(cl.title, 14, y);
    y += 5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    const splitBody = doc.splitTextToSize(cl.body, pageWidth - 28);
    doc.text(splitBody, 14, y);
    y += splitBody.length * 4.2 + 5;
  });

  // Dual Execution & Verification Block (QR on left, CEO signature on right)
  drawVerificationAndSignatureBlock(doc, y + 4, {
    documentRef: agreement.agreementNumber,
    verificationUrl,
    qrDataUrl,
    assets,
    branding,
    clientSignatoryName: agreement.clientSnapshot?.authorizedSignatoryName || agreement.clientName || "Client Signatory",
    clientSignatoryTitle: agreement.clientSnapshot?.authorizedSignatoryTitle || "Authorized Signatory",
    clientOrganization: agreement.clientSnapshot?.organizationName || agreement.clientName,
    isDualSignature: true,
  });

  // Add watermarks & footers to ALL pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addWatermark(doc, assets);
    addFooter(doc, i, totalPages, branding);
  }

  if (options.download) {
    doc.save(`${agreement.agreementNumber}.pdf`);
  }
  return doc;
}
