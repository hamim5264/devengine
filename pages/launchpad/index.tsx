import { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import HelixLoader from "@/components/HelixLoader";
import { getCachedData, setCachedData } from "@/lib/utils/cacheService";
import type { LaunchpadConfig, LaunchpadFeaturedSlide, AppLabItem } from "@/types/launchpad";
import { getLaunchpadConfig, getAppLabApps, DEFAULT_LAUNCHPAD_CONFIG, getCleanAppThumbnail } from "@/lib/services/launchpadService";
import { AnimatedTitle, DepthStage, FeatureModal, FeaturePage, Icon, Marquee, PreviewImage, Reveal } from "@/components/features/FeatureExperience";
import styles from "@/components/features/Features.module.css";

const SECTIONS = [{ id: "overview", label: "Overview" }, { id: "featured", label: "Featured" }, { id: "apps", label: "Apps" }, { id: "download", label: "Download" }];
const ease: [number, number, number, number] = [0.22, 1, 0.36, 1];

export default function LaunchpadPage() {
  const [config, setConfig] = useState<LaunchpadConfig>(DEFAULT_LAUNCHPAD_CONFIG);
  const [apps, setApps] = useState<AppLabItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState("overview");
  const [slideIndex, setSlideIndex] = useState(0);
  const [category, setCategory] = useState("All");
  const [notice, setNotice] = useState<{ title: string; message: string } | null>(null);
  const [preview, setPreview] = useState<AppLabItem | null>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    let mounted = true;
    // Restore browser storage after hydration, then refresh the same CMS data.
    const cachedConfig = getCachedData<LaunchpadConfig | null>("launchpad_config", null);
    const cachedApps = getCachedData<AppLabItem[] | null>("launchpad_apps", null);
    if (cachedConfig) setConfig(cachedConfig);
    if (cachedApps) setApps(cachedApps);
    if (cachedConfig && cachedApps !== null) setLoading(false);
    Promise.all([getLaunchpadConfig(), getAppLabApps()]).then(([loadedConfig, loadedApps]) => {
      if (!mounted) return;
      if (loadedConfig) { setConfig(loadedConfig); setCachedData("launchpad_config", loadedConfig); }
      setApps(loadedApps); setCachedData("launchpad_apps", loadedApps);
    }).catch((error) => console.error("Failed to load launchpad data:", error)).finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (loading) return;
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible[0]) setActiveSection(visible[0].target.id);
    }, { rootMargin: "-150px 0px -45% 0px", threshold: 0 });
    SECTIONS.forEach(({ id }) => { const element = document.getElementById(id); if (element) observer.observe(element); });
    return () => observer.disconnect();
  }, [loading]);

  const categories = useMemo(() => Array.from(new Set(["All", ...(config.categories || []), ...apps.map((app) => app.category || "").filter(Boolean)])), [config.categories, apps]);
  const filtered = useMemo(() => category === "All" ? apps : apps.filter((app) => app.category?.toLowerCase() === category.toLowerCase()), [apps, category]);
  const slides = config.featuredSlides || [];
  const current = slides[slideIndex] || slides[0];
  const scrollTo = (id: string) => { document.getElementById(id)?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" }); setActiveSection(id); };
  const openLink = (url: string) => window.open(url, "_blank", "noopener,noreferrer");
  const storeAction = (slide: LaunchpadFeaturedSlide, store: "google" | "apple") => {
    const url = store === "google" ? slide.googlePlayUrl : slide.appStoreUrl;
    const message = store === "google" ? slide.googlePlayMessage : slide.appStoreMessage;
    if (url?.trim()) openLink(url);
    else setNotice({ title: `${slide.title} · ${store === "google" ? "Google Play" : "App Store"}`, message: message || `${slide.title} is currently in testing. The public release is coming soon.` });
  };
  const download = (app: AppLabItem) => {
    if (app.apkUrl?.trim()) openLink(app.apkUrl);
    else { setPreview(null); setNotice({ title: "Download APK notice", message: `The APK build for ${app.name} is being prepared. Please check back shortly.` }); }
  };
  const mobile = config.mobileAppSection;
  const stage = config.overview.stage;

  return (
    <FeaturePage>
      <Head><title>DevEngine Launchpad | Early Access & Experimental Apps</title><meta name="description" content={config.overview.subtitle} /></Head>
      {loading ? <div className={styles.loading}><HelixLoader size={52} color="#2cecf7" /><p className={styles.small}>Opening the Launchpad…</p></div> : <>
        <nav className={styles.subnav} aria-label="Launchpad sections"><div className={styles.subnavInner}><span className={styles.small}>DevEngine / Launchpad</span><div className={styles.subnavLinks}>{SECTIONS.map((section) => <button key={section.id} type="button" className={styles.filter} aria-current={activeSection === section.id ? "true" : undefined} onClick={() => scrollTo(section.id)}>{section.label}</button>)}</div></div></nav>
        <section id="overview" className={`${styles.section} ${styles.launchHero}`}>
          <div className={styles.inner}>
            <Reveal><span className={styles.eyebrow}>{config.overview.badgeText}</span></Reveal>
            <AnimatedTitle text={config.overview.title} accent={config.overview.titleHighlight} />
            <Reveal delay={0.15}><div className={styles.sectionHeader}><p className={`${styles.body} ${styles.lead}`}>{config.overview.subtitle}</p><button type="button" className={styles.secondaryButton} onClick={() => scrollTo("apps")}>Explore the collection <Icon name="south_east" /></button></div></Reveal>
            <DepthStage><div className={styles.stage}>
              <div className={styles.stageCaption}><span>Independent ideas. Real experiences.</span><span>Explore / Test / Discover</span></div>
              <div className={styles.deviceTrio}>
                {[{ src: stage.leftImage, caption: stage.leftCaption }, { src: stage.centerImage, caption: stage.centerCaption }, { src: stage.rightImage, caption: stage.rightCaption }].map((item, index) => <figure className={styles.deviceItem} key={index}><div className={styles.deviceFrame}><PreviewImage src={item.src} alt={item.caption || `Launchpad application ${index + 1}`} priority={index === 1} /></div>{item.caption && <figcaption>{item.caption}</figcaption>}</figure>)}
              </div>
            </div></DepthStage>
          </div>
        </section>
        <Marquee words={["Ideas in motion", "Built to explore", "Made by DevEngine"]} />
        <section id="featured" className={styles.section}><div className={styles.inner}>
          <Reveal><div className={styles.sectionHeader}><div><span className={styles.eyebrow}>01 / In the spotlight</span><h2 className={styles.heading}>Featured experiences.</h2></div><p className={styles.small}>A closer look at what we’re building.</p></div></Reveal>
          {current ? <>
            <div role="region" aria-roledescription="carousel" aria-label="Featured applications">
              <AnimatePresence mode="wait" initial={false}><motion.div key={current.id || slideIndex} className={styles.showcase} initial={reduced ? false : { opacity: 0, y: 24, clipPath: "inset(0 0 8% 0 round 28px)" }} animate={{ opacity: 1, y: 0, clipPath: "inset(0 0 0% 0 round 28px)" }} exit={reduced ? undefined : { opacity: 0, y: -16 }} transition={{ duration: reduced ? 0 : 0.55, ease }}>
                <div className={styles.showcaseCopy}><div className={styles.metaRow}><span className={styles.badge}>{current.status}</span><span className={styles.number}>v{current.version}</span></div><h3 className={styles.heading}>{current.title}</h3><p className={styles.cardTitle}>{current.subtitle}</p><p className={styles.body}>{current.description}</p><div className={styles.actions}><button className={styles.button} onClick={() => storeAction(current, "google")}><img src="/assets/playstore.png" alt="" />Google Play</button><button className={styles.secondaryButton} onClick={() => storeAction(current, "apple")}><img src="/assets/appstore.png" alt="" />App Store</button></div></div>
                <div className={styles.showcaseImage}><div className={styles.deviceFrame}><PreviewImage src={current.phoneImage} alt={`${current.title} application preview`} /></div></div>
              </motion.div></AnimatePresence>
            </div>
            {slides.length > 1 && <div className={styles.controls}><button className={styles.iconButton} onClick={() => setSlideIndex((index) => ((index - 1 + slides.length) % slides.length))} aria-label="Previous featured app"><Icon name="west" /></button>{slides.map((slide, index) => <button key={slide.id || index} className={styles.slideDot} aria-label={`Show ${slide.title}`} aria-current={index === slideIndex ? "true" : undefined} onClick={() => setSlideIndex(index)} />)}<button className={styles.iconButton} onClick={() => setSlideIndex((index) => ((index + 1) % slides.length))} aria-label="Next featured app"><Icon name="east" /></button></div>}
          </> : <div className={`${styles.card} ${styles.empty}`}><h3 className={styles.cardTitle}>New experiences are on the way.</h3><p className={styles.body}>Featured builds will appear here when they’re published.</p></div>}
        </div></section>
        <section id="apps" className={styles.section}><div className={styles.inner}>
          <Reveal><div className={styles.sectionHeader}><div><span className={styles.eyebrow}>02 / The collection</span><h2 className={styles.heading}>Find your next discovery.</h2></div><span className={styles.small} aria-live="polite">{filtered.length} available application{filtered.length === 1 ? "" : "s"}</span></div></Reveal>
          <div className={styles.filters} aria-label="Filter applications by category">{categories.map((item) => <button key={item} type="button" className={styles.filter} aria-pressed={category === item} onClick={() => setCategory(item)}>{item}</button>)}</div>
          <div style={{ marginTop: "2rem" }}>
            {filtered.length ? <motion.div layout={!reduced} className={styles.appGrid}>{filtered.map((app) => <motion.article layout={!reduced} key={app.id || app.slug} initial={reduced ? false : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease }} className={`${styles.card} ${styles.appCard}`}><div className={styles.appThumbnail}><PreviewImage src={getCleanAppThumbnail(app)} alt={`${app.name} preview`} /></div><div className={styles.cardBody}><div className={styles.metaRow}><span className={styles.badge}>{app.status || "EARLY ACCESS"}</span><span className={styles.number}>v{app.version || "1.0.0"}</span></div><h3 className={styles.cardTitle}><Link href={`/app-lab/${app.slug}`}>{app.name}</Link></h3><p className={styles.body}>{app.subtitle || app.description}</p><div className={styles.tags}>{app.category && <span className={styles.tag}>{app.category}</span>}{app.platform && <span className={styles.tag}>{app.platform}</span>}</div><div className={styles.actions}><button className={styles.secondaryButton} onClick={() => setPreview(app)}>Preview <Icon name="arrow_outward" /></button><button className={styles.button} onClick={() => download(app)}>Download APK <Icon name="download" /></button></div></div></motion.article>)}</motion.div> : <Reveal><div className={`${styles.card} ${styles.empty}`}><div className={styles.emptyIcon}><Icon name="deployed_code" /></div><h3 className={styles.cardTitle}>{category === "All" ? "The next release starts here." : `Nothing in ${category} just yet.`}</h3><p className={styles.body}>New applications will appear here as builds become available. In the meantime, explore our featured experiences.</p><div className={styles.actions}>{category !== "All" && <button className={styles.button} onClick={() => setCategory("All")}>Show all categories</button>}<button className={styles.secondaryButton} onClick={() => scrollTo("featured")}>View featured builds <Icon name="north_east" /></button></div></div></Reveal>}
          </div>
        </div></section>
        <section id="download" className={styles.section}><div className={styles.inner}><Reveal><div className={styles.showcase}>
          <div><span className={styles.eyebrow}>{mobile.badgeText}</span><h2 className={styles.heading}>{mobile.title}<br /><span className={styles.titleAccent}>{mobile.titleHighlight}</span></h2><p className={styles.body}>{mobile.subtitle}</p><div className={styles.actions}><button className={styles.button} onClick={() => setNotice({ title: "DevEngine Mobile · Google Play", message: mobile.googlePlayMessage || "The Android app is currently in private testing. Check back for the public release." })}><img src="/assets/playstore.png" alt="" />Google Play</button><button className={styles.secondaryButton} onClick={() => setNotice({ title: "DevEngine Mobile · App Store", message: mobile.appStoreMessage || "The iOS app is currently in TestFlight testing. Check back for the public release." })}><img src="/assets/appstore.png" alt="" />App Store</button></div><p className={styles.small} style={{ marginTop: "1.5rem" }}>{mobile.versionInfo}</p></div>
          <DepthStage><div className={styles.mobileArtwork}><div className={styles.deviceFrame}><PreviewImage src={mobile.mainPhoneImage} alt="DevEngine mobile app" /></div><div className={styles.deviceFrame}><PreviewImage src={mobile.secondaryPhoneImage} alt="Another view of DevEngine mobile" /></div></div></DepthStage>
        </div></Reveal></div></section>
        <section className={styles.section}><div className={styles.inner}><Reveal><div className={`${styles.card} ${styles.banner}`}><div className={styles.bannerCopy}><h2 className={styles.cardTitle}>{config.storeBanner.headline}</h2><p className={styles.body}>{config.storeBanner.description}</p></div><button className={styles.button} onClick={() => openLink(config.storeBanner.buttonUrl || "https://play.google.com/store/apps/dev?id=7519161405604508020")}>{config.storeBanner.buttonText}<Icon name="arrow_outward" /></button></div></Reveal></div></section>
      </>}
      {preview && <FeatureModal title={preview.name} onClose={() => setPreview(null)} wide><div className={styles.previewLayout}><PreviewImage src={getCleanAppThumbnail(preview)} alt={`${preview.name} preview`} /><div><div className={styles.metaRow}><span className={styles.badge}>{preview.status || "EARLY ACCESS"}</span><span className={styles.number}>v{preview.version || "1.0.0"}</span></div><h3 className={styles.cardTitle}>{preview.subtitle}</h3><p className={styles.body}>{preview.description}</p><div className={styles.actions}><button className={styles.button} onClick={() => download(preview)}>Download APK <Icon name="download" /></button><Link className={styles.secondaryButton} href={`/app-lab/${preview.slug}`}>View details <Icon name="arrow_outward" /></Link></div></div></div></FeatureModal>}
      {notice && <FeatureModal title={notice.title} onClose={() => setNotice(null)}><p className={styles.body}>{notice.message}</p><div className={styles.actions}><button className={styles.button} onClick={() => setNotice(null)}>Got it <Icon name="check" /></button></div></FeatureModal>}
    </FeaturePage>
  );
}
