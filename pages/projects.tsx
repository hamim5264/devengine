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

      <main className="pt-24 px-6 md:px-20 pb-20 bg-gradient-to-br from-gray-900 to-black text-white text-center min-h-screen">
        <h1 className="text-4xl md:text-5xl font-bold mb-8 text-teal-400">
          Projects Coming Soon 🚧
        </h1>
        <p className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto">
          We're working on uploading all our exclusive ready-made and custom-built
          projects with integrated payment options. Stay tuned!
        </p>
        <p className="text-sm text-gray-500 mt-6">
          Soon, you’ll be able to browse, preview, and purchase your desired projects directly from this platform.
        </p>
      </main>

      <Footer />
    </>
  );
}
