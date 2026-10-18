import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import HelixLoader from "@/components/HelixLoader";
import type { TeamMember, FounderProfile } from "@/types/team";
import { getFounderProfile, getTeamMembers, DEFAULT_FOUNDER, INITIAL_TEAM } from "@/lib/services/teamService";
import { AnimatedTitle, DepthStage, FeaturePage, Icon, Marquee, PreviewImage, Reveal } from "@/components/features/FeatureExperience";
import styles from "@/components/features/Features.module.css";

const PRINCIPLES = [
  { icon: "smartphone", title: "Mobile first. Scalable always.", description: "We build cross-platform mobile architectures with Flutter, Dart, and Riverpod State Management. Clean Architecture, offline-first Hive/SQLite sync, and careful render budgets keep experiences fluid as products grow.", tags: ["Flutter", "Dart", "Riverpod", "Clean Architecture", "Firebase Realtime", "Offline Sync"] },
  { icon: "psychology", title: "Intelligence, built in.", description: "Our systems connect thoughtful interfaces with capable backends and AI orchestration. Next.js edge pipelines, Python/FastAPI microservices, LangChain agent loops, and vector embeddings power voice dispatchers, clinical predictors, and real-time CRM engines.", tags: ["Next.js", "Python", "FastAPI", "OpenAI", "LangChain", "Vector Embeddings"] },
  { icon: "verified_user", title: "Your source. Your future.", description: "Direct source licensing gives teams clean, unminified, fully documented codebases with direct takeover rights. Build on a foundation you can understand, maintain, and make your own.", tags: ["Source Ownership", "Documentation", "Zero Lock-in"] },
];

export default function AboutPage() {
  const [founder, setFounder] = useState<FounderProfile>(DEFAULT_FOUNDER);
  const [team, setTeam] = useState<TeamMember[]>(INITIAL_TEAM);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let mounted = true;
    Promise.all([getFounderProfile(), getTeamMembers()]).then(([profile, members]) => {
      if (mounted) { setFounder(profile); setTeam(members); }
    }).catch((error) => console.error("Failed to load about data:", error)).finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);
  const headline = founder.headline?.trim() || "Engineering Real-World Solutions.";
  const words = headline.split(/\s+/);
  const accent = words.length > 1 ? words[words.length - 1] : undefined;
  const title = words.length > 1 ? words.slice(0, -1).join(" ") : headline;
  const portfolio = founder.portfolioUrl || "https://thedevhamim.vercel.app/";

  return (
    <FeaturePage>
      <Head><title>About DevEngine | People, Purpose & Engineering</title><meta name="description" content={`Meet ${founder.name} and the DevEngine team. Discover the people and engineering principles behind our mobile, web, and AI experiences.`} /></Head>
      <section className={`${styles.section} ${styles.hero}`}><div className={styles.inner}><div className={styles.split}>
        <div><Reveal><span className={styles.eyebrow}>The people behind DevEngine</span></Reveal><AnimatedTitle text={title} accent={accent} /><Reveal delay={0.15}><p className={styles.body}>An independent software studio bringing ambitious ideas to life through thoughtful design and purposeful engineering.</p><div className={styles.founderDetails}><h2 className={styles.cardTitle}>{founder.name}</h2><p className={styles.small}>{founder.title}</p><p className={styles.body}>{founder.bio}</p><p className={styles.small}>{founder.education}</p><p className={styles.small}>{founder.location}</p><a className={styles.secondaryButton} href="https://neonecy.com/" target="_blank" rel="noopener noreferrer" style={{ marginTop: ".8rem" }}>Lead Mobile Developer at NEONECY <Icon name="north_east" /></a></div><div className={styles.actions}><a className={styles.button} href={portfolio} target="_blank" rel="noopener noreferrer">Explore founder’s portfolio <Icon name="arrow_outward" /></a><a className={styles.secondaryButton} href="#studio-architecture">Our approach <Icon name="south" /></a></div></Reveal></div>
        <DepthStage><figure className={styles.portraitWrap}><div className={styles.portrait}><PreviewImage src={founder.avatarUrl || "/assets/CEO.png"} alt={founder.name} priority /><figcaption className={styles.portraitCaption}><strong>Ideas need people.</strong><span className={styles.small}>Founder & lead architect</span><div className={styles.tags}>{(founder.techBadges || []).map((badge) => <span key={badge} className={styles.tag}>{badge}</span>)}</div></figcaption></div></figure></DepthStage>
      </div></div></section>
      <Marquee words={["People with purpose", "Design with intent", "Engineering with care"]} />
      <section id="studio-architecture" className={styles.section}><div className={styles.inner}><div className={styles.foundations}>
        <div className={styles.stickyCopy}><Reveal><span className={styles.eyebrow}>01 / Our foundations</span><h2 className={styles.heading}>Built with intention.<br />Engineered to last.</h2><p className={styles.body}>Modern software balances aesthetic beauty with resilience. These principles guide every product, repository, and client system we deliver.</p><div className={styles.actions}><a className={styles.secondaryButton} href={portfolio} target="_blank" rel="noopener noreferrer">The full engineering journey <Icon name="arrow_outward" /></a></div></Reveal></div>
        <div className={styles.principles}>{PRINCIPLES.map((principle, index) => <Reveal key={principle.title}><article className={`${styles.card} ${styles.principle}`}><div className={styles.principleTop}><span className={styles.iconTile}><Icon name={principle.icon} /></span><span className={styles.number}>0{index + 1} / Principle</span></div><h3 className={styles.cardTitle}>{principle.title}</h3><p className={styles.body}>{principle.description}</p><div className={styles.tags}>{principle.tags.map((tag) => <span key={tag} className={styles.tag}>{tag}</span>)}</div></article></Reveal>)}</div>
      </div></div></section>
      <section id="collective" className={styles.section}><div className={styles.inner}>
        <Reveal><div className={styles.sectionHeader}><div><span className={styles.eyebrow}>02 / Collective intelligence</span><h2 className={styles.heading}>Different minds.<br />One creative engine.</h2></div><p className={`${styles.body} ${styles.lead}`}>Meet the architects, developers, and specialists bringing our digital ecosystems to life.</p></div></Reveal>
        {loading ? <div className={styles.empty} role="status"><HelixLoader size={48} color="#2cecf7" /><p className={styles.small}>Meeting the team…</p></div> : team.length ? <div className={styles.teamList}>{team.map((member, index) => <Reveal key={member.id}><article className={styles.teamRow}>
          <DepthStage className={styles.teamPhotoStage} contentClassName={styles.teamPhoto}><PreviewImage src={member.avatarUrl || "/assets/DevEngine-emblem.png"} alt={member.name} /><div className={styles.photoFooter}><span>DevEngine / Collective</span><span>Profile {String(index + 1).padStart(2, "0")}</span></div></DepthStage>
          <div className={styles.teamBio}><span className={styles.badge}>{member.role}</span><h3 className={styles.cardTitle}>{member.name}</h3><p className={styles.body}>{member.bio}</p><div className={styles.tags}>{(member.skills || []).map((skill) => <span className={styles.tag} key={skill}>{skill}</span>)}</div><div className={styles.actions}>{member.socialLinks?.linkedin && <a className={styles.secondaryButton} href={member.socialLinks.linkedin} target="_blank" rel="noopener noreferrer" aria-label={`${member.name} on LinkedIn`}>LinkedIn <Icon name="arrow_outward" /></a>}{member.socialLinks?.github && <a className={styles.secondaryButton} href={member.socialLinks.github} target="_blank" rel="noopener noreferrer" aria-label={`${member.name} on GitHub`}>GitHub <Icon name="arrow_outward" /></a>}</div></div>
        </article></Reveal>)}</div> : <div className={`${styles.card} ${styles.empty}`}><h3 className={styles.cardTitle}>Meet the collective soon.</h3><p className={styles.body}>Team profiles will appear here as they’re published.</p></div>}
      </div></section>
      {founder.achievements?.length > 0 && <section className={styles.section}><div className={styles.inner}><Reveal><div className={styles.sectionHeader}><div><span className={styles.eyebrow}>03 / The journey so far</span><h2 className={styles.heading}>Experience behind the ideas.</h2></div></div><div className={styles.principles}>{founder.achievements.map((achievement, index) => <div className={`${styles.card} ${styles.banner}`} key={achievement}><span className={styles.number}>{String(index + 1).padStart(2, "0")}</span><p className={styles.body}>{achievement}</p><span className={styles.iconTile}><Icon name="north_east" /></span></div>)}</div></Reveal></div></section>}
      <section className={styles.section}><div className={styles.inner}><Reveal><div className={`${styles.card} ${styles.cta}`}><span className={styles.eyebrow}>Your next chapter</span><h2 className={styles.heading}>Let’s build something<br /><span className={styles.titleAccent}>remarkable.</span></h2><p className={styles.body}>An ambitious first launch. A platform ready to scale. A new idea waiting to happen. We’d love to hear what you have in mind.</p><div className={styles.actions}><Link className={styles.button} href="/home#contact">Start a conversation <Icon name="arrow_outward" /></Link><a className={styles.secondaryButton} href={portfolio} target="_blank" rel="noopener noreferrer">Explore the founder’s work <Icon name="north_east" /></a></div></div></Reveal></div></section>
    </FeaturePage>
  );
}
