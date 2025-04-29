import { useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth"; // ✅ Import User type
import axios from "axios";
import projectData from "@/data/projectData";

export default function CheckoutPage() {
  const router = useRouter();
  const { slug } = router.query;

  useEffect(() => {
    if (!slug) return;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push("/login");
        return;
      }

      const project = projectData[slug as keyof typeof projectData];
      if (!project) {
        alert("Invalid project selected.");
        router.push("/projects");
        return;
      }

      const discountPriceRaw = project.discount?.replace(",", "").trim();
      const price = parseInt(discountPriceRaw || "0", 10);

      if (isNaN(price) || price <= 0) {
        alert("Invalid project price. Please contact support.");
        router.push("/projects");
        return;
      }

      // 🛒 Log Payment Details
      console.log("🛒 Payment Request Body:", {
        name: currentUser.displayName || "Anonymous User",
        email: currentUser.email,
        amount: price,
        projectSlug: slug,
      });

      try {
        const response = await axios.post("/api/initiate-payment", {
          name: currentUser.displayName || "Anonymous User",
          email: currentUser.email,
          amount: price,
          projectSlug: slug,
        });

        if (response.data?.url) {
          window.location.href = response.data.url; // ✅ Safe redirect
        } else {
          alert("Failed to start payment session.");
          router.push("/projects");
        }
      } catch (error: any) {
        console.error("Payment initiation error:", error?.response?.data || error.message);
        alert("Payment error. Please try again.");
        router.push("/projects");
      }
    });

    return () => unsubscribe();
  }, [slug, router]);

  return (
    <>
      <Head>
        <title>Processing Payment | DevEngine</title>
      </Head>
      <main className="flex items-center justify-center h-screen bg-gradient-to-br from-gray-900 to-black text-white">
        <h1 className="text-2xl font-bold animate-pulse">
          Redirecting to Payment Gateway...
        </h1>
      </main>
    </>
  );
}
