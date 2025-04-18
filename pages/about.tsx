import Head from "next/head";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import React from "react";

export default function About() {
  return (
    <>
      <Head>
        <title>About Me | DevEngine</title>
      </Head>

      <Navbar />

      <main className="pt-24 px-6 md:px-20 pb-20 bg-gradient-to-br from-gray-900 to-black text-white">
        <h1 className="text-3xl md:text-5xl font-bold mb-2 text-center">
          About Me
        </h1>

        {/* 💼 Highlighted Dev Title */}
        <p className="text-center text-xl md:text-2xl font-semibold text-teal-400 mb-10 tracking-wide">
          I am a <span className="text-white">Software Developer</span>{" "}
          <span className="text-gray-400">||</span>{" "}
          <span className="text-white">Mobile Application Developer</span>
        </p>

        {/* 🔥 About Section Layout */}
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-10">
          {/* 👤 Profile Image */}
          <div className="w-72 h-72 md:w-80 md:h-80 relative rounded-full overflow-hidden shadow-2xl border-4 border-teal-500 hover:scale-105 transition duration-300">
            <Image
              src="/hamim.png"
              alt="Hamim Leon"
              layout="fill"
              objectFit="cover"
              priority
            />
          </div>

          {/* 🧠 Bio Content */}
          <div className="text-center md:text-left text-lg md:text-xl text-gray-300 space-y-6">
            <p>
              Hi, I'm <span className="text-teal-400 font-semibold">Hamim</span> — a passionate
              developer from Bangladesh 🇧🇩. I help students, startups, and businesses turn
              their ideas into powerful software solutions.
            </p>
            <p>
              I’ve worked on a wide variety of projects including AI systems, POS apps,
              quiz platforms, and client-based mobile apps. I specialize in building
              high-performance, beautiful, and functional apps using Flutter, Firebase,
              and Next.js.
            </p>
            <p>
              DevEngine is my initiative to bring clean, ready-made, and professional projects to
              students, freelancers, and clients. Whether it’s a semester project or
              a full business system — I’ve got you covered.
            </p>
            <p>
            <p>Let&rsquo;s build something awesome together. 💙</p>
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
