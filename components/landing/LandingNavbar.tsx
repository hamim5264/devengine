import { useEffect, useId, useRef, useState, type MouseEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/router";
import { useTheme } from "@/context/ThemeContext";
import ThemeToggle from "@/components/ThemeToggle";
import HeaderControls from "@/components/HeaderControls";
import styles from "./Landing.module.css";

const LINKS = [
  { href: "/home", label: "Dashboard", icon: "dashboard", desc: "Studio Overview" },
  { href: "/projects", label: "Archive", icon: "auto_awesome_motion", desc: "Selected Works" },
  { href: "/services", label: "Services", icon: "layers", desc: "Capabilities & Stack" },
  { href: "/launchpad", label: "Launchpad", icon: "rocket_launch", desc: "Venture Accelerator" },
  { href: "/career", label: "Career", icon: "person_search", desc: "Join Our Team" },
  { href: "/about", label: "About", icon: "fingerprint", desc: "Philosophy & DNA" },
  { href: "/lab", label: "Lab", icon: "science", desc: "R&D Experiments" },
];

export default function LandingNavbar() {
  const router = useRouter();
  const { theme } = useTheme();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 24);
    update();
    window.addEventListener("scroll", update, { passive: true });
    const desktop = window.matchMedia("(min-width: 1200px)");
    const onResize = () => {
      if (desktop.matches) setOpen(false);
    };
    desktop.addEventListener("change", onResize);
    return () => {
      window.removeEventListener("scroll", update);
      desktop.removeEventListener("change", onResize);
    };
  }, []);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [router.asPath]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const handleBuildTogether = (event: MouseEvent<HTMLAnchorElement>) => {
    setOpen(false);
    if (router.pathname !== "/home") return;
    const contact = document.getElementById("contact");
    if (!contact) return;
    event.preventDefault();
    contact.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
    window.history.replaceState(null, "", "#contact");
  };

  const active = (href: string) =>
    router.pathname === href ||
    (href !== "/home" && router.pathname.startsWith(`${href}/`));

  return (
    <>
      <header
        className={styles.navbar}
        data-scrolled={scrolled}
        aria-label="Main navigation"
      >
        <div className={styles.navInner}>
          {/* Logo */}
          <Link href="/home" className={styles.logo} aria-label="DevEngine home">
            <Image
              src={
                theme === "light"
                  ? "/assets/DevEngine-logo-on-light1.png"
                  : "/assets/DevEngine-logo-on-dark2.png"
              }
              alt="DevEngine"
              width={2400}
              height={600}
              priority
            />
          </Link>

          {/* Desktop Capsule Dock */}
          <nav className={styles.desktopLinks} aria-label="Desktop menu">
            <div className={styles.navTrack}>
              {LINKS.map((link) => {
                const isCurrent = active(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={styles.navLink}
                    aria-current={isCurrent ? "page" : undefined}
                  >
                    {isCurrent && (
                      <span className={styles.navActiveDot} aria-hidden="true" />
                    )}
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* Right Actions */}
          <div className={styles.navActions}>
            <div className={styles.navCta}>
              <a
                href="/home#contact"
                onClick={handleBuildTogether}
                className={styles.navCtaButton}
              >
                <span>Build Together</span>
                <span className="material-symbols-outlined" aria-hidden="true">
                  arrow_outward
                </span>
              </a>
            </div>

            <HeaderControls />

            <button
              ref={toggleRef}
              type="button"
              className={styles.menuToggle}
              onClick={() => setOpen((value) => !value)}
              aria-label={open ? "Close navigation" : "Open navigation"}
              aria-controls={open ? menuId : undefined}
              aria-expanded={open}
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                {open ? "close" : "menu"}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Modern Glassmorphic Mobile Drawer & Backdrop */}
      {open && (
        <div className={styles.mobileBackdrop} onClick={() => setOpen(false)}>
          <div
            id={menuId}
            className={styles.mobileModal}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Mobile Navigation"
          >
            {/* Modal Header */}
            <div className={styles.mobileModalHeader}>
              <Link
                href="/home"
                className={styles.mobileModalLogo}
                onClick={() => setOpen(false)}
                aria-label="DevEngine home"
              >
                <Image
                  src={
                    theme === "light"
                      ? "/assets/DevEngine-logo-on-light1.png"
                      : "/assets/DevEngine-logo-on-dark2.png"
                  }
                  alt="DevEngine"
                  width={2400}
                  height={600}
                />
              </Link>
              <div className={styles.mobileModalHeaderRight}>
                <div className={styles.mobileLiveStatus} aria-hidden="true">
                  <span className={styles.livePulseDot} />
                  <span>ONLINE</span>
                </div>
                <button
                  type="button"
                  className={styles.mobileCloseBtn}
                  onClick={() => setOpen(false)}
                  aria-label="Close navigation"
                >
                  <span className="material-symbols-outlined" aria-hidden="true">
                    close
                  </span>
                </button>
              </div>
            </div>

            {/* Mobile Navigation Card Grid */}
            <nav className={styles.mobileNavBody} aria-label="Mobile links">
              <div className={styles.mobileCardGrid}>
                {LINKS.map((link) => {
                  const isCurrent = active(link.href);
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`${styles.mobileNavCard} ${
                        isCurrent ? styles.mobileNavCardActive : ""
                      }`}
                      onClick={() => setOpen(false)}
                      aria-current={isCurrent ? "page" : undefined}
                    >
                      <div className={styles.mobileCardIcon}>
                        <span
                          className="material-symbols-outlined"
                          aria-hidden="true"
                        >
                          {link.icon}
                        </span>
                      </div>
                      <div className={styles.mobileCardContent}>
                        <div className={styles.mobileCardTitleRow}>
                          <span className={styles.mobileCardTitle}>
                            {link.label}
                          </span>
                          {isCurrent && (
                            <span
                              className={styles.mobileActiveDot}
                              aria-hidden="true"
                            />
                          )}
                        </div>
                        <span className={styles.mobileCardDesc}>
                          {link.desc}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </nav>

            {/* Modal Footer with Call to Action & Controls */}
            <div className={styles.mobileModalFooter}>
              <a
                href="/home#contact"
                onClick={handleBuildTogether}
                className={styles.mobileModalCta}
              >
                <span>Build Together</span>
                <span className="material-symbols-outlined" aria-hidden="true">
                  arrow_outward
                </span>
              </a>

              <div className={styles.mobileFooterInfo}>
                <span className={styles.mobileFooterText}>
                  DevEngine Studio // 2026
                </span>
                <div className={styles.mobileThemeWrapper}>
                  <ThemeToggle />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
