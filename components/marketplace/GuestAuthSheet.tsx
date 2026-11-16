import React, { useState, useEffect } from "react";
import Link from "next/link";
import styles from "./MarketplaceV2.module.css";
import HelixLoader from "@/components/HelixLoader";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";

interface GuestAuthSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (user: any) => void;
  initialMode?: "register" | "login";
  kicker?: string;
  title?: string;
  description?: string;
}

export default function GuestAuthSheet({
  isOpen,
  onClose,
  onSuccess,
  initialMode = "register",
  kicker = "DevEngine Marketplace",
  title,
  description,
}: GuestAuthSheetProps) {
  const [mode, setMode] = useState<"register" | "login">(initialMode);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMode(initialMode);
    setError(null);
  }, [initialMode, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

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
        setError("Please enter your phone number.");
        return;
      }
      if (!termsAccepted) {
        setError("Please accept the terms and conditions to create your account.");
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
        } catch {}

        localStorage.setItem("devengine_guest", JSON.stringify(guestDoc));
        onSuccess?.(user);
        onClose();
      } else {
        const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);
        const user = cred.user;

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
        onSuccess?.(user);
        onClose();
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      let msg = err.message || "Authentication failed.";
      if (err.code === "auth/email-already-in-use") {
        msg = "An account with this email already exists. Switch to Sign In.";
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
    <div className={styles.sheetBackdrop} role="presentation" onMouseDown={onClose}>
      <section
        className={`${styles.sheet} max-w-lg`}
        role="dialog"
        aria-modal="true"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button className={styles.sheetClose} onClick={onClose} aria-label="Close sheet">
          <span className="material-symbols-outlined">close</span>
        </button>

        <p className="text-[11px] font-bold tracking-[0.14em] uppercase text-[#2cecf7] mb-1.5">
          {kicker}
        </p>
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-2 text-[color:var(--devengine-text)]">
          {title || (mode === "register" ? "Create Account" : "Sign In to Continue")}
        </h2>
        <p className="text-xs sm:text-sm text-[color:var(--devengine-muted)] leading-relaxed max-w-md">
          {description ||
            "Save designs to your personal inspiration collection, submit verified customer reviews, and access digital deliveries."}
        </p>

        {/* Mode Switcher */}
        <div className="grid grid-cols-2 p-1 bg-[color:var(--devengine-raised)] rounded-2xl my-5 border border-[color:var(--devengine-border)]">
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
          <div className="p-3 mb-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-base">error</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          {mode === "register" && (
            <>
              <div>
                <label className="block font-semibold mb-1 text-[color:var(--devengine-text)]">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Liam Vance"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[color:var(--devengine-raised)] border border-[color:var(--devengine-border)] text-[color:var(--devengine-text)] placeholder-[color:var(--devengine-muted)] focus:outline-none focus:border-[#2cecf7] focus:ring-1 focus:ring-[#2cecf7] transition-colors"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-[color:var(--devengine-text)]">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. +880 1712-345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[color:var(--devengine-raised)] border border-[color:var(--devengine-border)] text-[color:var(--devengine-text)] placeholder-[color:var(--devengine-muted)] focus:outline-none focus:border-[#2cecf7] focus:ring-1 focus:ring-[#2cecf7] transition-colors"
                />
              </div>
            </>
          )}

          <div>
            <label className="block font-semibold mb-1 text-[color:var(--devengine-text)]">
              Email Address *
            </label>
            <input
              type="email"
              required
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[color:var(--devengine-raised)] border border-[color:var(--devengine-border)] text-[color:var(--devengine-text)] placeholder-[color:var(--devengine-muted)] focus:outline-none focus:border-[#2cecf7] focus:ring-1 focus:ring-[#2cecf7] transition-colors"
            />
          </div>

          <div>
            <label className="block font-semibold mb-1 text-[color:var(--devengine-text)]">
              Password *
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                placeholder="Minimum 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-[color:var(--devengine-raised)] border border-[color:var(--devengine-border)] text-[color:var(--devengine-text)] placeholder-[color:var(--devengine-muted)] focus:outline-none focus:border-[#2cecf7] focus:ring-1 focus:ring-[#2cecf7] transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[color:var(--devengine-muted)] hover:text-[color:var(--devengine-text)] transition-colors"
              >
                <span className="material-symbols-outlined text-base">
                  {showPassword ? "visibility_off" : "visibility"}
                </span>
              </button>
            </div>
          </div>

          {mode === "register" && (
            <div className="pt-1">
              <label className="flex items-start gap-2 cursor-pointer text-[11px] text-[color:var(--devengine-muted)]">
                <input
                  type="checkbox"
                  required
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-0.5 rounded border-[color:var(--devengine-border)] accent-[#2cecf7] focus:ring-0"
                />
                <span>
                  I accept the{" "}
                  <Link href="/terms" target="_blank" className="text-[#2cecf7] font-semibold underline hover:text-[#53f2fb]">
                    Terms &amp; Conditions
                  </Link>{" "}
                  for DevEngine digital template licenses.
                </span>
              </label>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-3 py-3 rounded-2xl bg-[#2cecf7] hover:bg-[#2cecf7]/90 text-[#02040a] font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(44,236,247,0.3)] disabled:opacity-50"
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
      </section>
    </div>
  );
}
