import React from "react";
import { IntroConfig } from "@/types/landing";

interface ImmersiveIntroProps {
  config: IntroConfig;
}

export default function ImmersiveIntro({ config }: ImmersiveIntroProps) {
  return (
    <section className="min-h-[60vh] flex items-center justify-center py-28 px-6 sm:px-12 md:px-20 bg-[#02040A] relative z-10 overflow-hidden">
      {/* Center Subtle Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[40vh] bg-[radial-gradient(circle_at_50%_50%,rgba(62,243,255,0.05),transparent_60%)] pointer-events-none blur-3xl" />

      <div className="text-center max-w-5xl mx-auto relative z-10">
        <h2 className="font-space-grotesk text-4xl sm:text-6xl md:text-8xl font-bold text-white leading-[1.1] tracking-tighter">
          {config.headingPrefix} <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#3EF3FF] via-[#9ecaff] to-white drop-shadow-[0_0_35px_rgba(62,243,255,0.4)]">
            {config.headingHighlight}
          </span>
        </h2>
      </div>
    </section>
  );
}
