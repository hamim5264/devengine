import Head from "next/head";
import { useRouter } from "next/router";
import { doc, getDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import HelixLoader from "@/components/HelixLoader";

export default function AppDetails() {
  const router = useRouter();
  const { slug } = router.query;

  const [app, setApp] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;

    (async () => {
      const snap = await getDoc(doc(db, "appLab", String(slug)));
      if (!snap.exists()) {
        router.replace("/app-lab");
        return;
      }
      setApp(snap.data());
      setLoading(false);
    })();
  }, [slug, router]);

  const handleDownload = () => {
    if (!auth.currentUser) {
      router.push("/login");
      return;
    }
    window.open(app.apkUrl, "_blank");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-black">
        <HelixLoader />
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{app.name} | App Lab</title>
      </Head>

      <Navbar />

      <main className="pt-32 px-6 md:px-20 pb-24 bg-black text-white min-h-screen">
        <div className="max-w-5xl mx-auto space-y-12">
          {/* Header */}
          <div>
            <h1 className="text-4xl font-bold text-teal-400">{app.name}</h1>
            <p className="text-gray-400 text-lg mt-2">{app.subtitle}</p>
            <span className="inline-block mt-4 text-sm bg-gray-800 px-3 py-1 rounded-full border border-gray-700">
              Version {app.version}
            </span>
          </div>

          {/* Description */}
          <section>
            <h2 className="text-2xl text-teal-300 mb-3">Description</h2>
            <p className="text-gray-300 leading-relaxed">{app.description}</p>
          </section>

          {/* Usages */}
          {app.usages?.length > 0 && (
            <section>
              <h2 className="text-2xl text-teal-300 mb-3">Usages</h2>
              <ul className="list-disc list-inside text-gray-300 space-y-1">
                {app.usages.map((u: string, i: number) => (
                  <li key={i}>{u}</li>
                ))}
              </ul>
            </section>
          )}

          {/* Warnings */}
          {app.warnings?.length > 0 && (
            <section>
              <h2 className="text-2xl text-teal-300 mb-3">Warnings / Notes</h2>
              <ul className="list-disc list-inside text-gray-300 space-y-1">
                {app.warnings.map((w: string, i: number) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </section>
          )}

          {/* App Preview */}
          {app.images?.length > 0 && (
            <section className="mt-12">
              <h2 className="text-2xl font-semibold text-teal-400 mb-3">
                App Preview
              </h2>

              <p className="text-gray-400 mb-4">
                View app screenshots and UI previews in a new browser tab.
              </p>

              <a
                href={app.images[0]}
                target="_blank"
                rel="noopener noreferrer"
                className="
                  inline-block bg-teal-500 hover:bg-teal-600
                  text-black font-semibold px-6 py-3 rounded-xl
                  transition shadow-lg
                "
              >
                Open App Preview
              </a>

              <p className="text-xs text-gray-500 mt-2">
                Opens in a new tab (external preview)
              </p>
            </section>
          )}

          {/* Download */}
          <div className="pt-8 relative">
            <button
              onClick={handleDownload}
              className="download-btn relative w-full md:w-auto bg-teal-500 hover:bg-teal-600 text-black font-bold px-10 py-4 rounded-xl text-lg transition shadow-lg overflow-hidden"
            >
              ⬇ Download APK
              <span className="glow-outline pointer-events-none"></span>
            </button>

            <p className="text-xs text-gray-400 mt-2">
              Hosted on Google Drive · One confirmation required
            </p>

            <style jsx>{`
              .download-btn {
                animation: glowPulse 2.5s ease-in-out infinite;
              }

              .glow-outline {
                position: absolute;
                inset: 0;
                border-radius: 0.75rem;
                border: 2px solid rgba(45, 212, 191, 0.9);
                animation: outlineMove 3s linear infinite;
              }

              @keyframes glowPulse {
                0% {
                  box-shadow: 0 0 10px rgba(45, 212, 191, 0.4),
                    0 0 20px rgba(45, 212, 191, 0.2);
                }
                50% {
                  box-shadow: 0 0 22px rgba(45, 212, 191, 0.8),
                    0 0 44px rgba(45, 212, 191, 0.4);
                }
                100% {
                  box-shadow: 0 0 10px rgba(45, 212, 191, 0.4),
                    0 0 20px rgba(45, 212, 191, 0.2);
                }
              }

              @keyframes outlineMove {
                0% {
                  clip-path: inset(0 0 92% 0);
                }
                25% {
                  clip-path: inset(0 92% 0 0);
                }
                50% {
                  clip-path: inset(92% 0 0 0);
                }
                75% {
                  clip-path: inset(0 0 0 92%);
                }
                100% {
                  clip-path: inset(0 0 92% 0);
                }
              }
            `}</style>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
