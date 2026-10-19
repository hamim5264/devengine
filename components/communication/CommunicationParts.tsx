import { useEffect, useState } from 'react';
import s from './Communication.module.css';
export function Avatar({ name, url, large = false }: { name: string; url?: string; large?: boolean }) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [url]);
  const safe = url && (/^https:\/\//i.test(url) || url.startsWith('/assets/') || url.startsWith('/uploads/'));
  return <span className={s.avatar} data-large={large || undefined}>{safe && !broken ? <img src={url} alt="" onError={() => setBroken(true)} /> : name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()}</span>;
}
export function formatDate(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? '' : date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); }
