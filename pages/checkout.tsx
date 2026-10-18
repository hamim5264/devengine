import React, { useEffect, useState, useMemo, useRef } from "react";
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
import styles from "@/components/projects/Checkout.module.css";

function getPaymentMethodIcon(id: string) {
  switch (id) {
    case "bKash":
      return "account_balance_wallet";
    case "Nagad":
      return "payments";
    case "Rocket":
      return "rocket_launch";
    case "Dutch-Bangla Bank":
    case "BRAC Bank":
      return "account_balance";
    default:
      return "credit_card";
  }
}

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
  const [isMethodDropdownOpen, setIsMethodDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsMethodDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const selectedAccount = useMemo(() => {
    return PAYMENT_ACCOUNTS.find((a) => a.id === selectedMethod) || PAYMENT_ACCOUNTS[0];
  }, [selectedMethod]);

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
            // Try fetching by doc ID directly
            const directSnap = await getDoc(doc(db, "projects", String(slug)));
            if (directSnap.exists()) {
              const dData = directSnap.data() as any;
              setProject({
                id: directSnap.id,
                slug: dData.slug || directSnap.id,
                title: dData.title || "Untitled Project",
                subtitle: dData.subtitle || "",
                category: dData.category || "General",
                price: dData.price ?? "0",
                discount: dData.discount,
                pricing: dData.pricing,
                pricingPlans: dData.pricingPlans,
                tags: dData.tags || [],
                isPublic: true,
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

  // Pricing tier resolution
  const pricingPlans = useMemo(() => {
    return getDefaultPricingPlans(project || undefined);
  }, [project]);

  const selectedPlan: ProjectPricingTier = useMemo(() => {
    if (queryPlan) {
      const match = pricingPlans.find(
        (p) => p.id.toLowerCase() === String(queryPlan).toLowerCase()
      );
      if (match) return match;
    }
    const popular = pricingPlans.find((p) => p.isPopular);
    return popular || pricingPlans[0] || {
      id: "studio",
      name: "Complete Studio License",
      tagline: "Full production architecture & source rights",
      price: "25,000",
      currencySymbol: "৳",
      billingPeriod: "one-time",
      buttonText: "Acquire License",
      isPopular: true,
      features: [
        { text: "Full Production Source Code", included: true },
        { text: "Comprehensive Architecture Guide", included: true },
        { text: "Deployment Environment Configs", included: true },
        { text: "6 Months Priority Updates & Support", included: true },
      ],
    };
  }, [pricingPlans, queryPlan]);

  // Pre-fill amount
  useEffect(() => {
    if (queryAmount) {
      setAmountSent(String(queryAmount));
    } else if (selectedPlan?.price) {
      setAmountSent(selectedPlan.price.replace(/[^0-9]/g, ""));
    }
  }, [queryAmount, selectedPlan]);

  // Copy account number
  const handleCopyAccount = (accNumber: string) => {
    navigator.clipboard.writeText(accNumber);
    setCopiedAccount(accNumber);
    setTimeout(() => setCopiedAccount(null), 2500);
  };

  // Copy tracking ID
  const handleCopyOrderId = (orderId: string) => {
    navigator.clipboard.writeText(orderId);
    setCopiedOrderId(true);
    setTimeout(() => setCopiedOrderId(false), 2500);
  };

  // Form submission handler
  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!customerName.trim()) {
      setErrorMessage("Please enter your full name.");
      return;
    }
    if (!customerEmail.trim() || !customerEmail.includes("@")) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }
    if (!customerPhone.trim()) {
      setErrorMessage("Please enter your phone or WhatsApp number.");
      return;
    }
    if (!transactionId.trim()) {
      setErrorMessage("Please enter your transfer Transaction ID (TrxID) or Reference number.");
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
    <div className={styles.checkoutPageRoot}>
      <Head>
        <title>Secure Checkout — Payment & License Verification | DevEngine</title>
        <meta
          name="description"
          content="Complete your software license acquisition. Secure manual payment verification for bKash, Nagad, Rocket, DBBL, and BRAC Bank."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      {/* Atmospheric Ambient Lighting Canvas */}
      <div className={styles.ambientCanvas} aria-hidden="true">
        <span className={styles.ambientBlobA} />
        <span className={styles.ambientBlobB} />
      </div>

      <LandingNavbar />

      <main className={styles.mainContainer}>
        {/* Breadcrumb Navigation */}
        <div className={styles.breadcrumbsRow}>
          <div className={styles.breadcrumbsLeft}>
            <Link href="/home" className={styles.breadcrumbLink}>Home</Link>
            <span>/</span>
            {project && (
              <>
                <Link href={`/projects/${project.slug}`} className={styles.breadcrumbLink}>
                  {project.title}
                </Link>
                <span>/</span>
                <Link href={`/projects/${project.slug}/pricing`} className={styles.breadcrumbLink}>
                  Pricing
                </Link>
                <span>/</span>
              </>
            )}
            <span className={styles.breadcrumbActive}>Secure Checkout</span>
          </div>

          {project && (
            <Link
              href={`/projects/${project.slug}/pricing`}
              className={styles.backBtn}
            >
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              <span>Back to Plans</span>
            </Link>
          )}
        </div>

        {/* Page Header */}
        <div className={styles.pageHeader}>
          <div className={styles.protocolPill}>
            <span className={styles.protocolDot} />
            <span className={styles.protocolText}>
              Secure Transaction Gateway
            </span>
          </div>
          <h1 className={styles.pageTitle}>
            Checkout & License Acquisition
          </h1>
          <p className={styles.pageSubtitle}>
            Direct manual transfer verification. Enter your details and transaction ID for instant license dispatch.
          </p>
        </div>

        {loadingProject ? (
          <div className="py-24 flex flex-col items-center justify-center text-center">
            <HelixLoader size={54} color="#2cecf7" />
            <p className="mt-4 font-mono text-xs text-[var(--devengine-muted)] uppercase tracking-widest">
              Loading Order Specifications…
            </p>
          </div>
        ) : (
          <div className={styles.checkoutGrid}>
            {/* ══════════════════════════════════════════════════════
                LEFT COLUMN: ORDER SUMMARY & SECURITY NOTICE
            ══════════════════════════════════════════════════════ */}
            <section className={styles.leftCol}>
              {/* Order Summary Card */}
              <div className={styles.summaryCard}>
                <div className={styles.summaryHeader}>
                  <div>
                    <span className={styles.summaryArchitectureTag}>
                      Licensed Architecture
                    </span>
                    <h2 className={styles.summaryProjectTitle}>
                      {project?.title || "DevEngine System"}
                    </h2>
                    <span className={styles.summaryTierName}>
                      Tier: <strong className="text-[var(--devengine-text)]">{selectedPlan.name}</strong>
                    </span>
                  </div>
                  <span className={`material-symbols-outlined ${styles.verifiedBadgeIcon}`}>
                    verified_user
                  </span>
                </div>

                {/* Included Deliverables */}
                <div className={styles.deliverablesBox}>
                  <div className={styles.deliverablesLabel}>
                    Deliverables Included:
                  </div>
                  {selectedPlan.features.slice(0, 4).map((feat, i) => (
                    <div key={i} className={styles.deliverableItem}>
                      <span className={`material-symbols-outlined ${styles.checkIcon}`}>
                        check_circle
                      </span>
                      <span>{feat.text}</span>
                    </div>
                  ))}
                </div>

                {/* Pricing Breakdown */}
                <div className={styles.breakdownBox}>
                  <div className={styles.breakdownRow}>
                    <span>Source Repository License</span>
                    <span className={styles.breakdownVal}>
                      {selectedPlan.currencySymbol || "৳"} {selectedPlan.price}
                    </span>
                  </div>
                  <div className={styles.breakdownRow}>
                    <span>Cloud Deployment Setup</span>
                    <span className={styles.freeTag}>Included Free</span>
                  </div>
                  <div className={styles.breakdownRow}>
                    <span>Priority Support</span>
                    <span className={styles.freeTag}>Active</span>
                  </div>

                  <div className={styles.totalBox}>
                    <div>
                      <span className={styles.totalLabel}>
                        Total Investment
                      </span>
                      {formatUsdPrice(selectedPlan.usdPrice, selectedPlan.price) && (
                        <span className={styles.usdEq}>
                          ≈ {formatUsdPrice(selectedPlan.usdPrice, selectedPlan.price)} USD
                        </span>
                      )}
                    </div>
                    <div className={styles.totalPriceWrapper}>
                      <span className={styles.totalCurrency}>
                        {selectedPlan.currencySymbol === "$" ? "USD" : "BDT"}
                      </span>
                      <span className={styles.totalPrice}>
                        {selectedPlan.price}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Security & Verification Notice */}
              <div className={styles.securityCard}>
                <div className={styles.securityIconWrap}>
                  <span className="material-symbols-outlined text-xl">shield_lock</span>
                </div>
                <div>
                  <h4 className={styles.securityTitle}>
                    Secure Verification Protocol
                  </h4>
                  <p className={styles.securityDesc}>
                    All transfers are verified manually by our engineering team. Upon submission, you will receive a unique tracking ID and downloadable PDF license certificate. Repository credentials are sent to your email within 2-4 hours.
                  </p>
                </div>
              </div>
            </section>

            {/* ══════════════════════════════════════════════════════
                RIGHT COLUMN: CHECKOUT FORM & MANUAL PAYMENT ACCOUNTS
            ══════════════════════════════════════════════════════ */}
            <section className={styles.formCol}>
              <form onSubmit={handleSubmitOrder} className="space-y-8">
                {/* STEP 1: CUSTOMER INFORMATION */}
                <div className={styles.stepCard}>
                  <div className={styles.stepCardHeader}>
                    <span className={styles.stepNumberBadge}>1</span>
                    <div>
                      <h3 className={styles.stepTitle}>
                        Customer & Licensee Information
                      </h3>
                      <p className={styles.stepSubtitle}>
                        Enter official contact details for license registration.
                      </p>
                    </div>
                  </div>

                  <div className={styles.formGrid}>
                    {/* Full Name */}
                    <div className={styles.formGroup}>
                      <div className={styles.labelRow}>
                        <label className={styles.fieldLabel}>Full Name</label>
                        <span className={styles.reqStar}>(Required)</span>
                      </div>
                      <div className={styles.inputWrapper}>
                        <div className={styles.inputIcon}>
                          <span className="material-symbols-outlined text-xl">person</span>
                        </div>
                        <input
                          type="text"
                          required
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          placeholder="MD. Abdul Hamim"
                          className={styles.textInput}
                        />
                      </div>
                    </div>

                    {/* Email Address */}
                    <div className={styles.formGroup}>
                      <div className={styles.labelRow}>
                        <label className={styles.fieldLabel}>Email Address</label>
                        <span className={styles.reqStar}>(Required)</span>
                      </div>
                      <div className={styles.inputWrapper}>
                        <div className={styles.inputIcon}>
                          <span className="material-symbols-outlined text-xl">alternate_email</span>
                        </div>
                        <input
                          type="email"
                          required
                          value={customerEmail}
                          onChange={(e) => setCustomerEmail(e.target.value)}
                          placeholder="name@company.com"
                          className={styles.textInput}
                        />
                      </div>
                    </div>

                    {/* Phone / WhatsApp */}
                    <div className={styles.formGroup}>
                      <div className={styles.labelRow}>
                        <label className={styles.fieldLabel}>Phone / WhatsApp Number</label>
                        <span className={styles.reqStar}>(Required)</span>
                      </div>
                      <div className={styles.inputWrapper}>
                        <div className={styles.inputIcon}>
                          <span className="material-symbols-outlined text-xl">call</span>
                        </div>
                        <input
                          type="tel"
                          required
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          placeholder="+880 1724 879284"
                          className={styles.textInput}
                          style={{ fontFamily: "var(--font-jetbrains, monospace)" }}
                        />
                      </div>
                    </div>

                    {/* Address */}
                    <div className={styles.formGroup}>
                      <div className={styles.labelRow}>
                        <label className={styles.fieldLabel}>Company / Physical Address</label>
                        <span className={styles.optText}>(Optional)</span>
                      </div>
                      <div className={styles.inputWrapper}>
                        <div className={styles.inputIcon}>
                          <span className="material-symbols-outlined text-xl">location_on</span>
                        </div>
                        <input
                          type="text"
                          value={customerAddress}
                          onChange={(e) => setCustomerAddress(e.target.value)}
                          placeholder="Dhaka, Bangladesh"
                          className={styles.textInput}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* STEP 2: "WE ACCEPT" / MANUAL PAYMENT INSTRUCTIONS */}
                <div className={styles.stepCard}>
                  <div className={styles.stepCardHeader}>
                    <span className={styles.stepNumberBadge}>2</span>
                    <div>
                      <h3 className={styles.stepTitle}>
                        We Accept — Payment Accounts
                      </h3>
                      <p className={styles.stepSubtitle}>
                        Transfer to any of the verified accounts below, then submit TrxID.
                      </p>
                    </div>
                  </div>

                  {/* Payment Accounts Grid */}
                  <div className={styles.accountsGrid}>
                    {PAYMENT_ACCOUNTS.map((acc) => {
                      const isSelected = selectedMethod === acc.id;
                      const isCopied = copiedAccount === acc.accountNumber;

                      return (
                        <div
                          key={acc.id}
                          onClick={() => setSelectedMethod(acc.id)}
                          className={`${styles.accountCard} ${
                            isSelected ? styles.accountCardSelected : ""
                          }`}
                        >
                          <div>
                            <div className={styles.accountCardTop}>
                              <div className={styles.accountBrandRow}>
                                <div
                                  className={styles.accountAvatar}
                                  style={{ backgroundColor: acc.accentColor }}
                                >
                                  <span className="material-symbols-outlined text-xl">
                                    {getPaymentMethodIcon(acc.id)}
                                  </span>
                                </div>
                                <div>
                                  <span className={styles.accountName}>
                                    {acc.name}
                                  </span>
                                  <div className={styles.accountMethodText}>
                                    {acc.methodType}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {isSelected && (
                                  <span className={styles.selectedIndicator}>
                                    <span className="material-symbols-outlined text-xs">check</span>
                                    Selected
                                  </span>
                                )}
                                <span className={styles.accountBadge}>
                                  {acc.typeBadge}
                                </span>
                              </div>
                            </div>

                            <div className={styles.accountMeta}>
                              <div>
                                Holder: <span className={styles.accountHolderHighlight}>{acc.accountHolder}</span>
                              </div>
                              <div className={styles.accountHintText}>
                                {acc.instructions}
                              </div>
                            </div>
                          </div>

                          {/* Account Number Box + Copy */}
                          <div className={styles.accountCardBottom}>
                            <div className={styles.accountNumberWrapper}>
                              <span className={styles.accountNumberLabel}>Account #</span>
                              <code className={styles.accountNumber}>
                                {acc.accountNumber}
                              </code>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyAccount(acc.accountNumber);
                              }}
                              className={`${styles.copyBtn} ${isCopied ? styles.copyBtnSuccess : ""}`}
                              title="Copy account number"
                            >
                              <span className="material-symbols-outlined text-xs">
                                {isCopied ? "check" : "content_copy"}
                              </span>
                              <span>{isCopied ? "Copied!" : "Copy"}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {/* 6th Slot: Alternative / International Support Tile */}
                    <div className={styles.altPaymentCard}>
                      <div>
                        <div className={styles.accountCardTop}>
                          <div className={styles.accountBrandRow}>
                            <div
                              className={styles.accountAvatar}
                              style={{ background: "linear-gradient(135deg, #10b981 0%, #059669 100%)" }}
                            >
                              <span className="material-symbols-outlined text-xl">support_agent</span>
                            </div>
                            <div>
                              <span className={styles.accountName}>Other Methods</span>
                              <div className={styles.accountMethodText}>
                                International & Wire Transfer
                              </div>
                            </div>
                          </div>
                          <span className={styles.accountBadge}>Assisted</span>
                        </div>

                        <div className={styles.accountMeta}>
                          <div>Wise, Payoneer, SWIFT Wire, or card invoice.</div>
                          <div className={styles.accountHintText}>
                            Instant human coordination with our engineering finance desk.
                          </div>
                        </div>
                      </div>

                      <div className={styles.accountCardBottom}>
                        <a
                          href="https://wa.me/8801724879284?text=Hi%20DevEngine,%20I%20want%20to%20complete%20license%20payment%20for%20my%20order."
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.waBtn}
                        >
                          <span className="material-symbols-outlined text-base">chat</span>
                          <span>WhatsApp Finance Desk</span>
                        </a>
                      </div>
                    </div>
                  </div>
                </div>

                {/* STEP 3: SUBMIT PAYMENT PROOF */}
                <div className={styles.stepCard}>
                  <div className={styles.stepCardHeader}>
                    <span className={styles.stepNumberBadge}>3</span>
                    <div>
                      <h3 className={styles.stepTitle}>
                        Submit Payment Proof
                      </h3>
                      <p className={styles.stepSubtitle}>
                        Provide your transfer receipt details for automated and manual audit.
                      </p>
                    </div>
                  </div>

                  <div className={styles.formGrid}>
                    {/* Payment Method Custom Dropdown */}
                    <div className={styles.formGroup}>
                      <div className={styles.labelRow}>
                        <label className={styles.fieldLabel}>Payment Method</label>
                        <span className={styles.reqStar}>(Required)</span>
                      </div>
                      <div ref={dropdownRef} className={styles.customDropdown}>
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => setIsMethodDropdownOpen((prev) => !prev)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setIsMethodDropdownOpen((prev) => !prev);
                            }
                          }}
                          className={`${styles.dropdownTrigger} ${
                            isMethodDropdownOpen ? styles.dropdownTriggerActive : ""
                          }`}
                        >
                          <div className={styles.dropdownTriggerContent}>
                            <div
                              className={styles.dropdownAvatar}
                              style={{ backgroundColor: selectedAccount.accentColor }}
                            >
                              <span className="material-symbols-outlined text-base">
                                {getPaymentMethodIcon(selectedAccount.id)}
                              </span>
                            </div>
                            <div className={styles.dropdownInfo}>
                              <div className="flex items-center gap-2">
                                <span className={styles.dropdownName}>{selectedAccount.name}</span>
                                <span className={styles.accountBadge}>{selectedAccount.typeBadge}</span>
                              </div>
                              <span className={styles.dropdownAccountNumber}>
                                {selectedAccount.accountNumber}
                              </span>
                            </div>
                          </div>
                          <span
                            className={`material-symbols-outlined ${styles.dropdownChevron} ${
                              isMethodDropdownOpen ? styles.dropdownChevronOpen : ""
                            }`}
                          >
                            expand_more
                          </span>
                        </div>

                        {/* Dropdown Menu */}
                        {isMethodDropdownOpen && (
                          <div className={styles.dropdownMenu}>
                            <div className={styles.dropdownMenuHeader}>
                              Verified Receiving Accounts
                            </div>
                            {PAYMENT_ACCOUNTS.map((acc) => {
                              const isSelected = selectedMethod === acc.id;
                              return (
                                <div
                                  key={acc.id}
                                  onClick={() => {
                                    setSelectedMethod(acc.id);
                                    setIsMethodDropdownOpen(false);
                                  }}
                                  className={`${styles.dropdownItem} ${
                                    isSelected ? styles.dropdownItemSelected : ""
                                  }`}
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div
                                      className={styles.dropdownAvatar}
                                      style={{ backgroundColor: acc.accentColor }}
                                    >
                                      <span className="material-symbols-outlined text-base">
                                        {getPaymentMethodIcon(acc.id)}
                                      </span>
                                    </div>
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span className={styles.dropdownItemName}>{acc.name}</span>
                                        <span className={styles.accountBadge}>{acc.typeBadge}</span>
                                      </div>
                                      <span className={styles.dropdownItemSub}>
                                        {acc.accountNumber} • {acc.accountHolder}
                                      </span>
                                    </div>
                                  </div>

                                  {isSelected && (
                                    <span className="material-symbols-outlined text-lg text-[#2cecf7] shrink-0">
                                      check
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Transaction ID */}
                    <div className={styles.formGroup}>
                      <div className={styles.labelRow}>
                        <label className={styles.fieldLabel}>Transaction ID (TrxID)</label>
                        <span className={styles.reqStar}>(Required)</span>
                      </div>
                      <div className={styles.inputWrapper}>
                        <div className={styles.inputIcon} style={{ color: "#2cecf7" }}>
                          <span className="material-symbols-outlined text-xl">receipt_long</span>
                        </div>
                        <input
                          type="text"
                          required
                          value={transactionId}
                          onChange={(e) => setTransactionId(e.target.value)}
                          placeholder="e.g. 9J4K2L8M or Ref #"
                          className={styles.textInput}
                          style={{ fontFamily: "var(--font-jetbrains, monospace)", textTransform: "uppercase", letterSpacing: "0.05em" }}
                        />
                      </div>
                    </div>

                    {/* Sender Account */}
                    <div className={styles.formGroup}>
                      <div className={styles.labelRow}>
                        <label className={styles.fieldLabel}>Sender Account / Phone Number</label>
                        <span className={styles.reqStar}>(Required)</span>
                      </div>
                      <div className={styles.inputWrapper}>
                        <div className={styles.inputIcon}>
                          <span className="material-symbols-outlined text-xl">smartphone</span>
                        </div>
                        <input
                          type="text"
                          required
                          value={senderAccount}
                          onChange={(e) => setSenderAccount(e.target.value)}
                          placeholder="e.g. 017XXXXXXXX or Account #"
                          className={styles.textInput}
                          style={{ fontFamily: "var(--font-jetbrains, monospace)" }}
                        />
                      </div>
                    </div>

                    {/* Amount Sent */}
                    <div className={styles.formGroup}>
                      <div className={styles.labelRow}>
                        <label className={styles.fieldLabel}>
                          Amount Sent ({selectedPlan.currencySymbol === "$" ? "USD" : "BDT"})
                        </label>
                        <span style={{ color: "#10b981", fontSize: "0.74rem", fontWeight: 700 }}>
                          (Exact Fee)
                        </span>
                      </div>
                      <div className={styles.inputWrapper}>
                        <div className={styles.inputIcon} style={{ color: "#10b981", fontWeight: 700, fontFamily: "var(--font-jetbrains, monospace)" }}>
                          {selectedPlan.currencySymbol === "$" ? "USD" : "BDT"}
                        </div>
                        <input
                          type="text"
                          required
                          value={amountSent}
                          onChange={(e) => setAmountSent(e.target.value)}
                          placeholder={selectedPlan.price}
                          className={styles.textInput}
                          style={{ color: "#10b981", fontWeight: 750, fontFamily: "var(--font-jetbrains, monospace)" }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Additional Notes */}
                  <div className={styles.formGroup} style={{ marginTop: "1.5rem" }}>
                    <div className={styles.labelRow}>
                      <label className={styles.fieldLabel}>Additional Notes</label>
                      <span className={styles.optText}>(Optional)</span>
                    </div>
                    <div className={styles.inputWrapper} style={{ alignItems: "flex-start" }}>
                      <div className={styles.inputIcon} style={{ paddingTop: "0.85rem" }}>
                        <span className="material-symbols-outlined text-xl">edit_note</span>
                      </div>
                      <textarea
                        rows={2}
                        value={additionalNotes}
                        onChange={(e) => setAdditionalNotes(e.target.value)}
                        placeholder="GitHub username or billing notes (optional)"
                        className={styles.textareaInput}
                      />
                    </div>
                  </div>

                  {/* Strict No Return Policy Notice */}
                  <div className={styles.policyBanner} style={{ marginTop: "1.25rem" }}>
                    <div className="flex items-start gap-2.5">
                      <span className="material-symbols-outlined text-base mt-0.5">policy</span>
                      <span>
                        <strong>Strict No Return Policy:</strong> Digital software licenses and proprietary architecture source code are strictly non-returnable and non-refundable once delivered.
                      </span>
                    </div>
                    <Link
                      href="/refund-policy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 text-xs font-mono font-bold underline transition"
                    >
                      Read Policy ↗
                    </Link>
                  </div>

                  {/* License Agreement Checkbox */}
                  <div style={{ marginTop: "1.25rem" }}>
                    <label className={styles.termsLabel}>
                      <input
                        type="checkbox"
                        required
                        checked={agreedToTerms}
                        onChange={(e) => setAgreedToTerms(e.target.checked)}
                        className={styles.termsCheckbox}
                      />
                      <span>
                        I confirm that I have transferred the required licensing fee and agree to the{" "}
                        <Link
                          href="/commercial-license"
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className={styles.termsLink}
                        >
                          DevEngine Commercial License Agreement
                        </Link>
                        , Non-Disclosure terms, and the{" "}
                        <Link
                          href="/refund-policy"
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className={styles.refundLink}
                        >
                          Strict No Return / No Refund Policy
                        </Link>
                        .
                      </span>
                    </label>
                  </div>

                  {/* Error Message */}
                  {errorMessage && (
                    <div style={{ marginTop: "1rem" }} className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-500 text-xs font-mono font-semibold">
                      ⚠️ {errorMessage}
                    </div>
                  )}

                  {/* Submit CTA */}
                  <div style={{ marginTop: "1.5rem" }}>
                    <button
                      type="submit"
                      disabled={submitting}
                      className={styles.submitBtn}
                    >
                      {submitting ? (
                        <>
                          <span className="w-5 h-5 border-2 border-[#02040a] border-t-transparent rounded-full animate-spin" />
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
        <div className={styles.successModalBackdrop}>
          <div className={styles.successModalCard}>
            {/* Top Bar with Tracking ID Copy */}
            <div className="flex items-center justify-between gap-3 mb-6 pb-4 border-b border-[var(--devengine-border)]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                <span className="font-mono text-xs text-[var(--devengine-muted)] uppercase tracking-widest font-bold">
                  Order Verified & Recorded
                </span>
              </div>

              {/* Unique Tracking ID Box */}
              <div className="flex items-center gap-2 bg-[var(--devengine-surface)] border border-[#2cecf7]/50 px-3 py-1.5 rounded-xl shadow-sm">
                <code className="font-mono text-xs font-bold text-[#2cecf7]">
                  {completedOrder.id}
                </code>
                <button
                  type="button"
                  onClick={() => handleCopyOrderId(completedOrder.id)}
                  className="text-[var(--devengine-muted)] hover:text-[var(--devengine-text)] transition text-xs flex items-center"
                  title="Copy Tracking ID"
                >
                  <span className="material-symbols-outlined text-sm">content_copy</span>
                  {copiedOrderId && (
                    <span className="font-mono text-[10px] text-emerald-500 ml-1">Copied!</span>
                  )}
                </button>
              </div>
            </div>

            {/* Central Success Illustration */}
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-emerald-500/15 border-2 border-emerald-500 flex items-center justify-center mx-auto mb-4 text-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                <span className="material-symbols-outlined text-4xl">check_circle</span>
              </div>
              <h3 className="font-space font-bold text-2xl sm:text-3xl text-[var(--devengine-text)]">
                Payment Proof Received!
              </h3>
              <p className="text-xs sm:text-sm text-[var(--devengine-muted)] mt-2 max-w-md mx-auto leading-relaxed">
                Thank you, <strong className="text-[var(--devengine-text)]">{completedOrder.customerName}</strong>. Within <strong className="text-[#2cecf7]">24 hours</strong> your payment verification will be completed, and your official license keys and repository access will be dispatched to your email.
              </p>
            </div>

            {/* Order Summary Details Box */}
            <div className={styles.successOrderSummary}>
              <div className="flex justify-between text-[var(--devengine-muted)]">
                <span>Licensed Project:</span>
                <span className="text-[var(--devengine-text)] font-bold">{completedOrder.projectTitle}</span>
              </div>
              <div className="flex justify-between text-[var(--devengine-muted)]">
                <span>License Tier:</span>
                <span className="text-[#2cecf7] font-semibold">{completedOrder.planName}</span>
              </div>
              <div className="flex justify-between text-[var(--devengine-muted)]">
                <span>Amount Paid:</span>
                <span className="text-emerald-500 font-bold">{completedOrder.currency === "USD" ? "USD" : "BDT"} {completedOrder.amount}</span>
              </div>
              <div className="flex justify-between text-[var(--devengine-muted)]">
                <span>Method / TrxID:</span>
                <span className="text-[var(--devengine-text)] font-mono">{completedOrder.paymentMethod} • {completedOrder.transactionId}</span>
              </div>
              <div className="flex justify-between text-[var(--devengine-muted)]">
                <span>Delivery Email:</span>
                <span className="text-[var(--devengine-text)] font-semibold">{completedOrder.customerEmail}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              {/* Download PDF Button */}
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={pdfDownloading}
                className={styles.submitBtn}
                style={{ fontSize: "0.95rem", padding: "0.95rem 1.5rem" }}
              >
                <span className="material-symbols-outlined text-xl">download</span>
                <span>{pdfDownloading ? "Generating PDF…" : "Download Invoice & License PDF"}</span>
              </button>

              {/* Close & Return Home */}
              <button
                type="button"
                onClick={handleCloseAndReturnHome}
                className="w-full py-3 px-6 rounded-xl bg-[var(--devengine-surface)] hover:bg-[var(--devengine-soft)] border border-[var(--devengine-border)] text-[var(--devengine-text)] font-mono text-xs transition flex items-center justify-center gap-2 cursor-pointer font-bold"
              >
                <span>Close & Return to Home</span>
                <span className="material-symbols-outlined text-sm">home</span>
              </button>
            </div>

            <p className="font-mono text-[11px] text-[var(--devengine-muted)] text-center mt-4">
              Keep your Order ID (<span className="text-[#2cecf7] font-bold">{completedOrder.id}</span>) for order tracking and support assistance.
            </p>
          </div>
        </div>
      )}

      <LandingFooter />
    </div>
  );
}
