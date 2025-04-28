import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Head from "next/head";
import Link from "next/link";

export default function PaymentCancel() {
  return (
    <>
      <Head>
        <title>Payment Canceled | DevEngine</title>
      </Head>

      <Navbar />

      <main className="pt-32 min-h-screen bg-gradient-to-br from-gray-900 to-black text-white flex flex-col items-center justify-center">
        <div className="max-w-xl bg-gray-800 rounded-xl p-8 shadow-lg text-center">
          <h1 className="text-3xl font-bold text-yellow-400 mb-4">
            Payment Canceled! ⚠️
          </h1>
          <p className="text-gray-300 mb-4">
            You have canceled the payment. No charges were made to your account.
          </p>
          <p className="text-gray-400 mb-6">
            Feel free to explore our other projects or try again later!
          </p>

          {/* ✅ Correct way without <a> */}
          <Link
            href="/projects"
            className="bg-teal-500 hover:bg-teal-600 text-white font-semibold py-2 px-6 rounded-lg transition inline-block"
          >
            Back to Projects
          </Link>
        </div>
      </main>

      <Footer />
    </>
  );
}
