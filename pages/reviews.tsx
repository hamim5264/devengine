import React, { useEffect, useState, useMemo } from "react";
import Head from "next/head";
import Link from "next/link";
import LandingNavbar from "@/components/landing/LandingNavbar";
import LandingFooter from "@/components/landing/LandingFooter";
import HelixLoader from "@/components/HelixLoader";
import { ReviewRecord } from "@/types/review";
import {
  getPublicApprovedReviews,
  submitReview,
} from "@/lib/services/reviewsService";

// Fallback featured testimonials if database has few
const DEFAULT_FEATURED: ReviewRecord[] = [
  {
    id: "featured-1",
    reviewerName: "Shirajom Monira",
    reviewerRole: "Student Project Purchaser",
    company: "DevEngine Archive",
    rating: 5,
    reviewText:
      "Great quality and easy to understand! I purchased a student project from DevEngine and was amazed by how clean and professional everything looked. Highly recommend!",
    status: "APPROVED",
    featured: true,
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "featured-2",
    reviewerName: "Alex Rivera",
    reviewerRole: "Lead Developer, TechFlow",
    company: "TechFlow Systems",
    rating: 5,
    reviewText:
      "The attention to detail is unparalleled. DevEngine provided an architectural foundation that accelerated our time-to-market by months. Simply exceptional engineering.",
    status: "APPROVED",
    featured: true,
    createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "featured-3",
    reviewerName: "Elena Lin",
    reviewerRole: "Creative Director",
    company: "Apex Studio",
    rating: 5,
    reviewText:
      "A game-changer for our studio. The clean architecture and premium design components let us focus on what really matters. 10/10 craftsmanship.",
    status: "APPROVED",
    featured: true,
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [ratingFilter, setRatingFilter] = useState<number | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Carousel State
  const [currentSlide, setCurrentSlide] = useState(0);

  // Write Review Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [company, setCompany] = useState("");
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Fetch reviews on mount
  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const list = await getPublicApprovedReviews();
        if (mounted) {
          setReviews(list);
        }
      } catch (err) {
        console.error("Error loading reviews:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  // Featured reviews for carousel: prioritize items with featured === true, else fallback to top rated
  const featuredSlides = useMemo(() => {
    const explicit = reviews.filter((r) => r.featured);
    if (explicit.length >= 2) return explicit;
    if (reviews.length >= 3) return reviews.slice(0, 3);
    return DEFAULT_FEATURED;
  }, [reviews]);

  // Auto-play carousel
  useEffect(() => {
    if (featuredSlides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % featuredSlides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [featuredSlides.length]);

  const handlePrevSlide = () => {
    setCurrentSlide((prev) =>
      prev === 0 ? featuredSlides.length - 1 : prev - 1
    );
  };

  const handleNextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % featuredSlides.length);
  };

  // Metrics calculations
  const totalReviewsCount = 500 + reviews.length;
  const avgRating = useMemo(() => {
    if (reviews.length === 0) return "4.9";
    const sum = reviews.reduce((acc, r) => acc + (r.rating || 5), 0);
    return (sum / reviews.length).toFixed(1);
  }, [reviews]);

  // Filtered reviews grid
  const filteredReviews = useMemo(() => {
    return reviews.filter((r) => {
      const matchesRating =
        ratingFilter === "ALL" || r.rating === ratingFilter;

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        r.reviewerName.toLowerCase().includes(q) ||
        (r.reviewerRole && r.reviewerRole.toLowerCase().includes(q)) ||
        (r.company && r.company.toLowerCase().includes(q)) ||
        r.reviewText.toLowerCase().includes(q);

      return matchesRating && matchesSearch;
    });
  }, [reviews, ratingFilter, searchQuery]);

  // Handle write review submit
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !feedback.trim()) {
      alert("Please enter your name and feedback.");
      return;
    }

    setSubmitting(true);
    try {
      await submitReview({
        reviewerName: name.trim(),
        reviewerRole: role.trim() || "Verified Client",
        company: company.trim(),
        rating,
        reviewText: feedback.trim(),
      });

      setSubmitSuccess(true);
      setName("");
      setRole("");
      setCompany("");
      setRating(5);
      setFeedback("");
    } catch (err) {
      console.error("Submission error:", err);
      alert("Failed to submit review. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Head>
        <title>Trust Wall & Client Feedback | DevEngine Extreme</title>
        <meta
          name="description"
          content="Cinematic engineering demands cinematic feedback. See how elite developers, student creators, and global software teams build with DevEngine."
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;600&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0..1,0&display=swap"
          rel="stylesheet"
        />
      </Head>

      <LandingNavbar />

      <main className="min-h-screen bg-[#080E1A] text-[#DDE2F3] font-sans selection:bg-[#38F2FF]/20 selection:text-[#38F2FF] overflow-x-hidden relative">
        {/* Background Grid & Volumetric Glows */}
        <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
          <div
            className="absolute inset-0 opacity-40"
            style={{
              backgroundImage: `linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px)`,
              backgroundSize: "40px 40px",
              maskImage: "radial-gradient(circle at center, black, transparent 80%)",
              WebkitMaskImage: "radial-gradient(circle at center, black, transparent 80%)",
            }}
          />
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#38f2ff]/10 rounded-full blur-[140px] mix-blend-screen" />
          <div className="absolute bottom-1/3 right-1/4 w-[600px] h-[600px] bg-[#3495EA]/10 rounded-full blur-[160px] mix-blend-screen" />
        </div>

        {/* Hero Section */}
        <section className="relative pt-36 pb-20 px-6 sm:px-12 md:px-20 max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-jetbrains text-[#38F2FF] tracking-widest uppercase mb-8 backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-[#38F2FF] animate-pulse" />
            <span>AUTHENTICATED CLIENT SENTIMENT</span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-white mb-6 max-w-5xl mx-auto font-['Space_Grotesk'] leading-[1.1]">
            Trusted By The People Who{" "}
            <span className="bg-gradient-to-r from-[#38F2FF] via-[#78F5FF] to-[#3495EA] bg-clip-text text-transparent">
              Build With Us
            </span>
          </h1>

          <p className="text-base sm:text-xl text-[#BAC9CB] max-w-3xl mx-auto mb-10 leading-relaxed font-normal">
            Cinematic engineering demands cinematic feedback. See how elite developers, engineering teams, and student innovators are leveraging DevEngine software.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 mb-16">
            <button
              type="button"
              onClick={() => {
                setSubmitSuccess(false);
                setModalOpen(true);
              }}
              className="px-8 py-3.5 rounded-full bg-[#38F2FF] hover:bg-[#78F5FF] text-[#030712] font-jetbrains text-xs font-bold tracking-widest uppercase transition-all shadow-[0_0_25px_rgba(56,242,255,0.4)] hover:shadow-[0_0_35px_rgba(56,242,255,0.7)] hover:scale-105 cursor-pointer flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">rate_review</span>
              <span>Write a Review</span>
            </button>
            <a
              href="#reviews-grid"
              className="px-8 py-3.5 rounded-full border border-[#00DBE8]/40 hover:border-[#38F2FF] text-[#38F2FF] hover:bg-[#38F2FF]/10 font-jetbrains text-xs font-semibold tracking-widest uppercase transition-all"
            >
              Explore Feedback ↓
            </a>
          </div>

          {/* Trust Metrics Cards (Glassmorphic) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="p-8 rounded-2xl bg-[#08111F]/70 backdrop-blur-2xl border border-white/10 hover:border-[#38F2FF]/50 transition-all duration-300 hover:shadow-[0_0_30px_rgba(56,242,255,0.15)] flex flex-col items-center justify-center relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-b from-[#38F2FF]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              <span className="font-jetbrains text-xs text-[#38F2FF] mb-2 tracking-widest uppercase opacity-80 font-semibold">
                Total Reviews
              </span>
              <div className="text-5xl font-bold text-white font-['Space_Grotesk'] flex items-baseline">
                <span>{totalReviewsCount}</span>
                <span className="text-[#38F2FF]">+</span>
              </div>
            </div>

            <div className="p-8 rounded-2xl bg-[#08111F]/70 backdrop-blur-2xl border border-white/10 hover:border-[#38F2FF]/50 transition-all duration-300 hover:shadow-[0_0_30px_rgba(56,242,255,0.15)] flex flex-col items-center justify-center relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-b from-[#38F2FF]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              <span className="font-jetbrains text-xs text-[#38F2FF] mb-2 tracking-widest uppercase opacity-80 font-semibold">
                Average Rating
              </span>
              <div className="text-5xl font-bold text-white font-['Space_Grotesk'] flex items-center gap-2">
                <span>{avgRating}</span>
                <span
                  className="material-symbols-outlined text-[#38F2FF] text-[36px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  star
                </span>
              </div>
            </div>

            <div className="p-8 rounded-2xl bg-[#08111F]/70 backdrop-blur-2xl border border-white/10 hover:border-[#38F2FF]/50 transition-all duration-300 hover:shadow-[0_0_30px_rgba(56,242,255,0.15)] flex flex-col items-center justify-center relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-b from-[#38F2FF]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              <span className="font-jetbrains text-xs text-[#38F2FF] mb-2 tracking-widest uppercase opacity-80 font-semibold">
                Projects Delivered
              </span>
              <div className="text-5xl font-bold text-white font-['Space_Grotesk'] flex items-baseline">
                <span>1,200</span>
                <span className="text-[#38F2FF]">+</span>
              </div>
            </div>
          </div>
        </section>

        {/* Featured Testimonials Carousel Section */}
        {featuredSlides.length > 0 && (
          <section className="py-16 max-w-7xl mx-auto px-6 sm:px-12 md:px-20 relative">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
              <div className="flex items-center gap-4">
                <div className="h-[2px] w-12 bg-[#38F2FF]" />
                <span className="font-jetbrains text-xs text-[#38F2FF] tracking-widest uppercase font-bold">
                  FEATURED TESTIMONIALS
                </span>
              </div>

              <div className="flex items-center gap-6">
                <div className="font-jetbrains text-xs text-[#38F2FF] tracking-widest font-semibold">
                  0{currentSlide + 1} / 0{featuredSlides.length}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePrevSlide}
                    className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-white hover:text-[#38F2FF] hover:border-[#38F2FF] transition-all hover:bg-[#38F2FF]/10 cursor-pointer"
                    aria-label="Previous Slide"
                  >
                    <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleNextSlide}
                    className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-white hover:text-[#38F2FF] hover:border-[#38F2FF] transition-all hover:bg-[#38F2FF]/10 cursor-pointer"
                    aria-label="Next Slide"
                  >
                    <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Carousel Display Box */}
            <div className="rounded-3xl p-8 sm:p-14 md:p-16 bg-[#08111F]/80 backdrop-blur-2xl border border-white/10 relative overflow-hidden shadow-2xl transition-all">
              {/* Subtle background ambient glow */}
              <div className="absolute top-0 right-0 w-96 h-96 bg-[#38F2FF]/5 rounded-full blur-3xl pointer-events-none" />

              {/* Current Active Slide */}
              {(() => {
                const active = featuredSlides[currentSlide];
                if (!active) return null;
                return (
                  <div key={active.id} className="relative z-10 max-w-4xl space-y-8 animate-fadeIn">
                    {/* Stars */}
                    <div className="flex gap-1 text-[#38F2FF]">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span
                          key={i}
                          className={`material-symbols-outlined text-[26px] ${
                            i < active.rating ? "text-[#38F2FF]" : "text-gray-700"
                          }`}
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          star
                        </span>
                      ))}
                    </div>

                    {/* Quotation */}
                    <blockquote className="text-xl sm:text-2xl md:text-3xl text-white font-['Space_Grotesk'] leading-relaxed font-semibold italic">
                      "{active.reviewText}"
                    </blockquote>

                    {/* Reviewer Profile */}
                    <div className="flex items-center gap-4 sm:gap-6 pt-2">
                      <div className="w-14 h-14 rounded-full bg-[#161C28] border border-[#38F2FF]/30 flex items-center justify-center font-['Space_Grotesk'] text-lg font-bold text-[#38F2FF] shadow-inner">
                        {active.reviewerName
                          .split(" ")
                          .map((p) => p[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                      <div>
                        <h4 className="text-base sm:text-lg font-bold text-white font-['Space_Grotesk']">
                          {active.reviewerName}
                        </h4>
                        <p className="text-xs sm:text-sm font-jetbrains text-[#BAC9CB] tracking-wide mt-0.5">
                          {active.reviewerRole || "Client / Developer"}
                          {active.company ? ` · ${active.company}` : ""}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </section>
        )}

        {/* Wall of Reviews Grid Section */}
        <section id="reviews-grid" className="py-20 max-w-7xl mx-auto px-6 sm:px-12 md:px-20">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 border-b border-white/10 pb-8">
            <div>
              <span className="font-jetbrains text-xs text-[#38F2FF] tracking-widest uppercase font-bold">
                COMMUNITY REVIEWS
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white font-['Space_Grotesk'] mt-1">
                The Verified Trust Wall
              </h2>
              <p className="text-sm text-gray-400 mt-1">
                Explore real feedback submitted by clients, enterprise license holders, and independent engineers.
              </p>
            </div>

            {/* Filter Bar & Search */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Rating Selector */}
              <div className="flex items-center gap-1.5 bg-[#08111F]/90 backdrop-blur-xl p-1.5 rounded-2xl border border-white/10 shadow-lg">
                {[
                  { label: "All", val: "ALL", icon: false },
                  { label: "5 Stars", val: 5, icon: true },
                  { label: "4 Stars", val: 4, icon: true },
                ].map((item) => {
                  const isActive = ratingFilter === item.val;
                  return (
                    <button
                      key={String(item.val)}
                      type="button"
                      onClick={() => setRatingFilter(item.val as any)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-jetbrains font-semibold tracking-wide transition-all duration-200 cursor-pointer flex items-center gap-1.5 whitespace-nowrap select-none ${
                        isActive
                          ? "bg-gradient-to-r from-[#38F2FF] to-[#00DBE8] text-[#030712] font-bold shadow-[0_0_18px_rgba(56,242,255,0.35)] scale-[1.02]"
                          : "text-[#BAC9CB] hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <span>{item.label}</span>
                      {item.icon && (
                        <span
                          className={`material-symbols-outlined text-[15px] ${
                            isActive ? "text-[#030712]" : "text-amber-400"
                          }`}
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          star
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Search Bar */}
              <div className="relative min-w-[260px] sm:w-72 md:w-80">
                <div className="relative flex items-center bg-[#08111F]/90 backdrop-blur-xl border border-white/10 rounded-2xl transition-all duration-200 hover:border-[#38F2FF]/40 focus-within:border-[#38F2FF] focus-within:shadow-[0_0_20px_rgba(56,242,255,0.25)]">
                  <span className="material-symbols-outlined pl-3.5 pr-2 text-[#38F2FF] text-[20px] pointer-events-none select-none">
                    search
                  </span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search reviews, clients, roles..."
                    className="w-full bg-transparent py-2.5 pr-9 text-xs text-white placeholder-gray-400 font-sans focus:outline-none"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 text-gray-400 hover:text-white transition-colors cursor-pointer p-0.5 rounded-full hover:bg-white/10"
                      title="Clear search"
                    >
                      <span className="material-symbols-outlined text-[16px] block">close</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Grid Content */}
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center">
              <HelixLoader size={48} color="#38F2FF" />
              <p className="mt-4 font-jetbrains text-xs text-gray-400 uppercase tracking-widest">
                Gathering Feedback…
              </p>
            </div>
          ) : filteredReviews.length === 0 ? (
            <div className="py-20 text-center rounded-3xl border border-white/10 bg-white/[0.01]">
              <span className="material-symbols-outlined text-gray-600 text-6xl mb-3">
                sentiment_satisfied
              </span>
              <h3 className="text-white text-lg font-bold">No Reviews Found</h3>
              <p className="text-gray-400 text-sm mt-1 max-w-md mx-auto">
                {searchQuery
                  ? "No client feedback matches your search keyword."
                  : "Be the first to share your experience with DevEngine!"}
              </p>
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="mt-6 px-6 py-2.5 rounded-full bg-[#38F2FF] text-black font-jetbrains text-xs font-bold uppercase tracking-wider hover:bg-[#78F5FF] transition-all cursor-pointer"
              >
                Submit a Review
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredReviews.map((rev) => (
                <div
                  key={rev.id}
                  className="p-6 sm:p-8 rounded-2xl bg-[#08111F]/70 backdrop-blur-xl border border-white/10 hover:border-[#38F2FF]/40 transition-all duration-300 hover:shadow-[0_0_25px_rgba(56,242,255,0.12)] flex flex-col justify-between group"
                >
                  <div className="space-y-4">
                    {/* Header with Stars & Verified Badge */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-[#38F2FF]">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <span
                            key={i}
                            className={`material-symbols-outlined text-[18px] ${
                              i < rev.rating ? "text-[#38F2FF]" : "text-gray-700"
                            }`}
                            style={{ fontVariationSettings: "'FILL' 1" }}
                          >
                            star
                          </span>
                        ))}
                      </div>

                      <span className="inline-flex items-center gap-1 text-[10px] font-jetbrains text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-md uppercase tracking-wider font-semibold">
                        <span className="material-symbols-outlined text-[12px]">verified</span>
                        <span>VERIFIED</span>
                      </span>
                    </div>

                    {/* Review Text */}
                    <p className="text-gray-200 text-sm sm:text-base leading-relaxed italic">
                      "{rev.reviewText}"
                    </p>
                  </div>

                  {/* Reviewer Profile */}
                  <div className="flex items-center gap-3 pt-6 border-t border-white/5 mt-6">
                    <div className="w-10 h-10 rounded-full bg-[#161C28] border border-white/10 flex items-center justify-center font-['Space_Grotesk'] text-sm font-bold text-[#38F2FF]">
                      {rev.reviewerName
                        .split(" ")
                        .map((p) => p[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-white text-sm font-semibold font-['Space_Grotesk']">
                        {rev.reviewerName}
                      </h4>
                      <p className="text-xs font-jetbrains text-gray-400">
                        {rev.reviewerRole || "Client"}
                        {rev.company ? ` · ${rev.company}` : ""}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Bottom CTA Banner */}
        <section className="py-20 max-w-7xl mx-auto px-6 sm:px-12 md:px-20 text-center">
          <div className="rounded-3xl p-10 sm:p-16 bg-gradient-to-b from-[#161C28]/80 to-[#08111F]/80 backdrop-blur-2xl border border-white/10 relative overflow-hidden">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white font-['Space_Grotesk'] mb-4">
              Have you worked with DevEngine?
            </h2>
            <p className="text-gray-300 text-base max-w-xl mx-auto mb-8 font-normal">
              Your feedback fuels our architectural obsession. Share your experience with our team and the developer community.
            </p>
            <button
              type="button"
              onClick={() => {
                setSubmitSuccess(false);
                setModalOpen(true);
              }}
              className="px-8 py-3.5 rounded-full bg-[#38F2FF] hover:bg-[#78F5FF] text-[#030712] font-jetbrains text-xs font-bold tracking-widest uppercase transition-all shadow-[0_0_25px_rgba(56,242,255,0.4)] hover:shadow-[0_0_35px_rgba(56,242,255,0.7)] hover:scale-105 cursor-pointer"
            >
              LEAVE A REVIEW
            </button>
          </div>
        </section>
      </main>

      {/* Write a Review Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-lg bg-[#080E1A] border border-white/15 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <span className="font-jetbrains text-[10px] text-[#38F2FF] uppercase tracking-widest font-bold">
                  SUBMIT CLIENT FEEDBACK
                </span>
                <h3 className="text-xl font-bold text-white font-['Space_Grotesk'] mt-0.5">
                  Write Your Review
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {submitSuccess ? (
              <div className="py-8 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 mx-auto flex items-center justify-center">
                  <span className="material-symbols-outlined text-[32px]">check_circle</span>
                </div>
                <h4 className="text-lg font-bold text-white font-['Space_Grotesk']">
                  Review Submitted Successfully!
                </h4>
                <p className="text-xs text-gray-300 max-w-xs mx-auto leading-relaxed">
                  Thank you for your feedback. To maintain studio integrity, your review will be verified by our team and published to the Trust Wall shortly.
                </p>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="mt-4 px-6 py-2.5 rounded-full bg-[#38F2FF] text-black font-jetbrains text-xs font-bold uppercase tracking-wider hover:bg-[#78F5FF] transition-all cursor-pointer"
                >
                  DONE
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmitReview} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-jetbrains text-gray-300 mb-1 uppercase tracking-wider">
                      Your Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g., Alex Rivera"
                      className="w-full bg-[#02040A] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#38F2FF]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-jetbrains text-gray-300 mb-1 uppercase tracking-wider">
                      Role / Title
                    </label>
                    <input
                      type="text"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      placeholder="e.g., Lead Developer"
                      className="w-full bg-[#02040A] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#38F2FF]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-jetbrains text-gray-300 mb-1 uppercase tracking-wider">
                    Project Purchased or Company (Optional)
                  </label>
                  <input
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="e.g., DevEngine Extreme / Student Project"
                    className="w-full bg-[#02040A] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#38F2FF]"
                  />
                </div>

                {/* Rating Selector */}
                <div>
                  <label className="block text-xs font-jetbrains text-gray-300 mb-1.5 uppercase tracking-wider">
                    Your Rating *
                  </label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((num) => {
                      const isHighlighted = (hoverRating || rating) >= num;
                      return (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setRating(num)}
                          onMouseEnter={() => setHoverRating(num)}
                          onMouseLeave={() => setHoverRating(0)}
                          className="cursor-pointer focus:outline-none p-1 transition-transform hover:scale-110"
                        >
                          <span
                            className={`material-symbols-outlined text-[28px] ${
                              isHighlighted ? "text-[#38F2FF]" : "text-gray-700"
                            }`}
                            style={{ fontVariationSettings: "'FILL' 1" }}
                          >
                            star
                          </span>
                        </button>
                      );
                    })}
                    <span className="font-jetbrains text-xs text-[#38F2FF] ml-2 font-semibold">
                      {rating} of 5 Stars
                    </span>
                  </div>
                </div>

                {/* Review Text */}
                <div>
                  <label className="block text-xs font-jetbrains text-gray-300 mb-1 uppercase tracking-wider">
                    Your Honest Feedback *
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Describe your experience with the software, code quality, installation, or support..."
                    className="w-full bg-[#02040A] border border-white/10 rounded-xl p-4 text-sm text-white focus:outline-none focus:border-[#38F2FF] resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-5 py-2.5 rounded-full text-xs font-jetbrains text-gray-400 hover:text-white transition-colors cursor-pointer"
                  >
                    CANCEL
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-7 py-2.5 rounded-full bg-[#38F2FF] hover:bg-[#78F5FF] text-black font-jetbrains text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-[#38F2FF]/20"
                  >
                    {submitting ? "SUBMITTING…" : "SUBMIT REVIEW"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      <LandingFooter />
    </>
  );
}
