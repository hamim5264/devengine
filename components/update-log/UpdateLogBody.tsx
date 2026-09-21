import React, { useEffect, useState } from "react";
import { UpdateLogEntry } from "@/types/update-log";
import { getPublishedUpdateLogs } from "@/lib/services/updateLogsService";

interface UpdateLogBodyProps {
  initialLogs?: UpdateLogEntry[];
}

export default function UpdateLogBody({ initialLogs }: UpdateLogBodyProps) {
  const [logs, setLogs] = useState<UpdateLogEntry[]>(initialLogs || []);
  const [loading, setLoading] = useState<boolean>(!initialLogs);
  const [visibleCount, setVisibleCount] = useState<number>(5);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const data = await getPublishedUpdateLogs();
        if (isMounted) {
          setLogs(data);
          setLoading(false);
        }
      } catch (err) {
        console.error("Failed to load update logs:", err);
        if (isMounted) setLoading(false);
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, []);

  const getTagStyle = (tag: string) => {
    switch (tag.toUpperCase()) {
      case "OPTIMIZED":
        return "bg-[#3495ea]/15 text-[#3495ea] border-[#3495ea]/40 shadow-[0_0_10px_rgba(52,149,234,0.2)]";
      case "PATCHED":
        return "bg-[#c4c0ff]/15 text-[#c4c0ff] border-[#c4c0ff]/40 shadow-[0_0_10px_rgba(196,192,255,0.2)]";
      case "SECURITY":
        return "bg-[#ffb4ab]/15 text-[#ffb4ab] border-[#ffb4ab]/40 shadow-[0_0_10px_rgba(255,180,171,0.2)]";
      case "FEATURE":
        return "bg-[#78f5ff]/15 text-[#78f5ff] border-[#78f5ff]/40 shadow-[0_0_10px_rgba(120,245,255,0.2)]";
      case "DEPLOYED":
      default:
        return "bg-[#38f2ff]/15 text-[#38f2ff] border-[#38f2ff]/40 shadow-[0_0_10px_rgba(56,242,255,0.2)]";
    }
  };

  const visibleLogs = logs.slice(0, visibleCount);
  const hasMore = visibleCount < logs.length;

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 pt-24 pb-20 text-[#dde2f3]">
      {/* Title Header */}
      <div className="mb-12 sm:mb-16">
        <h1 className="font-space-grotesk text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-[#dde2f3] mb-3">
          SYSTEM_UPDATE_LOG
        </h1>
        <p className="font-jetbrains text-xs sm:text-sm text-[#38f2ff] tracking-[0.25em] uppercase font-semibold">
          Chronological record of systemic enhancements and protocol adjustments.
        </p>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="space-y-8 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="p-6 rounded-xl bg-[#0e131f]/60 border border-white/5 h-44"
            />
          ))}
        </div>
      )}

      {/* Main Timeline Card Container */}
      {!loading && (
        <div className="relative rounded-2xl bg-[#08111f]/70 border border-[#38f2ff]/20 backdrop-blur-xl p-6 sm:p-10 shadow-[0_0_35px_rgba(56,242,255,0.06)]">
          {/* Vertical Timeline Guide Line */}
          <div className="absolute left-10 sm:left-14 top-14 bottom-14 w-px bg-[#3b494b]/40 hidden md:block" />

          <div className="space-y-12">
            {visibleLogs.map((item, index) => (
              <div
                key={item.id || index}
                className="relative flex flex-col md:flex-row gap-6 group"
              >
                {/* Date & Timeline Node */}
                <div className="md:w-36 flex-shrink-0 flex items-start pt-1 z-10">
                  <div
                    className={`hidden md:flex w-3 h-3 rounded-full mr-4 mt-1.5 ring-4 ring-black transition-all duration-300 ${
                      index === 0
                        ? "bg-[#38f2ff] shadow-[0_0_12px_#38f2ff]"
                        : "bg-[#2f3542] group-hover:bg-[#38f2ff] group-hover:shadow-[0_0_10px_#38f2ff]"
                    }`}
                  />
                  <span
                    className={`font-jetbrains text-xs sm:text-sm font-semibold tracking-wider ${
                      index === 0 ? "text-[#78f5ff]" : "text-[#849495]"
                    }`}
                  >
                    {item.date}
                  </span>
                </div>

                {/* Log Entry Card */}
                <div className="flex-1 p-6 sm:p-7 rounded-xl bg-[#0e1626]/80 border border-white/5 group-hover:border-[#38f2ff]/40 transition-all duration-300 shadow-lg relative overflow-hidden">
                  {/* Subtle hover cyan gradient sweep */}
                  <div className="absolute inset-0 bg-gradient-to-r from-[#38f2ff]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                  {/* Header: Title & Tag */}
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-4">
                    <h2 className="font-space-grotesk text-xl sm:text-2xl font-semibold text-[#dde2f3] tracking-tight">
                      {item.version}
                    </h2>
                    <span
                      className={`inline-block px-3 py-1 font-jetbrains text-[10px] sm:text-xs rounded border uppercase font-bold tracking-widest w-fit ${getTagStyle(
                        item.tag
                      )}`}
                    >
                      {item.tag}
                    </span>
                  </div>

                  {/* Summary */}
                  {item.summary && (
                    <p className="font-sans text-sm sm:text-base text-[#bac9cb] leading-relaxed mb-6 font-normal">
                      {item.summary}
                    </p>
                  )}

                  {/* Bullets List */}
                  {item.bullets && item.bullets.length > 0 && (
                    <ul className="space-y-3 font-jetbrains text-xs sm:text-sm text-[#849495]">
                      {item.bullets.map((bullet, bIdx) => (
                        <li key={bIdx} className="flex items-start gap-3">
                          <span className="material-symbols-outlined text-base text-[#38f2ff] flex-shrink-0 mt-0.5">
                            commit
                          </span>
                          <span className="leading-relaxed">{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Load Historical Data Button */}
          {hasMore && (
            <div className="mt-14 text-center">
              <button
                type="button"
                onClick={() => setVisibleCount((prev) => prev + 5)}
                className="bg-[#38f2ff] text-[#002022] hover:bg-[#78f5ff] font-jetbrains text-xs tracking-widest font-bold px-8 py-3.5 rounded-full shadow-[0_0_20px_rgba(56,242,255,0.4)] hover:shadow-[0_0_30px_rgba(56,242,255,0.7)] hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer uppercase"
              >
                LOAD_HISTORICAL_DATA
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
