import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import PaymentVerificationModal from "@/components/PaymentVerificationModal";
import { SocialLink } from "@/types/social";
import { getSocialLinks, INITIAL_SOCIAL_LINKS } from "@/lib/services/socialService";

export default function LandingFooter() {
  const [isVerificationOpen, setIsVerificationOpen] = useState(false);
  const [socials, setSocials] = useState<SocialLink[]>(INITIAL_SOCIAL_LINKS);

  useEffect(() => {
    let mounted = true;
    async function loadSocials() {
      try {
        const data = await getSocialLinks();
        if (mounted) setSocials(data);
      } catch (err) {
        console.error("Error loading social links in footer:", err);
      }
    }
    loadSocials();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <>
      <footer className="w-full py-20 bg-[#02040A] border-t border-white/5 relative z-10 select-none">
        <div className="max-w-[1440px] mx-auto px-6 sm:px-12 md:px-20">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-12 mb-16">
            <div className="flex-1">
              <Link href="/home" className="inline-block mb-4">
                <Image
                  src="/assets/DevEngine-logo-on-dark2.png"
                  alt="DevEngine"
                  width={220}
                  height={55}
                  className="h-10 w-auto object-contain"
                />
              </Link>
              <p className="font-sans text-base sm:text-lg text-[#849495] max-w-md font-normal">
                Engineering the Cinematic Future. High-fidelity, performant
                digital ecosystems.
              </p>
            </div>

            <div className="flex flex-wrap gap-12 sm:gap-16 font-jetbrains text-xs tracking-widest text-[#849495]">
              <div className="flex flex-col gap-4">
                <span className="text-[#3EF3FF] font-bold uppercase mb-1">
                  PLATFORM
                </span>
                <Link href="/projects" className="hover:text-white transition-colors">
                  ARCHIVE
                </Link>
                <a href="#services" className="hover:text-white transition-colors">
                  SERVICES
                </a>
                <button
                  type="button"
                  onClick={() => setIsVerificationOpen(true)}
                  className="text-left hover:text-[#3EF3FF] transition-colors uppercase cursor-pointer"
                >
                  PAYMENT VERIFICATION
                </button>
              </div>

              <div className="flex flex-col gap-4">
                <span className="text-[#3EF3FF] font-bold uppercase mb-1">
                  SYSTEM
                </span>
                <Link href="/blog" className="hover:text-white transition-colors">
                  BLOG
                </Link>
                <Link href="/reviews" className="hover:text-white transition-colors">
                  REVIEWS
                </Link>
                <Link href="/about" className="hover:text-white transition-colors">
                  ABOUT US
                </Link>
                <Link href="/career" className="hover:text-white transition-colors">
                  CAREERS
                </Link>
                <a href="#lab" className="hover:text-white transition-colors">
                  LAB
                </a>
                <a href="#contact" className="hover:text-white transition-colors">
                  CONTACT
                </a>
              </div>

              {/* FOLLOW US Column */}
              <div className="flex flex-col gap-4">
                <span className="text-[#3EF3FF] font-bold uppercase mb-1">
                  FOLLOW US
                </span>
                {socials.map((link) => (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white hover:translate-x-0.5 transition-all flex items-center gap-1.5 group cursor-pointer"
                  >
                    <span>{link.platform.toUpperCase()}</span>
                    <span className="material-symbols-outlined text-[13px] text-[#3EF3FF]/70 group-hover:text-[#3EF3FF] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform">
                      north_east
                    </span>
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Legal & Copyright Bar */}
          <div className="rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row justify-between items-center gap-4 bg-[#0A0F1D]/40 border border-white/5 font-jetbrains text-xs text-[#849495]">
            <p>© {new Date().getFullYear()} DevEngine Studio. All rights reserved.</p>
            <div className="flex flex-wrap gap-6 items-center justify-center md:justify-end">
              <Link
                href="/commercial-license"
                className="hover:text-[#3EF3FF] transition-colors"
              >
                Commercial License
              </Link>
              <Link
                href="/refund-policy"
                className="hover:text-[#3EF3FF] transition-colors"
              >
                Refund Policy
              </Link>
              <Link
                href="/privacy-policy"
                className="hover:text-[#3EF3FF] transition-colors"
              >
                Privacy Policy
              </Link>
              <Link
                href="/terms"
                className="hover:text-[#3EF3FF] transition-colors"
              >
                Terms of Service
              </Link>
              <Link
                href="/security-protocol"
                className="hover:text-[#3EF3FF] transition-colors"
              >
                Security Protocol
              </Link>
              <Link
                href="/documentation-and-api-access"
                className="hover:text-[#3EF3FF] transition-colors"
              >
                Documentation & API Access
              </Link>
            </div>
          </div>
        </div>
      </footer>

      {/* Payment Verification Popup Modal */}
      <PaymentVerificationModal
        isOpen={isVerificationOpen}
        onClose={() => setIsVerificationOpen(false)}
      />
    </>
  );
}
