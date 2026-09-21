import Head from "next/head";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/router";
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { FiEye, FiEyeOff, FiMail, FiLock, FiArrowLeft, FiCheck, FiAlertCircle } from "react-icons/fi";

const ADMIN_EMAIL =
  process.env.NEXT_PUBLIC_ADMIN_EMAIL || "hamim.leon@gmail.com";

export default function LoginPage() {
  const router = useRouter();
  const redirectUrl = (router.query.redirect as string) || "";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Forgot password state
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
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      const user = cred.user;
      await user.reload();

      const isAdmin =
        (user.email || "").toLowerCase() === ADMIN_EMAIL.toLowerCase();

      if (isAdmin) {
        localStorage.setItem("isAdmin", "1");
        if (redirectUrl && redirectUrl.startsWith("/admin")) {
          router.push(redirectUrl);
        } else {
          router.push("/admin/dashboard");
        }
      } else {
        localStorage.removeItem("isAdmin");
        await auth.signOut();
        setError("Access restricted. Only authorized DevEngine administrators can log in.");
      }
    } catch (err: any) {
      if (
        err.code === "auth/user-not-found" ||
        err.code === "auth/invalid-credential"
      ) {
        setError("Invalid email or password. Please verify and try again.");
      } else if (err.code === "auth/wrong-password") {
        setError("Incorrect password. Please verify your credentials.");
      } else if (err.code === "auth/too-many-requests") {
        setError("Too many unsuccessful attempts. Access temporarily restricted. Try again later or reset password.");
      } else {
        setError(
          "Authentication failed. Please check your credentials or network."
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
      await sendPasswordResetEmail(auth, targetEmail, {
        url: `${window.location.origin}/reset-password`,
        handleCodeInApp: true,
      });
      setFpSent(true);
    } catch (err: any) {
      if (err?.code === "auth/invalid-email") {
        setFpError("Invalid email address format.");
      } else {
        // Generic success to prevent user enumeration
        setFpSent(true);
      }
    } finally {
      setFpLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Sign In — DevEngine Console</title>
        <meta
          name="description"
          content="Access the DevEngine administrative suite and developer console."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      <div className="min-h-screen bg-[#02040A] text-[#dde2f3] font-sans relative flex flex-col justify-between overflow-x-hidden selection:bg-[#38f2ff] selection:text-[#02040A]">
        {/* Futuristic Ambient Lighting & Grid */}
        <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_50%_15%,rgba(14,24,42,0.95)_0%,rgba(2,4,10,1)_100%)] z-0 pointer-events-none" />
        <div className="fixed inset-0 bg-[linear-gradient(to_right,rgba(132,148,149,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(132,148,149,0.03)_1px,transparent_1px)] bg-[size:36px_36px] z-0 pointer-events-none" />
        <div className="fixed -top-48 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-[#38f2ff]/[0.07] rounded-full blur-[160px] pointer-events-none z-0" />
        <div className="fixed bottom-0 right-1/4 w-[500px] h-[400px] bg-[#5448dc]/[0.05] rounded-full blur-[150px] pointer-events-none z-0" />

        {/* Minimal Floating Top Bar (No Header) */}
        <header className="relative z-20 w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
          <Link
            href="/home"
            className="group inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-mono text-gray-400 hover:text-white transition-all duration-200"
          >
            <FiArrowLeft className="text-sm group-hover:-translate-x-0.5 transition-transform" />
            <span>Return to DevEngine</span>
          </Link>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-mono text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Gateway Online</span>
          </div>
        </header>

        {/* Main Central Login Box */}
        <main className="relative z-10 w-full max-w-[430px] mx-auto px-4 py-8 flex-1 flex flex-col justify-center">
          <div className="relative bg-[#08111f]/90 border border-white/10 rounded-3xl p-8 sm:p-9 backdrop-blur-2xl shadow-[0_0_60px_rgba(0,0,0,0.85)] overflow-hidden">
            {/* Ambient Card Glow Header Accent */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#38f2ff]/80 to-transparent" />
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-24 bg-[#38f2ff]/20 blur-3xl pointer-events-none" />

            {/* Brand Logo & Protocol Header - Centered Harmony */}
            <div className="flex flex-col items-center text-center mb-8">
              <Link href="/home" className="inline-flex items-center justify-center mb-3.5 group transition-transform hover:scale-105">
                <Image
                  src="/assets/DevEngine-logo-on-dark2.png"
                  alt="DevEngine"
                  width={180}
                  height={44}
                  priority
                  className="h-9 w-auto object-contain"
                />
              </Link>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#38f2ff]/10 border border-[#38f2ff]/25 mb-3.5 shadow-[0_0_12px_rgba(56,242,255,0.08)]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#38f2ff] animate-pulse" />
                <span className="font-mono text-[10px] text-[#38f2ff] uppercase tracking-widest font-bold">
                  Authentication Gateway
                </span>
              </div>

              <h1 className="font-space font-bold text-2xl sm:text-3xl text-white tracking-tight">
                {forgotOpen ? "Password Recovery" : "Welcome Back"}
              </h1>
              <p className="font-sans text-xs sm:text-sm text-gray-400 mt-1.5 max-w-[280px] leading-relaxed">
                {forgotOpen
                  ? "Enter your verified email to receive cryptographic reset instructions."
                  : "Sign in with your authorized email to access the console."}
              </p>
            </div>

            {/* Error Notification */}
            {error && !forgotOpen && (
              <div className="mb-6 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-mono flex items-start gap-2.5 animate-fadeIn">
                <FiAlertCircle className="text-base shrink-0 mt-0.5 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            {/* Standard Sign In Form */}
            {!forgotOpen ? (
              <form onSubmit={handleLogin} className="space-y-5">
                {/* Email Field */}
                <div>
                  <label className="block text-xs font-mono text-gray-300 mb-2 font-semibold">
                    Email Address
                  </label>
                  <div className="relative flex items-center bg-[#050b14] border border-white/10 hover:border-white/20 focus-within:border-[#38f2ff] focus-within:ring-2 focus-within:ring-[#38f2ff]/20 rounded-xl transition duration-200 overflow-hidden shadow-inner h-12">
                    <div className="pl-3.5 pr-2.5 text-gray-400 flex items-center justify-center pointer-events-none">
                      <FiMail className="text-base" />
                    </div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@devengine.com"
                      className="w-full bg-transparent pr-4 text-sm text-white placeholder-gray-500 focus:outline-none font-sans"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-mono text-gray-300 font-semibold">
                      Security Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setForgotOpen(true);
                        setError("");
                      }}
                      className="text-[11px] font-mono text-[#38f2ff] hover:text-[#78f5ff] hover:underline transition"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative flex items-center bg-[#050b14] border border-white/10 hover:border-white/20 focus-within:border-[#38f2ff] focus-within:ring-2 focus-within:ring-[#38f2ff]/20 rounded-xl transition duration-200 overflow-hidden shadow-inner h-12">
                    <div className="pl-3.5 pr-2.5 text-gray-400 flex items-center justify-center pointer-events-none">
                      <FiLock className="text-base" />
                    </div>
                    <input
                      type={showPass ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full bg-transparent pr-11 text-sm text-white placeholder-gray-500 focus:outline-none font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 text-gray-400 hover:text-white transition p-1.5 flex items-center justify-center"
                      aria-label={showPass ? "Hide password" : "Show password"}
                    >
                      {showPass ? <FiEyeOff className="text-base" /> : <FiEye className="text-base" />}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 relative group overflow-hidden bg-gradient-to-r from-[#38f2ff] via-[#22d3ee] to-[#00dbe8] text-[#030712] font-space font-bold text-sm tracking-wide h-12 px-4 rounded-xl shadow-[0_0_25px_rgba(56,242,255,0.35)] hover:shadow-[0_0_40px_rgba(56,242,255,0.65)] hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 cursor-pointer border-t border-white/40"
                >
                  <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-[#030712] border-t-transparent rounded-full animate-spin" />
                      <span>Authenticating…</span>
                    </>
                  ) : (
                    <span>Sign In to Console</span>
                  )}
                </button>
              </form>
            ) : (
              /* Password Reset Sub-view */
              <form onSubmit={handleForgot} className="space-y-5 animate-fadeIn">
                {fpError && (
                  <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-mono flex items-start gap-2">
                    <FiAlertCircle className="text-base shrink-0 mt-0.5 text-red-400" />
                    <span>{fpError}</span>
                  </div>
                )}

                {fpSent ? (
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono space-y-2">
                    <div className="flex items-center gap-2 font-bold text-sm text-emerald-400">
                      <FiCheck className="text-base" />
                      <span>Reset Instructions Dispatched</span>
                    </div>
                    <p className="text-gray-300 font-sans leading-relaxed">
                      If an account exists under <strong>{fpEmail}</strong>, a password reset link has been dispatched. Please check your inbox and spam filters.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setForgotOpen(false);
                        setFpSent(false);
                        setFpEmail("");
                      }}
                      className="mt-3 w-full h-11 rounded-xl bg-white/5 hover:bg-white/10 text-white font-mono text-xs transition"
                    >
                      Return to Sign In
                    </button>
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-xs font-mono text-gray-300 mb-2 font-semibold">
                        Registered Email Address
                      </label>
                      <div className="relative flex items-center bg-[#050b14] border border-white/10 hover:border-white/20 focus-within:border-[#38f2ff] focus-within:ring-2 focus-within:ring-[#38f2ff]/20 rounded-xl transition duration-200 overflow-hidden shadow-inner h-12">
                        <div className="pl-3.5 pr-2.5 text-gray-400 flex items-center justify-center pointer-events-none">
                          <FiMail className="text-base" />
                        </div>
                        <input
                          type="email"
                          required
                          value={fpEmail}
                          onChange={(e) => setFpEmail(e.target.value)}
                          placeholder="admin@devengine.com"
                          className="w-full bg-transparent pr-4 text-sm text-white placeholder-gray-500 focus:outline-none font-sans"
                        />
                      </div>
                    </div>

                    <div className="flex gap-3 pt-1">
                      <button
                        type="submit"
                        disabled={fpLoading}
                        className="flex-1 h-12 px-4 rounded-xl bg-[#38f2ff] hover:bg-[#78f5ff] text-[#030712] font-space font-bold text-xs uppercase tracking-wider transition shadow-[0_0_20px_rgba(56,242,255,0.4)] disabled:opacity-50"
                      >
                        {fpLoading ? "Dispatching…" : "Send Reset Link"}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setForgotOpen(false);
                          setFpError("");
                        }}
                        className="h-12 px-5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-gray-300 hover:text-white transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                )}
              </form>
            )}
          </div>
        </main>

        {/* Minimal Security Footer Note (No Full Footer) */}
        <footer className="relative z-20 w-full py-6 text-center">
          <div className="flex items-center justify-center gap-2 text-[11px] font-mono text-gray-500">
            <span className="material-symbols-outlined text-xs text-gray-500">lock</span>
            <span>256-Bit SSL Encrypted • DevEngine Core Protocol</span>
          </div>
        </footer>
      </div>
    </>
  );
}
