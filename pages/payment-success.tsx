import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import axios from "axios";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Head from "next/head";
import { db, auth } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";

interface PaymentInfo {
  tran_id: string;
  amount: string;
  product_name: string;
  card_issuer?: string;
  currency_amount?: string;
}

export default function PaymentSuccess() {
  const router = useRouter();
  const { val_id } = router.query;
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!val_id || !user) return;

    const validatePayment = async () => {
      try {
        // const storeId = process.env.NEXT_PUBLIC_STORE_ID;
        // const storePasswd = process.env.NEXT_PUBLIC_STORE_PASSWORD;
        // const is_live = false; // 🧪 sandbox mode now

        const storeId = process.env.STORE_ID;
        const storePasswd = process.env.STORE_PASSWORD;
        const is_live = true; // 🧪 sandbox mode now

        const validationUrl = is_live
          ? `https://securepay.sslcommerz.com/validator/api/validationserverAPI.php?val_id=${val_id}&store_id=${storeId}&store_passwd=${storePasswd}&v=1&format=json`
          : `https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php?val_id=${val_id}&store_id=${storeId}&store_passwd=${storePasswd}&v=1&format=json`;

        const response = await axios.get(validationUrl);
        const paymentData = response.data;

        if (
          paymentData.status !== "VALID" &&
          paymentData.status !== "VALIDATED"
        ) {
          console.error("❌ Payment not validated:", paymentData);
          router.push("/payment-fail");
          return;
        }

        // Save transaction to purchases/orders ledger
        await addDoc(collection(db, "purchases"), {
          projectName: paymentData.product_name || "DevEngine Software License",
          paymentType: paymentData.card_issuer || "SSLCommerz",
          paymentDate: new Date().toISOString(),
          discount: paymentData.currency_amount || "N/A",
          totalAmount: paymentData.amount,
          transactionId: paymentData.tran_id,
        });

        console.log("✅ Purchase record recorded successfully.");
        router.push(`/home?payment=success&tran_id=${paymentData.tran_id}`);
      } catch (error: any) {
        console.error(
          "Payment validation failed:",
          error?.response?.data || error.message
        );
        router.push("/payment-fail");
      }
    };

    validatePayment();
  }, [val_id, user, router]);

  if (loading) {
    return (
      <main className="text-center pt-48 text-white min-h-screen bg-gradient-to-br from-gray-900 to-black">
        <p>Validating Payment...</p>
      </main>
    );
  }

  return (
    <>
      <Head>
        <title>Processing Payment | DevEngine</title>
      </Head>
      <Navbar />
      <main className="pt-32 min-h-screen bg-gradient-to-br from-gray-900 to-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold animate-pulse">
            Processing your payment...
          </h1>
        </div>
      </main>
      <Footer />
    </>
  );
}
