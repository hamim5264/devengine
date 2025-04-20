import Head from "next/head";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function ProjectsPage() {
  return (
    <>
      <Head>
        <title>Projects | DevEngine</title>
      </Head>

      <Navbar />

      <main className="pt-24 px-6 md:px-20 pb-20 bg-gradient-to-br from-gray-900 to-black text-white min-h-screen flex flex-col items-center justify-center text-center">
        <h1 className="text-4xl md:text-5xl font-extrabold text-teal-400 mb-6">
          🚀 Projects Coming Soon!
        </h1>
        <p className="text-lg md:text-xl text-gray-300 mb-4 max-w-2xl">
          We're preparing something amazing! Soon, you’ll be able to explore, preview, and purchase software projects tailored for students, startups, and businesses.
        </p>
        <p className="text-sm text-gray-500 max-w-lg">
          Our team is working hard to make DevEngine your go-to hub for fully functional project solutions, complete with payment systems and download access.
        </p>

        <div className="mt-10">
          <p className="text-gray-400">📬 For early access or inquiries, feel free to <a href="/contact" className="text-teal-400 underline">contact us</a>.</p>
        </div>
      </main>

      <Footer />
    </>
  );
}
