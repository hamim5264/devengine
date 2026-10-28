import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface InteractiveYetiProps {
  focusedField: "email" | "password" | null;
  email?: string;
  emailLength?: number;
  showPass: boolean;
  hasError: boolean;
  hasWarning?: boolean;
  loading: boolean;
  isLight: boolean;
}

export default function InteractiveYeti({
  focusedField,
  email = "",
  emailLength = 0,
  showPass,
  hasError,
  hasWarning = false,
  loading,
  isLight,
}: InteractiveYetiProps) {
  const [isBlinking, setIsBlinking] = useState(false);

  const effectiveEmailLength = email ? email.length : emailLength;
  const hasAtSymbol = email ? email.includes("@") : effectiveEmailLength > 12;

  // Natural blinking when idle or typing email (pauses during password cover or error)
  useEffect(() => {
    if (focusedField === "password" || hasError) return;
    const interval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 120);
    }, 2800 + Math.random() * 2600);

    return () => clearInterval(interval);
  }, [focusedField, hasError]);

  // Eye tracking & parallax calculation based on email input
  const maxChars = 28;
  const clampedLen = Math.min(Math.max(effectiveEmailLength, 0), maxChars);
  const emailProgress = clampedLen / maxChars; // 0 to 1

  let pupilX = 0;
  let pupilY = 0;
  let headTilt = 0;

  if (hasError) {
    // Error state: direct frozen gaze, eyebrows furrowed
    pupilX = 0;
    pupilY = 1;
    headTilt = 0;
  } else if (hasWarning) {
    // Warning state: suspicious down-left look
    pupilX = -3.5;
    pupilY = 3.5;
    headTilt = -3;
  } else if (focusedField === "email") {
    // Tracks text typing across the input field from left to right
    pupilX = -5.5 + emailProgress * 11;
    pupilY = 3.2; // looks down toward email field
    headTilt = -2 + emailProgress * 4;
  } else if (focusedField === "password") {
    if (showPass) {
      // Peeking state: eyes peer out curiously at the user
      pupilX = 1.2;
      pupilY = 1.2;
    }
  }

  // Multi-element 3D parallax offsets
  const noseX = pupilX * 0.45;
  const noseY = pupilY * 0.4;
  const noseRotate = pupilX * 0.75;

  const mouthX = pupilX * 0.38;
  const mouthY = pupilY * 0.3;
  const mouthRotate = pupilX * 0.7;

  const chinX = pupilX * 0.28;
  const chinY = pupilY * 0.22;

  const faceX = pupilX * 0.22;
  const faceY = pupilY * 0.2;
  const faceSkew = -pupilX * 0.35;

  const eyebrowX = pupilX * 0.22;
  const eyebrowY = hasError ? 3 : pupilY * 0.2;
  const eyebrowSkew = -pupilX * 0.6;

  const outerEarX = -pupilX * 0.25;
  const outerEarY = pupilY * 0.25;

  const hairX = pupilX * 0.3;
  const hairS = 1 + Math.abs(pupilX) * 0.02;

  const isCoveringEyes = focusedField === "password";
  const isPeeking = isCoveringEyes && showPass;

  // Mascot portal boundary colors & ambient glow
  const activeStroke = hasError
    ? "#ef4444"
    : hasWarning
    ? "#f59e0b"
    : "#2cecf7";

  // Determine mouth expression state
  let mouthType: "small" | "medium" | "large" | "error" = "small";
  if (hasError) {
    mouthType = "error";
  } else if (focusedField === "email" && effectiveEmailLength > 0) {
    mouthType = hasAtSymbol ? "large" : "medium";
  } else if (effectiveEmailLength > 0) {
    mouthType = hasAtSymbol ? "large" : "medium";
  }

  return (
    <div className="relative flex flex-col items-center pointer-events-none select-none">
      <motion.svg
        viewBox="0 0 200 200"
        className="w-36 sm:w-44 md:w-48 h-auto drop-shadow-2xl overflow-visible"
        animate={
          hasError
            ? {
                // Energetic head shake when credentials error occurs
                x: [-9, 9, -7, 7, -4, 4, -2, 2, 0],
                rotate: [-5, 5, -4, 4, -2, 2, 0],
              }
            : loading
            ? { y: [0, -4, 0], scale: [1, 1.025, 1] }
            : hasWarning
            ? { rotate: headTilt, y: 1 }
            : { y: 0, rotate: headTilt }
        }
        transition={
          hasError
            ? { duration: 0.6, ease: "easeInOut" }
            : loading
            ? { repeat: Infinity, duration: 0.85, ease: "easeInOut" }
            : { type: "spring", stiffness: 220, damping: 22 }
        }
      >
        <defs>
          {/* Circular mask for arms to tuck naturally behind character when lowered */}
          <circle id="yetiArmMaskPath" cx="100" cy="100" r="100" />
          <clipPath id="yetiArmMask">
            <use href="#yetiArmMaskPath" overflow="visible" />
          </clipPath>

          {/* Background portal gradients */}
          <linearGradient id="yetiBgLight" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#e8f8fc" />
            <stop offset="60%" stopColor="#d5f4fb" />
            <stop offset="100%" stopColor="#bcedf8" />
          </linearGradient>

          <linearGradient id="yetiBgDark" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0e1e33" />
            <stop offset="60%" stopColor="#081424" />
            <stop offset="100%" stopColor="#050e1a" />
          </linearGradient>

          {/* Mouth clip masks */}
          <clipPath id="yetiMouthMaskSmall">
            <path d="M100.2,101c-0.4,0-1.4,0-1.8,0c-2.7-0.3-5.3-1.1-8-2.5c-0.7-0.3-0.9-1.2-0.6-1.8 c0.2-0.5,0.7-0.7,1.2-0.7c0.2,0,0.5,0.1,0.6,0.2c3,1.5,5.8,2.3,8.6,2.3s5.7-0.7,8.6-2.3c0.2-0.1,0.4-0.2,0.6-0.2 c0.5,0,1,0.3,1.2,0.7c0.4,0.7,0.1,1.5-0.6,1.9c-2.6,1.4-5.3,2.2-7.9,2.5C101.7,101,100.5,101,100.2,101z" />
          </clipPath>

          <clipPath id="yetiMouthMaskMedium">
            <path d="M95,104.2c-4.5,0-8.2-3.7-8.2-8.2v-2c0-1.2,1-2.2,2.2-2.2h22c1.2,0,2.2,1,2.2,2.2v2 c0,4.5-3.7,8.2-8.2,8.2H95z" />
          </clipPath>

          <clipPath id="yetiMouthMaskLarge">
            <path d="M100 110.2c-9 0-16.2-7.3-16.2-16.2 0-2.3 1.9-4.2 4.2-4.2h24c2.3 0 4.2 1.9 4.2 4.2 0 9-7.2 16.2-16.2 16.2z" />
          </clipPath>

          {/* Cyan Brand Ambient Glow Filter */}
          <filter id="yetiCyanGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="6" floodColor="#2cecf7" floodOpacity="0.35" />
          </filter>
        </defs>

        {/* ── 1. Circular Backdrop Portal ── */}
        <circle
          cx="100"
          cy="100"
          r="98"
          fill={isLight ? "url(#yetiBgLight)" : "url(#yetiBgDark)"}
          stroke={activeStroke}
          strokeWidth="2.5"
          filter={!isLight ? "url(#yetiCyanGlow)" : undefined}
          className="transition-colors duration-300"
        />

        {/* ── 2. Torso and Body Base ── */}
        <g className="body">
          {/* Main White Body Fur */}
          <path
            fill="#FFFFFF"
            d="M193.3,135.9c-5.8-8.4-15.5-13.9-26.5-13.9H151V72c0-27.6-22.4-50-50-50S51,44.4,51,72v50H32.1 c-10.6,0-20,5.1-25.8,13l0,78h187L193.3,135.9z"
          />
          {/* Body Navy Outline */}
          <path
            fill="none"
            stroke="#3A5E77"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M193.3,135.9 c-5.8-8.4-15.5-13.9-26.5-13.9H151V72c0-27.6-22.4-50-50-50S51,44.4,51,72v50H32.1c-10.6,0-20,5.1-25.8,13"
          />
          {/* Chest Light Blue Patch */}
          <path
            fill="#DDF1FA"
            d="M100,156.4c-22.9,0-43,11.1-54.1,27.7c15.6,10,34.2,15.9,54.1,15.9s38.5-5.8,54.1-15.9 C143,167.5,122.9,156.4,100,156.4z"
          />
        </g>

        {/* ── 3. Left & Right Ears with Depth Parallax ── */}
        <motion.g
          className="earL"
          animate={{ x: outerEarX, y: outerEarY }}
          transition={{ type: "spring", stiffness: 220, damping: 22 }}
        >
          <g className="outerEar" fill="#DDF1FA" stroke="#3A5E77" strokeWidth="2.5">
            <circle cx="47" cy="83" r="11.5" />
            <path
              d="M46.3 78.9c-2.3 0-4.1 1.9-4.1 4.1 0 2.3 1.9 4.1 4.1 4.1"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
          <g className="earHair">
            <rect x="51" y="64" fill="#FFFFFF" width="15" height="35" />
            <path
              d="M53.4 62.8C48.5 67.4 45 72.2 42.8 77c3.4-.1 6.8-.1 10.1.1-4 3.7-6.8 7.6-8.2 11.6 2.1 0 4.2 0 6.3.2-2.6 4.1-3.8 8.3-3.7 12.5 1.2-.7 3.4-1.4 5.2-1.9"
              fill="#FFFFFF"
              stroke="#3A5E77"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        </motion.g>

        <motion.g
          className="earR"
          animate={{ x: outerEarX, y: -outerEarY }}
          transition={{ type: "spring", stiffness: 220, damping: 22 }}
        >
          <g className="outerEar" fill="#DDF1FA" stroke="#3A5E77" strokeWidth="2.5">
            <circle cx="155" cy="83" r="11.5" />
            <path
              d="M155.7 78.9c2.3 0 4.1 1.9 4.1 4.1 0 2.3-1.9 4.1-4.1 4.1"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
          <g className="earHair">
            <rect x="131" y="64" fill="#FFFFFF" width="20" height="35" />
            <path
              d="M148.6 62.8c4.9 4.6 8.4 9.4 10.6 14.2-3.4-.1-6.8-.1-10.1.1 4 3.7 6.8 7.6 8.2 11.6-2.1 0-4.2 0-6.3.2 2.6 4.1 3.8 8.3 3.7 12.5-1.2-.7-3.4-1.4-5.2-1.9"
              fill="#FFFFFF"
              stroke="#3A5E77"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        </motion.g>

        {/* ── 4. Chin ── */}
        <motion.path
          className="chin"
          d="M84.1 121.6c2.7 2.9 6.1 5.4 9.8 7.5l.9-4.5c2.9 2.5 6.3 4.8 10.2 6.5 0-1.9-.1-3.9-.2-5.8 3 1.2 6.2 2 9.7 2.5-.3-2.1-.7-4.1-1.2-6.1"
          fill="none"
          stroke="#3A5E77"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          animate={{ x: chinX, y: chinY }}
          transition={{ type: "spring", stiffness: 220, damping: 22 }}
        />

        {/* ── 5. Blue Face Oval ── */}
        <motion.path
          className="face"
          fill="#DDF1FA"
          d="M134.5,46v35.5c0,21.815-15.446,39.5-34.5,39.5s-34.5-17.685-34.5-39.5V46"
          animate={{ x: faceX, y: faceY, skewX: faceSkew }}
          style={{ transformOrigin: "100px 46px" }}
          transition={{ type: "spring", stiffness: 220, damping: 22 }}
        />

        {/* ── 6. Hair Tuft ── */}
        <motion.path
          className="hair"
          fill="#FFFFFF"
          stroke="#3A5E77"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M81.457,27.929 c1.755-4.084,5.51-8.262,11.253-11.77c0.979,2.565,1.883,5.14,2.712,7.723c3.162-4.265,8.626-8.27,16.272-11.235 c-0.737,3.293-1.588,6.573-2.554,9.837c4.857-2.116,11.049-3.64,18.428-4.156c-2.403,3.23-5.021,6.391-7.852,9.474"
          animate={{ x: hairX, scaleY: hairS }}
          style={{ transformOrigin: "100px 30px" }}
          transition={{ type: "spring", stiffness: 220, damping: 22 }}
        />

        {/* ── 7. Eyebrows ── */}
        <motion.g
          className="eyebrow"
          animate={{ x: eyebrowX, y: eyebrowY, skewX: eyebrowSkew }}
          style={{ transformOrigin: "100px 55px" }}
          transition={{ type: "spring", stiffness: 220, damping: 22 }}
        >
          <path
            fill="#FFFFFF"
            d="M138.142,55.064c-4.93,1.259-9.874,2.118-14.787,2.599c-0.336,3.341-0.776,6.689-1.322,10.037 c-4.569-1.465-8.909-3.222-12.996-5.226c-0.98,3.075-2.07,6.137-3.267,9.179c-5.514-3.067-10.559-6.545-15.097-10.329 c-1.806,2.889-3.745,5.73-5.816,8.515c-7.916-4.124-15.053-9.114-21.296-14.738l1.107-11.768h73.475V55.064z"
          />
          <path
            fill="#FFFFFF"
            stroke="#3A5E77"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M63.56,55.102 c6.243,5.624,13.38,10.614,21.296,14.738c2.071-2.785,4.01-5.626,5.816-8.515c4.537,3.785,9.583,7.263,15.097,10.329 c1.197-3.043,2.287-6.104,3.267-9.179c4.087,2.004,8.427,3.761,12.996,5.226c0.545-3.348,0.986-6.696,1.322-10.037 c4.913-0.481,9.857-1.34,14.787-2.599"
          />
        </motion.g>

        {/* ── 8. Left & Right Eyes (Pupils with Smooth Natural Blinking) ── */}
        <motion.g
          className="eyeL"
          animate={{
            x: pupilX,
            y: pupilY,
            scaleY: isBlinking ? 0.12 : 1,
          }}
          style={{ transformOrigin: "85.5px 78.5px" }}
          transition={{
            scaleY: { duration: 0.1 },
            x: { type: "spring", stiffness: 240, damping: 22 },
            y: { type: "spring", stiffness: 240, damping: 22 },
          }}
        >
          <circle cx="85.5" cy="78.5" r="3.5" fill="#3A5E77" />
          <circle cx="84" cy="76" r="1.1" fill="#FFFFFF" />
        </motion.g>

        <motion.g
          className="eyeR"
          animate={{
            x: pupilX,
            y: pupilY,
            scaleY: isBlinking ? 0.12 : 1,
          }}
          style={{ transformOrigin: "114.5px 78.5px" }}
          transition={{
            scaleY: { duration: 0.1 },
            x: { type: "spring", stiffness: 240, damping: 22 },
            y: { type: "spring", stiffness: 240, damping: 22 },
          }}
        >
          <circle cx="114.5" cy="78.5" r="3.5" fill="#3A5E77" />
          <circle cx="113" cy="76" r="1.1" fill="#FFFFFF" />
        </motion.g>

        {/* ── 9. Nose ── */}
        <motion.path
          className="nose"
          d="M97.7 79.9h4.7c1.9 0 3 2.2 1.9 3.7l-2.3 3.3c-.9 1.3-2.9 1.3-3.8 0l-2.3-3.3c-1.3-1.6-.2-3.7 1.8-3.7z"
          fill="#3A5E77"
          animate={{ x: noseX, y: noseY, rotate: noseRotate }}
          style={{ transformOrigin: "100px 82px" }}
          transition={{ type: "spring", stiffness: 220, damping: 22 }}
        />

        {/* ── 10. Dynamic Expressive Mouth ── */}
        <motion.g
          className="mouth"
          animate={{ x: mouthX, y: mouthY, rotate: mouthRotate }}
          style={{ transformOrigin: "100px 101px" }}
          transition={{ type: "spring", stiffness: 220, damping: 22 }}
        >
          {mouthType === "error" ? (
            /* Worried / Frown expression on error */
            <g>
              <path
                d="M93 103c2-2 4.5-3 7-3s5 1 7 3"
                fill="none"
                stroke="#3A5E77"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </g>
          ) : mouthType === "large" ? (
            /* Large open mouth (when email includes '@') */
            <g>
              <path
                className="mouthLargeBG"
                d="M100 110.2c-9 0-16.2-7.3-16.2-16.2 0-2.3 1.9-4.2 4.2-4.2h24c2.3 0 4.2 1.9 4.2 4.2 0 9-7.2 16.2-16.2 16.2z"
                fill="#617E92"
                stroke="#3A5E77"
                strokeLinejoin="round"
                strokeWidth="2.5"
              />
              <g clipPath="url(#yetiMouthMaskLarge)">
                <g className="tongue">
                  <circle cx="100" cy="107" r="8" fill="#CC4A6C" />
                  <ellipse cx="100" cy="102" rx="3" ry="1.5" opacity="0.25" fill="#FFFFFF" />
                </g>
              </g>
              <path
                clipPath="url(#yetiMouthMaskLarge)"
                className="tooth"
                fill="#FFFFFF"
                d="M106,93h-4c-1.1,0-2-0.9-2-2v-2h8v2C108,92.1,107.1,93,106,93z"
              />
            </g>
          ) : mouthType === "medium" ? (
            /* Medium attentive mouth (while typing email) */
            <g>
              <path
                className="mouthMediumBG"
                d="M95,104.2c-4.5,0-8.2-3.7-8.2-8.2v-2c0-1.2,1-2.2,2.2-2.2h22c1.2,0,2.2,1,2.2,2.2v2 c0,4.5-3.7,8.2-8.2,8.2H95z"
                fill="#617E92"
                stroke="#3A5E77"
                strokeLinejoin="round"
                strokeWidth="2.5"
              />
              <g clipPath="url(#yetiMouthMaskMedium)">
                <g className="tongue">
                  <circle cx="100" cy="107" r="8" fill="#CC4A6C" />
                  <ellipse cx="100" cy="101" rx="3" ry="1.5" opacity="0.25" fill="#FFFFFF" />
                </g>
              </g>
              <path
                clipPath="url(#yetiMouthMaskMedium)"
                className="tooth"
                fill="#FFFFFF"
                d="M106,94h-4c-1.1,0-2-0.9-2-2v-2h8v2C108,93.1,107.1,94,106,94z"
              />
            </g>
          ) : (
            /* Default small calm mouth */
            <g>
              <path
                className="mouthBG"
                fill="#617E92"
                d="M100.2,101c-0.4,0-1.4,0-1.8,0c-2.7-0.3-5.3-1.1-8-2.5c-0.7-0.3-0.9-1.2-0.6-1.8 c0.2-0.5,0.7-0.7,1.2-0.7c0.2,0,0.5,0.1,0.6,0.2c3,1.5,5.8,2.3,8.6,2.3s5.7-0.7,8.6-2.3c0.2-0.1,0.4-0.2,0.6-0.2 c0.5,0,1,0.3,1.2,0.7c0.4,0.7,0.1,1.5-0.6,1.9c-2.6,1.4-5.3,2.2-7.9,2.5C101.7,101,100.5,101,100.2,101z"
              />
              <g clipPath="url(#yetiMouthMaskSmall)">
                <g className="tongue">
                  <circle cx="100" cy="107" r="8" fill="#CC4A6C" />
                  <ellipse cx="100" cy="100.5" rx="3" ry="1.5" opacity="0.15" fill="#FFFFFF" />
                </g>
              </g>
              <path
                clipPath="url(#yetiMouthMaskSmall)"
                className="tooth"
                fill="#FFFFFF"
                d="M106,97h-4c-1.1,0-2-0.9-2-2v-2h8v2C108,96.1,107.1,97,106,97z"
              />
              <path
                className="mouthOutline"
                fill="none"
                stroke="#3A5E77"
                strokeWidth="2.5"
                strokeLinejoin="round"
                d="M100.2,101c-0.4,0-1.4,0-1.8,0c-2.7-0.3-5.3-1.1-8-2.5c-0.7-0.3-0.9-1.2-0.6-1.8 c0.2-0.5,0.7-0.7,1.2-0.7c0.2,0,0.5,0.1,0.6,0.2c3,1.5,5.8,2.3,8.6,2.3s5.7-0.7,8.6-2.3c0.2-0.1,0.4-0.2,0.6-0.2 c0.5,0,1,0.3,1.2,0.7c0.4,0.7,0.1,1.5-0.6,1.9c-2.6,1.4-5.3,2.2-7.9,2.5C101.7,101,100.5,101,100.2,101z"
              />
            </g>
          )}
        </motion.g>

        {/* ── 11. Arms (Animated with Cover, Peek, & Rest states) ── */}
        <g className="arms" clipPath="url(#yetiArmMask)">
          {/* Left Arm & Claws */}
          <motion.g
            className="armL"
            style={{ transformBox: "fill-box", transformOrigin: "0% 0%" }}
            initial={false}
            animate={
              isCoveringEyes
                ? isPeeking
                  ? { x: -93, y: 38, rotate: 18 }
                  : { x: -93, y: 2, rotate: 0 }
                : { x: -93, y: 220, rotate: 105 }
            }
            transition={
              isCoveringEyes
                ? { duration: 0.45, ease: [0.16, 1, 0.3, 1] }
                : { duration: 0.65, ease: [0.34, 1.56, 0.64, 1] }
            }
          >
            <path
              fill="#DDF1FA"
              stroke="#3A5E77"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeMiterlimit="10"
              strokeWidth="2.5"
              d="M121.3 97.4L111 58.7l38.8-10.4 20 36.1z"
            />
            <path
              fill="#DDF1FA"
              stroke="#3A5E77"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeMiterlimit="10"
              strokeWidth="2.5"
              d="M134.4 52.5l19.3-5.2c2.7-.7 5.4.9 6.1 3.5.7 2.7-.9 5.4-3.5 6.1L146 59.7M160.8 76.5l19.4-5.2c2.7-.7 5.4.9 6.1 3.5.7 2.7-.9 5.4-3.5 6.1l-18.3 4.9M158.3 66.8l23.1-6.2c2.7-.7 5.4.9 6.1 3.5.7 2.7-.9 5.4-3.5 6.1l-23.1 6.2M150.9 58.4l26-7c2.7-.7 5.4.9 6.1 3.5.7 2.7-.9 5.4-3.5 6.1l-21.3 5.7"
            />
            {/* Claws accented with brand cyan #2cecf7 */}
            <path
              fill="#2cecf7"
              d="M178.8 74.7l2.2-.6c1.1-.3 2.2.3 2.4 1.4.3 1.1-.3 2.2-1.4 2.4l-2.2.6-1-3.8zM180.1 64l2.2-.6c1.1-.3 2.2.3 2.4 1.4.3 1.1-.3 2.2-1.4 2.4l-2.2.6-1-3.8zM175.5 54.9l2.2-.6c1.1-.3 2.2.3 2.4 1.4.3 1.1-.3 2.2-1.4 2.4l-2.2.6-1-3.8zM152.1 49.4l2.2-.6c1.1-.3 2.2.3 2.4 1.4.3 1.1-.3 2.2-1.4 2.4l-2.2.6-1-3.8z"
            />
            <path
              fill="#FFFFFF"
              stroke="#3A5E77"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.5"
              d="M123.5 96.8c-41.4 14.9-84.1 30.7-108.2 35.5L1.2 80c33.5-9.9 71.9-16.5 111.9-21.8"
            />
            <path
              fill="#FFFFFF"
              stroke="#3A5E77"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.5"
              d="M108.5 59.4c7.7-5.3 14.3-8.4 22.8-13.2-2.4 5.3-4.7 10.3-6.7 15.1 4.3.3 8.4.7 12.3 1.3-4.2 5-8.1 9.6-11.5 13.9 3.1 1.1 6 2.4 8.7 3.8-1.4 2.9-2.7 5.8-3.9 8.5 2.5 3.5 4.6 7.2 6.3 11-4.9-.8-9-.7-16.2-2.7M94.5 102.8c-.6 4-3.8 8.9-9.4 14.7-2.6-1.8-5-3.7-7.2-5.7-2.5 4.1-6.6 8.8-12.2 14-1.9-2.2-3.4-4.5-4.5-6.9-4.4 3.3-9.5 6.9-15.4 10.8-.2-3.4.1-7.1 1.1-10.9M97.5 62.9c-1.7-2.4-5.9-4.1-12.4-5.2-.9 2.2-1.8 4.3-2.5 6.5-3.8-1.8-9.4-3.1-17-3.8.5 2.3 1.2 4.5 1.9 6.8-5-.6-11.2-.9-18.4-1 2 2.9.9 3.5 3.9 6.2"
            />
          </motion.g>

          {/* Right Arm & Claws */}
          <motion.g
            className="armR"
            style={{ transformBox: "fill-box", transformOrigin: "100% 0%" }}
            initial={false}
            animate={
              isCoveringEyes
                ? { x: -93, y: 2, rotate: 0 }
                : { x: -93, y: 220, rotate: -105 }
            }
            transition={
              isCoveringEyes
                ? { duration: 0.45, delay: 0.08, ease: [0.16, 1, 0.3, 1] }
                : { duration: 0.65, delay: 0.04, ease: [0.34, 1.56, 0.64, 1] }
            }
          >
            <path
              fill="#DDF1FA"
              stroke="#3A5E77"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeMiterlimit="10"
              strokeWidth="2.5"
              d="M265.4 97.3l10.4-38.6-38.9-10.5-20 36.1z"
            />
            <path
              fill="#DDF1FA"
              stroke="#3A5E77"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeMiterlimit="10"
              strokeWidth="2.5"
              d="M252.4 52.4L233 47.2c-2.7-.7-5.4.9-6.1 3.5-.7 2.7.9 5.4 3.5 6.1l10.3 2.8M226 76.4l-19.4-5.2c-2.7-.7-5.4.9-6.1 3.5-.7 2.7.9 5.4 3.5 6.1l18.3 4.9M228.4 66.7l-23.1-6.2c-2.7-.7-5.4.9-6.1 3.5-.7 2.7.9 5.4 3.5 6.1l23.1 6.2M235.8 58.3l-26-7c-2.7-.7-5.4.9-6.1 3.5-.7 2.7.9 5.4 3.5 6.1l21.3 5.7"
            />
            {/* Claws accented with brand cyan #2cecf7 */}
            <path
              fill="#2cecf7"
              d="M207.9 74.7l-2.2-.6c-1.1-.3-2.2.3-2.4 1.4-.3 1.1.3 2.2 1.4 2.4l2.2.6 1-3.8zM206.7 64l-2.2-.6c-1.1-.3-2.2.3-2.4 1.4-.3 1.1.3 2.2 1.4 2.4l2.2.6 1-3.8zM211.2 54.8l-2.2-.6c-1.1-.3-2.2.3-2.4 1.4-.3 1.1.3 2.2 1.4 2.4l2.2.6 1-3.8zM234.6 49.4l-2.2-.6c-1.1-.3-2.2.3-2.4 1.4-.3 1.1.3 2.2 1.4 2.4l2.2.6 1-3.8z"
            />
            <path
              fill="#FFFFFF"
              stroke="#3A5E77"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.5"
              d="M263.3 96.7c41.4 14.9 84.1 30.7 108.2 35.5l14-52.3C352 70 313.6 63.5 273.6 58.1"
            />
            <path
              fill="#FFFFFF"
              stroke="#3A5E77"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.5"
              d="M278.2 59.3l-18.6-10 2.5 11.9-10.7 6.5 9.9 8.7-13.9 6.4 9.1 5.9-13.2 9.2 23.1-.9M284.5 100.1c-.4 4 1.8 8.9 6.7 14.8 3.5-1.8 6.7-3.6 9.7-5.5 1.8 4.2 5.1 8.9 10.1 14.1 2.7-2.1 5.1-4.4 7.1-6.8 4.1 3.4 9 7 14.7 11 1.2-3.4 1.8-7 1.7-10.9M314 66.7s5.4-5.7 12.6-7.4c1.7 2.9 3.3 5.7 4.9 8.6 3.8-2.5 9.8-4.4 18.2-5.7.1 3.1.1 6.1 0 9.2 5.5-1 12.5-1.6 20.8-1.9-1.4 3.9-2.5 8.4-2.5 8.4"
            />
          </motion.g>
        </g>
      </motion.svg>
    </div>
  );
}
