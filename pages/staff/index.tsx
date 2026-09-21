import Head from "next/head";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getStaffByUid } from "@/lib/services/staffService";
import HelixLoader from "@/components/HelixLoader";

export default function StaffLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // ── Auto-redirect if already logged in as staff ──
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const staff = await getStaffByUid(user.uid);
        if (staff && staff.status === "active") {
          router.replace("/staff/dashboard");
          return;
        }
      }
      setCheckingAuth(false);
    });
    return () => unsub();
  }, [router]);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      const user = cred.user;

      // Check if this user is a valid staff member
      const staff = await getStaffByUid(user.uid);

      if (!staff) {
        await signOut(auth);
        setError("Access denied. This account is not registered as a staff member.");
        setLoading(false);
        return;
      }

      if (staff.status === "suspended") {
        await signOut(auth);
        setError("Your account has been suspended. Please contact your administrator.");
        setLoading(false);
        return;
      }

      // Store staff session info
      localStorage.setItem("isStaff", "1");
      localStorage.setItem("staffUid", user.uid);
      localStorage.removeItem("isAdmin");

      router.push("/staff/dashboard");
    } catch (err: any) {
      if (
        err.code === "auth/user-not-found" ||
        err.code === "auth/invalid-credential"
      ) {
        setError("Invalid email or password. Please verify your credentials.");
      } else if (err.code === "auth/wrong-password") {
        setError("Incorrect password. Please try again.");
      } else if (err.code === "auth/too-many-requests") {
        setError("Too many login attempts. Please wait and try again later.");
      } else {
        setError("Authentication failed. Please check your credentials.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[#07070f] flex items-center justify-center">
        <HelixLoader size={44} color="#38f2ff" />
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Staff Portal | DevEngine</title>
        <meta name="robots" content="noindex, nofollow" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
        />
      </Head>

      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{
          background: "radial-gradient(ellipse at 50% 0%, #0c1a2e 0%, #07070f 60%)",
          fontFamily: "'Poppins', sans-serif",
        }}
      >
        {/* Ambient glow */}
        <div
          className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] pointer-events-none"
          style={{
            background: "radial-gradient(ellipse, rgba(6,182,212,0.08) 0%, transparent 70%)",
          }}
        />

        <div className="w-full max-w-md relative z-10">
          {/* Logo */}
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-3">
              <span
                className="text-2xl font-bold tracking-tight"
                style={{
                  background: "linear-gradient(90deg, #38f2ff, #14b8a6)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                DevEngine
              </span>
              <span
                className="text-[10px] font-bold px-2 py-1 rounded-lg tracking-widest uppercase"
                style={{
                  background: "rgba(168,85,247,0.12)",
                  color: "#a855f7",
                  border: "1px solid rgba(168,85,247,0.3)",
                }}
              >
                Staff Portal
              </span>
            </Link>
            <p className="text-gray-400 text-sm mt-3">Sign in with your staff credentials</p>
          </div>

          {/* Login Card */}
          <div className="rounded-3xl bg-[#0c0c16]/95 border border-white/[0.08] p-6 sm:p-8 space-y-6 shadow-2xl backdrop-blur-xl">
            {/* Error */}
            {error && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5">
                <span className="material-symbols-outlined text-rose-400 text-base mt-0.5 shrink-0">error</span>
                <p className="text-xs text-rose-300 leading-relaxed">{error}</p>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-[11px] text-gray-400 font-mono uppercase tracking-wider">Email Address</label>
                <div className="relative">
                  <span className="material-symbols-outlined text-gray-500 text-lg absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                    mail
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your.devengine@gmail.com"
                    required
                    className="w-full h-12 bg-black/40 border border-white/[0.1] rounded-xl pl-11 pr-4 text-sm text-white focus:outline-none focus:border-cyan-400 font-mono placeholder:text-gray-500 transition-colors"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-[11px] text-gray-400 font-mono uppercase tracking-wider">Password</label>
                <div className="relative">
                  <span className="material-symbols-outlined text-gray-500 text-lg absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                    lock
                  </span>
                  <input
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full h-12 bg-black/40 border border-white/[0.1] rounded-xl pl-11 pr-12 text-sm text-white focus:outline-none focus:border-cyan-400 font-mono placeholder:text-gray-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors cursor-pointer p-1"
                  >
                    <span className="material-symbols-outlined text-lg">
                      {showPass ? "visibility_off" : "visibility"}
                    </span>
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-2xl text-sm font-bold text-white transition-all cursor-pointer active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={{
                  background: loading
                    ? "rgba(255,255,255,0.05)"
                    : "linear-gradient(135deg, #8b5cf6, #a855f7)",
                  boxShadow: loading ? "none" : "0 0 25px rgba(139,92,246,0.3)",
                }}
              >
                {loading ? (
                  <>
                    <HelixLoader size={18} color="#a855f7" />
                    <span className="text-gray-300">Authenticating…</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-base">login</span>
                    Sign In
                  </>
                )}
              </button>
            </form>

            {/* Footer hint */}
            <div className="text-center pt-2">
              <p className="text-[11px] text-gray-500">
                Staff credentials are provided by your administrator.
              </p>
              <p className="text-[11px] text-gray-500 mt-1">
                Contact your admin if you&apos;ve forgotten your password.
              </p>
            </div>
          </div>

          {/* Bottom link */}
          <div className="text-center mt-6">
            <Link
              href="/"
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors font-mono"
            >
              ← Back to DevEngine
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
