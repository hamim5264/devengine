// lib/utils/generateCertificatePdf.ts
import { jsPDF } from "jspdf";
import type { EmployeeCertificate } from "@/types/certificate";
import { CERTIFICATE_TYPE_LABELS } from "@/types/certificate";

/**
 * Fetch base64 data for DevEngine logo and CEO signature from API or fallback
 */
async function getBrandAssets(): Promise<{ logoLightBase64: string; signatureBase64: string }> {
  try {
    if (typeof window === "undefined") {
      return { logoLightBase64: "", signatureBase64: "" };
    }
    const res = await fetch("/api/receipt-assets");
    if (!res.ok) throw new Error("Assets API returned non-200");
    const data = await res.json();
    return {
      logoLightBase64: data.logoLightBase64 || data.logoBase64 || "",
      signatureBase64: data.signatureBase64 || "",
    };
  } catch (err) {
    console.warn("[CertificatePdf] Asset fetch fallback:", err);
    return { logoLightBase64: "", signatureBase64: "" };
  }
}

/**
 * Generates an official, high-resolution Landscape A4 Certificate PDF
 */
export async function generateCertificatePdf(cert: EmployeeCertificate): Promise<void> {
  const assets = await getBrandAssets();

  // Create A4 Landscape document (297 x 210 mm)
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = 297;
  const pageHeight = 210;

  // Background surface
  doc.setFillColor(254, 255, 255);
  doc.rect(0, 0, pageWidth, pageHeight, "F");

  // Elegant double borders
  // Outer border - Navy slate
  doc.setDrawColor(20, 30, 48);
  doc.setLineWidth(1.5);
  doc.rect(10, 10, pageWidth - 20, pageHeight - 20);

  // Inner border - Exact Cyan Brand Accent #2cecf7
  doc.setDrawColor(44, 236, 247);
  doc.setLineWidth(0.8);
  doc.rect(13, 13, pageWidth - 26, pageHeight - 26);

  // Corner Accent Quadrants
  const cornerSize = 8;
  doc.setFillColor(44, 236, 247);
  // Top-left
  doc.rect(13, 13, cornerSize, 1.2, "F");
  doc.rect(13, 13, 1.2, cornerSize, "F");
  // Top-right
  doc.rect(pageWidth - 13 - cornerSize, 13, cornerSize, 1.2, "F");
  doc.rect(pageWidth - 14.2, 13, 1.2, cornerSize, "F");
  // Bottom-left
  doc.rect(13, pageHeight - 14.2, cornerSize, 1.2, "F");
  doc.rect(13, pageHeight - 13 - cornerSize, 1.2, cornerSize, "F");
  // Bottom-right
  doc.rect(pageWidth - 13 - cornerSize, pageHeight - 14.2, cornerSize, 1.2, "F");
  doc.rect(pageWidth - 14.2, pageHeight - 13 - cornerSize, 1.2, cornerSize, "F");

  // Header: Logo / Company Name
  const centerX = pageWidth / 2;
  let topY = 25;

  if (assets.logoLightBase64) {
    try {
      // 40mm wide logo
      doc.addImage(assets.logoLightBase64, "PNG", centerX - 22, topY, 44, 12);
      topY += 15;
    } catch {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(15, 23, 42);
      doc.text("DEVENGINE SYSTEMS", centerX, topY + 4, { align: "center" });
      topY += 10;
    }
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42);
    doc.text("DEVENGINE SYSTEMS", centerX, topY + 4, { align: "center" });
    topY += 10;
  }

  // Subtitle
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    "OFFICIAL CORPORATE CREDENTIAL & SERVICE RECORD • VERIFIED AUTHENTIC",
    centerX,
    topY,
    { align: "center" }
  );

  topY += 12;

  // Title: Certificate Heading
  const certTitle = cert.customTitle || CERTIFICATE_TYPE_LABELS[cert.type].toUpperCase();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(19);
  doc.setTextColor(15, 23, 42);
  doc.text(certTitle, centerX, topY, { align: "center" });

  // Cyan divider line under title
  doc.setDrawColor(44, 236, 247);
  doc.setLineWidth(1);
  doc.line(centerX - 45, topY + 3, centerX + 45, topY + 3);

  topY += 14;

  // Salutation / Recipient
  doc.setFont("helvetica", "italic");
  doc.setFontSize(11);
  doc.setTextColor(100, 116, 139);
  doc.text("This official credential is proudly presented to", centerX, topY, { align: "center" });

  topY += 10;

  // Recipient Full Name (Prominent & Distinguished)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(15, 23, 42);
  doc.text(cert.employeeName.toUpperCase(), centerX, topY, { align: "center" });

  topY += 6;

  // Recipient Designation & Role
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(44, 236, 247);
  const designationLine = cert.department
    ? `${cert.employeeRole.toUpperCase()} — ${cert.department.toUpperCase()}`
    : cert.employeeRole.toUpperCase();
  doc.text(designationLine, centerX, topY, { align: "center" });

  topY += 10;

  // Statement / Certificate Body Text (Justified / Centered paragraph)
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(51, 65, 85);

  const bodyText =
    cert.certificateBody ||
    `This is to certify that ${cert.employeeName} served at DevEngine Systems Inc. as ${cert.employeeRole}. During their tenure, they fulfilled organizational responsibilities with high diligence, technical standard, and professional character.`;

  const splitBody = doc.splitTextToSize(bodyText, 210);
  doc.text(splitBody, centerX, topY, { align: "center", lineHeightFactor: 1.4 });

  topY += splitBody.length * 5.2 + 8;

  // Key Metadata Badges / Info Strip
  const badgeBoxY = topY;
  const badgeWidth = 230;
  const badgeHeight = 12;
  const badgeX = (pageWidth - badgeWidth) / 2;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.roundedRect(badgeX, badgeBoxY, badgeWidth, badgeHeight, 3, 3, "FD");

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 116, 139);

  const issueDateFormatted = cert.issuedAt
    ? new Date(cert.issuedAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });

  const col1 = badgeX + 8;
  const col2 = badgeX + 65;
  const col3 = badgeX + 125;
  const col4 = badgeX + 175;

  doc.text("CERTIFICATE NO:", col1, badgeBoxY + 5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  doc.text(cert.certificateNumber, col1, badgeBoxY + 9);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 116, 139);
  doc.text("ISSUE DATE:", col2, badgeBoxY + 5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  doc.text(issueDateFormatted, col2, badgeBoxY + 9);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 116, 139);
  doc.text("PERFORMANCE:", col3, badgeBoxY + 5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  doc.text(cert.performanceRating || "Excellent", col3, badgeBoxY + 9);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 116, 139);
  doc.text("VERIFICATION CODE:", col4, badgeBoxY + 5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  doc.text(cert.verificationCode, col4, badgeBoxY + 9);

  // Footer: Signatory & Seal (placed near bottom)
  const footerY = 165;

  // Left side: Authorized Executive Signature
  const sigX = 40;
  if (assets.signatureBase64) {
    try {
      doc.addImage(assets.signatureBase64, "PNG", sigX, footerY - 14, 38, 14);
    } catch {
      // fallback line
    }
  }

  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.6);
  doc.line(sigX - 5, footerY + 2, sigX + 55, footerY + 2);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(cert.issuedBy || "Hamim Leon", sigX + 25, footerY + 7, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(cert.signatoryTitle || "Chief Executive Officer", sigX + 25, footerY + 11, {
    align: "center",
  });
  doc.text("DevEngine Systems Inc.", sigX + 25, footerY + 15, { align: "center" });

  // Center: Official Digital Seal Emblem
  const sealX = centerX;
  const sealY = footerY + 4;
  doc.setDrawColor(44, 236, 247);
  doc.setLineWidth(1.2);
  doc.circle(sealX, sealY, 12);
  doc.setDrawColor(20, 30, 48);
  doc.setLineWidth(0.5);
  doc.circle(sealX, sealY, 9.5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(5);
  doc.setTextColor(44, 236, 247);
  doc.text("DEVENGINE SYSTEMS", sealX, sealY - 4, { align: "center" });
  doc.setFontSize(7);
  doc.setTextColor(15, 23, 42);
  doc.text("VERIFIED", sealX, sealY + 1, { align: "center" });
  doc.setFontSize(5);
  doc.setTextColor(100, 116, 139);
  doc.text("OFFICIAL SEAL", sealX, sealY + 5, { align: "center" });

  // Right side: Corporate Seal & Verification URL
  const verifyX = pageWidth - 65;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text("AUTHENTICITY VERIFICATION", verifyX, footerY + 2, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text("Scan or verify credentials online at:", verifyX, footerY + 7, { align: "center" });
  doc.setTextColor(44, 236, 247);
  doc.text("thedevengine.vercel.app/verify", verifyX, footerY + 11, { align: "center" });
  doc.setTextColor(100, 116, 139);
  doc.text(`ID: ${cert.verificationCode}`, verifyX, footerY + 15, { align: "center" });

  // Bottom Notice
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `DevEngine Systems Inc. • Corporate HQ: Dhaka, Bangladesh • Issued on ${issueDateFormatted} • Ref: ${cert.certificateNumber}`,
    centerX,
    pageHeight - 16,
    { align: "center" }
  );

  // Trigger browser download
  const safeName = cert.employeeName.replace(/[^a-zA-Z0-9]/g, "_");
  const filename = `${cert.certificateNumber}_${safeName}.pdf`;
  doc.save(filename);
}
