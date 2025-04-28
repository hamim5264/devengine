import Head from "next/head";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, query, where } from "firebase/firestore";

// Define Purchase Type
interface Purchase {
  id: string;
  projectName: string;
  paymentType: string;
  paymentDate: string;
  discount: string;
  totalAmount: string;
  transactionId: string;
}

export default function PurchaseHistoryPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const q = query(
          collection(db, "purchases"),
          where("userId", "==", currentUser.uid)
        );
        const querySnapshot = await getDocs(q);

        const data = querySnapshot.docs.map((doc) => {
          const docData = doc.data() as Omit<Purchase, "id">;
          return {
            id: doc.id,
            ...docData,
          };
        });

        setPurchases(data);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <>
      <Head>
        <title>Purchase History | DevEngine</title>
      </Head>
      <Navbar />
      <main className="pt-28 px-6 md:px-20 pb-20 bg-gradient-to-br from-gray-900 to-black text-white min-h-screen">
        <h1 className="text-3xl font-bold text-teal-400 mb-8 text-center">
          Your Purchase History
        </h1>

        {loading ? (
          <p className="text-center text-gray-400">Loading...</p>
        ) : purchases.length === 0 ? (
          <p className="text-center text-gray-400">
            You haven&apos;t purchased anything yet.
          </p>
        ) : (
          <div className="grid gap-6 max-w-3xl mx-auto">
            {purchases.map((item) => (
              <div
                key={item.id}
                className="bg-gray-800 p-6 rounded-xl shadow-lg border border-teal-500 hover:shadow-teal-400/30 transition"
              >
                <h2 className="text-xl font-bold text-teal-400 mb-2">
                  {item.projectName}
                </h2>

                <div className="text-gray-300 text-sm space-y-1">
                  <p>
                    <span className="font-semibold text-white">
                      Transaction ID:
                    </span>{" "}
                    {item.transactionId}
                  </p>
                  <p>
                    <span className="font-semibold text-white">
                      Payment Type:
                    </span>{" "}
                    {item.paymentType}
                  </p>
                  <p>
                    <span className="font-semibold text-white">
                      Payment Date:
                    </span>{" "}
                    {item.paymentDate}
                  </p>
                  <p>
                    <span className="font-semibold text-white">Discount:</span>{" "}
                    {item.discount}
                  </p>
                  <p>
                    <span className="font-semibold text-white">
                      Total Amount:
                    </span>{" "}
                    {item.totalAmount}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
