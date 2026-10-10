import { jsPDF } from "jspdf";
import { AgreementAddendumRecord, AgreementRecord } from "@/types/agreement";

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

export interface GenerateAddendumPdfOptions {
  download?: boolean;
  returnBlob?: boolean;
}

export async function generateAddendumPdf(
  addendum: AgreementAddendumRecord,
  parentAgreement?: AgreementRecord | null,
  options: GenerateAddendumPdfOptions = { download: true }
): Promise<{ doc: jsPDF; blob?: Blob }> {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  const bottomMarginLimit = pageHeight - 18;

  const { logoBase64, signatureBase64 } = await getBrandAssets();

  let currentY = 12;

  const addHeaderOnNewPage = () => {
    doc.addPage();
    currentY = 14;
    // Running header
    doc.setFont("times", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(140, 150, 165);
    doc.text(
      `ADDENDUM REF: ${addendum.addendumNumber} • PRINCIPAL: ${addendum.parentAgreementNumber}`,
      margin,
      currentY
    );
    doc.text("CONFIDENTIAL CONTRACT AMENDMENT", pageWidth - margin, currentY, { align: "right" });
    doc.setDrawColor(220, 226, 235);
    doc.setLineWidth(0.3);
    doc.line(margin, currentY + 2, pageWidth - margin, currentY + 2);
    currentY += 8;
  };

  const ensureSpace = (requiredMm: number) => {
    if (currentY + requiredMm > bottomMarginLimit) {
      addHeaderOnNewPage();
    }
  };

  // -------------------------------------------------------------
  // PAGE 1: HEADER & METADATA
  // -------------------------------------------------------------
  // Dedicated metadata top ribbon
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, currentY, contentWidth, 7, "F");
  doc.setFont("times", "bold");
  doc.setFontSize(7.2);
  doc.setTextColor(15, 23, 42);
  doc.text(`ADDENDUM REF: ${addendum.addendumNumber || "DRAFT"}`, margin + 3, currentY + 4.8);
  doc.text(`EFFECTIVE DATE: ${addendum.effectiveDate || "Pending"}`, margin + 65, currentY + 4.8);
  doc.text(`STATUS: ${(addendum.status || "DRAFT").toUpperCase()}`, pageWidth - margin - 3, currentY + 4.8, { align: "right" });

  currentY += 10;

  // Logo / Brand
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, "PNG", margin, currentY, 36, 12);
    } catch {
      doc.setFont("times", "bold");
      doc.setFontSize(16);
      doc.setTextColor(14, 165, 233);
      doc.text("DEVENGINE", margin, currentY + 7);
    }
  } else {
    doc.setFont("times", "bold");
    doc.setFontSize(16);
    doc.setTextColor(14, 165, 233);
    doc.text("DEVENGINE", margin, currentY + 7);
  }

  // Company Contact block
  doc.setFont("times", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text("DevEngine Ltd. • Contract Governance", pageWidth - margin, currentY + 3, { align: "right" });
  doc.text("governance@devengine.net • www.devengine.net", pageWidth - margin, currentY + 7, { align: "right" });

  currentY += 15;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 6;

  // Title Card
  doc.setFont("times", "bold");
  doc.setFontSize(15);
  doc.setTextColor(15, 23, 42);
  doc.text("FORMAL CONTRACT ADDENDUM & AMENDMENT", margin, currentY);
  currentY += 5;

  doc.setFont("times", "italic");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(
    `Modifying Principal Agreement [${addendum.parentAgreementNumber}] — ${addendum.projectTitle}`,
    margin,
    currentY
  );
  currentY += 8;

  // Summary Specs Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, currentY, contentWidth, 20, 1.5, 1.5, "FD");

  doc.setFont("times", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text("PARENT CONTRACT ID:", margin + 4, currentY + 5.5);
  doc.text("PROJECT TITLE:", margin + 65, currentY + 5.5);
  doc.text("CONTRIBUTOR / COUNTERPARTY:", margin + 125, currentY + 5.5);

  doc.setFont("times", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(addendum.parentAgreementNumber, margin + 4, currentY + 10.5);

  const projLines = doc.splitTextToSize(addendum.projectTitle || "N/A", 55);
  doc.text(projLines[0] || "", margin + 65, currentY + 10.5);

  const partyLines = doc.splitTextToSize(addendum.contributorName || "N/A", 50);
  doc.text(partyLines[0] || "", margin + 125, currentY + 10.5);

  doc.setFont("times", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Addendum Effective Date: ${addendum.effectiveDate}`, margin + 4, currentY + 16);
  doc.text(`Total Amended Clauses: ${addendum.amendedClauses?.length || 0}`, margin + 65, currentY + 16);

  currentY += 25;

  // Section 1: RECITALS & PURPOSE
  ensureSpace(20);
  doc.setFont("times", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text("SECTION 1: RECITALS & INTENT", margin, currentY);
  currentY += 4.5;

  const recitalsText =
    `WHEREAS, DevEngine Ltd. and Contributor ("${addendum.contributorName}") entered into a Principal Agreement designated under Reference Number ${addendum.parentAgreementNumber} (the "Principal Agreement"); and ` +
    `WHEREAS, the parties desire to amend specific terms and covenants of said Principal Agreement as set forth herein without terminating or invalidating the remainder thereof; ` +
    `NOW, THEREFORE, in consideration of the mutual covenants herein contained and other good and valuable consideration, the receipt and sufficiency of which are hereby acknowledged, the parties agree as follows:`;

  doc.setFont("times", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  const recLines = doc.splitTextToSize(recitalsText, contentWidth);
  for (const line of recLines) {
    ensureSpace(4.5);
    doc.text(line, margin, currentY);
    currentY += 4.2;
  }
  currentY += 4;

  // Section 2: OPERATIVE AMENDMENTS
  ensureSpace(20);
  doc.setFont("times", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text("SECTION 2: OPERATIVE AMENDMENTS & REPLACEMENT CLAUSES", margin, currentY);
  currentY += 5;

  if (!addendum.amendedClauses || addendum.amendedClauses.length === 0) {
    doc.setFont("times", "italic");
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text("No clauses specified for amendment.", margin, currentY);
    currentY += 8;
  } else {
    for (let i = 0; i < addendum.amendedClauses.length; i++) {
      const clause = addendum.amendedClauses[i];
      ensureSpace(35);

      // Clause header banner
      doc.setFillColor(241, 245, 249);
      doc.setDrawColor(203, 213, 225);
      doc.rect(margin, currentY, contentWidth, 6, "FD");

      doc.setFont("times", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text(
        `Amendment Item 2.${i + 1}: ${clause.clauseTitle} [Clause ID: ${clause.clauseId}]`,
        margin + 2.5,
        currentY + 4.2
      );
      currentY += 8.5;

      // Commercial Rationale if present
      if (clause.rationale) {
        ensureSpace(8);
        doc.setFont("times", "bolditalic");
        doc.setFontSize(7.8);
        doc.setTextColor(71, 85, 105);
        doc.text(`Amendment Rationale: ${clause.rationale}`, margin + 2, currentY);
        currentY += 4.5;
      }

      // Original text box (Previous provision)
      ensureSpace(16);
      doc.setFont("times", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(153, 27, 27); // Dark red
      doc.text("PREVIOUS / SUPERSIDED PROVISION:", margin + 2, currentY);
      currentY += 3.5;

      doc.setFont("times", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      const origLines = doc.splitTextToSize(clause.originalText || "(Original text omitted)", contentWidth - 4);
      for (const line of origLines) {
        ensureSpace(4);
        doc.text(line, margin + 2, currentY);
        currentY += 3.8;
      }
      currentY += 3;

      // Replacement text box (Amended provision)
      ensureSpace(18);
      doc.setFont("times", "bold");
      doc.setFontSize(7.8);
      doc.setTextColor(22, 101, 52); // Dark green
      doc.text("REPLACEMENT & AMENDED PROVISION (IN EFFECT):", margin + 2, currentY);
      currentY += 3.5;

      doc.setFont("times", "normal");
      doc.setFontSize(8.2);
      doc.setTextColor(15, 23, 42);
      const repLines = doc.splitTextToSize(clause.replacementText, contentWidth - 4);
      for (const line of repLines) {
        ensureSpace(4.2);
        doc.text(line, margin + 2, currentY);
        currentY += 4;
      }
      currentY += 5;

      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.2);
      doc.line(margin, currentY, pageWidth - margin, currentY);
      currentY += 5;
    }
  }

  // Section 3: UNCHANGED PROVISIONS AFFIRMATION
  ensureSpace(25);
  doc.setFont("times", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text("SECTION 3: RATIFICATION OF UNCHANGED PROVISIONS", margin, currentY);
  currentY += 4.5;

  const unchangedText =
    addendum.unchangedAffirmation ||
    "Except as specifically amended and modified by this Addendum, all terms, conditions, warranties, and obligations of the Principal Agreement remain unaltered, in full force and effect, and are hereby expressly ratified and confirmed by both parties.";

  doc.setFont("times", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  const unLines = doc.splitTextToSize(unchangedText, contentWidth);
  for (const line of unLines) {
    ensureSpace(4.2);
    doc.text(line, margin, currentY);
    currentY += 4;
  }
  currentY += 5;

  // Section 4: PRECEDENCE CLAUSE
  ensureSpace(25);
  doc.setFont("times", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text("SECTION 4: PRECEDENCE OVER CONFLICTING PROVISIONS", margin, currentY);
  currentY += 4.5;

  const precedenceText =
    addendum.precedenceClause ||
    "In the event of any direct inconsistency, ambiguity, or conflict between the provisions of this Addendum and the provisions of the Principal Agreement (or any prior amendments), the express provisions of this Addendum shall prevail, govern, and control.";

  doc.setFont("times", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  const precLines = doc.splitTextToSize(precedenceText, contentWidth);
  for (const line of precLines) {
    ensureSpace(4.2);
    doc.text(line, margin, currentY);
    currentY += 4;
  }
  currentY += 8;

  // Section 5: SIGNATURE & EXECUTION BLOCK
  ensureSpace(48);
  doc.setFont("times", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text("SECTION 5: SIGNATURES & RATIFICATION", margin, currentY);
  currentY += 5;

  const colWidth = (contentWidth - 8) / 2;
  const col1X = margin;
  const col2X = margin + colWidth + 8;
  const signBoxH = 34;

  // Box 1: DevEngine Signatory
  doc.setFillColor(250, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(col1X, currentY, colWidth, signBoxH, 1.5, 1.5, "FD");

  doc.setFont("times", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text("FOR DEVENGINE LTD. (OPERATING ENTITY):", col1X + 3, currentY + 5);

  if (signatureBase64) {
    try {
      doc.addImage(signatureBase64, "PNG", col1X + 4, currentY + 7, 28, 11);
    } catch {
      doc.setFont("times", "italic");
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text("Hamim Leon", col1X + 4, currentY + 16);
    }
  } else {
    doc.setFont("times", "italic");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text("Hamim Leon", col1X + 4, currentY + 16);
  }

  doc.setFont("times", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text("Hamim Leon", col1X + 3, currentY + 23);
  doc.setFont("times", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text("Founder & Chief Architect", col1X + 3, currentY + 27);
  doc.text(`Execution Date: ${addendum.executedAt || addendum.effectiveDate}`, col1X + 3, currentY + 31);

  // Box 2: Contributor Signatory
  doc.setFillColor(250, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(col2X, currentY, colWidth, signBoxH, 1.5, 1.5, "FD");

  doc.setFont("times", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text("ACCEPTED & AGREED BY CONTRIBUTOR:", col2X + 3, currentY + 5);

  doc.setFont("times", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(addendum.contributorName, col2X + 3, currentY + 23);
  doc.setFont("times", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text("Counterparty / Contributor", col2X + 3, currentY + 27);
  doc.text(`Execution Date: ${addendum.executedAt || addendum.effectiveDate}`, col2X + 3, currentY + 31);

  // -------------------------------------------------------------
  // RUNNING FOOTERS WITH TOTAL PAGE COUNT
  // -------------------------------------------------------------
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont("times", "normal");
    doc.setFontSize(7.2);
    doc.setTextColor(140, 150, 165);
    doc.text(
      `ADDENDUM REF: ${addendum.addendumNumber || "DRAFT"} • PRINCIPAL: ${addendum.parentAgreementNumber}`,
      margin,
      pageHeight - 9
    );
    doc.text(
      `Page ${p} of ${totalPages}`,
      pageWidth - margin,
      pageHeight - 9,
      { align: "right" }
    );
  }

  if (options.download && typeof window !== "undefined") {
    const filename = `${addendum.addendumNumber || "Addendum"}_${addendum.parentAgreementNumber || "Agreement"}.pdf`;
    doc.save(filename);
  }

  let blob: Blob | undefined;
  if (options.returnBlob) {
    blob = doc.output("blob");
  }

  return { doc, blob };
}
