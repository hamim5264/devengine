import { jsPDF } from "jspdf";
import { AgreementRecord } from "@/types/agreement";
import { buildAgreementClauses, AgreementClauseSection } from "@/lib/agreements/agreementClauses";
import { getPdfBrandingSettings, PdfBrandingSettings, DEFAULT_PDF_BRANDING } from "@/lib/services/pdfSettingsService";

/**
 * Fetch base64 data for DevEngine logo and CEO signature from API or filesystem
 */
async function getBrandAssets(): Promise<{ logoBase64: string; signatureBase64: string }> {
  try {
    if (typeof window === "undefined") {
      const fs = await import("fs");
      const path = await import("path");
      const assetsDir = path.join(process.cwd(), "assets");
      const logoPath = path.join(assetsDir, "DevEngine-logo-on-light1.png");
      const signaturePath = path.join(assetsDir, "founder_sign.png");

      let logoBase64 = "";
      let signatureBase64 = "";

      if (fs.existsSync(logoPath)) {
        const logoBuffer = fs.readFileSync(logoPath);
        logoBase64 = `data:image/png;base64,${logoBuffer.toString("base64")}`;
      }

      if (fs.existsSync(signaturePath)) {
        const signBuffer = fs.readFileSync(signaturePath);
        signatureBase64 = `data:image/png;base64,${signBuffer.toString("base64")}`;
      }

      return { logoBase64, signatureBase64 };
    }

    const res = await fetch("/api/receipt-assets");
    if (!res.ok) throw new Error("Assets API returned non-200");
    const data = await res.json();
    return {
      logoBase64: data.logoBase64 || "",
      signatureBase64: data.signatureBase64 || "",
    };
  } catch (err) {
    console.warn("Could not fetch brand assets, using typography fallback:", err);
    return { logoBase64: "", signatureBase64: "" };
  }
}

/**
 * Renders paragraph text with justified alignment on non-terminal lines
 * and natural left-alignment on the terminal line, preventing awkward word gaps.
 * Supports an optional bold prefix (e.g. "Project Synopsis: ").
 * Automatically monitors maxContentY and triggers onPageBreak cleanly between lines.
 */
function renderJustifiedText(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  boldPrefix: string = "",
  maxContentY: number = 267,
  onPageBreak?: () => void
): number {
  let curY = y;
  const normalSpaceW = doc.getTextWidth(" ");

  if (boldPrefix) {
    if (curY + lineHeight > maxContentY && onPageBreak) {
      onPageBreak();
      curY = 27;
    }

    doc.setFont("times", "bold");
    doc.text(boldPrefix, x, curY);
    const prefixW = doc.getTextWidth(boldPrefix);

    doc.setFont("times", "normal");
    const words = text.split(/\s+/).filter(Boolean);
    const firstLineWords: string[] = [];
    let curW = 0;
    let idx = 0;
    while (idx < words.length) {
      const wordW = doc.getTextWidth((curW === 0 ? "" : " ") + words[idx]);
      if (curW + wordW > maxWidth - prefixW) break;
      curW += wordW;
      firstLineWords.push(words[idx]);
      idx++;
    }

    const firstLineAvailable = maxWidth - prefixW;
    const isOnlyLine = idx >= words.length;

    if (isOnlyLine) {
      doc.text(firstLineWords.join(" "), x + prefixW, curY);
      curY += lineHeight;
      return curY;
    } else {
      const sumW = firstLineWords.reduce((s, w) => s + doc.getTextWidth(w), 0);
      const gap = (firstLineAvailable - sumW) / Math.max(1, firstLineWords.length - 1);
      let wordX = x + prefixW;
      for (const w of firstLineWords) {
        doc.text(w, wordX, curY);
        wordX += doc.getTextWidth(w) + gap;
      }
      curY += lineHeight;

      const remaining = words.slice(idx).join(" ");
      const remLines: string[] = doc.splitTextToSize(remaining, maxWidth);
      for (let r = 0; r < remLines.length; r++) {
        if (curY + lineHeight > maxContentY && onPageBreak) {
          onPageBreak();
          curY = 27;
        }

        const line = remLines[r];
        const isLast = r === remLines.length - 1;
        if (isLast) {
          doc.text(line, x, curY);
        } else {
          const lWords = line.trim().split(/\s+/);
          const lWordsW = lWords.reduce((s, w) => s + doc.getTextWidth(w), 0);
          const lGap = (maxWidth - lWordsW) / Math.max(1, lWords.length - 1);
          if (lGap > normalSpaceW * 2.5 || lGap < 0) {
            doc.text(line, x, curY);
          } else {
            let lX = x;
            for (const lw of lWords) {
              doc.text(lw, lX, curY);
              lX += doc.getTextWidth(lw) + lGap;
            }
          }
        }
        curY += lineHeight;
      }
      return curY;
    }
  } else {
    doc.setFont("times", "normal");
    const lines: string[] = doc.splitTextToSize(text, maxWidth);
    for (let i = 0; i < lines.length; i++) {
      if (curY + lineHeight > maxContentY && onPageBreak) {
        onPageBreak();
        curY = 27;
      }

      const line = lines[i];
      const isLast = i === lines.length - 1;
      if (isLast) {
        doc.text(line, x, curY);
      } else {
        const words = line.trim().split(/\s+/);
        if (words.length <= 1) {
          doc.text(line, x, curY);
        } else {
          const wordsW = words.reduce((s, w) => s + doc.getTextWidth(w), 0);
          const gap = (maxWidth - wordsW) / Math.max(1, words.length - 1);
          if (gap > normalSpaceW * 2.5 || gap < 0) {
            doc.text(line, x, curY);
          } else {
            let wx = x;
            for (const w of words) {
              doc.text(w, wx, curY);
              wx += doc.getTextWidth(w) + gap;
            }
          }
        }
      }
      curY += lineHeight;
    }
    return curY;
  }
}

/**
 * Generates an official, publication-grade multi-page A4 PDF contract for DevEngine agreements.
 *
 * Requirements fulfilled:
 * - Font: Classic, prestigious Times New Roman ("times") for formal legal agreements.
 * - Dynamic text measurement: Prevents metadata overlaps by decoupling metadata into dedicated zone.
 * - Multi-line role & address wrapping: Eliminates text clipping in Contributor and Project cards.
 * - Orphan protection & smooth page breaks for tables and signature blocks.
 */
export async function generateAgreementPdf(
  record: AgreementRecord,
  options: { download?: boolean; returnBlob?: boolean } = { download: true, returnBlob: false }
): Promise<{ blob?: Blob; filename: string; doc: jsPDF; arrayBuffer: ArrayBuffer }> {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  const margin = 15; // 15mm margins
  const contentWidth = pageWidth - margin * 2; // 180mm
  const footerHeight = 15;
  const maxContentY = pageHeight - margin - footerHeight;

  doc.setLineHeightFactor(1.32);

  let currentY = margin;

  const assets = await getBrandAssets();

  // Fetch dynamic PDF branding settings (company URL & email)
  let branding: PdfBrandingSettings;
  try {
    branding = await getPdfBrandingSettings();
  } catch {
    branding = { ...DEFAULT_PDF_BRANDING };
  }
  const pdfWebsiteUrl = branding.companyWebsiteUrl;
  const pdfEmail = branding.companyEmail;

  // Running Header on Pages 2+
  const drawRunningHeader = () => {
    doc.setFont("times", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59); // slate-800
    doc.text("DEVENGINE  •  PROJECT AGREEMENT & LEGAL CONTRACT", margin, margin + 4.5);

    doc.setFont("times", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(
      `Doc Ref: ${record.agreementNumber} (v${record.version})`,
      pageWidth - margin,
      margin + 4.5,
      { align: "right" }
    );

    doc.setDrawColor(203, 213, 225); // slate-300
    doc.setLineWidth(0.35);
    doc.line(margin, margin + 7, pageWidth - margin, margin + 7);
  };

  // Helper to add a new page
  const addNewPage = (onNewPageCallback?: () => void) => {
    doc.addPage();
    currentY = margin + 12;
    drawRunningHeader();
    if (onNewPageCallback) {
      onNewPageCallback();
    }
  };

  // Helper to ensure vertical space
  const ensureSpace = (requiredHeight: number, onNewPageCallback?: () => void) => {
    if (currentY + requiredHeight > maxContentY) {
      addNewPage(onNewPageCallback);
    }
  };

  // ========================================================
  // 1. BRAND LETTERHEAD (PAGE 1)
  // ========================================================
  const logoWidth = 46;
  const logoHeight = 11;

  if (assets.logoBase64) {
    try {
      doc.addImage(assets.logoBase64, "PNG", margin, currentY, logoWidth, logoHeight);
    } catch {
      drawTextLogo();
    }
  } else {
    drawTextLogo();
  }

  function drawTextLogo() {
    doc.setFont("times", "bold");
    doc.setFontSize(18);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text("DEVENGINE", margin, currentY + 8);
  }

  // Right-aligned Corporate Contact Header
  doc.setFont("times", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(record.devengine.legalEntityName || "DEVENGINE TECHNOLOGY OPERATIONS", pageWidth - margin, currentY + 3, { align: "right" });

  doc.setFont("times", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text("Custom Software • Cloud Architecture • Systems Engineering", pageWidth - margin, currentY + 7.2, { align: "right" });

  doc.setFont("times", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(14, 116, 144); // cyan-700
  doc.text(`${pdfWebsiteUrl}  •  ${pdfEmail}`, pageWidth - margin, currentY + 11.2, { align: "right" });

  currentY += 16.5;

  // Header Divider Rule
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.8);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 5;

  // ========================================================
  // 2. SEPARATED METADATA CARD (ZERO COLLISION GUARANTEE!)
  // ========================================================
  // PHASE 5 FIX: Decouple Document Metadata (ID, Effective Date, Version, Status)
  // into a dedicated horizontal metadata ribbon so it CANNOT overlap dynamic titles.
  const metaBarH = 7.5;
  doc.setFillColor(241, 245, 249); // slate-100
  doc.roundedRect(margin, currentY, contentWidth, metaBarH, 1, 1, "F");
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, currentY, contentWidth, metaBarH, 1, 1, "S");

  // Left Tag
  doc.setFont("times", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(14, 116, 144); // cyan-700
  doc.text(`DOC REF: ${record.agreementNumber}`, margin + 4, currentY + 5.0);

  // Center Effective Date
  doc.setFont("times", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  doc.text(`EFFECTIVE DATE: ${record.project.agreementEffectiveDate}`, pageWidth / 2 - 10, currentY + 5.0, { align: "center" });

  // Right Version & Status
  const statusDisplay = record.status === "executed" ? "EXECUTED & BINDING" : record.status.toUpperCase();
  doc.setFont("times", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(record.status === "executed" ? 4 : 15, record.status === "executed" ? 120 : 23, record.status === "executed" ? 87 : 42);
  doc.text(`VERSION ${record.version}  •  [${statusDisplay}]`, pageWidth - margin - 4, currentY + 5.0, { align: "right" });

  currentY += metaBarH + 3.5;

  // ========================================================
  // 3. DYNAMIC TITLE & PROJECT HERO CARD
  // ========================================================
  // Calculate dynamic heights based on actual text length
  const titleText = (record.agreementTypeLabel || "PROJECT AGREEMENT").toUpperCase();
  const titleMaxWidth = contentWidth - 12;

  doc.setFont("times", "bold");
  doc.setFontSize(13);
  const titleLines: string[] = doc.splitTextToSize(titleText, titleMaxWidth);

  const projName = record.project.projectName || "Designated Project";
  const devName = (record.developer.legalName || record.developer.fullName || "Contributor").toUpperCase();
  const devRole = record.developer.role || "Software Engineer";

  doc.setFont("times", "normal");
  doc.setFontSize(8.8);
  const subtitleString = `Project: "${projName}"   •   Contributor: ${devName} (${devRole})`;
  const subLines: string[] = doc.splitTextToSize(subtitleString, titleMaxWidth);

  // Dynamic box height: topPad(8) + titleLines + gap(3) + subLines + bottomPad(8)
  const lineH13 = 5.2;
  const lineH8 = 4.2;
  const titleBoxH = Math.max(28, 8 + titleLines.length * lineH13 + 3 + subLines.length * lineH8 + 6);

  doc.setFillColor(15, 23, 42); // slate-900
  doc.roundedRect(margin, currentY, contentWidth, titleBoxH, 2, 2, "F");

  // Top Accent Banner Text inside card
  doc.setFont("times", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(56, 189, 248); // sky-400
  doc.text("OFFICIAL LEGAL CONTRACT & PROJECT AGREEMENT", margin + 6, currentY + 6.5);

  // Title Lines
  let textCursorY = currentY + 12.5;
  doc.setFont("times", "bold");
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  for (const tLine of titleLines) {
    doc.text(tLine, margin + 6, textCursorY);
    textCursorY += lineH13;
  }

  // Subtitle Lines with highlighted Contributor Name
  textCursorY += 1.5;
  doc.setFont("times", "normal");
  doc.setFontSize(8.8);
  doc.setTextColor(203, 213, 225); // slate-300
  for (let sIdx = 0; sIdx < subLines.length; sIdx++) {
    doc.text(subLines[sIdx], margin + 6, textCursorY);
    textCursorY += lineH8;
  }

  currentY += titleBoxH + 6;

  // ========================================================
  // 4. GENERATE AND RENDER LEGAL CLAUSES
  // ========================================================
  const clauses: AgreementClauseSection[] = buildAgreementClauses(record);

  for (const clause of clauses) {
    // Dynamic required clearance so section banner is NEVER orphaned alone at bottom of page
    let minSectionSpace = 38;
    if (clause.number === "1") {
      minSectionSpace = 65; // Banner + preamble + Company Card + Contributor Card
    } else if (clause.number === "3") {
      minSectionSpace = 50; // Banner + Specs Card + Synopsis
    } else if (clause.tableData && clause.tableData.rows.length > 0) {
      minSectionSpace = 45; // Banner + Intro + Table Header + at least 2 rows
    }
    ensureSpace(minSectionSpace);

    // Section Header Banner (Slate-900 Bar with Cyan Indicator)
    const bannerH = 8.0;
    doc.setFillColor(15, 23, 42); // slate-900
    doc.roundedRect(margin, currentY, contentWidth, bannerH, 1.2, 1.2, "F");

    // Cyan left accent marker
    doc.setFillColor(56, 189, 248); // sky-400
    doc.rect(margin, currentY, 3.2, bannerH, "F");

    doc.setFont("times", "bold");
    doc.setFontSize(9.8);
    doc.setTextColor(255, 255, 255);
    doc.text(`${clause.number}.  ${clause.title.toUpperCase()}`, margin + 6, currentY + 5.5);
    currentY += bannerH + 5.5;

    // ========================================================
    // SECTION 1: PARTIES & CAPACITY (STRUCTURED CARDS)
    // ========================================================
    if (clause.number === "1") {
      // Preamble sentence
      ensureSpace(8);
      doc.setFont("times", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(30, 41, 59);
      doc.text(
        `This Agreement is entered into and executed as of ${record.project.agreementEffectiveDate} by and between:`,
        margin + 2,
        currentY
      );
      currentY += 5.5;

      // Party A: Company Card
      ensureSpace(24);
      const companyCardH = 22;
      doc.setFillColor(248, 250, 252); // slate-50
      doc.roundedRect(margin, currentY, contentWidth, companyCardH, 1.5, 1.5, "F");
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.35);
      doc.roundedRect(margin, currentY, contentWidth, companyCardH, 1.5, 1.5, "S");

      doc.setFont("times", "bold");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text("PARTY A (THE COMPANY):", margin + 6, currentY + 5);

      doc.setFont("times", "bold");
      doc.setFontSize(10.2);
      doc.setTextColor(15, 23, 42);
      doc.text(record.devengine.legalEntityName || "DEVENGINE TECHNOLOGY OPERATIONS", margin + 6, currentY + 10.2);

      doc.setFont("times", "normal");
      doc.setFontSize(8.4);
      doc.setTextColor(51, 65, 85);
      doc.text(
        `Executive Direction: ${record.devengine.ceoName}, ${record.devengine.ceoTitle} | Operations: ${record.devengine.companyAddress}`,
        margin + 6,
        currentY + 15
      );
      doc.text(
        `Official Website: ${pdfWebsiteUrl}  •  Official Contact: ${pdfEmail}`,
        margin + 6,
        currentY + 19
      );
      currentY += companyCardH + 5;

      // Party B: Contributor Card - DYNAMIC TEXT MEASUREMENT (PHASE 5 FIX)
      // Allow multi-line role and address to wrap naturally without clipping!
      const colLeftX = margin + 6;
      const colRightX = margin + 94;
      const colMaxW = 80;

      // Measure lines for left column
      doc.setFont("times", "normal");
      doc.setFontSize(8.4);
      const rolePrefix = "Designated Role: ";
      const rolePrefixW = doc.getTextWidth(rolePrefix);
      const roleLines = doc.splitTextToSize(record.developer.role || "Software Engineer", colMaxW - rolePrefixW);

      const phonePrefix = "Contact Phone: ";
      const phonePrefixW = doc.getTextWidth(phonePrefix);
      const phoneVal = record.developer.phone || "On record";

      // Measure lines for right column
      const emailPrefix = "Email Address: ";
      const emailPrefixW = doc.getTextWidth(emailPrefix);
      const emailLines = doc.splitTextToSize(record.developer.email, colMaxW - emailPrefixW);

      const addrPrefix = "Address: ";
      const addrPrefixW = doc.getTextWidth(addrPrefix);
      const addrLines = doc.splitTextToSize(record.developer.address || "On record", colMaxW - addrPrefixW);

      const maxColLines = Math.max(
        roleLines.length + 1, // role rows + phone row
        emailLines.length + addrLines.length
      );

      const devCardH = Math.max(30, 16 + maxColLines * 5.2 + 4);
      ensureSpace(devCardH + 4);

      doc.setFillColor(240, 249, 255); // sky-50 tint
      doc.roundedRect(margin, currentY, contentWidth, devCardH, 1.5, 1.5, "F");

      doc.setDrawColor(14, 116, 144); // cyan-700 border
      doc.setLineWidth(0.6);
      doc.roundedRect(margin, currentY, contentWidth, devCardH, 1.5, 1.5, "S");

      // Cyan accent bar on left
      doc.setFillColor(14, 116, 144); // cyan-700
      doc.rect(margin, currentY, 3, devCardH, "F");

      doc.setFont("times", "bold");
      doc.setFontSize(8.2);
      doc.setTextColor(14, 116, 144);
      doc.text("PARTY B (THE CONTRIBUTOR / DEVELOPER):", margin + 6, currentY + 5.2);

      // Contributor Full Name - Bold, Large & Highlighted
      const contributorDisplayName = (record.developer.legalName || record.developer.fullName || "Contributor").toUpperCase();
      doc.setFont("times", "bold");
      doc.setFontSize(11.5);
      doc.setTextColor(15, 23, 42);
      doc.text(contributorDisplayName, margin + 6, currentY + 11.2);

      if (record.developer.professionalName) {
        const fullNameW = doc.getTextWidth(contributorDisplayName);
        doc.setFont("times", "italic");
        doc.setFontSize(8.8);
        doc.setTextColor(100, 116, 139);
        doc.text(`(known professionally as "${record.developer.professionalName}")`, margin + 9 + fullNameW, currentY + 11.2);
      }

      // Render Left Column
      let leftY = currentY + 17;
      doc.setFont("times", "bold");
      doc.setFontSize(8.4);
      doc.setTextColor(15, 23, 42);
      doc.text(rolePrefix, colLeftX, leftY);
      doc.setFont("times", "normal");
      doc.setTextColor(51, 65, 85);
      for (let rIdx = 0; rIdx < roleLines.length; rIdx++) {
        if (rIdx === 0) {
          doc.text(roleLines[rIdx], colLeftX + rolePrefixW, leftY);
        } else {
          leftY += 4.5;
          doc.text(roleLines[rIdx], colLeftX + rolePrefixW, leftY);
        }
      }
      leftY += 5.2;

      doc.setFont("times", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text(phonePrefix, colLeftX, leftY);
      doc.setFont("times", "normal");
      doc.setTextColor(51, 65, 85);
      doc.text(phoneVal, colLeftX + phonePrefixW, leftY);

      // Render Right Column
      let rightY = currentY + 17;
      doc.setFont("times", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text(emailPrefix, colRightX, rightY);
      doc.setFont("times", "normal");
      doc.setTextColor(51, 65, 85);
      for (let eIdx = 0; eIdx < emailLines.length; eIdx++) {
        if (eIdx === 0) {
          doc.text(emailLines[eIdx], colRightX + emailPrefixW, rightY);
        } else {
          rightY += 4.5;
          doc.text(emailLines[eIdx], colRightX + emailPrefixW, rightY);
        }
      }
      rightY += 5.2;

      doc.setFont("times", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text(addrPrefix, colRightX, rightY);
      doc.setFont("times", "normal");
      doc.setTextColor(51, 65, 85);
      for (let aIdx = 0; aIdx < addrLines.length; aIdx++) {
        if (aIdx === 0) {
          doc.text(addrLines[aIdx], colRightX + addrPrefixW, rightY);
        } else {
          rightY += 4.5;
          doc.text(addrLines[aIdx], colRightX + addrPrefixW, rightY);
        }
      }

      currentY += devCardH + 5;
      continue;
    }

    // ========================================================
    // SECTION 3: PROJECT OVERVIEW & TIMELINE (DYNAMIC SPECS)
    // ========================================================
    if (clause.number === "3") {
      const col1X = margin + 6;
      const col2X = margin + 94;
      const colMaxW = 80;

      doc.setFont("times", "bold");
      doc.setFontSize(9.5);
      const projNameWrapped = doc.splitTextToSize(record.project.projectName, colMaxW);
      const gridH = Math.max(26, 18 + projNameWrapped.length * 4.5);

      ensureSpace(gridH + 6);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(margin, currentY, contentWidth, gridH, 1.5, 1.5, "F");
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.35);
      doc.roundedRect(margin, currentY, contentWidth, gridH, 1.5, 1.5, "S");

      // Column 1
      doc.setFont("times", "bold");
      doc.setFontSize(7.8);
      doc.setTextColor(100, 116, 139);
      doc.text("PROJECT TITLE:", col1X, currentY + 5.5);
      doc.setFont("times", "bold");
      doc.setFontSize(9.8);
      doc.setTextColor(15, 23, 42);
      let pY = currentY + 10.5;
      for (const line of projNameWrapped) {
        doc.text(line, col1X, pY);
        pY += 4.5;
      }

      doc.setFont("times", "bold");
      doc.setFontSize(7.8);
      doc.setTextColor(100, 116, 139);
      doc.text("PROJECT NATURE / DOMAIN:", col1X, pY + 2);
      doc.setFont("times", "bold");
      doc.setFontSize(9.2);
      doc.setTextColor(14, 116, 144);
      doc.text(record.project.projectType || "Full-Stack Web Application", col1X, pY + 6.5);

      // Column 2
      doc.setFont("times", "bold");
      doc.setFontSize(7.8);
      doc.setTextColor(100, 116, 139);
      doc.text("COMMENCEMENT DATE:", col2X, currentY + 5.5);
      doc.setFont("times", "bold");
      doc.setFontSize(9.8);
      doc.setTextColor(15, 23, 42);
      doc.text(record.project.workCommencementDate || record.project.startDate || record.project.agreementEffectiveDate, col2X, currentY + 10.5);

      doc.setFont("times", "bold");
      doc.setFontSize(7.8);
      doc.setTextColor(100, 116, 139);
      doc.text("TARGET COMPLETION DATE:", col2X, currentY + 16.5);
      doc.setFont("times", "bold");
      doc.setFontSize(9.8);
      doc.setTextColor(15, 23, 42);
      doc.text(record.project.targetCompletionDate || record.project.expectedCompletionDate || "Per sprint delivery", col2X, currentY + 21.5);

      currentY += gridH + 5.5;

      // Render Technical Scope Synopsis
      if (clause.paragraphs) {
        const lineHeight = (doc.getLineHeight() / doc.internal.scaleFactor) * 1.05;
        for (const p of clause.paragraphs) {
          const synopsisMatch = p.match(/^(Technical Scope & Architecture:)\s*(.*)$/);
          if (synopsisMatch) {
            const prefix = synopsisMatch[1] + " ";
            const body = synopsisMatch[2];
            ensureSpace(20);
            doc.setFont("times", "normal");
            doc.setFontSize(9.6);
            doc.setTextColor(30, 41, 59);
            currentY = renderJustifiedText(doc, body, margin, currentY, contentWidth, lineHeight, prefix, maxContentY, () => addNewPage());
            currentY += 4;
            break;
          }
        }
      }
      currentY += 2;
      continue;
    }

    // ========================================================
    // STANDARD CLAUSES WITH BOLD TITLES & JUSTIFIED PARAGRAPHS
    // ========================================================
    if (clause.paragraphs) {
      const lineHeight = (doc.getLineHeight() / doc.internal.scaleFactor) * 1.05;

      for (const p of clause.paragraphs) {
        // Bullet / formula indented lines
        const isBulletOrFormula = p.startsWith("    ") || p.trim().startsWith("•") || p.trim().startsWith("LESS");
        if (isBulletOrFormula) {
          ensureSpace(lineHeight + 3);
          doc.setFont("times", "normal");
          doc.setFontSize(9.2);
          doc.setTextColor(51, 65, 85);

          const cleanText = p.trim();
          doc.setFillColor(14, 116, 144);
          doc.circle(margin + 5, currentY - 1.2, 0.8, "F");
          doc.text(cleanText, margin + 8.5, currentY);
          currentY += lineHeight + 1.5;
          continue;
        }

        // Subclause label: e.g. "5.1 Contractual Participation Rate: Body"
        const subMatch = p.match(/^(\d+\.\d+\s+[^:]+:)\s*(.*)$/);

        if (subMatch) {
          const prefix = subMatch[1];
          const body = subMatch[2];

          // Calculate space needed so title is never orphaned
          const bodyLines = doc.splitTextToSize(body, contentWidth);
          const neededSpace = (1 + Math.min(bodyLines.length, 3)) * lineHeight + 4;
          ensureSpace(neededSpace);

          doc.setFont("times", "bold");
          doc.setFontSize(10);
          doc.setTextColor(15, 23, 42); // slate-900
          doc.text(prefix, margin, currentY);
          currentY += lineHeight;

          doc.setFont("times", "normal");
          doc.setFontSize(9.6);
          doc.setTextColor(30, 41, 59);

          currentY = renderJustifiedText(
            doc,
            body,
            margin,
            currentY,
            contentWidth,
            lineHeight,
            "",
            maxContentY,
            () => addNewPage()
          );
          currentY += 2.5;
        } else {
          // Standard text paragraph
          const lines = doc.splitTextToSize(p, contentWidth);
          const neededSpace = Math.min(lines.length, 3) * lineHeight + 4;
          ensureSpace(neededSpace);

          doc.setFont("times", "normal");
          doc.setFontSize(9.6);
          doc.setTextColor(30, 41, 59);

          currentY = renderJustifiedText(
            doc,
            p,
            margin,
            currentY,
            contentWidth,
            lineHeight,
            "",
            maxContentY,
            () => addNewPage()
          );
          currentY += 2.5;
        }
      }
    }

    // ========================================================
    // TABLE DATA (DELIVERABLES & MILESTONES)
    // ========================================================
    if (clause.tableData && clause.tableData.rows.length > 0) {
      ensureSpace(26);
      const headers = clause.tableData.headers;
      const rows = clause.tableData.rows;

      const colCount = headers.length;
      const colWidths =
        colCount === 6
          ? [8, 38, 50, 44, 18, 22] // Deliverables table
          : [12, 36, 50, 44, 20, 18]; // Milestones table

      const drawTableHeader = () => {
        doc.setFillColor(15, 23, 42); // slate-900
        doc.rect(margin, currentY, contentWidth, 7.8, "F");

        doc.setFont("times", "bold");
        doc.setFontSize(7.8);
        doc.setTextColor(255, 255, 255);

        let colX = margin;
        for (let i = 0; i < colCount; i++) {
          const w = colWidths[i] || contentWidth / colCount;
          doc.text(headers[i], colX + 2, currentY + 5.2);
          colX += w;
        }
        currentY += 7.8;
      };

      drawTableHeader();

      for (let rIdx = 0; rIdx < rows.length; rIdx++) {
        const row = rows[rIdx];

        let maxLines = 1;
        const cellLinesArray: string[][] = [];
        for (let i = 0; i < colCount; i++) {
          const w = colWidths[i] || contentWidth / colCount;
          const text = row[i] || "";
          doc.setFont("times", i === 1 ? "bold" : "normal");
          doc.setFontSize(7.8);
          const lines = doc.splitTextToSize(text, w - 4);
          cellLinesArray.push(lines);
          if (lines.length > maxLines) maxLines = lines.length;
        }

        const rowH = Math.max(7.8, maxLines * 4.0 + 3.2);

        ensureSpace(rowH, () => {
          drawTableHeader();
        });

        if (rIdx % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(margin, currentY, contentWidth, rowH, "F");
        }

        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.25);
        doc.rect(margin, currentY, contentWidth, rowH, "S");

        let cellX = margin;
        for (let i = 0; i < colCount; i++) {
          const w = colWidths[i] || contentWidth / colCount;
          const lines = cellLinesArray[i];

          if (i === 1) {
            doc.setFont("times", "bold");
            doc.setTextColor(15, 23, 42);
          } else if (i === 4) {
            doc.setFont("times", "bold");
            doc.setTextColor(14, 116, 144);
          } else if (i === 5) {
            doc.setFont("times", "bold");
            doc.setTextColor(30, 41, 59);
          } else {
            doc.setFont("times", "normal");
            doc.setTextColor(51, 65, 85);
          }

          doc.setFontSize(7.8);
          doc.text(lines, cellX + 2, currentY + 4.8);
          cellX += w;
        }
        currentY += rowH;
      }
      currentY += 6;
    }
  }

  // ========================================================
  // 5. FORMAL SIGNATURE SECTION
  // ========================================================
  const sigBoxHeight = 52;
  ensureSpace(sigBoxHeight + 6);

  doc.setFillColor(248, 250, 252); // slate-50
  doc.roundedRect(margin, currentY, contentWidth, sigBoxHeight, 2, 2, "F");

  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);
  doc.roundedRect(margin, currentY, contentWidth, sigBoxHeight, 2, 2, "S");

  doc.setFont("times", "bold");
  doc.setFontSize(8.8);
  doc.setTextColor(15, 23, 42);
  doc.text(
    "IN WITNESS WHEREOF, the Parties have executed this Agreement as of the Effective Date.",
    margin + 6,
    currentY + 7.5
  );

  const halfW = (contentWidth - 16) / 2;
  const leftX = margin + 6;
  const rightX = margin + 6 + halfW + 4;
  const sigStartY = currentY + 13.5;

  // --- Left: For DevEngine (CEO Signature) ---
  doc.setFont("times", "bold");
  doc.setFontSize(8.2);
  doc.setTextColor(71, 85, 105);
  doc.text(`FOR AND ON BEHALF OF ${record.devengine.companyName.toUpperCase()}:`, leftX, sigStartY);

  const sigLineY = sigStartY + 21;

  if (assets.signatureBase64) {
    try {
      const sigW = 42;
      const sigH = 12;
      const sigImgY = sigLineY - 10.5;
      doc.addImage(assets.signatureBase64, "PNG", leftX + 4, sigImgY, sigW, sigH);
    } catch {
      doc.setFont("times", "italic");
      doc.text(`[${record.devengine.ceoName} — Authorized Signature]`, leftX + 2, sigLineY - 3);
    }
  } else {
    doc.setFont("times", "italic");
    doc.text(`[${record.devengine.ceoName} — Authorized Signature]`, leftX + 2, sigLineY - 3);
  }

  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.35);
  doc.line(leftX, sigLineY, leftX + halfW - 4, sigLineY);

  const nameY = sigLineY + 5;

  doc.setFont("times", "bold");
  doc.setFontSize(9.8);
  doc.setTextColor(15, 23, 42);
  doc.text(record.devengine.ceoName, leftX, nameY);

  doc.setFont("times", "normal");
  doc.setFontSize(7.8);
  doc.setTextColor(71, 85, 105);
  doc.text(`${record.devengine.ceoTitle}, ${record.devengine.companyName}`, leftX, nameY + 4);

  doc.setFont("times", "bold");
  doc.setTextColor(30, 41, 59);
  doc.text(`Date Executed: ${record.project.agreementEffectiveDate}`, leftX, nameY + 8);

  // --- Right: For Contributor Signature Area ---
  doc.setFont("times", "bold");
  doc.setFontSize(8.2);
  doc.setTextColor(71, 85, 105);
  doc.text("FOR AND ON BEHALF OF CONTRIBUTOR:", rightX, sigStartY);

  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.35);
  doc.line(rightX, sigLineY, rightX + halfW - 4, sigLineY);

  const contributorFullName = (record.developer.legalName || record.developer.fullName || "Contributor").toUpperCase();
  doc.setFont("times", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(14, 116, 144); // cyan-700
  doc.text(contributorFullName, rightX, nameY);

  doc.setFont("times", "bold");
  doc.setFontSize(7.8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Designation: ${record.developer.role || "Developer"}`, rightX, nameY + 4);

  doc.setFont("times", "normal");
  doc.setTextColor(100, 116, 139);
  const signatureDateDisplay = record.signatureMetadata?.signedAt
    ? `Signed: ${record.signatureMetadata.signedAt.split("T")[0]} (${record.signatureMetadata.signingMethod || "Electronic"})`
    : "Date: ________________________";
  doc.text(signatureDateDisplay, rightX, nameY + 8);

  currentY += sigBoxHeight + 8;

  // ========================================================
  // 6. RUNNING FOOTERS ON ALL PAGES
  // ========================================================
  const totalPages = doc.getNumberOfPages();

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    doc.setPage(pageNum);

    const footerY = pageHeight - margin + 2;

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.35);
    doc.line(margin, footerY - 4.5, pageWidth - margin, footerY - 4.5);

    doc.setFont("times", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text(record.devengine.companyName.toUpperCase(), margin, footerY);

    doc.setFont("times", "normal");
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(` • ${pdfWebsiteUrl}`, margin + 17, footerY);

    doc.setFont("times", "bold");
    doc.setFontSize(6.8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      "CONFIDENTIAL & PROPRIETARY CONTRACT",
      pageWidth / 2 + 10,
      footerY,
      { align: "center" }
    );

    doc.setFont("times", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);
    doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth - margin, footerY, { align: "right" });
  }

  const filename = `${record.agreementNumber}_${(record.project.projectName || "Contract").replace(
    /[^a-zA-Z0-9_-]/g,
    "_"
  )}.pdf`;

  if (options.download && typeof window !== "undefined") {
    doc.save(filename);
  }

  let blob: Blob | undefined = undefined;
  if (options.returnBlob) {
    blob = doc.output("blob");
  }

  const arrayBuffer = doc.output("arraybuffer");

  return { blob, filename, doc, arrayBuffer };
}
