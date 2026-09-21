import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/router";

export default function LandingNavbar() {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleBuildTogether = (e: React.MouseEvent) => {
    e.preventDefault();
    setMobileMenuOpen(false);

    if (router.pathname === "/home" || router.pathname === "/") {
      const el = document.getElementById("contact");
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
        window.history.pushState(null, "", "#contact");
      } else {
        window.location.hash = "contact";
      }
    } else {
      router.push("/home#contact");
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[#02040A]/80 backdrop-blur-xl border-b border-white/10 shadow-[0_0_25px_rgba(62,243,255,0.05)] py-4"
          : "bg-transparent py-6"
      }`}
    >
      <div className="max-w-[1440px] mx-auto px-6 sm:px-12 md:px-20 flex justify-between items-center">
        {/* Brand Logo */}
        <Link href="/home" className="flex items-center gap-3">
          <Image
            src="/assets/DevEngine-logo-on-dark2.png"
            alt="DevEngine"
            width={160}
            height={40}
            priority
            className="h-8 w-auto object-contain"
          />
        </Link>

        {/* Desktop Navigation Links */}
        <div className="hidden md:flex items-center gap-10">
          <Link
            href="/home"
            className="font-jetbrains text-xs tracking-widest text-[#bac9cb] hover:text-[#3EF3FF] transition-colors uppercase font-medium"
          >
            DASHBOARD
          </Link>
          <Link
            href="/projects"
            className="font-jetbrains text-xs tracking-widest text-[#bac9cb] hover:text-[#3EF3FF] transition-colors uppercase font-medium"
          >
            ARCHIVE
          </Link>
          <Link
            href="/services"
            className="font-jetbrains text-xs tracking-widest text-[#bac9cb] hover:text-[#3EF3FF] transition-colors uppercase font-medium"
          >
            SERVICES
          </Link>
          <Link
            href="/launchpad"
            className="font-jetbrains text-xs tracking-widest text-[#bac9cb] hover:text-[#3EF3FF] transition-colors uppercase font-medium"
          >
            LAUNCHPAD
          </Link>
          <Link
            href="/career"
            className="font-jetbrains text-xs tracking-widest text-[#bac9cb] hover:text-[#3EF3FF] transition-colors uppercase font-medium"
          >
            CAREER
          </Link>
          <Link
            href="/about"
            className="font-jetbrains text-xs tracking-widest text-[#bac9cb] hover:text-[#3EF3FF] transition-colors uppercase font-medium"
          >
            ABOUT
          </Link>
          <Link
            href="/lab"
            className="font-jetbrains text-xs tracking-widest text-[#bac9cb] hover:text-[#3EF3FF] transition-colors uppercase font-medium"
          >
            LAB
          </Link>
        </div>

        {/* Action Button: Build Together (No Login / Sign Up buttons) */}
        <div className="hidden md:flex items-center">
          <a
            href="/home#contact"
            onClick={handleBuildTogether}
            className="font-jetbrains text-xs font-bold uppercase tracking-wider px-8 py-3.5 rounded-full bg-[#3EF3FF] text-[#02040A] shadow-[0_0_24px_rgba(62,243,255,0.4)] hover:shadow-[0_0_40px_rgba(62,243,255,0.8)] hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer"
          >
            Build Together
          </a>
        </div>

        {/* Mobile Menu Toggle */}
        <div className="md:hidden flex items-center">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="text-white p-2"
            aria-label="Toggle menu"
          >
            <span className="material-symbols-outlined text-2xl">
              {mobileMenuOpen ? "close" : "menu"}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile Nav Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#02040A]/95 border-b border-white/10 px-6 py-6 space-y-4 backdrop-blur-2xl">
          <Link
            href="/home"
            onClick={() => setMobileMenuOpen(false)}
            className="block font-jetbrains text-sm text-[#bac9cb] hover:text-[#3EF3FF] uppercase"
          >
            DASHBOARD
          </Link>
          <Link
            href="/projects"
            onClick={() => setMobileMenuOpen(false)}
            className="block font-jetbrains text-sm text-[#bac9cb] hover:text-[#3EF3FF] uppercase"
          >
            ARCHIVE
          </Link>
          <Link
            href="/services"
            onClick={() => setMobileMenuOpen(false)}
            className="block font-jetbrains text-sm text-[#bac9cb] hover:text-[#3EF3FF] uppercase"
          >
            SERVICES
          </Link>
          <Link
            href="/launchpad"
            onClick={() => setMobileMenuOpen(false)}
            className="block font-jetbrains text-sm text-[#bac9cb] hover:text-[#3EF3FF] uppercase"
          >
            LAUNCHPAD
          </Link>
          <Link
            href="/career"
            onClick={() => setMobileMenuOpen(false)}
            className="block font-jetbrains text-sm text-[#bac9cb] hover:text-[#3EF3FF] uppercase"
          >
            CAREER
          </Link>
          <Link
            href="/about"
            onClick={() => setMobileMenuOpen(false)}
            className="block font-jetbrains text-sm text-[#bac9cb] hover:text-[#3EF3FF] uppercase"
          >
            ABOUT
          </Link>
          <Link
            href="/lab"
            onClick={() => setMobileMenuOpen(false)}
            className="block font-jetbrains text-sm text-[#bac9cb] hover:text-[#3EF3FF] uppercase"
          >
            LAB
          </Link>
          <a
            href="/home#contact"
            onClick={handleBuildTogether}
            className="inline-block font-jetbrains text-xs font-bold uppercase tracking-wider px-6 py-3 rounded-full bg-[#3EF3FF] text-[#02040A] mt-2 shadow-[0_0_20px_rgba(62,243,255,0.4)] cursor-pointer"
          >
            Build Together
          </a>
        </div>
      )}
    </nav>
  );
}
