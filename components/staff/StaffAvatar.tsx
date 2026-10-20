import { useState } from "react";
import s from "./StaffManagement.module.css";
export default function StaffAvatar({ name, url }: { name: string; url?: string }) {
  const [failed, setFailed] = useState<string | null>(null);
  const initials = name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase() || "E";
  return <div className={s.avatar}>{url && failed !== url ? <img src={url} alt={`${name} profile`} onError={() => setFailed(url)} loading="lazy" /> : <span aria-label={`${name} profile`}>{initials}</span>}</div>;
}
