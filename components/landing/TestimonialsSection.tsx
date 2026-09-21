import React from "react";
import { TestimonialsConfig } from "@/types/landing";

interface TestimonialsSectionProps {
  config: TestimonialsConfig;
}

export default function TestimonialsSection({
  config,
}: TestimonialsSectionProps) {
  return (
    <section className="min-h-[70vh] flex items-center justify-center py-28 px-6 sm:px-12 md:px-20 relative z-10 bg-[#02040A]">
      <div className="max-w-[1440px] mx-auto w-full text-center">
        {/* Header */}
        <div className="mb-16">
          <div className="font-jetbrains text-xs sm:text-sm text-[#3EF3FF] tracking-[0.25em] uppercase font-bold mb-3">
            {config.tag}
          </div>
          <h2 className="font-space-grotesk text-4xl sm:text-5xl md:text-6xl font-bold text-white tracking-tight">
            {config.title}
          </h2>
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 text-left">
          {config.testimonials.map((item, idx) => (
            <div
              key={idx}
              className="rounded-[2rem] p-8 sm:p-12 bg-[#0A0F1D]/80 border border-white/10 hover:border-[#3EF3FF]/40 backdrop-blur-xl shadow-[0_0_40px_rgba(62,243,255,0.05)] relative overflow-hidden group transition-all duration-300"
            >
              <span className="material-symbols-outlined text-[#3EF3FF]/15 text-[80px] sm:text-[100px] absolute top-6 left-6 pointer-events-none select-none">
                format_quote
              </span>

              <p className="font-space-grotesk text-xl sm:text-2xl leading-relaxed text-white italic mb-8 relative z-10 font-normal">
                "{item.quote}"
              </p>

              <div className="font-jetbrains text-xs sm:text-sm text-[#3EF3FF] uppercase tracking-widest font-bold">
                {item.name}
              </div>
              <div className="font-sans text-xs sm:text-sm text-[#849495] mt-1 font-normal">
                {item.role}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
