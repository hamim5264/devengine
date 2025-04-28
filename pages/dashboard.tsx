import Head from "next/head";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/router";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { FaUserCircle, FaHistory } from "react-icons/fa";
import Link from "next/link";

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push("/login");
        return;
      }
      setUser(currentUser);

      const userRef = doc(db, "users", currentUser.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        setUserData(userSnap.data());
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <>
      <Head>
        <title>Dashboard | DevEngine</title>
      </Head>

      <Navbar />

      <main className="pt-28 px-6 md:px-20 pb-20 bg-gradient-to-br from-gray-900 to-black text-white min-h-screen">
        <h1 className="text-3xl font-bold text-teal-400 mb-10 text-center">
          User Dashboard
        </h1>

        <div className="max-w-xl mx-auto bg-gray-800 rounded-xl p-6 shadow-xl text-center">
          <FaUserCircle className="text-6xl text-teal-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-1">{userData?.fullName}</h2>
          <p className="text-gray-400 text-sm mb-6">{userData?.email}</p>

          <div className="border-t border-gray-600 pt-6">
            <Link href="/purchase-history">
              <button className="w-full flex items-center justify-center gap-2 text-white bg-teal-600 hover:bg-teal-700 px-4 py-2 rounded-lg transition">
                <FaHistory />
                Purchase History
              </button>
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
