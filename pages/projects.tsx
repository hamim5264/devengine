import Head from "next/head";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";

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

        <p className="text-lg text-gray-300 max-w-xl mb-4">
          Our team is working hard to make DevEngine your go-to hub for
          ready-made and custom-built software solutions, complete with secure
          payment systems and instant downloads.
        </p>

        <p className="text-sm text-gray-500 max-w-lg">
          You’ll soon be able to explore and purchase academic, business, and
          professional-grade projects right here.
        </p>

        <div className="mt-10">
        <p className="text-gray-400">
        📬 For early access or inquiries, feel free to{" "}
        <Link href="/contact" className="text-teal-400 underline">contact us</Link>.
        </p>
        </div>
      </main>

      <Footer />
    </>
  );
}
