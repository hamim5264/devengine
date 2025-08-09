// pages/projects/[slug].tsx
import Head from "next/head";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import HelixLoader from "@/components/HelixLoader";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { db, auth } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

type Project = {
  id: string;
  title: string;
  subtitle: string;
  details: string;
  installation: string;
  tools: string[];
  price: string | number;
  discount?: string | number;
  category?: string;
  isPublic?: boolean;
  tags?: string[];
};

const ADMIN_EMAIL = "hamim.leon@gmail.com";

export default function ProjectDetailPage() {
  const router = useRouter();
  const { slug } = router.query;

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [authReady, setAuthReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState<any>(null);

  const [showMessage, setShowMessage] = useState(false);

  // detect user/admin
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsAdmin(!!u && u.email === ADMIN_EMAIL);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  // fetch project when slug + auth state are ready
  useEffect(() => {
    if (!slug || !authReady) return;

    (async () => {
      setLoading(true);
      setNotFound(false);
      try {
        const ref = doc(db, "projects", String(slug));
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          setNotFound(true);
          setProject(null);
        } else {
          const data = snap.data() as any;
          // private project? only admin can view
          if (data.isPublic !== true && !isAdmin) {
            setNotFound(true);
            setProject(null);
          } else {
            setProject({
              id: snap.id,
              title: data.title || "",
              subtitle: data.subtitle || "",
              details: data.details || "",
              installation: data.installation || "",
              tools: Array.isArray(data.tools) ? data.tools : [],
              price: data.price ?? "",
              discount: data.discount,
              category: data.category || "",
              isPublic: !!data.isPublic,
              tags: Array.isArray(data.tags) ? data.tags : [],
            });
            setNotFound(false);
          }
        }
      } catch (e) {
        console.error("Failed to fetch project:", e);
        setNotFound(true);
        setProject(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [slug, authReady, isAdmin]);

  const handleBuyNow = () => {
    if (!user) {
      router.push("/login");
      return;
    }
    setShowMessage(true);
    setTimeout(() => setShowMessage(false), 4000);
  };

  // payment cards (images live in /public)
  const paymentMethods = [
    {
      name: "bKash",
      img: "/bkash.png",
      number: "01724879284",
      method: "Mobile Payment",
    },
    {
      name: "Nagad",
      img: "/nagad.png",
      number: "01724879284",
      method: "Mobile Payment",
    },
    {
      name: "Rocket",
      img: "/rocket.png",
      number: "01724879284",
      method: "Mobile Payment",
    },
    {
      name: "Dutch-Bangla Bank",
      img: "/dutch-bangla.png",
      number: "7017321870818",
      method: "Bank Payment",
    },
    {
      name: "BRAC Bank",
      img: "/brac.png",
      number: "1061077260001",
      method: "Bank Payment",
    },
  ];

  return (
    <>
      <Head>
        <title>
          {project ? `${project.title} | DevEngine` : "Project | DevEngine"}
        </title>
      </Head>
      <Navbar />

      <main className="pt-28 px-6 md:px-20 pb-20 bg-gradient-to-br from-gray-900 to-black text-white min-h-screen">
        {/* Loader */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-24">
            <HelixLoader size={56} color="#14b8a6" />
            <p className="mt-4 text-gray-400">Loading project…</p>
          </div>
        )}

        {/* 404 after load completes */}
        {!loading && notFound && (
          <div className="pt-12 text-center">
            <h1 className="text-3xl font-semibold">404 – Project Not Found</h1>
            <p className="text-gray-400 mt-2">
              This project is unavailable or private.
            </p>
          </div>
        )}

        {/* Content */}
        {!loading && !notFound && project && (
          <>
            <h1 className="text-4xl font-bold text-teal-400 mb-4">
              {project.title}
            </h1>
            <h2 className="text-xl text-gray-400 mb-8">{project.subtitle}</h2>

            <p className="text-gray-300 mb-6 leading-relaxed whitespace-pre-line">
              {project.details}
            </p>

            {/* Tools */}
            <div className="mb-8">
              <h3 className="text-lg text-teal-400 font-semibold mb-2">
                Tools Used
              </h3>
              <ul className="list-disc list-inside text-gray-300">
                {(project.tools || []).map((tool, index) => (
                  <li key={index}>{tool}</li>
                ))}
              </ul>
            </div>

            {/* Installation */}
            <div className="mb-10">
              <h3 className="text-lg text-teal-400 font-semibold mb-2">
                Installation Manual
              </h3>
              <pre className="bg-gray-800 border border-gray-600 rounded-lg p-4 text-sm text-gray-300 whitespace-pre-wrap">
                {project.installation}
              </pre>
            </div>

            {/* Pricing box */}
            <div className="border border-teal-600 p-6 rounded-xl bg-gray-800 shadow-lg text-center relative">
              <p className="text-lg font-semibold text-white">
                Regular Price:{" "}
                <span className="line-through text-gray-400">
                  {project.price}
                </span>
              </p>
              <p className="text-2xl font-bold text-green-400 mb-4">
                Discount Price: {project.discount ?? project.price}
              </p>

              <button
                onClick={handleBuyNow}
                className="mt-4 bg-teal-500 hover:bg-teal-600 text-white font-semibold px-8 py-2 rounded-lg text-lg shadow-lg transition"
              >
                Buy Now
              </button>

              {showMessage && (
                <div className="absolute top-2 right-2 bg-yellow-500 text-black font-semibold px-4 py-2 rounded-lg animate-pulse shadow-lg">
                  Secure online payment coming soon — DevEngine
                </div>
              )}
            </div>

            {/* Manual Payment Instructions */}
            <h2 className="text-2xl font-bold text-teal-400 mt-12 mb-6 text-center">
              Manual Payment Instructions
            </h2>

            <div className="grid md:grid-cols-3 gap-6">
              {paymentMethods.map((method, index) => (
                <div
                  key={index}
                  className="bg-gray-800 border border-teal-500 p-6 rounded-xl shadow-md hover:shadow-teal-500/50 transition text-center"
                >
                  <img
                    src={method.img}
                    alt={method.name}
                    className="h-20 w-auto mx-auto mb-4 border-4 rounded-lg border-teal-500 shadow-teal-400/40"
                  />
                  <h3 className="text-lg font-bold text-white mb-1">
                    {method.name}
                  </h3>
                  <p className="text-gray-300 text-sm mb-1">
                    Account Holder:{" "}
                    <span className="text-white">MD. ABDUL HAMIM</span>
                  </p>
                  <p className="text-gray-300 text-sm mb-1">
                    Account Number:{" "}
                    <span className="text-white">{method.number}</span>
                  </p>
                  <p className="text-gray-300 text-sm">
                    Payment Method:{" "}
                    <span className="text-white">{method.method}</span>
                  </p>
                </div>
              ))}
            </div>

            <p className="mt-12 text-center text-yellow-400 font-semibold text-sm">
              ⚠️ Before purchasing any project, please contact us and confirm
              your purchase. Also, read all the terms and conditions and fill
              out the agreement form provided by DevEngine.
            </p>
          </>
        )}
      </main>

      <Footer />
    </>
  );
}
