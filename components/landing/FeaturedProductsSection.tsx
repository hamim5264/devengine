import React from "react";
import { FeaturedProductsConfig } from "@/types/landing";

interface FeaturedProductsSectionProps {
  config: FeaturedProductsConfig;
}

export default function FeaturedProductsSection({
  config,
}: FeaturedProductsSectionProps) {
  return (
    <section
      id="products"
      className="min-h-screen flex flex-col justify-center py-28 px-6 sm:px-12 md:px-20 relative z-10 bg-[#02040A]"
    >
      <div className="max-w-[1440px] mx-auto w-full">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="font-jetbrains text-xs sm:text-sm text-[#3EF3FF] tracking-[0.25em] uppercase font-bold mb-3">
            {config.tag}
          </div>
          <h2 className="font-space-grotesk text-4xl sm:text-5xl md:text-6xl font-bold text-white tracking-tight">
            {config.title}
          </h2>
        </div>

        {/* Product Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
          {config.products.map((prod, idx) => (
            <div
              key={idx}
              className={`group relative rounded-[2.5rem] overflow-hidden bg-[#0A0F1D]/80 border border-white/10 hover:border-[#3EF3FF]/40 shadow-[0_0_50px_rgba(62,243,255,0.06)] h-[550px] sm:h-[640px] p-4 cursor-pointer transition-all duration-500 ${
                idx % 2 === 1 ? "md:mt-16" : ""
              }`}
            >
              <div className="w-full h-full rounded-[2rem] overflow-hidden relative">
                {/* Product Cover Image */}
                <img
                  src={prod.imageUrl}
                  alt={prod.title}
                  className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-80 group-hover:scale-105 transition-all duration-700"
                />

                {/* Dark Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#02040A] via-[#02040A]/60 to-transparent p-8 sm:p-14 flex flex-col justify-end">
                  {prod.tag && (
                    <span className="font-jetbrains text-xs text-[#3EF3FF] uppercase tracking-widest font-bold mb-3">
                      {prod.tag}
                    </span>
                  )}
                  <h3 className="font-space-grotesk text-2xl sm:text-4xl font-bold text-white mb-3">
                    {prod.title}
                  </h3>
                  <p className="font-sans text-sm sm:text-base text-[#bac9cb] max-w-sm leading-relaxed font-normal">
                    {prod.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
