import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image, { type StaticImageData } from "next/image";
import PaymentVerificationModal from "@/components/PaymentVerificationModal";
import type { SocialLink } from "@/types/social";
import { getSocialLinks, INITIAL_SOCIAL_LINKS } from "@/lib/services/socialService";
import Reveal from "./Reveal";
import FooterKitty from "./FooterKitty";
import githubIcon from "@/assets/3D_Icons/github.png";
import linkedinIcon from "@/assets/3D_Icons/linkedin.png";
import facebookIcon from "@/assets/3D_Icons/facebook-logo.png";
import youtubeIcon from "@/assets/3D_Icons/youtube.png";
import styles from "./LandingFooter.module.css";

const MENU_LINKS = [
  { href: "/home", label: "Dashboard" }, { href: "/projects", label: "Archive" }, { href: "/services", label: "Services" },
  { href: "/launchpad", label: "Launchpad" }, { href: "/career", label: "Career" }, { href: "/about", label: "About" },
  { href: "/lab", label: "Lab" }, { href: "/blog", label: "Blog" }, { href: "/reviews", label: "Reviews" },
];
const SERVICE_LINKS = [
  { href: "/home#services", label: "Custom Software Solutions" }, { href: "/home#products", label: "Web Platforms & Enterprise Systems" },
  { href: "/home#services", label: "Native Mobile Apps" }, { href: "/home#lab", label: "AI Integration & Automation" },
  { href: "/home#process", label: "Product Strategy & Delivery" }, { href: "/home#contact", label: "Start a Project" },
];
const LEGAL_LINKS = [
  { href: "/commercial-license", label: "Commercial License" }, { href: "/refund-policy", label: "Refund Policy" },
  { href: "/privacy-policy", label: "Privacy Policy" }, { href: "/terms", label: "Terms of Service" },
  { href: "/security-protocol", label: "Security Protocol" }, { href: "/documentation-and-api-access", label: "Documentation & API Access" },
];

const SOCIAL_ICONS: { match: string; image: StaticImageData }[] = [
  { match: "github", image: githubIcon }, { match: "linkedin", image: linkedinIcon },
  { match: "facebook", image: facebookIcon }, { match: "youtube", image: youtubeIcon },
];

export default function LandingFooter() {
  const footerRef = useRef<HTMLElement>(null);
  const [verificationOpen, setVerificationOpen] = useState(false);
  const [socials, setSocials] = useState<SocialLink[]>(INITIAL_SOCIAL_LINKS);
  const [inView, setInView] = useState(false);
  const [loadKitty, setLoadKitty] = useState(false);
  const [visible, setVisible] = useState(true);
  const [reduced, setReduced] = useState(false);
  const [paused, setPaused] = useState(false);
  const closeVerification = useCallback(() => setVerificationOpen(false), []);
  const playing = inView && visible && !paused && !reduced && !verificationOpen;

  useEffect(() => {
    const footer = footerRef.current;
    if (!footer) return;
    const observer = new IntersectionObserver(([entry]) => {
      setInView(entry.isIntersecting);
      if (entry.isIntersecting) setLoadKitty(true);
    }, { threshold: 0 });
    observer.observe(footer);
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setReduced(preference.matches);
    const updateVisibility = () => setVisible(!document.hidden);
    updatePreference();
    updateVisibility();
    preference.addEventListener("change", updatePreference);
    document.addEventListener("visibilitychange", updateVisibility);
    return () => { observer.disconnect(); preference.removeEventListener("change", updatePreference); document.removeEventListener("visibilitychange", updateVisibility); };
  }, []);
  useEffect(() => {
    let active = true;
    getSocialLinks().then((data) => { if (active) setSocials(data); }).catch((error) => console.error("Error loading footer social links:", error));
    return () => { active = false; };
  }, []);

  return <>
    <footer ref={footerRef} className={styles.footer} data-running={playing} data-reduced={reduced}>
      <div className={styles.atmosphere} aria-hidden="true"><svg viewBox="0 0 1200 700" preserveAspectRatio="none"><path className={styles.circuitBase} d="M0 1H1200 M0 200H180Q210 200 210 230V275Q210 305 240 305H960Q990 305 990 335V390Q990 420 1020 420H1200" /><path className={styles.circuitPulse} d="M0 1H1200 M0 200H180Q210 200 210 230V275Q210 305 240 305H960Q990 305 990 335V390Q990 420 1020 420H1200" /></svg></div>
      <div className={styles.inner}>
      <div className={styles.topGrid}>
        <nav className={styles.group} aria-label="Footer menu">
          <h2 className={styles.label}><span aria-hidden="true">01 /</span> Menu</h2>
          <ul className={styles.linkRow}>{MENU_LINKS.map((link) => <li key={link.href}><Link href={link.href}>{link.label}</Link></li>)}</ul>
        </nav>
        <nav className={styles.group} aria-label="Footer services">
          <h2 className={styles.label}><span aria-hidden="true">02 /</span> Services</h2>
          <ul className={`${styles.linkRow} ${styles.serviceLinks}`}>
            {SERVICE_LINKS.map((link) => <li key={link.label}><Link href={link.href}>{link.label}</Link></li>)}
            <li><button type="button" onClick={() => setVerificationOpen(true)}>Payment Verification</button></li>
          </ul>
        </nav>
      </div>

      <div className={styles.midRow}>
        <div className={styles.contact}>
          <p>Engineering the Cinematic Future.</p>
          <p>High-fidelity, performant digital ecosystems.</p>
          <Link href="/home#contact" className={styles.contactLink}>Build Together <span aria-hidden="true">↗</span></Link>
        </div>
        <div className={styles.socialGroup}><h2 className={styles.label}><span aria-hidden="true">03 /</span> Find us elsewhere</h2><ul className={styles.socials} aria-label="Follow us">{socials.map((link) => {
          const icon = SOCIAL_ICONS.find((item) => `${link.platform} ${link.url}`.toLowerCase().includes(item.match));
          return <li key={link.id}><a href={link.url} target="_blank" rel="noopener noreferrer" className={styles.socialLink} aria-label={`${link.platform} (opens in a new tab)`}><span className={styles.iconPedestal}>{icon ? <Image src={icon.image} alt="" width={64} height={64} sizes="64px" className={styles.socialIcon} /> : <span className={`material-symbols-outlined ${styles.socialFallback}`} aria-hidden="true">{link.icon || "public"}</span>}</span><span className={styles.socialName}>{link.platform}<span aria-hidden="true">↗</span></span></a></li>;
        })}</ul></div>
      </div>

      <Reveal className={styles.wordmarkWrap} duration={1.1} distance={60}>
        <div className={styles.wordmarkStage}>
          <FooterKitty load={loadKitty} playing={playing} reduced={reduced} />
        <svg className={styles.wordmark} viewBox="0 0 1000 150" role="img" aria-label="DevEngine" preserveAspectRatio="xMidYMid meet">
          <text x="0" y="142" textLength="1000" lengthAdjust="spacingAndGlyphs" className={styles.wordmarkText}>DEV<tspan className={styles.wordmarkAccent}>ENGINE</tspan></text>
        </svg>
        </div>
      </Reveal>

      <div className={styles.bottom}>
        <ul className={styles.legalLinks}>{LEGAL_LINKS.map((link) => <li key={link.href}><Link href={link.href}>{link.label}</Link></li>)}</ul>
        <p className={styles.copy}>© {new Date().getFullYear()} DevEngine Studio. All rights reserved.</p>
        {!reduced && <button type="button" className={styles.motionToggle} onClick={() => setPaused((value) => !value)} aria-label={paused ? "Play footer animation" : "Pause footer animation"}><span className="material-symbols-outlined" aria-hidden="true">{paused ? "play_arrow" : "pause"}</span>{paused ? "Play motion" : "Pause motion"}</button>}
      </div>
    </div></footer>
    <PaymentVerificationModal isOpen={verificationOpen} onClose={closeVerification} />
  </>;
}
