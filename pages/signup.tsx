import Head from "next/head";
import { useState } from "react";
import { useRouter } from "next/router";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";
import { FiEye, FiEyeOff } from "react-icons/fi";

interface FormData {
  fullName: string;
  mobile: string;
  email: string;
  address: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
}

export default function SignUpPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    fullName: "",
    mobile: "",
    email: "",
    address: "",
    password: "",
    confirmPassword: "",
    acceptTerms: false,
  });

  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    const {
      fullName,
      mobile,
      email,
      address,
      password,
      confirmPassword,
      acceptTerms,
    } = formData;

    // Basic validations
    const mobileRegex = /^(01)[0-9]{9}$/; // e.g., 017XXXXXXXX
    if (!mobileRegex.test(mobile)) {
      return setError("Invalid mobile number format.");
    }
    if (password.length < 6) {
      return setError("Password must be at least 6 characters.");
    }
    if (password !== confirmPassword) {
      return setError("Passwords do not match.");
    }
    if (!acceptTerms) {
      return setError("You must accept the terms and conditions.");
    }

    setLoading(true);
    try {
      // ✅ normalize email for BOTH Auth + Firestore
      const emailNorm = email.trim().toLowerCase();

      const cred = await createUserWithEmailAndPassword(
        auth,
        emailNorm, // <— use normalized email here
        password
      );

      await updateProfile(cred.user, { displayName: fullName });

      await setDoc(doc(db, "users", cred.user.uid), {
        uid: cred.user.uid,
        fullName,
        mobile,
        email: emailNorm, // <— store normalized email
        address,
        createdAt: serverTimestamp(),
      });

      router.push("/dashboard");
    } catch (err: any) {
      // ...your error switch unchanged...
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Sign Up | DevEngine</title>
      </Head>

      <Navbar />

      <main className="pt-32 px-6 md:px-20 pb-20 bg-gradient-to-br from-gray-900 to-black text-white min-h-screen">
        <h1 className="text-3xl font-bold text-teal-400 mb-8 text-center">
          Create Your Account
        </h1>

        <form
          onSubmit={handleSubmit}
          className="max-w-xl mx-auto bg-gray-800 p-8 rounded-xl shadow-xl space-y-6"
        >
          <input
            type="text"
            name="fullName"
            value={formData.fullName}
            onChange={handleChange}
            placeholder="Full Name"
            className="w-full px-4 py-2 rounded bg-gray-700 text-white border border-gray-600 focus:outline-none focus:border-teal-400"
            required
          />

          <input
            type="text"
            name="mobile"
            value={formData.mobile}
            onChange={handleChange}
            placeholder="Mobile (e.g. 017XXXXXXXX)"
            className="w-full px-4 py-2 rounded bg-gray-700 text-white border border-gray-600 focus:outline-none focus:border-teal-400"
            required
          />

          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Email"
            className="w-full px-4 py-2 rounded bg-gray-700 text-white border border-gray-600 focus:outline-none focus:border-teal-400"
            required
          />

          <input
            type="text"
            name="address"
            value={formData.address}
            onChange={handleChange}
            placeholder="Address"
            className="w-full px-4 py-2 rounded bg-gray-700 text-white border border-gray-600 focus:outline-none focus:border-teal-400"
            required
          />

          {/* Password */}
          <div className="relative">
            <input
              type={showPass ? "text" : "password"}
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Password"
              className="w-full px-4 py-2 pr-10 rounded bg-gray-700 text-white border border-gray-600 focus:outline-none focus:border-teal-400"
              required
              minLength={6}
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

          {/* Confirm Password */}
          <div className="relative">
            <input
              type={showConfirm ? "text" : "password"}
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Confirm Password"
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

          <label className="flex items-center text-sm text-gray-300">
            <input
              type="checkbox"
              name="acceptTerms"
              checked={formData.acceptTerms}
              onChange={handleChange}
              className="mr-2"
              required
            />
            I accept the terms and conditions.
          </label>

          {error && <p className="text-red-400 text-sm text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-teal-500 hover:bg-teal-600 text-white font-semibold py-2 px-4 rounded transition disabled:opacity-50"
          >
            {loading ? "Creating account…" : "Sign Up"}
          </button>

          <p className="text-center text-sm text-gray-400">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-white hover:text-teal-400 underline"
            >
              Login
            </Link>
          </p>
        </form>
      </main>

      <Footer />
    </>
  );
}
