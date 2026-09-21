import React, { useEffect, useState, useMemo } from "react";
import { NetworkHub, NetworkMetrics } from "@/types/network";
import {
  getNetworkHubs,
  DEFAULT_NETWORK_METRICS,
} from "@/lib/services/networkService";

interface NetworkTopologyBodyProps {
  initialHubs?: NetworkHub[];
}

export default function NetworkTopologyBody({
  initialHubs,
}: NetworkTopologyBodyProps) {
  const [hubs, setHubs] = useState<NetworkHub[]>(initialHubs || []);
  const [metrics, setMetrics] = useState<NetworkMetrics>(DEFAULT_NETWORK_METRICS);
  const [loading, setLoading] = useState<boolean>(!initialHubs);
  const [hoveredHub, setHoveredHub] = useState<NetworkHub | null>(null);

  // Load hubs on mount
  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const data = await getNetworkHubs();
        if (isMounted) {
          setHubs(data);
          // Calculate dynamic metrics based on loaded hubs
          const activeCount = data.filter((h) => h.isOnline && h.status === "ONLINE").length;
          setMetrics((prev) => ({
            ...prev,
            activeNodes: activeCount,
            totalNodes: data.length,
          }));
          setLoading(false);
        }
      } catch (err) {
        console.warn("Failed to fetch network hubs:", err);
        if (isMounted) setLoading(false);
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, []);

  // Subtle real-time telemetry tick (simulating live routing throughput & latency jitter)
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics((prev) => {
        const jitter = Math.floor(Math.random() * 5) - 2; // -2ms to +2ms
        const newLat = Math.max(18, Math.min(32, prev.avgLatencyMs + jitter));
        const tbJitter = (Math.random() * 0.2 - 0.1).toFixed(1);
        const baseTB = 4.2 + parseFloat(tbJitter);
        return {
          ...prev,
          avgLatencyMs: newLat,
          throughput: `${baseTB.toFixed(1)} TB/s`,
        };
      });
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  const getStatusBadge = (hub: NetworkHub) => {
    switch (hub.status) {
      case "ONLINE":
        return {
          badgeStyle:
            "bg-[#38f2ff]/10 text-[#38f2ff] border border-[#38f2ff]/30 shadow-[0_0_10px_rgba(56,242,255,0.15)]",
          dotColor: "bg-[#38f2ff] shadow-[0_0_10px_#38f2ff]",
          label: "ONLINE",
          textColor: "text-[#38f2ff]",
        };
      case "SYNCING":
        return {
          badgeStyle:
            "bg-[#dcd8ff]/10 text-[#c4c0ff] border border-[#c4c0ff]/30 shadow-[0_0_10px_rgba(196,192,255,0.15)]",
          dotColor: "bg-[#fbf7ff] shadow-[0_0_10px_#fbf7ff] animate-pulse",
          label: "SYNCING",
          textColor: "text-[#c4c0ff]",
        };
      case "MAINTENANCE":
      case "DEGRADED":
      default:
        return {
          badgeStyle:
            "bg-[#ffb4ab]/10 text-[#ffb4ab] border border-[#ffb4ab]/30 shadow-[0_0_10px_rgba(255,180,171,0.15)]",
          dotColor: "bg-[#ffb4ab] shadow-[0_0_10px_#ffb4ab]",
          label: "MAINTENANCE",
          textColor: "text-[#ffb4ab]",
        };
    }
  };

  // Pre-calculated node coordinates on the SVG map (viewBox 0 0 1000 500)
  const mapNodes = useMemo(() => [
    { id: "us-west", name: "US West (Silicon Valley)", x: 190, y: 190, status: "ONLINE", ping: "14ms" },
    { id: "us-east", name: "US East (Virginia)", x: 280, y: 195, status: "ONLINE", ping: "18ms" },
    { id: "sa-east", name: "South America (São Paulo)", x: 370, y: 380, status: "MAINTENANCE", ping: "68ms" },
    { id: "eu-west", name: "Europe (Frankfurt/London)", x: 515, y: 160, status: "ONLINE", ping: "24ms" },
    { id: "ap-south", name: "Asia South (Mumbai)", x: 690, y: 245, status: "SYNCING", ping: "42ms" },
    { id: "ap-east", name: "East Asia (Tokyo)", x: 845, y: 195, status: "ONLINE", ping: "31ms" },
    { id: "ap-se", name: "SE Asia (Singapore)", x: 760, y: 300, status: "ONLINE", ping: "36ms" },
    { id: "ap-oceania", name: "Oceania (Sydney)", x: 870, y: 400, status: "ONLINE", ping: "58ms" },
  ], []);

  // Curved mesh connections
  const mapArcs = useMemo(() => [
    { from: [190, 190], to: [280, 195] },
    { from: [280, 195], to: [370, 380] },
    { from: [280, 195], to: [515, 160] },
    { from: [515, 160], to: [690, 245] },
    { from: [690, 245], to: [760, 300] },
    { from: [760, 300], to: [845, 195] },
    { from: [760, 300], to: [870, 400] },
    { from: [845, 195], to: [190, 190] }, // Trans-Pacific link
  ], []);

  const activeNodePercent = Math.round(
    (metrics.activeNodes / Math.max(1, metrics.totalNodes)) * 100
  );

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 pt-24 pb-20 text-[#dde2f3] select-none">
      {/* Top Header */}
      <div className="mb-10 sm:mb-12">
        <h1 className="font-space-grotesk text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight text-[#38f2ff] drop-shadow-[0_0_20px_rgba(56,242,255,0.4)] mb-2">
          GLOBAL_NETWORK_TOPOLOGY
        </h1>
        <p className="font-jetbrains text-xs sm:text-sm text-[#849495] tracking-wider uppercase font-medium">
          Real-time status of routing nodes and data throughput.
        </p>
      </div>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ============================================================ */}
        {/* LEFT: Live Connectivity World Map (Spans 8 cols) */}
        {/* ============================================================ */}
        <div className="lg:col-span-8 rounded-2xl bg-[#08111f]/80 border border-[#38f2ff]/20 backdrop-blur-xl p-5 sm:p-6 flex flex-col justify-between shadow-[0_0_35px_rgba(56,242,255,0.06)] relative overflow-hidden group">
          {/* Card Header */}
          <div className="flex justify-between items-center mb-4 z-10">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#38f2ff] animate-ping" />
              <h2 className="font-jetbrains text-xs sm:text-sm tracking-widest text-[#849495] uppercase font-semibold">
                LIVE_CONNECTIVITY_MAP
              </h2>
            </div>
            <span className="font-jetbrains text-xs tracking-wider text-[#38f2ff] border border-[#38f2ff]/30 px-2.5 py-1 bg-[#38f2ff]/10 rounded shadow-[0_0_10px_rgba(56,242,255,0.2)]">
              LAT: {metrics.avgLatencyMs}ms AVG
            </span>
          </div>

          {/* Interactive Futuristic Holographic Map */}
          <div className="relative w-full h-[340px] sm:h-[400px] md:h-[440px] rounded-xl bg-black/80 border border-white/5 overflow-hidden flex items-center justify-center">
            {/* Ambient Radial Mesh Glow */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(56,242,255,0.08)_0%,transparent_70%)] pointer-events-none" />

            {/* SVG Interactive World Topology */}
            <svg
              viewBox="0 0 1000 500"
              className="w-full h-full object-contain filter drop-shadow-[0_0_12px_rgba(56,242,255,0.2)]"
            >
              <defs>
                {/* Linear gradient for arcs */}
                <linearGradient id="arcGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#38f2ff" stopOpacity="0.8" />
                  <stop offset="50%" stopColor="#9ecaff" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#38f2ff" stopOpacity="0.8" />
                </linearGradient>

                {/* Packet Glow Filter */}
                <filter id="glow">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Stylized Minimal Continental Shapes */}
              <g fill="#0c1628" stroke="#1d2e47" strokeWidth="1" opacity="0.85">
                {/* North America */}
                <path d="M 120 90 Q 210 60 300 80 Q 320 140 270 230 Q 210 240 180 180 Q 120 130 120 90 Z" />
                {/* South America */}
                <path d="M 280 270 Q 370 280 390 340 Q 360 450 310 470 Q 270 380 280 270 Z" />
                {/* Europe */}
                <path d="M 460 90 Q 560 80 580 140 Q 540 200 480 190 Q 450 140 460 90 Z" />
                {/* Africa */}
                <path d="M 470 210 Q 580 210 590 300 Q 550 420 480 390 Q 440 280 470 210 Z" />
                {/* Asia */}
                <path d="M 600 70 Q 820 60 880 160 Q 840 280 720 280 Q 640 200 600 70 Z" />
                {/* Australia */}
                <path d="M 790 340 Q 900 330 910 410 Q 840 450 780 410 Q 770 360 790 340 Z" />
              </g>

              {/* Connecting Mesh Arcs */}
              {mapArcs.map((arc, i) => {
                const [x1, y1] = arc.from;
                const [x2, y2] = arc.to;
                // Compute bezier control point
                const cx = (x1 + x2) / 2;
                const cy = (y1 + y2) / 2 - 35;
                const pathData = `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;

                return (
                  <g key={i}>
                    {/* Base Arc Line */}
                    <path
                      d={pathData}
                      fill="none"
                      stroke="rgba(56, 242, 255, 0.25)"
                      strokeWidth="1.5"
                      strokeDasharray="4 4"
                    />
                    {/* Pulsing Animated Overlay Arc */}
                    <path
                      d={pathData}
                      fill="none"
                      stroke="url(#arcGlow)"
                      strokeWidth="2"
                      className="opacity-75"
                    />
                    {/* Traveling Data Packet Node */}
                    <circle r="3.5" fill="#e6fdff" filter="url(#glow)">
                      <animateMotion
                        path={pathData}
                        dur={`${2.8 + (i % 3) * 0.7}s`}
                        repeatCount="indefinite"
                        keyPoints="0;1"
                        keyTimes="0;1"
                      />
                    </circle>
                  </g>
                );
              })}

              {/* Interactive Global Nodes */}
              {mapNodes.map((node) => {
                const isHovered = hoveredHub?.name === node.name;
                const isOnline = node.status === "ONLINE";
                const isSync = node.status === "SYNCING";

                return (
                  <g
                    key={node.id}
                    className="cursor-pointer transition-transform duration-200"
                    onMouseEnter={() =>
                      setHoveredHub({
                        id: node.id,
                        name: node.name,
                        regionCode: node.id.toUpperCase(),
                        uptimeText: isOnline ? "99.99% UPTIME" : "DATA REPLICATION",
                        status: node.status as any,
                        latencyMs: parseInt(node.ping, 10) || 24,
                        loadPercent: 65,
                        order: 0,
                        isOnline,
                      })
                    }
                    onMouseLeave={() => setHoveredHub(null)}
                  >
                    {/* Halo Pulse */}
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={isHovered ? 14 : 9}
                      fill="none"
                      stroke={
                        isOnline
                          ? "rgba(56, 242, 255, 0.4)"
                          : isSync
                          ? "rgba(196, 192, 255, 0.4)"
                          : "rgba(255, 180, 171, 0.4)"
                      }
                      strokeWidth="1.5"
                      className="animate-ping"
                      style={{ animationDuration: "3s" }}
                    />

                    {/* Outer Ring */}
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={isHovered ? 8 : 5.5}
                      fill={
                        isOnline
                          ? "rgba(56, 242, 255, 0.2)"
                          : isSync
                          ? "rgba(196, 192, 255, 0.2)"
                          : "rgba(255, 180, 171, 0.2)"
                      }
                      stroke={
                        isOnline
                          ? "#38f2ff"
                          : isSync
                          ? "#c4c0ff"
                          : "#ffb4ab"
                      }
                      strokeWidth="1.5"
                    />

                    {/* Center Dot */}
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={isHovered ? 4 : 2.5}
                      fill="#ffffff"
                    />

                    {/* Node Text Label */}
                    <text
                      x={node.x}
                      y={node.y - 12}
                      textAnchor="middle"
                      fill={isHovered ? "#38f2ff" : "#849495"}
                      fontSize="9"
                      fontFamily="JetBrains Mono, monospace"
                      fontWeight="bold"
                      className="transition-colors pointer-events-none"
                    >
                      {node.ping}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Hover Tooltip Overlay */}
            {hoveredHub && (
              <div className="absolute top-4 left-4 pointer-events-none bg-[#0a1220]/90 border border-[#38f2ff]/40 backdrop-blur-md rounded-lg p-3 shadow-[0_0_20px_rgba(56,242,255,0.25)] anim-fade">
                <div className="font-jetbrains text-[10px] text-[#38f2ff] uppercase tracking-wider font-bold">
                  {hoveredHub.regionCode} // ROUTING HUB
                </div>
                <div className="font-space-grotesk text-sm font-semibold text-white mt-0.5">
                  {hoveredHub.name}
                </div>
                <div className="flex items-center gap-3 mt-2 font-jetbrains text-xs">
                  <span className="text-[#849495]">PING: {hoveredHub.latencyMs}ms</span>
                  <span
                    className={
                      hoveredHub.status === "ONLINE"
                        ? "text-[#38f2ff]"
                        : hoveredHub.status === "SYNCING"
                        ? "text-[#c4c0ff]"
                        : "text-[#ffb4ab]"
                    }
                  >
                    ● {hoveredHub.status}
                  </span>
                </div>
              </div>
            )}

            {/* Bottom Cyber Telemetry Ribbon */}
            <div className="absolute bottom-3 left-4 right-4 flex justify-between items-center text-[10px] font-jetbrains text-[#849495]/80 pointer-events-none">
              <span className="hidden sm:inline">MESH PROTOCOL: ACTIVE</span>
              <span>CIPHER: AES-GCM-256</span>
              <span>PACKETS: 14.8M / SEC</span>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* RIGHT: Key Metrics (Spans 4 cols) */}
        {/* ============================================================ */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Metric 1: Active Nodes */}
          <div className="flex-1 rounded-2xl bg-[#08111f]/80 border border-[#38f2ff]/20 backdrop-blur-xl p-6 sm:p-7 flex flex-col justify-between shadow-[0_0_35px_rgba(56,242,255,0.06)] hover:border-[#38f2ff]/40 transition-all duration-300">
            <div>
              <span className="font-jetbrains text-xs tracking-widest text-[#849495] uppercase font-semibold">
                ACTIVE NODES
              </span>
              <div className="font-space-grotesk text-4xl sm:text-5xl font-bold text-[#38f2ff] drop-shadow-[0_0_14px_rgba(56,242,255,0.6)] mt-2">
                {metrics.activeNodes}/{metrics.totalNodes}
              </div>
            </div>

            {/* Cyber Progress Line */}
            <div className="w-full mt-6">
              <div className="w-full h-1.5 bg-[#1a2333] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#38f2ff] rounded-full shadow-[0_0_12px_#38f2ff] transition-all duration-500"
                  style={{ width: `${activeNodePercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Metric 2: Throughput */}
          <div className="flex-1 rounded-2xl bg-[#08111f]/80 border border-[#38f2ff]/20 backdrop-blur-xl p-6 sm:p-7 flex flex-col justify-between shadow-[0_0_35px_rgba(56,242,255,0.06)] hover:border-[#38f2ff]/40 transition-all duration-300">
            <div>
              <span className="font-jetbrains text-xs tracking-widest text-[#849495] uppercase font-semibold">
                THROUGHPUT
              </span>
              <div className="font-space-grotesk text-4xl sm:text-5xl font-bold text-[#fbf7ff] mt-2">
                {metrics.throughput}
              </div>
            </div>
            <div className="font-jetbrains text-xs text-[#849495] mt-4 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-base text-[#38f2ff]">
                trending_up
              </span>
              <span className="text-[#38f2ff] font-semibold">
                {metrics.throughputChange}
              </span>
            </div>
          </div>

          {/* Metric 3: Packet Loss */}
          <div className="flex-1 rounded-2xl bg-[#08111f]/80 border border-[#38f2ff]/20 backdrop-blur-xl p-6 sm:p-7 flex flex-col justify-between shadow-[0_0_35px_rgba(56,242,255,0.06)] hover:border-[#38f2ff]/40 transition-all duration-300">
            <div>
              <span className="font-jetbrains text-xs tracking-widest text-[#849495] uppercase font-semibold">
                PACKET LOSS
              </span>
              <div className="font-space-grotesk text-4xl sm:text-5xl font-bold text-[#38f2ff] drop-shadow-[0_0_14px_rgba(56,242,255,0.5)] mt-2">
                {metrics.packetLoss}
              </div>
            </div>
            <div className="font-jetbrains text-xs tracking-widest text-[#849495] uppercase font-semibold mt-4">
              {metrics.packetLossState}
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* BOTTOM: Regional Hubs Status (Spans 12 cols) */}
        {/* ============================================================ */}
        <div className="lg:col-span-12 rounded-2xl bg-[#08111f]/80 border border-[#38f2ff]/20 backdrop-blur-xl p-6 sm:p-8 mt-4 shadow-[0_0_35px_rgba(56,242,255,0.06)]">
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-jetbrains text-xs sm:text-sm tracking-widest text-[#849495] uppercase font-semibold">
              REGIONAL_HUB_STATUS
            </h2>
            <span className="font-jetbrains text-[11px] text-[#38f2ff]/80">
              {hubs.length} NODES CONFIGURED
            </span>
          </div>

          {/* Loading Skeleton */}
          {loading && (
            <div className="space-y-4 animate-pulse">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-16 rounded-xl bg-[#0e1626]/60 border border-white/5"
                />
              ))}
            </div>
          )}

          {/* Hubs Table List */}
          {!loading && (
            <div className="flex flex-col divide-y divide-white/5">
              {hubs.map((hub) => {
                const { badgeStyle, dotColor, label, textColor } = getStatusBadge(hub);

                return (
                  <div
                    key={hub.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between py-4 sm:py-5 px-3 -mx-3 rounded-xl hover:bg-white/[0.03] hover:border hover:border-[#38f2ff]/20 transition-all duration-200 group gap-3 sm:gap-4"
                  >
                    {/* Col 1: Server Icon & Region Name */}
                    <div className="flex items-center gap-3.5 sm:w-1/4">
                      <span className="material-symbols-outlined text-xl text-[#849495] group-hover:text-[#38f2ff] transition-colors flex-shrink-0">
                        dns
                      </span>
                      <span className="font-space-grotesk text-base sm:text-lg font-medium text-[#dde2f3] group-hover:text-white transition-colors">
                        {hub.name}
                      </span>
                    </div>

                    {/* Col 2: Region Code */}
                    <div className="font-jetbrains text-xs text-[#849495] sm:w-1/4 uppercase tracking-wider">
                      {hub.regionCode}
                    </div>

                    {/* Col 3: Uptime / Activity Badge */}
                    <div className="sm:w-1/4">
                      <span
                        className={`inline-block font-jetbrains text-[10px] sm:text-xs uppercase font-bold tracking-widest px-3 py-1 rounded ${badgeStyle}`}
                      >
                        {hub.uptimeText}
                      </span>
                    </div>

                    {/* Col 4: Status Indicator & Label */}
                    <div className="flex items-center sm:justify-end gap-2.5 sm:w-1/4">
                      <span className={`w-2 h-2 rounded-full ${dotColor}`} />
                      <span
                        className={`font-jetbrains text-xs font-bold tracking-wider ${textColor}`}
                      >
                        {label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
