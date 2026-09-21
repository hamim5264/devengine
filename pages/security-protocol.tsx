import React, { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import Image from "next/image";
import { SecurityConfig } from "@/types/security";
import {
  getSecurityConfig,
  DEFAULT_SECURITY_CONFIG,
} from "@/lib/services/securityService";

export default function SecurityProtocolPage() {
  const [config, setConfig] = useState<SecurityConfig>(DEFAULT_SECURITY_CONFIG);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const data = await getSecurityConfig();
        if (isMounted) setConfig(data);
      } catch (err) {
        console.warn("Using fallback security config:", err);
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <>
      <Head>
        <title>{config.header.title} - DevEngine</title>
        <meta name="description" content={config.header.subtitle} />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      <div className="min-h-screen bg-[#02040A] text-[#dde2f3] font-sans selection:bg-[#38f2ff] selection:text-[#02040A] relative overflow-x-hidden">
        {/* Ambient Technical Background Grid */}
        <div className="fixed inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none opacity-50 z-0" />

        {/* Ambient Glows */}
        <div className="fixed top-0 left-1/4 w-[500px] h-[500px] bg-[#38f2ff]/5 rounded-full blur-[140px] pointer-events-none z-0" />
        <div className="fixed bottom-0 right-1/4 w-[600px] h-[600px] bg-[#2100a3]/10 rounded-full blur-[160px] pointer-events-none z-0" />

        {/* Minimal High-Tech Top Header Bar */}
        <header className="fixed top-0 w-full z-40 bg-[#02040A]/85 backdrop-blur-xl border-b border-white/5 py-4 px-6 sm:px-12 flex justify-between items-center">
          <Link href="/home" className="flex items-center gap-3">
            <Image
              src="/assets/DevEngine-logo-on-dark2.png"
              alt="DevEngine"
              width={150}
              height={36}
              priority
              className="h-7 w-auto object-contain"
            />
          </Link>

          <Link
            href="/home"
            className="font-jetbrains text-xs tracking-wider text-[#38f2ff] hover:underline flex items-center gap-1.5"
          >
            ← Return to Console
          </Link>
        </header>

        {/* Main Content Area */}
        <main className="relative z-10 pt-32 pb-24 px-6 sm:px-10 md:px-16 max-w-7xl mx-auto space-y-24">
          {/* Hero Section */}
          <section className="text-center max-w-3xl mx-auto flex flex-col items-center">
            <div className="inline-flex items-center gap-2 bg-[#38f2ff]/10 border border-[#38f2ff]/30 rounded-full px-4 py-2 mb-8 shadow-[0_0_20px_rgba(56,242,255,0.15)]">
              <span className="w-2 h-2 rounded-full bg-[#38f2ff] animate-pulse shadow-[0_0_8px_#38f2ff]" />
              <span className="font-jetbrains text-xs uppercase tracking-widest text-[#38f2ff] font-semibold">
                {config.header.statusBadge}
              </span>
            </div>

            <h1 className="font-space text-4xl sm:text-6xl md:text-7xl font-bold text-white tracking-tight mb-6 shadow-sm">
              {config.header.title}
            </h1>

            <p className="font-sans text-base sm:text-lg text-[#849495] max-w-2xl leading-relaxed">
              {config.header.subtitle}
            </p>
          </section>

          {/* Section: Data Encryption Architecture */}
          <section className="relative pt-12 border-t border-white/10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
              {/* Left Column: Descriptions & Standards */}
              <div className="lg:col-span-5 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-[#38f2ff]/10 border border-[#38f2ff]/30 text-[#38f2ff]">
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.5"
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      />
                    </svg>
                  </div>
                  <h2 className="font-space text-2xl sm:text-3xl font-bold text-white">
                    {config.encryption.title}
                  </h2>
                </div>

                <p className="text-[#849495] text-sm sm:text-base leading-relaxed">
                  {config.encryption.description}
                </p>

                <ul className="space-y-3 font-jetbrains text-xs text-[#bac9cb] pt-2">
                  <li className="flex items-center gap-3 border-b border-white/5 pb-2.5">
                    <svg
                      className="w-4 h-4 text-[#38f2ff] shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span>{config.encryption.bullet1}</span>
                  </li>
                  <li className="flex items-center gap-3 border-b border-white/5 pb-2.5">
                    <svg
                      className="w-4 h-4 text-[#38f2ff] shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span>{config.encryption.bullet2}</span>
                  </li>
                  <li className="flex items-center gap-3 border-b border-white/5 pb-2.5">
                    <svg
                      className="w-4 h-4 text-[#38f2ff] shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span>{config.encryption.bullet3}</span>
                  </li>
                </ul>
              </div>

              {/* Right Column: High-Tech Bento Grid Nodes */}
              <div className="lg:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Node 1 */}
                <div className="p-8 rounded-2xl bg-[#08111f]/70 backdrop-blur-xl border border-white/10 hover:border-[#38f2ff]/40 transition-all duration-300 flex flex-col items-center justify-center text-center relative overflow-hidden group shadow-lg">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#38f2ff]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="w-14 h-14 rounded-xl bg-[#38f2ff]/10 border border-[#38f2ff]/30 flex items-center justify-center mb-4 text-[#38f2ff]">
                    <svg
                      className="w-7 h-7"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.5"
                        d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <h3 className="font-space text-lg font-bold text-white mb-1.5">
                    {config.encryption.node1Title}
                  </h3>
                  <p className="text-xs text-[#849495] mb-4">
                    {config.encryption.node1Desc}
                  </p>
                  <div className="px-3 py-1 bg-[#0e131f] border border-white/10 rounded font-jetbrains text-[10px] text-[#38f2ff] tracking-wider">
                    {config.encryption.node1Badge}
                  </div>
                </div>

                {/* Node 2 */}
                <div className="p-8 rounded-2xl bg-[#08111f]/70 backdrop-blur-xl border border-white/10 hover:border-[#38f2ff]/40 transition-all duration-300 flex flex-col items-center justify-center text-center relative overflow-hidden group shadow-lg">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#c4c0ff]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="w-14 h-14 rounded-xl bg-[#c4c0ff]/10 border border-[#c4c0ff]/30 flex items-center justify-center mb-4 text-[#c4c0ff]">
                    <svg
                      className="w-7 h-7"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.5"
                        d="M4 7v10c0 2 1.5 3 3.5 3h9c2 0 3.5-1 3.5-3V7M4 7c0-2 1.5-3 3.5-3h9c2 0 3.5 1 3.5 3M4 7c0 2 1.5 3 3.5 3h9c2 0 3.5-1 3.5-3m-16 5c0 2 1.5 3 3.5 3h9c2 0 3.5-1 3.5-3"
                      />
                    </svg>
                  </div>
                  <h3 className="font-space text-lg font-bold text-white mb-1.5">
                    {config.encryption.node2Title}
                  </h3>
                  <p className="text-xs text-[#849495] mb-4">
                    {config.encryption.node2Desc}
                  </p>
                  <div className="px-3 py-1 bg-[#0e131f] border border-white/10 rounded font-jetbrains text-[10px] text-[#c4c0ff] tracking-wider">
                    {config.encryption.node2Badge}
                  </div>
                </div>

                {/* Spanning Architecture Graphic Card */}
                <div className="md:col-span-2 p-6 rounded-2xl bg-[#08111f]/80 backdrop-blur-xl border border-white/10 relative overflow-hidden">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#38f2ff] animate-ping" />
                      <span className="font-jetbrains text-xs text-[#38f2ff] uppercase tracking-widest font-semibold">
                        {config.encryption.diagramTitle}
                      </span>
                    </div>
                    <span className="font-jetbrains text-[10px] text-gray-500">
                      PIPELINE / ACTIVE
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-[#849495] leading-relaxed mb-6">
                    {config.encryption.diagramDesc}
                  </p>

                  <div className="relative h-20 w-full bg-[#030712] rounded-xl border border-white/5 flex items-center justify-around px-4 overflow-hidden">
                    <div className="absolute inset-x-0 top-1/2 h-[1px] bg-gradient-to-r from-transparent via-[#38f2ff]/40 to-transparent" />
                    <div className="z-10 px-3 py-1.5 rounded-lg bg-[#0e131f] border border-white/10 text-xs font-jetbrains text-white">
                      Source Code
                    </div>
                    <div className="z-10 w-2 h-2 rounded-full bg-[#38f2ff] shadow-[0_0_8px_#38f2ff]" />
                    <div className="z-10 px-3 py-1.5 rounded-lg bg-[#161c28] border border-[#38f2ff]/30 text-xs font-jetbrains text-[#38f2ff]">
                      HSM Handshake
                    </div>
                    <div className="z-10 w-2 h-2 rounded-full bg-[#38f2ff] shadow-[0_0_8px_#38f2ff]" />
                    <div className="z-10 px-3 py-1.5 rounded-lg bg-[#0e131f] border border-white/10 text-xs font-jetbrains text-white">
                      Cold Mirror
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Section: Infrastructure Security & Access Control */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Infrastructure Security */}
            <div className="p-8 sm:p-10 rounded-2xl bg-[#08111f]/70 backdrop-blur-xl border border-white/10 border-t-2 border-t-[#38f2ff] flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-[#38f2ff]/10 border border-[#38f2ff]/30 flex items-center justify-center mb-6 text-[#38f2ff]">
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.5"
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                    />
                  </svg>
                </div>
                <h2 className="font-space text-2xl font-bold text-white mb-3">
                  {config.infrastructure.title}
                </h2>
                <p className="text-sm text-[#849495] leading-relaxed mb-8">
                  {config.infrastructure.description}
                </p>
              </div>

              <div className="space-y-3 font-jetbrains text-xs">
                <div className="p-4 rounded-xl bg-[#0e131f]/80 border border-white/5 flex items-center justify-between">
                  <span className="text-white font-medium">
                    {config.infrastructure.cluster1Region}
                  </span>
                  <span className="px-2.5 py-1 bg-[#38f2ff]/10 text-[#38f2ff] text-[10px] rounded border border-[#38f2ff]/20">
                    {config.infrastructure.cluster1Badge}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-[#0e131f]/80 border border-white/5 flex items-center justify-between">
                  <span className="text-white font-medium">
                    {config.infrastructure.cluster2Region}
                  </span>
                  <span className="px-2.5 py-1 bg-[#38f2ff]/10 text-[#38f2ff] text-[10px] rounded border border-[#38f2ff]/20">
                    {config.infrastructure.cluster2Badge}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-[#0e131f]/80 border border-white/5 flex items-center justify-between">
                  <span className="text-white font-medium">
                    {config.infrastructure.cluster3Region}
                  </span>
                  <span className="px-2.5 py-1 bg-[#c4c0ff]/10 text-[#c4c0ff] text-[10px] rounded border border-[#c4c0ff]/20">
                    {config.infrastructure.cluster3Badge}
                  </span>
                </div>
              </div>
            </div>

            {/* Zero-Trust Access Control */}
            <div className="p-8 sm:p-10 rounded-2xl bg-[#08111f]/70 backdrop-blur-xl border border-white/10 border-t-2 border-t-[#c4c0ff] flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-[#c4c0ff]/10 border border-[#c4c0ff]/30 flex items-center justify-center mb-6 text-[#c4c0ff]">
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.5"
                      d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 004 11m0 0a8 8 0 00.12 1.378"
                    />
                  </svg>
                </div>
                <h2 className="font-space text-2xl font-bold text-white mb-3">
                  {config.accessControl.title}
                </h2>
                <p className="text-sm text-[#849495] leading-relaxed mb-8">
                  {config.accessControl.description}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-5 rounded-xl bg-[#0e131f]/80 border border-white/5 space-y-2">
                  <div className="flex items-center gap-2 text-[#38f2ff]">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.5"
                        d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                      />
                    </svg>
                    <span className="font-space text-sm font-bold text-white">
                      {config.accessControl.method1Title}
                    </span>
                  </div>
                  <p className="text-xs text-[#849495] leading-relaxed">
                    {config.accessControl.method1Desc}
                  </p>
                </div>

                <div className="p-5 rounded-xl bg-[#0e131f]/80 border border-white/5 space-y-2">
                  <div className="flex items-center gap-2 text-[#c4c0ff]">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.5"
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.5"
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                    <span className="font-space text-sm font-bold text-white">
                      {config.accessControl.method2Title}
                    </span>
                  </div>
                  <p className="text-xs text-[#849495] leading-relaxed">
                    {config.accessControl.method2Desc}
                  </p>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </>
  );
}
