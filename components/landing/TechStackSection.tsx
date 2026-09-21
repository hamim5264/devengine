import React from "react";
import { TechStackConfig } from "@/types/landing";

interface TechStackSectionProps {
  config: TechStackConfig;
}

export default function TechStackSection({ config }: TechStackSectionProps) {
  return (
    <section className="py-24 flex flex-col justify-center relative overflow-hidden bg-[#02040A]">
      <div className="text-center mb-16 relative z-10">
        <h3 className="font-jetbrains text-xs sm:text-sm text-[#3EF3FF] tracking-[0.25em] uppercase font-bold mb-3">
          {config.tag}
        </h3>
        <h2 className="font-space-grotesk text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight">
          {config.title}
        </h2>
      </div>

      {/* Floating Tech Logos */}
      <div className="max-w-[1440px] mx-auto w-full px-6 sm:px-12 md:px-20 relative z-10">
        <div className="flex flex-wrap justify-center gap-6 sm:gap-10 items-center">
          {config.techList.map((tech, index) => (
            <div
              key={index}
              className="rounded-2xl bg-[#0A0F1D]/70 border border-white/10 hover:border-[#3EF3FF]/50 px-8 py-5 flex items-center justify-center backdrop-blur-xl shadow-[0_0_30px_rgba(62,243,255,0.05)] hover:shadow-[0_0_40px_rgba(62,243,255,0.2)] hover:scale-105 active:scale-95 transition-all duration-300 group cursor-default"
            >
              <span className="font-space-grotesk text-sm sm:text-base font-bold text-white tracking-wider group-hover:text-[#3EF3FF] transition-colors">
                {tech}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
