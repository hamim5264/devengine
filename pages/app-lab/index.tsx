import Head from "next/head";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import HelixLoader from "@/components/HelixLoader";

export default function AppLabPage() {
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "appLab"), where("isPublic", "==", true));

    return onSnapshot(q, (snap) => {
      setApps(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
  }, []);

  return (
    <>
      <Head>
        <title>App Lab | DevEngine</title>
      </Head>

      <Navbar />

      <main className="pt-32 px-6 md:px-20 pb-24 bg-black min-h-screen text-white">
        {/* Header */}
        <h1 className="text-4xl font-bold text-teal-400 mb-4 text-center">
          App Lab
        </h1>

        <p className="text-gray-400 max-w-2xl mx-auto text-center">
          Explore early-access apps, test new ideas, and download experimental
          builds for free.
        </p>

        {/* Glowing divider */}
        <div className="flex justify-center mt-4 mb-12">
          <span className="glow-line"></span>
        </div>

        {/* Local-only styles */}
        <style jsx>{`
          .glow-line {
            width: 120px;
            height: 2px;
            background: rgba(45, 212, 191, 0.9);
            border-radius: 9999px;
            animation: glowPulse 2.5s ease-in-out infinite;
          }

          @keyframes glowPulse {
            0% {
              box-shadow: 0 0 6px rgba(45, 212, 191, 0.4);
              opacity: 0.6;
            }
            50% {
              box-shadow: 0 0 14px rgba(45, 212, 191, 0.9);
              opacity: 1;
            }
            100% {
              box-shadow: 0 0 6px rgba(45, 212, 191, 0.4);
              opacity: 0.6;
            }
          }
        `}</style>

        {loading ? (
          <div className="flex justify-center">
            <HelixLoader />
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {apps.map((app) => (
              <Link
                key={app.id}
                href={`/app-lab/${app.slug}`}
                className="group"
              >
                <div className="relative bg-gray-900 border border-gray-700 rounded-2xl p-6 h-full transition-all duration-300 hover:scale-[1.03] hover:border-teal-400 hover:shadow-[0_0_30px_rgba(20,184,166,0.35)]">
                  {/* Glow overlay */}
                  <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition bg-gradient-to-br from-teal-500/10 to-transparent pointer-events-none" />

                  <h2 className="text-2xl font-bold mb-2 text-teal-300">
                    {app.name}
                  </h2>

                  <p className="text-gray-400 mb-4">{app.subtitle}</p>

                  <span className="inline-block text-sm bg-gray-800 px-3 py-1 rounded-full border border-gray-700">
                    v{app.version}
                  </span>

                  <p className="mt-6 text-teal-400 font-medium">
                    View Details →
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </>
  );
}
