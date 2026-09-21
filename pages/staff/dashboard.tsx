import Head from "next/head";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getStaffByUid } from "@/lib/services/staffService";
import StaffLayout from "@/components/StaffLayout";
import HelixLoader from "@/components/HelixLoader";
import type { StaffMember } from "@/types/staff";
import { STAFF_TYPE_LABELS, STAFF_TYPE_COLORS, MODULE_CONFIG } from "@/types/staff";

export default function StaffDashboard() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [staffData, setStaffData] = useState<StaffMember | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/staff");
        return;
      }
      const staff = await getStaffByUid(user.uid);
      if (!staff || staff.status !== "active") {
        router.replace("/staff");
        return;
      }
      setStaffData(staff);
      setAuthReady(true);
    });
    return () => unsub();
  }, [router]);

  if (!authReady || !staffData) {
    return (
      <div className="min-h-screen bg-[#07070f] flex items-center justify-center">
        <HelixLoader size={44} color="#a855f7" />
      </div>
    );
  }

  const typeColor = STAFF_TYPE_COLORS[staffData.staffType];

  // Build quick-access module cards for allowed modules
  const moduleCards = staffData.allowedModules
    .map((key) => {
      const cfg = MODULE_CONFIG[key];
      if (!cfg) return null;
      // Map module key to first staff route
      const routeMap: Record<string, string> = {
        overview: "/staff/dashboard",
        commerce: "/staff/manage-orders",
        projects: "/staff/manage-projects",
        content_cms: "/staff/manage-landing",
        social_network: "/staff/manage-socials",
        legal: "/staff/manage-terms",
        system: "/staff/manage-maintenance",
      };
      return { ...cfg, key, href: routeMap[key] || "/staff/dashboard" };
    })
    .filter(Boolean) as Array<{ label: string; icon: string; color: string; description: string; key: string; href: string }>;

  return (
    <StaffLayout title="Dashboard | Staff Portal">
      <Head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
        />
      </Head>

      <div className="min-h-screen bg-[#07070f] p-4 sm:p-6 lg:p-8">
        <main className="max-w-6xl mx-auto space-y-6">
          {/* ── Welcome Card ── */}
          <div
            className="rounded-3xl p-6 sm:p-8 border backdrop-blur-xl shadow-2xl relative overflow-hidden"
            style={{
              background: "linear-gradient(135deg, rgba(168,85,247,0.08) 0%, rgba(6,182,212,0.05) 100%)",
              borderColor: "rgba(168,85,247,0.2)",
            }}
          >
            {/* Background glow */}
            <div
              className="absolute top-0 right-0 w-64 h-64 pointer-events-none"
              style={{
                background: "radial-gradient(circle, rgba(168,85,247,0.1) 0%, transparent 60%)",
              }}
            />

            <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500/20 to-cyan-500/20 border border-violet-500/30 flex items-center justify-center flex-shrink-0 shadow-lg">
                  <span className="text-2xl font-bold text-white">
                    {staffData.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold font-['Space_Grotesk'] text-white">
                    Welcome back, {staffData.name.split(" ")[0]}
                  </h1>
                  <div className="flex items-center gap-2.5 mt-1.5">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-mono font-medium ${typeColor.bg} ${typeColor.text} ${typeColor.border}`}
                    >
                      <span className="material-symbols-outlined text-xs">badge</span>
                      {STAFF_TYPE_LABELS[staffData.staffType]}
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-mono font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Active
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-right hidden sm:block">
                <p className="text-[11px] text-gray-400 font-mono">
                  {new Date().toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
                <p className="text-[10px] text-gray-500 font-mono mt-0.5">
                  {staffData.email}
                </p>
              </div>
            </div>
          </div>

          {/* ── Quick Stats ── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-[#0c0c16]/95 border border-white/[0.08] backdrop-blur-xl shadow-xl">
              <span className="text-[11px] font-mono text-violet-400 uppercase tracking-wider">Modules Access</span>
              <p className="text-2xl font-bold font-mono text-white mt-1">
                {staffData.allowedModules.length}
              </p>
              <p className="text-[11px] text-gray-500 font-mono mt-0.5">of 7 total</p>
            </div>
            <div className="p-5 rounded-2xl bg-[#0c0c16]/95 border border-white/[0.08] backdrop-blur-xl shadow-xl">
              <span className="text-[11px] font-mono text-cyan-400 uppercase tracking-wider">Account Status</span>
              <p className="text-lg font-bold font-mono text-emerald-300 mt-1 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Active
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-[#0c0c16]/95 border border-white/[0.08] backdrop-blur-xl shadow-xl col-span-2 sm:col-span-1">
              <span className="text-[11px] font-mono text-amber-400 uppercase tracking-wider">Member Since</span>
              <p className="text-lg font-bold font-mono text-white mt-1">
                {new Date(staffData.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>

          {/* ── Module Quick Access ── */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-violet-400 text-lg">apps</span>
              <h2 className="text-base font-bold font-['Space_Grotesk'] text-white">
                Your Modules
              </h2>
              <span className="text-[10px] font-mono text-gray-500 bg-white/[0.04] px-2 py-0.5 rounded-md">
                {moduleCards.length} assigned
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {moduleCards.map((mod) => (
                <Link
                  key={mod.key}
                  href={mod.href}
                  className="group flex items-center gap-4 p-4 rounded-2xl bg-[#0c0c16]/95 border border-white/[0.08] hover:border-white/[0.15] transition-all shadow-lg hover:shadow-xl"
                >
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-all group-hover:scale-110"
                    style={{ background: `${mod.color}15`, color: mod.color }}
                  >
                    <span className="material-symbols-outlined text-xl">{mod.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-bold text-white block group-hover:text-violet-300 transition-colors">
                      {mod.label}
                    </span>
                    <span className="text-[11px] text-gray-500 block mt-0.5 truncate">
                      {mod.description}
                    </span>
                  </div>
                  <span className="material-symbols-outlined text-gray-600 group-hover:text-violet-400 text-base transition-colors shrink-0">
                    arrow_forward
                  </span>
                </Link>
              ))}
            </div>
          </div>

          {/* ── Info Footer ── */}
          <div className="p-4 rounded-2xl bg-[#0c0c16]/95 border border-white/[0.08] flex items-start gap-3">
            <span className="material-symbols-outlined text-violet-400 text-lg mt-0.5 shrink-0">info</span>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              You can only access modules assigned by your administrator. If you need access to additional modules, please contact the DevEngine admin team.
            </p>
          </div>
        </main>
      </div>
    </StaffLayout>
  );
}
