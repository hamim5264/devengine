import { useEffect, useId, useMemo, useState, type FormEvent } from "react";
import Head from "next/head";
import { useReducedMotion } from "framer-motion";
import HelixLoader from "@/components/HelixLoader";
import type { ReviewRecord } from "@/types/review";
import { getPublicApprovedReviews, submitReview } from "@/lib/services/reviewsService";
import { FeatureModal, FeaturePage, Icon } from "@/components/features/FeatureExperience";
import { Person, SearchField, SoftReveal, Stars } from "@/components/features/CommunityExperience";
import base from "@/components/features/Features.module.css";
import styles from "@/components/features/Community.module.css";

const RATINGS = ["ALL", 5, 4, 3, 2, 1] as const;

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [ratingFilter, setRatingFilter] = useState<number | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [slide, setSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  const [interacting, setInteracting] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [company, setCompany] = useState("");
  const [rating, setRating] = useState(5);
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const ratingName = useId();
  const reduced = useReducedMotion();

  useEffect(() => {
    let mounted = true;
    getPublicApprovedReviews().then((list) => { if (mounted) setReviews(list); }).catch((failure) => console.error("Error loading reviews:", failure)).finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);
  useEffect(() => {
    const update = () => setHidden(document.hidden);
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);
  const featured = useMemo(() => {
    const selected = reviews.filter((review) => review.featured);
    return selected.length ? selected : [...reviews].sort((a, b) => b.rating - a.rating).slice(0, 3);
  }, [reviews]);
  useEffect(() => {
    if (featured.length < 2 || paused || interacting || hidden || modalOpen || reduced) return;
    const timer = window.setInterval(() => setSlide((current) => (current + 1) % featured.length), 8000);
    return () => window.clearInterval(timer);
  }, [featured.length, paused, interacting, hidden, modalOpen, reduced]);
  const filtered = useMemo(() => reviews.filter((review) => {
    const query = search.trim().toLowerCase();
    return (ratingFilter === "ALL" || review.rating === ratingFilter) && (!query || [review.reviewerName, review.reviewerRole, review.company, review.reviewText].some((value) => value?.toLowerCase().includes(query)));
  }), [reviews, ratingFilter, search]);
  const average = reviews.length ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1) : "—";
  const fiveStar = reviews.filter((review) => review.rating === 5).length;
  const active = featured[slide % (featured.length || 1)];
  const openForm = () => { setSuccess(false); setError(""); setModalOpen(true); };
  const closeForm = () => { if (!submitting) setModalOpen(false); };
  const resetFilters = () => { setSearch(""); setRatingFilter("ALL"); };
  const moveSlide = (direction: number) => { setPaused(true); setSlide((current) => (current + direction + featured.length) % featured.length); };
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    if (!name.trim() || !feedback.trim()) { setError("Please enter your name and feedback before submitting."); return; }
    setSubmitting(true); setError("");
    try {
      await submitReview({ reviewerName: name.trim(), reviewerRole: role.trim() || "Verified Client", company: company.trim(), rating, reviewText: feedback.trim() });
      setSuccess(true); setName(""); setRole(""); setCompany(""); setRating(5); setFeedback("");
    } catch (failure) { console.error("Review submission error:", failure); setError("Your review couldn’t be submitted. Your feedback is still here—please try again."); }
    finally { setSubmitting(false); }
  };

  return <FeaturePage><div className={styles.quiet}>
    <Head><title>Client Reviews & Community Feedback | DevEngine</title><meta name="description" content="Read feedback from the people building with DevEngine. Explore client experiences and share your own review." /></Head>
    <section className={`${base.section} ${styles.hero}`}><div className={base.inner}><SoftReveal><div className={styles.heroCopy}><span className={styles.heroLabel}>DevEngine / Community voices</span><h1 className={styles.title}>Good work starts with trust.<br /><span className={styles.highlight}>Your words matter.</span></h1><p className={styles.intro}>Honest experiences from the people who build with us. Discover what clients, developers, and teams have to say about DevEngine.</p><div className={base.actions}><button type="button" className={base.button} onClick={openForm}>Write a review <Icon name="rate_review" /></button><a className={base.secondaryButton} href="#reviews-grid">Explore feedback <Icon name="south" /></a></div></div>
    <div className={styles.stats} aria-label="Community review statistics"><div className={styles.stat}><strong>{loading ? "—" : reviews.length}</strong><span>Published reviews</span></div><div className={styles.stat}><strong>{loading ? "—" : average}<Icon name="star" /></strong><span>Average rating / 5</span></div><div className={styles.stat}><strong>{loading ? "—" : fiveStar}</strong><span>Five-star experiences</span></div></div></SoftReveal></div></section>
    {!loading && active && <section className={base.section}><div className={base.inner}><SoftReveal><div className={styles.sectionHeader}><h2 className={styles.sectionHeading}>In their own words.</h2>{featured.length > 1 && <div className={styles.controls}><span className={styles.slideCount}>{String((slide % featured.length) + 1).padStart(2, "0")} / {String(featured.length).padStart(2, "0")}</span>{!reduced && <button type="button" className={base.iconButton} onClick={() => setPaused((value) => !value)} aria-label={paused ? "Play featured reviews" : "Pause featured reviews"}><Icon name={paused ? "play_arrow" : "pause"} /></button>}<button type="button" className={base.iconButton} onClick={() => moveSlide(-1)} aria-label="Previous featured review"><Icon name="west" /></button><button type="button" className={base.iconButton} onClick={() => moveSlide(1)} aria-label="Next featured review"><Icon name="east" /></button></div>}</div>
      <div className={styles.featured} role="region" aria-roledescription="carousel" aria-label="Featured community reviews" onMouseEnter={() => setInteracting(true)} onMouseLeave={() => setInteracting(false)} onFocus={() => setInteracting(true)} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setInteracting(false); }}><div key={active.id} className={styles.quoteFade}><Stars rating={active.rating} /><blockquote className={styles.featuredQuote}>“{active.reviewText}”</blockquote><Person name={active.reviewerName} role={[active.reviewerRole, active.company].filter(Boolean).join(" · ")} avatarUrl={active.avatarUrl} /></div></div>
    </SoftReveal></div></section>}
    <section id="reviews-grid" className={base.section}><div className={base.inner}>
      <SoftReveal><div className={styles.sectionHeader}><div><h2 className={styles.sectionHeading}>The community wall.</h2><p className={styles.sectionDescription}>Client feedback, thoughtful perspectives, and experiences shared with our team.</p></div></div></SoftReveal>
      <div className={styles.toolbar}><div className={base.filters} aria-label="Filter reviews by rating">{RATINGS.map((value) => <button type="button" key={value} className={base.filter} aria-pressed={ratingFilter === value} onClick={() => setRatingFilter(value)}>{value === "ALL" ? "All ratings" : `${value} star${value === 1 ? "" : "s"}`}</button>)}</div><SearchField id="review-search" value={search} onChange={setSearch} label="Search reviews" placeholder="Search feedback, names, or roles…" /></div>
      <div className={styles.results}><span role="status">{loading ? "Loading reviews…" : `${filtered.length} review${filtered.length === 1 ? "" : "s"}${search.trim() ? ` matching “${search.trim()}”` : ""}`}</span>{(search || ratingFilter !== "ALL") && <button type="button" className={styles.textButton} onClick={resetFilters}>Clear filters <Icon name="close" /></button>}</div>
      {loading ? <div className={base.empty} role="status"><HelixLoader size={48} color="#2cecf7" /><p className={base.small}>Loading community feedback…</p></div> : filtered.length ? <div className={styles.reviewGrid}>{filtered.map((review) => <article key={review.id} className={styles.reviewCard}><div className={styles.reviewTop}><Stars rating={review.rating} />{review.verifiedPurchase && <span className={styles.verified}><Icon name="verified" />Verified purchase</span>}</div><blockquote className={styles.reviewQuote}>“{review.reviewText}”</blockquote><div className={styles.reviewFooter}><Person name={review.reviewerName} role={[review.reviewerRole, review.company].filter(Boolean).join(" · ")} avatarUrl={review.avatarUrl} /></div></article>)}</div> : <div className={`${base.card} ${base.empty}`}><div className={base.emptyIcon}><Icon name="chat_bubble" /></div><h3 className={base.cardTitle}>{reviews.length ? "No matching reviews." : "Your experience could be the first."}</h3><p className={base.body}>{reviews.length ? "Try another keyword or rating to explore more feedback." : "Worked with DevEngine? Share your feedback with the community."}</p><div className={base.actions}>{reviews.length > 0 && <button type="button" className={base.secondaryButton} onClick={resetFilters}>Reset filters</button>}<button type="button" className={base.button} onClick={openForm}>Write a review <Icon name="rate_review" /></button></div></div>}
    </div></section>
    <section className={base.section}><div className={base.inner}><SoftReveal><div className={`${base.card} ${base.banner}`}><div className={base.bannerCopy}><h2 className={styles.sectionHeading}>Help us make the next experience better.</h2><p className={styles.sectionDescription}>Your feedback helps our team improve and gives others a clearer picture of working with DevEngine.</p></div><button type="button" className={base.button} onClick={openForm}>Share your experience <Icon name="arrow_forward" /></button></div></SoftReveal></div></section>
    {modalOpen && <FeatureModal title={success ? "Thank you for your review" : "Write your review"} onClose={closeForm}><div className={styles.quiet}>{success ? <div className={styles.success} role="status"><span className={styles.successIcon}><Icon name="check" /></span><h3>Your feedback is with our team.</h3><p>Thank you for sharing your experience. Your review is pending approval and will appear on the community wall once approved.</p><button type="button" className={base.button} onClick={closeForm}>Done <Icon name="check" /></button></div> : <form className={styles.form} onSubmit={handleSubmit} aria-busy={submitting}>
      <p className={styles.formNote}>Tell us about the software, support, or experience. Fields marked * are required.</p>
      <div className={styles.formGrid}><div className={styles.field}><label htmlFor="review-name">Your full name *</label><input id="review-name" className={styles.input} required autoComplete="name" value={name} disabled={submitting} onChange={(event) => setName(event.target.value)} placeholder="Your name" /></div><div className={styles.field}><label htmlFor="review-role">Role or title <span className={styles.optional}>(optional)</span></label><input id="review-role" className={styles.input} autoComplete="organization-title" value={role} disabled={submitting} onChange={(event) => setRole(event.target.value)} placeholder="e.g., Developer" /></div></div>
      <div className={styles.field}><label htmlFor="review-company">Project or company <span className={styles.optional}>(optional)</span></label><input id="review-company" className={styles.input} value={company} disabled={submitting} onChange={(event) => setCompany(event.target.value)} placeholder="Project or organization name" /></div>
      <fieldset className={styles.ratingField} disabled={submitting}><legend className={styles.ratingLegend}>Your rating *</legend><div className={styles.ratingChoices}>{[1, 2, 3, 4, 5].map((value) => <label key={value} className={styles.starChoice} data-filled={value <= rating}><input type="radio" name={ratingName} value={value} checked={rating === value} onChange={() => setRating(value)} aria-label={`${value} star${value === 1 ? "" : "s"}`} required /><span aria-hidden="true">★</span></label>)}<span className={styles.ratingText}>{rating} out of 5 stars</span></div></fieldset>
      <div className={styles.field}><label htmlFor="review-feedback">Your feedback *</label><textarea id="review-feedback" className={styles.textarea} required rows={5} value={feedback} disabled={submitting} onChange={(event) => setFeedback(event.target.value)} placeholder="What was your experience like?" /></div>
      <p className={styles.formNote}>Reviews are published after approval by our team.</p>{error && <p className={styles.error} role="alert">{error}</p>}<div className={styles.formActions}><button type="button" className={base.secondaryButton} disabled={submitting} onClick={closeForm}>Cancel</button><button type="submit" className={base.button} disabled={submitting}>{submitting ? "Submitting…" : "Submit review"}<Icon name="arrow_forward" /></button></div>
    </form>}</div></FeatureModal>}
  </div></FeaturePage>;
}
