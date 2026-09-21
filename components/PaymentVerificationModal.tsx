import React, { useState } from "react";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { OrderRecord } from "@/types/order";
import { generatePdfInvoice } from "@/lib/utils/generatePdfInvoice";

interface PaymentVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PaymentVerificationModal({
  isOpen,
  onClose,
}: PaymentVerificationModalProps) {
  const [trackingCode, setTrackingCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<OrderRecord | null>(null);
  const [searchedCode, setSearchedCode] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [pdfLoading, setPdfLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = trackingCode.trim().toUpperCase();
    if (!cleanCode) return;

    setLoading(true);
    setNotFound(false);
    setErrorMessage("");
    setOrder(null);
    setSearchedCode(cleanCode);

    try {
      // 1. Direct doc lookup by ID
      const directRef = doc(db, "orders", cleanCode);
      const directSnap = await getDoc(directRef);

      if (directSnap.exists()) {
        const d = directSnap.data() as any;
        setOrder({
          id: directSnap.id,
          customerName: d.customerName || "Customer",
          customerEmail: d.customerEmail || "",
          customerPhone: d.customerPhone || "",
          customerAddress: d.customerAddress || "",
          projectId: d.projectId || "",
          projectSlug: d.projectSlug || "",
          projectTitle: d.projectTitle || "DevEngine System",
          planId: d.planId || "studio",
          planName: d.planName || "Studio License",
          amount: d.amount || "0",
          currency: d.currency || "BDT",
          paymentMethod: d.paymentMethod || "bKash",
          transactionId: d.transactionId || "",
          senderNumberOrAccount: d.senderNumberOrAccount || "",
          additionalNotes: d.additionalNotes || "",
          status: d.status || "Pending Verification",
          createdAt: d.createdAt?.toDate?.()
            ? d.createdAt.toDate().toISOString()
            : d.createdAt || new Date().toISOString(),
        });
      } else {
        // 2. Query lookup fallback by 'id' field
        const q = query(collection(db, "orders"), where("id", "==", cleanCode));
        const querySnap = await getDocs(q);

        if (!querySnap.empty) {
          const docFound = querySnap.docs[0];
          const d = docFound.data() as any;
          setOrder({
            id: d.id || docFound.id,
            customerName: d.customerName || "Customer",
            customerEmail: d.customerEmail || "",
            customerPhone: d.customerPhone || "",
            customerAddress: d.customerAddress || "",
            projectId: d.projectId || "",
            projectSlug: d.projectSlug || "",
            projectTitle: d.projectTitle || "DevEngine System",
            planId: d.planId || "studio",
            planName: d.planName || "Studio License",
            amount: d.amount || "0",
            currency: d.currency || "BDT",
            paymentMethod: d.paymentMethod || "bKash",
            transactionId: d.transactionId || "",
            senderNumberOrAccount: d.senderNumberOrAccount || "",
            additionalNotes: d.additionalNotes || "",
            status: d.status || "Pending Verification",
            createdAt: d.createdAt?.toDate?.()
              ? d.createdAt.toDate().toISOString()
              : d.createdAt || new Date().toISOString(),
          });
        } else {
          setNotFound(true);
        }
      }
    } catch (err: any) {
      console.error("Verification lookup error:", err);
      setErrorMessage(
        "A network or system error occurred while verifying the order. Please try again or reach out to devenginesoftsolution@gmail.com."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!order) return;
    setPdfLoading(true);
    try {
      await generatePdfInvoice(order);
    } catch (err) {
      console.error("PDF download error:", err);
      alert("Failed to generate PDF. Please contact devenginesoftsolution@gmail.com for your receipt.");
    } finally {
      setPdfLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setOrder(null);
    setNotFound(false);
    setTrackingCode("");
    setSearchedCode("");
    setErrorMessage("");
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-2xl flex items-center justify-center p-4 sm:p-6 animate-fade-in select-none">
      <div className="relative w-full max-w-xl bg-[#08111f] border border-[#38f2ff]/30 rounded-3xl p-6 sm:p-8 shadow-[0_0_80px_rgba(56,242,255,0.25)] text-white font-sans max-h-[92vh] overflow-y-auto">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-6 right-6 w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white flex items-center justify-center transition cursor-pointer"
          aria-label="Close"
        >
          <span className="material-symbols-outlined text-lg">close</span>
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-2xl bg-[#38f2ff]/10 border border-[#38f2ff]/30 flex items-center justify-center text-[#38f2ff]">
            <span className="material-symbols-outlined text-2xl">verified_user</span>
          </div>
          <div>
            <h2 className="font-space font-bold text-xl sm:text-2xl text-white">
              Payment Verification
            </h2>
            <p className="font-mono text-xs text-gray-400">
              Audit & License Verification Protocol
            </p>
          </div>
        </div>

        {/* Tracking Input Form */}
        {!order && (
          <form onSubmit={handleVerify} className="space-y-4">
            <p className="text-xs sm:text-sm text-gray-300 leading-relaxed font-sans">
              Enter your unique <strong className="text-white">DevEngine Tracking Code</strong>{" "}
              (from your payment receipt or confirmation popup) to check audit progress and unlock your license certificate.
            </p>

            <div className="relative">
              <label className="block font-mono text-xs text-gray-400 mb-1.5 uppercase tracking-wider">
                Order Tracking Code
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3.5 top-3 text-gray-500 text-lg">
                  pin
                </span>
                <input
                  type="text"
                  required
                  value={trackingCode}
                  onChange={(e) => setTrackingCode(e.target.value.toUpperCase())}
                  placeholder="e.g. DEV-2026-MFLZO"
                  className="w-full bg-[#030712] border border-white/15 focus:border-[#38f2ff] rounded-xl pl-11 pr-4 py-3 text-sm font-mono text-white placeholder-gray-600 uppercase focus:outline-none transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !trackingCode.trim()}
              className="w-full py-3.5 px-6 rounded-xl bg-[#38f2ff] hover:bg-[#00e1f0] text-[#030712] font-space font-bold text-sm sm:text-base transition shadow-[0_0_25px_rgba(56,242,255,0.35)] hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-[#030712] border-t-transparent rounded-full animate-spin" />
                  <span>Checking Verification Ledger…</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-xl">search</span>
                  <span>Check Payment Status</span>
                </>
              )}
            </button>

            {/* Error / Not Found Notice */}
            {notFound && (
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-sans leading-relaxed animate-fade-in">
                <div className="flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-rose-400 text-lg mt-0.5">
                    error_outline
                  </span>
                  <div>
                    <strong className="font-semibold block text-rose-200 mb-0.5">
                      No Record Found for &ldquo;{searchedCode}&rdquo;
                    </strong>
                    Please double-check the tracking code from your receipt (e.g. DEV-2026-XXXXX). If you recently completed payment, ensure the code matches exactly or reach out to our verification team at{" "}
                    <a
                      href="mailto:devenginesoftsolution@gmail.com"
                      className="underline text-white font-mono"
                    >
                      devenginesoftsolution@gmail.com
                    </a>.
                  </div>
                </div>
              </div>
            )}

            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs font-mono">
                ⚠️ {errorMessage}
              </div>
            )}
          </form>
        )}

        {/* Found Order Card */}
        {order && (
          <div className="space-y-5 animate-fade-in">
            {/* Top Status & Code Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-[#030712] border border-white/10 rounded-2xl">
              <div>
                <span className="text-[11px] font-mono text-gray-500 block uppercase">
                  Tracking Code
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-[#38f2ff] text-base">
                    {order.id}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(order.id)}
                    className="text-gray-400 hover:text-white transition text-xs flex items-center"
                    title="Copy Code"
                  >
                    <span className="material-symbols-outlined text-sm">content_copy</span>
                    {copied && (
                      <span className="font-mono text-[10px] text-emerald-400 ml-1">Copied!</span>
                    )}
                  </button>
                </div>
              </div>

              {/* Status Badge */}
              <div>
                {order.status === "Verified" ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono text-xs font-bold shadow-[0_0_15px_rgba(52,211,153,0.3)]">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span>✓ VERIFIED & APPROVED</span>
                  </span>
                ) : order.status === "Rejected" ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 font-mono text-xs font-bold">
                    <span className="w-2 h-2 rounded-full bg-rose-400" />
                    <span>✕ VERIFICATION REJECTED</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono text-xs font-bold animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <span>⏳ PENDING VERIFICATION</span>
                  </span>
                )}
              </div>
            </div>

            {/* Order Specification Grid */}
            <div className="bg-[#030712] border border-white/10 rounded-2xl p-4 sm:p-5 space-y-2.5 text-xs font-mono">
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-gray-400">Target System:</span>
                <span className="text-white font-bold">{order.projectTitle}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-gray-400">License Tier:</span>
                <span className="text-[#38f2ff]">{order.planName}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-gray-400">Licensed Licensee:</span>
                <span className="text-white">{order.customerName}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-gray-400">Amount Paid:</span>
                <span className="text-emerald-400 font-bold">
                  {order.currency === "USD" ? "USD" : "BDT"} {order.amount}
                </span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-gray-400">Payment Gateway:</span>
                <span className="text-gray-200">{order.paymentMethod}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Transaction ID (TrxID):</span>
                <code className="text-gray-300 font-bold">{order.transactionId}</code>
              </div>
            </div>

            {/* Status Information Box */}
            {order.status === "Verified" ? (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs font-sans leading-relaxed">
                <div className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-emerald-400 text-lg mt-0.5">
                    verified
                  </span>
                  <div>
                    <strong className="font-semibold block text-emerald-200">
                      License Active & Verified
                    </strong>
                    Your manual payment proof has been successfully matched and verified against our banking ledger. Your official commercial license certificate is available for download below.
                  </div>
                </div>
              </div>
            ) : order.status === "Rejected" ? (
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs font-sans leading-relaxed">
                <div className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-rose-400 text-lg mt-0.5">
                    cancel
                  </span>
                  <div>
                    <strong className="font-semibold block text-rose-200">
                      Payment Verification Unsuccessful
                    </strong>
                    This transaction ID could not be reconciled with our financial ledger. Please contact our support team at{" "}
                    <a
                      href="mailto:devenginesoftsolution@gmail.com"
                      className="underline text-white font-mono"
                    >
                      devenginesoftsolution@gmail.com
                    </a>{" "}
                    or WhatsApp +880 1724 879284 with your payment receipt screenshot.
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs font-sans leading-relaxed">
                <div className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-amber-400 text-lg mt-0.5">
                    schedule
                  </span>
                  <div>
                    <strong className="font-semibold block text-amber-200">
                      Verification in Progress (Within 24 Hours)
                    </strong>
                    Your payment submission is being audited by DevEngine Finance. Verification is typically completed within 24 hours. Your downloadable verified invoice and license certificate will unlock here as soon as verification is complete.
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-2.5 pt-2">
              {/* If Approved/Verified: Enable Download */}
              {order.status === "Verified" ? (
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={pdfLoading}
                  className="w-full py-3.5 px-6 rounded-xl bg-[#38f2ff] hover:bg-[#00e1f0] text-[#030712] font-space font-bold text-sm sm:text-base transition shadow-[0_0_25px_rgba(56,242,255,0.4)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-xl">download</span>
                  <span>{pdfLoading ? "Generating Invoice PDF…" : "Download Verified License PDF"}</span>
                </button>
              ) : (
                <div className="w-full py-3 px-4 rounded-xl bg-white/5 border border-white/10 text-gray-500 font-mono text-xs flex items-center justify-center gap-2 select-none">
                  <span className="material-symbols-outlined text-base text-gray-500">lock</span>
                  <span>PDF Download Unlocks Upon Verification Approval</span>
                </div>
              )}

              {/* Check another code */}
              <button
                type="button"
                onClick={handleReset}
                className="w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white font-mono text-xs transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">search</span>
                <span>Track Another Order</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
