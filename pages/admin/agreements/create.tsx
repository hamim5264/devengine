import React, { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import AdminLayout from "@/components/AdminLayout";
import HelixLoader from "@/components/HelixLoader";
import AgreementForm from "@/components/agreements/AgreementForm";
import { createDefaultAgreement } from "@/lib/agreements/templateEngine";
import { generateNextAgreementNumber } from "@/lib/services/agreementService";
import { AgreementRecord } from "@/types/agreement";

const ADMIN_EMAIL =
  process.env.NEXT_PUBLIC_ADMIN_EMAIL || "hamim.leon@gmail.com";

export default function CreateAgreementPage() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [initialData, setInitialData] = useState<AgreementRecord | null>(null);
  const [loading, setLoading] = useState(true);

  // Auth gate
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      const ok = !!user && user.email === ADMIN_EMAIL;
      setIsAdmin(ok);
      setAuthReady(true);
      if (!ok) router.replace("/login?redirect=/admin/agreements/create");
    });
    return () => unsub();
  }, [router]);

  // Initialize draft data
  useEffect(() => {
    if (!isAdmin) return;

    async function init() {
      try {
        setLoading(true);
        const nextNumber = await generateNextAgreementNumber();
        const draft = createDefaultAgreement("profit_participation", nextNumber, ADMIN_EMAIL);
        setInitialData(draft);
      } catch (err) {
        console.error("Init agreement failed:", err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [isAdmin]);

  if (!authReady || !isAdmin) {
    return (
      <div className="min-h-screen bg-[#07070d] flex flex-col items-center justify-center text-white">
        <HelixLoader size={48} color="#38f2ff" />
        <p className="mt-4 font-mono text-xs text-gray-400 tracking-widest uppercase">
          Verifying Admin Authorization…
        </p>
      </div>
    );
  }

  return (
    <AdminLayout>
      <Head>
        <title>Create Project Agreement — DevEngine Admin</title>
      </Head>

      <div className="min-h-screen bg-[#07070d] text-white flex flex-col font-sans">
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          {/* Breadcrumb Navigation */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono text-gray-500 mb-2">
                <Link
                  href="/admin/dashboard"
                  className="text-gray-400 hover:text-cyan-400 transition-colors"
                >
                  Dashboard
                </Link>
                <span>/</span>
                <Link
                  href="/admin/agreements"
                  className="text-gray-400 hover:text-cyan-400 transition-colors"
                >
                  Agreements
                </Link>
                <span>/</span>
                <span className="text-cyan-400 font-bold">Create New Agreement</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Draft Project Agreement & Contract
              </h1>
              <p className="text-xs sm:text-sm text-gray-400 mt-1 font-mono">
                Generate tailored legal agreements with dynamic terms, deliverable builders, and DevEngine CEO endorsement.
              </p>
            </div>

            <Link
              href="/admin/agreements"
              className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-gray-300 hover:text-white font-mono text-xs transition-all border border-white/[0.08] flex items-center gap-1.5 self-start sm:self-auto"
            >
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              <span>All Agreements</span>
            </Link>
          </div>

          {loading || !initialData ? (
            <div className="min-h-[40vh] flex flex-col items-center justify-center gap-3">
              <HelixLoader size={44} color="#38f2ff" />
              <p className="text-xs font-mono text-gray-400 uppercase tracking-wider">
                Initializing Agreement Template…
              </p>
            </div>
          ) : (
            <AgreementForm initialData={initialData} isEditing={false} />
          )}
        </main>
      </div>
    </AdminLayout>
  );
}
