// components/HelixLoader.tsx
import React from "react";

type Props = {
  size?: number; // px
  color?: string; // CSS color
  speed?: number; // seconds
  text?: string;
  className?: string;
};

export default function HelixLoader({
  size = 45,
  color = "#38f2ff",
  speed = 2.5,
  text,
  className = "",
}: Props) {
  const style: React.CSSProperties = {
    ["--uib-size" as any]: `${size}px`,
    ["--uib-color" as any]: color,
    ["--uib-speed" as any]: `${speed}s`,
  };

  return (
    <div className={`flex flex-col items-center justify-center gap-4 ${className}`}>
      <div
        className="de-helix"
        style={style}
        role="status"
        aria-label="Loading"
      >
        <div className="de-helix__slice" />
        <div className="de-helix__slice" />
        <div className="de-helix__slice" />
        <div className="de-helix__slice" />
        <div className="de-helix__slice" />
        <div className="de-helix__slice" />
      </div>
      {text && (
        <p className="font-jetbrains text-xs text-[#38f2ff] tracking-widest uppercase animate-pulse">
          {text}
        </p>
      )}
    </div>
  );
}
