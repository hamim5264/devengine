import Head from "next/head";
import AdminLayout from "@/components/AdminLayout";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import HelixLoader from "@/components/HelixLoader";
import { AvailableCurrency, DEFAULT_CURRENCIES } from "@/types/currency";
import {
  getAvailableCurrencies,
  saveAvailableCurrencies,
} from "@/lib/services/currencyService";

const ADMIN_EMAIL =
  process.env.NEXT_PUBLIC_ADMIN_EMAIL || "hamim.leon@gmail.com";

export default function ManageCurrenciesPage() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currencies, setCurrencies] = useState<AvailableCurrency[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // New currency input fields
  const [newCode, setNewCode] = useState("");
  const [newSymbol, setNewSymbol] = useState("");
  const [newName, setNewName] = useState("");

  // Remove confirmation modal
  const [removeTargetCode, setRemoveTargetCode] = useState<string | null>(null);
  const [resetModalOpen, setResetModalOpen] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      const ok = !!user && user.email === ADMIN_EMAIL;
      setIsAdmin(ok);
      setAuthReady(true);
      if (!ok) router.replace("/login");
    });
    return () => unsub();
  }, [router]);

  useEffect(() => {
    if (!authReady || !isAdmin) return;

    (async () => {
      setLoading(true);
      try {
        const list = await getAvailableCurrencies();
        setCurrencies(list);
      } catch (err) {
        console.error("Failed to load currencies:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [authReady, isAdmin]);

  const handleAddCurrency = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(null);

    const code = newCode.trim().toUpperCase();
    const symbol = newSymbol.trim();
    const name = newName.trim();

    if (!code || !symbol) {
      setNotice({ type: "error", message: "Currency code and symbol are required." });
      return;
    }

    if (currencies.some((c) => c.code === code)) {
      setNotice({ type: "error", message: `Currency with code "${code}" already exists.` });
      return;
    }

    const updated = [
      ...currencies,
      {
        code,
        symbol,
        name: name || code,
        isDefault: false,
      },
    ];

    setSaving(true);
    try {
      await saveAvailableCurrencies(updated);
      setCurrencies(updated);
      setNewCode("");
      setNewSymbol("");
      setNewName("");
      setNotice({ type: "success", message: `Currency ${code} (${symbol}) enabled successfully!` });
      setTimeout(() => setNotice(null), 4000);
    } catch (err) {
      console.error(err);
      setNotice({ type: "error", message: "Failed to save currency. Please check permissions." });
    } finally {
      setSaving(false);
    }
  };

  const confirmRemoveCurrency = async () => {
    if (!removeTargetCode) return;
    const codeToDelete = removeTargetCode;

    if (codeToDelete === "BDT") {
      setNotice({ type: "error", message: "BDT is the primary base currency and cannot be deleted." });
      setRemoveTargetCode(null);
      return;
    }

    const updated = currencies.filter((c) => c.code !== codeToDelete);
    setSaving(true);
    try {
      await saveAvailableCurrencies(updated);
      setCurrencies(updated);
      setNotice({ type: "success", message: `Removed currency ${codeToDelete}.` });
      setRemoveTargetCode(null);
      setTimeout(() => setNotice(null), 4000);
    } catch (err) {
      console.error(err);
      setNotice({ type: "error", message: "Failed to delete currency." });
    } finally {
      setSaving(false);
    }
  };

  const confirmResetDefaults = async () => {
    setSaving(true);
    try {
      await saveAvailableCurrencies(DEFAULT_CURRENCIES);
      setCurrencies(DEFAULT_CURRENCIES);
      setNotice({ type: "success", message: "Reset to default currencies (BDT & USD)." });
      setResetModalOpen(false);
      setTimeout(() => setNotice(null), 4000);
    } catch (err) {
      console.error(err);
      setNotice({ type: "error", message: "Failed to reset currencies." });
    } finally {
      setSaving(false);
    }
  };

  if (!authReady || !isAdmin) {
    return (
      <AdminLayout title="Manage Currencies | DevEngine Admin">
        <main className="flex items-center justify-center min-h-[calc(100vh-56px)] bg-[#07070f]">
          <HelixLoader size={48} color="#14b8a6" />
        </main>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Manage Currencies | DevEngine Admin">
      <Head>
        <title>Manage Available Currencies | DevEngine Admin</title>
      </Head>

      <main className="max-w-7xl mx-auto px-5 sm:px-8 py-8 text-white space-y-7">
        {/* ── HEADER BAR ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/[0.06]">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <span className="text-[11px] font-semibold tracking-wider text-teal-400 uppercase bg-teal-400/10 px-2.5 py-0.5 rounded-full border border-teal-400/20">
                Commerce / Multi-Currency
              </span>
              <span className="flex items-center gap-1.5 text-[11px] text-gray-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Pricing Engine Active
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Manage Available Currencies
            </h1>
            <p className="text-xs text-gray-400 mt-1">
              Configure global currencies enabled across catalog checkout and project pricing tiers.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <Link
              href="/admin/manage-projects"
              className="px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-semibold text-gray-300 hover:text-white transition flex items-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              <span>Back to Projects</span>
            </Link>

            <button
              onClick={() => setResetModalOpen(true)}
              disabled={saving}
              className="px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-medium text-gray-400 hover:text-white transition cursor-pointer"
            >
              Reset to Defaults
            </button>
          </div>
        </div>

        {/* ── NOTIFICATIONS ── */}
        {notice && (
          <div
            className={`p-3.5 rounded-xl border flex items-center justify-between text-xs transition ${
              notice.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                : "bg-rose-500/10 border-rose-500/30 text-rose-300"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">
                {notice.type === "success" ? "check_circle" : "error"}
              </span>
              <span>{notice.message}</span>
            </div>
            <button
              onClick={() => setNotice(null)}
              className="text-gray-400 hover:text-white text-xs px-2 py-0.5"
            >
              ✕
            </button>
          </div>
        )}

        {/* ── MAIN 2-COLUMN LAYOUT ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-7">
          {/* Left Column (7 Cols): Active Currencies List */}
          <div className="lg:col-span-7 rounded-2xl bg-[#0c0c16] border border-white/[0.07] overflow-hidden flex flex-col">
            <div className="p-5 sm:px-6 sm:py-4.5 border-b border-white/[0.06] flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-sm font-bold text-white tracking-wide">
                    Active Available Currencies
                  </h2>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20">
                    {currencies.length} Enabled
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Currencies available for custom pricing in project catalog
                </p>
              </div>
            </div>

            {loading ? (
              <div className="py-20 flex justify-center">
                <HelixLoader size={40} color="#14b8a6" />
              </div>
            ) : (
              <div className="divide-y divide-white/[0.04] p-2 sm:p-3">
                {currencies.map((curr) => {
                  const isBase = curr.code === "BDT";

                  return (
                    <div
                      key={curr.code}
                      className="p-3 sm:p-3.5 rounded-xl hover:bg-white/[0.02] transition-colors flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-11 h-11 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-300 font-bold font-sans text-lg shrink-0">
                          {curr.symbol}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-sm tracking-tight font-sans">
                              {curr.code}
                            </span>
                            {isBase && (
                              <span className="bg-teal-500/15 text-teal-300 text-[10px] font-semibold px-2 py-0.5 rounded-md border border-teal-500/25">
                                BASE CURRENCY
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-gray-400 truncate block mt-0.5">
                            {curr.name}
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0">
                        {!isBase ? (
                          <button
                            onClick={() => setRemoveTargetCode(curr.code)}
                            disabled={saving}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-400 hover:text-white bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition cursor-pointer disabled:opacity-50"
                          >
                            Remove
                          </button>
                        ) : (
                          <span className="text-[11px] text-gray-500 flex items-center gap-1 font-medium pr-1">
                            <span className="material-symbols-outlined text-[13px]">lock</span>
                            <span>Locked</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column (5 Cols): Add New Currency Form */}
          <div className="lg:col-span-5 rounded-2xl bg-[#0c0c16] border border-white/[0.07] p-5 sm:p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="material-symbols-outlined text-teal-400 text-[18px]">
                  add_circle
                </span>
                <h2 className="text-sm font-bold text-white tracking-wide">
                  Add Currency
                </h2>
              </div>
              <p className="text-[11px] text-gray-400 mb-5 leading-relaxed">
                Add global currencies (e.g. EUR, GBP, INR) to enable multi-currency pricing across your products.
              </p>

              <form onSubmit={handleAddCurrency} className="space-y-4">
                {/* Currency Code */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-[0.1em] text-gray-300 mb-1.5">
                    Currency Code <span className="text-teal-400">*</span>
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="USD, EUR, GBP"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    className="w-full h-11 bg-black/40 border border-white/[0.08] focus:border-teal-400/50 rounded-xl px-3.5 text-xs text-white placeholder-gray-500 uppercase tracking-wide focus:outline-none transition"
                    required
                  />
                </div>

                {/* Currency Symbol */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-[0.1em] text-gray-300 mb-1.5">
                    Symbol <span className="text-teal-400">*</span>
                  </label>
                  <input
                    type="text"
                    maxLength={4}
                    placeholder="$, €, £, ৳"
                    value={newSymbol}
                    onChange={(e) => setNewSymbol(e.target.value)}
                    className="w-full h-11 bg-black/40 border border-white/[0.08] focus:border-teal-400/50 rounded-xl px-3.5 text-xs text-white placeholder-gray-500 focus:outline-none transition"
                    required
                  />
                </div>

                {/* Full Name */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-[0.1em] text-gray-300 mb-1.5">
                    Currency Name <span className="text-gray-500 font-normal text-[10px]">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Euro, British Pound"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full h-11 bg-black/40 border border-white/[0.08] focus:border-teal-400/50 rounded-xl px-3.5 text-xs text-white placeholder-gray-500 focus:outline-none transition"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full h-11 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-1.5 shadow-lg shadow-teal-500/15 cursor-pointer disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[16px]">add</span>
                    <span>{saving ? "Saving..." : "Add Currency"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>

      {/* ── CUSTOM REMOVE CURRENCY MODAL ── */}
      {removeTargetCode && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-[#0c0c16] border border-rose-500/30 rounded-3xl p-6 sm:p-7 shadow-2xl text-center space-y-4">
            <button
              onClick={() => setRemoveTargetCode(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-gray-400 hover:text-white flex items-center justify-center transition cursor-pointer"
            >
              ✕
            </button>

            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-rose-400 flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-3xl">delete</span>
            </div>

            <div>
              <h3 className="text-xl font-bold text-white tracking-tight">
                Remove Currency {removeTargetCode}?
              </h3>
              <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
                Existing catalog projects will keep their saved pricing in {removeTargetCode}. Are you sure you want to remove it from available options?
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRemoveTargetCode(null)}
                className="flex-1 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-gray-300 hover:text-white text-xs font-semibold border border-white/[0.08] transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmRemoveCurrency}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-lg shadow-rose-600/25 cursor-pointer disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[16px]">delete</span>
                <span>{saving ? "Removing..." : "Remove Currency"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── RESET DEFAULTS MODAL ── */}
      {resetModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-[#0c0c16] border border-white/[0.1] rounded-3xl p-6 sm:p-7 shadow-2xl text-center space-y-4">
            <button
              onClick={() => setResetModalOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-gray-400 hover:text-white flex items-center justify-center transition cursor-pointer"
            >
              ✕
            </button>

            <div className="w-14 h-14 rounded-2xl bg-teal-500/10 border border-teal-500/25 text-teal-400 flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-3xl">restart_alt</span>
            </div>

            <div>
              <h3 className="text-xl font-bold text-white tracking-tight">
                Reset to Default Currencies?
              </h3>
              <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
                This will reset the active currencies list back to the standard defaults: <strong>BDT (৳)</strong> and <strong>USD ($)</strong>.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setResetModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-gray-300 hover:text-white text-xs font-semibold border border-white/[0.08] transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmResetDefaults}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-lg shadow-teal-500/20 cursor-pointer disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[16px]">check</span>
                <span>{saving ? "Resetting..." : "Reset to Defaults"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
