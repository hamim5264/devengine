import Head from "next/head";
import { useState } from "react";
import { useRouter } from "next/router";
import {
  signInWithEmailAndPassword,
  fetchSignInMethodsForEmail,
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { FiEye, FiEyeOff } from "react-icons/fi";

const ADMIN_EMAIL = "hamim.leon@gmail.com";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // forgot password UI
  const [forgotOpen, setForgotOpen] = useState(false);
  const [fpEmail, setFpEmail] = useState("");
  const [fpLoading, setFpLoading] = useState(false);
  const [fpError, setFpError] = useState("");
  const [fpSent, setFpSent] = useState(false);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const user = cred.user;
      await user.reload();

      const isAdmin =
        (user.email || "").toLowerCase() === ADMIN_EMAIL.toLowerCase();

      if (isAdmin) {
        localStorage.setItem("isAdmin", "1");
        router.push("/admin/dashboard");
      } else {
        localStorage.removeItem("isAdmin");
        router.push("/dashboard");
      }
    } catch (err: any) {
      if (
        err.code === "auth/user-not-found" ||
        err.code === "auth/invalid-credential"
      ) {
        setError("User not found. Please sign up first before logging in.");
      } else if (err.code === "auth/wrong-password") {
        setError("Incorrect password. Please try again.");
      } else {
        setError(
          "Login failed. Please check your credentials or try again later."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setFpError("");
    setFpSent(false);

    const targetEmail = fpEmail.trim().toLowerCase();
    if (!targetEmail) {
      setFpError("Please enter your registered email.");
      return;
    }

    setFpLoading(true);
    try {
      // Optional: keep your project sanity log
      console.log("Using project:", (auth.app.options as any).projectId);

      await sendPasswordResetEmail(auth, targetEmail, {
        url: `${window.location.origin}/reset-password`,
        handleCodeInApp: true,
      });

      // Show generic success regardless (prevents user enumeration)
      setFpSent(true);
    } catch (err: any) {
      // Still handle obvious bad input
      if (err?.code === "auth/invalid-email") {
        setFpError("Invalid email address.");
      } else {
        // Generic message; don't reveal whether the email exists
        setFpSent(true);
      }
    } finally {
      setFpLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Login | DevEngine</title>
      </Head>
      <Navbar />
      <main className="pt-32 px-6 md:px-20 pb-20 bg-gradient-to-br from-gray-900 to-black text-white min-h-screen">
        <h1 className="text-3xl font-bold text-teal-400 mb-8 text-center">
          Welcome Back
        </h1>

        <form
          onSubmit={handleLogin}
          className="max-w-xl mx-auto bg-gray-800 p-8 rounded-xl shadow-xl space-y-6"
        >
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full px-4 py-2 rounded bg-gray-700 text-white border border-gray-600 focus:outline-none focus:border-teal-400"
            required
          />

          <div className="relative">
            <input
              type={showPass ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full px-4 py-2 pr-10 rounded bg-gray-700 text-white border border-gray-600 focus:outline-none focus:border-teal-400"
              required
            />
            <button
              type="button"
              onClick={() => setShowPass((s) => !s)}
              className="absolute inset-y-0 right-3 flex items-center text-gray-300 hover:text-white"
              aria-label={showPass ? "Hide password" : "Show password"}
            >
              {showPass ? <FiEyeOff /> : <FiEye />}
            </button>
          </div>

          {error && (
            <p className="text-red-400 text-sm text-center font-medium">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-teal-500 hover:bg-teal-600 text-white font-semibold py-2 px-4 rounded transition disabled:opacity-50"
          >
            {loading ? "Logging in..." : "Login"}
          </button>

          {/* Forgot password link */}
          <div className="text-center">
            <button
              type="button"
              onClick={() => setForgotOpen((o) => !o)}
              className="text-sm text-white hover:text-teal-400 underline transition-colors"
            >
              Forgot password?
            </button>
          </div>
        </form>

        {/* Forgot Password Card */}
        {forgotOpen && (
          <form
            onSubmit={handleForgot}
            className="max-w-xl mx-auto mt-6 bg-gray-800 p-6 rounded-xl shadow-xl space-y-4"
          >
            <h2 className="text-xl font-semibold text-teal-400 text-center">
              Reset Your Password
            </h2>

            <input
              type="email"
              value={fpEmail}
              onChange={(e) => setFpEmail(e.target.value)}
              placeholder="Enter your registered email"
              className="w-full px-4 py-2 rounded bg-gray-700 text-white border border-gray-600 focus:outline-none focus:border-teal-400"
              required
            />

            {fpError && (
              <p className="text-red-400 text-sm text-center font-medium">
                {fpError}
              </p>
            )}
            {fpSent && (
              <p className="text-green-400 text-sm text-center font-medium">
                A reset link has been sent to your email. Please check your
                inbox (and spam).
              </p>
            )}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={fpLoading}
                className="w-full bg-white text-black font-semibold py-2 px-4 rounded transition disabled:opacity-50"
              >
                {fpLoading ? "Sending..." : "Send Reset Link"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setForgotOpen(false);
                  setFpEmail("");
                  setFpError("");
                  setFpSent(false);
                }}
                className="w-full bg-gray-600 hover:bg-gray-500 text-white font-semibold py-2 px-4 rounded transition"
              >
                Cancel
              </button>
            </div>

            <p className="text-xs text-gray-400 text-center">
              You’ll be redirected to a page in this site to set a new password.
            </p>
          </form>
        )}
      </main>
      <Footer />
    </>
  );
}
