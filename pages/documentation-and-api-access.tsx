import React, { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import Image from "next/image";
import { DocumentationConfig } from "@/types/documentation";
import {
  getDocumentationConfig,
  DEFAULT_DOCUMENTATION_CONFIG,
} from "@/lib/services/documentationService";

export default function DocumentationAndApiAccessPage() {
  const [config, setConfig] = useState<DocumentationConfig>(
    DEFAULT_DOCUMENTATION_CONFIG
  );
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const data = await getDocumentationConfig();
        if (isMounted) setConfig(data);
      } catch (err) {
        console.warn("Using fallback documentation config:", err);
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(config.quickStart.codeSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredGuides = config.guides.guides.filter(
    (g) =>
      g.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.tag.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <Head>
        <title>
          {config.header.title} {config.header.titleHighlight} - DevEngine
        </title>
        <meta name="description" content={config.header.subtitle} />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      <div className="min-h-screen bg-[#02040A] text-[#dde2f3] font-sans selection:bg-[#38f2ff] selection:text-[#02040A] relative overflow-x-hidden">
        {/* Background Grid & Ambient Glows */}
        <div className="fixed inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none opacity-40 z-0" />
        <div className="fixed top-20 left-10 w-[500px] h-[500px] bg-[#38f2ff]/5 rounded-full blur-[140px] pointer-events-none z-0" />
        <div className="fixed bottom-20 right-10 w-[600px] h-[600px] bg-[#c4c0ff]/5 rounded-full blur-[160px] pointer-events-none z-0" />

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

        {/* Main Content Layout with Sidebar */}
        <div className="relative z-10 pt-32 pb-24 max-w-7xl mx-auto px-6 sm:px-10 lg:px-16 grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-12 min-h-screen">
          {/* Sticky Sidebar Navigation */}
          <aside className="hidden lg:block relative">
            <div className="sticky top-28 bg-[#080e1a]/85 backdrop-blur-xl rounded-2xl p-6 border border-white/10 shadow-2xl flex flex-col gap-6">
              <div>
                <h3 className="font-jetbrains text-xs uppercase tracking-widest text-[#38f2ff] font-bold mb-4">
                  Documentation
                </h3>
                <ul className="flex flex-col gap-1.5 font-jetbrains text-xs">
                  <li>
                    <a
                      href="#quickstart"
                      className="flex items-center gap-3 py-2 px-3 rounded-lg bg-[#38f2ff]/10 text-[#38f2ff] font-semibold border border-[#38f2ff]/20 transition"
                    >
                      <span>⚡</span> Quick Start
                    </a>
                  </li>
                  <li>
                    <a
                      href="#guides"
                      className="flex items-center gap-3 py-2 px-3 rounded-lg text-[#849495] hover:text-white hover:bg-white/5 transition"
                    >
                      <span>📚</span> Architecture Guides
                    </a>
                  </li>
                  <li>
                    <a
                      href="#api-access"
                      className="flex items-center gap-3 py-2 px-3 rounded-lg text-[#849495] hover:text-white hover:bg-white/5 transition"
                    >
                      <span>🔑</span> API Access & Tokens
                    </a>
                  </li>
                </ul>
              </div>

              <div className="h-px bg-white/10" />

              <div>
                <h3 className="font-jetbrains text-xs uppercase tracking-widest text-[#849495] font-bold mb-4">
                  Resources
                </h3>
                <ul className="flex flex-col gap-1.5 font-jetbrains text-xs">
                  <li>
                    <a
                      href="#api-access"
                      className="flex items-center gap-3 py-2 px-3 rounded-lg text-[#849495] hover:text-[#38f2ff] hover:bg-white/5 transition"
                    >
                      <span>🌐</span> REST Endpoints
                    </a>
                  </li>
                  <li>
                    <Link
                      href="/security-protocol"
                      className="flex items-center gap-3 py-2 px-3 rounded-lg text-[#849495] hover:text-[#38f2ff] hover:bg-white/5 transition"
                    >
                      <span>🛡️</span> Security Standards
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </aside>

          {/* Main Content Area */}
          <main className="flex flex-col gap-16">
            {/* Hero Section */}
            <section className="flex flex-col gap-6 max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#38f2ff]/30 bg-[#38f2ff]/5 w-fit shadow-[0_0_15px_rgba(56,242,255,0.1)]">
                <span className="w-2 h-2 rounded-full bg-[#38f2ff] shadow-[0_0_8px_#38f2ff] animate-pulse" />
                <span className="font-jetbrains text-xs text-[#38f2ff] font-semibold">
                  {config.header.releaseBadge}
                </span>
              </div>

              <h1 className="font-space text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white">
                {config.header.title} <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#38f2ff] via-white/90 to-[#c4c0ff]">
                  {config.header.titleHighlight}
                </span>
              </h1>

              <p className="font-sans text-base sm:text-lg text-[#849495] max-w-2xl leading-relaxed">
                {config.header.subtitle}
              </p>

              {/* Search Bar */}
              <div className="relative mt-2 max-w-xl">
                <input
                  type="text"
                  placeholder="Search documentation, guides, and endpoints..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#080e1a] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#38f2ff] transition"
                />
                <svg
                  className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <circle cx="11" cy="11" r="8" strokeWidth="2" />
                  <path d="M21 21l-4.35-4.35" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
            </section>

            {/* Quick Start Code Block */}
            <section id="quickstart" className="flex flex-col gap-5 scroll-mt-32">
              <div className="flex items-center gap-3">
                <span className="p-2 rounded-lg bg-[#38f2ff]/10 text-[#38f2ff] border border-[#38f2ff]/20">
                  ⚡
                </span>
                <h2 className="font-space text-2xl font-bold text-white">
                  {config.quickStart.title}
                </h2>
              </div>

              <div className="rounded-2xl overflow-hidden border border-white/10 bg-[#030712] shadow-2xl relative">
                {/* Code Terminal Header */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 bg-[#080e1a]">
                  <div className="flex items-center gap-2 font-jetbrains text-xs text-[#849495]">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500/80 inline-block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80 inline-block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500/80 inline-block" />
                    <span className="ml-2 font-mono text-gray-400">
                      {config.quickStart.terminalLabel}
                    </span>
                  </div>

                  <button
                    onClick={handleCopyCode}
                    className="flex items-center gap-1.5 px-3 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-jetbrains text-gray-300 hover:text-[#38f2ff] transition"
                  >
                    {copied ? (
                      <>
                        <span className="text-teal-400">✓</span> Copied!
                      </>
                    ) : (
                      <>
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <rect
                            x="9"
                            y="9"
                            width="13"
                            height="13"
                            rx="2"
                            strokeWidth="2"
                          />
                          <path
                            d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"
                            strokeWidth="2"
                          />
                        </svg>
                        Copy
                      </>
                    )}
                  </button>
                </div>

                {/* Code Body */}
                <div className="p-6 overflow-x-auto font-jetbrains text-sm leading-relaxed text-[#bac9cb]">
                  <pre>{config.quickStart.codeSnippet}</pre>
                </div>
              </div>
            </section>

            {/* Popular Guides Grid */}
            <section id="guides" className="flex flex-col gap-6 scroll-mt-32">
              <h2 className="font-space text-2xl font-bold text-white">
                {config.guides.title}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredGuides.map((guide) => (
                  <div
                    key={guide.id}
                    className="p-6 rounded-2xl bg-[#08111f]/70 backdrop-blur-xl border border-white/10 hover:border-[#38f2ff]/40 transition-all duration-300 flex flex-col justify-between group shadow-lg"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <span className="px-2.5 py-1 rounded bg-[#38f2ff]/10 text-[#38f2ff] font-jetbrains text-[10px] font-bold border border-[#38f2ff]/20">
                          {guide.tag}
                        </span>
                        <span className="text-gray-600 group-hover:text-[#38f2ff] transition-colors">
                          ↗
                        </span>
                      </div>

                      <h3 className="font-space text-lg font-bold text-white mb-2 group-hover:text-[#38f2ff] transition-colors">
                        {guide.title}
                      </h3>

                      <p className="text-sm text-[#849495] leading-relaxed">
                        {guide.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Section: API Access & Enterprise Integration */}
            <section
              id="api-access"
              className="flex flex-col gap-6 scroll-mt-32 p-8 sm:p-10 rounded-2xl bg-[#08111f]/80 backdrop-blur-xl border border-white/10 border-t-2 border-t-[#38f2ff]"
            >
              <div>
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  <span className="px-3 py-1 rounded-full bg-[#38f2ff]/10 text-[#38f2ff] font-jetbrains text-xs font-bold border border-[#38f2ff]/30">
                    REST & GraphQL
                  </span>
                  <span className="px-3 py-1 rounded-full bg-white/5 text-[#849495] font-jetbrains text-xs border border-white/10">
                    {config.apiAccess.rateLimit}
                  </span>
                </div>

                <h2 className="font-space text-2xl sm:text-3xl font-bold text-white mb-3">
                  {config.apiAccess.sectionTitle}
                </h2>

                <p className="text-sm sm:text-base text-[#849495] leading-relaxed mb-6">
                  {config.apiAccess.description}
                </p>
              </div>

              {/* Endpoint Specs */}
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-[#030712] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-jetbrains text-xs">
                  <span className="text-gray-400">BASE URL:</span>
                  <span className="text-[#38f2ff] font-bold">
                    {config.apiAccess.baseUrl}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-[#030712] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-jetbrains text-xs">
                  <span className="text-gray-400">AUTH HEADER:</span>
                  <span className="text-white font-mono">
                    {config.apiAccess.authHeader}
                  </span>
                </div>
              </div>

              {/* Sample API Endpoints */}
              <div className="space-y-3 pt-4 border-t border-white/10">
                <h3 className="font-jetbrains text-xs uppercase tracking-widest text-[#849495] font-semibold mb-3">
                  Featured Endpoints
                </h3>

                {/* Endpoint 1 */}
                <div className="p-4 rounded-xl bg-[#0e131f] border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-3 font-jetbrains text-xs">
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-1 rounded bg-teal-500/20 text-teal-300 font-bold border border-teal-500/30">
                      {config.apiAccess.endpoint1Method}
                    </span>
                    <span className="text-white font-mono">
                      {config.apiAccess.endpoint1Path}
                    </span>
                  </div>
                  <span className="text-[#849495] text-[11px]">
                    {config.apiAccess.endpoint1Desc}
                  </span>
                </div>

                {/* Endpoint 2 */}
                <div className="p-4 rounded-xl bg-[#0e131f] border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-3 font-jetbrains text-xs">
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-1 rounded bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30">
                      {config.apiAccess.endpoint2Method}
                    </span>
                    <span className="text-white font-mono">
                      {config.apiAccess.endpoint2Path}
                    </span>
                  </div>
                  <span className="text-[#849495] text-[11px]">
                    {config.apiAccess.endpoint2Desc}
                  </span>
                </div>
              </div>
            </section>

            {/* Page Footer Meta */}
            <section className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 font-jetbrains text-xs text-[#849495]">
              <p>
                Last Updated:{" "}
                <span className="text-white">{config.header.lastUpdated}</span>
              </p>
              <a
                href="https://github.com/hamim5264"
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-full border border-white/10 text-gray-300 hover:text-[#38f2ff] hover:border-[#38f2ff]/40 transition"
              >
                Contribute on GitHub ↗
              </a>
            </section>
          </main>
        </div>
      </div>
    </>
  );
}
