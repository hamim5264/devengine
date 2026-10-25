import type { ReactNode } from "react";
import type { DevKittyLink } from "@/types/devkitty";
/** A small text renderer: no raw HTML, scripts, images or unverified clickable URLs. */
export default function DevKittyAnswer({ text, links = [], sources = [] }: { text: string; links?: DevKittyLink[]; sources?: DevKittyLink[] }) {
  const allowed = new Set([...links, ...sources].map(link => link.url));
  function inline(line: string): ReactNode[] {
    const result: ReactNode[] = []; const pattern = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|`([^`]+)`/g;
    let end = 0, match: RegExpExecArray | null;
    while ((match = pattern.exec(line))) {
      result.push(line.slice(end, match.index));
      if (match[1]) {
        const url = match[2].trim(), external = /^https:\/\//i.test(url);
        result.push(allowed.has(url) ? <a key={match.index} href={url} target={external ? "_blank" : undefined} rel={external ? "noopener noreferrer" : undefined}>{match[1]}</a> : match[1]);
      } else if (match[3]) result.push(<strong key={match.index}>{match[3]}</strong>);
      else result.push(<code key={match.index}>{match[4]}</code>);
      end = pattern.lastIndex;
    }
    result.push(line.slice(end)); return result;
  }
  return <>{text.split(/\n\s*\n/).map((block, index) => <p key={index}>{block.split("\n").map((line, row) => <span key={row}>{row > 0 && <br />}{inline(line.replace(/^#{1,4}\s+/, ""))}</span>)}</p>)}</>;
}
