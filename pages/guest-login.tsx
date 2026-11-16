import React, { useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import LandingNavbar from "@/components/landing/LandingNavbar";
import LandingFooter from "@/components/landing/LandingFooter";
import HelixLoader from "@/components/HelixLoader";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  onAuthStateChanged,
} from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { getGuestUser } from "@/lib/services/marketplaceService";

export default function GuestLoginPage() {
  const router = useRouter();
  const returnUrl = (router.query.returnUrl as string) || (router.query.redirect as string) || "/landing-page-designs";

  const [mode, setMode] = useState<"register" | "login">("register");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // If already authenticated with an active guest session, redirect to destination
  useEffect(() => {
    if (!router.isReady) return;
    try {
      const raw = localStorage.getItem("devengine_guest");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.uid && parsed.isGuest) {
          router.push(returnUrl);
        }
      }
    } catch {}
  }, [returnUrl, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      setError("Please provide both email and password.");
      return;
    }

    if (mode === "register") {
      if (!fullName.trim()) {
        setError("Please enter your full name.");
        return;
      }
      if (!phone.trim()) {
        setError("Please enter your active phone number.");
        return;
      }
      if (!termsAccepted) {
        setError("You must accept the terms and conditions to create an account.");
        return;
      }
      if (password.length < 6) {
        setError("Password should be at least 6 characters.");
        return;
      }
    }

    setLoading(true);

    try {
      if (mode === "register") {
        const cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        const user = cred.user;

        await updateProfile(user, {
          displayName: fullName.trim(),
        });

        // Save guest user profile in Firestore
        const guestDoc = {
          uid: user.uid,
          fullName: fullName.trim(),
          email: cleanEmail,
          phone: phone.trim(),
          termsAccepted: true,
          role: "guest",
          isGuest: true,
          loggedIn: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        try {
          await setDoc(doc(db, "guest_users", user.uid), guestDoc, { merge: true });
        } catch (dbErr) {
          console.warn("Could not save to guest_users doc:", dbErr);
        }

        localStorage.setItem("devengine_guest", JSON.stringify(guestDoc));
        setSuccess("Account created successfully! Redirecting...");
      } else {
        const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);
        const user = cred.user;

        // Fetch or hydrate guest profile
        let phoneFromDb = "";
        try {
          const snap = await getDoc(doc(db, "guest_users", user.uid));
          if (snap.exists()) {
            phoneFromDb = snap.data().phone || "";
          }
        } catch {}

        const guestDoc = {
          uid: user.uid,
          fullName: user.displayName || user.email?.split("@")[0] || "Guest",
          email: user.email || cleanEmail,
          phone: phoneFromDb,
          role: "guest",
          isGuest: true,
          loggedIn: true,
        };
        localStorage.setItem("devengine_guest", JSON.stringify(guestDoc));
        setSuccess("Signed in successfully! Redirecting...");
      }

      setTimeout(() => {
        router.push(returnUrl);
      }, 700);
    } catch (err: any) {
      console.error("Auth error:", err);
      let msg = err.message || "Authentication failed. Please check your details.";
      if (err.code === "auth/email-already-in-use") {
        msg = "An account with this email already exists. Please switch to Sign In.";
      } else if (err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        msg = "Incorrect email or password. Please verify and try again.";
      } else if (err.code === "auth/user-not-found") {
        msg = "No account found with this email. Please create an account.";
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--devengine-bg)] text-slate-900 dark:text-white flex flex-col justify-between selection:bg-[#2cecf7] selection:text-[#02040a]">
      <Head>
        <title>{`${mode === "register" ? "Create Guest Account" : "Guest Sign In"} | DevEngine Designs`}</title>
        <meta
          name="description"
          content="Access DevEngine Design Marketplace to save favorites, review templates, and track digital orders."
        />
      </Head>

      <LandingNavbar />

      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-16 sm:py-24 relative overflow-hidden">
        {/* Ambient background glows */}
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-[#2cecf7]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-[#2cecf7]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-md relative z-10">
          <div className="text-center mb-8">
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[11px] font-semibold bg-[#2cecf7]/10 text-[#2cecf7] border border-[#2cecf7]/20 uppercase tracking-widest font-mono mb-3">
              <span className="w-2 h-2 rounded-full bg-[#2cecf7] animate-pulse" />
              DevEngine Marketplace Access
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[color:var(--devengine-text)]">
              {mode === "register" ? "Create Your Account" : "Welcome Back"}
            </h1>
            <p className="text-xs sm:text-sm text-[color:var(--devengine-muted)] mt-2 max-w-sm mx-auto">
              Save favorite UI kits, write verified reviews, and unlock instant digital delivery downloads.
            </p>
          </div>

          <div className="bg-[color:var(--devengine-surface)] backdrop-blur-xl border border-[color:var(--devengine-border)] rounded-3xl p-6 sm:p-8 shadow-2xl">
            {/* Mode Switcher */}
            <div className="grid grid-cols-2 p-1 bg-[color:var(--devengine-raised)] rounded-2xl mb-6 border border-[color:var(--devengine-border)]">
              <button
                type="button"
                onClick={() => {
                  setMode("register");
                  setError(null);
                }}
                className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  mode === "register"
                    ? "bg-[#2cecf7] text-[#02040a] shadow-[0_0_15px_rgba(44,236,247,0.35)]"
                    : "text-[color:var(--devengine-muted)] hover:text-[color:var(--devengine-text)]"
                }`}
              >
                Create Account
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setError(null);
                }}
                className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  mode === "login"
                    ? "bg-[#2cecf7] text-[#02040a] shadow-[0_0_15px_rgba(44,236,247,0.35)]"
                    : "text-[color:var(--devengine-muted)] hover:text-[color:var(--devengine-text)]"
                }`}
              >
                Sign In
              </button>
            </div>

            {error && (
              <div className="p-3.5 mb-5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-start gap-2.5">
                <span className="material-symbols-outlined text-base shrink-0">error</span>
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="p-3.5 mb-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-start gap-2.5">
                <span className="material-symbols-outlined text-base shrink-0">check_circle</span>
                <span>{success}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {mode === "register" && (
                <>
                  <div>
                    <label className="block font-semibold mb-1.5 text-[color:var(--devengine-text)]">
                      Full Name *
                    </label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[color:var(--devengine-muted)] text-lg">
                        person
                      </span>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Liam Vance"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[color:var(--devengine-raised)] border border-[color:var(--devengine-border)] text-[color:var(--devengine-text)] placeholder-[color:var(--devengine-muted)] focus:outline-none focus:border-[#2cecf7] transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold mb-1.5 text-[color:var(--devengine-text)]">
                      Phone Number *
                    </label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[color:var(--devengine-muted)] text-lg">
                        phone
                      </span>
                      <input
                        type="tel"
                        required
                        placeholder="e.g. +880 1712-345678"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[color:var(--devengine-raised)] border border-[color:var(--devengine-border)] text-[color:var(--devengine-text)] placeholder-[color:var(--devengine-muted)] focus:outline-none focus:border-[#2cecf7] transition-all"
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block font-semibold mb-1.5 text-[color:var(--devengine-text)]">
                  Email Address *
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[color:var(--devengine-muted)] text-lg">
                    mail
                  </span>
                  <input
                    type="email"
                    required
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[color:var(--devengine-raised)] border border-[color:var(--devengine-border)] text-[color:var(--devengine-text)] placeholder-[color:var(--devengine-muted)] focus:outline-none focus:border-[#2cecf7] transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1.5 text-[color:var(--devengine-text)]">
                  Password *
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[color:var(--devengine-muted)] text-lg">
                    lock
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="Minimum 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[color:var(--devengine-raised)] border border-[color:var(--devengine-border)] text-[color:var(--devengine-text)] placeholder-[color:var(--devengine-muted)] focus:outline-none focus:border-[#2cecf7] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[color:var(--devengine-muted)] hover:text-[color:var(--devengine-text)]"
                  >
                    <span className="material-symbols-outlined text-lg">
                      {showPassword ? "visibility_off" : "visibility"}
                    </span>
                  </button>
                </div>
              </div>

              {mode === "register" && (
                <div className="pt-2">
                  <label className="flex items-start gap-2.5 cursor-pointer text-[11px] text-[color:var(--devengine-muted)]">
                    <input
                      type="checkbox"
                      required
                      checked={termsAccepted}
                      onChange={(e) => setTermsAccepted(e.target.checked)}
                      className="mt-0.5 rounded border-[color:var(--devengine-border)] accent-[#2cecf7] focus:ring-0"
                    />
                    <span>
                      I accept the{" "}
                      <Link href="/terms" className="text-[#2cecf7] font-semibold hover:underline">
                        Terms and Conditions
                      </Link>{" "}
                      and Privacy Policy for DevEngine Marketplace digital licensing.
                    </span>
                  </label>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-4 py-3 rounded-2xl bg-[#2cecf7] hover:bg-[#2cecf7]/90 text-[#02040a] font-bold text-xs uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(44,236,247,0.3)] disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <HelixLoader size={18} color="#02040a" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <span>{mode === "register" ? "Create Account & Continue" : "Sign In & Continue"}</span>
                    <span className="material-symbols-outlined text-base">arrow_forward</span>
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-[color:var(--devengine-border)] text-center text-xs text-[color:var(--devengine-muted)]">
              <Link
                href="/landing-page-designs"
                className="inline-flex items-center gap-1.5 hover:text-[#2cecf7] font-semibold transition-colors"
              >
                <span className="material-symbols-outlined text-sm">arrow_back</span>
                <span>Return to Design Marketplace</span>
              </Link>
            </div>
          </div>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
