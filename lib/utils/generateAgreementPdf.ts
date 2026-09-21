import { jsPDF } from "jspdf";
import { AgreementRecord } from "@/types/agreement";
import { buildAgreementClauses, AgreementClauseSection } from "@/lib/agreements/agreementClauses";

/**
 * Fetch base64 data for DevEngine logo and CEO signature from API
 */
async function getBrandAssets(): Promise<{ logoBase64: string; signatureBase64: string }> {
  try {
    const res = await fetch("/api/receipt-assets");
    if (!res.ok) throw new Error("Assets API returned non-200");
    const data = await res.json();
    return {
      logoBase64: data.logoBase64 || "",
      signatureBase64: data.signatureBase64 || "",
    };
  } catch (err) {
    console.warn("Could not fetch brand assets from API, using typography fallback:", err);
    return { logoBase64: "", signatureBase64: "" };
  }
}

/**
 * Renders paragraph text with justified alignment on non-terminal lines
 * and natural left-alignment on the terminal line, preventing awkward word gaps (rivering).
 * Supports an optional bold prefix (e.g. "Project Synopsis: ").
 */
function renderJustifiedText(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  boldPrefix: string = ""
): number {
  let curY = y;
  const normalSpaceW = doc.getTextWidth(" ");

  if (boldPrefix) {
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
      return lineHeight;
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
      return (1 + remLines.length) * lineHeight;
    }
  } else {
    doc.setFont("times", "normal");
    const lines: string[] = doc.splitTextToSize(text, maxWidth);
    for (let i = 0; i < lines.length; i++) {
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
    return lines.length * lineHeight;
  }
}

/**
 * Generates an official, publication-grade multi-page A4 PDF contract for DevEngine agreements.
 *
 * Requirements fulfilled:
 * - Font: Classic, prestigious Times New Roman ("times") for formal legal agreements.
 * - Font Size: Increased to 9.2pt - 9.5pt for comfortable, authoritative reading.
 * - Text Justification: Clause content text is justified from side to side (align: "justify") across margins.
 * - Important Points & Lines: BOLD and highlighted (parties, contributor name, dates, percentages, subclauses).
 * - Spacing: Perfect line heights, exact ensureSpace page-break calculations, and repeating table headers.
 */
export async function generateAgreementPdf(
  record: AgreementRecord,
  options: { download?: boolean; returnBlob?: boolean } = { download: true, returnBlob: false }
): Promise<{ blob?: Blob; filename: string }> {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  const margin = 15; // 15mm margins
  const contentWidth = pageWidth - margin * 2; // 180mm
  const footerHeight = 15;
  const maxContentY = pageHeight - margin - footerHeight;

  doc.setLineHeightFactor(1.25);

  let currentY = margin;

  const assets = await getBrandAssets();

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
  doc.text("DEVENGINE TECHNOLOGY OPERATIONS", pageWidth - margin, currentY + 3, { align: "right" });

  doc.setFont("times", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text("Custom Software • Cloud Architecture • Systems Engineering", pageWidth - margin, currentY + 7.2, { align: "right" });

  doc.setFont("times", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(14, 116, 144); // cyan-700
  doc.text("https://thedevengine.vercel.app  •  hamim.leon@gmail.com", pageWidth - margin, currentY + 11.2, { align: "right" });

  currentY += 17.5;

  // Header Divider Rule
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.8);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 6;

  // ========================================================
  // 2. FORMAL DOCUMENT TITLE CARD
  // ========================================================
  const titleBoxH = 28;
  doc.setFillColor(15, 23, 42); // slate-900
  doc.roundedRect(margin, currentY, contentWidth, titleBoxH, 2, 2, "F");

  // Left Title Elements
  doc.setFont("times", "bold");
  doc.setFontSize(8);
  doc.setTextColor(56, 189, 248); // sky-400
  doc.text("OFFICIAL LEGAL CONTRACT & PROJECT AGREEMENT", margin + 6, currentY + 7);

  doc.setFont("times", "bold");
  doc.setFontSize(13.5);
  doc.setTextColor(255, 255, 255);
  doc.text(record.agreementTypeLabel.toUpperCase(), margin + 6, currentY + 14.5);

  // Subtitle with Project and Bold Highlighted Contributor Name
  doc.setFont("times", "normal");
  doc.setFontSize(8.2);
  doc.setTextColor(203, 213, 225); // slate-300
  const projPrefix = `Project: "${record.project.projectName}"   •   Contributor: `;
  doc.text(projPrefix, margin + 6, currentY + 22);

  const prefixW = doc.getTextWidth(projPrefix);
  const devNameDisplay = record.developer.fullName.toUpperCase();
  doc.setFont("times", "bold");
  doc.setTextColor(56, 189, 248); // sky-400 bold highlighted
  doc.text(devNameDisplay, margin + 6 + prefixW, currentY + 22);

  // Right Metadata Badges
  doc.setFont("times", "bold");
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(`ID: ${record.agreementNumber}`, pageWidth - margin - 6, currentY + 8, { align: "right" });

  doc.setFont("times", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(203, 213, 225);
  doc.text(`Effective Date: ${record.project.agreementEffectiveDate}`, pageWidth - margin - 6, currentY + 14, { align: "right" });

  doc.setFont("times", "bold");
  doc.setTextColor(52, 211, 153); // emerald-400
  doc.text(`Version: ${record.version}  •  Status: ${record.status.toUpperCase()}`, pageWidth - margin - 6, currentY + 20, { align: "right" });

  currentY += titleBoxH + 7;

  // ========================================================
  // 3. GENERATE AND RENDER LEGAL CLAUSES
  // ========================================================
  const clauses: AgreementClauseSection[] = buildAgreementClauses(record);

  for (const clause of clauses) {
    // --- Section Header Banner (Slate-900 Bar with Cyan Indicator) ---
    ensureSpace(13);
    doc.setFillColor(15, 23, 42); // slate-900
    doc.roundedRect(margin, currentY, contentWidth, 7.5, 1.2, 1.2, "F");

    // Cyan left accent marker
    doc.setFillColor(56, 189, 248); // sky-400
    doc.rect(margin, currentY, 3, 7.5, "F");

    doc.setFont("times", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(255, 255, 255);
    doc.text(`${clause.number}.  ${clause.title.toUpperCase()}`, margin + 6, currentY + 5.2);
    currentY += 10.5;

    // ========================================================
    // SECTION 1: PARTIES & CAPACITY (STRUCTURED CARDS)
    // ========================================================
    if (clause.number === "1") {
      // Preamble sentence
      ensureSpace(8);
      doc.setFont("times", "normal");
      doc.setFontSize(9.2);
      doc.setTextColor(30, 41, 59);
      doc.text(
        `This Agreement is entered into and executed as of ${record.project.agreementEffectiveDate} by and between:`,
        margin + 2,
        currentY
      );
      currentY += 5;

      // Party A: Company Card
      ensureSpace(20);
      const companyCardH = 19;
      doc.setFillColor(248, 250, 252); // slate-50
      doc.roundedRect(margin, currentY, contentWidth, companyCardH, 1.5, 1.5, "F");
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.35);
      doc.roundedRect(margin, currentY, contentWidth, companyCardH, 1.5, 1.5, "S");

      doc.setFont("times", "bold");
      doc.setFontSize(7.8);
      doc.setTextColor(100, 116, 139);
      doc.text("PARTY A (THE COMPANY):", margin + 5, currentY + 4.8);

      doc.setFont("times", "bold");
      doc.setFontSize(9.8);
      doc.setTextColor(15, 23, 42);
      doc.text("DEVENGINE TECHNOLOGY OPERATIONS", margin + 5, currentY + 9.8);

      doc.setFont("times", "normal");
      doc.setFontSize(8.2);
      doc.setTextColor(51, 65, 85);
      doc.text(
        `Executive Direction: MD. Abdul Hamim Leon, Chief Executive Officer | Operations: Dhaka, Bangladesh | Web: https://thedevengine.vercel.app`,
        margin + 5,
        currentY + 14.8
      );
      currentY += companyCardH + 4;

      // Party B: Contributor Card - PROMINENTLY HIGHLIGHTED & BOLD
      ensureSpace(25);
      const devCardH = 24;
      doc.setFillColor(240, 249, 255); // sky-50 tint
      doc.roundedRect(margin, currentY, contentWidth, devCardH, 1.5, 1.5, "F");

      doc.setDrawColor(14, 116, 144); // cyan-700 border
      doc.setLineWidth(0.6);
      doc.roundedRect(margin, currentY, contentWidth, devCardH, 1.5, 1.5, "S");

      // Cyan accent bar on left
      doc.setFillColor(14, 116, 144); // cyan-700
      doc.rect(margin, currentY, 2.8, devCardH, "F");

      doc.setFont("times", "bold");
      doc.setFontSize(8);
      doc.setTextColor(14, 116, 144);
      doc.text("PARTY B (THE CONTRIBUTOR / DEVELOPER):", margin + 6, currentY + 5);

      // Contributor Full Name - Bold, Large & Highlighted
      doc.setFont("times", "bold");
      doc.setFontSize(11.5);
      doc.setTextColor(15, 23, 42);
      doc.text(record.developer.fullName.toUpperCase(), margin + 6, currentY + 11);

      if (record.developer.professionalName) {
        const fullNameW = doc.getTextWidth(record.developer.fullName.toUpperCase());
        doc.setFont("times", "italic");
        doc.setFontSize(8.5);
        doc.setTextColor(100, 116, 139);
        doc.text(`(known professionally as "${record.developer.professionalName}")`, margin + 9 + fullNameW, currentY + 11);
      }

      // Contributor Details Grid
      doc.setFont("times", "bold");
      doc.setFontSize(8.2);
      doc.setTextColor(15, 23, 42);
      doc.text("Designated Role:", margin + 6, currentY + 17);
      doc.setFont("times", "normal");
      doc.setTextColor(51, 65, 85);
      doc.text(record.developer.role, margin + 30, currentY + 17);

      doc.setFont("times", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text("Email:", margin + 78, currentY + 17);
      doc.setFont("times", "normal");
      doc.setTextColor(51, 65, 85);
      doc.text(record.developer.email, margin + 89, currentY + 17);

      doc.setFont("times", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text("Phone:", margin + 135, currentY + 17);
      doc.setFont("times", "normal");
      doc.setTextColor(51, 65, 85);
      doc.text(record.developer.phone || "On record", margin + 147, currentY + 17);

      if (record.developer.address) {
        doc.setFont("times", "bold");
        doc.setTextColor(15, 23, 42);
        doc.text("Residential Address:", margin + 6, currentY + 21.5);
        doc.setFont("times", "normal");
        doc.setTextColor(51, 65, 85);
        doc.text(record.developer.address, margin + 34, currentY + 21.5);
      }

      currentY += devCardH + 5;
      continue;
    }

    // ========================================================
    // SECTION 3: PROJECT OVERVIEW & TIMELINE (STRUCTURED SPECS)
    // ========================================================
    if (clause.number === "3") {
      ensureSpace(26);
      const gridH = 22;
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(margin, currentY, contentWidth, gridH, 1.5, 1.5, "F");
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.35);
      doc.roundedRect(margin, currentY, contentWidth, gridH, 1.5, 1.5, "S");

      // Column 1
      doc.setFont("times", "bold");
      doc.setFontSize(7.8);
      doc.setTextColor(100, 116, 139);
      doc.text("PROJECT TITLE:", margin + 5, currentY + 5);
      doc.setFont("times", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      doc.text(record.project.projectName, margin + 5, currentY + 9.8);

      doc.setFont("times", "bold");
      doc.setFontSize(7.8);
      doc.setTextColor(100, 116, 139);
      doc.text("PROJECT NATURE / DOMAIN:", margin + 5, currentY + 15);
      doc.setFont("times", "bold");
      doc.setFontSize(9);
      doc.setTextColor(14, 116, 144);
      doc.text(record.project.projectType || "Full-Stack Web Application", margin + 5, currentY + 19.5);

      // Column 2
      const col2X = margin + 95;
      doc.setFont("times", "bold");
      doc.setFontSize(7.8);
      doc.setTextColor(100, 116, 139);
      doc.text("COMMENCEMENT DATE:", col2X, currentY + 5);
      doc.setFont("times", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      doc.text(record.project.agreementEffectiveDate, col2X, currentY + 9.8);

      doc.setFont("times", "bold");
      doc.setFontSize(7.8);
      doc.setTextColor(100, 116, 139);
      doc.text("TARGET COMPLETION DATE:", col2X, currentY + 15);
      doc.setFont("times", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      doc.text(record.project.expectedCompletionDate || "Per sprint delivery", col2X, currentY + 19.5);

      currentY += gridH + 5;

      // Render Synopsis, scope, and timeline dates with polished word gaps & bold dates
      if (clause.paragraphs) {
        const lineHeight = doc.getLineHeight() / doc.internal.scaleFactor;

        for (const p of clause.paragraphs.slice(2)) {
          // Check for Commencement Date or Anticipated Target Completion -> bold the date!
          const dateMatch = p.match(/^(Commencement Date|Anticipated Target Completion):\s*(.*)$/);
          if (dateMatch) {
            ensureSpace(7);
            doc.setFont("times", "normal");
            doc.setFontSize(9.2);
            doc.setTextColor(51, 65, 85);
            const label = `${dateMatch[1]}: `;
            doc.text(label, margin, currentY + 3.2);

            const labelW = doc.getTextWidth(label);
            doc.setFont("times", "bold");
            doc.setTextColor(15, 23, 42); // bold dark slate date!
            doc.text(dateMatch[2], margin + labelW, currentY + 3.2);
            currentY += 5.5;
            continue;
          }

          // Check for Project Synopsis: bold the label
          const synopsisMatch = p.match(/^(Project Synopsis:)\s*(.*)$/);
          if (synopsisMatch) {
            const prefix = synopsisMatch[1] + " ";
            const body = synopsisMatch[2];
            const estLines = doc.splitTextToSize(p, contentWidth).length;
            const pHeight = estLines * lineHeight;
            ensureSpace(pHeight + 3);

            doc.setTextColor(30, 41, 59);
            const renderedH = renderJustifiedText(doc, body, margin, currentY + 3.2, contentWidth, lineHeight, prefix);
            currentY += renderedH + 3.2;
            continue;
          }

          // Standard paragraph in Section 3 (Justified without rivering)
          doc.setFont("times", "normal");
          doc.setFontSize(9.2);
          doc.setTextColor(30, 41, 59);
          const lines = doc.splitTextToSize(p, contentWidth);
          const pHeight = lines.length * lineHeight;
          ensureSpace(pHeight + 3);

          const renderedH = renderJustifiedText(doc, p, margin, currentY + 3.2, contentWidth, lineHeight);
          currentY += renderedH + 3.2;
        }
      }
      currentY += 2;
      continue;
    }

    // ========================================================
    // STANDARD CLAUSES WITH BOLD TITLES & JUSTIFIED PARAGRAPHS
    // ========================================================
    if (clause.paragraphs) {
      const lineHeight = doc.getLineHeight() / doc.internal.scaleFactor;

      for (const p of clause.paragraphs) {
        // Check if paragraph starts with a subclause label like "5.1 Title: Body"
        const subMatch = p.match(/^(\d+\.\d+\s+[^:]+:)\s*(.*)$/);

        if (subMatch) {
          const prefix = subMatch[1];
          const body = subMatch[2];

          // Draw bold title line in Times Bold
          ensureSpace(10);
          doc.setFont("times", "bold");
          doc.setFontSize(9.5);
          doc.setTextColor(15, 23, 42); // slate-900
          doc.text(prefix, margin, currentY + 3.2);
          currentY += 4.8;

          // Draw justified body text without rivering
          doc.setFont("times", "normal");
          doc.setFontSize(9.2);
          doc.setTextColor(30, 41, 59);

          const lines = doc.splitTextToSize(body, contentWidth);
          const pHeight = lines.length * lineHeight;
          ensureSpace(pHeight + 3);

          const renderedH = renderJustifiedText(doc, body, margin, currentY + 3.2, contentWidth, lineHeight);
          currentY += renderedH + 3.2;
        } else {
          // Standard text paragraph (Justified across full width without rivering)
          doc.setFont("times", "normal");
          doc.setFontSize(9.2);
          doc.setTextColor(30, 41, 59);

          const lines = doc.splitTextToSize(p, contentWidth);
          const pHeight = lines.length * lineHeight;
          ensureSpace(pHeight + 3);

          const renderedH = renderJustifiedText(doc, p, margin, currentY + 3.2, contentWidth, lineHeight);
          currentY += renderedH + 3.2;
        }
      }
    }

    // ========================================================
    // TABLE DATA (DELIVERABLES & MILESTONES) IN TIMES FONT
    // ========================================================
    if (clause.tableData && clause.tableData.rows.length > 0) {
      ensureSpace(22);
      const headers = clause.tableData.headers;
      const rows = clause.tableData.rows;

      const colCount = headers.length;
      // Precision widths fitting exactly contentWidth (180mm)
      const colWidths =
        colCount === 6
          ? [8, 38, 50, 44, 18, 22] // Deliverables table
          : [12, 36, 50, 44, 20, 18]; // Milestones table

      // Function to draw header row with dark executive background
      const drawTableHeader = () => {
        doc.setFillColor(15, 23, 42); // slate-900
        doc.rect(margin, currentY, contentWidth, 7, "F");

        doc.setFont("times", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(255, 255, 255);

        let colX = margin;
        for (let i = 0; i < colCount; i++) {
          const w = colWidths[i] || contentWidth / colCount;
          doc.text(headers[i], colX + 2, currentY + 4.8);
          colX += w;
        }
        currentY += 7;
      };

      drawTableHeader();

      for (let rIdx = 0; rIdx < rows.length; rIdx++) {
        const row = rows[rIdx];

        // Measure line count per cell
        let maxLines = 1;
        const cellLinesArray: string[][] = [];
        for (let i = 0; i < colCount; i++) {
          const w = colWidths[i] || contentWidth / colCount;
          const text = row[i] || "";
          doc.setFont("times", i === 1 ? "bold" : "normal");
          doc.setFontSize(7.5);
          const lines = doc.splitTextToSize(text, w - 4);
          cellLinesArray.push(lines);
          if (lines.length > maxLines) maxLines = lines.length;
        }

        const rowH = Math.max(7.2, maxLines * 3.8 + 3);

        ensureSpace(rowH, () => {
          drawTableHeader();
        });

        // Alternating zebra fill
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

          // Deliverable title, priority, and deadline are bold
          if (i === 1) {
            doc.setFont("times", "bold");
            doc.setTextColor(15, 23, 42); // slate-900
          } else if (i === 4) {
            doc.setFont("times", "bold");
            doc.setTextColor(14, 116, 144); // cyan-700
          } else if (i === 5) {
            doc.setFont("times", "bold");
            doc.setTextColor(30, 41, 59);
          } else {
            doc.setFont("times", "normal");
            doc.setTextColor(51, 65, 85);
          }

          doc.setFontSize(7.5);
          doc.text(lines, cellX + 2, currentY + 4.5);
          cellX += w;
        }
        currentY += rowH;
      }
      currentY += 5;
    }
  }

  // ========================================================
  // 4. FORMAL SIGNATURE SECTION
  // ========================================================
  const sigBoxHeight = 54;
  ensureSpace(sigBoxHeight + 6);

  doc.setFillColor(248, 250, 252); // slate-50
  doc.roundedRect(margin, currentY, contentWidth, sigBoxHeight, 2, 2, "F");

  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);
  doc.roundedRect(margin, currentY, contentWidth, sigBoxHeight, 2, 2, "S");

  doc.setFont("times", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(
    "IN WITNESS WHEREOF, the Parties have executed this Agreement as of the Effective Date.",
    margin + 6,
    currentY + 7
  );

  const halfW = (contentWidth - 16) / 2;
  const leftX = margin + 6;
  const rightX = margin + 6 + halfW + 4;
  const sigStartY = currentY + 12;

  // --- Left: For DevEngine (CEO Signature) ---
  doc.setFont("times", "bold");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text("FOR AND ON BEHALF OF DEVENGINE:", leftX, sigStartY);

  if (assets.signatureBase64) {
    try {
      doc.addImage(assets.signatureBase64, "PNG", leftX + 2, sigStartY + 2, 38, 14);
    } catch {
      doc.setFont("times", "italic");
      doc.text("[MD. Abdul Hamim Leon — Authorized Signature]", leftX + 2, sigStartY + 10);
    }
  } else {
    doc.setFont("times", "italic");
    doc.text("[MD. Abdul Hamim Leon — Authorized Signature]", leftX + 2, sigStartY + 10);
  }

  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.3);
  doc.line(leftX, sigStartY + 21, leftX + halfW - 4, sigStartY + 21);

  doc.setFont("times", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(record.devengine.ceoName, leftX, sigStartY + 26);

  doc.setFont("times", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`${record.devengine.ceoTitle}, DevEngine`, leftX, sigStartY + 30);

  doc.setFont("times", "bold");
  doc.setTextColor(30, 41, 59);
  doc.text(`Date Executed: ${record.project.agreementEffectiveDate}`, leftX, sigStartY + 34.5);

  // --- Right: For Contributor (Developer Signature Area with Highlight) ---
  doc.setFont("times", "bold");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text("FOR AND ON BEHALF OF CONTRIBUTOR:", rightX, sigStartY);

  // Signature line
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.3);
  doc.line(rightX, sigStartY + 21, rightX + halfW - 4, sigStartY + 21);

  // Contributor Name - BOLD & HIGHLIGHTED
  doc.setFont("times", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(14, 116, 144); // cyan-700
  doc.text(record.developer.fullName.toUpperCase(), rightX, sigStartY + 26);

  doc.setFont("times", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Designation: ${record.developer.role || "Developer"}`, rightX, sigStartY + 30);

  doc.setFont("times", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text(`Date: ________________________`, rightX, sigStartY + 34.5);

  currentY += sigBoxHeight + 7;

  // ========================================================
  // 5. RUNNING FOOTERS ON ALL PAGES
  // ========================================================
  const totalPages = doc.getNumberOfPages();

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    doc.setPage(pageNum);

    const footerY = pageHeight - margin + 2;

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.35);
    doc.line(margin, footerY - 4.5, pageWidth - margin, footerY - 4.5);

    // Left: Brand and Vercel URL
    doc.setFont("times", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text("DEVENGINE", margin, footerY);

    doc.setFont("times", "normal");
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(" • https://thedevengine.vercel.app", margin + 17, footerY);

    // Center: Confidential Notice
    doc.setFont("times", "bold");
    doc.setFontSize(6.8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      "CONFIDENTIAL & PROPRIETARY CONTRACT",
      pageWidth / 2 + 10,
      footerY,
      { align: "center" }
    );

    // Right: Page Number
    doc.setFont("times", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);
    doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth - margin, footerY, { align: "right" });
  }

  const filename = `${record.agreementNumber}_${record.project.projectName.replace(
    /[^a-zA-Z0-9_-]/g,
    "_"
  )}.pdf`;

  if (options.download) {
    doc.save(filename);
  }

  let blob: Blob | undefined = undefined;
  if (options.returnBlob) {
    blob = doc.output("blob");
  }

  return { blob, filename };
}
