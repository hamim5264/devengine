import Head from "next/head";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function About() {
  return (
    <>
      <Head>
        <title>About Me | DevEngine</title>
      </Head>

      <Navbar />

      <main className="pt-24 px-6 md:px-20 pb-20 bg-gradient-to-br from-gray-900 to-black text-white">
        <h1 className="text-3xl md:text-5xl font-bold mb-6 text-center text-teal-400">
          Meet the Developer
        </h1>

        <p className="text-center text-lg md:text-xl text-gray-300 mb-10 max-w-2xl mx-auto">
          I&apos;m{" "}
          <span className="text-teal-400 font-semibold">ABDUL HAMIM LEON</span>{" "}
          — a{" "}
          <span className="text-white font-medium">
            Junior Software Developer
          </span>{" "}
          and <span className="text-white font-medium">Flutter Developer</span>{" "}
          from Bangladesh 🇧🇩, focused on building scalable, real-world software
          solutions.
        </p>

        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-center gap-10">
          {/* 👤 Profile Image with Neon Circle */}
          <div className="relative rounded-full w-72 h-72 md:w-80 md:h-80 bg-black p-1 shadow-lg">
            <div className="absolute inset-0 animate-pulse rounded-full border-4 border-teal-400 blur-md"></div>
            <div className="relative w-full h-full rounded-full overflow-hidden border-4 border-teal-500">
              <Image
                src="/dev_hamim.jpg"
                alt="Abdul Hamim Leon"
                layout="fill"
                objectFit="cover"
                priority
              />
            </div>
          </div>

          {/* 🧠 Bio Content */}
          <div className="text-gray-300 space-y-5 text-center md:text-left text-lg">
            <p>
              I work primarily as a{" "}
              <span className="text-white font-medium">
                software developer with a strong focus on mobile applications
              </span>
              , specializing in{" "}
              <span className="text-teal-400 font-medium">
                Flutter, Dart, and Firebase
              </span>
              . I build secure, performance-focused applications with clean
              architecture and maintainable codebases.
            </p>

            <p>
              Alongside mobile development, I also have experience with{" "}
              <span className="text-white font-medium">
                modern web technologies
              </span>{" "}
              such as{" "}
              <span className="text-teal-400 font-medium">
                Next.js, REST APIs, Socket.IO, and backend integrations
              </span>
              , allowing me to collaborate effectively on full-stack systems and
              real-time features.
            </p>

            <p>
              Currently, I&apos;m working as a{" "}
              <span className="text-white font-semibold">
                Jr. Software Developer / Jr. Flutter Developer
              </span>{" "}
              at{" "}
              <span className="text-teal-400 font-semibold">BeUp In Tech</span>,
              a concern of{" "}
              <span className="text-white font-medium">Betopia Group</span>,
              where I contribute to production-level applications and
              continuously sharpen my engineering skills.
            </p>

            <p>
              Through{" "}
              <span className="text-white font-semibold">DevEngine</span>, I
              develop and showcase software projects for students, startups, and
              early-stage products — focusing on practical solutions, thoughtful
              UX, and scalable architecture.
            </p>

            <p className="text-teal-400 font-medium">
              🔗{" "}
              <a
                href="https://hamim-info.vercel.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-blue-400 transition"
              >
                Visit my portfolio for detailed projects & experience
              </a>
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
