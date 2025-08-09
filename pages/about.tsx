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
          <span className="text-teal-400 font-semibold">MD. ABDUL HAMIM</span> —
          a Software Engineer & Mobile App Developer from Bangladesh 🇧🇩,
          passionate about building performance-focused and beautifully designed
          applications.
        </p>

        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-center gap-10">
          {/* 👤 Profile Image with Neon Circle */}
          <div className="relative rounded-full w-72 h-72 md:w-80 md:h-80 bg-black p-1 shadow-lg">
            <div className="absolute inset-0 animate-pulse rounded-full border-4 border-teal-400 blur-md"></div>
            <div className="relative w-full h-full rounded-full overflow-hidden border-4 border-teal-500">
              <Image
                src="/hamim.png"
                alt="Hamim Leon"
                layout="fill"
                objectFit="cover"
                priority
              />
            </div>
          </div>

          {/* 🧠 Bio Content */}
          <div className="text-gray-300 space-y-5 text-center md:text-left text-lg">
            <p>
              I specialize in building{" "}
              <span className="text-white font-medium">
                cross-platform mobile apps
              </span>{" "}
              and web solutions using{" "}
              <span className="text-teal-400 font-medium">
                Flutter, Firebase, and Next.js
              </span>
              . From academic projects to enterprise software, I craft apps that
              deliver real-world impact.
            </p>
            <p>
              Through{" "}
              <span className="text-white font-semibold">DevEngine</span>, I
              offer ready-made and custom-built software projects tailored for
              students, professionals, and startups. My goal is to help you
              launch faster, with smarter code and thoughtful design.
            </p>
            <p>
              Let&apos;s collaborate and turn your ideas into impactful digital
              products.
            </p>
            <p className="text-teal-400 font-medium">
              🔗{" "}
              <a
                href="https://hamim-info.vercel.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-blue-400 transition"
              >
                Visit my portfolio for more details
              </a>
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
