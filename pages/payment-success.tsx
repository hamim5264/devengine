// pages/payment-success.tsx
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
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
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
        const storeId = process.env.NEXT_PUBLIC_STORE_ID;
        const storePasswd = process.env.NEXT_PUBLIC_STORE_PASSWORD;
        const is_live = true; // ✅ enable real payment validation

        const validationUrl = is_live
          ? `https://securepay.sslcommerz.com/validator/api/validationserverAPI.php?val_id=${val_id}&store_id=${storeId}&store_passwd=${storePasswd}&v=1&format=json`
          : `https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php?val_id=${val_id}&store_id=${storeId}&store_passwd=${storePasswd}&v=1&format=json`;

        const response = await axios.get(validationUrl);
        const paymentData = response.data;
        setPaymentInfo(paymentData);
        setLoading(false);

        if (paymentData && user) {
          await addDoc(collection(db, "purchases"), {
            userId: user.uid,
            userEmail: user.email,
            projectName: paymentData.product_name,
            paymentType: paymentData.card_issuer || "N/A",
            paymentDate: new Date().toISOString(),
            discount: paymentData.currency_amount || "N/A",
            totalAmount: paymentData.amount,
            transactionId: paymentData.tran_id,
          });
          console.log("✅ Purchase saved successfully.");
        }
      } catch (error) {
        console.error("Payment validation failed:", error);
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
        <title>Payment Successful | DevEngine</title>
      </Head>
      <Navbar />
      <main className="pt-32 min-h-screen bg-gradient-to-br from-gray-900 to-black text-white">
        <div className="max-w-xl mx-auto text-center p-8 bg-gray-800 rounded-xl shadow-lg">
          <h1 className="text-3xl font-bold text-green-400 mb-4">
            Payment Successful! 🎉
          </h1>
          <p className="mb-4">
            Transaction ID:{" "}
            <span className="text-teal-400">{paymentInfo?.tran_id}</span>
          </p>
          <p>
            Amount Paid:{" "}
            <span className="text-teal-400">{paymentInfo?.amount} BDT</span>
          </p>
          <p className="mt-6 text-gray-300">
            Thank you for trusting DevEngine!
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
