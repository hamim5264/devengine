import React, { useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import AdminLayout from "@/components/AdminLayout";
import { useRouter } from "next/router";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import HelixLoader from "@/components/HelixLoader";
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
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: "",
    subtitle: "",
    version: "1.0.0",
    platform: "android",
    category: "AI",
    apkUrl: "",
    previewUrl: "",
    description: "",
    usages: "",
    warnings: "",
    devUsage: "",
    copyright: "",
    images: "",
    isPublic: true,
  });

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      const ok = !!u && u.email === ADMIN_EMAIL;
      setReady(true);
      if (!ok) router.replace("/login?redirect=/admin/app-lab/add");
    });
  }, [router]);

  const slugify = (s: string) =>
    s
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-");

  const normalizeDriveImage = (url: string) => {
    if (url.includes("uc?export=view")) return url;
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match?.[1]) {
      return `https://drive.google.com/uc?export=view&id=${match[1]}`;
    }
    return url;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    try {
      setSubmitting(true);
      const slug = slugify(form.name);

      await setDoc(doc(db, "appLab", slug), {
        slug,
        name: form.name.trim(),
        subtitle: form.subtitle.trim(),
        version: form.version.trim() || "1.0.0",
        platform: form.platform.trim() || "android",
        category: form.category.trim() || "AI",
        apkUrl: form.apkUrl.trim(),
        previewUrl: form.previewUrl.trim(),
        description: form.description.trim(),
        usages: form.usages
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
        warnings: form.warnings
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
        devUsage: form.devUsage.trim(),
        copyright: form.copyright.trim(),
        images: form.images
          ? form.images
              .split("\n")
              .map((i) => normalizeDriveImage(i.trim()))
              .filter(Boolean)
          : [DUMMY_APP_IMAGES.default],
        isPublic: form.isPublic,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      router.push("/admin/manage-launchpad");
    } catch (err: any) {
      alert("Failed to create app: " + (err?.message || "Unknown error"));
    } finally {
      setSubmitting(false);
    }
  };

  if (!ready) {
    return (
      <AdminLayout>
        <div className="min-h-screen bg-[#030712] flex items-center justify-center">
          <HelixLoader size={48} color="#38f2ff" text="AUTHENTICATING ADMIN..." />
        </div>
      </AdminLayout>
    );
  }

  const inputClass =
    "w-full bg-[#080e1a] border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-mono placeholder:text-gray-600 focus:border-teal-400 focus:ring-1 focus:ring-teal-400/40 outline-none transition";
  const textareaClass =
    "w-full bg-[#080e1a] border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-mono placeholder:text-gray-600 focus:border-teal-400 focus:ring-1 focus:ring-teal-400/40 outline-none transition resize-none leading-relaxed";

  return (
    <AdminLayout>
      <Head>
        <title>Add App | DevEngine App Lab</title>
      </Head>

      <main className="px-4 sm:px-8 py-8 max-w-5xl mx-auto text-white space-y-8">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div className="flex items-center gap-2 text-xs font-mono text-gray-400">
            <Link
              href="/admin/manage-launchpad"
              className="hover:text-teal-400 transition flex items-center gap-1.5"
            >
              ← Back to Manage Launchpad
            </Link>
            <span>/</span>
            <span className="text-white font-bold">Add New App</span>
          </div>
        </div>

        {/* Header Title */}
        <div>
          <h1 className="text-3xl sm:text-4xl font-black font-space tracking-tight text-white flex items-center gap-3">
            <span>Register App in Showroom</span>
            <span className="text-xs font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/30">
              CMS V2
            </span>
          </h1>
          <p className="text-sm font-mono text-gray-400 mt-1">
            Specify download Google Drive links, live preview demo URLs, developer guidelines &amp; copyright claims
          </p>
        </div>

        {/* Form Container */}
        <form
          onSubmit={submit}
          className="bg-[#0c101c] border border-white/10 rounded-3xl p-6 sm:p-10 space-y-8 shadow-2xl backdrop-blur-xl"
        >
          {/* Identity & Core Info */}
          <section className="space-y-4">
            <h2 className="text-lg font-space font-bold text-teal-400 flex items-center gap-2 border-b border-white/5 pb-2">
              <span className="w-2 h-2 rounded-full bg-teal-400" />
              1. Basic Identity
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-gray-300">App Name *</label>
                <input
                  className={inputClass}
                  placeholder="e.g. Dialogix AI"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono text-gray-300">Subtitle / Tagline</label>
                <input
                  className={inputClass}
                  placeholder="e.g. Intelligent conversational AI assistant"
                  value={form.subtitle}
                  onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-gray-300">Version</label>
                <input
                  className={inputClass}
                  placeholder="1.0.0"
                  required
                  value={form.version}
                  onChange={(e) => setForm({ ...form, version: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono text-gray-300">Platform</label>
                <input
                  className={inputClass}
                  placeholder="android, web, flutter"
                  value={form.platform}
                  onChange={(e) => setForm({ ...form, platform: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono text-gray-300">Category</label>
                <input
                  className={inputClass}
                  placeholder="AI, Productivity, Education"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                />
              </div>
            </div>
          </section>

          {/* Dedicated Download & Preview Links */}
          <section className="space-y-4 p-5 rounded-2xl bg-teal-500/5 border border-teal-500/20">
            <h2 className="text-lg font-space font-bold text-teal-300 flex items-center gap-2">
              <svg className="w-5 h-5 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              2. Download &amp; Preview Links
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-bold text-teal-300 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Google Drive / APK Direct Download Link
                </label>
                <input
                  className={inputClass}
                  placeholder="https://drive.google.com/uc?export=download&id=..."
                  value={form.apkUrl}
                  onChange={(e) => setForm({ ...form, apkUrl: e.target.value })}
                />
                <p className="text-[10px] font-mono text-gray-400">
                  Used directly by the &quot;Download APK&quot; button in the public showroom.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono text-cyan-300 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  Preview / Web Demo URL Link
                </label>
                <input
                  className={inputClass}
                  placeholder="https://example.com/demo or interactive preview"
                  value={form.previewUrl}
                  onChange={(e) => setForm({ ...form, previewUrl: e.target.value })}
                />
                <p className="text-[10px] font-mono text-gray-400">
                  External web showcase or interactive test URL.
                </p>
              </div>
            </div>
          </section>

          {/* Description */}
          <section className="space-y-2">
            <h2 className="text-lg font-space font-bold text-teal-400 flex items-center gap-2 border-b border-white/5 pb-2">
              <span className="w-2 h-2 rounded-full bg-teal-400" />
              3. Description &amp; Architecture
            </h2>
            <textarea
              className={`${textareaClass} h-28`}
              placeholder="Describe the application architecture, target audience, and engineering specs..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </section>

          {/* Developer Usage Notice (User Requested) */}
          <section className="space-y-3 p-5 rounded-2xl bg-[#09101f] border-2 border-[#38f2ff]/30">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-space font-bold text-[#38f2ff] flex items-center gap-2">
                <svg className="w-5 h-5 text-[#38f2ff]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
                Developer Usage &amp; Testing Warning Message (Details Page)
              </h2>
              <span className="text-[10px] font-mono text-cyan-300 uppercase px-2 py-0.5 rounded bg-[#38f2ff]/10">
                Notice Banner
              </span>
            </div>
            <textarea
              className="w-full bg-black/60 border border-white/10 rounded-xl p-3.5 text-xs text-cyan-200 font-mono focus:border-[#38f2ff] outline-none leading-relaxed h-28"
              placeholder="Instructions on how developers should execute, test, and sandbox this application..."
              value={form.devUsage}
              onChange={(e) => setForm({ ...form, devUsage: e.target.value })}
            />
            <p className="text-[10px] font-mono text-gray-400">
              Displayed prominently on the app details screen (replacing the download and preview buttons).
            </p>
          </section>

          {/* Copyright Claims (User Requested) */}
          <section className="space-y-3 p-5 rounded-2xl bg-indigo-950/20 border border-indigo-500/30">
            <h2 className="text-base font-space font-bold text-indigo-300 flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Copyright Claims &amp; Intellectual Property Notice
            </h2>
            <textarea
              className="w-full bg-black/60 border border-white/10 rounded-xl p-3.5 text-xs text-gray-200 font-sans focus:border-indigo-400 outline-none leading-relaxed h-20"
              placeholder="Copyright © 2026 DevEngine. All rights reserved. Intellectual property notice and distribution terms..."
              value={form.copyright}
              onChange={(e) => setForm({ ...form, copyright: e.target.value })}
            />
          </section>

          {/* Usages & Warnings */}
          <section className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <h2 className="text-sm font-mono font-bold text-teal-300">
                Target Usages (One per line)
              </h2>
              <textarea
                className={`${textareaClass} h-32`}
                placeholder={`Student practice\nAdmin testing\nAI prototyping`}
                value={form.usages}
                onChange={(e) => setForm({ ...form, usages: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <h2 className="text-sm font-mono font-bold text-amber-300">
                Warnings / Operating Notes (One per line)
              </h2>
              <textarea
                className={`${textareaClass} h-32`}
                placeholder={`Active internet connection required\nBeta testing release`}
                value={form.warnings}
                onChange={(e) => setForm({ ...form, warnings: e.target.value })}
              />
            </div>
          </section>

          {/* Image Upload & Dummy Buttons */}
          <section className="space-y-3">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
              <h2 className="text-sm font-mono font-bold text-teal-300">
                App Cover Image URL
              </h2>
              <div className="flex gap-2">
                <label className="px-3 py-1.5 bg-teal-500/20 text-teal-300 hover:bg-teal-500/30 border border-teal-500/40 rounded-lg text-xs font-mono font-bold cursor-pointer transition flex items-center gap-1.5">
                  {uploadingImage ? "Uploading..." : "📁 Upload Image"}
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
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 rounded-lg text-xs font-mono transition cursor-pointer"
                >
                  Insert Dummy Image
                </button>
              </div>
            </div>

            <textarea
              className={`${textareaClass} h-24`}
              placeholder="Paste direct image URLs or use the upload button above"
              value={form.images}
              onChange={(e) => setForm({ ...form, images: e.target.value })}
            />
          </section>

          {/* Publish Checkbox */}
          <div className="pt-2 border-t border-white/10">
            <label className="flex items-center gap-2 cursor-pointer font-mono text-xs text-gray-300">
              <input
                type="checkbox"
                checked={form.isPublic}
                onChange={(e) => setForm({ ...form, isPublic: e.target.checked })}
                className="w-4 h-4 rounded text-teal-500 focus:ring-teal-400"
              />
              <span>Publish live to Showroom immediately</span>
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-gradient-to-r from-teal-400 to-emerald-400 hover:from-teal-300 hover:to-emerald-300 transition text-black font-mono font-bold py-4 rounded-xl text-base flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(20,184,166,0.3)] disabled:opacity-50 cursor-pointer"
          >
            {submitting ? "Publishing App to Showroom…" : "🚀 Publish App to Showroom"}
          </button>
        </form>
      </main>
    </AdminLayout>
  );
}
