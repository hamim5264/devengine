import React, { useEffect, useState } from "react";

interface ThankYouModalProps {
  isOpen: boolean;
  onClose: () => void;
  senderName?: string;
  durationMs?: number; // defaults to 5000ms (5 seconds)
}

export default function ThankYouModal({
  isOpen,
  onClose,
  senderName,
  durationMs = 5000,
}: ThankYouModalProps) {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!isOpen) {
      setProgress(100);
      return;
    }

    const startTime = Date.now();
    const intervalTime = 50;

    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remainingPercent = Math.max(0, 100 - (elapsed / durationMs) * 100);
      setProgress(remainingPercent);

      if (elapsed >= durationMs) {
        clearInterval(timer);
        onClose();
      }
    }, intervalTime);

    return () => clearInterval(timer);
  }, [isOpen, durationMs, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[#080E1A]/95 border border-[#3EF3FF]/30 rounded-3xl p-8 sm:p-10 shadow-[0_0_50px_rgba(62,243,255,0.2)] text-center relative overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glowing corner glow */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#3EF3FF]/15 blur-3xl rounded-full pointer-events-none" />

        {/* Animated Checkmark Badge */}
        <div className="w-16 h-16 rounded-2xl bg-[#3EF3FF]/10 border border-[#3EF3FF]/40 text-[#3EF3FF] flex items-center justify-center mx-auto mb-6 shadow-[0_0_25px_rgba(62,243,255,0.3)]">
          <span className="material-symbols-outlined text-[36px] animate-bounce">
            check_circle
          </span>
        </div>

        {/* Header */}
        <div className="font-jetbrains text-xs text-[#3EF3FF] tracking-[0.25em] uppercase font-bold mb-2">
          TRANSMISSION CONFIRMED
        </div>

        <h3 className="font-space-grotesk text-2xl sm:text-3xl font-extrabold text-white mb-3 tracking-tight">
          Thank You{senderName ? `, ${senderName}` : ""}!
        </h3>

        <p className="font-sans text-sm sm:text-base text-[#BAC9CB] leading-relaxed mb-6 font-normal">
          Your message has been delivered to Hamim and the DevEngine engineering team.
          We will review your parameters and respond to your email shortly.
        </p>

        {/* 5-Second Countdown Indicator Bar */}
        <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden mb-6 relative">
          <div
            className="h-full bg-gradient-to-r from-[#00DBE8] via-[#3EF3FF] to-[#78F5FF] transition-all ease-linear shadow-[0_0_10px_#3EF3FF]"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] font-jetbrains text-[#849495] mb-2">
          <span>AUTO-CLOSING IN 5 SECONDS</span>
          <button
            type="button"
            onClick={onClose}
            className="text-[#3EF3FF] hover:underline font-bold uppercase tracking-wider cursor-pointer"
          >
            DISMISS NOW [✕]
          </button>
        </div>
      </div>
    </div>
  );
}
