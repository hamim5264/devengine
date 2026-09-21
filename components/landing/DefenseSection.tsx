import React from "react";
import { DefenseConfig } from "@/types/landing";

interface DefenseSectionProps {
  config: DefenseConfig;
}

export default function DefenseSection({ config }: DefenseSectionProps) {
  return (
    <section className="min-h-[70vh] flex items-center justify-center py-28 px-6 sm:px-12 md:px-20 relative z-10 bg-[#02040A]">
      <div className="max-w-[1200px] mx-auto w-full flex flex-col items-center text-center">
        <div className="rounded-[2.5rem] bg-[#0A0F1D]/70 border border-white/10 p-10 sm:p-16 md:p-20 backdrop-blur-2xl shadow-[0_0_80px_rgba(62,243,255,0.06)] relative overflow-hidden hover:border-[#3EF3FF]/30 transition-all duration-500">
          <div className="relative z-10">
            {/* Center Icon */}
            <div className="inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-[#3EF3FF]/10 border border-[#3EF3FF]/30 mb-8 shadow-[0_0_30px_rgba(62,243,255,0.2)]">
              <span className="material-symbols-outlined text-[44px] sm:text-[48px] text-[#3EF3FF]">
                account_balance
              </span>
            </div>

            {/* Title */}
            <h2 className="font-space-grotesk text-3xl sm:text-5xl md:text-6xl font-bold text-white mb-6 tracking-tight">
              {config.title}
            </h2>

            {/* Description */}
            <p className="font-sans text-base sm:text-xl md:text-2xl text-[#bac9cb] max-w-3xl mx-auto leading-relaxed font-normal">
              {config.description}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
