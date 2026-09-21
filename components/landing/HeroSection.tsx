import React from "react";
import { HeroConfig } from "@/types/landing";

interface HeroSectionProps {
  config: HeroConfig;
}

export default function HeroSection({ config }: HeroSectionProps) {
  return (
    <section
      id="studio"
      className="min-h-screen relative flex items-center justify-center pt-32 pb-20 px-6 sm:px-12 md:px-20 overflow-hidden bg-[#02040A]"
    >
      {/* Subtle Aurora Ambient Radial Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vh] bg-[radial-gradient(circle_at_50%_50%,rgba(62,243,255,0.06),transparent_60%)] pointer-events-none blur-3xl" />

      <div className="max-w-[1440px] mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center relative z-10">
        {/* Left Column: Headline & Stats */}
        <div className="flex flex-col justify-center space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full border border-[#3EF3FF]/20 bg-[#3EF3FF]/5 w-fit backdrop-blur-xl shadow-[0_0_20px_rgba(62,243,255,0.1)]">
            <span
              className="w-2 h-2 rounded-full bg-[#3EF3FF] animate-pulse"
              style={{ boxShadow: "0 0 10px #3EF3FF" }}
            />
            <span className="font-jetbrains text-xs uppercase tracking-widest text-[#3EF3FF] font-semibold">
              {config.badgeText}
            </span>
          </div>

          {/* Main Title */}
          <h1 className="font-space-grotesk text-4xl sm:text-6xl md:text-7xl font-bold text-white leading-[1.05] tracking-tight">
            {config.title}{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#3EF3FF] via-[#9ecaff] to-white drop-shadow-[0_0_25px_rgba(62,243,255,0.35)]">
              {config.titleHighlight}
            </span>
          </h1>

          {/* Subtitle */}
          <p className="font-sans text-base sm:text-lg md:text-xl text-[#bac9cb] max-w-xl leading-relaxed font-normal">
            {config.subtitle}
          </p>

          {/* Stat Cards */}
          <div className="flex flex-wrap gap-5 pt-2">
            <div className="rounded-2xl bg-[#0A0F1D]/60 border border-white/10 hover:border-[#3EF3FF]/30 px-7 py-5 backdrop-blur-xl shadow-[0_0_30px_rgba(62,243,255,0.05)] transition-all duration-300 hover:scale-105">
              <div className="font-space-grotesk text-2xl sm:text-3xl font-bold text-white mb-1">
                {config.stat1Value}
              </div>
              <div className="font-jetbrains text-xs text-[#3EF3FF] uppercase tracking-wider font-semibold">
                {config.stat1Label}
              </div>
            </div>

            <div className="rounded-2xl bg-[#0A0F1D]/60 border border-white/10 hover:border-[#3EF3FF]/30 px-7 py-5 backdrop-blur-xl shadow-[0_0_30px_rgba(62,243,255,0.05)] transition-all duration-300 hover:scale-105">
              <div className="font-space-grotesk text-2xl sm:text-3xl font-bold text-white mb-1">
                {config.stat2Value}
              </div>
              <div className="font-jetbrains text-xs text-[#3EF3FF] uppercase tracking-wider font-semibold">
                {config.stat2Label}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: 3D Perspective Device Mockup Frames */}
        <div className="relative h-[420px] sm:h-[520px] md:h-[620px] lg:h-[680px] flex items-center justify-center [perspective:1200px] select-none">
          {/* Desktop Mockup Frame */}
          <div className="absolute w-[95%] sm:w-[90%] max-w-[700px] z-10 transform -translate-x-[6%] -translate-y-[4%] rotate-y-[-12deg] rotate-x-[8deg] shadow-[0_0_70px_rgba(62,243,255,0.18)] rounded-2xl overflow-hidden border border-white/15 bg-[#0A0F1D]/80 backdrop-blur-2xl transition-all duration-500 hover:shadow-[0_0_90px_rgba(62,243,255,0.3)]">
            {/* Window Top Controls Bar */}
            <div className="bg-[#0A0F1D] h-9 flex items-center px-4 gap-2 border-b border-white/10">
              <div className="w-2.5 h-2.5 rounded-full bg-[#ffb4ab]/80" />
              <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
              <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
              <span className="font-jetbrains text-[10px] text-[#849495] ml-3 truncate">
                devengine.studio // enterprise_core
              </span>
            </div>
            {/* Screen Image */}
            <div className="w-full aspect-[16/10] overflow-hidden bg-[#02040A]">
              <img
                src={config.desktopImageUrl}
                alt="Desktop Preview"
                className="w-full h-full object-cover opacity-90 transition-transform duration-700 hover:scale-105"
              />
            </div>
          </div>

          {/* Tablet Mockup Frame */}
          <div className="absolute w-[52%] max-w-[340px] z-20 transform translate-x-[22%] translate-y-[18%] rotate-y-[-6deg] rotate-x-[3deg] shadow-[0_0_50px_rgba(0,0,0,0.9)] rounded-3xl overflow-hidden border-[6px] border-[#111827] bg-black">
            <div className="w-full aspect-[4/3] overflow-hidden">
              <img
                src={config.tabletImageUrl}
                alt="Tablet View"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Mobile Phone Mockup Frame */}
          <div className="absolute w-[28%] max-w-[170px] z-30 transform translate-x-[75%] translate-y-[10%] rotate-y-[8deg] rotate-x-[-4deg] shadow-[0_0_60px_rgba(62,243,255,0.25)] rounded-[2rem] overflow-hidden border-[5px] border-[#02040A] bg-black">
            <div className="w-full aspect-[9/18] overflow-hidden">
              <img
                src={config.mobileImageUrl}
                alt="Mobile App"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
