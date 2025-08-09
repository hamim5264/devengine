import Head from "next/head";
import { useEffect, useMemo, useState } from "react";
import { db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { useRouter } from "next/router";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { FaUserCircle, FaHistory } from "react-icons/fa";
import Link from "next/link";
import { useAuthRole } from "@/hooks/useAuthRole";

type UserData = {
  fullName: string;
  email: string;
  mobile?: string;
  address?: string;
};

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAdmin, loading } = useAuthRole();

  const [userData, setUserData] = useState<UserData | null>(null);
  const [editing, setEditing] = useState(false);

  // form state for inline editor
  const [form, setForm] = useState({
    fullName: "",
    mobile: "",
    address: "",
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saved, setSaved] = useState(false);

  const userDocRef = useMemo(
    () => (user ? doc(db, "users", user.uid) : null),
    [user]
  );

  // Route protection + profile load
  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (isAdmin) {
      router.replace("/admin/dashboard");
      return;
    }

    (async () => {
      if (!userDocRef) return;
      const snap = await getDoc(userDocRef);
      if (snap.exists()) {
        const d = snap.data() as any;
        const profile: UserData = {
          fullName: d.fullName || user.displayName || "User",
          email: d.email || user.email || "",
          mobile: d.mobile || "",
          address: d.address || "",
        };
        setUserData(profile);
        setForm({
          fullName: profile.fullName || "",
          mobile: profile.mobile || "",
          address: profile.address || "",
        });
      } else {
        // no doc yet — still show basics from auth
        const profile: UserData = {
          fullName: user.displayName || "User",
          email: user.email || "",
          mobile: "",
          address: "",
        };
        setUserData(profile);
        setForm({
          fullName: profile.fullName,
          mobile: "",
          address: "",
        });
      }
    })();
  }, [loading, user, isAdmin, router, userDocRef]);

  // save handler for inline editor
  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError("");
    setSaved(false);

    // simple mobile validation (BD format 01XXXXXXXXX)
    if (form.mobile && !/^(01)[0-9]{9}$/.test(form.mobile)) {
      setSaveError("Invalid mobile number. Use 01XXXXXXXXX");
      return;
    }
    if (!user || !userDocRef) return;

    setSaving(true);
    try {
      const payload = {
        fullName: form.fullName.trim(),
        mobile: form.mobile.trim(),
        address: form.address.trim(),
        email: userData?.email || user.email || "",
        uid: user.uid,
        updatedAt: serverTimestamp(),
      };

      const snap = await getDoc(userDocRef);
      if (snap.exists()) {
        await updateDoc(userDocRef, payload);
      } else {
        await setDoc(userDocRef, { ...payload, createdAt: serverTimestamp() });
      }

      setUserData((prev) =>
        prev
          ? {
              ...prev,
              fullName: payload.fullName,
              mobile: payload.mobile,
              address: payload.address,
            }
          : {
              fullName: payload.fullName,
              email: payload.email,
              mobile: payload.mobile,
              address: payload.address,
            }
      );
      setSaved(true);
      setEditing(false);
    } catch (err) {
      console.error(err);
      setSaveError("Failed to update profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !user || isAdmin) {
    return (
      <>
        <Head>
          <title>Dashboard | DevEngine</title>
        </Head>
        <Navbar />
        <main className="pt-40 text-center text-white min-h-screen bg-gradient-to-br from-gray-900 to-black">
          <p className="text-gray-400">Checking your dashboard…</p>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Dashboard | DevEngine</title>
      </Head>

      <Navbar />

      <main className="pt-28 px-6 md:px-20 pb-20 bg-gradient-to-br from-gray-900 to-black text-white min-h-screen">
        <h1 className="text-3xl font-bold text-teal-400 mb-10 text-center">
          User Dashboard
        </h1>

        {/* Profile summary card */}
        <div className="max-w-xl mx-auto bg-gray-800 rounded-xl p-6 shadow-xl text-center border border-gray-700">
          <FaUserCircle className="text-6xl text-teal-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-1">{userData?.fullName}</h2>
          <p className="text-gray-400 text-sm mb-1">{userData?.email}</p>
          {userData?.mobile ? (
            <p className="text-gray-400 text-sm">{userData.mobile}</p>
          ) : null}
          {userData?.address ? (
            <p className="text-gray-400 text-sm">{userData.address}</p>
          ) : null}

          {/* Actions */}
          <div className="border-t border-gray-600 pt-6 space-y-3">
            {/* Purchase history (unchanged) */}
            <Link
              href="/purchase-history"
              className="w-full inline-flex items-center justify-center gap-2 text-white bg-teal-600 hover:bg-teal-700 px-4 py-2 rounded-lg transition"
            >
              <FaHistory />
              Purchase History
            </Link>

            {/* Update Profile toggle */}
            <button
              onClick={() => {
                setEditing((s) => !s);
                setSaveError("");
                setSaved(false);
                // refresh form with latest values when opening
                if (userData) {
                  setForm({
                    fullName: userData.fullName || "",
                    mobile: userData.mobile || "",
                    address: userData.address || "",
                  });
                }
              }}
              className="w-full bg-white text-black hover:bg-gray-100 px-4 py-2 rounded-lg font-semibold transition"
            >
              {editing ? "Close Profile Editor" : "Update Profile"}
            </button>
          </div>
        </div>

        {/* Inline editor card */}
        {editing && (
          <form
            onSubmit={onSave}
            className="max-w-xl mx-auto mt-6 bg-gray-800 p-6 rounded-xl shadow-xl border border-gray-700 space-y-5"
          >
            <div>
              <label className="block text-sm text-gray-300 mb-2">
                Full Name
              </label>
              <input
                value={form.fullName}
                onChange={(e) =>
                  setForm((p) => ({ ...p, fullName: e.target.value }))
                }
                className="w-full px-4 py-2 rounded bg-gray-700 text-white border border-gray-600 focus:outline-none focus:border-teal-400"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-2">
                Email (read-only)
              </label>
              <input
                value={userData?.email || ""}
                readOnly
                className="w-full px-4 py-2 rounded bg-gray-900 text-gray-300 border border-gray-700 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-2">Mobile</label>
              <input
                value={form.mobile}
                onChange={(e) =>
                  setForm((p) => ({ ...p, mobile: e.target.value }))
                }
                placeholder="01XXXXXXXXX"
                className="w-full px-4 py-2 rounded bg-gray-700 text-white border border-gray-600 focus:outline-none focus:border-teal-400"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-2">
                Address
              </label>
              <input
                value={form.address}
                onChange={(e) =>
                  setForm((p) => ({ ...p, address: e.target.value }))
                }
                className="w-full px-4 py-2 rounded bg-gray-700 text-white border border-gray-600 focus:outline-none focus:border-teal-400"
              />
            </div>

            {saveError && (
              <p className="text-red-400 text-sm text-center font-medium">
                {saveError}
              </p>
            )}
            {saved && (
              <p className="text-green-400 text-sm text-center font-medium">
                Profile updated!
              </p>
            )}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="w-full bg-white text-black font-semibold py-2 px-4 rounded transition disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save Changes"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setSaveError("");
                  setSaved(false);
                }}
                className="w-full bg-gray-600 hover:bg-gray-500 text-white font-semibold py-2 px-4 rounded transition"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </main>

      <Footer />
    </>
  );
}
