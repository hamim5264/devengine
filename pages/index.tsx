import { useEffect } from "react";
import { useRouter } from "next/router";
import { motion } from "framer-motion";
import Head from "next/head";

export default function Intro() {
  const router = useRouter();

  useEffect(() => {
    const timeout = setTimeout(() => {
      router.push("/home"); // ✅ Redirects to /home
    }, 4000);

    return () => clearTimeout(timeout);
  }, [router]); // ✅ Fix: Added router to dependencies

  return (
    <>
      <Head>
        <title>DevEngine - Loading</title>
      </Head>
      <main className="flex items-center justify-center min-h-screen bg-black text-white">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.4, ease: "easeInOut" }}
          className="text-center"
        >
          <motion.h1
            className="text-5xl md:text-7xl font-extrabold tracking-wide"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 1 }}
          >
            Dev<span className="text-teal-400">Engine</span>
          </motion.h1>

          <motion.p
            className="text-lg md:text-2xl text-gray-400 mt-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2, duration: 1 }}
          >
            Empowering Students. Impressing Clients.
          </motion.p>
        </motion.div>
      </main>
    </>
  );
}
