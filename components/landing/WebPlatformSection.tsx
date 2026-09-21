import React from "react";
import { WebPlatformConfig } from "@/types/landing";

interface WebPlatformSectionProps {
  config: WebPlatformConfig;
}

export default function WebPlatformSection({
  config,
}: WebPlatformSectionProps) {
  return (
    <section className="min-h-screen py-28 flex flex-col items-center justify-center relative z-10 px-6 sm:px-12 md:px-20 bg-[#02040A]">
      <div className="text-center mb-16">
        <div className="font-jetbrains text-xs sm:text-sm text-[#3EF3FF] tracking-[0.25em] uppercase font-bold mb-3">
          {config.tag}
        </div>
        <h2 className="font-space-grotesk text-4xl sm:text-5xl md:text-6xl font-bold text-white tracking-tight">
          {config.title}
        </h2>
      </div>

      {/* Browser Window Glass Frame */}
      <div className="w-full max-w-[1200px] rounded-3xl overflow-hidden border border-white/10 bg-[#0A0F1D]/70 backdrop-blur-2xl shadow-[0_0_100px_rgba(62,243,255,0.12)] hover:border-[#3EF3FF]/30 transition-all duration-500">
        {/* Browser Top Controls Bar */}
        <div className="bg-[#0A0F1D] h-12 flex items-center px-6 gap-3 border-b border-white/5">
          <div className="w-3 h-3 rounded-full bg-[#ffb4ab]/80" />
          <div className="w-3 h-3 rounded-full bg-white/20" />
          <div className="w-3 h-3 rounded-full bg-white/20" />
          <div className="ml-4 sm:ml-8 bg-[#02040A] rounded-lg px-4 sm:px-6 py-1.5 text-xs font-jetbrains text-[#849495] w-72 sm:w-96 flex items-center gap-2 border border-white/5">
            <span className="material-symbols-outlined text-[14px] text-[#3EF3FF]">
              lock
            </span>
            <span className="truncate">{config.browserUrl}</span>
          </div>
        </div>

        {/* Screenshot Content Frame */}
        <div className="w-full aspect-[16/9] sm:aspect-[21/10] overflow-hidden bg-black">
          <img
            src={config.screenImageUrl}
            alt="Enterprise Dashboard"
            className="w-full h-full object-cover opacity-90 transition-transform duration-700 hover:scale-105"
          />
        </div>
      </div>
    </section>
  );
}
