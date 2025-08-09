// components/HelixLoader.tsx
import React from "react";

type Props = {
  size?: number; // px
  color?: string; // CSS color
  speed?: number; // seconds
  className?: string;
};

export default function HelixLoader({
  size = 45,
  color = "#14b8a6",
  speed = 2.5,
  className = "",
}: Props) {
  const style: React.CSSProperties = {
    ["--uib-size" as any]: `${size}px`,
    ["--uib-color" as any]: color,
    ["--uib-speed" as any]: `${speed}s`,
  };

  return (
    <div
      className={`de-helix ${className}`}
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
  );
}
