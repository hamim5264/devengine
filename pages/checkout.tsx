import React, { useEffect, useState, useMemo } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import LandingNavbar from "@/components/landing/LandingNavbar";
import LandingFooter from "@/components/landing/LandingFooter";
import HelixLoader from "@/components/HelixLoader";
import {
  ProjectItem,
  ProjectPricingTier,
  getDefaultPricingPlans,
  formatUsdPrice,
} from "@/types/project";
import {
  OrderRecord,
  PAYMENT_ACCOUNTS,
  PaymentAccountInfo,
  PaymentMethodType,
} from "@/types/order";
import { generatePdfInvoice } from "@/lib/utils/generatePdfInvoice";

export default function CheckoutPage() {
  const router = useRouter();
  const { slug, plan: queryPlan, amount: queryAmount } = router.query;

  // Project state
  const [project, setProject] = useState<ProjectItem | null>(null);
  const [loadingProject, setLoadingProject] = useState(true);
  const [allProjects, setAllProjects] = useState<ProjectItem[]>([]);

  // Customer form inputs (No login required!)
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");

  // Payment proof inputs
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodType>("bKash");
  const [transactionId, setTransactionId] = useState("");
  const [senderAccount, setSenderAccount] = useState("");
  const [amountSent, setAmountSent] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [copiedAccount, setCopiedAccount] = useState<string | null>(null);
  const [copiedOrderId, setCopiedOrderId] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<OrderRecord | null>(null);
  const [pdfDownloading, setPdfDownloading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Fetch project & pricing
  useEffect(() => {
    (async () => {
      setLoadingProject(true);
      try {
        const snap = await getDocs(
          query(collection(db, "projects"), where("isPublic", "==", true))
        );
        const list: ProjectItem[] = snap.docs.map((d) => {
          const data = d.data() as any;
          return {
            id: d.id,
            slug: data.slug || d.id,
            title: data.title || "Untitled Project",
            subtitle: data.subtitle || "",
            category: data.category || "General",
            price: data.price ?? "0",
            discount: data.discount,
            pricing: data.pricing,
            pricingPlans: data.pricingPlans,
            tags: data.tags || [],
            isPublic: true,
          };
        });
        setAllProjects(list);

        if (slug) {
          const sStr = String(slug).toLowerCase().trim();
          const match = list.find(
            (p) =>
              p.slug.toLowerCase() === sStr ||
              p.id.toLowerCase() === sStr ||
              p.slug.toLowerCase().replace(/[^a-z0-9]/g, "") === sStr.replace(/[^a-z0-9]/g, "")
          );
          if (match) {
            setProject(match);
          } else {
            // Try direct doc lookup
            const directSnap = await getDoc(doc(db, "projects", String(slug)));
            if (directSnap.exists()) {
              const dData = directSnap.data() as any;
              setProject({
                id: directSnap.id,
                slug: dData.slug || directSnap.id,
                title: dData.title || "DevEngine System",
                subtitle: dData.subtitle || "",
                category: dData.category || "General",
                price: dData.price || "0",
                discount: dData.discount,
                pricing: dData.pricing,
                pricingPlans: dData.pricingPlans,
                tags: dData.tags || [],
              });
            }
          }
        } else if (list.length > 0) {
          setProject(list[0]);
        }
      } catch (err) {
        console.error("Error loading project for checkout:", err);
      } finally {
        setLoadingProject(false);
      }
    })();
  }, [slug]);

  // Selected plan computation
  const availablePlans = useMemo(() => {
    return getDefaultPricingPlans(project || undefined);
  }, [project]);

  const selectedPlan: ProjectPricingTier = useMemo(() => {
    if (queryPlan) {
      const match = availablePlans.find(
        (p) => p.id.toLowerCase() === String(queryPlan).toLowerCase()
      );
      if (match) return match;
    }
    // Default to Studio License or popular tier
    return availablePlans.find((p) => p.isPopular) || availablePlans[1] || availablePlans[0];
  }, [availablePlans, queryPlan]);

  // Set default amount sent once plan is known
  useEffect(() => {
    if (queryAmount) {
      setAmountSent(String(queryAmount));
    } else if (selectedPlan?.price && selectedPlan.price !== "Custom Quote") {
      setAmountSent(selectedPlan.price);
    }
  }, [selectedPlan, queryAmount]);

  // Copy helper
  const handleCopyAccount = (accountNum: string) => {
    navigator.clipboard.writeText(accountNum);
    setCopiedAccount(accountNum);
    setTimeout(() => setCopiedAccount(null), 2500);
  };

  const handleCopyOrderId = (orderId: string) => {
    navigator.clipboard.writeText(orderId);
    setCopiedOrderId(true);
    setTimeout(() => setCopiedOrderId(false), 2500);
  };

  // Form Submission
  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!customerName.trim()) {
      setErrorMessage("Please enter your full name.");
      return;
    }
    if (!customerEmail.trim() || !customerEmail.includes("@")) {
      setErrorMessage("Please enter a valid email address for license delivery.");
      return;
    }
    if (!customerPhone.trim()) {
      setErrorMessage("Please provide your contact / WhatsApp number.");
      return;
    }
    if (!transactionId.trim()) {
      setErrorMessage("Please input your Transaction ID (TrxID) for payment verification.");
      return;
    }
    if (!senderAccount.trim()) {
      setErrorMessage("Please enter the sender phone number or account used for transfer.");
      return;
    }
    if (!agreedToTerms) {
      setErrorMessage("You must accept the license terms & software agreement to proceed.");
      return;
    }

    setSubmitting(true);

    try {
      // Generate Unique Order / Tracking ID
      const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
      const orderId = `DEV-${new Date().getFullYear()}-${randomSuffix}`;

      const newOrder: OrderRecord = {
        id: orderId,
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim().toLowerCase(),
        customerPhone: customerPhone.trim(),
        customerAddress: customerAddress.trim() || "Digital Delivery",
        projectId: project?.id || "devengine-system",
        projectSlug: project?.slug || "system",
        projectTitle: project?.title || "DevEngine Software License",
        planId: selectedPlan.id,
        planName: selectedPlan.name,
        amount: amountSent || selectedPlan.price,
        currency: selectedPlan.currencySymbol === "$" ? "USD" : "BDT",
        paymentMethod: selectedMethod,
        transactionId: transactionId.trim(),
        senderNumberOrAccount: senderAccount.trim(),
        additionalNotes: additionalNotes.trim(),
        status: "Pending Verification",
        createdAt: Timestamp.now(),
      };

      // Save to Firestore under `orders` collection
      const orderRef = doc(db, "orders", orderId);
      await setDoc(orderRef, newOrder);

      // Set completed order to trigger modal
      setCompletedOrder(newOrder);
    } catch (err: any) {
      console.error("Failed to submit order:", err);
      setErrorMessage("An unexpected error occurred while recording your payment. Please try again or reach out on WhatsApp.");
    } finally {
      setSubmitting(false);
    }
  };

  // Download PDF invoice
  const handleDownloadPdf = async () => {
    if (!completedOrder) return;
    setPdfDownloading(true);
    try {
      await generatePdfInvoice(completedOrder);
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("Failed to generate PDF. Please take a screenshot of this page or contact support.");
    } finally {
      setPdfDownloading(false);
    }
  };

  // Close popup & reset everything & return home
  const handleCloseAndReturnHome = () => {
    setCompletedOrder(null);
    setCustomerName("");
    setCustomerEmail("");
    setCustomerPhone("");
    setCustomerAddress("");
    setTransactionId("");
    setSenderAccount("");
    setAmountSent("");
    setAdditionalNotes("");
    setAgreedToTerms(false);
    router.push("/home");
  };

  return (
    <>
      <Head>
        <title>Secure Checkout — Payment & License Verification | DevEngine</title>
        <meta
          name="description"
          content="Complete your software license acquisition. Secure manual payment verification for bKash, Nagad, Rocket, DBBL, and BRAC Bank."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      {/* Global Background Atmospheric Elements */}
      <div className="fixed inset-0 bg-[#030712] z-[-10]" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(14,24,42,0.95)_0%,rgba(3,7,18,1)_100%)] z-[-9] pointer-events-none" />
      <div className="fixed inset-0 bg-[linear-gradient(to_right,rgba(132,148,149,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(132,148,149,0.04)_1px,transparent_1px)] bg-[size:40px_40px] z-[-8] pointer-events-none" />
      <div className="fixed -top-40 -left-40 w-[600px] h-[600px] bg-[#38f2ff]/[0.06] rounded-full blur-[140px] pointer-events-none z-[-7]" />
      <div className="fixed bottom-0 right-0 w-[600px] h-[600px] bg-[#5448dc]/[0.06] rounded-full blur-[160px] pointer-events-none z-[-7]" />

      <LandingNavbar />

      <main className="min-h-screen pt-28 pb-32 px-4 sm:px-8 md:px-12 max-w-7xl mx-auto relative z-10 text-[#dde2f3] font-sans selection:bg-[#38f2ff] selection:text-[#030712]">
        {/* Breadcrumb Navigation */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8 pt-4 pb-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2 font-mono text-xs text-gray-400">
            <Link href="/home" className="hover:text-white transition">Home</Link>
            <span>/</span>
            {project && (
              <>
                <Link href={`/projects/${project.slug}`} className="hover:text-white transition">
                  {project.title}
                </Link>
                <span>/</span>
                <Link href={`/projects/${project.slug}/pricing`} className="hover:text-white transition">
                  Pricing
                </Link>
                <span>/</span>
              </>
            )}
            <span className="text-[#38f2ff] font-bold">Secure Checkout</span>
          </div>

          {project && (
            <Link
              href={`/projects/${project.slug}/pricing`}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-mono text-gray-300 hover:text-white transition"
            >
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              <span>Back to Plans</span>
            </Link>
          )}
        </div>

        {/* Page Header */}
        <header className="mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#38f2ff]/10 border border-[#38f2ff]/25 mb-4 shadow-[0_0_15px_rgba(56,242,255,0.12)]">
            <span className="w-2 h-2 rounded-full bg-[#38f2ff] animate-pulse" />
            <span className="font-mono text-[11px] text-[#38f2ff] uppercase tracking-widest font-bold">
              Secure Transaction Gateway
            </span>
          </div>
          <h1 className="font-space font-bold text-3xl sm:text-4xl md:text-5xl text-white tracking-tight">
            Checkout & License Acquisition
          </h1>
          <p className="font-sans text-sm sm:text-base text-gray-400 mt-2">
            Direct manual transfer verification. Enter your details and transaction ID for instant license dispatch.
          </p>
        </header>

        {loadingProject ? (
          <div className="py-24 flex flex-col items-center justify-center">
            <HelixLoader size={48} color="#38f2ff" />
            <p className="mt-4 font-mono text-xs text-gray-400 uppercase tracking-widest">
              Loading Order Specifications…
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* ══════════════════════════════════════════════════════
                LEFT COLUMN: ORDER SUMMARY & SECURITY NOTICE
            ══════════════════════════════════════════════════════ */}
            <section className="lg:col-span-5 space-y-6 lg:sticky lg:top-28">
              {/* Order Summary Glass Card */}
              <div className="bg-[#08111f]/90 border border-white/10 rounded-2xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-[#38f2ff]/5 via-transparent to-transparent pointer-events-none" />

                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-6 border-b border-white/10 pb-5">
                    <div>
                      <span className="font-mono text-[10px] uppercase tracking-widest text-[#38f2ff] font-bold block mb-1">
                        Licensed Architecture
                      </span>
                      <h2 className="font-space font-bold text-2xl text-white">
                        {project?.title || "DevEngine System"}
                      </h2>
                      <span className="text-xs font-mono text-gray-400">
                        Tier: <strong className="text-white">{selectedPlan.name}</strong>
                      </span>
                    </div>
                    <span className="material-symbols-outlined text-3xl text-[#38f2ff]/80">
                      verified_user
                    </span>
                  </div>

                  {/* Included Deliverables */}
                  <div className="space-y-3 mb-6">
                    <div className="font-mono text-[11px] text-gray-400 uppercase tracking-wider font-semibold">
                      Deliverables Included:
                    </div>
                    {selectedPlan.features.slice(0, 4).map((feat, i) => (
                      <div key={i} className="flex items-center gap-2.5 text-xs text-gray-300">
                        <span className="material-symbols-outlined text-[#38f2ff] text-base flex-shrink-0">
                          check_circle
                        </span>
                        <span>{feat.text}</span>
                      </div>
                    ))}
                  </div>

                  {/* Pricing Breakdown */}
                  <div className="border-t border-white/10 pt-5 space-y-2">
                    <div className="flex justify-between items-center text-xs font-mono text-gray-400">
                      <span>Source Repository License</span>
                      <span className="text-white font-bold">{selectedPlan.currencySymbol || "৳"} {selectedPlan.price}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs font-mono text-gray-400">
                      <span>Cloud Deployment Setup</span>
                      <span className="text-emerald-400 font-semibold">Included Free</span>
                    </div>
                    <div className="flex justify-between items-center text-xs font-mono text-gray-400">
                      <span>Priority Support</span>
                      <span className="text-emerald-400 font-semibold">Active</span>
                    </div>

                    <div className="border-t border-white/10 pt-4 mt-3 flex items-baseline justify-between">
                      <div>
                        <span className="font-mono text-[10px] uppercase tracking-wider text-gray-400 block">
                          Total Investment
                        </span>
                        {formatUsdPrice(selectedPlan.usdPrice, selectedPlan.price) && (
                          <span className="text-xs font-mono text-emerald-400 font-bold">
                            ≈ {formatUsdPrice(selectedPlan.usdPrice, selectedPlan.price)} USD
                          </span>
                        )}
                      </div>
                      <span className="font-space font-bold text-2xl sm:text-3xl text-[#38f2ff]">
                        {selectedPlan.currencySymbol === "$" ? "USD" : "BDT"} {selectedPlan.price}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Security & Verification Notice */}
              <div className="bg-[#0b1322]/70 border border-white/10 rounded-2xl p-5 backdrop-blur-xl flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#38f2ff]/10 border border-[#38f2ff]/30 flex items-center justify-center text-[#38f2ff] flex-shrink-0 mt-0.5">
                  <span className="material-symbols-outlined text-xl">shield_lock</span>
                </div>
                <div>
                  <h4 className="font-space font-bold text-sm text-white mb-1">
                    Secure Verification Protocol
                  </h4>
                  <p className="font-sans text-xs text-gray-400 leading-relaxed">
                    All transfers are verified manually by our engineering team. Upon submission, you will receive a unique tracking ID and downloadable PDF license certificate. Repository credentials are sent to your email within 2-4 hours.
                  </p>
                </div>
              </div>
            </section>

            {/* ══════════════════════════════════════════════════════
                RIGHT COLUMN: CHECKOUT FORM & MANUAL PAYMENT ACCOUNTS
            ══════════════════════════════════════════════════════ */}
            <section className="lg:col-span-7">
              <form onSubmit={handleSubmitOrder} className="space-y-8">
                {/* STEP 1: CUSTOMER INFORMATION */}
                <div className="bg-[#08111f]/90 border border-white/10 rounded-2xl p-6 sm:p-8 backdrop-blur-xl shadow-xl space-y-5">
                  <div className="flex items-center gap-2.5 border-b border-white/10 pb-4">
                    <span className="w-6 h-6 rounded-full bg-[#38f2ff] text-[#030712] font-mono text-xs font-bold flex items-center justify-center">
                      1
                    </span>
                    <h3 className="font-space font-bold text-xl text-white">
                      Customer & Licensee Information
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Full Name */}
                    <div>
                      <label className="block text-xs font-mono text-gray-300 mb-1.5 font-semibold flex items-center justify-between">
                        <span>Full Name</span>
                        <span className="text-[#38f2ff] text-[11px] font-normal">* Required</span>
                      </label>
                      <div className="relative flex items-center bg-[#060c18] border border-white/10 hover:border-white/20 focus-within:border-[#38f2ff] focus-within:ring-2 focus-within:ring-[#38f2ff]/20 rounded-xl transition duration-200 overflow-hidden shadow-inner">
                        <div className="pl-3.5 pr-2.5 text-gray-400 flex items-center justify-center">
                          <span className="material-symbols-outlined text-lg">person</span>
                        </div>
                        <input
                          type="text"
                          required
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          placeholder="Your full name"
                          className="w-full bg-transparent py-3 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none font-sans"
                        />
                      </div>
                    </div>

                    {/* Email Address */}
                    <div>
                      <label className="block text-xs font-mono text-gray-300 mb-1.5 font-semibold flex items-center justify-between">
                        <span>Email Address</span>
                        <span className="text-[#38f2ff] text-[11px] font-normal">* Required</span>
                      </label>
                      <div className="relative flex items-center bg-[#060c18] border border-white/10 hover:border-white/20 focus-within:border-[#38f2ff] focus-within:ring-2 focus-within:ring-[#38f2ff]/20 rounded-xl transition duration-200 overflow-hidden shadow-inner">
                        <div className="pl-3.5 pr-2.5 text-gray-400 flex items-center justify-center">
                          <span className="material-symbols-outlined text-lg">alternate_email</span>
                        </div>
                        <input
                          type="email"
                          required
                          value={customerEmail}
                          onChange={(e) => setCustomerEmail(e.target.value)}
                          placeholder="name@company.com"
                          className="w-full bg-transparent py-3 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none font-sans"
                        />
                      </div>
                    </div>

                    {/* Phone / WhatsApp */}
                    <div>
                      <label className="block text-xs font-mono text-gray-300 mb-1.5 font-semibold flex items-center justify-between">
                        <span>Phone / WhatsApp Number</span>
                        <span className="text-[#38f2ff] text-[11px] font-normal">* Required</span>
                      </label>
                      <div className="relative flex items-center bg-[#060c18] border border-white/10 hover:border-white/20 focus-within:border-[#38f2ff] focus-within:ring-2 focus-within:ring-[#38f2ff]/20 rounded-xl transition duration-200 overflow-hidden shadow-inner">
                        <div className="pl-3.5 pr-2.5 text-gray-400 flex items-center justify-center">
                          <span className="material-symbols-outlined text-lg">call</span>
                        </div>
                        <input
                          type="tel"
                          required
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          placeholder="+880 17XXXXXXXX"
                          className="w-full bg-transparent py-3 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none font-mono"
                        />
                      </div>
                    </div>

                    {/* Address */}
                    <div>
                      <label className="block text-xs font-mono text-gray-300 mb-1.5 font-semibold flex items-center justify-between">
                        <span>Company / Physical Address</span>
                        <span className="text-gray-500 text-[11px] font-normal">Optional</span>
                      </label>
                      <div className="relative flex items-center bg-[#060c18] border border-white/10 hover:border-white/20 focus-within:border-[#38f2ff] focus-within:ring-2 focus-within:ring-[#38f2ff]/20 rounded-xl transition duration-200 overflow-hidden shadow-inner">
                        <div className="pl-3.5 pr-2.5 text-gray-400 flex items-center justify-center">
                          <span className="material-symbols-outlined text-lg">location_on</span>
                        </div>
                        <input
                          type="text"
                          value={customerAddress}
                          onChange={(e) => setCustomerAddress(e.target.value)}
                          placeholder="Dhaka, Bangladesh"
                          className="w-full bg-transparent py-3 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none font-sans"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* STEP 2: "WE ACCEPT" / MANUAL PAYMENT INSTRUCTIONS */}
                <div className="bg-[#08111f]/90 border border-white/10 rounded-2xl p-6 sm:p-8 backdrop-blur-xl shadow-xl space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-[#38f2ff] text-[#030712] font-mono text-xs font-bold flex items-center justify-center">
                        2
                      </span>
                      <div>
                        <h3 className="font-space font-bold text-xl text-white">
                          We Accept — Payment Accounts
                        </h3>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Transfer to any of the verified accounts below, then submit TrxID.
                        </p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono text-[10px] uppercase font-bold">
                      Verified Accounts
                    </span>
                  </div>

                  {/* Payment Accounts Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {PAYMENT_ACCOUNTS.map((acc) => {
                      const isSelected = selectedMethod === acc.id;
                      const isCopied = copiedAccount === acc.accountNumber;

                      return (
                        <div
                          key={acc.id}
                          onClick={() => setSelectedMethod(acc.id)}
                          className={`p-4 rounded-xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                            isSelected
                              ? "bg-[#0c182c] border-[#38f2ff] shadow-[0_0_20px_rgba(56,242,255,0.25)]"
                              : "bg-[#050b14]/70 border-white/10 hover:border-white/20 hover:bg-[#07101e]"
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <span className="font-space font-bold text-base text-white">
                                {acc.name}
                              </span>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-gray-300 font-semibold">
                                {acc.typeBadge}
                              </span>
                            </div>

                            <div className="text-[11px] font-mono text-gray-400 space-y-0.5">
                              <div>Holder: <span className="text-white font-semibold">{acc.accountHolder}</span></div>
                              <div className="text-[10px] text-gray-500">{acc.methodType}</div>
                            </div>
                          </div>

                          {/* Account Number Box + Copy */}
                          <div className="mt-3.5 pt-3 border-t border-white/5 flex items-center justify-between gap-2">
                            <code className="font-mono text-xs text-[#38f2ff] font-bold tracking-wider">
                              {acc.accountNumber}
                            </code>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyAccount(acc.accountNumber);
                              }}
                              className="px-2 py-1 rounded bg-white/5 hover:bg-[#38f2ff]/20 text-gray-300 hover:text-[#38f2ff] text-[11px] font-mono transition flex items-center gap-1"
                              title="Copy account number"
                            >
                              <span className="material-symbols-outlined text-xs">content_copy</span>
                              <span>{isCopied ? "Copied!" : "Copy"}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* STEP 3: SUBMIT PAYMENT PROOF */}
                <div className="bg-[#08111f]/90 border border-white/10 rounded-2xl p-6 sm:p-8 backdrop-blur-xl shadow-xl space-y-5">
                  <div className="flex items-center gap-2.5 border-b border-white/10 pb-4">
                    <span className="w-6 h-6 rounded-full bg-[#38f2ff] text-[#030712] font-mono text-xs font-bold flex items-center justify-center">
                      3
                    </span>
                    <div>
                      <h3 className="font-space font-bold text-xl text-white">
                        Submit Payment Proof
                      </h3>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Provide your transfer receipt details for automated and manual audit.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Payment Method Dropdown */}
                    <div>
                      <label className="block text-xs font-mono text-gray-300 mb-1.5 font-semibold flex items-center justify-between">
                        <span>Payment Method</span>
                        <span className="text-[#38f2ff] text-[11px] font-normal">* Select Account</span>
                      </label>
                      <div className="relative flex items-center bg-[#060c18] border border-white/10 hover:border-[#38f2ff]/40 focus-within:border-[#38f2ff] focus-within:ring-2 focus-within:ring-[#38f2ff]/20 rounded-xl transition duration-200 overflow-hidden shadow-inner">
                        <div className="pl-3.5 pr-2 text-[#38f2ff] flex items-center justify-center pointer-events-none">
                          <span className="material-symbols-outlined text-lg">account_balance_wallet</span>
                        </div>
                        <select
                          value={selectedMethod}
                          onChange={(e) => setSelectedMethod(e.target.value as PaymentMethodType)}
                          className="w-full bg-transparent py-3 pr-11 pl-1 text-sm text-white focus:outline-none font-sans cursor-pointer appearance-none selection:bg-[#38f2ff]"
                        >
                          {PAYMENT_ACCOUNTS.map((acc) => (
                            <option key={acc.id} value={acc.id} className="bg-[#0b1322] text-white py-2">
                              {acc.name} ({acc.typeBadge}) — {acc.accountNumber}
                            </option>
                          ))}
                        </select>
                        <div className="absolute right-3 pointer-events-none text-[#38f2ff] flex items-center justify-center w-6 h-6 rounded-md bg-white/5 border border-white/10">
                          <span className="material-symbols-outlined text-base">expand_more</span>
                        </div>
                      </div>
                    </div>

                    {/* Transaction ID */}
                    <div>
                      <label className="block text-xs font-mono text-gray-300 mb-1.5 font-semibold flex items-center justify-between">
                        <span>Transaction ID (TrxID)</span>
                        <span className="text-[#38f2ff] text-[11px] font-normal">* Required</span>
                      </label>
                      <div className="relative flex items-center bg-[#060c18] border border-white/10 hover:border-white/20 focus-within:border-[#38f2ff] focus-within:ring-2 focus-within:ring-[#38f2ff]/20 rounded-xl transition duration-200 overflow-hidden shadow-inner">
                        <div className="pl-3.5 pr-2.5 text-[#38f2ff] flex items-center justify-center">
                          <span className="material-symbols-outlined text-lg">receipt_long</span>
                        </div>
                        <input
                          type="text"
                          required
                          value={transactionId}
                          onChange={(e) => setTransactionId(e.target.value)}
                          placeholder="e.g. TrxID / Ref #"
                          className="w-full bg-transparent py-3 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none font-mono uppercase tracking-wider"
                        />
                      </div>
                    </div>

                    {/* Sender Account */}
                    <div>
                      <label className="block text-xs font-mono text-gray-300 mb-1.5 font-semibold flex items-center justify-between">
                        <span>Sender Account / Phone Number</span>
                        <span className="text-[#38f2ff] text-[11px] font-normal">* Required</span>
                      </label>
                      <div className="relative flex items-center bg-[#060c18] border border-white/10 hover:border-white/20 focus-within:border-[#38f2ff] focus-within:ring-2 focus-within:ring-[#38f2ff]/20 rounded-xl transition duration-200 overflow-hidden shadow-inner">
                        <div className="pl-3.5 pr-2.5 text-gray-400 flex items-center justify-center">
                          <span className="material-symbols-outlined text-lg">smartphone</span>
                        </div>
                        <input
                          type="text"
                          required
                          value={senderAccount}
                          onChange={(e) => setSenderAccount(e.target.value)}
                          placeholder="Sender number or account"
                          className="w-full bg-transparent py-3 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none font-mono"
                        />
                      </div>
                    </div>

                    {/* Amount Sent */}
                    <div>
                      <label className="block text-xs font-mono text-gray-300 mb-1.5 font-semibold flex items-center justify-between">
                        <span>Amount Sent ({selectedPlan.currencySymbol === "$" ? "USD" : "BDT"})</span>
                        <span className="text-emerald-400 text-[11px] font-normal">Exact Fee</span>
                      </label>
                      <div className="relative flex items-center bg-[#060c18] border border-white/10 hover:border-white/20 focus-within:border-[#38f2ff] focus-within:ring-2 focus-within:ring-[#38f2ff]/20 rounded-xl transition duration-200 overflow-hidden shadow-inner">
                        <div className="pl-3.5 pr-2 text-emerald-400 font-mono font-bold text-xs flex items-center">
                          {selectedPlan.currencySymbol === "$" ? "USD" : "BDT"}
                        </div>
                        <input
                          type="text"
                          required
                          value={amountSent}
                          onChange={(e) => setAmountSent(e.target.value)}
                          placeholder={selectedPlan.price}
                          className="w-full bg-transparent py-3 pr-4 text-sm text-emerald-400 placeholder-gray-500 focus:outline-none font-mono font-bold"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Additional Notes */}
                  <div>
                    <label className="block text-xs font-mono text-gray-300 mb-1.5 font-semibold flex items-center justify-between">
                      <span>Additional Notes</span>
                      <span className="text-gray-500 text-[11px] font-normal">Optional</span>
                    </label>
                    <div className="relative flex items-start bg-[#060c18] border border-white/10 hover:border-white/20 focus-within:border-[#38f2ff] focus-within:ring-2 focus-within:ring-[#38f2ff]/20 rounded-xl transition duration-200 overflow-hidden shadow-inner">
                      <div className="pl-3.5 pr-2.5 pt-3 text-gray-400 flex items-center justify-center">
                        <span className="material-symbols-outlined text-lg">edit_note</span>
                      </div>
                      <textarea
                        rows={2}
                        value={additionalNotes}
                        onChange={(e) => setAdditionalNotes(e.target.value)}
                        placeholder="GitHub username or billing notes (optional)"
                        className="w-full bg-transparent py-3 pr-4 text-xs text-white placeholder-gray-500 focus:outline-none transition font-sans resize-none"
                      />
                    </div>
                  </div>

                  {/* Strict No Return Policy Notice */}
                  <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-xl text-[11px] text-amber-200 font-mono flex items-start justify-between gap-2.5">
                    <div className="flex items-start gap-2.5">
                      <span className="material-symbols-outlined text-base text-amber-400 mt-0.5">policy</span>
                      <span>
                        <strong className="text-amber-300">Strict No Return Policy:</strong> Digital software licenses and proprietary architecture source code are strictly non-returnable and non-refundable once delivered.
                      </span>
                    </div>
                    <Link
                      href="/refund-policy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 text-[10px] font-mono font-bold text-amber-300 hover:text-white underline decoration-amber-400/50 hover:decoration-white transition"
                    >
                      Read Policy ↗
                    </Link>
                  </div>

                  {/* License Agreement Checkbox */}
                  <div className="pt-2">
                    <label className="flex items-start gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        required
                        checked={agreedToTerms}
                        onChange={(e) => setAgreedToTerms(e.target.checked)}
                        className="mt-1 w-4 h-4 rounded border-gray-600 bg-[#030712] text-[#38f2ff] focus:ring-0 cursor-pointer"
                      />
                      <span className="text-xs text-gray-300 leading-relaxed font-sans">
                        I confirm that I have transferred the required licensing fee and agree to the{" "}
                        <Link
                          href="/commercial-license"
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-[#38f2ff] font-semibold underline hover:text-[#78f5ff] transition"
                        >
                          DevEngine Commercial License Agreement
                        </Link>
                        , Non-Disclosure terms, and the{" "}
                        <Link
                          href="/refund-policy"
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-amber-400 font-semibold underline hover:text-amber-300 transition"
                        >
                          Strict No Return / No Refund Policy
                        </Link>
                        .
                      </span>
                    </label>
                  </div>

                  {/* Error Message */}
                  {errorMessage && (
                    <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs font-mono">
                      ⚠️ {errorMessage}
                    </div>
                  )}

                  {/* Submit CTA */}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-4 rounded-xl bg-[#38f2ff] hover:bg-[#00e1f0] text-[#030712] font-space font-bold text-base sm:text-lg transition shadow-[0_0_35px_rgba(56,242,255,0.45)] hover:shadow-[0_0_50px_rgba(56,242,255,0.65)] hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none cursor-pointer flex items-center justify-center gap-3"
                  >
                    {submitting ? (
                      <>
                        <span className="w-5 h-5 border-2 border-[#030712] border-t-transparent rounded-full animate-spin" />
                        <span>Verifying & Recording Order…</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-2xl">verified</span>
                        <span>Complete Checkout & Generate License</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}
      </main>

      {/* ══════════════════════════════════════════════════════
          SUCCESS POPUP MODAL (With Order ID & PDF Download)
      ══════════════════════════════════════════════════════ */}
      {completedOrder && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-2xl flex items-center justify-center p-4 sm:p-6 animate-fade-in">
          <div className="relative w-full max-w-xl bg-[#08111f] border-2 border-[#38f2ff]/60 rounded-3xl p-6 sm:p-9 shadow-[0_0_100px_rgba(56,242,255,0.3)]">
            {/* Top Bar with Tracking ID Copy */}
            <div className="flex items-center justify-between gap-3 mb-6 pb-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                <span className="font-mono text-xs text-gray-400 uppercase tracking-widest font-bold">
                  Order Verified & Recorded
                </span>
              </div>

              {/* Unique Tracking ID Box */}
              <div className="flex items-center gap-2 bg-[#030712] border border-[#38f2ff]/40 px-3 py-1.5 rounded-xl">
                <code className="font-mono text-xs font-bold text-[#38f2ff]">
                  {completedOrder.id}
                </code>
                <button
                  type="button"
                  onClick={() => handleCopyOrderId(completedOrder.id)}
                  className="text-gray-400 hover:text-white transition text-xs flex items-center"
                  title="Copy Tracking ID"
                >
                  <span className="material-symbols-outlined text-sm">content_copy</span>
                  {copiedOrderId && (
                    <span className="font-mono text-[10px] text-emerald-400 ml-1">Copied!</span>
                  )}
                </button>
              </div>
            </div>

            {/* Central Success Illustration */}
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center mx-auto mb-4 text-emerald-400 shadow-[0_0_30px_rgba(52,211,153,0.4)]">
                <span className="material-symbols-outlined text-4xl">check_circle</span>
              </div>
              <h3 className="font-space font-bold text-2xl sm:text-3xl text-white">
                Payment Proof Received!
              </h3>
              <p className="font-sans text-xs sm:text-sm text-gray-300 mt-2 max-w-md mx-auto leading-relaxed">
                Thank you, <strong className="text-white">{completedOrder.customerName}</strong>. Within <strong className="text-[#38f2ff]">24 hours</strong> your payment verification will be completed, and your official license keys and repository access will be dispatched to your email.
              </p>
            </div>

            {/* Order Summary Details Box */}
            <div className="bg-[#030712] border border-white/10 rounded-2xl p-4 sm:p-5 mb-6 space-y-2 text-xs font-mono">
              <div className="flex justify-between text-gray-400">
                <span>Licensed Project:</span>
                <span className="text-white font-bold">{completedOrder.projectTitle}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>License Tier:</span>
                <span className="text-[#38f2ff]">{completedOrder.planName}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Amount Paid:</span>
                <span className="text-emerald-400 font-bold">{completedOrder.currency === "USD" ? "USD" : "BDT"} {completedOrder.amount}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Method / TrxID:</span>
                <span className="text-gray-200">{completedOrder.paymentMethod} • {completedOrder.transactionId}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Delivery Email:</span>
                <span className="text-white font-semibold">{completedOrder.customerEmail}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              {/* Download PDF Button */}
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={pdfDownloading}
                className="w-full py-3.5 px-6 rounded-xl bg-[#38f2ff] hover:bg-[#00e1f0] text-[#030712] font-space font-bold text-sm sm:text-base transition shadow-[0_0_25px_rgba(56,242,255,0.4)] hover:scale-[1.01] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-xl">download</span>
                <span>{pdfDownloading ? "Generating PDF…" : "Download Invoice & License PDF"}</span>
              </button>

              {/* Close & Return Home */}
              <button
                type="button"
                onClick={handleCloseAndReturnHome}
                className="w-full py-3 px-6 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white font-mono text-xs transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Close & Return to Home</span>
                <span className="material-symbols-outlined text-sm">home</span>
              </button>
            </div>

            <p className="font-mono text-[10px] text-gray-500 text-center mt-4">
              Keep your Order ID (<span className="text-[#38f2ff]">{completedOrder.id}</span>) for order tracking and support assistance.
            </p>
          </div>
        </div>
      )}

      <LandingFooter />
    </>
  );
}
