import React from "react";
import { CustomSolutionsConfig } from "@/types/landing";

interface CustomSolutionsSectionProps {
  config: CustomSolutionsConfig;
}

export default function CustomSolutionsSection({
  config,
}: CustomSolutionsSectionProps) {
  const largeCard = config.cards.find((c) => c.isLarge) || config.cards[0];
  const otherCards = config.cards.filter((c) => c !== largeCard);

  return (
    <section
      id="services"
      className="min-h-screen flex items-center justify-center py-28 px-6 sm:px-12 md:px-20 relative z-10 bg-[#02040A]"
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

        {/* Bento Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 auto-rows-[280px] sm:auto-rows-[300px]">
          {/* Large Card: Spans 2 Cols, 2 Rows */}
          {largeCard && (
            <div className="lg:col-span-2 lg:row-span-2 rounded-3xl p-8 sm:p-12 flex flex-col justify-end relative overflow-hidden bg-[#0A0F1D]/80 border border-white/10 hover:border-[#3EF3FF]/40 shadow-[0_0_50px_rgba(62,243,255,0.06)] group transition-all duration-500">
              {/* Background Image with Gradient Overlay */}
              {largeCard.imageUrl && (
                <img
                  src={largeCard.imageUrl}
                  alt={largeCard.title}
                  className="absolute inset-0 w-full h-full object-cover opacity-25 mix-blend-screen group-hover:scale-105 transition-transform duration-700 pointer-events-none"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#02040A] via-[#02040A]/60 to-transparent pointer-events-none" />

              <div className="relative z-10">
                <span className="material-symbols-outlined text-[#3EF3FF] text-4xl sm:text-5xl mb-4 block drop-shadow-[0_0_15px_#3EF3FF]">
                  {largeCard.icon || "cloud_sync"}
                </span>
                <h3 className="font-space-grotesk text-2xl sm:text-4xl font-bold text-white mb-3">
                  {largeCard.title}
                </h3>
                <p className="font-sans text-base sm:text-lg text-[#bac9cb] max-w-lg leading-relaxed font-normal">
                  {largeCard.description}
                </p>
              </div>
            </div>
          )}

          {/* Smaller Cards */}
          {otherCards.map((card, idx) => (
            <div
              key={idx}
              className="lg:col-span-1 lg:row-span-1 rounded-3xl p-8 flex flex-col justify-end relative overflow-hidden bg-[#0A0F1D]/80 border border-white/10 hover:border-[#3EF3FF]/40 shadow-[0_0_30px_rgba(62,243,255,0.05)] group transition-all duration-300"
            >
              <div className="relative z-10">
                <span className="material-symbols-outlined text-[#3EF3FF] text-3xl sm:text-4xl mb-4 block drop-shadow-[0_0_10px_#3EF3FF]">
                  {card.icon || "security"}
                </span>
                <h3 className="font-space-grotesk text-xl sm:text-2xl font-bold text-white mb-2">
                  {card.title}
                </h3>
                <p className="font-sans text-xs sm:text-sm text-[#bac9cb] leading-relaxed font-normal">
                  {card.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
