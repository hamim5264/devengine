import { useEffect, useState } from "react";
import type { UpdateLogEntry } from "@/types/update-log";
import { getPublishedUpdateLogs } from "@/lib/services/updateLogsService";
import styles from "@/components/system/SystemPanels.module.css";

interface UpdateLogBodyProps {
  initialLogs?: UpdateLogEntry[];
  embedded?: boolean;
}

function tagTone(tag: string) {
  switch (tag.toUpperCase()) {
    case "OPTIMIZED": return "blue";
    case "PATCHED": return "violet";
    case "SECURITY": return "danger";
    default: return "accent";
  }
}

export default function UpdateLogBody({ initialLogs, embedded = false }: UpdateLogBodyProps) {
  const [logs, setLogs] = useState<UpdateLogEntry[]>(initialLogs || []);
  const [loading, setLoading] = useState(!initialLogs);
  const [visibleCount, setVisibleCount] = useState(5);

  useEffect(() => {
    let active = true;
    getPublishedUpdateLogs().then((data) => { if (active) setLogs(data); })
      .catch((error) => console.error("Failed to load update logs:", error))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return (
    <section className={styles.page} data-embedded={embedded} aria-labelledby="update-log-heading">
      <div className={styles.header}>
        <p className={styles.eyebrow}>Always moving forward</p>
        <h1 id="update-log-heading" className={styles.title}>Update Log</h1>
        <p className={styles.subtitle}>A closer look at what’s new. Explore the improvements, features, and refinements shaping DevEngine.</p>
      </div>

      {loading ? <div className={styles.skeletons} role="status" aria-label="Loading updates">
        {[1, 2, 3].map((item) => <div className={styles.skeleton} key={item} />)}
      </div> : logs.length === 0 ? <div className={`${styles.surface} ${styles.empty}`}>No published updates yet. Check back for what’s next.</div> : <>
        <div className={styles.timeline}>
          {logs.slice(0, visibleCount).map((item) => <article className={styles.timelineEntry} key={item.id}>
            <div className={styles.timelineDate}><span>{item.date}</span></div>
            <div className={`${styles.surface} ${styles.logCard}`}>
              <div className={styles.logHeader}>
                <h2 className={styles.logTitle}>{item.version}</h2>
                <span className={styles.badge} data-tone={tagTone(item.tag)}>{item.tag}</span>
              </div>
              {item.summary && <p className={styles.summary}>{item.summary}</p>}
              {!!item.bullets?.length && <ul className={styles.bullets}>
                {item.bullets.map((bullet, index) => <li key={index}><span className={styles.bulletMark} aria-hidden="true" /><span>{bullet}</span></li>)}
              </ul>}
            </div>
          </article>)}
        </div>
        {visibleCount < logs.length && <div className={styles.buttonRow}>
          <button type="button" className={styles.loadButton} onClick={() => setVisibleCount((count) => count + 5)}>Explore earlier updates <span aria-hidden="true">↓</span></button>
        </div>}
      </>}
    </section>
  );
}
