import { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import HelixLoader from "@/components/HelixLoader";
import { type LabProject, type LabProjectStatus, getYouTubeVideoId } from "@/types/lab";
import { getPublicLabProjects, DEFAULT_LAB_PROJECTS } from "@/lib/services/labService";
import { AnimatedTitle, DepthStage, FeatureModal, FeaturePage, Icon, Marquee, Portal, PreviewImage, Reveal } from "@/components/features/FeatureExperience";
import styles from "@/components/features/Features.module.css";

const STATUS: Record<LabProjectStatus, { label: string; icon: string }> = {
  CONCEPT: { label: "Concept", icon: "lightbulb" },
  IN_DEVELOPMENT: { label: "In development", icon: "engineering" },
  ALPHA: { label: "Alpha", icon: "science" },
  BETA: { label: "Beta", icon: "bug_report" },
  LAUNCHING_SOON: { label: "Launching soon", icon: "rocket_launch" },
};
const FILTERS = [{ key: "ALL", label: "All projects", icon: "apps" }, ...Object.entries(STATUS).map(([key, value]) => ({ key, ...value }))];
const ease: [number, number, number, number] = [0.22, 1, 0.36, 1];

function ReleaseCountdown({ date }: { date: string }) {
  const [now, setNow] = useState<number | null>(null);
  const target = new Date(date).getTime();
  useEffect(() => {
    setNow(Date.now());
    if (!Number.isFinite(target)) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [target]);
  if (!Number.isFinite(target)) return <span className={styles.small}>Schedule to be confirmed</span>;
  if (now === null) return <span className={styles.small}>Loading countdown…</span>;
  const difference = Math.max(0, target - now);
  if (!difference) return <span className={styles.small}>Release window reached</span>;
  const values = [Math.floor(difference / 86400000), Math.floor((difference % 86400000) / 3600000), Math.floor((difference % 3600000) / 60000), Math.floor((difference % 60000) / 1000)];
  return <div className={styles.countdown} aria-label="Time until estimated release">{["Days", "Hrs", "Min", "Sec"].map((label, index) => <span key={label}><strong>{String(values[index]).padStart(2, "0")}</strong><small>{label}</small></span>)}</div>;
}

function ProjectArtwork({ project }: { project: LabProject }) {
  return <div className={styles.projectVisual}><div className={styles.projectDevices}><div className={styles.laptop}><PreviewImage src={project.laptopImageUrl} alt={`${project.title} desktop preview`} /></div><div className={styles.projectPhone}><PreviewImage src={project.phoneImageUrl} alt={`${project.title} mobile preview`} /></div></div></div>;
}

export default function LabPage() {
  const [projects, setProjects] = useState<LabProject[]>(DEFAULT_LAB_PROJECTS);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("ALL");
  const [video, setVideo] = useState<LabProject | null>(null);
  const reduced = useReducedMotion();
  useEffect(() => {
    let mounted = true;
    getPublicLabProjects().then((data) => { if (mounted && data.length > 0) setProjects(data); }).catch((error) => console.error("Failed to load lab projects:", error)).finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);
  const counts = useMemo(() => { const result: Record<string, number> = { ALL: projects.length }; projects.forEach((project) => { result[project.status] = (result[project.status] || 0) + 1; }); return result; }, [projects]);
  const filtered = useMemo(() => status === "ALL" ? projects : projects.filter((project) => project.status === status), [status, projects]);
  const activeBuilds = projects.filter((project) => ["IN_DEVELOPMENT", "ALPHA", "BETA"].includes(project.status)).length;
  return (
    <FeaturePage>
      <Head><title>DevEngine Lab | Ideas Taking Shape</title><meta name="description" content="Explore DevEngine’s research and development: upcoming mobile apps, web platforms, AI engines, and cloud services. Follow our experiments from concept to launch." /></Head>
      <section className={`${styles.section} ${styles.hero}`}><div className={styles.inner}><div className={styles.split}>
        <div><Reveal><span className={styles.eyebrow}>DevEngine / Research & development</span></Reveal><AnimatedTitle text="A space for" accent="what comes next." /><Reveal delay={0.15}><p className={`${styles.body} ${styles.lead}`}>The Lab is where ideas become experiments, and experiments become possibilities. Follow the platforms, prototypes, and new experiences taking shape at DevEngine.</p><div className={styles.metrics}><div className={styles.metric}><strong>{projects.length}</strong><span>Projects in the lab</span></div><div className={styles.metric}><strong>{activeBuilds}</strong><span>Active builds</span></div><div className={styles.metric}><strong>{projects.filter((project) => project.progressPercent >= 70).length}</strong><span>Near launch</span></div></div><div className={styles.actions}><a className={styles.secondaryButton} href="#experiments">Explore the experiments <Icon name="south" /></a></div></Reveal></div>
        <DepthStage><Portal label="Curiosity → Experiment → Possibility" /></DepthStage>
      </div></div></section>
      <Marquee words={["Always exploring", "Never standing still", "The next possibility"]} />
      <section id="experiments" className={styles.section}><div className={styles.inner}>
        <Reveal><div className={styles.sectionHeader}><div><span className={styles.eyebrow}>01 / Work in progress</span><h2 className={styles.heading}>Currently in the Lab.</h2></div><p className={styles.small}>Early ideas. Open possibilities. Evolving every day.</p></div></Reveal>
        <div className={styles.labLayout}>
          <aside className={styles.labSidebar} aria-label="Filter experiments"><span className={styles.small}>Explore by stage</span><div className={styles.filters}>{FILTERS.map((filter) => <button key={filter.key} type="button" className={styles.filter} aria-pressed={status === filter.key} onClick={() => setStatus(filter.key)}><Icon name={filter.icon} /><span>{filter.label}</span><span className={styles.filterCount}>{counts[filter.key] || 0}</span></button>)}</div><div className={styles.sidebarSummary}><span>In the lab</span><strong>{projects.length} projects</strong></div></aside>
          <div>
            <div className={styles.metaRow}><h3 className={styles.cardTitle}>{status === "ALL" ? "All experiments" : STATUS[status as LabProjectStatus]?.label}</h3><span className={styles.small} aria-live="polite">{filtered.length} project{filtered.length === 1 ? "" : "s"}</span></div>
            {loading ? <div className={styles.empty} role="status"><HelixLoader size={48} color="#2cecf7" /><p className={styles.small}>Opening the Lab…</p></div> : filtered.length ? <motion.div className={styles.projectGrid} layout={!reduced}>
              {filtered.map((project) => {
                const state = STATUS[project.status] || STATUS.CONCEPT;
                const progress = Math.min(100, Math.max(0, Number(project.progressPercent) || 0));
                const release = new Date(project.estimatedRelease);
                return <motion.article key={project.id} layout={!reduced} className={`${styles.card} ${styles.project}`} initial={reduced ? false : { opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.08 }} transition={{ duration: reduced ? 0 : 0.7, ease }}>
                  <ProjectArtwork project={project} />
                  <div className={styles.cardBody}><div className={styles.metaRow}><span className={styles.number}>LAB / {String(project.order).padStart(3, "0")}</span><span className={styles.badge}><Icon name={state.icon} />{state.label}</span></div><h4 className={styles.cardTitle}>{project.title}</h4><p className={styles.body}>{project.tagline}</p><p className={`${styles.small} ${styles.projectDescription}`}>{project.description}</p>
                    <div className={styles.progress}><div className={styles.progressLabels}><span>Development progress</span><strong>{progress}%</strong></div><div className={styles.progressTrack} role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label={`${project.title} development progress`}><motion.div className={styles.progressFill} style={{ width: `${progress}%` }} initial={reduced ? false : { scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ duration: 1.2, ease }} /></div></div>
                    <div className={styles.release}><div><p className={styles.releaseLabel}>Estimated release</p><p className={styles.releaseDate}>{Number.isFinite(release.getTime()) ? release.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }) : "To be announced"}</p></div><ReleaseCountdown date={project.estimatedRelease} /></div>
                    <div className={styles.tags}>{(project.techStack || []).map((tech, index) => <span className={styles.tag} key={`tech-${index}`}>{tech}</span>)}{(project.tags || []).map((tag, index) => <span className={styles.tag} key={`tag-${index}`}>{tag}</span>)}</div>
                    <div className={styles.projectFooter}><span className={styles.small}>{project.category}</span>{getYouTubeVideoId(project.youtubeUrl) && <button type="button" className={styles.secondaryButton} onClick={() => setVideo(project)} aria-label={`Watch ${project.title} demo`}><Icon name="play_arrow" />Watch demo</button>}</div>
                  </div>
                </motion.article>;
              })}
            </motion.div> : <div className={`${styles.card} ${styles.empty}`}><div className={styles.emptyIcon}><Icon name="science" /></div><h3 className={styles.cardTitle}>Room for the next idea.</h3><p className={styles.body}>No experiments are at this stage right now. Explore the full collection to see what’s taking shape.</p><div className={styles.actions}><button className={styles.button} onClick={() => setStatus("ALL")}>View all projects <Icon name="arrow_outward" /></button></div></div>}
          </div>
        </div>
      </div></section>
      <section className={styles.section}><div className={styles.inner}><Reveal><div className={`${styles.card} ${styles.cta}`}><span className={styles.eyebrow}>Join the experiment</span><h2 className={styles.heading}>The future starts<br /><span className={styles.titleAccent}>with a what if.</span></h2><p className={styles.body}>Have an idea worth exploring? Partner with DevEngine to take it from the first question to a product people can use.</p><div className={styles.actions}><Link className={styles.button} href="/services">Explore our capabilities <Icon name="north_east" /></Link><Link className={styles.secondaryButton} href="/projects">Completed projects <Icon name="arrow_outward" /></Link><Link className={styles.secondaryButton} href="/home#contact">Bring us an idea <Icon name="arrow_outward" /></Link></div></div></Reveal></div></section>
      {video && <FeatureModal title={`${video.title} · Demo`} onClose={() => setVideo(null)} wide><p className={styles.body} style={{ marginBottom: "1rem" }}>{video.tagline}</p><iframe className={styles.video} src={`https://www.youtube-nocookie.com/embed/${getYouTubeVideoId(video.youtubeUrl)}?autoplay=1&rel=0`} title={`${video.title} demo video`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen /><div className={styles.actions}><button className={styles.secondaryButton} onClick={() => setVideo(null)}>Close preview <Icon name="close" /></button></div></FeatureModal>}
    </FeaturePage>
  );
}
