// pages/reset-password.tsx
import Head from "next/head";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { verifyPasswordResetCode, confirmPasswordReset } from "firebase/auth";
import { auth } from "@/lib/firebase";
import HelixLoader from "@/components/HelixLoader";
import { FiEye, FiEyeOff } from "react-icons/fi";

export default function ResetPasswordPage() {
  const router = useRouter();
  const { oobCode } = router.query;

  const [checking, setChecking] = useState(true);
  const [valid, setValid] = useState(false);
  const [email, setEmail] = useState<string>("");

  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Verify the reset code from the email
  useEffect(() => {
    if (!router.isReady) return;

    const code = Array.isArray(oobCode) ? oobCode[0] : oobCode;
    if (!code) {
      setChecking(false);
      setValid(false);
      setError("Missing reset code.");
      return;
    }

    (async () => {
      setChecking(true);
      setError("");
      try {
        const mail = await verifyPasswordResetCode(auth, String(code));
        setEmail(mail);
        setValid(true);
      } catch {
        setValid(false);
        setError("Invalid or expired reset link.");
      } finally {
        setChecking(false);
      }
    })();
  }, [router.isReady, oobCode]);

  // After success, redirect to login after a short delay
  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => router.push("/login"), 3000);
    return () => clearTimeout(t);
  }, [done, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPass.length < 6) {
      setError("Password should be at least 6 characters.");
      return;
    }
    if (newPass !== confirmPass) {
      setError("Passwords do not match.");
      return;
    }

    const code = Array.isArray(oobCode) ? oobCode[0] : oobCode;
    if (!code) {
      setError("Missing reset code.");
      return;
    }

    setSubmitting(true);
    try {
      await confirmPasswordReset(auth, String(code), newPass);
      setDone(true);
      setNewPass("");
      setConfirmPass("");
    } catch {
      // common: auth/expired-action-code, auth/invalid-action-code, auth/user-not-found
      setError("Failed to reset password. Try sending a new link.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Head>
        <title>Reset Password | DevEngine</title>
      </Head>
      <Navbar />

      <main className="pt-32 px-6 md:px-20 pb-20 bg-gradient-to-br from-gray-900 to-black text-white min-h-screen">
        <h1 className="text-3xl font-bold text-teal-400 mb-8 text-center">
          Reset Password
        </h1>

        {/* Verifying link */}
        {checking && (
          <div className="flex flex-col items-center justify-center py-16">
            <HelixLoader size={56} color="#14b8a6" />
            <p className="mt-4 text-gray-400">Verifying link…</p>
          </div>
        )}

        {/* Invalid/missing code */}
        {!checking && !valid && (
          <div className="max-w-xl mx-auto bg-gray-800 p-8 rounded-xl shadow-xl text-center">
            <p className="text-red-400 mb-6">
              {error || "Invalid or expired link."}
            </p>
            <button
              onClick={() => router.push("/login")}
              className="bg-white text-black font-semibold px-5 py-2 rounded-lg"
            >
              Go to Login
            </button>
          </div>
        )}

        {/* Reset form */}
        {!checking && valid && !done && (
          <form
            onSubmit={handleSubmit}
            className="max-w-xl mx-auto bg-gray-800 p-8 rounded-xl shadow-xl space-y-6"
          >
            <p className="text-sm text-gray-400 text-center">
              Resetting password for <span className="text-white">{email}</span>
            </p>

            {/* New password */}
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                placeholder="New password"
                className="w-full px-4 py-2 pr-10 rounded bg-gray-700 text-white border border-gray-600 focus:outline-none focus:border-teal-400"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowNew((s) => !s)}
                className="absolute inset-y-0 right-3 flex items-center text-gray-300 hover:text-white"
                aria-label={showNew ? "Hide password" : "Show password"}
              >
                {showNew ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>

            {/* Confirm password */}
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                value={confirmPass}
                onChange={(e) => setConfirmPass(e.target.value)}
                placeholder="Confirm new password"
                className="w-full px-4 py-2 pr-10 rounded bg-gray-700 text-white border border-gray-600 focus:outline-none focus:border-teal-400"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((s) => !s)}
                className="absolute inset-y-0 right-3 flex items-center text-gray-300 hover:text-white"
                aria-label={showConfirm ? "Hide password" : "Show password"}
              >
                {showConfirm ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>

            {error && (
              <p className="text-red-400 text-sm text-center font-medium">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-white text-black font-semibold py-2 px-4 rounded transition disabled:opacity-50"
            >
              {submitting ? "Saving…" : "Save New Password"}
            </button>
          </form>
        )}

        {/* Success */}
        {!checking && valid && done && (
          <div className="max-w-xl mx-auto bg-gray-800 p-8 rounded-xl shadow-xl text-center">
            <p className="text-green-400 font-medium">
              Your password has been reset successfully.
            </p>
            <p className="text-gray-400 text-sm mt-2 mb-6">
              Redirecting to login in 3 seconds…
            </p>
            <button
              onClick={() => router.push("/login")}
              className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2 rounded-lg font-semibold"
            >
              Go to Login now
            </button>
          </div>
        )}
      </main>

      <Footer />
    </>
  );
}
