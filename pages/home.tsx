import React, { useEffect, useState } from "react";
import Head from "next/head";
import { LandingConfig } from "@/types/landing";
import {
  getLandingConfig,
  DEFAULT_LANDING_CONFIG,
} from "@/lib/services/landingService";

import LandingNavbar from "@/components/landing/LandingNavbar";
import HeroSection from "@/components/landing/HeroSection";
import ImmersiveIntro from "@/components/landing/ImmersiveIntro";
import TechStackSection from "@/components/landing/TechStackSection";
import MobileSection from "@/components/landing/MobileSection";
import WebPlatformSection from "@/components/landing/WebPlatformSection";
import AILabSection from "@/components/landing/AILabSection";
import DefenseSection from "@/components/landing/DefenseSection";
import CustomSolutionsSection from "@/components/landing/CustomSolutionsSection";
import FeaturedProductsSection from "@/components/landing/FeaturedProductsSection";
import ProcessSection from "@/components/landing/ProcessSection";
import TestimonialsSection from "@/components/landing/TestimonialsSection";
import ContactSection from "@/components/landing/ContactSection";
import LandingFooter from "@/components/landing/LandingFooter";
import HelixLoader from "@/components/HelixLoader";
import { getCachedData, setCachedData } from "@/lib/utils/cacheService";

export default function HomePage() {
  const [config, setConfig] = useState<LandingConfig>(() => {
    return getCachedData<LandingConfig>("landing_config") || DEFAULT_LANDING_CONFIG;
  });
  const [loading, setLoading] = useState<boolean>(() => {
    return !getCachedData<LandingConfig>("landing_config");
  });

  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const data = await getLandingConfig();
        if (isMounted) {
          setConfig(data);
          setCachedData("landing_config", data);
          setLoading(false);
        }
      } catch (err) {
        console.warn("Using fallback landing configuration:", err);
        if (isMounted) setLoading(false);
      }
    }
    load();

    if (typeof window !== "undefined" && window.location.hash === "#contact") {
      setTimeout(() => {
        const el = document.getElementById("contact");
        if (el) {
          el.scrollIntoView({ behavior: "smooth" });
        }
      }, 400);
    }

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#02040A] flex flex-col items-center justify-center text-[#dde2f3]">
        <HelixLoader size={54} color="#3EF3FF" />
        <p className="mt-5 text-xs font-mono tracking-widest text-[#3EF3FF] uppercase animate-pulse">
          Loading Cinematic Ecosystem...
        </p>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>DevEngine Studio - Cinematic Engineering</title>
        <meta
          name="description"
          content="We engineer high-fidelity, performant digital ecosystems for visionary companies. From AI integration to enterprise scale."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      <div className="min-h-screen bg-[#02040A] text-[#dde2f3] selection:bg-[#3EF3FF] selection:text-[#02040A] font-sans">
        {/* Navigation Bar (No login/signup buttons, Build Together CTA) */}
        <LandingNavbar />

        <main>
          {/* 1. Hero with 3D perspective device frames */}
          <HeroSection config={config.hero} />

          {/* 2. Immersive Intro */}
          <ImmersiveIntro config={config.intro} />

          {/* 3. Tech Stack Wall */}
          <TechStackSection config={config.techStack} />

          {/* 4. Mobile Native Ecosystems */}
          <MobileSection config={config.mobile} />

          {/* 5. Web Scale Enterprise Platform */}
          <WebPlatformSection config={config.webPlatform} />

          {/* 6. AI Lab */}
          <AILabSection config={config.aiLab} />

          {/* 7. Defense & Academic Precision */}
          <DefenseSection config={config.defense} />

          {/* 8. Custom Solutions Bento Grid */}
          <CustomSolutionsSection config={config.customSolutions} />

          {/* 9. Featured Products / Case Studies */}
          <FeaturedProductsSection config={config.featuredProducts} />

          {/* 10. Interactive Development Process */}
          <ProcessSection config={config.process} />

          {/* 11. Testimonials */}
          <TestimonialsSection config={config.testimonials} />

          {/* 12. Contact Experience */}
          <ContactSection config={config.contact} />
        </main>

        {/* Footer */}
        <LandingFooter />
      </div>
    </>
  );
}
