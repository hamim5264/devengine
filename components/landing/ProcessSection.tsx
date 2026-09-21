import React, { useEffect, useRef, useState } from "react";
import { ProcessConfig } from "@/types/landing";

interface ProcessSectionProps {
  config: ProcessConfig;
}

export default function ProcessSection({ config }: ProcessSectionProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      if (!sectionRef.current) return;
      const rect = sectionRef.current.getBoundingClientRect();
      const sectionTop = rect.top;
      const sectionHeight = rect.height;
      const windowHeight = window.innerHeight;

      const startScroll = windowHeight * 0.7;
      const endScroll = -sectionHeight + windowHeight * 0.3;

      if (sectionTop < startScroll && sectionTop > endScroll) {
        const total = startScroll - endScroll;
        const current = startScroll - sectionTop;
        const progress = Math.max(0, Math.min(100, (current / total) * 100));
        setScrollProgress(progress);
      } else if (sectionTop <= endScroll) {
        setScrollProgress(100);
      } else {
        setScrollProgress(0);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <section
      id="process"
      ref={sectionRef}
      className="min-h-[140vh] flex flex-col items-center py-28 px-6 sm:px-12 md:px-20 relative z-10 bg-[#02040A]"
    >
      {/* Sticky Header */}
      <div className="text-center mb-24 sticky top-24 z-20 bg-[#02040A]/85 backdrop-blur-xl py-6 px-10 rounded-3xl border border-white/10 shadow-[0_0_30px_rgba(62,243,255,0.06)]">
        <div className="font-jetbrains text-xs sm:text-sm text-[#3EF3FF] tracking-[0.25em] uppercase font-bold mb-2">
          {config.tag}
        </div>
        <h2 className="font-space-grotesk text-3xl sm:text-5xl font-bold text-white tracking-tight">
          {config.title}
        </h2>
      </div>

      {/* Vertical Interactive Track */}
      <div className="max-w-4xl mx-auto w-full relative pt-16">
        {/* Central Track Line */}
        <div className="absolute left-6 md:left-1/2 top-0 bottom-0 w-[2px] bg-white/10 md:-translate-x-1/2 rounded-full" />

        {/* Dynamic Glowing Laser Beam */}
        <div
          className="absolute left-6 md:left-1/2 top-0 w-[3px] bg-[#3EF3FF] md:-translate-x-1/2 rounded-full shadow-[0_0_20px_#3EF3FF,0_0_40px_#3EF3FF] transition-all duration-100 ease-out"
          style={{ height: `${scrollProgress}%` }}
        />

        {/* Steps List */}
        <div className="space-y-32 pb-24">
          {config.stages.map((stage, idx) => {
            const isEven = idx % 2 === 0;
            const threshold = (idx / Math.max(1, config.stages.length - 1)) * 100;
            const isActive = scrollProgress >= threshold - 5;

            return (
              <div
                key={idx}
                className={`relative pl-16 md:w-1/2 ${
                  isEven
                    ? "md:pl-0 md:pr-20 md:text-right md:mr-auto"
                    : "md:pl-20 md:pr-0 md:text-left md:ml-auto"
                }`}
              >
                {/* Step Node Dot */}
                <div
                  className={`absolute w-5 h-5 rounded-full border-2 transform mt-1.5 transition-all duration-300 z-10 ${
                    isEven
                      ? "left-6 md:left-auto md:right-0 -translate-x-1/2 md:translate-x-1/2"
                      : "left-6 md:left-0 md:right-auto -translate-x-1/2"
                  } ${
                    isActive
                      ? "bg-[#3EF3FF] border-[#3EF3FF] shadow-[0_0_20px_#3EF3FF]"
                      : "bg-[#02040A] border-white/20 shadow-none"
                  }`}
                />

                <div className="font-jetbrains text-xs text-[#3EF3FF] tracking-widest font-bold mb-2 uppercase">
                  {stage.stageNumber}
                </div>
                <h3 className="font-space-grotesk text-2xl sm:text-3xl font-bold text-white mb-3 tracking-tight">
                  {stage.title}
                </h3>
                <p className="font-sans text-sm sm:text-base text-[#bac9cb] leading-relaxed font-normal">
                  {stage.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
