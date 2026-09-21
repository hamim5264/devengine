import React, { useEffect, useRef, useState, useMemo } from "react";
import Image from "next/image";
import * as THREE from "three";
import { MaintenanceConfig, DEFAULT_MAINTENANCE_CONFIG } from "@/types/maintenance";
import UpdateLogBody from "@/components/update-log/UpdateLogBody";
import NetworkTopologyBody from "@/components/network/NetworkTopologyBody";

interface MaintenanceScreenProps {
  config?: MaintenanceConfig;
  onRefresh?: () => void;
  isAdminPreview?: boolean;
}

export default function MaintenanceScreen({
  config = DEFAULT_MAINTENANCE_CONFIG,
  onRefresh,
  isAdminPreview = false,
}: MaintenanceScreenProps) {
  const [activeTab, setActiveTab] = useState<"system_status" | "upgrade_logs" | "network">("system_status");
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  // Time remaining states
  const [timeLeft, setTimeLeft] = useState<{
    days: string;
    hours: string;
    minutes: string;
    seconds: string;
    totalMs: number;
  }>({
    days: "00",
    hours: "00",
    minutes: "00",
    seconds: "00",
    totalMs: 0,
  });

  // Calculate countdown
  useEffect(() => {
    const updateCountdown = () => {
      const targetTime = config.targetEndTime
        ? new Date(config.targetEndTime).getTime()
        : Date.now() + 2 * 24 * 60 * 60 * 1000;

      const diff = targetTime - Date.now();

      if (diff <= 0) {
        setTimeLeft({
          days: "00",
          hours: "00",
          minutes: "00",
          seconds: "00",
          totalMs: 0,
        });
        return;
      }

      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const m = Math.floor((diff / (1000 * 60)) % 60);
      const s = Math.floor((diff / 1000) % 60);

      setTimeLeft({
        days: String(d).padStart(2, "0"),
        hours: String(h).padStart(2, "0"),
        minutes: String(m).padStart(2, "0"),
        seconds: String(s).padStart(2, "0"),
        totalMs: diff,
      });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [config.targetEndTime]);

  // Handle FORCE_SYNC action
  const handleForceSync = () => {
    setIsSyncing(true);
    setSyncNotice("SYNCING ARCHITECTURE PROTOCOLS…");
    if (onRefresh) onRefresh();

    setTimeout(() => {
      setIsSyncing(false);
      setSyncNotice("TELEMETRY VERIFIED & SYNCED");
      setTimeout(() => setSyncNotice(null), 3000);
    }, 1200);
  };

  // WebGL Shader Background Canvas Ref
  const shaderCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = shaderCanvasRef.current;
    if (!canvas) return;

    let animationFrameId: number;
    const gl = (canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null;
    if (!gl) return;

    function syncSize() {
      if (!canvas) return;
      const w = canvas.clientWidth || 1280;
      const h = canvas.clientHeight || 720;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    }
    syncSize();

    const resizeObserver = new ResizeObserver(syncSize);
    resizeObserver.observe(canvas);

    const vs = `attribute vec2 a_position;
varying vec2 v_texCoord;
void main() {
  v_texCoord = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

    const fs = `precision highp float;
varying vec2 v_texCoord;
uniform float u_time;
uniform vec2 u_resolution;

float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

void main() {
    vec2 uv = v_texCoord;
    vec2 p = (uv - 0.5) * u_resolution.xy / min(u_resolution.x, u_resolution.y);
    
    vec3 color = vec3(0.031, 0.047, 0.078);
    
    float aurora = sin(p.x * 2.0 + u_time * 0.2) * 0.5 + 0.5;
    color += vec3(0.0, 0.949, 1.0) * 0.03 * aurora;
    
    float violet = sin(p.y * 1.5 - u_time * 0.1) * 0.5 + 0.5;
    color += vec3(0.5, 0.0, 1.0) * 0.02 * violet;
    
    // Grid
    vec2 grid_uv = uv * 36.0;
    grid_uv.y += u_time * 0.04;
    vec2 grid = abs(fract(grid_uv - 0.5) - 0.5) / fwidth(grid_uv);
    float line = min(grid.x, grid.y);
    color += vec3(0.219, 0.949, 1.0) * (1.0 - smoothstep(0.0, 0.05, line)) * 0.045;
    
    // Floating Particles
    for(float i=0.0; i<25.0; i++) {
        float h = hash(vec2(i, 1.0));
        vec2 pos = vec2(hash(vec2(i, 2.0)), hash(vec2(i, 3.0))) * 2.0 - 1.0;
        pos.x += sin(u_time * 0.08 + h * 6.28) * 0.1;
        pos.y += cos(u_time * 0.08 + h * 6.28) * 0.1;
        
        float dist = length(p - pos * 0.8);
        float size = 0.0018 + h * 0.0018;
        color += vec3(0.219, 0.949, 1.0) * (size / dist) * smoothstep(0.5, 0.0, dist);
    }
    
    color *= 1.0 - length(uv - 0.5) * 0.5;
    gl_FragColor = vec4(color, 1.0);
}`;

    function createShader(type: number, src: string) {
      if (!gl) return null;
      const s = gl.createShader(type);
      if (!s) return null;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    }

    const vertShader = createShader(gl.VERTEX_SHADER, vs);
    const fragShader = createShader(gl.FRAGMENT_SHADER, fs);
    if (!vertShader || !fragShader) return;

    const prog = gl.createProgram();
    if (!prog) return;
    gl.attachShader(prog, vertShader);
    gl.attachShader(prog, fragShader);
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW
    );

    const pos = gl.getAttribLocation(prog, "a_position");
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(prog, "u_time");
    const uRes = gl.getUniformLocation(prog, "u_resolution");

    let startTime = performance.now();

    function renderLoop(now: number) {
      if (!gl || !canvas) return;
      const elapsed = (now - startTime) * 0.001;

      gl.viewport(0, 0, canvas.width, canvas.height);
      if (uTime) gl.uniform1f(uTime, elapsed);
      if (uRes) gl.uniform2f(uRes, canvas.width, canvas.height);

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      animationFrameId = requestAnimationFrame(renderLoop);
    }

    animationFrameId = requestAnimationFrame(renderLoop);

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
    };
  }, []);

  // Three.js 3D Interactive Core Container Ref
  const threeContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = threeContainerRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    const group = new THREE.Group();
    scene.add(group);

    // Cyan glowing material
    const material = new THREE.MeshPhongMaterial({
      color: 0x38f2ff,
      emissive: 0x38f2ff,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.65,
      side: THREE.DoubleSide,
    });

    const wireframeMaterial = new THREE.MeshBasicMaterial({
      color: 0x38f2ff,
      wireframe: true,
      transparent: true,
      opacity: 0.15,
    });

    const createRing = (radius: number, segments: number, speed: number) => {
      const geometry = new THREE.TorusGeometry(radius, 0.02, 16, segments);
      const ring = new THREE.Mesh(geometry, material);
      const wire = new THREE.Mesh(geometry, wireframeMaterial);

      const ringGroup = new THREE.Group();
      ringGroup.add(ring);
      ringGroup.add(wire);

      ringGroup.rotation.x = Math.random() * Math.PI;
      ringGroup.rotation.y = Math.random() * Math.PI;

      group.add(ringGroup);
      return { group: ringGroup, speed };
    };

    const rings = [
      createRing(1.8, 100, 0.005),
      createRing(2.2, 80, -0.003),
      createRing(2.6, 60, 0.008),
      createRing(1.4, 40, -0.01),
    ];

    // Core Sphere
    const coreGeo = new THREE.IcosahedronGeometry(0.8, 2);
    const coreMesh = new THREE.Mesh(coreGeo, material);
    group.add(coreMesh);

    // Lights
    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);
    const pointLight = new THREE.PointLight(0x38f2ff, 2.5, 12);
    pointLight.position.set(0, 0, 0);
    scene.add(pointLight);

    let animationFrameId: number;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      rings.forEach((r) => {
        r.group.rotation.z += r.speed;
        r.group.rotation.x += r.speed * 0.5;
      });

      coreMesh.rotation.y += 0.01;
      coreMesh.rotation.z += 0.005;

      const pulse = 1.0 + Math.sin(Date.now() * 0.002) * 0.05;
      coreMesh.scale.set(pulse, pulse, pulse);

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      renderer.dispose();
      if (container) container.innerHTML = "";
    };
  }, []);

  // Ambient cursor parallax
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const x = e.clientX / window.innerWidth;
    const y = e.clientY / window.innerHeight;
    const target = e.currentTarget;
    target.style.background = `radial-gradient(circle at ${x * 100}% ${y * 100}%, #08111F 0%, #030712 60%)`;
  };

  const progress = Math.min(100, Math.max(0, config.progressPercentage ?? 73));

  return (
    <div
      onMouseMove={handleMouseMove}
      className="min-h-screen flex flex-col relative text-[#dde2f3] font-sans overflow-x-hidden selection:bg-[#38f2ff]/30 selection:text-[#38f2ff]"
      style={{
        backgroundColor: "#030712",
        transition: "background 0.2s ease-out",
      }}
    >
      {/* Background WebGL Shader Layer */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <canvas
          ref={shaderCanvasRef}
          className="w-full h-full block opacity-75"
        />
      </div>

      {/* Interactive 3D Three.js Core Layer */}
      <div className="fixed inset-0 z-[1] pointer-events-none flex items-center justify-center opacity-70 mix-blend-screen overflow-hidden">
        <div ref={threeContainerRef} className="w-full h-full" />
      </div>

      {/* Top Header Bar */}
      <header className="fixed top-0 w-full z-50 bg-[#0e131f]/80 backdrop-blur-xl border-b border-[#38f2ff]/15 shadow-[0_0_25px_rgba(0,219,232,0.12)] flex justify-between items-center px-6 sm:px-12 md:px-20 py-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-[#38f2ff] shadow-[0_0_10px_#38f2ff] animate-pulse" />
          <span className="font-['Space_Grotesk'] text-lg sm:text-xl font-bold text-[#e6fdff] tracking-tight">
            DEVENGINE<span className="text-[#38f2ff]">_CORE</span>
          </span>
          <span className="hidden sm:inline-block px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] font-mono text-[#849495] tracking-widest uppercase">
            V2.0 ARCH
          </span>
        </div>

        {/* Tab Navigation: SYSTEM_STATUS, UPGRADE_LOGS, NETWORK */}
        <nav className="flex items-center gap-4 sm:gap-8 font-mono text-xs tracking-wider">
          <button
            type="button"
            onClick={() => setActiveTab("system_status")}
            className={`pb-1 cursor-pointer transition-all uppercase font-medium ${
              activeTab === "system_status"
                ? "text-[#38f2ff] border-b-2 border-[#38f2ff] drop-shadow-[0_0_8px_rgba(56,242,255,0.7)]"
                : "text-[#bac9cb] hover:text-[#38f2ff]"
            }`}
          >
            SYSTEM_STATUS
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("upgrade_logs")}
            className={`pb-1 cursor-pointer transition-all uppercase font-medium ${
              activeTab === "upgrade_logs"
                ? "text-[#38f2ff] border-b-2 border-[#38f2ff] drop-shadow-[0_0_8px_rgba(56,242,255,0.7)]"
                : "text-[#bac9cb] hover:text-[#38f2ff]"
            }`}
          >
            UPGRADE_LOGS
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("network")}
            className={`pb-1 cursor-pointer transition-all uppercase font-medium ${
              activeTab === "network"
                ? "text-[#38f2ff] border-b-2 border-[#38f2ff] drop-shadow-[0_0_8px_rgba(56,242,255,0.7)]"
                : "text-[#bac9cb] hover:text-[#38f2ff]"
            }`}
          >
            NETWORK
          </button>
        </nav>

        {/* Force Sync Action Button */}
        <button
          type="button"
          onClick={handleForceSync}
          disabled={isSyncing}
          className="flex items-center gap-2 bg-transparent border border-[#38f2ff]/30 px-3.5 py-1.5 rounded-full font-mono text-[11px] text-[#38f2ff] hover:bg-[#38f2ff]/10 hover:border-[#38f2ff] transition-all cursor-pointer shadow-[0_0_15px_rgba(56,242,255,0.15)] disabled:opacity-50"
        >
          <span className="hidden md:inline">FORCE_SYNC</span>
          <span
            className={`material-symbols-outlined text-[15px] ${
              isSyncing ? "animate-spin text-[#38f2ff]" : ""
            }`}
          >
            sync
          </span>
        </button>
      </header>

      {/* Flash Sync Notification */}
      {syncNotice && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-[#080e1a]/95 border border-[#38f2ff]/40 text-[#38f2ff] px-4 py-2 rounded-full font-mono text-xs shadow-2xl flex items-center gap-2 animate-bounce">
          <span className="material-symbols-outlined text-[16px]">done_all</span>
          <span>{syncNotice}</span>
        </div>
      )}

      {/* Main Content Body */}
      <main className="flex-1 flex flex-col items-center justify-center relative pt-28 pb-16 px-4 sm:px-8 md:px-16 z-10">
        {/* ========================================================================= */}
        {/* TAB 1: SYSTEM_STATUS (The Faithful Implementation of maintanence.txt)      */}
        {/* ========================================================================= */}
        {activeTab === "system_status" && (
          <div className="relative z-10 w-full max-w-[840px] flex flex-col items-center text-center gap-10 my-auto animate-fadeIn">
            {/* Top Badge & Header */}
            <div className="flex flex-col items-center gap-4">
              <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-[#38f2ff]/10 border border-[#38f2ff]/25 font-mono text-xs text-[#38f2ff] shadow-[0_0_15px_rgba(56,242,255,0.25)]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#38f2ff] animate-ping" />
                <span className="font-bold tracking-widest uppercase">
                  {config.badge || "SYSTEM UPGRADE IN PROGRESS"}
                </span>
              </div>

              <h1 className="font-['Space_Grotesk'] text-4xl sm:text-6xl md:text-7xl font-extrabold text-[#dde2f3] tracking-tight leading-[1.1]">
                We&apos;re Building <br />
                <span
                  className="text-[#38f2ff]"
                  style={{
                    textShadow:
                      "0 0 25px rgba(56, 242, 255, 0.65), 0 0 50px rgba(56, 242, 255, 0.3)",
                  }}
                >
                  Something Better.
                </span>
              </h1>

              <p className="font-sans text-sm sm:text-base md:text-lg text-[#bac9cb] max-w-[580px] leading-relaxed font-normal">
                {config.message ||
                  "DevEngine Core is currently undergoing scheduled maintenance to deploy V2 architectural enhancements. All services will resume shortly."}
              </p>
            </div>

            {/* The Technical Countdown Glass Panel */}
            <div className="w-full rounded-2xl p-6 sm:p-10 relative overflow-hidden bg-[#08111f]/60 backdrop-blur-2xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
              {/* Scanline pattern */}
              <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] pointer-events-none opacity-25" />

              {/* Countdown numbers */}
              <div className="flex justify-center items-end gap-2 sm:gap-6 font-mono text-[#38f2ff]">
                <div className="flex flex-col items-center">
                  <span
                    className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-wider"
                    style={{ textShadow: "0 0 20px rgba(56,242,255,0.6)" }}
                  >
                    {timeLeft.days}
                  </span>
                  <span className="text-[#849495] text-xs font-semibold tracking-widest mt-2">
                    DAYS
                  </span>
                </div>

                <span className="text-3xl sm:text-5xl font-bold mb-7 text-[#38f2ff]/40">
                  :
                </span>

                <div className="flex flex-col items-center">
                  <span
                    className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-wider"
                    style={{ textShadow: "0 0 20px rgba(56,242,255,0.6)" }}
                  >
                    {timeLeft.hours}
                  </span>
                  <span className="text-[#849495] text-xs font-semibold tracking-widest mt-2">
                    HRS
                  </span>
                </div>

                <span className="text-3xl sm:text-5xl font-bold mb-7 text-[#38f2ff]/40">
                  :
                </span>

                <div className="flex flex-col items-center">
                  <span
                    className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-wider"
                    style={{ textShadow: "0 0 20px rgba(56,242,255,0.6)" }}
                  >
                    {timeLeft.minutes}
                  </span>
                  <span className="text-[#849495] text-xs font-semibold tracking-widest mt-2">
                    MIN
                  </span>
                </div>

                <span className="text-3xl sm:text-5xl font-bold mb-7 text-[#38f2ff]/40">
                  :
                </span>

                <div className="flex flex-col items-center">
                  <span
                    className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-wider text-[#78f5ff]"
                    style={{ textShadow: "0 0 25px rgba(120,245,255,0.8)" }}
                  >
                    {timeLeft.seconds}
                  </span>
                  <span className="text-[#849495] text-xs font-semibold tracking-widest mt-2">
                    SEC
                  </span>
                </div>
              </div>

              {/* Segmented Progress Bar */}
              <div className="mt-10 sm:mt-12 text-left">
                <div className="flex justify-between font-mono text-xs text-[#bac9cb] mb-2 tracking-wider">
                  <span className="font-semibold uppercase">OVERALL PROGRESS</span>
                  <span className="text-[#38f2ff] font-bold">{progress}%</span>
                </div>

                <div className="w-full h-2.5 bg-[#1a202c] rounded-full overflow-hidden flex gap-[2px] p-[1px] border border-white/10">
                  <div
                    className="h-full bg-[#38f2ff] shadow-[0_0_12px_rgba(56,242,255,0.8)] transition-all duration-1000 ease-in-out"
                    style={{ width: `${Math.min(30, progress)}%` }}
                  />
                  <div
                    className="h-full bg-[#38f2ff]/80 shadow-[0_0_10px_rgba(56,242,255,0.6)] transition-all duration-1000 ease-in-out"
                    style={{
                      width: `${Math.max(0, Math.min(20, progress - 30))}%`,
                    }}
                  />
                  <div
                    className="h-full bg-[#38f2ff]/60 relative overflow-hidden shadow-[0_0_10px_rgba(56,242,255,0.4)] transition-all duration-1000 ease-in-out"
                    style={{
                      width: `${Math.max(0, Math.min(23, progress - 50))}%`,
                    }}
                  >
                    <div className="absolute inset-0 bg-white/30 animate-pulse" />
                  </div>
                  <div
                    className="h-full bg-white/10 transition-all duration-1000 ease-in-out"
                    style={{ width: `${Math.max(0, 100 - progress)}%` }}
                  />
                </div>

                <div className="flex justify-between mt-2.5 font-mono text-[10px] text-[#849495] tracking-widest uppercase">
                  <span className={progress >= 30 ? "text-[#38f2ff]" : ""}>
                    ARCHITECTURE
                  </span>
                  <span className={progress >= 50 ? "text-[#38f2ff]" : ""}>
                    DATABASE
                  </span>
                  <span className={progress >= 73 ? "text-[#38f2ff]" : ""}>
                    SECURITY
                  </span>
                  <span className={progress >= 100 ? "text-[#38f2ff]" : ""}>
                    DEPLOY
                  </span>
                </div>
              </div>
            </div>

            {/* Live Status Panel (Cards) */}
            <div className="w-full flex flex-col sm:flex-row gap-5">
              {/* Core Services */}
              <div className="flex-1 rounded-2xl p-5 sm:p-6 bg-[#08111f]/60 backdrop-blur-xl border border-white/10 text-left flex items-start gap-4 hover:border-[#38f2ff]/50 transition-colors duration-300 group shadow-lg">
                <span className="material-symbols-outlined text-[#38f2ff] text-[26px] mt-0.5 group-hover:scale-110 transition-transform">
                  dns
                </span>
                <div>
                  <h3 className="font-mono text-xs font-semibold text-[#dde2f3] tracking-widest uppercase mb-1">
                    CORE SERVICES
                  </h3>
                  <p className="text-sm font-sans text-[#38f2ff] flex items-center gap-2 font-medium">
                    <span className="w-2 h-2 rounded-full bg-[#38f2ff] animate-pulse" />
                    {config.coreServicesStatus || "Updating Modules..."}
                  </p>
                </div>
              </div>

              {/* Database */}
              <div className="flex-1 rounded-2xl p-5 sm:p-6 bg-[#08111f]/60 backdrop-blur-xl border border-white/10 text-left flex items-start gap-4 hover:border-[#9ecaff]/50 transition-colors duration-300 group shadow-lg">
                <span className="material-symbols-outlined text-[#9ecaff] text-[26px] mt-0.5 group-hover:scale-110 transition-transform">
                  database
                </span>
                <div>
                  <h3 className="font-mono text-xs font-semibold text-[#dde2f3] tracking-widest uppercase mb-1">
                    DATABASE
                  </h3>
                  <p className="text-sm font-sans text-[#9ecaff] flex items-center gap-2 font-medium">
                    <span className="material-symbols-outlined text-[16px] animate-spin text-[#9ecaff]">
                      sync
                    </span>
                    {config.databaseStatus || "Optimizing Indexes"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: UPGRADE_LOGS (Real Live Updates from updateLogsService)             */}
        {/* ========================================================================= */}
        {activeTab === "upgrade_logs" && (
          <div className="w-full max-w-5xl my-4 animate-fadeIn">
            <div className="rounded-3xl bg-[#08111f]/75 backdrop-blur-2xl border border-white/10 p-6 sm:p-10 shadow-2xl">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-6 mb-8">
                <div>
                  <div className="flex items-center gap-2 text-[#38f2ff] font-mono text-xs tracking-widest uppercase mb-1">
                    <span className="w-2 h-2 rounded-full bg-[#38f2ff] animate-pulse" />
                    <span>PUBLIC TELEMETRY FEED</span>
                  </div>
                  <h2 className="font-['Space_Grotesk'] text-2xl sm:text-3xl font-bold text-white">
                    System Architecture Upgrade Logs
                  </h2>
                </div>
                <span className="text-xs font-mono text-[#849495] bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">
                  LIVE DEPLOYMENT STREAM
                </span>
              </div>

              <UpdateLogBody />
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: NETWORK (Real Live Topology from networkService)                   */}
        {/* ========================================================================= */}
        {activeTab === "network" && (
          <div className="w-full max-w-5xl my-4 animate-fadeIn">
            <div className="rounded-3xl bg-[#08111f]/75 backdrop-blur-2xl border border-white/10 p-6 sm:p-10 shadow-2xl">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-6 mb-8">
                <div>
                  <div className="flex items-center gap-2 text-[#38f2ff] font-mono text-xs tracking-widest uppercase mb-1">
                    <span className="w-2 h-2 rounded-full bg-[#38f2ff] animate-pulse" />
                    <span>GLOBAL EDGE NETWORK</span>
                  </div>
                  <h2 className="font-['Space_Grotesk'] text-2xl sm:text-3xl font-bold text-white">
                    Active Edge Nodes & Routing Topology
                  </h2>
                </div>
                <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-3 py-1.5 rounded-full flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  99.98% OPERATIONAL
                </span>
              </div>

              <NetworkTopologyBody />
            </div>
          </div>
        )}
      </main>

      {/* Subtle Technical Footer (Footer of maintenance design ignored as requested) */}
      <footer className="w-full py-4 text-center font-mono text-[10px] tracking-[0.2em] text-[#849495]/50 uppercase z-10">
        DEVENGINE SYSTEM ARCHITECTURE · ALL RIGHTS RESERVED
      </footer>
    </div>
  );
}
