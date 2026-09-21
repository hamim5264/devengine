import React, { useState } from "react";
import Head from "next/head";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { sendContactEmail } from "@/lib/services/emailService";
import ThankYouModal from "@/components/ThankYouModal";

export default function Contact() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [thankYouOpen, setThankYouOpen] = useState(false);
  const [submittedName, setSubmittedName] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      await sendContactEmail({
        name,
        email,
        title: title || `DevEngine Contact Message from ${name}`,
        message,
      });

      setSubmittedName(name);
      setThankYouOpen(true);
      setName("");
      setEmail("");
      setTitle("");
      setMessage("");
    } catch (error: any) {
      console.error("Failed to send message:", error);
      setErrorMsg(
        error?.text || "Failed to deliver message. Please check your internet connection or email hamim.leon@gmail.com directly."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Contact DevEngine | Get in Touch with Hamim</title>
        <meta
          name="description"
          content="Connect directly with DevEngine and founder Abdul Hamim for custom software, high-performance systems, and digital ecosystems."
        />
      </Head>

      <Navbar />

      <main className="min-h-screen pt-32 pb-24 px-6 md:px-20 bg-[#02040A] text-white selection:bg-[#3EF3FF]/20 selection:text-[#3EF3FF] flex flex-col items-center justify-center relative overflow-hidden">
        {/* Ambient background glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#3EF3FF]/10 blur-[140px] rounded-full pointer-events-none" />

        <div className="relative z-10 w-full max-w-2xl bg-[#080E1A]/80 border border-white/10 hover:border-[#3EF3FF]/30 rounded-3xl p-8 sm:p-12 shadow-[0_0_80px_rgba(62,243,255,0.06)] backdrop-blur-2xl transition-all duration-300">
          <div className="text-center mb-8">
            <span className="font-jetbrains text-xs text-[#3EF3FF] tracking-[0.25em] uppercase font-bold mb-2 block">
              SECURE TRANSMISSION
            </span>
            <h1 className="font-space-grotesk text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
              Get in Touch
            </h1>
            <p className="font-sans text-sm sm:text-base text-gray-400 mt-2">
              Have a project, collaboration idea, or inquiry? Send a message directly to founder Hamim.
            </p>
          </div>

          {errorMsg && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 font-jetbrains text-xs flex items-center gap-3">
              <span className="material-symbols-outlined text-[18px]">error</span>
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-jetbrains text-gray-400 uppercase tracking-wider mb-1.5 font-semibold">
                Your Name *
              </label>
              <input
                type="text"
                required
                placeholder="Abdul Hamim"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[#02040A] text-white border border-white/10 focus:outline-none focus:border-[#3EF3FF] focus:ring-1 focus:ring-[#3EF3FF] text-sm transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-jetbrains text-gray-400 uppercase tracking-wider mb-1.5 font-semibold">
                Email Address *
              </label>
              <input
                type="email"
                required
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[#02040A] text-white border border-white/10 focus:outline-none focus:border-[#3EF3FF] focus:ring-1 focus:ring-[#3EF3FF] text-sm transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-jetbrains text-gray-400 uppercase tracking-wider mb-1.5 font-semibold">
                Subject / Topic
              </label>
              <input
                type="text"
                placeholder="Custom Software / Partnership / Job Inquiry"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[#02040A] text-white border border-white/10 focus:outline-none focus:border-[#3EF3FF] focus:ring-1 focus:ring-[#3EF3FF] text-sm transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-jetbrains text-gray-400 uppercase tracking-wider mb-1.5 font-semibold">
                Message *
              </label>
              <textarea
                required
                rows={5}
                placeholder="Tell me about your project, timeline, or requirements..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[#02040A] text-white border border-white/10 focus:outline-none focus:border-[#3EF3FF] focus:ring-1 focus:ring-[#3EF3FF] text-sm transition-colors resize-none"
              ></textarea>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#3EF3FF] hover:bg-[#78F5FF] text-black font-jetbrains font-bold uppercase tracking-wider py-3.5 px-6 rounded-xl transition-all shadow-[0_0_25px_rgba(62,243,255,0.4)] disabled:opacity-50 cursor-pointer"
            >
              {loading ? "Transmitting Message…" : "Send Message"}
            </button>
          </form>

          <div className="text-center mt-8 pt-6 border-t border-white/10 text-gray-400 text-xs font-jetbrains space-y-1">
            <p>
              Direct contact channels:{" "}
              <a
                href="mailto:hamim.leon@gmail.com"
                className="text-[#3EF3FF] hover:underline font-semibold"
              >
                hamim.leon@gmail.com
              </a>{" "}
              ·{" "}
              <a
                href="https://wa.me/8801724879284"
                className="text-[#3EF3FF] hover:underline font-semibold"
                target="_blank"
                rel="noopener noreferrer"
              >
                WhatsApp Direct
              </a>
            </p>
          </div>
        </div>
      </main>

      {/* 5-Second Auto-Closing Thankful Popup */}
      <ThankYouModal
        isOpen={thankYouOpen}
        onClose={() => setThankYouOpen(false)}
        senderName={submittedName}
        durationMs={5000}
      />

      <Footer />
    </>
  );
}
