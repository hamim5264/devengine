import React, { useState } from "react";
import { ContactConfig } from "@/types/landing";
import { sendContactEmail } from "@/lib/services/emailService";
import ThankYouModal from "@/components/ThankYouModal";

interface ContactSectionProps {
  config: ContactConfig;
}

export default function ContactSection({ config }: ContactSectionProps) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
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
        name: form.name,
        email: form.email,
        title: form.subject || `DevEngine Landing Inquiry from ${form.name}`,
        message: form.message,
      });

      setSubmittedName(form.name);
      setThankYouOpen(true);
      setForm({ name: "", email: "", subject: "", message: "" });
    } catch (err: any) {
      console.error("Failed to transmit contact form:", err);
      setErrorMsg(
        err?.text || "Failed to transmit message. Please try again or reach out to hamim.leon@gmail.com directly."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <section
        id="contact"
        className="min-h-screen flex items-center justify-center py-28 px-6 sm:px-12 md:px-20 relative z-10 bg-[#02040A]"
      >
        <div className="relative z-20 w-full max-w-3xl rounded-[2.5rem] p-8 sm:p-14 md:p-16 bg-[#0A0F1D]/80 border border-white/10 hover:border-[#3EF3FF]/30 backdrop-blur-2xl shadow-[0_0_100px_rgba(62,243,255,0.08)] transition-all duration-500">
          <div className="text-center mb-12">
            <div className="font-jetbrains text-xs sm:text-sm text-[#3EF3FF] tracking-[0.25em] uppercase font-bold mb-3">
              {config.tag}
            </div>
            <h2 className="font-space-grotesk text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-4 tracking-tight">
              {config.title}
            </h2>
            <p className="font-sans text-base sm:text-lg text-[#bac9cb] font-normal">
              {config.subtitle}
            </p>
          </div>

          {errorMsg && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 font-jetbrains text-xs flex items-center gap-3">
              <span className="material-symbols-outlined text-[18px]">error</span>
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="name"
                className="font-jetbrains text-xs text-[#3EF3FF] uppercase tracking-wider block mb-2 font-semibold"
              >
                Name / Call Sign *
              </label>
              <input
                id="name"
                type="text"
                required
                placeholder="Enter your name or organization"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full bg-[#02040A]/70 border border-white/10 rounded-xl px-5 py-3.5 text-white font-sans text-sm focus:outline-none focus:border-[#3EF3FF] focus:ring-1 focus:ring-[#3EF3FF] transition-colors backdrop-blur-sm"
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="font-jetbrains text-xs text-[#3EF3FF] uppercase tracking-wider block mb-2 font-semibold"
              >
                Comm Link (Email) *
              </label>
              <input
                id="email"
                type="email"
                required
                placeholder="hello@company.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full bg-[#02040A]/70 border border-white/10 rounded-xl px-5 py-3.5 text-white font-sans text-sm focus:outline-none focus:border-[#3EF3FF] focus:ring-1 focus:ring-[#3EF3FF] transition-colors backdrop-blur-sm"
              />
            </div>

            <div>
              <label
                htmlFor="subject"
                className="font-jetbrains text-xs text-[#3EF3FF] uppercase tracking-wider block mb-2 font-semibold"
              >
                Inquiry Topic / Subject
              </label>
              <input
                id="subject"
                type="text"
                placeholder="e.g. Full-Stack Web App, Mobile Platform, AI Integration"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                className="w-full bg-[#02040A]/70 border border-white/10 rounded-xl px-5 py-3.5 text-white font-sans text-sm focus:outline-none focus:border-[#3EF3FF] focus:ring-1 focus:ring-[#3EF3FF] transition-colors backdrop-blur-sm"
              />
            </div>

            <div>
              <label
                htmlFor="message"
                className="font-jetbrains text-xs text-[#3EF3FF] uppercase tracking-wider block mb-2 font-semibold"
              >
                Mission Parameters (Message) *
              </label>
              <textarea
                id="message"
                required
                rows={4}
                placeholder="Describe your project requirements and objectives..."
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                className="w-full bg-[#02040A]/70 border border-white/10 rounded-xl px-5 py-3.5 text-white font-sans text-sm focus:outline-none focus:border-[#3EF3FF] focus:ring-1 focus:ring-[#3EF3FF] transition-colors backdrop-blur-sm resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full font-jetbrains text-xs sm:text-sm font-bold py-4 rounded-xl uppercase tracking-[0.2em] bg-[#3EF3FF] text-[#02040A] shadow-[0_0_25px_rgba(62,243,255,0.4)] hover:shadow-[0_0_40px_rgba(62,243,255,0.8)] hover:scale-[1.01] active:scale-[0.99] transition-all duration-300 disabled:opacity-50 cursor-pointer"
            >
              {loading ? "Transmitting to DevEngine..." : "Transmit Request"}
            </button>
          </form>
        </div>
      </section>

      {/* 5-Second Auto-Closing Thankful Popup */}
      <ThankYouModal
        isOpen={thankYouOpen}
        onClose={() => setThankYouOpen(false)}
        senderName={submittedName}
        durationMs={5000}
      />
    </>
  );
}
