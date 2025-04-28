import Head from "next/head";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function PrivacyPolicy() {
  return (
    <>
      <Head>
        <title>Privacy Policy | DevEngine</title>
      </Head>

      <Navbar />

      <main className="pt-24 px-6 md:px-20 pb-10 bg-gradient-to-br from-gray-900 to-black text-white min-h-screen">
        <h1 className="text-3xl md:text-5xl font-bold text-center mb-10 text-teal-400">
          Privacy Policy
        </h1>

        <div className="max-w-4xl mx-auto text-gray-300 space-y-6 text-lg leading-relaxed">
          <p>
            At <span className="text-white font-semibold">DevEngine</span>, your
            privacy is of utmost importance to us. This policy outlines how we
            collect, use, and protect your information when you interact with
            our website and services.
          </p>

          <p>
            We only collect personal information such as name, email address,
            and mobile number when you voluntarily submit it through forms for
            signing up, purchasing, or contacting us. This information is
            strictly used to provide services, complete transactions, and
            communicate with you efficiently.
          </p>

          <p>
            DevEngine guarantees that your data will never be sold, rented, or
            shared with any third party without your explicit consent, except
            when required by law.
          </p>

          <p>
            All payments processed through our platform are handled via secure
            and trusted third-party payment gateways. DevEngine does not store
            or process your credit/debit card or sensitive payment details
            directly.
          </p>

          <p>
            By accessing and using this website, you consent to the collection
            and use of information as described in this Privacy Policy. If any
            changes are made, we will update this page accordingly.
          </p>

          <p className="text-sm text-gray-400">Last Updated: April 2025</p>
        </div>
      </main>

      <Footer />
    </>
  );
}
