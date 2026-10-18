import HeaderControls from "@/components/HeaderControls";
// pages/contract/view/[id].tsx
// ─────────────────────────────────────────────────────────────
// DevEngine Contract Center — Client Document Review & E-Signing Portal
// ─────────────────────────────────────────────────────────────

import React, { useEffect, useState, useRef } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
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

    // Set canvas dimensions to display size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = "#f472b6"; // DevEngine pink

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
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-400">Loading DevEngine Secure Document...</p>
        </div>
      </div>
    );
  }

  if (!docData) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white p-4">
        <div className="max-w-md text-center p-8 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <h2 className="text-lg font-bold text-rose-400">Document Not Found</h2>
          <p className="text-xs text-slate-400">
            This document reference does not exist or may have expired. Please verify the URL or contact DevEngine support.
          </p>
          <Link
            href="/"
            className="inline-block px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-200 hover:text-white"
          >
            Return to Homepage
          </Link>
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
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased selection:bg-pink-500/30 selection:text-pink-300 pb-20">
      <Head>
        <title>
          {docData.quotationNumber || docData.ndaNumber || docData.agreementNumber || "Contract Document"} — DevEngine
        </title>
      </Head>

      {/* Top Banner */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-pink-500 to-rose-600 flex items-center justify-center font-bold text-white text-xs shadow-md shadow-pink-500/20">
              DE
            </div>
            <div>
              <span className="text-xs font-bold tracking-wider text-white">DEVENGINE</span>
              <span className="block text-[10px] text-slate-400 tracking-wider uppercase">
                Secure Document Portal
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <HeaderControls />
            <button
              onClick={handleDownloadPdf}
              disabled={downloading}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-200 border border-slate-700 hover:text-white hover:bg-slate-700 transition-all disabled:opacity-50"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              {downloading ? "Preparing PDF..." : "Download Official PDF"}
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-8 space-y-6">
        {/* Document Header Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-sm space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-xs font-bold text-pink-400">
                  {docData.quotationNumber || docData.ndaNumber || docData.agreementNumber}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wider bg-slate-800 text-slate-300">
                  {type}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-white">
                {docData.title || (docData.isMutual ? "Mutual Non-Disclosure Agreement" : "Non-Disclosure Agreement")}
              </h1>
            </div>

            <div className="flex sm:flex-col sm:items-end justify-between text-xs">
              <span className="text-slate-400">Status</span>
              <span
                className={`font-bold uppercase tracking-wider text-xs px-2.5 py-1 rounded-full border ${
                  isAlreadySigned
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                    : "bg-amber-500/10 text-amber-300 border-amber-500/30"
                }`}
              >
                {docData.status.replace(/_/g, " ")}
              </span>
            </div>
          </div>

          {/* Parties Meta Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2">
            <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800 space-y-1">
              <div className="text-slate-400 font-medium">Service Provider:</div>
              <div className="font-bold text-white">DevEngine Software Studio</div>
              <div className="text-[11px] text-slate-400">Official Contact: hamim.leon@gmail.com</div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800 space-y-1">
              <div className="text-slate-400 font-medium">Prepared For Client / Counterparty:</div>
              <div className="font-bold text-white">
                {docData.clientName || docData.receivingPartyName || docData.clientSnapshot?.legalName || "Valued Client"}
              </div>
              <div className="text-[11px] text-slate-400">
                Contact: {docData.clientSnapshot?.email || docData.receivingPartyEmail || "Authorized Representative"}
              </div>
            </div>
          </div>
        </div>

        {/* Content Section: Quotation */}
        {type === "quotation" && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-6">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-pink-400 mb-2">
                Executive Overview & Methodology
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                {docData.scope?.executiveSummary ||
                  "DevEngine delivers turnkey software architecture, robust full-stack engineering, and verified milestone deployments according to the deliverables table below."}
              </p>
            </div>

            {/* Line Items Table */}
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-pink-400 mb-3">
                Deliverables & Itemized Fees
              </h2>
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-800/60 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3 font-medium">#</th>
                      <th className="py-2.5 px-3 font-medium">Deliverable Item</th>
                      <th className="py-2.5 px-3 font-medium text-right">Quantity</th>
                      <th className="py-2.5 px-3 font-medium text-right">Unit Price</th>
                      <th className="py-2.5 px-3 font-medium text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {docData.lineItems?.map((item: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-800/30">
                        <td className="py-2.5 px-3 text-slate-500 font-mono">{idx + 1}</td>
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-white">{item.name}</div>
                          {item.description && (
                            <div className="text-[11px] text-slate-400">{item.description}</div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-300">
                          {item.quantity} {item.unit || "unit"}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-300">
                          {item.unitPrice?.toLocaleString()} {docData.currency}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-white">
                          {item.lineTotal?.toLocaleString()} {docData.currency}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals Summary */}
              <div className="mt-4 flex justify-end text-xs">
                <div className="w-64 p-3.5 rounded-xl bg-slate-800/40 border border-slate-800 space-y-1.5">
                  <div className="flex justify-between text-slate-400">
                    <span>Subtotal:</span>
                    <span className="font-mono text-white">
                      {docData.subtotal?.toLocaleString()} {docData.currency}
                    </span>
                  </div>
                  {docData.totalDiscount > 0 && (
                    <div className="flex justify-between text-slate-400">
                      <span>Discount:</span>
                      <span className="font-mono text-rose-400">
                        -{docData.totalDiscount?.toLocaleString()} {docData.currency}
                      </span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-slate-700/60 flex justify-between font-bold text-sm">
                    <span className="text-slate-200">Grand Total:</span>
                    <span className="text-pink-400 font-mono">
                      {docData.grandTotal?.toLocaleString()} {docData.currency}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Milestones */}
            {docData.paymentSchedule && docData.paymentSchedule.length > 0 && (
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-pink-400 mb-3">
                  Agreed Milestone Payment Schedule
                </h2>
                <div className="space-y-2">
                  {docData.paymentSchedule.map((m: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40 border border-slate-800 text-xs"
                    >
                      <div>
                        <div className="font-semibold text-white">{m.description}</div>
                        <div className="text-[11px] text-slate-400">{m.triggerEvent || "Scheduled trigger"}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-emerald-400">
                          {m.amount?.toLocaleString()} {docData.currency}
                        </div>
                        <div className="text-[10px] text-slate-400">{m.percentage}% of project</div>
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
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4 text-xs">
            <h2 className="text-sm font-bold uppercase tracking-wider text-pink-400">
              Key Non-Disclosure Provisions
            </h2>
            <div className="space-y-3 text-slate-300 leading-relaxed">
              <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800">
                <span className="font-bold text-white block mb-1">1. Permitted Purpose:</span>
                {docData.purpose}
              </div>
              <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800">
                <span className="font-bold text-white block mb-1">2. Term & Survival:</span>
                Confidentiality obligations shall survive for {docData.confidentialityDurationMonths || 24} months
                from the Effective Date ({new Date(docData.effectiveDate).toLocaleDateString()}).
              </div>
              <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800">
                <span className="font-bold text-white block mb-1">3. Governing Law:</span>
                This Agreement is governed by the laws of {docData.governingLaw || "Bangladesh"}.
              </div>
            </div>
          </div>
        )}

        {/* Content Section: Agreement */}
        {type === "agreement" && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4 text-xs">
            <h2 className="text-sm font-bold uppercase tracking-wider text-pink-400">
              Master Terms & IP Ownership
            </h2>
            <div className="space-y-3 text-slate-300 leading-relaxed">
              <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800">
                <span className="font-bold text-white block mb-1">Scope of Work:</span>
                {docData.clauses?.scopeOfWork || "Custom software development according to specifications."}
              </div>
              <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800">
                <span className="font-bold text-white block mb-1">Intellectual Property Assignment:</span>
                {docData.clauses?.ipDetails || "Full intellectual property rights assign to the Client upon final payment completion."}
              </div>
              <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800">
                <span className="font-bold text-white block mb-1">Total Engagement Fee:</span>
                <span className="font-bold text-emerald-400 text-sm">
                  {(docData.totalValue || 0).toLocaleString()} {docData.currency}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Execution & E-Signature Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 backdrop-blur-md shadow-2xl">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-lg">✍️</span>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-white">
                Legal Execution & Digital Acceptance
              </h2>
              <p className="text-xs text-slate-400">
                Sign digitally with tamper-evident cryptographic timestamping
              </p>
            </div>
          </div>

          {isAlreadySigned ? (
            <div className="p-5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 space-y-2 text-xs">
              <div className="font-bold text-sm">✓ Document Fully Executed & Accepted</div>
              <p className="text-slate-300">
                This document has been confirmed and digitally signed. A permanent record has been logged in the DevEngine immutable audit registry.
              </p>
              <div className="pt-2">
                <button
                  onClick={handleDownloadPdf}
                  className="px-4 py-2 rounded-lg bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400 transition-colors"
                >
                  Download Signed Copy (PDF)
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleExecuteSignature} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-slate-300 mb-1">
                    Signatory Legal Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. John Doe"
                    value={signerName}
                    onChange={(e) => setSignerName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-300 mb-1">
                    Title / Official Designation
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Managing Director / Founder"
                    value={signerTitle}
                    onChange={(e) => setSignerTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                </div>
              </div>

              {/* Signature Canvas Box */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-medium text-slate-300">Draw Your Signature *</label>
                  <button
                    type="button"
                    onClick={handleClearSignature}
                    className="text-[11px] text-pink-400 hover:underline"
                  >
                    Clear Signature
                  </button>
                </div>
                <div className="rounded-xl border border-slate-700 bg-slate-950 overflow-hidden h-36">
                  <canvas
                    ref={canvasRef}
                    className="w-full h-full cursor-crosshair block"
                  />
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Use your mouse or finger to draw your signature in the frame above.
                </span>
              </div>

              {/* Legal Acknowledgment */}
              <div className="flex items-start gap-2 pt-2">
                <input
                  type="checkbox"
                  id="agreeLegal"
                  required
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-0.5 rounded bg-slate-800 border-slate-700 text-pink-500"
                />
                <label htmlFor="agreeLegal" className="text-slate-300 leading-relaxed text-[11px]">
                  I certify that I am authorized to bind the client entity, and I accept the terms, payment schedules, and specifications detailed in this document.
                </label>
              </div>

              <div className="pt-3 border-t border-slate-800">
                <button
                  type="submit"
                  disabled={signingSubmitting}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 text-white font-bold text-xs shadow-xl shadow-pink-500/25 hover:from-pink-400 hover:to-rose-500 transition-all disabled:opacity-50"
                >
                  {signingSubmitting ? "Cryptographically Signing..." : "Sign & Accept Document"}
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
