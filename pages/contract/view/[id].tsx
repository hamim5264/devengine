// pages/contract/view/[id].tsx
// ─────────────────────────────────────────────────────────────
// DevEngine Contract Center — Client Document Review & E-Signing Portal
// ─────────────────────────────────────────────────────────────

import React, { useEffect, useState, useRef } from "react";
import Head from "next/head";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/router";
import { useTheme } from "@/context/ThemeContext";
import HeaderControls from "@/components/HeaderControls";
import HelixLoader from "@/components/HelixLoader";
import LandingFooter from "@/components/landing/LandingFooter";
import {
  getQuotationById,
  getNDAById,
  getServiceAgreementById,
  transitionQuotationStatus,
  updateNDA,
  updateServiceAgreement,
} from "@/lib/services/contractCenterService";
import {
  generateQuotationPdf,
  generateNDAPdf,
  generateServiceAgreementPdf,
} from "@/lib/services/ccPdfService";
import type { CCQuotation, CCNDA, CCServiceAgreement } from "@/types/contractCenter";

export default function ClientDocumentReviewPage() {
  const router = useRouter();
  const { id, type = "quotation" } = router.query;
  const { theme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [docData, setDocData] = useState<any>(null);
  const [downloading, setDownloading] = useState(false);

  // Signing state
  const [signerName, setSignerName] = useState("");
  const [signerTitle, setSignerTitle] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [signingSubmitting, setSigningSubmitting] = useState(false);
  const [signedSuccess, setSignedSuccess] = useState(false);

  // HTML5 Canvas signature pad
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const hasDrawnRef = useRef(false);

  useEffect(() => {
    if (!id || typeof id !== "string") return;

    const loadDoc = async () => {
      setLoading(true);
      try {
        if (type === "quotation") {
          const q = await getQuotationById(id);
          setDocData(q);
        } else if (type === "nda") {
          const n = await getNDAById(id);
          setDocData(n);
        } else if (type === "agreement") {
          const a = await getServiceAgreementById(id);
          setDocData(a);
        }
      } catch (err) {
        console.error("Failed to load document:", err);
      } finally {
        setLoading(false);
      }
    };

    loadDoc();
  }, [id, type]);

  // Setup HTML5 signature canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas dimensions to display size scaled for high-DPI screens
    const ratio = typeof window !== "undefined" ? window.devicePixelRatio || 2 : 2;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    ctx.scale(ratio, ratio);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = "#2cecf7"; // DevEngine primary brand cyan

    const getPos = (e: MouseEvent | TouchEvent) => {
      const b = canvas.getBoundingClientRect();
      const clientX = "touches" in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
      return {
        x: clientX - b.left,
        y: clientY - b.top,
      };
    };

    const startDraw = (e: MouseEvent | TouchEvent) => {
      isDrawingRef.current = true;
      hasDrawnRef.current = true;
      const pos = getPos(e);
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    };

    const draw = (e: MouseEvent | TouchEvent) => {
      if (!isDrawingRef.current) return;
      if ("touches" in e) e.preventDefault();
      const pos = getPos(e);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    };

    const stopDraw = () => {
      isDrawingRef.current = false;
    };

    canvas.addEventListener("mousedown", startDraw);
    canvas.addEventListener("mousemove", draw);
    window.addEventListener("mouseup", stopDraw);

    canvas.addEventListener("touchstart", startDraw, { passive: false });
    canvas.addEventListener("touchmove", draw, { passive: false });
    window.addEventListener("touchend", stopDraw);

    return () => {
      canvas.removeEventListener("mousedown", startDraw);
      canvas.removeEventListener("mousemove", draw);
      window.removeEventListener("mouseup", stopDraw);
      canvas.removeEventListener("touchstart", startDraw);
      canvas.removeEventListener("touchmove", draw);
      window.removeEventListener("touchend", stopDraw);
    };
  }, [docData, signedSuccess]);

  const handleClearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasDrawnRef.current = false;
  };

  const handleDownloadPdf = async () => {
    if (!docData) return;
    setDownloading(true);
    try {
      if (type === "quotation") {
        await generateQuotationPdf(docData as CCQuotation, { download: true });
      } else if (type === "nda") {
        await generateNDAPdf(docData as CCNDA, { download: true });
      } else if (type === "agreement") {
        await generateServiceAgreementPdf(docData as CCServiceAgreement, { download: true });
      }
    } catch (err) {
      console.error("Download failed:", err);
      alert("Failed to download PDF.");
    } finally {
      setDownloading(false);
    }
  };

  const handleExecuteSignature = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signerName) {
      alert("Please enter your legal name.");
      return;
    }
    if (!acceptedTerms) {
      alert("Please confirm the agreement terms checkbox.");
      return;
    }
    if (!hasDrawnRef.current) {
      alert("Please draw your signature in the signature frame.");
      return;
    }

    setSigningSubmitting(true);
    try {
      const signedAt = new Date().toISOString();

      if (type === "quotation") {
        await transitionQuotationStatus(
          docData.id,
          "accepted",
          signerName,
          `Quotation accepted electronically by ${signerName} (${signerTitle || "Client Representative"})`
        );
      } else if (type === "nda") {
        await updateNDA(
          docData.id,
          {
            status: "executed",
            executedAt: signedAt,
            executedBy: signerName,
          },
          signerName
        );
      } else if (type === "agreement") {
        await updateServiceAgreement(
          docData.id,
          {
            status: "executed",
            executedAt: signedAt,
            executedBy: signerName,
          },
          signerName
        );
      }

      setSignedSuccess(true);
      if (type === "quotation") {
        const updated = await getQuotationById(docData.id);
        setDocData(updated);
      }
    } catch (err: any) {
      console.error("Signature submission failed:", err);
      alert(err.message || "Failed to submit signature.");
    } finally {
      setSigningSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--devengine-page)] flex flex-col items-center justify-center p-6 text-[var(--devengine-text)]">
        <HelixLoader color="#2cecf7" size={48} text="Loading Secure Document..." />
      </div>
    );
  }

  if (!docData) {
    return (
      <div className="min-h-screen bg-[var(--devengine-page)] flex items-center justify-center text-[var(--devengine-text)] p-4">
        <div className="max-w-md w-full text-center p-8 rounded-2xl bg-[var(--devengine-surface)] border border-[var(--devengine-border)] space-y-4 shadow-xl">
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-rose-400">Document Not Found</h2>
          <p className="text-xs text-[var(--devengine-muted)] leading-relaxed">
            This document reference does not exist or may have expired. Please verify the URL or contact DevEngine support.
          </p>
          <div className="pt-2">
            <Link
              href="/home"
              className="inline-block px-5 py-2.5 rounded-xl text-xs font-semibold bg-[var(--devengine-soft)] hover:bg-[#2cecf7] text-[var(--devengine-text)] hover:text-[#02040a] border border-[var(--devengine-border)] hover:border-[#2cecf7] transition-all"
            >
              Return to Homepage
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isAlreadySigned =
    docData.status === "accepted" ||
    docData.status === "executed" ||
    docData.status === "signed" ||
    signedSuccess;

  return (
    <div className="min-h-screen bg-[var(--devengine-page)] text-[var(--devengine-text)] font-sans antialiased selection:bg-[#2cecf7]/30 selection:text-[#2cecf7] flex flex-col justify-between">
      <Head>
        <title>
          {docData.quotationNumber || docData.ndaNumber || docData.agreementNumber || "Contract Document"} — DevEngine
        </title>
      </Head>

      {/* Top Banner & Header */}
      <header className="border-b border-[var(--devengine-border)] bg-[var(--devengine-nav)] backdrop-blur-md sticky top-0 z-40 transition-colors">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/home" aria-label="DevEngine home" className="flex items-center gap-2.5 focus:outline-none">
              <Image
                src={theme === "light" ? "/assets/DevEngine-logo-on-light1.png" : "/assets/DevEngine-logo-on-dark2.png"}
                alt="DevEngine"
                width={140}
                height={32}
                priority
                className="h-7 w-auto object-contain"
              />
            </Link>
            <span className="hidden sm:inline-block h-4 w-px bg-[var(--devengine-border)]" aria-hidden="true" />
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono tracking-wider font-semibold uppercase bg-[var(--devengine-soft)] text-[#2cecf7] border border-[#2cecf7]/30">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2cecf7] animate-pulse" />
              Secure Document Portal
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <HeaderControls />
            <button
              onClick={handleDownloadPdf}
              disabled={downloading}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs font-semibold bg-[var(--devengine-soft)] hover:bg-[#2cecf7] text-[var(--devengine-text)] hover:text-[#02040a] border border-[var(--devengine-border)] hover:border-[#2cecf7] transition-all shadow-sm disabled:opacity-50"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span className="hidden sm:inline">{downloading ? "Preparing PDF..." : "Download Official PDF"}</span>
              <span className="sm:hidden">{downloading ? "PDF..." : "PDF"}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-12 space-y-6 flex-1">
        {/* Document Header Card */}
        <div className="rounded-2xl border border-[var(--devengine-border)] bg-[var(--devengine-surface)] p-5 sm:p-7 backdrop-blur-sm space-y-5 shadow-xl transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[var(--devengine-border)]">
            <div>
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="font-mono text-xs sm:text-sm font-bold text-[#2cecf7] tracking-wide">
                  {docData.quotationNumber || docData.ndaNumber || docData.agreementNumber}
                </span>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full uppercase font-mono font-bold tracking-wider bg-[var(--devengine-soft)] text-[#2cecf7] border border-[#2cecf7]/30">
                  {type}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-[var(--devengine-text)]">
                {docData.title || (docData.isMutual ? "Mutual Non-Disclosure Agreement" : "Non-Disclosure Agreement")}
              </h1>
            </div>

            <div className="flex sm:flex-col sm:items-end justify-between items-center text-xs shrink-0">
              <span className="text-[var(--devengine-muted)] text-[11px] mb-1">Status</span>
              <span
                className={`font-mono font-bold uppercase tracking-wider text-[11px] px-3 py-1 rounded-full border ${
                  isAlreadySigned
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                    : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                }`}
              >
                {docData.status.replace(/_/g, " ")}
              </span>
            </div>
          </div>

          {/* Parties Meta Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-1">
            <div className="p-4 rounded-xl bg-[var(--devengine-raised)] border border-[var(--devengine-border)] space-y-1">
              <div className="text-[var(--devengine-muted)] font-medium">Service Provider:</div>
              <div className="font-bold text-[var(--devengine-text)] text-sm">DevEngine Software Studio</div>
              <div className="text-[11px] text-[var(--devengine-muted)]">Official Contact: hamim.leon@gmail.com</div>
            </div>

            <div className="p-4 rounded-xl bg-[var(--devengine-raised)] border border-[var(--devengine-border)] space-y-1">
              <div className="text-[var(--devengine-muted)] font-medium">Prepared For Client / Counterparty:</div>
              <div className="font-bold text-[var(--devengine-text)] text-sm">
                {docData.clientName || docData.receivingPartyName || docData.clientSnapshot?.legalName || "Valued Client"}
              </div>
              <div className="text-[11px] text-[var(--devengine-muted)]">
                Contact: {docData.clientSnapshot?.email || docData.receivingPartyEmail || "Authorized Representative"}
              </div>
            </div>
          </div>
        </div>

        {/* Content Section: Quotation */}
        {type === "quotation" && (
          <div className="rounded-2xl border border-[var(--devengine-border)] bg-[var(--devengine-surface)] p-5 sm:p-7 space-y-6 shadow-xl transition-colors">
            <div>
              <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#2cecf7] mb-2">
                Executive Overview & Methodology
              </h2>
              <p className="text-xs sm:text-sm text-[var(--devengine-muted)] leading-relaxed">
                {docData.scope?.executiveSummary ||
                  "DevEngine delivers turnkey software architecture, robust full-stack engineering, and verified milestone deployments according to the deliverables table below."}
              </p>
            </div>

            {/* Line Items Table */}
            <div>
              <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#2cecf7] mb-3">
                Deliverables & Itemized Fees
              </h2>
              <div className="overflow-x-auto rounded-xl border border-[var(--devengine-border)]">
                <table className="w-full text-left text-xs min-w-[500px]">
                  <thead className="bg-[var(--devengine-raised)] text-[var(--devengine-muted)] border-b border-[var(--devengine-border)]">
                    <tr>
                      <th className="py-2.5 px-3 font-medium">#</th>
                      <th className="py-2.5 px-3 font-medium">Deliverable Item</th>
                      <th className="py-2.5 px-3 font-medium text-right">Quantity</th>
                      <th className="py-2.5 px-3 font-medium text-right">Unit Price</th>
                      <th className="py-2.5 px-3 font-medium text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--devengine-border)]">
                    {docData.lineItems?.map((item: any, idx: number) => (
                      <tr key={idx} className="hover:bg-[var(--devengine-soft)] transition-colors">
                        <td className="py-2.5 px-3 text-[var(--devengine-muted)] font-mono">{idx + 1}</td>
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-[var(--devengine-text)]">{item.name}</div>
                          {item.description && (
                            <div className="text-[11px] text-[var(--devengine-muted)]">{item.description}</div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right text-[var(--devengine-muted)] font-mono">
                          {item.quantity} {item.unit || "unit"}
                        </td>
                        <td className="py-2.5 px-3 text-right text-[var(--devengine-muted)] font-mono">
                          {item.unitPrice?.toLocaleString()} {docData.currency}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-[var(--devengine-text)] font-mono">
                          {item.lineTotal?.toLocaleString()} {docData.currency}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals Summary */}
              <div className="mt-4 flex justify-end text-xs">
                <div className="w-full sm:w-72 p-4 rounded-xl bg-[var(--devengine-raised)] border border-[var(--devengine-border)] space-y-2">
                  <div className="flex justify-between text-[var(--devengine-muted)]">
                    <span>Subtotal:</span>
                    <span className="font-mono text-[var(--devengine-text)]">
                      {docData.subtotal?.toLocaleString()} {docData.currency}
                    </span>
                  </div>
                  {docData.totalDiscount > 0 && (
                    <div className="flex justify-between text-[var(--devengine-muted)]">
                      <span>Discount {docData.discountPercent ? `(${docData.discountPercent}%)` : ""}:</span>
                      <span className="font-mono text-rose-400">
                        -{docData.totalDiscount?.toLocaleString()} {docData.currency}
                      </span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-[var(--devengine-border)] flex justify-between font-bold text-sm">
                    <span className="text-[var(--devengine-text)]">Grand Total:</span>
                    <span className="text-[#2cecf7] font-mono">
                      {docData.grandTotal?.toLocaleString()} {docData.currency}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Milestones */}
            {docData.paymentSchedule && docData.paymentSchedule.length > 0 && (
              <div>
                <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#2cecf7] mb-3">
                  Agreed Milestone Payment Schedule
                </h2>
                <div className="space-y-2">
                  {docData.paymentSchedule.map((m: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3.5 rounded-xl bg-[var(--devengine-raised)] border border-[var(--devengine-border)] text-xs"
                    >
                      <div>
                        <div className="font-semibold text-[var(--devengine-text)]">{m.description}</div>
                        <div className="text-[11px] text-[var(--devengine-muted)]">{m.triggerEvent || "Scheduled trigger"}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-emerald-400 font-mono">
                          {m.amount?.toLocaleString()} {docData.currency}
                        </div>
                        <div className="text-[10px] text-[var(--devengine-muted)]">{m.percentage}% of project</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Content Section: NDA */}
        {type === "nda" && (
          <div className="rounded-2xl border border-[var(--devengine-border)] bg-[var(--devengine-surface)] p-5 sm:p-7 space-y-4 text-xs sm:text-sm shadow-xl transition-colors">
            <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#2cecf7] mb-2">
              Key Non-Disclosure Provisions
            </h2>
            <div className="space-y-3 text-[var(--devengine-text)] leading-relaxed">
              <div className="p-4 rounded-xl bg-[var(--devengine-raised)] border border-[var(--devengine-border)]">
                <span className="font-bold text-[#2cecf7] block mb-1">1. Permitted Purpose:</span>
                <span className="text-[var(--devengine-muted)]">{docData.purpose}</span>
              </div>
              <div className="p-4 rounded-xl bg-[var(--devengine-raised)] border border-[var(--devengine-border)]">
                <span className="font-bold text-[#2cecf7] block mb-1">2. Term & Survival:</span>
                <span className="text-[var(--devengine-muted)]">
                  Confidentiality obligations shall survive for {docData.confidentialityDurationMonths || 24} months
                  from the Effective Date ({new Date(docData.effectiveDate).toLocaleDateString()}).
                </span>
              </div>
              <div className="p-4 rounded-xl bg-[var(--devengine-raised)] border border-[var(--devengine-border)]">
                <span className="font-bold text-[#2cecf7] block mb-1">3. Governing Law:</span>
                <span className="text-[var(--devengine-muted)]">
                  This Agreement is governed by the laws of {docData.governingLaw || "Bangladesh"}.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Content Section: Agreement */}
        {type === "agreement" && (
          <div className="rounded-2xl border border-[var(--devengine-border)] bg-[var(--devengine-surface)] p-5 sm:p-7 space-y-4 text-xs sm:text-sm shadow-xl transition-colors">
            <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#2cecf7] mb-2">
              Master Terms & IP Ownership
            </h2>
            <div className="space-y-3 text-[var(--devengine-text)] leading-relaxed">
              <div className="p-4 rounded-xl bg-[var(--devengine-raised)] border border-[var(--devengine-border)]">
                <span className="font-bold text-[#2cecf7] block mb-1">Scope of Work:</span>
                <span className="text-[var(--devengine-muted)]">
                  {docData.clauses?.scopeOfWork || "Custom software development according to specifications."}
                </span>
              </div>
              <div className="p-4 rounded-xl bg-[var(--devengine-raised)] border border-[var(--devengine-border)]">
                <span className="font-bold text-[#2cecf7] block mb-1">Intellectual Property Assignment:</span>
                <span className="text-[var(--devengine-muted)]">
                  {docData.clauses?.ipDetails || "Full intellectual property rights assign to the Client upon final payment completion."}
                </span>
              </div>
              <div className="p-4 rounded-xl bg-[var(--devengine-raised)] border border-[var(--devengine-border)] space-y-1.5">
                <span className="font-bold text-[#2cecf7] block mb-1">Total Engagement Fee:</span>
                {docData.hasDiscount && docData.discountPercent && docData.originalValue && docData.originalValue > (docData.totalValue || 0) ? (
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between text-[var(--devengine-muted)]">
                      <span>Standard Value:</span>
                      <span className="font-mono line-through">{docData.originalValue.toLocaleString()} {docData.currency}</span>
                    </div>
                    <div className="flex justify-between text-rose-400">
                      <span>Special Discount ({docData.discountPercent}%):</span>
                      <span className="font-mono">-{(docData.originalValue - (docData.totalValue || 0)).toLocaleString()} {docData.currency}</span>
                    </div>
                    <div className="flex justify-between font-bold text-sm text-[var(--devengine-text)] pt-1 border-t border-[var(--devengine-border)]">
                      <span>Net Total Value:</span>
                      <span className="text-[#2cecf7] font-mono">{(docData.totalValue || 0).toLocaleString()} {docData.currency}</span>
                    </div>
                  </div>
                ) : (
                  <span className="font-bold text-emerald-400 font-mono text-sm sm:text-base">
                    {(docData.totalValue || 0).toLocaleString()} {docData.currency}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Execution & E-Signature Card */}
        <div className="rounded-2xl border border-[var(--devengine-border)] bg-[var(--devengine-surface)] p-5 sm:p-7 shadow-2xl transition-colors">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-lg bg-[var(--devengine-soft)] border border-[#2cecf7]/30 flex items-center justify-center text-[#2cecf7] shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9"/>
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
              </svg>
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[var(--devengine-text)]">
                Legal Execution & Digital Acceptance
              </h2>
              <p className="text-xs text-[var(--devengine-muted)]">
                Sign digitally with tamper-evident cryptographic timestamping
              </p>
            </div>
          </div>

          {isAlreadySigned ? (
            <div className="p-5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 space-y-2 text-xs">
              <div className="flex items-center gap-2 font-bold text-sm">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <span>Document Fully Executed & Accepted</span>
              </div>
              <p className="text-[var(--devengine-muted)] leading-relaxed">
                This document has been confirmed and digitally signed. A permanent record has been logged in the DevEngine immutable audit registry.
              </p>
              <div className="pt-2">
                <button
                  onClick={handleDownloadPdf}
                  className="px-5 py-2.5 rounded-xl bg-[#2cecf7] text-[#02040a] font-bold hover:bg-[#53f2fb] transition-colors shadow-md"
                >
                  Download Signed Copy (PDF)
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleExecuteSignature} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-[var(--devengine-text)] mb-1.5">
                    Signatory Legal Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. John Doe"
                    value={signerName}
                    onChange={(e) => setSignerName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[var(--devengine-raised)] border border-[var(--devengine-border)] rounded-xl text-[var(--devengine-text)] placeholder-[var(--devengine-muted)] focus:outline-none focus:border-[#2cecf7] transition-colors"
                  />
                </div>

                <div>
                  <label className="block font-medium text-[var(--devengine-text)] mb-1.5">
                    Title / Official Designation
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Managing Director / Founder"
                    value={signerTitle}
                    onChange={(e) => setSignerTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[var(--devengine-raised)] border border-[var(--devengine-border)] rounded-xl text-[var(--devengine-text)] placeholder-[var(--devengine-muted)] focus:outline-none focus:border-[#2cecf7] transition-colors"
                  />
                </div>
              </div>

              {/* Signature Canvas Box */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-medium text-[var(--devengine-text)]">Draw Your Signature *</label>
                  <button
                    type="button"
                    onClick={handleClearSignature}
                    className="text-[11px] font-medium text-[#2cecf7] hover:underline cursor-pointer"
                  >
                    Clear Signature
                  </button>
                </div>
                <div className="rounded-xl border border-[var(--devengine-border)] bg-[#050811] overflow-hidden h-36 relative touch-none">
                  <canvas
                    ref={canvasRef}
                    className="w-full h-full cursor-crosshair block"
                  />
                </div>
                <span className="text-[10px] text-[var(--devengine-muted)] mt-1.5 block">
                  Use your mouse or finger to draw your signature in the frame above.
                </span>
              </div>

              {/* Legal Acknowledgment */}
              <div className="flex items-start gap-2.5 pt-2">
                <input
                  type="checkbox"
                  id="agreeLegal"
                  required
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-0.5 rounded border-[var(--devengine-border)] bg-[var(--devengine-raised)] text-[#2cecf7] accent-[#2cecf7] w-4 h-4 cursor-pointer"
                />
                <label htmlFor="agreeLegal" className="text-[var(--devengine-muted)] leading-relaxed text-[11px] cursor-pointer">
                  I certify that I am authorized to bind the client entity, and I accept the terms, payment schedules, and specifications detailed in this document.
                </label>
              </div>

              <div className="pt-3 border-t border-[var(--devengine-border)]">
                <button
                  type="submit"
                  disabled={signingSubmitting}
                  className="w-full sm:w-auto px-7 py-3 rounded-xl bg-[#2cecf7] text-[#02040a] font-bold text-xs sm:text-sm shadow-xl shadow-[#2cecf7]/20 hover:bg-[#53f2fb] transition-all disabled:opacity-50 cursor-pointer"
                >
                  {signingSubmitting ? "Cryptographically Signing..." : "Sign & Accept Document"}
                </button>
              </div>
            </form>
          )}
        </div>
      </main>

      {/* Global Landing Footer */}
      <footer className="mt-16 border-t border-[var(--devengine-border)] bg-[var(--devengine-surface)] transition-colors">
        <LandingFooter />
      </footer>
    </div>
  );
}
