import { useRouter } from "next/router";
import Head from "next/head";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import projectData from "@/data/projectData";

export default function ProjectDetailPage() {
  const router = useRouter();
  const { slug } = router.query;
  const [user, setUser] = useState<any>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const project = projectData[slug as keyof typeof projectData];

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleBuyNow = () => {
    if (!user) {
      router.push("/login");
      return;
    }
    setShowConfirm(true); // Show the custom confirm popup
  };

  const handleConfirmPurchase = () => {
    setShowConfirm(false);
    router.push(`/checkout?slug=${slug}`);
  };

  const handleCancelPurchase = () => {
    setShowConfirm(false);
  };

  if (!project) {
    return (
      <main className="pt-40 text-center text-white min-h-screen bg-gradient-to-br from-gray-900 to-black">
        <h1 className="text-3xl">404 - Project Not Found</h1>
      </main>
    );
  }

  return (
    <>
      <Head>
        <title>{project.title} | DevEngine</title>
      </Head>
      <Navbar />

      <main className="pt-28 px-6 md:px-20 pb-20 bg-gradient-to-br from-gray-900 to-black text-white min-h-screen relative">
        <h1 className="text-4xl font-bold text-teal-400 mb-4">
          {project.title}
        </h1>
        <h2 className="text-xl text-gray-400 mb-8">{project.subtitle}</h2>

        {/* Details */}
        <p className="text-gray-300 mb-6 leading-relaxed whitespace-pre-line">
          {project.details}
        </p>

        {/* Tools Used */}
        <div className="mb-8">
          <h3 className="text-lg text-teal-400 font-semibold mb-2">
            🛠 Tools Used
          </h3>
          <ul className="list-disc list-inside text-gray-300">
            {project.tools.map((tool, index) => (
              <li key={index}>{tool}</li>
            ))}
          </ul>
        </div>

        {/* Installation Manual */}
        <div className="mb-10">
          <h3 className="text-lg text-teal-400 font-semibold mb-2">
            📦 Installation Manual
          </h3>
          <pre className="bg-gray-800 border border-gray-600 rounded-lg p-4 text-sm text-gray-300 whitespace-pre-wrap">
            {project.installation}
          </pre>
        </div>

        {/* Pricing and Buy Now */}
        <div className="border border-teal-600 p-6 rounded-xl bg-gray-800 shadow-lg text-center">
          <p className="text-lg font-semibold text-white">
            Regular Price:{" "}
            <span className="line-through text-gray-400">{project.price}</span>
          </p>
          <p className="text-2xl font-bold text-green-400 mb-4">
            Discount Price: {project.discount}
          </p>

          <button
            onClick={handleBuyNow}
            className="mt-4 bg-teal-500 hover:bg-teal-600 text-white font-semibold px-8 py-2 rounded-lg text-lg shadow-lg transition"
          >
            Buy Now
          </button>
        </div>

        {/* Confirmation Modal */}
        {showConfirm && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-gray-800 border border-teal-600 rounded-xl p-8 w-80 text-center shadow-lg">
              <h2 className="text-xl font-bold text-teal-400 mb-4">
                Confirm Purchase
              </h2>
              <p className="text-gray-300 text-sm mb-6">
                Please read and accept our{" "}
                <span className="text-teal-400 underline">
                  Terms & Conditions
                </span>{" "}
                before proceeding.
              </p>
              <div className="flex justify-center gap-4">
                <button
                  onClick={handleConfirmPurchase}
                  className="px-6 py-2 bg-green-500 hover:bg-green-600 rounded-lg text-white font-semibold"
                >
                  OK
                </button>
                <button
                  onClick={handleCancelPurchase}
                  className="px-6 py-2 bg-red-500 hover:bg-red-600 rounded-lg text-white font-semibold"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </>
  );
}
