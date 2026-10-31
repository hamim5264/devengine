import { announceStaffSuspension, clearStaffSuspensionNotice, enforceStaffSuspension, getStaffSuspensionNotice } from "@/lib/services/staffSuspension";
import Head from "next/head";
import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { motion, AnimatePresence } from "framer-motion";
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getStaffByUid } from "@/lib/services/staffService";
import HelixLoader from "@/components/HelixLoader";
import HeaderControls from "@/components/HeaderControls";
import { useTheme } from "@/context/ThemeContext";
import InteractiveYeti from "@/components/staff/InteractiveYeti";

const TICKER_ITEMS = [
  { icon: "bolt", label: "DevEngine Sprint Mesh", highlight: "v2.4" },
  { icon: "security", label: "Zero-Trust Identity Protocol", highlight: "Active" },
  { icon: "hub", label: "24 Enterprise Cloud Nodes", highlight: "Synchronized" },
  { icon: "lock", label: "AES-256 Cryptographic Auth", highlight: "Secured" },
  { icon: "speed", label: "99.99% System Availability", highlight: "Optimal" },
  { icon: "verified", label: "Sprint Workspaces & Delivery", highlight: "Live" },
];

export default function StaffLoginPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [focusedField, setFocusedField] = useState<"email" | "password" | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  useEffect(() => {
    const notice = getStaffSuspensionNotice();
    if (notice) setError("Your account is suspended. Please contact administration. Reason: " + notice.reason);
  }, []);

  // Email format validation: requires proper RFC email format (e.g. user@domain.com or user@gmail.com)
  const isEmailFormatValid = (val: string) => {
    if (!val || val.trim().length === 0) return true;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
  };

  const hasEmailWarning =
    email.trim().length > 0 &&
    (!email.includes("@") || !email.includes(".") || !isEmailFormatValid(email));

  // ── Auto-redirect if already logged in as staff ──
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const staff = await getStaffByUid(user.uid);
        if (staff?.status === "suspended") {
          setCheckingAuth(false);
          setError("Your account is suspended. Please contact administration. Reason: " + (staff.suspensionReason || "Account access was suspended."));
          await enforceStaffSuspension(staff);
          return;
        }
        if (staff && staff.status === "active") {
          clearStaffSuspensionNotice();
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
        setError("Access denied. This account is not registered as an authorized employee.");
        setLoading(false);
        return;
      }

      if (staff.status === "suspended") {
        await enforceStaffSuspension(staff);
        setError("Your account is suspended. Please contact administration. Reason: " + (staff.suspensionReason || "Account access was suspended."));
        setLoading(false);
        return;
      }

      clearStaffSuspensionNotice();
      // Store staff session info
      localStorage.setItem("isStaff", "1");
      localStorage.setItem("staffUid", user.uid);
      localStorage.removeItem("isAdmin");

      router.push("/staff/dashboard");
    } catch (err: any) {
      // Report failed authentication attempt to security monitoring
      fetch("/api/security/report-threat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "failed_login",
          email: email.trim(),
          details: `Staff portal attempt: ${err?.code || "authentication_failure"}`,
        }),
      }).catch(() => {});

      if (err.code === "auth/user-disabled") {
        const previous = getStaffSuspensionNotice();
        const reason = previous?.email?.toLowerCase() === email.trim().toLowerCase() ? previous.reason : "Your employee account has been suspended.";
        announceStaffSuspension({ email: email.trim(), reason });
        setError("Your account is suspended. Please contact administration. " + reason);
      } else if (
        err.code === "auth/user-not-found" ||
        err.code === "auth/invalid-credential"
      ) {
        setError("Invalid email address or password. Please verify your credentials.");
      } else if (err.code === "auth/wrong-password") {
        setError("Incorrect password. Please verify your credentials.");
      } else if (err.code === "auth/too-many-requests") {
        setError("Too many login attempts. Access temporarily restricted. Please try again shortly.");
      } else {
        setError("Authentication failed. Please check your credentials or connection.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[var(--devengine-page)] flex items-center justify-center">
        <HelixLoader size={44} color="#2cecf7" />
      </div>
    );
  }

  const isLight = theme === "light";

  return (
    <>
      <Head>
        <title>Employee Portal Authentication | DevEngine</title>
        <meta name="description" content="Secure authentication gateway for DevEngine authorized engineering and staff members." />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="robots" content="noindex, nofollow" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
        />
      </Head>

      <div className="min-h-screen relative flex flex-col justify-between overflow-x-hidden bg-[var(--devengine-page)] text-[var(--devengine-text)] font-sans transition-colors duration-300 selection:bg-[#2cecf7] selection:text-[#02040a]">
        {/* ── 1. Full-Screen Cinematic Animated Background ── */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          {/* Base depth gradient */}
          <div
            className="absolute inset-0 transition-opacity duration-700"
            style={{
              background: isLight
                ? "radial-gradient(ellipse 90% 80% at 50% 0%, rgba(44, 236, 247, 0.16) 0%, rgba(245, 251, 255, 0.95) 60%, rgba(240, 248, 255, 1) 100%)"
                : "radial-gradient(ellipse 90% 80% at 50% 0%, rgba(14, 32, 54, 0.92) 0%, rgba(3, 7, 18, 0.98) 60%, rgba(2, 4, 10, 1) 100%)",
            }}
          />

          {/* Drifting Cyber Plasma Blob 1 (Top Left) */}
          <div
            className="absolute -top-36 -left-24 w-[620px] h-[620px] rounded-full blur-[140px] pointer-events-none animate-blobA"
            style={{
              background: isLight
                ? "radial-gradient(circle, rgba(44, 236, 247, 0.28) 0%, transparent 70%)"
                : "radial-gradient(circle, rgba(44, 236, 247, 0.18) 0%, transparent 70%)",
            }}
          />

          {/* Drifting Cyber Plasma Blob 2 (Bottom Right) */}
          <div
            className="absolute -bottom-36 -right-24 w-[680px] h-[680px] rounded-full blur-[160px] pointer-events-none animate-blobB"
            style={{
              background: isLight
                ? "radial-gradient(circle, rgba(6, 182, 212, 0.2) 0%, transparent 70%)"
                : "radial-gradient(circle, rgba(44, 236, 247, 0.12) 0%, transparent 70%)",
            }}
          />

          {/* Animated Cyber Precision Grid */}
          <div
            className="absolute inset-0 opacity-40 animate-gridPulse pointer-events-none"
            style={{
              backgroundImage: isLight
                ? "linear-gradient(to right, rgba(44, 236, 247, 0.09) 1px, transparent 1px), linear-gradient(to bottom, rgba(44, 236, 247, 0.09) 1px, transparent 1px)"
                : "linear-gradient(to right, rgba(44, 236, 247, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(44, 236, 247, 0.05) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
          />
        </div>

        {/* ── 2. Top Transparent Floating Bar (No solid container box) ── */}
        <div className="relative z-30 w-full max-w-6xl mx-auto px-4 sm:px-8 pt-4 sm:pt-6 flex items-center justify-between gap-3 bg-transparent">
          <Link
            href="/home"
            className="group inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-mono transition-all duration-200 hover:scale-[1.03]"
            style={{
              background: isLight ? "rgba(255, 255, 255, 0.75)" : "rgba(255, 255, 255, 0.04)",
              borderColor: isLight ? "rgba(44, 236, 247, 0.35)" : "rgba(255, 255, 255, 0.12)",
              color: isLight ? "#0f172a" : "#cbd5e1",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              boxShadow: isLight ? "0 2px 10px rgba(44, 236, 247, 0.12)" : "0 4px 14px rgba(0, 0, 0, 0.3)",
            }}
          >
            <span className="material-symbols-outlined text-[16px] text-[#2cecf7] group-hover:-translate-x-1 transition-transform">
              arrow_back
            </span>
            <span>Return to DevEngine</span>
          </Link>

          <div className="flex items-center gap-3">
            <div
              className="hidden sm:inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-[11px] font-mono font-medium backdrop-blur-md"
              style={{
                background: isLight ? "rgba(16, 185, 129, 0.08)" : "rgba(16, 185, 129, 0.1)",
                borderColor: "rgba(16, 185, 129, 0.3)",
                color: isLight ? "#047857" : "#34d399",
                boxShadow: isLight ? "0 2px 8px rgba(16, 185, 129, 0.12)" : "none",
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Gateway Online</span>
            </div>

            <HeaderControls />
          </div>
        </div>

        {/* ── 3. Main Login Container (Wider, Compact Height, Sleek Inputs) ── */}
        <main className="relative z-20 w-full max-w-[560px] mx-auto px-4 py-2 sm:py-4 flex-1 flex flex-col justify-center">
          {/* Interactive Mascot Yeti emerging from BEHIND the card */}
          <div className="relative -mb-4 sm:-mb-5 z-10 flex justify-center pointer-events-none">
            <InteractiveYeti
              focusedField={focusedField}
              email={email}
              emailLength={email.length}
              showPass={showPass}
              hasError={Boolean(error)}
              hasWarning={hasEmailWarning && !error}
              loading={loading}
              isLight={isLight}
            />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-20 rounded-3xl p-6 sm:p-8 backdrop-blur-2xl transition-all duration-300 overflow-hidden"
            style={{
              background: isLight ? "rgba(255, 255, 255, 0.92)" : "rgba(10, 16, 30, 0.92)",
              border: isLight ? "1px solid rgba(44, 236, 247, 0.38)" : "1px solid rgba(44, 236, 247, 0.22)",
              boxShadow: isLight
                ? "0 24px 60px -15px rgba(44, 236, 247, 0.18), 0 8px 30px rgba(0, 0, 0, 0.04)"
                : "0 28px 75px -15px rgba(0, 0, 0, 0.85), 0 0 35px rgba(44, 236, 247, 0.12)",
            }}
          >
            {/* Ambient Cyan Glowing Accent Strip */}
            <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-transparent via-[#2cecf7] to-transparent" />
            <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-56 h-20 bg-[#2cecf7]/20 blur-3xl pointer-events-none" />

            {/* Top Row: Logo & Badge */}
            <div className="flex items-center justify-between gap-3 mb-5">
              <Link
                href="/home"
                className="inline-flex items-center transition-transform duration-200 hover:scale-105"
              >
                <Image
                  src={isLight ? "/assets/DevEngine-logo-on-light1.png" : "/assets/DevEngine-logo-on-dark2.png"}
                  alt="DevEngine"
                  width={170}
                  height={42}
                  priority
                  className="h-8 w-auto object-contain"
                />
              </Link>

              <div
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-mono font-bold uppercase tracking-wider"
                style={{
                  background: isLight ? "rgba(44, 236, 247, 0.12)" : "rgba(44, 236, 247, 0.1)",
                  borderColor: "rgba(44, 236, 247, 0.35)",
                  color: "#2cecf7",
                  boxShadow: "0 0 14px rgba(44, 236, 247, 0.18)",
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#2cecf7] animate-pulse" />
                <span>Employee Portal</span>
              </div>
            </div>

            {/* Header Titles */}
            <div className="mb-5">
              <h1 className="text-2xl sm:text-[26px] font-bold tracking-tight text-[var(--devengine-text)] leading-snug">
                Sign In to Workspace
              </h1>
              <p className="text-xs sm:text-sm mt-1 text-[var(--devengine-muted)] leading-relaxed">
                Authenticate with your corporate credentials to access sprint updates and tasks.
              </p>
            </div>

            {/* Error Banner */}
            <AnimatePresence>
              {error && (
                <motion.div role="alert"
                  initial={{ opacity: 0, height: 0, y: -6 }}
                  animate={{ opacity: 1, height: "auto", y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-4 p-3 rounded-xl border flex items-start gap-2.5 overflow-hidden"
                  style={{
                    background: isLight ? "rgba(244, 63, 94, 0.08)" : "rgba(244, 63, 94, 0.12)",
                    borderColor: "rgba(244, 63, 94, 0.35)",
                    color: isLight ? "#be123c" : "#fca5a5",
                  }}
                >
                  <span className="material-symbols-outlined text-rose-500 text-lg shrink-0 mt-0.5">
                    error
                  </span>
                  <p className="text-xs font-mono leading-relaxed">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Email Input */}
              <div className="space-y-1.5">
                <label
                  className="block text-[11px] font-mono font-semibold uppercase tracking-wider text-[var(--devengine-muted)]"
                >
                  Corporate Email
                </label>
                <div
                  className="relative flex items-center rounded-xl border transition-all duration-200 overflow-hidden h-11 focus-within:border-[#2cecf7] focus-within:ring-2 focus-within:ring-[#2cecf7]/25"
                  style={{
                    background: isLight ? "rgba(241, 245, 249, 0.65)" : "rgba(255, 255, 255, 0.03)",
                    borderColor: isLight ? "rgba(203, 213, 225, 0.8)" : "rgba(255, 255, 255, 0.1)",
                  }}
                >
                  <div
                    className="pl-3.5 pr-2.5 flex items-center justify-center pointer-events-none"
                    style={{ color: hasEmailWarning && !error ? "#f59e0b" : "#2cecf7" }}
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {hasEmailWarning && !error ? "warning" : "mail"}
                    </span>
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError("");
                    }}
                    onFocus={() => setFocusedField("email")}
                    onBlur={() => setFocusedField((cur) => (cur === "email" ? null : cur))}
                    placeholder="name.devengine@gmail.com"
                    className="staff-login-input w-full bg-transparent pr-4 text-xs sm:text-sm focus:outline-none font-mono text-[var(--devengine-text)] placeholder:text-gray-400 placeholder:opacity-70 transition-colors"
                  />
                </div>
                {hasEmailWarning && !error && (
                  <div className="flex items-center gap-1.5 pt-1 text-[11px] font-mono text-amber-500 animate-fadeIn">
                    <span className="material-symbols-outlined text-[13px]">warning</span>
                    <span>Please enter a valid email format (e.g. name.devengine@gmail.com)</span>
                  </div>
                )}
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    className="block text-[11px] font-mono font-semibold uppercase tracking-wider text-[var(--devengine-muted)]"
                  >
                    Security Password
                  </label>
                  <span
                    className="text-[10px] font-mono text-[var(--devengine-muted)]"
                  >
                    AES Encrypted
                  </span>
                </div>
                <div
                  className="relative flex items-center rounded-xl border transition-all duration-200 overflow-hidden h-11 focus-within:border-[#2cecf7] focus-within:ring-2 focus-within:ring-[#2cecf7]/25"
                  style={{
                    background: isLight ? "rgba(241, 245, 249, 0.65)" : "rgba(255, 255, 255, 0.03)",
                    borderColor: isLight ? "rgba(203, 213, 225, 0.8)" : "rgba(255, 255, 255, 0.1)",
                  }}
                >
                  <div
                    className="pl-3.5 pr-2.5 flex items-center justify-center pointer-events-none"
                    style={{ color: "#2cecf7" }}
                  >
                    <span className="material-symbols-outlined text-[18px]">lock</span>
                  </div>
                  <input
                    type={showPass ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError("");
                    }}
                    onFocus={() => setFocusedField("password")}
                    onBlur={() => setFocusedField((cur) => (cur === "password" ? null : cur))}
                    placeholder="••••••••••••"
                    className="staff-login-input w-full bg-transparent pr-11 text-xs sm:text-sm focus:outline-none font-mono tracking-widest text-[var(--devengine-text)] placeholder:text-gray-400 placeholder:opacity-70 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-[#2cecf7] transition-colors cursor-pointer"
                    title={showPass ? "Hide password" : "Show password"}
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {showPass ? "visibility_off" : "visibility"}
                    </span>
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer active:scale-[0.98] disabled:opacity-50 disabled:cursor-wait flex items-center justify-center gap-2 shadow-lg mt-1"
                style={{
                  background: loading
                    ? isLight
                      ? "#cbd5e1"
                      : "rgba(255, 255, 255, 0.08)"
                    : "#2cecf7",
                  color: "#02040a",
                  boxShadow: loading
                    ? "none"
                    : "0 0 28px rgba(44, 236, 247, 0.45), 0 4px 14px rgba(0, 0, 0, 0.12)",
                }}
              >
                {loading ? (
                  <>
                    <HelixLoader size={18} color="#02040a" />
                    <span className="font-mono text-xs font-bold uppercase tracking-wider">
                      Authenticating…
                    </span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">login</span>
                    <span>Sign In to Portal</span>
                  </>
                )}
              </button>

              {/* Forgot Password Link */}
              <div className="pt-3 text-center">
                <span className="text-xs text-[var(--devengine-muted)]">Forgot password? </span>
                <a
                  href="mailto:devenginesoftsolution@gmail.com?subject=DevEngine%20Staff%20Portal%20-%20Password%20Reset%20Request&body=Hello%20DevEngine%20Administration%2C%0A%0AI%20need%20assistance%20with%20resetting%20my%20DevEngine%20employee%20portal%20password.%0A%0AMy%20Corporate%20Email%3A%20%0AMy%20Full%20Name%3A%20%0A%0AThank%20you."
                  className="text-xs font-semibold text-[#2cecf7] hover:underline inline-flex items-center gap-1 transition-colors group cursor-pointer"
                  title="Contact Administration via devenginesoftsolution@gmail.com"
                >
                  <span>Contact Administration</span>
                  <span className="material-symbols-outlined text-[13px] transition-transform group-hover:translate-x-0.5">
                    mail
                  </span>
                </a>
              </div>
            </form>

            {/* Security Notice */}
            <div
              className="mt-5 pt-4 border-t flex items-center justify-between flex-wrap gap-2 text-[11px] text-[var(--devengine-muted)] font-mono"
              style={{
                borderColor: isLight ? "rgba(44, 236, 247, 0.2)" : "rgba(255, 255, 255, 0.08)",
              }}
            >
              <div className="flex items-center gap-1.5 text-[#2cecf7]">
                <span className="material-symbols-outlined text-[14px]">verified_user</span>
                <span>DevEngine Identity Guard</span>
              </div>
              <span>Admin Authorized Credentials Only</span>
            </div>
          </motion.div>
        </main>

        {/* ── 4. Bottom Continuous Looping Animation Ticker ── */}
        <div
          className="relative z-20 w-full overflow-hidden border-t py-2.5 backdrop-blur-md"
          style={{
            borderColor: isLight ? "rgba(44, 236, 247, 0.25)" : "rgba(44, 236, 247, 0.15)",
            background: isLight ? "rgba(255, 255, 255, 0.6)" : "rgba(2, 4, 10, 0.55)",
            maskImage: "linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent)",
            WebkitMaskImage: "linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent)",
          }}
        >
          <div className="flex w-max animate-tickerLoop will-change-transform">
            {[0, 1].map((copy) => (
              <div key={copy} className="flex items-center gap-6 sm:gap-8 px-4" aria-hidden={copy === 1}>
                {TICKER_ITEMS.map((item, idx) => (
                  <div
                    key={`${copy}-${idx}`}
                    className="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[11px] font-mono whitespace-nowrap transition-all"
                    style={{
                      background: isLight ? "rgba(44, 236, 247, 0.06)" : "rgba(44, 236, 247, 0.05)",
                      borderColor: isLight ? "rgba(44, 236, 247, 0.25)" : "rgba(44, 236, 247, 0.15)",
                      color: isLight ? "#1e293b" : "#cbd5e1",
                    }}
                  >
                    <span className="material-symbols-outlined text-[13px] text-[#2cecf7]">
                      {item.icon}
                    </span>
                    <span className="font-medium">{item.label}</span>
                    <span
                      className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider text-[#02040a]"
                      style={{ background: "#2cecf7" }}
                    >
                      {item.highlight}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Keyframe Animations ── */}
      <style jsx global>{`
        @keyframes blobA {
          0% {
            transform: translate3d(0, 0, 0) scale(1);
          }
          50% {
            transform: translate3d(40px, 50px, 0) scale(1.15);
          }
          100% {
            transform: translate3d(-30px, 20px, 0) scale(0.95);
          }
        }
        @keyframes blobB {
          0% {
            transform: translate3d(0, 0, 0) scale(1);
          }
          50% {
            transform: translate3d(-50px, -40px, 0) scale(1.18);
          }
          100% {
            transform: translate3d(25px, -20px, 0) scale(0.92);
          }
        }
        @keyframes gridPulse {
          0%, 100% {
            opacity: 0.35;
          }
          50% {
            opacity: 0.55;
          }
        }
        @keyframes tickerLoop {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }
        .animate-blobA {
          animation: blobA 16s ease-in-out infinite alternate;
        }
        .animate-blobB {
          animation: blobB 20s ease-in-out infinite alternate;
        }
        .animate-gridPulse {
          animation: gridPulse 8s ease-in-out infinite;
        }
        .animate-tickerLoop {
          animation: tickerLoop 30s linear infinite;
        }
        .animate-tickerLoop:hover {
          animation-play-state: paused;
        }
        .staff-login-input,
        html.light .staff-login-input,
        html.dark .staff-login-input {
          background-color: transparent !important;
          background: transparent !important;
          border: none !important;
          border-color: transparent !important;
          box-shadow: none !important;
          outline: none !important;
          -webkit-appearance: none !important;
          appearance: none !important;
        }
        .staff-login-input:-webkit-autofill,
        .staff-login-input:-webkit-autofill:hover,
        .staff-login-input:-webkit-autofill:focus,
        .staff-login-input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 1000px transparent inset !important;
          -webkit-text-fill-color: var(--devengine-text) !important;
          transition: background-color 5000s ease-in-out 0s;
        }
      `}</style>
    </>
  );
}
