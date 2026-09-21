import React from "react";
import { MobileConfig } from "@/types/landing";

interface MobileSectionProps {
  config: MobileConfig;
}

export default function MobileSection({ config }: MobileSectionProps) {
  return (
    <section className="min-h-screen flex items-center justify-center py-28 px-6 sm:px-12 md:px-20 relative z-10 bg-[#02040A] overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 max-w-[1440px] mx-auto w-full items-center">
        {/* Left: Dual 3D Floating Phone Mockups */}
        <div className="order-2 lg:order-1 relative h-[500px] sm:h-[600px] flex justify-center items-center [perspective:1200px] select-none">
          {/* Main Front Phone */}
          <div className="w-60 sm:w-72 h-[460px] sm:h-[540px] rounded-[3rem] border-[10px] sm:border-[12px] border-[#0A0F1D] transform rotate-y-[15deg] shadow-[0_0_80px_rgba(62,243,255,0.2)] overflow-hidden relative z-20 bg-black transition-all duration-500 hover:rotate-y-[5deg]">
            <img
              src={config.phone1ImageUrl}
              alt="Mobile Screen 1"
              className="w-full h-full object-cover"
            />
          </div>

          {/* Secondary Back Phone */}
          <div className="absolute w-60 sm:w-72 h-[460px] sm:h-[540px] rounded-[3rem] border-[10px] sm:border-[12px] border-[#0A0F1D] transform rotate-y-[-10deg] translate-x-28 sm:translate-x-36 translate-y-12 shadow-[0_0_60px_rgba(0,0,0,0.8)] overflow-hidden z-10 opacity-70 bg-black">
            <img
              src={config.phone2ImageUrl}
              alt="Mobile Screen 2"
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Right: Description */}
        <div className="order-1 lg:order-2 flex flex-col space-y-6 lg:pl-10">
          <div className="font-jetbrains text-xs sm:text-sm text-[#3EF3FF] tracking-[0.25em] uppercase font-bold">
            {config.tag}
          </div>
          <h2 className="font-space-grotesk text-4xl sm:text-5xl md:text-6xl font-bold text-white leading-tight tracking-tight whitespace-pre-line">
            {config.title}
          </h2>
          <p className="font-sans text-base sm:text-lg md:text-xl text-[#bac9cb] leading-relaxed max-w-lg font-normal">
            {config.description}
          </p>
        </div>
      </div>
    </section>
  );
}
