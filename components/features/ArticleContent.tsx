import { Fragment, type ReactNode } from "react";
import styles from "./Community.module.css";

type Block =
  | { type: "paragraph" | "quote"; text: string }
  | { type: "heading"; text: string; level: number }
  | { type: "code"; text: string; language: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "rule" };

// Render the CMS's Markdown subset as React elements; article HTML is never injected.
function blocksFrom(content: string): Block[] {
  const lines = content.replace(/\r\n?/g, "\n").split("\n");
  const blocks: Block[] = [];
  const startsBlock = (line: string) => /^(?:#{1,6}\s|```|>\s?|\s*[-*+]\s|\s*\d+\.\s|\s*(?:---+|\*\*\*+)\s*$)/.test(line);
  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) { index++; continue; }
    const fence = line.match(/^```([^\s`]*)/);
    if (fence) {
      const code: string[] = [];
      index++;
      while (index < lines.length && !/^```\s*$/.test(lines[index])) code.push(lines[index++]);
      if (index < lines.length) index++;
      blocks.push({ type: "code", language: fence[1], text: code.join("\n") });
      continue;
    }
    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) { blocks.push({ type: "heading", level: Math.max(2, Math.min(4, heading[1].length)), text: heading[2] }); index++; continue; }
    if (/^\s*(?:---+|\*\*\*+)\s*$/.test(line)) { blocks.push({ type: "rule" }); index++; continue; }
    if (/^>\s?/.test(line)) {
      const quote: string[] = [];
      while (index < lines.length && /^>\s?/.test(lines[index])) quote.push(lines[index++].replace(/^>\s?/, ""));
      blocks.push({ type: "quote", text: quote.join("\n") });
      continue;
    }
    const ordered = /^\s*\d+\.\s+/.test(line);
    if (ordered || /^\s*[-*+]\s+/.test(line)) {
      const pattern = ordered ? /^\s*\d+\.\s+/ : /^\s*[-*+]\s+/;
      const items: string[] = [];
      while (index < lines.length && pattern.test(lines[index])) items.push(lines[index++].replace(pattern, ""));
      blocks.push({ type: "list", ordered, items });
      continue;
    }
    const paragraph = [line];
    index++;
    while (index < lines.length && lines[index].trim() && !startsBlock(lines[index])) paragraph.push(lines[index++]);
    blocks.push({ type: "paragraph", text: paragraph.join("\n") });
  }
  return blocks;
}

function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\)|\*[^*]+\*)/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("`") && part.endsWith("`")) return <code key={index}>{part.slice(1, -1)}</code>;
    if (part.startsWith("*") && part.endsWith("*")) return <em key={index}>{part.slice(1, -1)}</em>;
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link && /^(?:https?:\/\/|mailto:|\/(?!\/)|#)/i.test(link[2])) {
      const external = /^https?:\/\//i.test(link[2]);
      return <a key={index} href={link[2]} target={external ? "_blank" : undefined} rel={external ? "noopener noreferrer" : undefined}>{link[1]}</a>;
    }
    return <Fragment key={index}>{part}</Fragment>;
  });
}

export default function ArticleContent({ content }: { content: string }) {
  return <div className={styles.prose}>{blocksFrom(content).map((block, index) => {
    if (block.type === "code") return <pre key={index} tabIndex={0} aria-label={`${block.language || "Source"} code sample`}><code>{block.text}</code></pre>;
    if (block.type === "heading") { const Heading = `h${block.level}` as "h2" | "h3" | "h4"; return <Heading key={index}>{inline(block.text)}</Heading>; }
    if (block.type === "quote") return <blockquote key={index}>{inline(block.text)}</blockquote>;
    if (block.type === "rule") return <hr key={index} />;
    if (block.type === "list") { const List = block.ordered ? "ol" : "ul"; return <List key={index}>{block.items.map((item, itemIndex) => <li key={itemIndex}>{inline(item)}</li>)}</List>; }
    return <p key={index}>{inline(block.text)}</p>;
  })}</div>;
}
