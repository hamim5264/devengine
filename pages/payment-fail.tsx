import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Head from "next/head";
import Link from "next/link";

export default function PaymentFail() {
  return (
    <>
      <Head>
        <title>Payment Failed | DevEngine</title>
      </Head>

      <Navbar />

      <main className="pt-32 min-h-screen bg-gradient-to-br from-gray-900 to-black text-white flex flex-col items-center justify-center">
        <div className="max-w-xl bg-gray-800 rounded-xl p-8 shadow-lg text-center">
          <h1 className="text-3xl font-bold text-red-500 mb-4">
            Payment Failed! ❌
          </h1>
          <p className="text-gray-300 mb-4">
            Unfortunately, your payment could not be completed.
          </p>
          <p className="text-gray-400 mb-6">
            Please try again or contact our support team if the problem
            persists.
          </p>

          {/* ✅ Proper Next.js Link with <a> tag */}
          <Link href="/projects" passHref legacyBehavior>
            <a className="bg-teal-500 hover:bg-teal-600 text-white font-semibold py-2 px-6 rounded-lg transition inline-block">
              Back to Projects
            </a>
          </Link>
        </div>
      </main>

      <Footer />
    </>
  );
}
