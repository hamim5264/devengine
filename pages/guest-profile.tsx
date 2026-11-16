import React, { useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import LandingNavbar from "@/components/landing/LandingNavbar";
import LandingFooter from "@/components/landing/LandingFooter";
import HelixLoader from "@/components/HelixLoader";
import PaymentVerificationModal from "@/components/PaymentVerificationModal";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import {
  getUserOrders,
  getUserReviews,
  getUserFavoriteDesigns,
  toggleFavoriteDesign,
} from "@/lib/services/marketplaceService";
import type { LandingDesign, MarketplaceOrder, DesignReview } from "@/types/marketplace";
import { OrderRecord } from "@/types/order";

export default function GuestProfilePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [userUid, setUserUid] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("Guest User");
  const [userPhone, setUserPhone] = useState<string>("");

  const [activeTab, setActiveTab] = useState<"favorites" | "orders" | "reviews" | "verify">("favorites");

  // Data states
  const [favorites, setFavorites] = useState<LandingDesign[]>([]);
  const [orders, setOrders] = useState<MarketplaceOrder[]>([]);
  const [reviews, setReviews] = useState<DesignReview[]>([]);

  // Verification state (inline lookup)
  const [verifyTrackingCode, setVerifyTrackingCode] = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyResult, setVerifyResult] = useState<any | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        // Check localStorage fallback
        const storedStr = typeof window !== "undefined" ? localStorage.getItem("devengine_guest") : null;
        if (storedStr) {
          try {
            const parsed = JSON.parse(storedStr);
            setUserUid(parsed.uid || null);
            setUserEmail(parsed.email || null);
            setUserName(parsed.fullName || "Guest User");
            setUserPhone(parsed.phone || "");
          } catch {}
        }
        setLoading(false);
        return;
      }

      setUserUid(user.uid);
      setUserEmail(user.email);
      setUserName(user.displayName || user.email?.split("@")[0] || "Guest User");

      // Fetch extended info from Firestore
      try {
        const snap = await getDoc(doc(db, "guest_users", user.uid));
        if (snap.exists()) {
          const d = snap.data();
          if (d.fullName) setUserName(d.fullName);
          if (d.phone) setUserPhone(d.phone);
        }
      } catch {}

      // Load user marketplace activities
      try {
        const [userFavs, userOrds, userRevs] = await Promise.all([
          getUserFavoriteDesigns(user.uid),
          getUserOrders(user.email, user.uid),
          getUserReviews(user.uid, user.email),
        ]);
        setFavorites(userFavs);
        setOrders(userOrds);
        setReviews(userRevs);
      } catch (err) {
        console.error("Error loading profile data:", err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem("devengine_guest");
      router.push("/landing-page-designs");
    } catch {
      router.push("/landing-page-designs");
    }
  };

  const handleRemoveFavorite = async (designId: string) => {
    if (!userUid) return;
    try {
      await toggleFavoriteDesign(designId, userUid);
      setFavorites((prev) => prev.filter((d) => d.id !== designId));
      showToast("Removed from favorites.");
    } catch {
      showToast("Could not remove favorite.");
    }
  };

  // Inline payment verification search
  const handleInlineVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = verifyTrackingCode.trim().toUpperCase();
    if (!clean) return;

    setVerifyLoading(true);
    setVerifyError(null);
    setVerifyResult(null);

    try {
      // 1. Check landing_page_orders
      let foundOrder: any = null;
      const lpDoc = await getDoc(doc(db, "landing_page_orders", clean));
      if (lpDoc.exists()) {
        foundOrder = { id: lpDoc.id, ...lpDoc.data() };
      } else {
        // 2. Check general orders collection
        const ordDoc = await getDoc(doc(db, "orders", clean));
        if (ordDoc.exists()) {
          foundOrder = { id: ordDoc.id, ...ordDoc.data() };
        } else {
          // Query fallback
          const q = query(collection(db, "landing_page_orders"), where("id", "==", clean));
          const qSnap = await getDocs(q);
          if (!qSnap.empty) {
            foundOrder = { id: qSnap.docs[0].id, ...qSnap.docs[0].data() };
          }
        }
      }

      if (!foundOrder) {
        setVerifyError("No order found with this tracking ID. Please check and retry.");
      } else {
        setVerifyResult(foundOrder);
      }
    } catch (err: any) {
      setVerifyError(err.message || "Failed to verify order.");
    } finally {
      setVerifyLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--devengine-bg)] flex flex-col justify-between">
        <LandingNavbar />
        <div className="py-32 flex flex-col items-center justify-center gap-3">
          <HelixLoader size={48} color="#2cecf7" />
          <p className="text-xs uppercase font-mono tracking-widest text-[#2cecf7]">Loading Profile...</p>
        </div>
        <LandingFooter />
      </div>
    );
  }

  if (!userUid && !userEmail) {
    return (
      <div className="min-h-screen bg-[var(--devengine-bg)] text-slate-900 dark:text-white flex flex-col justify-between selection:bg-[#2cecf7] selection:text-[#02040a]">
        <Head>
          <title>Guest Profile | DevEngine Marketplace</title>
        </Head>
        <LandingNavbar />
        <main className="flex-1 max-w-md mx-auto text-center py-28 px-4 flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-3xl bg-[#2cecf7]/10 border border-[#2cecf7]/20 flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-3xl text-[#00a8b5] dark:text-[#2cecf7]">person</span>
          </div>
          <h1 className="text-2xl font-bold mb-2">Guest Profile Access</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 max-w-sm">
            Sign in to view your favorited landing pages, verified reviews, and track your purchase deliveries.
          </p>
          <div className="flex gap-3">
            <Link
              href="/guest-login?returnUrl=/guest-profile"
              className="px-6 py-2.5 rounded-xl bg-[#2cecf7] text-[#02040a] font-bold text-xs uppercase tracking-wider hover:bg-[#2cecf7]/90 transition-all shadow-[0_0_20px_rgba(44,236,247,0.3)]"
            >
              Sign In or Register
            </Link>
            <Link
              href="/landing-page-designs"
              className="px-6 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold hover:border-[#2cecf7] transition-all"
            >
              Browse Designs
            </Link>
          </div>
        </main>
        <LandingFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--devengine-bg)] text-slate-900 dark:text-white flex flex-col justify-between selection:bg-[#2cecf7] selection:text-[#02040a]">
      <Head>
        <title>{`${userName || "Guest"} · Guest Profile | DevEngine`}</title>
        <meta name="description" content="Manage your saved landing page designs, orders, and reviews on DevEngine." />
      </Head>

      <LandingNavbar />

      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-5 py-3 rounded-2xl bg-[#02040a] text-white border border-[#2cecf7] shadow-[0_0_25px_rgba(44,236,247,0.3)] text-xs font-semibold flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-2">
          <span className="material-symbols-outlined text-[#2cecf7] text-base">check_circle</span>
          <span>{toastMessage}</span>
        </div>
      )}

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 pt-28 sm:pt-32 pb-20">
        {/* Profile Header Banner */}
        <div className="bg-gradient-to-r from-cyan-500/10 via-blue-500/5 to-transparent border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-6 sm:p-8 mb-8 backdrop-blur-md relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-[#2cecf7] to-blue-600 flex items-center justify-center text-[#02040a] text-2xl font-black shadow-lg shadow-cyan-500/20 shrink-0">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">{userName}</h1>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#2cecf7]/15 text-[#00a8b5] dark:text-[#2cecf7] border border-[#2cecf7]/30">
                    Verified Guest
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-x-4 gap-y-1">
                  {userEmail && (
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">mail</span>
                      {userEmail}
                    </span>
                  )}
                  {userPhone && (
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">phone</span>
                      {userPhone}
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-center">
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-[#2cecf7] text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <span className="material-symbols-outlined text-sm text-[#00a8b5] dark:text-[#2cecf7]">verified</span>
                <span>Verify Payment</span>
              </button>
              <button
                type="button"
                onClick={handleSignOut}
                className="px-4 py-2 rounded-xl border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">logout</span>
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-px mb-8 overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab("favorites")}
            className={`px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === "favorites"
                ? "border-[#2cecf7] text-[#00a8b5] dark:text-[#2cecf7]"
                : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <span className="material-symbols-outlined text-base">favorite</span>
            <span>Saved Favorites</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800">
              {favorites.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("orders")}
            className={`px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === "orders"
                ? "border-[#2cecf7] text-[#00a8b5] dark:text-[#2cecf7]"
                : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <span className="material-symbols-outlined text-base">shopping_bag</span>
            <span>Purchase History</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800">
              {orders.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("reviews")}
            className={`px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === "reviews"
                ? "border-[#2cecf7] text-[#00a8b5] dark:text-[#2cecf7]"
                : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <span className="material-symbols-outlined text-base">rate_review</span>
            <span>My Reviews</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800">
              {reviews.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("verify")}
            className={`px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === "verify"
                ? "border-[#2cecf7] text-[#00a8b5] dark:text-[#2cecf7]"
                : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <span className="material-symbols-outlined text-base">receipt_long</span>
            <span>Manual Payment Verification</span>
          </button>
        </div>

        {/* TAB 1: FAVORITES */}
        {activeTab === "favorites" && (
          <div>
            {favorites.length === 0 ? (
              <div className="py-20 text-center rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
                <span className="material-symbols-outlined text-5xl text-slate-400 mb-3">favorite_border</span>
                <h3 className="text-base font-bold mb-1">No Favorite Designs Saved</h3>
                <p className="text-xs text-slate-500 mb-5 max-w-xs mx-auto">
                  Browse through our landing page designs and tap the heart icon to curate your collection.
                </p>
                <Link
                  href="/landing-page-designs"
                  className="px-5 py-2.5 rounded-xl bg-[#2cecf7] text-[#02040a] font-bold text-xs uppercase tracking-wider hover:bg-[#2cecf7]/90"
                >
                  Explore Designs
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {favorites.map((design) => (
                  <div
                    key={design.id}
                    className="group rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-[#070e17]/70 backdrop-blur-md overflow-hidden hover:border-[#2cecf7]/50 transition-all shadow-sm"
                  >
                    <div className="relative aspect-[16/10] overflow-hidden bg-slate-100 dark:bg-slate-900">
                      <img
                        src={design.thumbnailUrl}
                        alt={design.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveFavorite(design.id)}
                        title="Remove from favorites"
                        className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 text-rose-400 backdrop-blur-md flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-base">favorite</span>
                      </button>
                    </div>

                    <div className="p-5">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider font-mono text-[#00a8b5] dark:text-[#2cecf7]">
                          {design.categoryName || "Landing Page"}
                        </span>
                        <div className="flex items-center gap-1 text-xs font-bold">
                          <span className="text-amber-400 text-sm">★</span>
                          <span>{design.rating || "5.0"}</span>
                        </div>
                      </div>

                      <h3 className="text-base font-extrabold mb-1 group-hover:text-[#00a8b5] dark:group-hover:text-[#2cecf7] transition-colors">
                        {design.title}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-4">
                        {design.shortDescription}
                      </p>

                      <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-mono block">License</span>
                          <span className="text-sm font-black text-slate-900 dark:text-white">
                            ৳{Number(design.price).toLocaleString()}
                          </span>
                        </div>
                        <Link
                          href={`/landing-page-designs/${design.slug}`}
                          className="px-4 py-2 rounded-xl bg-[#2cecf7] text-[#02040a] font-bold text-xs hover:bg-[#2cecf7]/90 transition-colors"
                        >
                          View Details
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: PURCHASE HISTORY & ORDERS */}
        {activeTab === "orders" && (
          <div>
            {orders.length === 0 ? (
              <div className="py-20 text-center rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
                <span className="material-symbols-outlined text-5xl text-slate-400 mb-3">inventory_2</span>
                <h3 className="text-base font-bold mb-1">No Orders Found</h3>
                <p className="text-xs text-slate-500 mb-5 max-w-xs mx-auto">
                  When you purchase landing page templates or submit payment details, your orders and digital downloads will appear here.
                </p>
                <Link
                  href="/landing-page-designs"
                  className="px-5 py-2.5 rounded-xl bg-[#2cecf7] text-[#02040a] font-bold text-xs uppercase tracking-wider hover:bg-[#2cecf7]/90"
                >
                  Explore Marketplace
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((ord) => (
                  <div
                    key={ord.id}
                    className="p-5 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-[#070e17]/70 backdrop-blur-md flex flex-col md:flex-row items-start md:items-center justify-between gap-5"
                  >
                    <div className="flex items-start sm:items-center gap-4">
                      {ord.thumbnailUrl ? (
                        <img
                          src={ord.thumbnailUrl}
                          alt={ord.designTitle}
                          className="w-16 h-12 rounded-xl object-cover bg-slate-100 dark:bg-slate-900 shrink-0"
                        />
                      ) : (
                        <div className="w-16 h-12 rounded-xl bg-[#2cecf7]/10 flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-lg text-[#2cecf7]">folder_zip</span>
                        </div>
                      )}
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h3 className="text-sm sm:text-base font-bold">{ord.designTitle}</h3>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider font-mono ${
                              ord.status === "Verified"
                                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                                : ord.status === "Rejected"
                                ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                                : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                            }`}
                          >
                            {ord.status}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap gap-x-4 gap-y-1 font-mono">
                          <span>ID: {ord.id}</span>
                          <span>Method: {ord.paymentMethod}</span>
                          {ord.transactionId && <span>TrxID: {ord.transactionId}</span>}
                          <span>৳{Number(ord.amount).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 dark:border-slate-800/80">
                      {ord.status === "Verified" ? (
                        <a
                          href={ord.deliveryUrl || `/api/marketplace/download?token=${ord.downloadToken || ord.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-4 py-2 rounded-xl bg-[#2cecf7] text-[#02040a] font-bold text-xs flex items-center gap-1.5 shadow-[0_0_15px_rgba(44,236,247,0.3)] hover:bg-[#2cecf7]/90 transition-all"
                        >
                          <span className="material-symbols-outlined text-sm">download</span>
                          <span>Download Deliverables</span>
                        </a>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setVerifyTrackingCode(ord.id);
                            setActiveTab("verify");
                          }}
                          className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold hover:border-[#2cecf7] transition-all"
                        >
                          Check Status
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: REVIEWS */}
        {activeTab === "reviews" && (
          <div>
            {reviews.length === 0 ? (
              <div className="py-20 text-center rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
                <span className="material-symbols-outlined text-5xl text-slate-400 mb-3">rate_review</span>
                <h3 className="text-base font-bold mb-1">No Reviews Submitted Yet</h3>
                <p className="text-xs text-slate-500 mb-5 max-w-xs mx-auto">
                  Share your experience with templates you've acquired. Reviews help other creators choose the best designs.
                </p>
                <Link
                  href="/landing-page-designs"
                  className="px-5 py-2.5 rounded-xl bg-[#2cecf7] text-[#02040a] font-bold text-xs uppercase tracking-wider hover:bg-[#2cecf7]/90"
                >
                  Browse Designs to Review
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {reviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="p-5 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-[#070e17]/70 backdrop-blur-md"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold">{rev.designTitle}</span>
                        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                          {rev.status === "approved" ? "Approved" : "Under Moderation"}
                        </span>
                      </div>
                      <div className="flex text-amber-400 text-sm">
                        {"★".repeat(rev.rating)}
                        {"☆".repeat(5 - rev.rating)}
                      </div>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 mb-2 leading-relaxed">{rev.comment}</p>
                    <span className="text-[10px] text-slate-400 font-mono block">
                      Submitted on {new Date(rev.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: MANUAL PAYMENT VERIFICATION TOOL */}
        {activeTab === "verify" && (
          <div className="max-w-2xl mx-auto">
            <div className="p-6 sm:p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-[#070e17]/70 backdrop-blur-xl shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#2cecf7]/15 flex items-center justify-center text-[#00a8b5] dark:text-[#2cecf7]">
                  <span className="material-symbols-outlined text-xl">account_balance_wallet</span>
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold">Manual Payment Verification</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Enter your Order Tracking Code (e.g. LPD-2026-...) to check status in real time.
                  </p>
                </div>
              </div>

              <form onSubmit={handleInlineVerify} className="space-y-4 mb-6">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    Order Tracking Code / Order ID
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      placeholder="e.g. LPD-2026-9FA81"
                      value={verifyTrackingCode}
                      onChange={(e) => setVerifyTrackingCode(e.target.value)}
                      className="flex-1 px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono uppercase text-slate-900 dark:text-white focus:outline-none focus:border-[#2cecf7]"
                    />
                    <button
                      type="submit"
                      disabled={verifyLoading}
                      className="px-5 py-2.5 rounded-xl bg-[#2cecf7] text-[#02040a] font-bold text-xs uppercase tracking-wider hover:bg-[#2cecf7]/90 disabled:opacity-50 transition-all flex items-center gap-1.5 cursor-pointer shadow-[0_0_15px_rgba(44,236,247,0.3)]"
                    >
                      {verifyLoading ? (
                        <>
                          <HelixLoader size={16} color="#02040a" />
                          <span>Checking...</span>
                        </>
                      ) : (
                        <>
                          <span>Verify</span>
                          <span className="material-symbols-outlined text-sm">search</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>

              {verifyError && (
                <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center gap-2 mb-4">
                  <span className="material-symbols-outlined text-base">error</span>
                  <span>{verifyError}</span>
                </div>
              )}

              {verifyResult && (
                <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-3 text-xs">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                    <span className="font-bold text-sm">
                      {verifyResult.designTitle || verifyResult.projectTitle || "Marketplace Product"}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider font-mono ${
                        verifyResult.status === "Verified"
                          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                          : verifyResult.status === "Rejected"
                          ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                          : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                      }`}
                    >
                      {verifyResult.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-slate-600 dark:text-slate-400">
                    <div>
                      <span className="text-[10px] uppercase font-mono block text-slate-400">Amount</span>
                      <strong className="text-slate-900 dark:text-white">৳{verifyResult.amount}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-mono block text-slate-400">Payment Channel</span>
                      <strong className="text-slate-900 dark:text-white">{verifyResult.paymentMethod}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-mono block text-slate-400">Transaction ID</span>
                      <strong className="font-mono text-slate-900 dark:text-white">{verifyResult.transactionId || "N/A"}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-mono block text-slate-400">Delivery Status</span>
                      <strong className="text-slate-900 dark:text-white">{verifyResult.deliveryStatus || "Processing"}</strong>
                    </div>
                  </div>

                  {verifyResult.status === "Verified" && (
                    <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
                      <a
                        href={verifyResult.deliveryUrl || `/api/marketplace/download?token=${verifyResult.downloadToken || verifyResult.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-4 py-2 rounded-xl bg-[#2cecf7] text-[#02040a] font-bold text-xs flex items-center gap-1.5 shadow-[0_0_15px_rgba(44,236,247,0.3)] hover:bg-[#2cecf7]/90 transition-all"
                      >
                        <span className="material-symbols-outlined text-sm">download</span>
                        <span>Download Digital Delivery</span>
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Modal for full Payment Verification matching footer */}
      <PaymentVerificationModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

      <LandingFooter />
    </div>
  );
}
