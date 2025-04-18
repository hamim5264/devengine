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

      <main className="pt-24 px-6 md:px-20 pb-20 bg-gradient-to-br from-gray-900 to-black text-white">
        <h1 className="text-3xl md:text-5xl font-bold text-center mb-8">
          Privacy Policy
        </h1>
        <div className="max-w-4xl mx-auto text-gray-300 space-y-4 text-lg">
          <p>
            At DevEngine, we respect your privacy. We do not collect any personal data from users
            unless voluntarily submitted through contact forms.
          </p>
          <p>
            Information shared via contact forms (like name, email, and message) is only used
            for communication purposes and never shared with third parties.
          </p>
          <p>
            By using this website, you agree to the terms of this privacy policy.
          </p>
        </div>
      </main>

      <Footer />
    </>
  );
}
