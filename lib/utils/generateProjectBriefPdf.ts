import { jsPDF, GState } from "jspdf";
import { briefMoney, briefTotals, type ProjectBriefDocument, type ProjectBriefPublisher } from "@/lib/services/projectBriefService";

type Ink = [number, number, number];
const INK: Ink = [24, 36, 54], MUTED: Ink = [83, 99, 119], LINE: Ink = [218, 226, 234], BRAND: Ink = [44, 236, 247];
const FONT = "BriefTimesNewRoman", MM_PER_PT = 25.4 / 72;
let assetsPromise: Promise<{ regular: string; bold: string; italic: string; logo: string }> | undefined;
async function base64Asset(path: string) {
  const response = await fetch(path);
  if (!response.ok) throw new Error("PDF brand assets could not load. Please try again.");
  const bytes = new Uint8Array(await response.arrayBuffer());
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 8192) binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
  return btoa(binary);
}
function assets() {
  if (!assetsPromise) assetsPromise = Promise.all([
    base64Asset("/fonts/pdf/TimesNewRoman.ttf"), base64Asset("/fonts/pdf/TimesNewRoman-Bold.ttf"),
    base64Asset("/fonts/pdf/TimesNewRoman-Italic.ttf"), base64Asset("/assets/DevEngine-logo-on-light1.png"),
  ]).then(([regular, bold, italic, logo]) => ({ regular, bold, italic, logo: `data:image/png;base64,${logo}` })).catch(error => { assetsPromise = undefined; throw error; });
  return assetsPromise;
}
const clean = (value: string) => String(value || "").replace(/\r\n?/g, "\n").replace(/\t/g, "    ").replace(/[\u00a0\u202f]/g, " ").replace(/[\u2011\u2012\u2013\u2014]/g, "-");

/** All text and table cells are measured in the embedded Times New Roman font before drawing. */
export async function generateProjectBriefPdf(brief: ProjectBriefDocument, publisher: ProjectBriefPublisher) {
  const loaded = await assets();
  const pdf = new jsPDF({ unit: "mm", format: "a4", compress: true, putOnlyUsedFonts: true });
  for (const [filename, data, style] of [["TimesNewRoman.ttf", loaded.regular, "normal"], ["TimesNewRoman-Bold.ttf", loaded.bold, "bold"], ["TimesNewRoman-Italic.ttf", loaded.italic, "italic"]] as const) {
    pdf.addFileToVFS(filename, data); pdf.addFont(filename, FONT, style);
  }
  pdf.setProperties({ title: brief.title, subject: "Project overview and budget", author: publisher.developerName, creator: publisher.companyName });
  const left = 18, pageWidth = 210, width = pageWidth - left * 2, bottom = 274;
  let y = 0, contentTop = 0;
  function font(size: number, style = "normal", ink: Ink = INK) { pdf.setFont(FONT, style); pdf.setFontSize(size); pdf.setTextColor(...ink); }
  function wrap(value: string, available: number, size: number, style = "normal"): string[] {
    font(size, style);
    return pdf.splitTextToSize(clean(value), available) as string[];
  }
  function clippedLines(value: string, available: number, size: number, style: string, maxLines: number) {
    const lines = wrap(value, available, size, style);
    if (lines.length <= maxLines) return lines;
    const result = lines.slice(0, maxLines);
    let tail = result[maxLines - 1];
    while (tail && pdf.getTextWidth(`${tail}...`) > available) tail = tail.slice(0, -1);
    result[maxLines - 1] = `${tail}...`;
    return result;
  }
  function positioned(value: string, x: number, top: number, available: number, size: number, style = "normal", ink: Ink = INK, maxLines = 3) {
    const lines = clippedLines(value, available, size, style, maxLines); font(size, style, ink);
    const height = size * MM_PER_PT * 1.4;
    lines.forEach((line, index) => pdf.text(line, x, top + size * MM_PER_PT + index * height));
    return top + lines.length * height;
  }
  const image = pdf.getImageProperties(loaded.logo);
  const ratio = image.width / image.height;
  function pageHeader(firstPage = false) {
    pdf.saveGraphicsState(); pdf.setGState(new GState({ opacity: 0.04 }));
    const markWidth = Math.min(140, 80 * ratio), markHeight = markWidth / ratio;
    pdf.addImage(loaded.logo, "PNG", (pageWidth - markWidth) / 2, (297 - markHeight) / 2, markWidth, markHeight, "brief-logo", "FAST");
    pdf.restoreGraphicsState();
    if (!firstPage) { contentTop = left; y = contentTop; return; }
    const logoWidth = Math.min(43, 14 * ratio), logoHeight = logoWidth / ratio;
    pdf.addImage(loaded.logo, "PNG", left, 15, logoWidth, logoHeight, "brief-logo", "FAST");
    let companyY = 15 + logoHeight + 3;
    companyY = positioned(publisher.companyName, left, companyY, 91, 10.5, "bold");
    for (const value of [publisher.companyAddress, publisher.companyEmail, publisher.companyWebsite, publisher.companyPhone].filter(Boolean)) companyY = positioned(value, left, companyY + .6, 91, 8.8, "normal", MUTED, 2);
    const right = 126, rightWidth = 66;
    let developerY = positioned("PREPARED BY", right, 15, rightWidth, 8.5, "bold", MUTED, 1);
    developerY = positioned(publisher.developerName, right, developerY + 3, rightWidth, 12, "bold", INK, 3);
    developerY = positioned(publisher.developerTitle, right, developerY + 1, rightWidth, 9.3, "normal", MUTED, 3);
    for (const value of [publisher.developerEmail, publisher.developerWebsite].filter(Boolean)) developerY = positioned(value, right, developerY + 2, rightWidth, 8.8, "normal", MUTED, 3);
    const dividerY = Math.max(companyY, developerY) + 6;
    pdf.setDrawColor(...LINE); pdf.setLineWidth(.3); pdf.line(left, dividerY, pageWidth - left, dividerY);
    pdf.setDrawColor(...BRAND); pdf.setLineWidth(.9); pdf.line(left, dividerY, left + 24, dividerY);
    contentTop = dividerY + 9; y = contentTop;
  }
  function nextPage() { pdf.addPage(); pageHeader(); }
  function reserve(height: number) { if (y + height > bottom) nextPage(); }
  function paragraph(value: string, size = 11, style = "normal", ink: Ink = INK, continuation?: string) {
    const lines = wrap(value, width, size, style); const lineHeight = size * MM_PER_PT * 1.48;
    for (const line of lines) {
      if (y + lineHeight > bottom) {
        nextPage();
        if (continuation) { positioned(`${continuation} (continued)`, left, y, width, 9, "italic", MUTED, 1); y += 8; }
      }
      font(size, style, ink); pdf.text(line, left, y + size * MM_PER_PT); y += lineHeight;
    }
    y += 3;
  }
  let sectionNumber = 0;
  function heading(title: string) {
    reserve(23); y += 4; sectionNumber++;
    pdf.setFillColor(...BRAND); pdf.roundedRect(left, y, 8, 7, 1.2, 1.2, "F");
    font(9, "bold"); pdf.text(String(sectionNumber).padStart(2, "0"), left + 4, y + 4.8, { align: "center" });
    positioned(title, left + 12, y - .3, width - 12, 13, "bold", INK, 2); y += 12;
  }
  function section(title: string, value: string) { if (value.trim()) { heading(title); paragraph(value.trim(), 11, "normal", INK, title); } }
  function table(headers: string[], rows: string[][], widths: number[], { highlightLast = false }: { highlightLast?: boolean } = {}) {
    const padding = 3, size = 9.6, lineHeight = size * MM_PER_PT * 1.42;
    function paint(cells: string[][], offset: number, count: number, rowHeight: number, fill: Ink, bold = false) {
      pdf.setFillColor(...fill); pdf.rect(left, y, width, rowHeight, "F");
      let x = left;
      cells.forEach((cell, index) => {
        font(size, bold ? "bold" : "normal");
        cell.slice(offset, offset + count).forEach((line, lineIndex) => {
          // Numeric cells have their own measured column and never intrude on adjacent text.
          const rightAligned = index > 0 && index === cells.length - 1;
          pdf.text(line, rightAligned ? x + widths[index] - padding : x + padding, y + padding + size * MM_PER_PT + lineIndex * lineHeight, { align: rightAligned ? "right" : "left" });
        });
        x += widths[index];
      });
      pdf.setDrawColor(...LINE); pdf.setLineWidth(.2); pdf.line(left, y + rowHeight, left + width, y + rowHeight);
      y += rowHeight;
    }
    const headerCells = headers.map((cell, index) => wrap(cell, widths[index] - padding * 2, size, "bold"));
    const headerLines = Math.max(...headerCells.map(cell => cell.length)), headerHeight = headerLines * lineHeight + padding * 2;
    function tableHeader() { paint(headerCells, 0, headerLines, headerHeight, [239, 245, 249], true); }
    reserve(headerHeight + 20); tableHeader();
    rows.forEach((row, rowIndex) => {
      const bold = highlightLast && rowIndex === rows.length - 1;
      const cells = row.map((cell, index) => wrap(cell, widths[index] - padding * 2, size, bold ? "bold" : "normal"));
      const lineCount = Math.max(1, ...cells.map(cell => cell.length));
      const fullHeight = lineCount * lineHeight + padding * 2;
      const freshCapacity = bottom - left - headerHeight;
      if (fullHeight <= freshCapacity && y + fullHeight > bottom) { nextPage(); tableHeader(); }
      let offset = 0;
      while (offset < lineCount) {
        let available = Math.floor((bottom - y - padding * 2) / lineHeight);
        if (available < 1) { nextPage(); tableHeader(); available = Math.floor((bottom - y - padding * 2) / lineHeight); }
        const count = Math.min(lineCount - offset, available);
        const fill: Ink = bold ? [219, 252, 254] : rowIndex % 2 ? [248, 250, 252] : [255, 255, 255];
        paint(cells, offset, count, count * lineHeight + padding * 2, fill, bold);
        offset += count;
        if (offset < lineCount) { nextPage(); tableHeader(); }
      }
    });
    y += 6;
  }
  pageHeader(true);
  paragraph("PROJECT OVERVIEW & BUDGET", 9, "bold", MUTED);
  paragraph(brief.title, 23, "bold");
  const date = new Date(brief.updatedAt);
  const updated = Number.isNaN(date.getTime()) ? "Not specified" : date.toLocaleDateString("en", { year: "numeric", month: "long", day: "numeric" });
  table(["Prepared for", "Document details"], [[[brief.client, brief.clientEmail ? `Email: ${brief.clientEmail}` : "", brief.clientPhone ? `Phone: ${brief.clientPhone}` : ""].filter(Boolean).join("\n"), `${brief.status === "ready" ? "Prepared overview" : "Draft for discussion"}\nUpdated ${updated}\nCurrency: ${brief.currency}`]], [99, 75]);
  section("Project overview", brief.overview); section("Goals & success criteria", brief.objectives);
  section("Technology & architecture", brief.technology); section("Delivery plan", brief.deliveryPlan);
  section("Timeline", brief.timeline); section("Deliverables", brief.deliverables);
  heading("Budget breakdown");
  const billing = { one_time: "One-time", monthly: "Monthly", yearly: "Yearly" };
  table(["#", "Scope / cost item", "Qty", "Unit cost", "Billing", "Estimate"], brief.costs.map((item, index) => [String(index + 1), item.title, String(item.quantity), briefMoney(item.amount, brief.currency), billing[item.period], briefMoney(item.amount * item.quantity, brief.currency)]), [9, 49, 13, 34, 25, 44]);
  const totals = briefTotals(brief);
  heading("Investment summary");
  table(["Cost category", `Estimate (${brief.currency})`], [
    ["One-time investment", briefMoney(totals.oneTime, brief.currency)], ["Monthly recurring services", briefMoney(totals.monthly, brief.currency)],
    ["Annual recurring services", briefMoney(totals.yearly, brief.currency)], ["Estimated first-year investment", briefMoney(totals.firstYear, brief.currency)],
  ], [108, 66], { highlightLast: true });
  paragraph("First-year estimate includes one-time costs, 12 months of monthly services and annual services. Confirm third-party prices and applicable taxes before approval.", 9.5, "italic", MUTED);
  section("Assumptions & exclusions", brief.assumptions); section("Payment terms", brief.paymentTerms);
  section("Next steps", "Review the scope, timing and budget together before starting. This preliminary estimate is for discussion; a signed agreement confirms the final commitment.");
  const pages = pdf.getNumberOfPages();
  for (let index = 1; index <= pages; index++) {
    pdf.setPage(index); pdf.setDrawColor(...LINE); pdf.setLineWidth(.25); pdf.line(left, 281, left + width, 281);
    positioned(`${publisher.companyName} | Project overview`, left, 284, 130, 8.2, "normal", MUTED, 1);
    font(8.2, "normal", MUTED); pdf.text(`Page ${index} of ${pages}`, pageWidth - left, 287, { align: "right" });
  }
  return { pdf, filename: `${brief.title.replace(/[^a-zA-Z0-9 -]/g, "").trim().replace(/\s+/g, "-") || "Project"}-overview.pdf` };
}
