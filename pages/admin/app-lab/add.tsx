import Head from "next/head";
import AdminLayout from "@/components/AdminLayout";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import {
  uploadAppLabImage,
  DUMMY_APP_IMAGES,
} from "@/lib/services/launchpadService";

const ADMIN_EMAIL =
  process.env.NEXT_PUBLIC_ADMIN_EMAIL || "hamim.leon@gmail.com";

export default function AddAppLab() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [form, setForm] = useState({
    name: "",
    subtitle: "",
    version: "",
    apkUrl: "",
    description: "",
    usages: "",
    warnings: "",
    images: "",
    isPublic: true,
  });

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      const ok = !!u && u.email === ADMIN_EMAIL;
      setReady(true);
      if (!ok) router.replace("/login");
    });
  }, [router]);

  const slugify = (s: string) =>
    s
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-");

  const normalizeDriveImage = (url: string) => {
    // already direct
    if (url.includes("uc?export=view")) return url;

    // convert /file/d/ID/view → uc?export=view&id=ID
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match?.[1]) {
      return `https://drive.google.com/uc?export=view&id=${match[1]}`;
    }

    return url; // fallback (cdn / imgur etc)
  };

  const submit = async (e: any) => {
    e.preventDefault();
    const slug = slugify(form.name);

    await setDoc(doc(db, "appLab", slug), {
      slug,
      name: form.name,
      subtitle: form.subtitle,
      version: form.version,
      platform: "android",
      apkUrl: form.apkUrl,
      description: form.description,
      usages: form.usages.split("\n").filter(Boolean),
      warnings: form.warnings.split("\n").filter(Boolean),
      images: form.images
        .split("\n")
        .map((i) => normalizeDriveImage(i.trim()))
        .filter(Boolean),

      isPublic: form.isPublic,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    router.push("/admin/app-lab/manage");
  };

  if (!ready) return null;

  const input =
    "w-full bg-gray-900 text-white px-4 py-3 rounded-lg border border-gray-700 focus:outline-none focus:border-teal-400 placeholder-gray-400";

  const textarea =
    "w-full bg-gray-900 text-white px-4 py-3 rounded-lg border border-gray-700 focus:outline-none focus:border-teal-400 placeholder-gray-400 resize-none";

  return (
    <AdminLayout>
      <Head>
        <title>Add App | App Lab</title>
      </Head>
        <main className="px-6 md:px-8 py-8 min-h-[calc(100vh-56px)] text-white">
        <h1 className="text-4xl font-bold text-teal-400 mb-10 text-center">
          Add App (App Lab)
        </h1>

        <form
          onSubmit={submit}
          className="max-w-4xl mx-auto bg-gray-800/80 backdrop-blur border border-gray-700 rounded-2xl p-8 space-y-10 shadow-2xl"
        >
          {/* App Info */}
          <section className="space-y-6">
            <h2 className="text-xl font-semibold text-teal-300">
              App Information
            </h2>

            <div className="space-y-4">
              <input
                className={input}
                placeholder="App Name"
                required
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />

              <input
                className={input}
                placeholder="Subtitle / Short Tagline"
                onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
              />

              <input
                className={input}
                placeholder="Version (e.g. 1.0.0)"
                required
                onChange={(e) => setForm({ ...form, version: e.target.value })}
              />
            </div>
          </section>

          {/* Description */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-teal-300">Description</h2>
            <textarea
              className={`${textarea} h-32`}
              placeholder="Describe what this app does..."
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
          </section>

          {/* Download */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-teal-300">Download</h2>
            <input
              className={input}
              placeholder="APK Google Drive direct download link"
              required
              onChange={(e) => setForm({ ...form, apkUrl: e.target.value })}
            />
            <p className="text-sm text-gray-400">
              Tip: Use a direct download link so users can download in one tap.
            </p>
          </section>

          {/* Usages & Warnings */}
          <section className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-teal-300">Usages</h2>
              <textarea
                className={`${textarea} h-32`}
                placeholder={`One usage per line\nExample:\n• Student practice\n• Admin testing`}
                onChange={(e) => setForm({ ...form, usages: e.target.value })}
              />
            </div>

            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-teal-300">
                Warnings / Notes
              </h2>
              <textarea
                className={`${textarea} h-32`}
                placeholder={`One warning per line\nExample:\n• Beta version\n• Android only`}
                onChange={(e) => setForm({ ...form, warnings: e.target.value })}
              />
            </div>
          </section>

          {/* Images */}
          <section className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
              <h2 className="text-xl font-semibold text-teal-300">
                App Images / Mockups
              </h2>
              <div className="flex gap-2">
                <label className="px-3 py-1.5 bg-teal-500/20 text-teal-300 hover:bg-teal-500/30 border border-teal-500/40 rounded text-xs font-mono font-bold cursor-pointer transition flex items-center gap-1.5">
                  {uploadingImage ? "Uploading..." : "📁 Upload Image File"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploadingImage}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        setUploadingImage(true);
                        const slug = form.name ? slugify(form.name) : "app";
                        const url = await uploadAppLabImage(file, slug);
                        setForm((prev) => ({
                          ...prev,
                          images: prev.images ? `${prev.images}\n${url}` : url,
                        }));
                      } catch (err: any) {
                        alert("Failed to upload image: " + err.message);
                      } finally {
                        setUploadingImage(false);
                      }
                    }}
                  />
                </label>

                <button
                  type="button"
                  onClick={() => {
                    const slug = form.name ? slugify(form.name) : "default";
                    const dummy = DUMMY_APP_IMAGES[slug] || DUMMY_APP_IMAGES.default;
                    setForm((prev) => ({
                      ...prev,
                      images: prev.images ? `${prev.images}\n${dummy}` : dummy,
                    }));
                  }}
                  className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded text-xs font-mono transition cursor-pointer"
                >
                  Insert Dummy Image
                </button>
              </div>
            </div>

            <textarea
              className={`${textarea} h-28`}
              placeholder={`Paste image links (one per line) or use the upload button above`}
              value={form.images}
              onChange={(e) => setForm({ ...form, images: e.target.value })}
            />
          </section>

          {/* Submit */}
          <button
            type="submit"
            className="w-full bg-teal-500 hover:bg-teal-600 transition text-black font-bold py-4 rounded-xl text-lg flex items-center justify-center gap-2"
          >
            🚀 Publish App
          </button>
        </form>
      </main>
    </AdminLayout>
  );
}
