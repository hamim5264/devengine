import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface InteractiveBearProps {
  focusedField: "email" | "password" | null;
  emailLength: number;
  showPass: boolean;
  hasError: boolean;
  hasWarning?: boolean;
  loading: boolean;
  isLight: boolean;
}

export default function InteractiveBear({
  focusedField,
  emailLength,
  showPass,
  hasError,
  hasWarning = false,
  loading,
  isLight,
}: InteractiveBearProps) {
  const [isBlinking, setIsBlinking] = useState(false);

  // Natural random blinking when idle or typing email (pauses during angry or covered eyes)
  useEffect(() => {
    if (focusedField === "password" || hasError) return;
    const interval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 130);
    }, 2800 + Math.random() * 2600);

    return () => clearInterval(interval);
  }, [focusedField, hasError]);

  // Eye tracking calculation for email input
  const maxChars = 28;
  const clampedLen = Math.min(Math.max(emailLength, 0), maxChars);
  const emailProgress = clampedLen / maxChars;

  let pupilX = 0;
  let pupilY = 0;
  let headTilt = 0;

  if (hasError) {
    // Angry state: head shaking, intense direct gaze
    pupilX = 0;
    pupilY = 0;
    headTilt = 0;
  } else if (hasWarning) {
    // Warning state: looking suspiciously down-left at the email field
    pupilX = -4;
    pupilY = 4;
    headTilt = -4;
  } else if (focusedField === "email") {
    pupilX = -6 + emailProgress * 12; // tracks text smoothly from left to right
    pupilY = 4; // looks down at the field
    headTilt = -2.5 + emailProgress * 5; // gentle lifelike head tilt
  } else if (focusedField === "password") {
    if (showPass) {
      pupilX = 1; // curious wide eyes peeking at user
      pupilY = 1;
    }
  }

  const isCoveringEyes = focusedField === "password";
  const isPeeking = isCoveringEyes && showPass;

  // Active theme strokes and gradient IDs based on state
  const activeStroke = hasError
    ? "#ef4444"
    : hasWarning
    ? "#f59e0b"
    : isLight
    ? "#06b6d4"
    : "#2cecf7";

  const furGradId = hasError
    ? "url(#bearFurAngry)"
    : hasWarning
    ? "url(#bearFurWarning)"
    : "url(#bearFurNormal)";

  const snoutGradId = hasError
    ? "url(#snoutAngry)"
    : hasWarning
    ? "url(#snoutWarning)"
    : "url(#snoutNormal)";

  const innerEarGradId = hasError
    ? "url(#innerEarAngry)"
    : hasWarning
    ? "url(#innerEarWarning)"
    : "url(#innerEarNormal)";

  const pawPadGradId = hasError
    ? "url(#pawPadAngry)"
    : hasWarning
    ? "url(#pawPadWarning)"
    : "url(#pawPadNormal)";

  const activeGlowFilter = hasError
    ? "url(#angryRedGlow)"
    : hasWarning
    ? "url(#warningAmberGlow)"
    : "url(#brandCyanGlow)";

  return (
    <div className="relative flex flex-col items-center pointer-events-none select-none">
      <motion.svg
        viewBox="0 0 200 190"
        className="w-40 sm:w-48 h-auto drop-shadow-2xl overflow-visible"
        animate={
          hasError
            ? {
                // Aggressive angry head shake
                x: [-10, 10, -8, 8, -5, 5, -2, 2, 0],
                rotate: [-6, 6, -5, 5, -3, 3, 0],
              }
            : loading
            ? { y: [0, -5, 0], scale: [1, 1.025, 1] }
            : hasWarning
            ? { rotate: headTilt, y: 1 }
            : { y: 0, rotate: headTilt }
        }
        transition={
          hasError
            ? { duration: 0.6, ease: "easeInOut" }
            : loading
            ? { repeat: Infinity, duration: 0.85, ease: "easeInOut" }
            : { type: "spring", stiffness: 240, damping: 22 }
        }
      >
        <defs>
          {/* ── 1. Normal State: Pristine White & DevEngine Brand Cyan #2cecf7 ── */}
          <linearGradient id="bearFurNormal" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="60%" stopColor="#f4fdfe" />
            <stop offset="100%" stopColor="#d5f8fb" />
          </linearGradient>

          <linearGradient id="snoutNormal" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="70%" stopColor="#f0fdff" />
            <stop offset="100%" stopColor="#dcf7fa" />
          </linearGradient>

          <linearGradient id="innerEarNormal" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#67e8f9" />
            <stop offset="50%" stopColor="#2cecf7" />
            <stop offset="100%" stopColor="#0891b2" />
          </linearGradient>

          <radialGradient id="pawPadNormal" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#a5f3fc" />
            <stop offset="55%" stopColor="#2cecf7" />
            <stop offset="100%" stopColor="#0891b2" />
          </radialGradient>

          {/* ── 2. Angry State: Furious Red Crimson Gradient (#ef4444) ── */}
          <linearGradient id="bearFurAngry" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fca5a5" />
            <stop offset="35%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#991b1b" />
          </linearGradient>

          <linearGradient id="snoutAngry" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="70%" stopColor="#fee2e2" />
            <stop offset="100%" stopColor="#fca5a5" />
          </linearGradient>

          <linearGradient id="innerEarAngry" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f87171" />
            <stop offset="60%" stopColor="#dc2626" />
            <stop offset="100%" stopColor="#7f1d1d" />
          </linearGradient>

          <radialGradient id="pawPadAngry" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fecaca" />
            <stop offset="60%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#991b1b" />
          </radialGradient>

          {/* ── 3. Warning State: Caution Amber Gold Gradient (#f59e0b) ── */}
          <linearGradient id="bearFurWarning" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="50%" stopColor="#fef3c7" />
            <stop offset="100%" stopColor="#fde68a" />
          </linearGradient>

          <linearGradient id="snoutWarning" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="70%" stopColor="#fffbeb" />
            <stop offset="100%" stopColor="#fef3c7" />
          </linearGradient>

          <linearGradient id="innerEarWarning" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fde68a" />
            <stop offset="60%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>

          <radialGradient id="pawPadWarning" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fef3c7" />
            <stop offset="60%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#b45309" />
          </radialGradient>

          {/* ── Glow Filters ── */}
          <filter id="brandCyanGlow" x="-25%" y="-25%" width="150%" height="150%">
            <feDropShadow dx="0" dy="0" stdDeviation="4.5" floodColor="#2cecf7" floodOpacity={isLight ? "0.35" : "0.65"} />
          </filter>

          <filter id="angryRedGlow" x="-25%" y="-25%" width="150%" height="150%">
            <feDropShadow dx="0" dy="0" stdDeviation="5.5" floodColor="#ef4444" floodOpacity="0.8" />
          </filter>

          <filter id="warningAmberGlow" x="-25%" y="-25%" width="150%" height="150%">
            <feDropShadow dx="0" dy="0" stdDeviation="4.5" floodColor="#f59e0b" floodOpacity="0.65" />
          </filter>

          {/* 3D Paw Drop Shadow onto face when covering eyes */}
          <filter id="pawFaceShadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="3" stdDeviation="3.5" floodColor="#02040a" floodOpacity="0.32" />
          </filter>
        </defs>

        {/* ── 1. Body / Shoulders (Extends deep behind card) ── */}
        <path
          d="M 22 220 C 28 145 66 136 100 136 C 134 136 172 145 178 220 Z"
          fill={furGradId}
          stroke={activeStroke}
          strokeWidth="2.5"
          filter={activeGlowFilter}
        />

        {/* ── 2. Ears (Dimensional & Animated) ── */}
        {/* Left Ear */}
        <g>
          <circle
            cx="54"
            cy="52"
            r="23"
            fill={furGradId}
            stroke={activeStroke}
            strokeWidth="2.2"
          />
          {/* Inner Ear */}
          <circle cx="54" cy="52" r="14" fill={innerEarGradId} />
          <circle
            cx="54"
            cy="52"
            r="7"
            fill={activeStroke}
            fillOpacity={hasError ? "0.6" : "0.4"}
          />
        </g>

        {/* Right Ear */}
        <g>
          <circle
            cx="146"
            cy="52"
            r="23"
            fill={furGradId}
            stroke={activeStroke}
            strokeWidth="2.2"
          />
          {/* Inner Ear */}
          <circle cx="146" cy="52" r="14" fill={innerEarGradId} />
          <circle
            cx="146"
            cy="52"
            r="7"
            fill={activeStroke}
            fillOpacity={hasError ? "0.6" : "0.4"}
          />
        </g>

        {/* ── 3. Main Head ── */}
        <ellipse
          cx="100"
          cy="102"
          rx="58"
          ry="50"
          fill={furGradId}
          stroke={activeStroke}
          strokeWidth="2.5"
        />

        {/* Forehead 3D Highlight Overlay */}
        {!hasError && (
          <ellipse
            cx="100"
            cy="84"
            rx="46"
            ry="32"
            fill="#ffffff"
            fillOpacity={isLight ? "0.6" : "0.2"}
          />
        )}

        {/* Cheeks Blush / Glow */}
        <ellipse
          cx="58"
          cy="116"
          rx="10"
          ry="6"
          fill={activeStroke}
          fillOpacity={hasError ? "0.45" : hasWarning ? "0.4" : "0.32"}
          filter={activeGlowFilter}
        />
        <ellipse
          cx="142"
          cy="116"
          rx="10"
          ry="6"
          fill={activeStroke}
          fillOpacity={hasError ? "0.45" : hasWarning ? "0.4" : "0.32"}
          filter={activeGlowFilter}
        />

        {/* ── 4. Angry Anime Symbol (💢) on Forehead when Error ── */}
        {hasError && (
          <motion.g
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [1, 1.25, 1], rotate: [-4, 4, -4], opacity: 1 }}
            transition={{ repeat: Infinity, duration: 0.65 }}
            transform="translate(132, 64)"
          >
            {/* White outline for pop */}
            <path
              d="M -7 -3 Q 0 -5 7 -3 M -7 3 Q 0 5 7 3 M -3 -7 Q -5 0 -3 7 M 3 -7 Q 5 0 3 7"
              stroke="#ffffff"
              strokeWidth="3.2"
              strokeLinecap="round"
            />
            {/* Fiery red cross */}
            <path
              d="M -7 -3 Q 0 -5 7 -3 M -7 3 Q 0 5 7 3 M -3 -7 Q -5 0 -3 7 M 3 -7 Q 5 0 3 7"
              stroke="#b91c1c"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </motion.g>
        )}

        {/* ── 5. Warning Anime Sweat Drop (💧) on Temple when Email Warning ── */}
        {hasWarning && !hasError && (
          <motion.path
            animate={{ y: [0, 3, 0], opacity: [0.85, 1, 0.85] }}
            transition={{ repeat: Infinity, duration: 1.1, ease: "easeInOut" }}
            d="M 148 74 C 148 74 153 82 153 86 C 153 89.5 150.5 92 148 92 C 145.5 92 143 89.5 143 86 C 143 82 148 74 148 74 Z"
            fill="#38bdf8"
            stroke="#0284c7"
            strokeWidth="1.2"
          />
        )}

        {/* ── 6. Eyebrows (Dynamically Responsive to States) ── */}
        {hasError ? (
          /* Furious Angry Eyebrows slanted sharply down (\ /) */
          <>
            <motion.path
              d="M 62 82 L 85 68"
              stroke="#7f1d1d"
              strokeWidth="3.6"
              strokeLinecap="round"
              animate={{ rotate: [-2, 2, -2] }}
              transition={{ repeat: Infinity, duration: 0.4 }}
            />
            <motion.path
              d="M 115 68 L 138 82"
              stroke="#7f1d1d"
              strokeWidth="3.6"
              strokeLinecap="round"
              animate={{ rotate: [2, -2, 2] }}
              transition={{ repeat: Infinity, duration: 0.4 }}
            />
          </>
        ) : hasWarning ? (
          /* Skeptical Warning Eyebrows: Left raised high in doubt, Right lowered in suspicion */
          <>
            <motion.path
              d="M 64 66 Q 74 60 84 66"
              stroke="#b45309"
              strokeWidth="3.2"
              strokeLinecap="round"
              fill="none"
              animate={{ y: [-1, 1, -1] }}
              transition={{ repeat: Infinity, duration: 1.2 }}
            />
            <motion.path
              d="M 116 77 Q 126 77 136 79"
              stroke="#b45309"
              strokeWidth="3.2"
              strokeLinecap="round"
              fill="none"
            />
          </>
        ) : (
          /* Normal / Friendly Eyebrows */
          <>
            <motion.path
              d="M 64 74 Q 74 69 84 74"
              stroke="#0f172a"
              strokeWidth="2.6"
              strokeLinecap="round"
              fill="none"
              animate={{
                y: isCoveringEyes && !showPass ? 2 : isPeeking ? -4 : focusedField === "email" ? 2 : 0,
                rotate: isPeeking ? 4 : 0,
              }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
            />
            <motion.path
              d="M 116 74 Q 126 69 136 74"
              stroke="#0f172a"
              strokeWidth="2.6"
              strokeLinecap="round"
              fill="none"
              animate={{
                y: isCoveringEyes && !showPass ? 2 : isPeeking ? -4 : focusedField === "email" ? 2 : 0,
                rotate: isPeeking ? -4 : 0,
              }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
            />
          </>
        )}

        {/* ── 7. Eyes (Sparkling, Kawaii, or State-Specific) ── */}
        {/* LEFT EYE at (74, 88) */}
        <g id="bear-left-eye">
          {hasError ? (
            /* Angry fierce left eye */
            <g>
              <circle cx="74" cy="88" r="10.5" fill="#7f1d1d" />
              <circle cx="74" cy="88" r="5" fill="#ef4444" />
              <circle cx="72" cy="86" r="2" fill="#ffffff" />
            </g>
          ) : isCoveringEyes && !showPass ? (
            /* Closed happy curved slit when hands cover eyes */
            <path
              d="M 65 89 Q 74 95 83 89"
              stroke="#0f172a"
              strokeWidth="3.2"
              strokeLinecap="round"
              fill="none"
            />
          ) : isBlinking && !isPeeking ? (
            /* Natural Blink Slit */
            <path
              d="M 65 89 Q 74 92 83 89"
              stroke="#0f172a"
              strokeWidth="3.2"
              strokeLinecap="round"
              fill="none"
            />
          ) : (
            /* Open Glossy Eye with Brand Cyan Reflection Sparkle */
            <g>
              <circle
                cx="74"
                cy="88"
                r={isPeeking ? 13 : 11.5}
                fill="#0f172a"
              />
              {/* Pupil & Specular Highlights */}
              <motion.g
                animate={{ x: pupilX, y: pupilY }}
                transition={{ type: "spring", stiffness: 320, damping: 24 }}
              >
                {/* Big Primary Specular Highlight */}
                <circle cx="71" cy="85" r={isPeeking ? 4.6 : 4} fill="#ffffff" />
                {/* Secondary Sparkle Dot */}
                <circle cx="78" cy="91.5" r="2.2" fill="#ffffff" />
                {/* Brand Cyan Shimmer Ring */}
                <circle cx="71.5" cy="92" r="1.3" fill="#2cecf7" fillOpacity="0.9" />
              </motion.g>
            </g>
          )}
        </g>

        {/* RIGHT EYE at (126, 88) */}
        <g id="bear-right-eye">
          {hasError ? (
            /* Angry fierce right eye */
            <g>
              <circle cx="126" cy="88" r="10.5" fill="#7f1d1d" />
              <circle cx="126" cy="88" r="5" fill="#ef4444" />
              <circle cx="124" cy="86" r="2" fill="#ffffff" />
            </g>
          ) : hasWarning ? (
            /* Warning squinted right eye */
            <path
              d="M 118 89 Q 126 85 134 89"
              stroke="#78350f"
              strokeWidth="3.4"
              strokeLinecap="round"
              fill="none"
            />
          ) : isCoveringEyes && !showPass ? (
            /* Closed happy curved slit when hands cover eyes */
            <path
              d="M 117 89 Q 126 95 135 89"
              stroke="#0f172a"
              strokeWidth="3.2"
              strokeLinecap="round"
              fill="none"
            />
          ) : isBlinking && !isPeeking ? (
            /* Natural Blink Slit */
            <path
              d="M 117 89 Q 126 92 135 89"
              stroke="#0f172a"
              strokeWidth="3.2"
              strokeLinecap="round"
              fill="none"
            />
          ) : (
            /* Open Glossy Eye with Brand Cyan Reflection Sparkle */
            <g>
              <circle
                cx="126"
                cy="88"
                r={isPeeking ? 13 : 11.5}
                fill="#0f172a"
              />
              {/* Pupil & Specular Highlights */}
              <motion.g
                animate={{ x: pupilX, y: pupilY }}
                transition={{ type: "spring", stiffness: 320, damping: 24 }}
              >
                {/* Big Primary Specular Highlight */}
                <circle cx="123" cy="85" r={isPeeking ? 4.6 : 4} fill="#ffffff" />
                {/* Secondary Sparkle Dot */}
                <circle cx="130" cy="91.5" r="2.2" fill="#ffffff" />
                {/* Brand Cyan Shimmer Ring */}
                <circle cx="123.5" cy="92" r="1.3" fill="#2cecf7" fillOpacity="0.9" />
              </motion.g>
            </g>
          )}
        </g>

        {/* ── 8. Muzzle / Snout, Nose & Expressive Mouth ── */}
        <g>
          {/* Snout */}
          <ellipse
            cx="100"
            cy="120"
            rx="28"
            ry="21"
            fill={snoutGradId}
            stroke={activeStroke}
            strokeWidth="1.8"
          />

          {/* Nose */}
          <path
            d="M 92 108 Q 100 105 108 108 Q 105 118 100 118 Q 95 118 92 108 Z"
            fill={hasError ? "#450a0a" : "#0f172a"}
          />
          {/* Nose Specular Highlight */}
          <ellipse cx="97" cy="109.5" rx="2.8" ry="1.4" fill="#ffffff" fillOpacity="0.9" />

          {/* Expressive Mouth */}
          {hasError ? (
            /* Angry Grimacing Teeth Growl Mouth */
            <g>
              <path
                d="M 91 127 Q 100 120 109 127 L 106 131 L 102 128 L 98 131 L 94 128 Z"
                fill="#ffffff"
                stroke="#7f1d1d"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
            </g>
          ) : hasWarning ? (
            /* Puzzled Skeptical Wavy Squiggle Mouth */
            <path
              d="M 93 127 Q 97 122 101 127 Q 105 132 109 127"
              stroke="#0f172a"
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
            />
          ) : isCoveringEyes || loading ? (
            /* Cute Gasp / Surprised "O" Mouth */
            <g>
              <ellipse
                cx="100"
                cy="128"
                rx={isPeeking ? 9 : 8}
                ry={isPeeking ? 10 : 8.5}
                fill="#0f172a"
              />
              {/* DevEngine Brand Cyan Tongue */}
              <path
                d="M 95 131 Q 100 136 105 131 Q 100 128 95 131 Z"
                fill="#2cecf7"
                fillOpacity="0.9"
              />
            </g>
          ) : (
            /* Cheerful Open Smile */
            <g>
              <ellipse
                cx="100"
                cy="127"
                rx="8"
                ry="6.5"
                fill="#0f172a"
              />
              <path
                d="M 96 129 Q 100 133 104 129 Z"
                fill="#2cecf7"
                fillOpacity="0.9"
              />
            </g>
          )}
        </g>

        {/* ── 9. REALISTIC ARMS & PAWS (Seamlessly anchored deep behind card) ── */}

        {/* LEFT ARM & PAW:
            Base anchor at (x:34 to 68, y:240) deep behind card.
            Resting on card edge: (x:58, y:142).
            When Password focused: Glides up to Left Eye (x:74, y:88) with 100% coverage!
            When Peeking: Lowers to cheek level (x:68, y:116) so left eye peeks over paw!
        */}
        <motion.g
          animate={
            isCoveringEyes
              ? isPeeking
                ? {
                    // Lowers to cheek level so eye peeks out!
                    x: 10,
                    y: -26,
                    rotate: -20,
                    scale: 1.02,
                  }
                : {
                    // Smoothly and completely covers left eye (74, 88)!
                    x: 16,
                    y: -54,
                    rotate: -12,
                    scale: 1.08,
                  }
              : {
                  // Resting on card edge
                  x: 0,
                  y: 0,
                  rotate: 0,
                  scale: 1,
                }
          }
          transition={{ type: "spring", stiffness: 280, damping: 22 }}
          style={{ originX: "58px", originY: "195px" }}
          filter={isCoveringEyes ? "url(#pawFaceShadow)" : undefined}
        >
          {/* Continuous Arm Shaft extending from deep behind card (y=240) up to paw base */}
          <path
            d="M 34 240 L 40 165 C 40 152 48 144 58 144 C 68 144 76 152 76 165 L 72 240 Z"
            fill={furGradId}
            stroke={activeStroke}
            strokeWidth="2.2"
          />

          {/* Left Paw Hand / Palm */}
          <ellipse
            cx="58"
            cy="142"
            rx="22"
            ry="19"
            fill={furGradId}
            stroke={activeStroke}
            strokeWidth="2.4"
            filter={activeGlowFilter}
          />

          {/* 3 Cute Rounded Paw Fingers on top edge of paw */}
          <ellipse cx="46" cy="128" rx="6" ry="7" fill={furGradId} stroke={activeStroke} strokeWidth="2" />
          <ellipse cx="58" cy="124" rx="6.5" ry="7.5" fill={furGradId} stroke={activeStroke} strokeWidth="2" />
          <ellipse cx="70" cy="128" rx="6" ry="7" fill={furGradId} stroke={activeStroke} strokeWidth="2" />

          {/* Cyber Brand Paw Pads (Center pad + 3 fingertip pads) */}
          <ellipse cx="58" cy="144" rx="9" ry="7.5" fill={pawPadGradId} />
          <circle cx="46" cy="129" r="3" fill={pawPadGradId} />
          <circle cx="58" cy="125" r="3.2" fill={pawPadGradId} />
          <circle cx="70" cy="129" r="3" fill={pawPadGradId} />
        </motion.g>

        {/* RIGHT ARM & PAW:
            Base anchor at (x:132 to 166, y:240) deep behind card.
            Resting on card edge: (x:142, y:142).
            When Password focused: Glides up to Right Eye (x:126, y:88) with 100% coverage!
            When Peeking: Lowers to cheek level (x:132, y:116) so right eye peeks over paw!
        */}
        <motion.g
          animate={
            isCoveringEyes
              ? isPeeking
                ? {
                    // Lowers to cheek level so eye peeks out!
                    x: -10,
                    y: -26,
                    rotate: 20,
                    scale: 1.02,
                  }
                : {
                    // Smoothly and completely covers right eye (126, 88)!
                    x: -16,
                    y: -54,
                    rotate: 12,
                    scale: 1.08,
                  }
              : {
                  // Resting on card edge
                  x: 0,
                  y: 0,
                  rotate: 0,
                  scale: 1,
                }
          }
          transition={{ type: "spring", stiffness: 280, damping: 22 }}
          style={{ originX: "142px", originY: "195px" }}
          filter={isCoveringEyes ? "url(#pawFaceShadow)" : undefined}
        >
          {/* Continuous Arm Shaft extending from deep behind card (y=240) up to paw base */}
          <path
            d="M 166 240 L 160 165 C 160 152 152 144 142 144 C 132 144 124 152 124 165 L 128 240 Z"
            fill={furGradId}
            stroke={activeStroke}
            strokeWidth="2.2"
          />

          {/* Right Paw Hand / Palm */}
          <ellipse
            cx="142"
            cy="142"
            rx="22"
            ry="19"
            fill={furGradId}
            stroke={activeStroke}
            strokeWidth="2.4"
            filter={activeGlowFilter}
          />

          {/* 3 Cute Rounded Paw Fingers on top edge of paw */}
          <ellipse cx="130" cy="128" rx="6" ry="7" fill={furGradId} stroke={activeStroke} strokeWidth="2" />
          <ellipse cx="142" cy="124" rx="6.5" ry="7.5" fill={furGradId} stroke={activeStroke} strokeWidth="2" />
          <ellipse cx="154" cy="128" rx="6" ry="7" fill={furGradId} stroke={activeStroke} strokeWidth="2" />

          {/* Cyber Brand Paw Pads (Center pad + 3 fingertip pads) */}
          <ellipse cx="142" cy="144" rx="9" ry="7.5" fill={pawPadGradId} />
          <circle cx="130" cy="129" r="3" fill={pawPadGradId} />
          <circle cx="142" cy="125" r="3.2" fill={pawPadGradId} />
          <circle cx="154" cy="129" r="3" fill={pawPadGradId} />
        </motion.g>
      </motion.svg>
    </div>
  );
}
