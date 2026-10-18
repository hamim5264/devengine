import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface InteractiveBearProps {
  focusedField: "email" | "password" | null;
  emailLength: number;
  showPass: boolean;
  hasError: boolean;
  loading: boolean;
  isLight: boolean;
}

export default function InteractiveBear({
  focusedField,
  emailLength,
  showPass,
  hasError,
  loading,
  isLight,
}: InteractiveBearProps) {
  const [isBlinking, setIsBlinking] = useState(false);

  // Natural random blinking when idle
  useEffect(() => {
    if (focusedField === "password") return;
    const interval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 140);
    }, 3200 + Math.random() * 2200);

    return () => clearInterval(interval);
  }, [focusedField]);

  // Eye tracking calculation for email input
  const maxChars = 28;
  const clampedLen = Math.min(Math.max(emailLength, 0), maxChars);
  const emailProgress = clampedLen / maxChars;

  let pupilX = 0;
  let pupilY = 0;
  let headTilt = 0;

  if (focusedField === "email") {
    pupilX = -6 + emailProgress * 12; // tracks text smoothly
    pupilY = 5; // looks down at the field
    headTilt = -2.5 + emailProgress * 5; // gentle lifelike head tilt
  } else if (focusedField === "password") {
    if (showPass) {
      pupilX = 4; // peeking sideways
      pupilY = 2;
    }
  }

  const isCoveringEyes = focusedField === "password";

  // Palette: Pristine White & DevEngine Cyan #2cecf7
  const strokeColor = isLight ? "rgba(44, 236, 247, 0.45)" : "#2cecf7";
  const noseFill = isLight ? "#0f172a" : "#02040a";

  return (
    <div className="relative flex flex-col items-center pointer-events-none select-none">
      <motion.svg
        viewBox="0 0 200 170"
        className="w-44 sm:w-52 h-auto drop-shadow-2xl overflow-visible"
        animate={
          hasError
            ? { x: [-6, 6, -6, 6, -2, 2, 0], rotate: [-2.5, 2.5, -2, 2, 0] }
            : loading
            ? { y: [0, -4, 0], scale: [1, 1.025, 1] }
            : { y: 0, rotate: headTilt }
        }
        transition={
          hasError
            ? { duration: 0.5 }
            : loading
            ? { repeat: Infinity, duration: 0.8, ease: "easeInOut" }
            : { type: "spring", stiffness: 220, damping: 22 }
        }
      >
        <defs>
          {/* Head 3D Depth Gradient */}
          <linearGradient id="polarFurGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="70%" stopColor="#f8fafc" />
            <stop offset="100%" stopColor="#e2e8f0" />
          </linearGradient>

          {/* Muzzle Gradient */}
          <linearGradient id="muzzleGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#f1f5f9" />
          </linearGradient>

          {/* Glowing Brand Cyan Paw Pad Gradient */}
          <radialGradient id="cyberPawPad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#67e8f9" />
            <stop offset="45%" stopColor="#2cecf7" />
            <stop offset="100%" stopColor="#0891b2" />
          </radialGradient>

          {/* Soft Cyan Glow Filter */}
          <filter id="softCyanGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#2cecf7" floodOpacity="0.45" />
          </filter>

          {/* 3D Paw Gradient */}
          <linearGradient id="paw3dGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="60%" stopColor="#f8fafc" />
            <stop offset="100%" stopColor="#e2e8f0" />
          </linearGradient>
        </defs>

        {/* ── 1. Shoulders / Chest (Behind card rim) ── */}
        <path
          d="M 35 170 Q 100 135 165 170 L 175 190 L 25 190 Z"
          fill="url(#polarFurGrad)"
          stroke={strokeColor}
          strokeWidth="2.5"
        />

        {/* ── 2. Ears with Realistic Fluffy Tufts ── */}
        {/* Left Ear */}
        <g>
          <circle
            cx="48"
            cy="42"
            r="25"
            fill="url(#polarFurGrad)"
            stroke={strokeColor}
            strokeWidth="2.5"
          />
          {/* Inner Ear Soft Cyan Core */}
          <circle cx="48" cy="42" r="16" fill="rgba(44, 236, 247, 0.16)" />
          <circle cx="48" cy="42" r="8" fill="#2cecf7" fillOpacity="0.5" filter="url(#softCyanGlow)" />
          {/* Fluff Tuft */}
          <path
            d="M 40 48 Q 48 42 56 48"
            stroke="rgba(203, 213, 225, 0.7)"
            strokeWidth="1.5"
            fill="none"
          />
        </g>

        {/* Right Ear */}
        <g>
          <circle
            cx="152"
            cy="42"
            r="25"
            fill="url(#polarFurGrad)"
            stroke={strokeColor}
            strokeWidth="2.5"
          />
          {/* Inner Ear Soft Cyan Core */}
          <circle cx="152" cy="42" r="16" fill="rgba(44, 236, 247, 0.16)" />
          <circle cx="152" cy="42" r="8" fill="#2cecf7" fillOpacity="0.5" filter="url(#softCyanGlow)" />
          {/* Fluff Tuft */}
          <path
            d="M 144 48 Q 152 42 160 48"
            stroke="rgba(203, 213, 225, 0.7)"
            strokeWidth="1.5"
            fill="none"
          />
        </g>

        {/* ── 3. Head Sculpt ── */}
        <ellipse
          cx="100"
          cy="85"
          rx="62"
          ry="54"
          fill="url(#polarFurGrad)"
          stroke={strokeColor}
          strokeWidth="2.5"
          filter={!isLight ? "url(#softCyanGlow)" : undefined}
        />

        {/* Brand Cyan Cheeks Blush */}
        <ellipse cx="56" cy="100" rx="10" ry="6" fill="rgba(44, 236, 247, 0.28)" filter="url(#softCyanGlow)" />
        <ellipse cx="144" cy="100" rx="10" ry="6" fill="rgba(44, 236, 247, 0.28)" filter="url(#softCyanGlow)" />

        {/* ── 4. Eyes & Eyebrows ── */}
        {/* LEFT EYE at (72, 80) */}
        <g id="left-eye">
          {/* Eyebrow */}
          <motion.path
            d="M 62 65 Q 72 61 82 66"
            stroke={noseFill}
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
            animate={{
              y: isCoveringEyes ? 2 : focusedField === "email" ? 3 : 0,
              rotate: hasError ? -10 : isCoveringEyes ? 5 : 0,
            }}
          />

          {isCoveringEyes ? (
            /* Closed eye curved slit when covered */
            <path
              d="M 63 80 Q 72 87 81 80"
              stroke={noseFill}
              strokeWidth="3.2"
              strokeLinecap="round"
              fill="none"
            />
          ) : isBlinking ? (
            /* Blink slit */
            <path
              d="M 63 80 Q 72 83 81 80"
              stroke={noseFill}
              strokeWidth="3.2"
              strokeLinecap="round"
              fill="none"
            />
          ) : (
            /* Open 3D glossy eye */
            <g>
              <ellipse
                cx="72"
                cy="80"
                rx="12"
                ry="13"
                fill="#ffffff"
                stroke="rgba(203, 213, 225, 0.8)"
                strokeWidth="1.2"
              />
              {/* Iris & Pupil */}
              <motion.g
                animate={{ x: pupilX, y: pupilY }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
              >
                <circle cx="72" cy="80" r="7" fill={noseFill} />
                {/* Cyan Iris Ring Highlight */}
                <circle cx="72" cy="80" r="6" stroke="#2cecf7" strokeWidth="1" fill="none" opacity="0.65" />
                {/* Specular Highlights */}
                <circle cx="70" cy="77" r="2.4" fill="#ffffff" />
                <circle cx="75" cy="82.5" r="1.2" fill="#2cecf7" />
              </motion.g>
            </g>
          )}
        </g>

        {/* RIGHT EYE at (128, 80) */}
        <g id="right-eye">
          {/* Eyebrow */}
          <motion.path
            d="M 118 66 Q 128 61 138 65"
            stroke={noseFill}
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
            animate={{
              y: isCoveringEyes ? (showPass ? -2 : 2) : focusedField === "email" ? 3 : 0,
              rotate: hasError ? 10 : isCoveringEyes ? (showPass ? -8 : -5) : 0,
            }}
          />

          {isCoveringEyes && !showPass ? (
            /* Closed eye curved slit when covered */
            <path
              d="M 119 80 Q 128 87 137 80"
              stroke={noseFill}
              strokeWidth="3.2"
              strokeLinecap="round"
              fill="none"
            />
          ) : isBlinking && !showPass ? (
            /* Blink slit */
            <path
              d="M 119 80 Q 128 83 137 80"
              stroke={noseFill}
              strokeWidth="3.2"
              strokeLinecap="round"
              fill="none"
            />
          ) : (
            /* Open 3D glossy eye (normal OR peeking!) */
            <g>
              <ellipse
                cx="128"
                cy="80"
                rx={showPass && isCoveringEyes ? 13 : 12}
                ry={showPass && isCoveringEyes ? 14 : 13}
                fill="#ffffff"
                stroke="rgba(203, 213, 225, 0.8)"
                strokeWidth="1.2"
              />
              {/* Iris & Pupil */}
              <motion.g
                animate={{ x: pupilX, y: pupilY }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
              >
                <circle cx="128" cy="80" r="7" fill={noseFill} />
                {/* Cyan Iris Ring Highlight */}
                <circle cx="128" cy="80" r="6" stroke="#2cecf7" strokeWidth="1" fill="none" opacity="0.65" />
                {/* Specular Highlights */}
                <circle cx="126" cy="77" r="2.4" fill="#ffffff" />
                <circle cx="131" cy="82.5" r="1.2" fill="#2cecf7" />
              </motion.g>
            </g>
          )}
        </g>

        {/* ── 5. Muzzle & Nose ── */}
        <g>
          {/* 3D Snout */}
          <ellipse
            cx="100"
            cy="106"
            rx="29"
            ry="22"
            fill="url(#muzzleGrad)"
            stroke="rgba(44, 236, 247, 0.35)"
            strokeWidth="2"
          />

          {/* Sculpted Nose */}
          <path
            d="M 91 98 Q 100 94 109 98 Q 105 110 100 110 Q 95 110 91 98 Z"
            fill={noseFill}
          />
          {/* Nose 3D Gloss Highlight */}
          <ellipse cx="97" cy="99" rx="2.8" ry="1.4" fill="#ffffff" fillOpacity="0.85" />

          {/* Cute Curved Mouth */}
          <path
            d="M 93 112 Q 100 118 100 111 Q 100 118 107 112"
            stroke={noseFill}
            strokeWidth="2.4"
            strokeLinecap="round"
            fill="none"
          />

          {/* Happy Tongue on Loading */}
          {loading && (
            <path
              d="M 97 116 Q 100 124 103 116 Z"
              fill="#2cecf7"
              filter="url(#softCyanGlow)"
            />
          )}
        </g>

        {/* ── 6. REALISTIC ARMS & PAWS (Hands that physically cover the eyes!) ── */}

        {/* LEFT ARM & HAND: Resting at (52, 146) -> Moves directly to Left Eye (72, 80)! */}
        <motion.g
          animate={
            isCoveringEyes
              ? {
                  x: 20, // moves right directly over left eye (72, 80)
                  y: -66, // moves up to eye level
                  rotate: -10, // natural hand angle over eye
                  scale: 1.05,
                }
              : {
                  x: 0,
                  y: 0,
                  rotate: 0,
                  scale: 1,
                }
          }
          transition={{ type: "spring", stiffness: 270, damping: 22 }}
          style={{ originX: "52px", originY: "146px" }}
        >
          {/* Forearm (extends down to connect with body) */}
          <path
            d="M 34 148 C 30 162 42 170 56 168 C 68 166 72 154 68 142 Z"
            fill="url(#paw3dGrad)"
            stroke={strokeColor}
            strokeWidth="2"
          />

          {/* Left Palm / Hand Base */}
          <ellipse
            cx="52"
            cy="146"
            rx="21"
            ry="19"
            fill="url(#paw3dGrad)"
            stroke={strokeColor}
            strokeWidth="2.5"
            filter={isCoveringEyes ? "url(#softCyanGlow)" : undefined}
          />

          {/* Cyan Cyber Paw Pads (Show brightly on underside of hand when raised to cover eye!) */}
          <motion.g
            animate={{ opacity: isCoveringEyes ? 1 : 0.85 }}
            transition={{ duration: 0.15 }}
          >
            {/* Main Center Pad */}
            <ellipse
              cx="52"
              cy="147"
              rx="8.5"
              ry="7"
              fill="url(#cyberPawPad)"
              filter="url(#softCyanGlow)"
            />
            {/* 4 Defined Rounded Fingers/Toe Pads */}
            <circle cx="42" cy="138" r="3.2" fill="#2cecf7" />
            <circle cx="49" cy="134" r="3.5" fill="#2cecf7" />
            <circle cx="56" cy="134" r="3.5" fill="#2cecf7" />
            <circle cx="63" cy="138" r="3.2" fill="#2cecf7" />
          </motion.g>
        </motion.g>

        {/* RIGHT ARM & HAND: Resting at (148, 146) -> Moves directly to Right Eye (128, 80)! */}
        <motion.g
          animate={
            isCoveringEyes
              ? showPass
                ? {
                    x: -6,
                    y: -30, // lowered to cheek so right eye can peek!
                    rotate: 32,
                    scale: 1,
                  }
                : {
                    x: -20, // moves left directly over right eye (128, 80)
                    y: -66, // moves up to eye level
                    rotate: 10, // natural hand angle over eye
                    scale: 1.05,
                  }
              : {
                  x: 0,
                  y: 0,
                  rotate: 0,
                  scale: 1,
                }
          }
          transition={{ type: "spring", stiffness: 270, damping: 22 }}
          style={{ originX: "148px", originY: "146px" }}
        >
          {/* Forearm (extends down to connect with body) */}
          <path
            d="M 132 142 C 128 154 132 166 144 168 C 158 170 170 162 166 148 Z"
            fill="url(#paw3dGrad)"
            stroke={strokeColor}
            strokeWidth="2"
          />

          {/* Right Palm / Hand Base */}
          <ellipse
            cx="148"
            cy="146"
            rx="21"
            ry="19"
            fill="url(#paw3dGrad)"
            stroke={strokeColor}
            strokeWidth="2.5"
            filter={isCoveringEyes ? "url(#softCyanGlow)" : undefined}
          />

          {/* Cyan Cyber Paw Pads */}
          <motion.g
            animate={{ opacity: isCoveringEyes ? 1 : 0.85 }}
            transition={{ duration: 0.15 }}
          >
            {/* Main Center Pad */}
            <ellipse
              cx="148"
              cy="147"
              rx="8.5"
              ry="7"
              fill="url(#cyberPawPad)"
              filter="url(#softCyanGlow)"
            />
            {/* 4 Defined Rounded Fingers/Toe Pads */}
            <circle cx="137" cy="138" r="3.2" fill="#2cecf7" />
            <circle cx="144" cy="134" r="3.5" fill="#2cecf7" />
            <circle cx="151" cy="134" r="3.5" fill="#2cecf7" />
            <circle cx="158" cy="138" r="3.2" fill="#2cecf7" />
          </motion.g>
        </motion.g>
      </motion.svg>
    </div>
  );
}
