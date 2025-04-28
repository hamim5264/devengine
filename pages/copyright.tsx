import Head from "next/head";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function CopyrightPage() {
  return (
    <>
      <Head>
        <title>Copyright | DevEngine</title>
      </Head>

      <Navbar />

      <main className="pt-28 px-6 md:px-20 pb-20 min-h-screen bg-gradient-to-br from-gray-900 to-black text-white">
        <h1 className="text-4xl font-bold text-teal-400 mb-6 text-center">
          Legal Copyright Notice
        </h1>

        <div className="max-w-3xl mx-auto bg-gray-800 p-6 rounded-xl shadow-xl space-y-6">
          <p className="text-gray-300">
            © <strong>DevEngine</strong> 2025. All content, code, designs, and
            assets featured on this website, including but not limited to
            software projects, visual elements, written descriptions, and the
            DevEngine brand identity, are the intellectual property of MD. ABDUL
            HAMIM.
          </p>

          <p className="text-gray-300">
            Unauthorized reproduction, distribution, modification, or commercial
            use of any part of this site without prior written consent from the
            owner is strictly prohibited and may result in legal action under
            international copyright law.
          </p>

          <p className="text-gray-300">
            For licensing inquiries, custom builds, collaborations, or
            permissions, please contact:
          </p>

          <div className="text-sm text-gray-400 border-l-4 border-teal-500 pl-4">
            <p>
              <strong>Name:</strong> MD. ABDUL HAMIM
            </p>
            <p>
              <strong>Email:</strong> hamim.leon@gmail.com
            </p>
            <p>
              <strong>Phone:</strong> +880 1724-879284
            </p>
          </div>

          <p className="text-sm text-gray-500 pt-4 border-t border-gray-700">
            Last updated: April 2025
          </p>
        </div>
      </main>

      <Footer />
    </>
  );
}
