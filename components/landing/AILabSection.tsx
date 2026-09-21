import React from "react";
import { AILabConfig } from "@/types/landing";

interface AILabSectionProps {
  config: AILabConfig;
}

export default function AILabSection({ config }: AILabSectionProps) {
  return (
    <section
      id="lab"
      className="min-h-screen flex items-center justify-center py-28 px-6 sm:px-12 md:px-20 relative overflow-hidden bg-[#02040A]"
    >
      <div className="max-w-[1440px] mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 relative z-10 items-center">
        {/* Left: Text */}
        <div className="flex flex-col space-y-6 lg:pr-10">
          <div className="font-jetbrains text-xs sm:text-sm text-[#3EF3FF] tracking-[0.25em] uppercase font-bold">
            {config.tag}
          </div>
          <h2 className="font-space-grotesk text-4xl sm:text-5xl md:text-6xl font-bold text-white leading-tight tracking-tight">
            {config.title}
          </h2>
          <p className="font-sans text-base sm:text-lg md:text-xl text-[#bac9cb] leading-relaxed font-normal">
            {config.description}
          </p>
        </div>

        {/* Right: 3D Floating AI Nodes */}
        <div className="h-[400px] sm:h-[500px] relative flex justify-center items-center select-none">
          <div className="w-44 h-44 sm:w-52 sm:h-52 rounded-full bg-[#0A0F1D]/80 border border-[#3EF3FF]/30 shadow-[0_0_60px_rgba(62,243,255,0.25)] flex items-center justify-center backdrop-blur-2xl hover:scale-105 transition-transform duration-500">
            <span className="material-symbols-outlined text-[64px] sm:text-[72px] text-[#3EF3FF] drop-shadow-[0_0_20px_#3EF3FF]">
              psychology
            </span>
          </div>

          <div className="w-24 h-24 rounded-full bg-[#0A0F1D]/70 border border-white/10 shadow-[0_0_30px_rgba(62,243,255,0.15)] absolute translate-x-36 translate-y-24 backdrop-blur-xl flex items-center justify-center">
            <span className="material-symbols-outlined text-3xl text-[#9ecaff]">
              hub
            </span>
          </div>

          <div className="w-28 h-28 rounded-full bg-[#0A0F1D]/70 border border-white/10 shadow-[0_0_35px_rgba(62,243,255,0.15)] absolute -translate-x-32 -translate-y-24 backdrop-blur-xl flex items-center justify-center">
            <span className="material-symbols-outlined text-3xl text-[#3EF3FF]">
              neurology
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
