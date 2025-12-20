import Head from "next/head";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  onSnapshot,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useRouter } from "next/router";

const ADMIN_EMAIL = "hamim.leon@gmail.com";

export default function ManageAppLab() {
  const router = useRouter();
  const [apps, setApps] = useState<any[]>([]);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      if (!u || u.email !== ADMIN_EMAIL) router.replace("/login");
    });
  }, [router]);

  useEffect(() => {
    return onSnapshot(collection(db, "appLab"), (snap) => {
      setApps(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, []);

  return (
    <>
      <Head>
        <title>Manage App Lab</title>
      </Head>
      <Navbar />

      <main className="pt-28 px-6 md:px-20 pb-20 bg-black text-white min-h-screen">
        <h1 className="text-3xl text-teal-400 mb-6">Manage App Lab</h1>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {apps.map((app) => (
            <div key={app.id} className="bg-gray-800 p-6 rounded-xl">
              <h2 className="text-xl font-bold">{app.name}</h2>
              <p className="text-gray-400">v{app.version}</p>

              <div className="flex gap-3 mt-4">
                <button
                  onClick={() =>
                    updateDoc(doc(db, "appLab", app.id), {
                      isPublic: !app.isPublic,
                    })
                  }
                  className="bg-yellow-600 px-4 py-2 rounded"
                >
                  {app.isPublic ? "Unpublish" : "Publish"}
                </button>

                <button
                  onClick={() => deleteDoc(doc(db, "appLab", app.id))}
                  className="bg-red-600 px-4 py-2 rounded"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>

      <Footer />
    </>
  );
}
