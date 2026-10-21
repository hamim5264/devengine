import React, { useEffect, useState } from "react";
import Head from "next/head";
import { LandingConfig } from "@/types/landing";
import {
  getLandingConfig,
  DEFAULT_LANDING_CONFIG,
} from "@/lib/services/landingService";

import LandingNavbar from "@/components/landing/LandingNavbar";
import HeroSection, { buildHeroShowcase } from "@/components/landing/HeroSection";
import ScrollProgress from "@/components/landing/ScrollProgress";
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
import styles from "@/components/landing/Landing.module.css";

export default function HomePage() {
  const [config, setConfig] = useState<LandingConfig>(DEFAULT_LANDING_CONFIG);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const cached = getCachedData<LandingConfig>("landing_config");
    if (cached) { setConfig(cached); setLoading(false); }
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

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (loading) return;
    const scrollToSection = () => {
      const target = window.location.hash.slice(1);
      if (target === "contact" || target === "services" || target === "lab") {
        document.getElementById(target)?.scrollIntoView({ behavior: "auto" });
      }
    };
    const timer = setTimeout(scrollToSection, 100);
    window.addEventListener("hashchange", scrollToSection);
    return () => { clearTimeout(timer); window.removeEventListener("hashchange", scrollToSection); };
  }, [loading]);

  if (loading) {
    return (
      <div className={styles.loading}>
        <HelixLoader size={54} color="#2cecf7" />
        <p>
          Loading Cinematic Ecosystem...
        </p>
      </div>
    );
  }

  const schemaOrgData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": "https://www.devenginehq.com/#organization",
        "name": "DevEngine Systems Inc.",
        "url": "https://www.devenginehq.com",
        "logo": {
          "@type": "ImageObject",
          "url": "https://www.devenginehq.com/dev_url_logo.png",
          "width": 1254,
          "height": 1254,
        },
        "description": "We engineer high-fidelity, performant digital ecosystems for visionary companies. From AI integration to enterprise scale.",
        "founder": {
          "@type": "Person",
          "name": "MD. ABDUL HAMIM LEON",
        },
        "sameAs": [
          "https://github.com/hamim5264",
          "https://thedevengine.vercel.app",
        ],
      },
      {
        "@type": "WebSite",
        "@id": "https://www.devenginehq.com/#website",
        "url": "https://www.devenginehq.com",
        "name": "DevEngine",
        "publisher": {
          "@id": "https://www.devenginehq.com/#organization",
        },
      },
    ],
  };

  return (
    <>
      <Head>
        <title>DevEngine Studio - Cinematic Engineering & Enterprise Software</title>
        <meta
          name="description"
          content="We engineer high-fidelity, performant digital ecosystems for visionary companies. From AI integration to enterprise scale."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="canonical" href="https://www.devenginehq.com/home" />

        {/* OpenGraph / Facebook / LinkedIn */}
        <meta property="og:site_name" content="DevEngine" />
        <meta property="og:title" content="DevEngine Studio - Cinematic Engineering & Enterprise Software" />
        <meta
          property="og:description"
          content="We engineer high-fidelity, performant digital ecosystems for visionary companies. From AI integration to enterprise scale."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.devenginehq.com/home" />
        <meta property="og:image" content="https://www.devenginehq.com/dev_url_logo.png" />
        <meta property="og:image:width" content="1254" />
        <meta property="og:image:height" content="1254" />

        {/* Twitter Cards */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="DevEngine Studio - Cinematic Engineering & Enterprise Software" />
        <meta
          name="twitter:description"
          content="We engineer high-fidelity, performant digital ecosystems for visionary companies. From AI integration to enterprise scale."
        />
        <meta name="twitter:image" content="https://www.devenginehq.com/dev_url_logo.png" />

        {/* JSON-LD Structured Data Schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaOrgData) }}
        />
      </Head>

      <div className={styles.page}>
        {/* Navigation Bar (No login/signup buttons, Build Together CTA) */}
        <ScrollProgress />
        <LandingNavbar />

        <main>
          {/* 1. Hero with 3D perspective device frames */}
          <HeroSection config={config.hero} showcase={buildHeroShowcase(config)} />

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
