import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import { OrderRecord } from "@/types/order";

/**
 * Fetch base64 data for DevEngine logo and Founder signature from API
 */
async function getReceiptAssets(): Promise<{ logoBase64: string; signatureBase64: string }> {
  try {
    const res = await fetch("/api/receipt-assets");
    if (!res.ok) throw new Error("Assets API returned non-200");
    const data = await res.json();
    return {
      logoBase64: data.logoBase64 || "",
      signatureBase64: data.signatureBase64 || "",
    };
  } catch (err) {
    console.warn("Could not fetch receipt assets from API, falling back:", err);
    return { logoBase64: "", signatureBase64: "" };
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
        dark: "#0b132b",
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
  const margin = 12;
  const contentWidth = pageWidth - margin * 2; // 186mm

  // Scanner message requested: "when scan show the code and just a msg your tracking code of devengine"
  const qrMessage = `Your tracking code of DevEngine: ${order.id}`;

  // Currency: always use BDT or USD to avoid WinAnsi font symbol encoding issues
  const currency = order.currency?.toUpperCase() === "USD" ? "USD" : "BDT";
  const numAmount = Number(String(order.amount).replace(/[^0-9.]/g, ""));
  const displayAmount = !isNaN(numAmount) && numAmount > 0 ? numAmount.toLocaleString() : order.amount;

  // Fetch brand assets and generate QR code in parallel
  const [assets, qrDataUrl] = await Promise.all([
    getReceiptAssets(),
    generateQrCode(qrMessage),
  ]);

  // ==========================================
  // 1. TOP BRAND HEADER
  // ==========================================
  const topY = 11;

  // DevEngine Logo Image or Fallback Typography
  if (assets.logoBase64) {
    try {
      doc.addImage(assets.logoBase64, "PNG", margin, topY - 2, 52, 12.5);
    } catch (e) {
      drawFallbackLogo(doc, margin, topY);
    }
  } else {
    drawFallbackLogo(doc, margin, topY);
  }

  // Right Header Tagline
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59); // slate-800
  doc.text("BUILD  •  SCALE  •  TOGETHER", pageWidth - margin, topY + 2, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.8);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text("Enterprise Software  |  Custom Solutions  |  Global Impact", pageWidth - margin, topY + 6.5, { align: "right" });

  // ==========================================
  // 2. HERO RECEIPT CARD (Dark Navy)
  // ==========================================
  const heroY = 25;
  const heroHeight = 31;

  // Navy Card Background
  doc.setFillColor(11, 19, 43); // #0b132b
  doc.roundedRect(margin, heroY, contentWidth, heroHeight, 3, 3, "F");

  // Left Content
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(56, 189, 248); // sky-400
  doc.text("OFFICIAL RECEIPT", margin + 7, heroY + 6.8);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13.5);
  doc.setTextColor(255, 255, 255);
  doc.text("Commercial Software License & Order Invoice", margin + 7, heroY + 14.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.8);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text(
    "This document serves as an official record of your order and payment.\nYour license will be delivered after payment verification.",
    margin + 7,
    heroY + 21.5
  );

  // Right Content - Sleek Fitted & Centered Status Badge Pill
  const isVerified = order.status === "Verified";
  const badgeLabel = isVerified ? "VERIFIED LICENSE" : "PENDING VERIFICATION";
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.2);
  const textWidth = doc.getTextWidth(badgeLabel);
  const dotRadius = 1.1;
  const dotGap = 2.2;
  const totalInnerContentW = dotRadius * 2 + dotGap + textWidth;
  const badgeW = Math.round(totalInnerContentW + 9); // Fitted width with 4.5mm padding each side
  const badgeH = 6.2;
  const badgeX = pageWidth - margin - 7 - badgeW;
  const badgeY = heroY + 5.2;

  // Pill background & border
  doc.setFillColor(18, 24, 38);
  doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 3.1, 3.1, "F");

  doc.setDrawColor(isVerified ? 16 : 245, isVerified ? 185 : 158, isVerified ? 129 : 11);
  doc.setLineWidth(0.35);
  doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 3.1, 3.1, "S");

  // Center the dot and text horizontally inside the pill!
  const contentStartX = badgeX + (badgeW - totalInnerContentW) / 2;
  const dotCenterX = contentStartX + dotRadius;
  const dotCenterY = badgeY + badgeH / 2;

  // Glowing status dot
  doc.setFillColor(isVerified ? 52 : 251, isVerified ? 211 : 191, isVerified ? 153 : 36);
  doc.circle(dotCenterX, dotCenterY, dotRadius, "F");

  // Centered label text
  doc.setTextColor(isVerified ? 52 : 251, isVerified ? 211 : 191, isVerified ? 153 : 36);
  doc.text(badgeLabel, contentStartX + dotRadius * 2 + dotGap, badgeY + 4.3);

  // Right Content - Tracking ID & Date
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text("ORDER / TRACKING ID", pageWidth - margin - 7, heroY + 17.5, { align: "right" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text(order.id, pageWidth - margin - 7, heroY + 23.2, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  const formattedDate = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  doc.text(`Date: ${formattedDate}`, pageWidth - margin - 7, heroY + 28.5, { align: "right" });

  // ==========================================
  // 3. TWO INFO CARDS (With Dynamic Row Height to Prevent Text Overlap)
  // ==========================================
  const cardsY = heroY + heroHeight + 3.5;
  const cardGap = 4;
  const cardWidth = (contentWidth - cardGap) / 2;
  const cardHeight = 33; // Generous height for safe multi-line padding

  // Left Card: Customer & Licensee Information
  drawInfoCard(doc, margin, cardsY, cardWidth, cardHeight, "Customer & Licensee Information", [
    { label: "Full Name", value: order.customerName },
    { label: "Email", value: order.customerEmail },
    { label: "Contact", value: order.customerPhone },
    { label: "Address", value: order.customerAddress },
  ]);

  // Right Card: Licensed System Specification (Dynamic flow prevents "Learning Tool" collision!)
  drawInfoCard(
    doc,
    margin + cardWidth + cardGap,
    cardsY,
    cardWidth,
    cardHeight,
    "Licensed System Specification",
    [
      { label: "Project", value: order.projectTitle },
      { label: "Selected Plan", value: order.planName },
      { label: "Digital Rights", value: "Full Commercial & Deployment Rights" },
      { label: "Delivery", value: "Instant Cloud Repository Access" },
    ]
  );

  // ==========================================
  // 4. ITEM DESCRIPTION & PRICING TABLE (Clean Column Bounds to Prevent Collision)
  // ==========================================
  const tableY = cardsY + cardHeight + 3.5;
  const headerHeight = 7;

  // Table Header Bar (Dark slate/navy)
  doc.setFillColor(15, 23, 42); // slate-900
  doc.roundedRect(margin, tableY, contentWidth, headerHeight, 1.5, 1.5, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.8);
  doc.setTextColor(255, 255, 255);

  doc.text("#", margin + 6, tableY + 4.8, { align: "center" });
  doc.text("ITEM DESCRIPTION", margin + 16, tableY + 4.8);
  doc.text("TIER / LICENSE", margin + 112, tableY + 4.8);
  doc.text(`AMOUNT (${currency})`, pageWidth - margin - 7, tableY + 4.8, { align: "right" });

  // Table Row 1
  const rowY = tableY + headerHeight;

  // Calculate dynamic title lines to fit strictly within the 90mm description column
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.8);
  const titleLines: string[] = doc.splitTextToSize(
    `${order.projectTitle} — Production Source License`,
    92
  );
  const rowHeight = titleLines.length > 1 ? 16 : 13;

  doc.setFillColor(255, 255, 255);
  doc.rect(margin, rowY, contentWidth, rowHeight, "F");
  doc.setDrawColor(241, 245, 249);
  doc.setLineWidth(0.2);
  doc.line(margin, rowY + rowHeight, pageWidth - margin, rowY + rowHeight);

  // Row number (vertically centered)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text("1", margin + 6, rowY + rowHeight / 2 + 1, { align: "center" });

  // Item description (constrained strictly within 92mm so it NEVER collides with Tier!)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.8);
  doc.setTextColor(15, 23, 42);
  doc.text(titleLines, margin + 16, rowY + 5);

  const subtextY = rowY + 5 + titleLines.length * 3.8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.4);
  doc.setTextColor(100, 116, 139);
  doc.text(
    "Includes full architecture code, developer documentation & cloud repository access.",
    margin + 16,
    subtextY,
    { maxWidth: 92 }
  );

  // Tier / License (vertically centered, starts safely at margin + 112)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.8);
  doc.setTextColor(15, 23, 42);
  doc.text(order.planName, margin + 112, rowY + rowHeight / 2 + 1);

  // Amount (vertically centered)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(
    `${currency} ${displayAmount}`,
    pageWidth - margin - 7,
    rowY + rowHeight / 2 + 1,
    { align: "right" }
  );

  // Total Row (Light Green Bar)
  const totalY = rowY + rowHeight;
  const totalHeight = 8;

  doc.setFillColor(236, 253, 245); // emerald-50
  doc.roundedRect(margin, totalY, contentWidth, totalHeight, 1.5, 1.5, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.8);
  doc.setTextColor(4, 120, 87); // emerald-700
  doc.text("TOTAL AMOUNT PAID / RECORDED", margin + 7, totalY + 5.2);

  doc.setFontSize(10);
  doc.text(
    `${currency} ${displayAmount}`,
    pageWidth - margin - 7,
    totalY + 5.5,
    { align: "right" }
  );

  // ==========================================
  // 5. MANUAL PAYMENT VERIFICATION AUDIT (Properly Aligned & No Text Overlap)
  // ==========================================
  const auditY = totalY + totalHeight + 3.5;
  const auditHeight = 24.5;

  // Box background & border
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, auditY, contentWidth, auditHeight, 2, 2, "FD");

  // Header with teal circle icon
  drawTealBadge(doc, margin + 5, auditY + 5);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text("Manual Payment Verification Audit", margin + 14, auditY + 5.8);

  // Audit Columns: Generous widths so nothing ever wraps or collides
  const auditCol1X = margin + 5;
  const auditCol2X = margin + 94; // Col 2 starts at ~106mm
  const auditRow1 = auditY + 11.5;
  const auditRow2 = auditY + 16.5;
  const auditRow3 = auditY + 21.5;

  // Left Column (Label width: 38mm, Value max: 50mm)
  drawFieldPair(doc, auditCol1X, auditRow1, "Payment Method", order.paymentMethod, 38, 50);
  drawFieldPair(doc, auditCol1X, auditRow2, "Transaction ID (TrxID)", order.transactionId, 38, 50);
  drawFieldPair(doc, auditCol1X, auditRow3, "Sender Phone / Account", order.senderNumberOrAccount, 38, 50);

  // Right Column (Label width: 28mm, Value max: 62mm -> fits "DevEngine Financial Verification" on 1 line!)
  drawFieldPair(doc, auditCol2X, auditRow1, "Audited By", "DevEngine Financial Verification", 28, 62);
  drawFieldPair(doc, auditCol2X, auditRow2, "Verification SLA", "Within 24 Hours", 28, 62);
  drawFieldPair(doc, auditCol2X, auditRow3, "Delivery Channel", "Encrypted Email Dispatch", 28, 62);

  // ==========================================
  // 6. HIGHLIGHTED NO RETURN POLICY & PROJECT TAKEOVER PROTOCOL
  // ==========================================
  const alertY = auditY + auditHeight + 3.5;
  const alertHeight = 16.5;

  // Highlighted Box (Amber tint background with clean amber border)
  doc.setFillColor(255, 251, 235); // amber-50
  doc.setDrawColor(245, 158, 11); // amber-500
  doc.setLineWidth(0.4);
  doc.roundedRect(margin, alertY, contentWidth, alertHeight, 2, 2, "FD");

  // Left accent amber bar
  doc.setFillColor(245, 158, 11);
  doc.roundedRect(margin, alertY, 3, alertHeight, 1, 1, "F");

  // Takeover Protocol Notice
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.2);
  doc.setTextColor(180, 83, 9); // amber-700
  doc.text("PROJECT TAKEOVER PROTOCOL:", margin + 6, alertY + 5.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.8);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(
    "Use this verified payment receipt and unique tracking ID to claim full ownership and take over the project repository.",
    margin + 58,
    alertY + 5.5
  );

  // Strict No Return Policy Notice (Highlighted)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.2);
  doc.setTextColor(225, 29, 72); // rose-600
  doc.text("STRICT NO RETURN POLICY:", margin + 6, alertY + 11.8);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.8);
  doc.setTextColor(15, 23, 42);
  doc.text(
    "All software licenses, source code architectures, and digital assets are strictly non-returnable and non-refundable.",
    margin + 58,
    alertY + 11.8
  );

  // ==========================================
  // 7. LICENSE AGREEMENT & TERMS OF DELIVERABLE
  // ==========================================
  const termsY = alertY + alertHeight + 3.5;
  const termsHeight = 27;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, termsY, contentWidth, termsHeight, 2, 2, "FD");

  // Header
  drawTealBadge(doc, margin + 5, termsY + 4.8);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.2);
  doc.setTextColor(15, 23, 42);
  doc.text("License Agreement & Terms of Deliverable", margin + 14, termsY + 5.6);

  // Terms items with circular numbered badges
  const termItems = [
    {
      num: "1",
      title: "License Scope",
      desc: "Grants licensee non-exclusive commercial rights to deploy and modify the source architecture.",
    },
    {
      num: "2",
      title: "Verification SLA",
      desc: "Orders are verified against banking/MFS transaction ledgers within 24 hours before final repository access issues.",
    },
    {
      num: "3",
      title: "Support Channel",
      desc: "Direct inquiries to devenginesoftsolution@gmail.com or our verified WhatsApp helpline +880 1724 879284.",
    },
  ];

  termItems.forEach((item, idx) => {
    const itemY = termsY + 10.5 + idx * 5.2;

    // Number circle badge
    doc.setFillColor(226, 232, 240);
    doc.circle(margin + 8, itemY - 1, 1.9, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(5.8);
    doc.setTextColor(30, 41, 59);
    doc.text(item.num, margin + 8, itemY - 0.2, { align: "center" });

    // Item title & description
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.8);
    doc.setTextColor(15, 23, 42);
    doc.text(`${item.title}: `, margin + 13, itemY);

    const titleWidth = doc.getTextWidth(`${item.title}: `);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.6);
    doc.setTextColor(71, 85, 105);
    doc.text(item.desc, margin + 13 + titleWidth, itemY);
  });

  // ==========================================
  // 8. FOUNDER SIGNATURE, COMPANY INFO & QR CODE
  // ==========================================
  const bottomY = termsY + termsHeight + 4;
  const col1W = 58;
  const col2W = 66;

  // --- COLUMN 1: FOUNDER SIGNATURE & CEO ---
  const col1X = margin + 1;

  // Founder Signature Image
  if (assets.signatureBase64) {
    try {
      doc.addImage(assets.signatureBase64, "PNG", col1X, bottomY - 3, 36, 13);
    } catch (e) {
      drawSignatureFallback(doc, col1X, bottomY + 6);
    }
  } else {
    drawSignatureFallback(doc, col1X, bottomY + 6);
  }

  // Signature divider line
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.25);
  doc.line(col1X, bottomY + 11, col1X + 42, bottomY + 11);

  // Founder details
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.8);
  doc.setTextColor(15, 23, 42);
  doc.text("MD. ABDUL HAMIM LEON", col1X, bottomY + 15);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text("Founder and CEO, DevEngine", col1X, bottomY + 19);

  doc.setFontSize(6);
  doc.setTextColor(148, 163, 184);
  doc.text("We appreciate your trust in us.", col1X, bottomY + 23);

  // Vertical Separator 1
  doc.setDrawColor(226, 232, 240);
  doc.line(margin + col1W, bottomY, margin + col1W, bottomY + 25);

  // --- COLUMN 2: DEVENGINE SYSTEMS INC. & PORTFOLIO (devengine.com removed) ---
  const col2X = margin + col1W + 6;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text("DEVENGINE ", col2X, bottomY + 4);
  const deWidth = doc.getTextWidth("DEVENGINE ");
  doc.setTextColor(2, 132, 199); // sky-600
  doc.text("SYSTEMS INC.", col2X + deWidth, bottomY + 4);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.6);
  doc.setTextColor(100, 116, 139);
  doc.text("Banasree, Rampura, Dhaka 1219", col2X, bottomY + 8.8);
  doc.text("Official Enterprise Software Studio", col2X, bottomY + 13);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.6);
  doc.setTextColor(15, 23, 42);
  doc.text("Visit Developer Portfolio:", col2X, bottomY + 18);

  doc.setTextColor(2, 132, 199);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.text("https://thedevhamim.vercel.app/", col2X, bottomY + 22.5);

  // Vertical Separator 2
  doc.setDrawColor(226, 232, 240);
  doc.line(margin + col1W + col2W, bottomY, margin + col1W + col2W, bottomY + 25);

  // --- COLUMN 3: QR CODE & SUPPORT ---
  const col3X = margin + col1W + col2W + 4;

  if (qrDataUrl) {
    try {
      doc.addImage(qrDataUrl, "PNG", col3X, bottomY - 1, 22, 22);
    } catch (err) {
      console.warn("Could not draw QR image:", err);
    }
  }

  const qrTextX = col3X + 24;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6);
  doc.setTextColor(100, 116, 139);
  doc.text("SCAN TO VERIFY", qrTextX, bottomY + 3);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text("Need Help?", qrTextX, bottomY + 7.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.2);
  doc.setTextColor(100, 116, 139);
  doc.text("devenginesoftsolution@gmail.com", qrTextX, bottomY + 11.5);
  doc.text("+880 1724 879284", qrTextX, bottomY + 15.5);

  // ==========================================
  // 9. FOOTER COPYRIGHT BAR
  // ==========================================
  const footerY = pageHeight - 9;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, footerY - 3, pageWidth - margin, footerY - 3);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text("© 2026 DevEngine. All rights reserved.", margin, footerY);
  doc.text(
    "Extreme Software Studio // Enterprise Architecture",
    pageWidth - margin,
    footerY,
    { align: "right" }
  );

  // Save the PDF file
  doc.save(`DevEngine-Receipt-${order.id}.pdf`);
}

// ------------------------------------------
// HELPER DRAWING FUNCTIONS
// ------------------------------------------

function drawFallbackLogo(doc: jsPDF, x: number, y: number) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(15, 23, 42);
  doc.text("DEVENGINE", x, y + 2);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(2, 132, 199);
  doc.text("EXTREME SOFTWARE STUDIO", x, y + 6);
}

function drawTealBadge(doc: jsPDF, x: number, y: number) {
  doc.setFillColor(204, 251, 241); // teal-100
  doc.circle(x + 2.5, y - 1, 3, "F");
  doc.setFillColor(13, 148, 136); // teal-600
  doc.circle(x + 2.5, y - 1, 1.2, "F");
}

/**
 * Draw Info Card with dynamic row height tracking so multi-line text NEVER collides with the next field
 */
function drawInfoCard(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  title: string,
  fields: { label: string; value: string }[]
) {
  // Rounded Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, w, h, 2, 2, "FD");

  // Header
  drawTealBadge(doc, x + 4.5, y + 5);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(title, x + 13, y + 5.8);

  // Dynamic Row Flow: Advances Y according to exact line count of value!
  let currentY = y + 11.2;
  const valueColX = x + 24;
  const valueMaxW = w - 28; // ~63mm wide for value

  fields.forEach((field) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.7);
    doc.setTextColor(100, 116, 139);
    doc.text(field.label, x + 5, currentY);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(15, 23, 42);

    // Split text into lines to avoid overflow
    const lines: string[] = doc.splitTextToSize(field.value, valueMaxW);
    const displayLines = lines.slice(0, 2); // Max 2 lines per field
    doc.text(displayLines, valueColX, currentY);

    // Advance currentY by the rendered height
    const lineCount = displayLines.length;
    currentY += lineCount > 1 ? 3.8 * lineCount : 4.6;
  });
}

function drawFieldPair(
  doc: jsPDF,
  x: number,
  y: number,
  label: string,
  value: string,
  labelColWidth: number,
  valueMaxWidth: number = 55
) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.8);
  doc.setTextColor(100, 116, 139);
  doc.text(label, x, y);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.2);
  doc.setTextColor(15, 23, 42);
  doc.text(value, x + labelColWidth, y, { maxWidth: valueMaxWidth });
}

function drawSignatureFallback(doc: jsPDF, x: number, y: number) {
  doc.setFont("times", "italic");
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text("Md. Abdul Hamim Leon", x, y);
}
