import React, { useEffect, useState, useMemo } from "react";
import type { BlogAuthor } from "@/types/blog";
import s from "./EditorialArticle.module.css";

interface EditorialFeedProps {
  content: string;
  author: BlogAuthor;
  categoryLabel?: string;
  readTime?: string;
  readsCount?: number;
  publishedDate?: string;
  title?: string;
  autoScroll?: boolean;
  onToggleAutoScroll?: () => void;
}

type Block =
  | { type: "paragraph"; text: string }
  | { type: "heading"; text: string; level: number }
  | { type: "quote"; text: string }
  | { type: "code"; text: string; language: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "rule" };

interface Section {
  id: string;
  title: string;
  level: number;
  blocks: Block[];
}

/**
 * Parse raw markdown into structured blocks
 */
function parseBlocks(raw: string): Block[] {
  const lines = raw.replace(/\r\n?/g, "\n").split("\n");
  const blocks: Block[] = [];
  const startsBlock = (line: string) =>
    /^(?:#{1,6}\s|```|>\s?|\s*[-*+]\s|\s*\d+\.\s|\s*(?:---+|\*\*\*+)\s*$)/.test(line);

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }

    // Code block
    const fence = line.match(/^```([^\s`]*)/);
    if (fence) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) {
        codeLines.push(lines[i++]);
      }
      if (i < lines.length) i++;
      blocks.push({ type: "code", language: fence[1] || "text", text: codeLines.join("\n") });
      continue;
    }

    // Headings
    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      blocks.push({
        type: "heading",
        level: Math.max(2, Math.min(4, heading[1].length)),
        text: heading[2],
      });
      i++;
      continue;
    }

    // Divider
    if (/^\s*(?:---+|\*\*\*+)\s*$/.test(line)) {
      blocks.push({ type: "rule" });
      i++;
      continue;
    }

    // Blockquote
    if (/^>\s?/.test(line)) {
      const quoteLines: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        quoteLines.push(lines[i++].replace(/^>\s?/, ""));
      }
      blocks.push({ type: "quote", text: quoteLines.join("\n") });
      continue;
    }

    // Lists
    const ordered = /^\s*\d+\.\s+/.test(line);
    if (ordered || /^\s*[-*+]\s+/.test(line)) {
      const pattern = ordered ? /^\s*\d+\.\s+/ : /^\s*[-*+]\s+/;
      const items: string[] = [];
      while (i < lines.length && pattern.test(lines[i])) {
        items.push(lines[i++].replace(pattern, ""));
      }
      blocks.push({ type: "list", ordered, items });
      continue;
    }

    // Paragraph
    const paragraphLines = [line];
    i++;
    while (i < lines.length && lines[i].trim() && !startsBlock(lines[i])) {
      paragraphLines.push(lines[i++]);
    }
    blocks.push({ type: "paragraph", text: paragraphLines.join("\n") });
  }

  return blocks;
}

/**
 * Divide blocks into sections based on H2/H3 headings
 */
function groupIntoSections(blocks: Block[]): { leadBlocks: Block[]; sections: Section[] } {
  const leadBlocks: Block[] = [];
  const sections: Section[] = [];

  let currentSection: Section | null = null;
  let sectionIndex = 1;

  for (const block of blocks) {
    if (block.type === "heading" && block.level <= 3) {
      if (currentSection) {
        sections.push(currentSection);
      }
      currentSection = {
        id: `section-${sectionIndex++}`,
        title: block.text,
        level: block.level,
        blocks: [],
      };
    } else {
      if (currentSection) {
        currentSection.blocks.push(block);
      } else {
        leadBlocks.push(block);
      }
    }
  }

  if (currentSection) {
    sections.push(currentSection);
  }

  return { leadBlocks, sections };
}

/**
 * Format inline markdown text (bold, code, links, italics, line breaks)
 */
function renderInline(text: string): React.ReactNode[] {
  return text
    .split(/(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|\[[^\]]+\]\([^)]+\)|\*[^*]+\*|_[^_]+_|\n)/g)
    .map((part, index) => {
      if (!part) return null;
      if (part === "\n") {
        return <br key={index} />;
      }
      if ((part.startsWith("**") && part.endsWith("**")) || (part.startsWith("__") && part.endsWith("__"))) {
        return (
          <strong key={index} className={s.strongText}>
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <code key={index} className={s.codeInline}>
            {part.slice(1, -1)}
          </code>
        );
      }
      if ((part.startsWith("*") && part.endsWith("*")) || (part.startsWith("_") && part.endsWith("_"))) {
        return (
          <em key={index} className={s.italicText}>
            {part.slice(1, -1)}
          </em>
        );
      }
      const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (link && /^(?:https?:\/\/|mailto:|\/(?!\/)|#)/i.test(link[2])) {
        const isExternal = /^https?:\/\//i.test(link[2]);
        return (
          <a
            key={index}
            href={link[2]}
            target={isExternal ? "_blank" : undefined}
            rel={isExternal ? "noopener noreferrer" : undefined}
            className={s.linkText}
          >
            {link[1]}
          </a>
        );
      }
      return <React.Fragment key={index}>{part}</React.Fragment>;
    });
}

/**
 * Terminal Code block with copy action
 */
function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <div className={s.codeTerminal}>
      <div className={s.terminalBar}>
        <div className={s.terminalDots}>
          <span className={s.terminalDot} style={{ background: "#ff5f56" }} />
          <span className={s.terminalDot} style={{ background: "#ffbd2e" }} />
          <span className={s.terminalDot} style={{ background: "#27c93f" }} />
        </div>
        <span className={s.terminalLang}>{language || "source"}</span>
        <button type="button" onClick={handleCopy} className={s.copyCodeBtn} title="Copy code">
          <span className="material-symbols-outlined" style={{ fontSize: 13 }}>
            {copied ? "check" : "content_copy"}
          </span>
          <span>{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>
      <pre className={s.codeContent}>
        <code>{code}</code>
      </pre>
    </div>
  );
}

export default function EditorialFeed({
  content,
  author,
  categoryLabel,
  readTime,
  readsCount,
  publishedDate,
  title,
  autoScroll: controlledAutoScroll,
  onToggleAutoScroll: controlledToggle,
}: EditorialFeedProps) {
  const [internalAutoScroll, setInternalAutoScroll] = useState(false);
  const isAutoScroll = controlledAutoScroll !== undefined ? controlledAutoScroll : internalAutoScroll;
  const toggleAutoScroll = controlledToggle || (() => setInternalAutoScroll((prev) => !prev));

  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeSectionId, setActiveSectionId] = useState<string>("");
  const [copiedShare, setCopiedShare] = useState(false);

  const SECTION_DURATION = 18;
  const [secondsRemaining, setSecondsRemaining] = useState<number>(SECTION_DURATION);

  // Parse blocks and group by section
  const { leadBlocks, sections } = useMemo(() => {
    const blocks = parseBlocks(content);
    return groupIntoSections(blocks);
  }, [content]);

  const scrollToSection = (targetId: string) => {
    const el = document.getElementById(targetId);
    if (el) {
      const topOffset = 110;
      const elementPosition = el.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - topOffset;
      window.scrollTo({
        top: Math.max(0, offsetPosition),
        behavior: "smooth",
      });
      setActiveSectionId(targetId);
    }
  };

  // Reading progress tracker
  useEffect(() => {
    const handleScroll = () => {
      const el = document.documentElement;
      const totalHeight = el.scrollHeight - el.clientHeight;
      if (totalHeight > 0) {
        const current = (el.scrollTop / totalHeight) * 100;
        setScrollProgress(Math.min(100, Math.max(0, current)));
      }

      // Check which section is in view
      for (let i = sections.length - 1; i >= 0; i--) {
        const secEl = document.getElementById(sections[i].id);
        if (secEl) {
          const rect = secEl.getBoundingClientRect();
          if (rect.top <= 200) {
            setActiveSectionId(sections[i].id);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [sections]);

  // Auto-scroll loop based on Chronicle Outline total count (18s per section)
  useEffect(() => {
    if (!isAutoScroll) {
      setSecondsRemaining(SECTION_DURATION);
      return;
    }

    if (!activeSectionId && sections.length > 0) {
      scrollToSection(sections[0].id);
    }

    setSecondsRemaining(SECTION_DURATION);

    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          if (sections.length > 0) {
            const currentIdx = sections.findIndex((s) => s.id === activeSectionId);
            const nextIdx = currentIdx + 1;
            if (nextIdx < sections.length) {
              scrollToSection(sections[nextIdx].id);
            } else {
              const endEl = document.getElementById("article-end") || document.querySelector("footer");
              if (endEl) {
                endEl.scrollIntoView({ behavior: "smooth", block: "start" });
              }
              if (controlledToggle) {
                controlledToggle();
              } else {
                setInternalAutoScroll(false);
              }
            }
          } else {
            window.scrollBy({ top: window.innerHeight * 0.75, behavior: "smooth" });
          }
          return SECTION_DURATION;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isAutoScroll, activeSectionId, sections, controlledToggle]);

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2500);
    } catch {
      // fallback
    }
  };

  const authorInitials = (author.name || "DE")
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  // Helper to render a collection of blocks inside a section
  const renderBlocks = (blocks: Block[], isLead = false) => {
    const elements: React.ReactNode[] = [];
    let i = 0;

    while (i < blocks.length) {
      const block = blocks[i];

      if (block.type === "paragraph") {
        // Drop Cap on the very first paragraph of the lead section
        if (isLead && elements.length === 0 && block.text.length > 20) {
          const firstChar = block.text.charAt(0);
          const restText = block.text.slice(1);
          elements.push(
            <p key={i} className={s.leadParagraph}>
              <span className={s.dropCap}>{firstChar}</span>
              {renderInline(restText)}
            </p>
          );
        } else {
          elements.push(
            <p key={i} className={s.editorialParagraph}>
              {renderInline(block.text)}
            </p>
          );
        }
      } else if (block.type === "quote") {
        elements.push(
          <blockquote key={i} className={s.pullQuote}>
            <span className={s.quoteGlyph} aria-hidden="true">
              “
            </span>
            <p className={s.quoteText}>{renderInline(block.text)}</p>
          </blockquote>
        );
      } else if (block.type === "code") {
        elements.push(<CodeBlock key={i} code={block.text} language={block.language} />);
      } else if (block.type === "list") {
        const ListTag = block.ordered ? "ol" : "ul";
        elements.push(
          <ListTag key={i} className={s.editorialList}>
            {block.items.map((item, itemIdx) => (
              <li key={itemIdx}>{renderInline(item)}</li>
            ))}
          </ListTag>
        );
      } else if (block.type === "heading") {
        const Htag = `h${block.level}` as "h2" | "h3" | "h4";
        elements.push(
          <Htag key={i} style={{ marginTop: "1.5rem", marginBottom: "0.5rem" }}>
            {renderInline(block.text)}
          </Htag>
        );
      } else if (block.type === "rule") {
        elements.push(<hr key={i} className={s.editorialRule} />);
      }

      i++;
    }

    return elements;
  };

  return (
    <div className={s.editorialContainer}>
      {/* Top Reading Progress Bar */}
      <div
        className={s.progressBar}
        style={{ width: `${scrollProgress}%` }}
        role="progressbar"
        aria-valuenow={Math.round(scrollProgress)}
        aria-valuemin={0}
        aria-valuemax={100}
      />

      <div className={s.editorialGrid}>
        {/* Sticky Editorial Sidebar */}
        <aside className={s.editorialSidebar} aria-label="Story Navigation & Author Profile">
          <div className={s.sidebarCard}>
            {/* Author Attribution Card */}
            <div className={s.authorCardHeader}>
              <div className={s.authorAvatarWrap}>
                {author.avatarUrl ? (
                  <img
                    src={author.avatarUrl}
                    alt={author.name}
                    className={s.authorAvatarImg}
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = "none";
                    }}
                  />
                ) : (
                  <span className={s.authorInitials}>{authorInitials}</span>
                )}
              </div>
              <div className={s.authorDetails}>
                <h3 className={s.authorName}>{author.name}</h3>
                <div className={s.authorRole}>{author.role || "Lead Architect"}</div>
                <span className={s.authorBadge}>
                  <span className="material-symbols-outlined">verified</span>
                  <span>DevEngine Contributor</span>
                </span>
              </div>
            </div>

            {/* Chronicle Metrics */}
            <div className={s.metaWidget}>
              <div className={s.metaItem}>
                <span className={s.metaLabel}>Read Time</span>
                <span className={s.metaValue}>
                  <span className="material-symbols-outlined">schedule</span>
                  <span>{readTime || "5 min"}</span>
                </span>
              </div>
              <div className={s.metaItem}>
                <span className={s.metaLabel}>Live Reads</span>
                <span className={s.metaValue}>
                  <span className="material-symbols-outlined">visibility</span>
                  <span>{(readsCount || 0).toLocaleString()}</span>
                </span>
              </div>
              {publishedDate && (
                <div className={s.metaItem} style={{ gridColumn: "span 2" }}>
                  <span className={s.metaLabel}>Published</span>
                  <span className={s.metaValue}>
                    <span className="material-symbols-outlined">calendar_today</span>
                    <span>{publishedDate}</span>
                  </span>
                </div>
              )}
            </div>

            {/* Share action & Auto Scroll */}
            <div className={s.shareWidget}>
              <button
                type="button"
                onClick={copyShareLink}
                className={s.shareBtn}
                title="Copy story link"
              >
                <span className="material-symbols-outlined">
                  {copiedShare ? "check" : "share"}
                </span>
                <span>{copiedShare ? "Copied" : "Share"}</span>
              </button>

              <button
                type="button"
                onClick={toggleAutoScroll}
                className={`${s.autoScrollBtn} ${isAutoScroll ? s.autoScrollActive : ""}`}
                title={isAutoScroll ? "Pause auto scroll" : "Auto scroll reading mode (18s per chapter)"}
                aria-pressed={isAutoScroll}
              >
                <span className="material-symbols-outlined">
                  {isAutoScroll ? "pause_circle" : "motion_photos_on"}
                </span>
                <span>Auto Scroll</span>
                {isAutoScroll && (
                  <span className={s.countdownBadge}>{secondsRemaining}s</span>
                )}
                <span className={s.toggleTrack} aria-hidden="true">
                  <span className={s.toggleThumb} />
                </span>
              </button>
            </div>
          </div>

          {/* Table of Contents / Outline (if article has 2 or more sections) */}
          {sections.length > 0 && (
            <nav className={s.sidebarCard} aria-label="Table of Contents">
              <h4 className={s.tocTitle}>
                <span className="material-symbols-outlined">format_list_bulleted</span>
                <span>Chronicle Outline</span>
              </h4>
              <ul className={s.tocList}>
                {sections.map((sec, idx) => {
                  const numStr = String(idx + 1).padStart(2, "0");
                  const isActive = activeSectionId === sec.id;
                  return (
                    <li key={sec.id}>
                      <a
                        href={`#${sec.id}`}
                        className={`${s.tocItem} ${isActive ? s.active : ""}`}
                        onClick={(e) => {
                          e.preventDefault();
                          scrollToSection(sec.id);
                          setSecondsRemaining(SECTION_DURATION);
                        }}
                      >
                        <span className={s.tocNumber}>{numStr}</span>
                        <span>{sec.title}</span>
                        {isActive && isAutoScroll && (
                          <span className={s.readingPulse} title={`Auto scrolling next chapter in ${secondsRemaining}s`}>
                            <span className="material-symbols-outlined" style={{ fontSize: 11 }}>timer</span>
                            <span>{secondsRemaining}s</span>
                          </span>
                        )}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </nav>
          )}
        </aside>

        {/* Main Editorial Feed */}
        <main className={s.editorialFeed}>
          {/* Lead Section / Deck */}
          {leadBlocks.length > 0 && (
            <section className={s.editorialLead} aria-label="Opening Section">
              <div className={s.editorialLeadHeader}>
                <span className={s.dateline}>DEVENGINE CHRONICLES // SPECIAL DISPATCH</span>
                <span className={s.leadLabel}>{categoryLabel || "ENGINEERING"}</span>
              </div>
              <div className={s.sectionContent}>{renderBlocks(leadBlocks, true)}</div>
            </section>
          )}

          {/* Numbered Editorial Chapters */}
          {sections.map((sec, idx) => {
            const numStr = String(idx + 1).padStart(2, "0");
            const isLessonOrTakeaway =
              sec.title.toLowerCase().includes("lesson") ||
              sec.title.toLowerCase().includes("takeaway") ||
              sec.title.toLowerCase().includes("broke") ||
              sec.title.toLowerCase().includes("failure");

            return (
              <section
                key={sec.id}
                id={sec.id}
                className={s.sectionBlock}
                aria-labelledby={`heading-${sec.id}`}
              >
                <header className={s.sectionHeader}>
                  <div className={s.sectionTitleWrap}>
                    <span className={s.sectionIndex}>{numStr} //</span>
                    <h2 id={`heading-${sec.id}`} className={s.sectionTitle}>
                      {sec.title}
                    </h2>
                  </div>
                  {isLessonOrTakeaway && (
                    <span
                      className={s.authorBadge}
                      style={{ color: "#2cecf7", borderColor: "rgba(44,236,247,0.3)" }}
                    >
                      <span className="material-symbols-outlined">lightbulb</span>
                      <span>Key Analysis</span>
                    </span>
                  )}
                </header>

                <div className={s.sectionContent}>{renderBlocks(sec.blocks, false)}</div>
              </section>
            );
          })}
        </main>
      </div>
    </div>
  );
}
