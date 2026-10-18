import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import { OrderRecord } from "@/types/order";
import { getPdfBrandingSettings, DEFAULT_PDF_BRANDING } from "@/lib/services/pdfSettingsService";

/**
 * Fetch base64 data for DevEngine logo and Founder signature from API
 */
async function getReceiptAssets(): Promise<{
  logoBase64: string;
  logoDarkBase64?: string;
  logoLightBase64?: string;
  signatureBase64: string;
}> {
  try {
    const res = await fetch("/api/receipt-assets");
    if (!res.ok) throw new Error("Assets API returned non-200");
    const data = await res.json();
    return {
      logoBase64: data.logoBase64 || "",
      logoDarkBase64: data.logoDarkBase64 || "",
      logoLightBase64: data.logoLightBase64 || "",
      signatureBase64: data.signatureBase64 || "",
    };
  } catch (err) {
    console.warn("Could not fetch receipt assets from API, falling back:", err);
    return { logoBase64: "", logoDarkBase64: "", logoLightBase64: "", signatureBase64: "" };
  }
}

/**
 * Generate a QR code base64 Data URL containing the tracking message
 */
async function generateQrCode(text: string): Promise<string> {
  try {
    return await QRCode.toDataURL(text, {
      margin: 1,
      width: 140,
      color: {
        dark: "#0f172a",
        light: "#ffffff",
      },
      errorCorrectionLevel: "M",
    });
  } catch (err) {
    console.error("QR Code generation failed:", err);
    return "";
  }
}

export async function generatePdfInvoice(order: OrderRecord): Promise<void> {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  const margin = 16;
  const contentWidth = pageWidth - margin * 2; // 178mm

  // Fetch brand assets and PDF branding settings
  const [assets, branding] = await Promise.all([
    getReceiptAssets(),
    getPdfBrandingSettings().catch(() => ({ ...DEFAULT_PDF_BRANDING })),
  ]);

  const rawCompanyWebsite = (branding?.companyWebsiteUrl || DEFAULT_PDF_BRANDING.companyWebsiteUrl || "https://devenginehq.com").trim();
  const rawDeveloperPortfolio = (branding?.developerPortfolioUrl || DEFAULT_PDF_BRANDING.developerPortfolioUrl || "https://thedevhamim.vercel.app").trim();
  const companyEmail = (branding?.companyEmail || DEFAULT_PDF_BRANDING.companyEmail || "devenginesoftsolution@gmail.com").trim();
  const contactPhone = (branding?.contactPhone || DEFAULT_PDF_BRANDING.contactPhone || "+880 1724 879284").trim();
  const companyAddress = (branding?.companyAddress || DEFAULT_PDF_BRANDING.companyAddress || "Banasree, Rampura, Dhaka 1219").trim();
  const companyLegalName = (branding?.companyLegalName || DEFAULT_PDF_BRANDING.companyLegalName || "DEVENGINE SYSTEMS INC.").trim();
  const signatoryName = (branding?.signatoryName || DEFAULT_PDF_BRANDING.signatoryName || "MD. ABDUL HAMIM LEON").toUpperCase();
  const signatoryTitle = (branding?.signatoryTitle || DEFAULT_PDF_BRANDING.signatoryTitle || "Managing Director & CEO").trim();
  const clientPortalBaseUrl = (branding?.clientPortalBaseUrl || DEFAULT_PDF_BRANDING.clientPortalBaseUrl || "https://devenginehq.com").trim();

  // Display URLs
  const displayWebsite = rawCompanyWebsite.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const displayPortfolio = rawDeveloperPortfolio.replace(/^https?:\/\//, "").replace(/\/$/, "");

  // Scanner message with official verification domain
  const qrMessage = `Your tracking code of DevEngine: ${order.id}\nVerify online: ${clientPortalBaseUrl}`;
  const qrDataUrl = await generateQrCode(qrMessage);

  // Currency & Amount
  const currency = order.currency?.toUpperCase() === "USD" ? "$" : "BDT ";
  const numAmount = Number(String(order.amount).replace(/[^0-9.]/g, ""));
  const displayAmount = !isNaN(numAmount) && numAmount > 0 ? numAmount.toLocaleString() : order.amount;

  // Formatted Date
  const formattedDate = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  // ==========================================
  // 1. TOP HEADER SECTION (TWO COLUMNS)
  // ==========================================
  const topY = 16;
  const brandCardW = 98;
  const brandCardH = 58;

  // --- LEFT CARD: BRAND THEME CARD WITH PERFECT ROUNDED OUTLINE ---
  // Single continuous vector path for fill and stroke (100% matching rounded corners)
  doc.setFillColor(240, 253, 255); // Pristine light brand cyan tint (#f0fdff)
  doc.setDrawColor(44, 236, 247); // Brand cyan #2cecf7 outline
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, topY, brandCardW, brandCardH, 6, 6, "FD");

  // Prominent Dark Logo on light gradient card (DevEngine-logo-on-light1.png)
  const darkLogo = assets.logoLightBase64 || assets.logoBase64;
  const logoW = 62;
  const logoH = 15.5;
  if (darkLogo) {
    try {
      doc.addImage(darkLogo, "PNG", margin + 8, topY + 7, logoW, logoH);
    } catch (e) {
      drawFallbackDarkLogo(doc, margin + 8, topY + 16);
    }
  } else {
    drawFallbackDarkLogo(doc, margin + 8, topY + 16);
  }

  // High-contrast dark typography on light card
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(companyLegalName, margin + 8, topY + 34);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85); // slate-700
  doc.text(`${displayWebsite}  /  ${contactPhone}`, margin + 8, topY + 39.5);

  doc.setFontSize(7.2);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text(companyAddress, margin + 8, topY + 44.5);

  // --- RIGHT COLUMN: FLOATING AMOUNT CARD & INVOICE TO ---
  const rightColX = margin + brandCardW + 7;
  const rightColW = contentWidth - brandCardW - 7; // ~73mm

  // Top Floating White Card (Amount Due / Paid)
  const floatCardY = topY;
  const floatCardH = 26;

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.35);
  doc.roundedRect(rightColX, floatCardY, rightColW, floatCardH, 4, 4, "FD");

  // AMOUNT DUE label
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text("AMOUNT DUE", rightColX + 7, floatCardY + 6.5);

  // Huge amount
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(`${currency}${displayAmount}`, rightColX + 7, floatCardY + 16.5);

  // Date
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.2);
  doc.setTextColor(148, 163, 184);
  doc.text(formattedDate, rightColX + 7, floatCardY + 22);

  // Bottom block: INVOICE TO
  const toY = floatCardY + floatCardH + 5;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text("INVOICE TO:", rightColX, toY);

  // Customer Name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(order.customerName || "Valued Licensee", rightColX, toY + 6);

  // Phone
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text(order.customerPhone || "—", rightColX, toY + 11);

  // Address (Cleanly wrapped within rightColW)
  const addrLines: string[] = doc.splitTextToSize(order.customerAddress || order.customerEmail || "Dhaka, Bangladesh", rightColW);
  doc.text(addrLines.slice(0, 2), rightColX, toY + 15.5);

  // ==========================================
  // 2. INVOICE DETAILS SECTION
  // ==========================================
  const detailsY = 82;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text("INVOICE DETAILS", margin, detailsY);

  // Wide 3-column card
  const detailsBoxY = detailsY + 3.5;
  const detailsBoxH = 16;

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, detailsBoxY, contentWidth, detailsBoxH, 3.5, 3.5, "FD");

  // Column 1: INVOICE NUMBER
  const dCol1X = margin + 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text("INVOICE NUMBER:", dCol1X, detailsBoxY + 5.5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`Nº: ${order.id}`, dCol1X, detailsBoxY + 11.5);

  // Column 2: ISSUED DATE
  const dCol2X = margin + 70;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text("ISSUED:", dCol2X, detailsBoxY + 5.5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(formattedDate, dCol2X, detailsBoxY + 11.5);

  // Column 3: DUE DATE / STATUS
  const dCol3X = margin + 130;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text("STATUS:", dCol3X, detailsBoxY + 5.5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  const statusStr = String(order.status || "").toLowerCase();
  const isVerified = statusStr.includes("verifi");
  const isRejected = statusStr.includes("reject");

  let statusLabel = "Pending Verification";
  let statusR = 217, statusG = 119, statusB = 6; // amber-600
  if (isVerified) {
    statusLabel = "Verified & Paid";
    statusR = 16; statusG = 185; statusB = 129; // emerald-500
  } else if (isRejected) {
    statusLabel = "Verification Rejected";
    statusR = 220; statusG = 38; statusB = 38; // red-600
  }
  doc.setTextColor(statusR, statusG, statusB);
  doc.text(statusLabel, dCol3X, detailsBoxY + 11.5);

  // ==========================================
  // 3. DESCRIPTION & PRICING TABLE
  // ==========================================
  const tableY = detailsBoxY + detailsBoxH + 9;

  // Table Column Labels
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184); // slate-400

  const colDescX = margin + 6;
  const descMaxW = 86; // strictly constrained to 86mm so it NEVER touches QTY!
  const colQtyX = margin + 116; // 132mm - completely safe gap of over 24mm!
  const colPriceX = margin + 144;
  const colTotalX = margin + contentWidth - 6;

  doc.text("DESCRIPTION", colDescX, tableY);
  doc.text("QTY", colQtyX, tableY, { align: "center" });
  doc.text("PRICE", colPriceX, tableY, { align: "right" });
  doc.text("TOTAL", colTotalX, tableY, { align: "right" });

  const itemsBoxY = tableY + 3.5;

  // Split description text to strictly fit within 86mm
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.2);
  const titleLines: string[] = doc.splitTextToSize(
    `${order.projectTitle} — Production Source License`,
    descMaxW
  );

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.2);
  const subtextLines: string[] = doc.splitTextToSize(
    `Selected Plan: ${order.planName || "Commercial License"}  •  Full cloud repository access`,
    descMaxW
  );

  const r1TitleH = titleLines.length * 4.2;
  const r1SubH = subtextLines.length * 3.4;
  const r1Y = itemsBoxY + 6.5;
  const r1CenterY = r1Y + (r1TitleH + r1SubH) / 2 - 1;

  const divider1Y = r1Y + r1TitleH + r1SubH + 4;
  const r2Y = divider1Y + 5.5;
  const r2H = 14;
  const itemsBoxH = r2Y + r2H - itemsBoxY + 1;

  // Light grayish-blue rounded items container (#f8fafc)
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(241, 245, 249); // slate-100
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, itemsBoxY, contentWidth, itemsBoxH, 4, 4, "FD");

  // Row 1: Primary License Deliverable (Cleanly Wrapped)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.2);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(titleLines, colDescX, r1Y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.2);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text(subtextLines, colDescX, r1Y + r1TitleH);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text("1", colQtyX, r1CenterY, { align: "center" });
  doc.text(`${currency}${displayAmount}`, colPriceX, r1CenterY, { align: "right" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`${currency}${displayAmount}`, colTotalX, r1CenterY, { align: "right" });

  // Divider Line 1
  doc.setDrawColor(241, 245, 249);
  doc.setLineWidth(0.3);
  doc.line(margin + 4, divider1Y, margin + contentWidth - 4, divider1Y);

  // Row 2: Verification Audit & Delivery Channel
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(`Payment Verification (${order.paymentMethod})`, colDescX, r2Y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.2);
  doc.setTextColor(148, 163, 184);
  doc.text(`TrxID: ${order.transactionId || "Pending"}  •  Encrypted Email Dispatch`, colDescX, r2Y + 4.2);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text("1", colQtyX, r2Y + 2, { align: "center" });
  doc.text("Included", colPriceX, r2Y + 2, { align: "right" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`${currency}0.00`, colTotalX, r2Y + 2, { align: "right" });

  // ==========================================
  // 4. TOTAL AMOUNT DISPLAY & STATUS SEAL
  // ==========================================
  const totalSectionY = itemsBoxY + itemsBoxH + 9;

  // Render Official Status Seal if order status is Verified or Rejected
  if (isVerified || isRejected) {
    try {
      const sealType = isVerified ? "Verified" : "Rejected";
      const sealDataUrl = generateStatusSealDataUrl(sealType, companyLegalName);
      if (sealDataUrl) {
        const sealSize = 31; // 31mm width & height
        const sealX = margin + 4;
        const sealY = totalSectionY - 6.5;
        doc.addImage(sealDataUrl, "PNG", sealX, sealY, sealSize, sealSize);
      }
    } catch (err) {
      console.warn("Could not draw status seal:", err);
    }
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text("TOTAL AMOUNT:", colTotalX, totalSectionY, { align: "right" });

  // Massive Vibrant Cyan/Sky Blue Total (28 pt!)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.setTextColor(2, 132, 199); // Cyan / Sky Blue (#0284c7)
  doc.text(`${currency}${displayAmount}`, colTotalX, totalSectionY + 10.5, { align: "right" });

  // ==========================================
  // 5. SIGNATURE & QR VERIFICATION BAR
  // ==========================================
  const verifyY = totalSectionY + 25;
  const verifyH = 32;

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, verifyY, contentWidth, verifyH, 3.5, 3.5, "FD");

  // Column 1: Founder Signature & Name
  const col1X = margin + 6;
  if (assets.signatureBase64) {
    try {
      doc.addImage(assets.signatureBase64, "PNG", col1X, verifyY + 2, 34, 11);
    } catch (e) {
      drawSignatureFallback(doc, col1X, verifyY + 10);
    }
  } else {
    drawSignatureFallback(doc, col1X, verifyY + 10);
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(signatoryName, col1X, verifyY + 19);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.2);
  doc.setTextColor(100, 116, 139);
  doc.text(signatoryTitle, col1X, verifyY + 23.5);

  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text("We appreciate your trust in us.", col1X, verifyY + 27.5);

  // Divider Line inside verification card
  doc.setDrawColor(226, 232, 240);
  doc.line(margin + 55, verifyY + 3, margin + 55, verifyY + verifyH - 3);

  // Column 2: Official Web Portals & Support
  const col2X = margin + 62;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text("Official Company Portal: ", col2X, verifyY + 8);
  const w1 = doc.getTextWidth("Official Company Portal: ");
  doc.setTextColor(2, 132, 199);
  doc.textWithLink(displayWebsite, col2X + w1, verifyY + 8, { url: rawCompanyWebsite });

  doc.setTextColor(15, 23, 42);
  doc.text("Developer Portfolio: ", col2X, verifyY + 14);
  const w2 = doc.getTextWidth("Developer Portfolio: ");
  doc.setTextColor(2, 132, 199);
  doc.textWithLink(displayPortfolio, col2X + w2, verifyY + 14, { url: rawDeveloperPortfolio });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(`Support: ${companyEmail}  •  ${contactPhone}`, col2X, verifyY + 21);
  doc.text(companyAddress, col2X, verifyY + 26);

  // Divider Line before QR
  doc.setDrawColor(226, 232, 240);
  doc.line(margin + contentWidth - 32, verifyY + 3, margin + contentWidth - 32, verifyY + verifyH - 3);

  // Column 3: QR Code
  const qrX = margin + contentWidth - 27;
  if (qrDataUrl) {
    try {
      doc.addImage(qrDataUrl, "PNG", qrX, verifyY + 3.5, 23, 23);
    } catch (err) {
      console.warn("Could not draw QR image:", err);
    }
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6);
  doc.setTextColor(148, 163, 184);
  doc.text("SCAN TO VERIFY", qrX + 11.5, verifyY + 29.5, { align: "center" });

  // ==========================================
  // 6. TERMS & CONDITIONS SECTION
  // ==========================================
  const termsY = verifyY + verifyH + 5;
  const termsH = 22;

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, termsY, contentWidth, termsH, 3.5, 3.5, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text("Terms & Conditions:", margin + 5, termsY + 6);

  const termsText =
    "All software licenses, source code architectures, and digital assets are strictly non-returnable and non-refundable once delivered. Orders are verified against banking/MFS transaction ledgers within 24 hours before final repository access issues. Direct inquiries to " +
    companyEmail +
    " or our verified WhatsApp helpline " +
    contactPhone +
    ".";

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.8);
  doc.setTextColor(148, 163, 184);
  const termsLines = doc.splitTextToSize(termsText, contentWidth - 10);
  doc.text(termsLines, margin + 5, termsY + 11);

  // ==========================================
  // 7. BOTTOM SOLID BRAND ACCENT BAR
  // ==========================================
  const bottomBarH = 5;
  doc.setFillColor(44, 236, 247); // Brand cyan #2cecf7
  doc.rect(0, pageHeight - bottomBarH, pageWidth, bottomBarH, "F");

  // Save the PDF file
  doc.save(`DevEngine-Receipt-${order.id}.pdf`);
}

// ------------------------------------------
// HELPER DRAWING FUNCTIONS
// ------------------------------------------

/**
 * Generate an authentic circular corporate Verified (Green) or Rejected (Red) Seal as a high-resolution PNG data URL.
 */
function generateStatusSealDataUrl(
  type: "Verified" | "Rejected",
  companyName: string = "DEVENGINE SYSTEMS INC."
): string {
  if (typeof document === "undefined") return "";

  const isVerified = type === "Verified";
  const sealColor = isVerified ? "#059669" : "#dc2626"; // Emerald 600 or Red 600
  const tintColor = isVerified ? "rgba(5, 150, 105, 0.05)" : "rgba(220, 38, 38, 0.05)";

  const size = 600;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  const cx = size / 2;
  const cy = size / 2;

  // Slight tilt for authentic ink stamp aesthetic (-9.5 degrees)
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((-9.5 * Math.PI) / 180);
  ctx.translate(-cx, -cy);

  // Outer solid ring
  ctx.strokeStyle = sealColor;
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(cx, cy, 270, 0, Math.PI * 2);
  ctx.stroke();

  // Fine dashed security ring
  ctx.lineWidth = 3;
  ctx.setLineDash([8, 6]);
  ctx.beginPath();
  ctx.arc(cx, cy, 252, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]); // Reset dash

  // Inner solid ring
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(cx, cy, 185, 0, Math.PI * 2);
  ctx.stroke();

  // Subtle translucent inner watermark tint
  ctx.fillStyle = tintColor;
  ctx.beginPath();
  ctx.arc(cx, cy, 182, 0, Math.PI * 2);
  ctx.fill();

  // Arc text helper
  const drawArcText = (
    text: string,
    radius: number,
    startAngle: number,
    endAngle: number,
    inward: boolean = true
  ) => {
    ctx.fillStyle = sealColor;
    ctx.font = "bold 23px 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const chars = text.split("");
    const angleRange = endAngle - startAngle;
    const step = angleRange / Math.max(chars.length - 1, 1);

    for (let i = 0; i < chars.length; i++) {
      const angle = startAngle + i * step;
      ctx.save();
      const x = cx + radius * Math.cos(angle);
      const y = cy + radius * Math.sin(angle);
      ctx.translate(x, y);
      ctx.rotate(angle + (inward ? Math.PI / 2 : -Math.PI / 2));
      ctx.fillText(chars[i], 0, 0);
      ctx.restore();
    }
  };

  // Top Arc: ★ DEVENGINE SYSTEMS INC. ★
  const cleanCompName = companyName.length > 28 ? companyName.slice(0, 26) + "..." : companyName;
  const topText = `★  ${cleanCompName.toUpperCase()}  ★`;
  drawArcText(topText, 218, (-145 * Math.PI) / 180, (-35 * Math.PI) / 180, true);

  // Bottom Arc
  const bottomText = isVerified
    ? "★  OFFICIALLY AUDITED & VERIFIED  ★"
    : "★  PAYMENT AUDIT • REJECTED  ★";
  drawArcText(bottomText, 218, (145 * Math.PI) / 180, (35 * Math.PI) / 180, false);

  if (isVerified) {
    // Center Checkmark Vector
    ctx.strokeStyle = sealColor;
    ctx.lineWidth = 14;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(cx - 45, cy - 35);
    ctx.lineTo(cx - 12, cy - 2);
    ctx.lineTo(cx + 50, cy - 65);
    ctx.stroke();

    // Center Badge: "VERIFIED"
    ctx.fillStyle = sealColor;
    ctx.font = "900 46px 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("VERIFIED", cx, cy + 30);

    // Center Subtitle: "PAYMENT AUDITED"
    ctx.font = "bold 17px 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif";
    ctx.fillText("PAYMENT AUDITED", cx, cy + 62);
  } else {
    // Center Cross Vector (X)
    ctx.strokeStyle = sealColor;
    ctx.lineWidth = 14;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(cx - 32, cy - 48);
    ctx.lineTo(cx + 32, cy - 4);
    ctx.moveTo(cx + 32, cy - 48);
    ctx.lineTo(cx - 32, cy - 4);
    ctx.stroke();

    // Center Badge: "REJECTED"
    ctx.fillStyle = sealColor;
    ctx.font = "900 44px 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("REJECTED", cx, cy + 30);

    // Center Subtitle: "PAYMENT DECLINED"
    ctx.font = "bold 17px 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif";
    ctx.fillText("PAYMENT DECLINED", cx, cy + 62);
  }

  // Star row under subtitle
  ctx.font = "15px 'Helvetica Neue', Helvetica, Arial, sans-serif";
  ctx.fillText("★  ★  ★", cx, cy + 83);

  ctx.restore();

  return canvas.toDataURL("image/png");
}

function drawFallbackDarkLogo(doc: jsPDF, x: number, y: number) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text("DevEngine", x, y);
}

function drawSignatureFallback(doc: jsPDF, x: number, y: number) {
  doc.setFont("times", "italic");
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text("Md. Abdul Hamim Leon", x, y);
}

