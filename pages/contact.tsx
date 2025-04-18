import Head from "next/head";
import Navbar from "@/components/Navbar";
import { useRef } from "react";
import emailjs from "emailjs-com";
import Footer from "@/components/Footer";

export default function Contact() {
  const form = useRef<HTMLFormElement>(null);

  const sendEmail = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    emailjs
      .sendForm(
        "service_4yl6voe",      // ← Replace with your actual Service ID
        "template_hjh29ya",     // ← Replace with your actual Template ID
        form.current!,
        "1EjxPg3_raS1xxgZ9"     // ← Replace with your actual Public Key
      )
      .then(
        () => {
          alert("✅ Message sent successfully!");
        },
        (error) => {
          alert("❌ Failed to send message.");
          console.error(error.text);
        }
      );

    (form.current as HTMLFormElement).reset(); // ✅ Type-safe reset
  };

  return (
    <>
      <Head>
        <title>Contact | DevEngine</title>
      </Head>

      <Navbar />

      <main className="pt-24 px-6 md:px-20 pb-20 bg-gradient-to-br from-gray-900 to-black text-white">
        <h1 className="text-3xl md:text-5xl font-bold mb-6 text-center">
          Contact Me
        </h1>

        <div className="max-w-2xl mx-auto bg-gray-800 rounded-xl p-6">
          <form ref={form} onSubmit={sendEmail} className="space-y-4">
            <input type="hidden" name="title" value="DevEngine Contact Message" />

            <div>
              <label className="block mb-1 text-sm">Your Name</label>
              <input
                type="text"
                name="name"
                required
                placeholder="Enter your name"
                className="w-full px-4 py-2 rounded bg-gray-700 text-white border border-gray-600 focus:outline-none focus:border-teal-400"
              />
            </div>

            <div>
              <label className="block mb-1 text-sm">Email Address</label>
              <input
                type="email"
                name="email"
                required
                placeholder="you@example.com"
                className="w-full px-4 py-2 rounded bg-gray-700 text-white border border-gray-600 focus:outline-none focus:border-teal-400"
              />
            </div>

            <div>
              <label className="block mb-1 text-sm">Message</label>
              <textarea
                name="message"
                required
                rows={5}
                placeholder="How can I help you?"
                className="w-full px-4 py-2 rounded bg-gray-700 text-white border border-gray-600 focus:outline-none focus:border-teal-400"
              ></textarea>
            </div>

            <button
              type="submit"
              className="w-full bg-teal-500 hover:bg-teal-600 text-white font-semibold py-2 px-4 rounded transition"
            >
              Send Message
            </button>
          </form>

          <p className="text-center mt-6 text-gray-400 text-sm">
            Or message me directly via{" "}
            <a
              href="https://wa.me/8801724879284"
              className="text-teal-400 underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              WhatsApp
            </a>{" "}
            or{" "}
            <a
              href="mailto:hamim.leon@gmail.com"
              className="text-teal-400 underline"
            >
              Email
            </a>
            .
          </p>
        </div>
      </main>

      <Footer />
    </>
  );
}
