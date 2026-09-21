import { useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import HelixLoader from "@/components/HelixLoader";

const ADMIN_EMAIL =
  process.env.NEXT_PUBLIC_ADMIN_EMAIL || "hamim.leon@gmail.com";

export default function AdminIndexPage() {
  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user && user.email === ADMIN_EMAIL) {
        router.replace("/admin/dashboard");
      } else {
        router.replace("/login?redirect=/admin/dashboard");
      }
    });

    return () => unsub();
  }, [router]);

  return (
    <>
      <Head>
        <title>DevEngine Admin - Authenticating...</title>
      </Head>
      <div className="min-h-screen bg-[#02040A] text-white flex flex-col items-center justify-center">
        <HelixLoader size={50} color="#3EF3FF" />
        <p className="mt-4 font-jetbrains text-xs text-[#3EF3FF] uppercase tracking-widest">
          Authenticating Secure Link...
        </p>
      </div>
    </>
  );
}
