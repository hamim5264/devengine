import { useEffect, useState } from "react";
import {
  FaLinkedin,
  FaGithub,
  FaFacebook,
  FaYoutube,
} from "react-icons/fa6";
import Link from "next/link";
import type { FooterConfig } from "@/types/landing";
import { getFooterConfig, DEFAULT_FOOTER_CONFIG } from "@/lib/services/landingService";

export default function Footer() {
  const [config, setConfig] = useState<FooterConfig>(DEFAULT_FOOTER_CONFIG);

  useEffect(() => {
    let active = true;
    getFooterConfig()
      .then((data) => {
        if (active && data) setConfig(data);
      })
      .catch((err) => console.error("Error loading footer config:", err));
    return () => {
      active = false;
    };
  }, []);

  return (
    <footer className="bg-gradient-to-tr from-gray-900 to-black text-white py-10 px-6 mt-0 border-t-[1px] border-teal-500/30 shadow-inner">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 md:gap-0">
        {/* Left Section */}
        <div className="text-center md:text-left">
          <h3 className="text-lg font-semibold text-[#2cecf7] mb-1">
            Connect with DevEngine
          </h3>
          <p className="text-sm text-gray-400">
            {config.tagline || "Engineering the Cinematic Future."}{" "}
            {config.subTagline || "High-fidelity, performant digital ecosystems."}
          </p>
          {config.showLocation && (
            <div className="mt-2 text-xs text-gray-400 space-y-0.5">
              {config.locationTitle && <p className="font-semibold text-gray-300">{config.locationTitle}</p>}
              <p>{[config.addressLine1, config.addressLine2, config.city, config.country].filter(Boolean).join(", ")}</p>
              {config.mapUrl && (
                <a
                  href={config.mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[#2cecf7] hover:underline pt-1"
                >
                  <span>Google Maps</span>
                  <span className="text-[10px]">↗</span>
                </a>
              )}
            </div>
          )}
        </div>

        {/* Social Icons */}
        <div className="flex gap-5 text-2xl items-center">
          <a
            href="https://github.com/DevEngine-Build-Fast-Learn-Smart"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-teal-400 transition transform hover:scale-110"
            title="GitHub"
          >
            <FaGithub />
          </a>
          <a
            href="https://www.linkedin.com/in/abdul-hamim-a35b02253/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-teal-400 transition transform hover:scale-110"
            title="LinkedIn"
          >
            <FaLinkedin />
          </a>
          <a
            href="https://www.facebook.com/profile.php?id=61575608701014"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-teal-400 transition transform hover:scale-110"
            title="Facebook"
          >
            <FaFacebook />
          </a>
          <a
            href="https://www.youtube.com/@TheDevHamim"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-red-400 transition transform hover:scale-110 text-2xl"
            title="YouTube"
          >
            <FaYoutube />
          </a>
        </div>

        {/* Copyright */}
        <p className="text-xs text-gray-500 text-center md:text-right">
          ©{" "}
          <Link
            href="/copyright"
            className="text-teal-400 font-semibold hover:underline"
          >
            DevEngine
          </Link>{" "}
          2025. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
