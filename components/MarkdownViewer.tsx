import React from "react";

interface MarkdownViewerProps {
  content: string;
  className?: string;
}

export default function MarkdownViewer({ content, className = "" }: MarkdownViewerProps) {
  if (!content) {
    return <div className="text-gray-500 italic">No content available.</div>;
  }

  // Parse lines into structured blocks
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];

  let inList = false;
  let listItems: React.ReactNode[] = [];

  const flushList = (key: number) => {
    if (inList && listItems.length > 0) {
      elements.push(
        <ul key={`list-${key}`} className="my-3 space-y-1.5 list-disc list-inside text-gray-300">
          {listItems}
        </ul>
      );
      listItems = [];
      inList = false;
    }
  };

  const renderInline = (text: string): React.ReactNode => {
    // Replace markdown links [text](url)
    const parts: React.ReactNode[] = [];
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = linkRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(renderFormatting(text.substring(lastIndex, match.index)));
      }
      const linkText = match[1];
      const linkUrl = match[2];
      parts.push(
        <a
          key={`link-${match.index}`}
          href={linkUrl}
          target={linkUrl.startsWith("http") ? "_blank" : undefined}
          rel={linkUrl.startsWith("http") ? "noopener noreferrer" : undefined}
          className="text-emerald-400 hover:text-emerald-300 underline font-medium"
        >
          {linkText}
        </a>
      );
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      parts.push(renderFormatting(text.substring(lastIndex)));
    }

    return parts.length > 0 ? parts : renderFormatting(text);
  };

  const renderFormatting = (text: string): React.ReactNode => {
    // Process bold **text**, inline code `code`, italic *text*
    // Simple segmented replacement
    const segments = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g);
    return segments.map((seg, idx) => {
      if (seg.startsWith("**") && seg.endsWith("**")) {
        return (
          <strong key={idx} className="font-bold text-white">
            {seg.slice(2, -2)}
          </strong>
        );
      }
      if (seg.startsWith("`") && seg.endsWith("`")) {
        return (
          <code
            key={idx}
            className="px-1.5 py-0.5 rounded bg-white/10 text-emerald-300 font-mono text-xs border border-white/10"
          >
            {seg.slice(1, -1)}
          </code>
        );
      }
      if (seg.startsWith("*") && seg.endsWith("*")) {
        return (
          <em key={idx} className="italic text-gray-200">
            {seg.slice(1, -1)}
          </em>
        );
      }
      return seg;
    });
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    // Horizontal Rule
    if (trimmed === "---" || trimmed === "***") {
      flushList(idx);
      elements.push(<hr key={idx} className="my-6 border-white/10" />);
      return;
    }

    // Headers
    if (trimmed.startsWith("# ")) {
      flushList(idx);
      elements.push(
        <h1 key={idx} className="text-2xl sm:text-3xl font-extrabold text-white mt-6 mb-3 tracking-tight">
          {renderInline(trimmed.substring(2))}
        </h1>
      );
      return;
    }

    if (trimmed.startsWith("## ")) {
      flushList(idx);
      elements.push(
        <h2 key={idx} className="text-xl sm:text-2xl font-bold text-white mt-6 mb-2.5 tracking-tight border-b border-white/5 pb-2">
          {renderInline(trimmed.substring(3))}
        </h2>
      );
      return;
    }

    if (trimmed.startsWith("### ")) {
      flushList(idx);
      elements.push(
        <h3 key={idx} className="text-base sm:text-lg font-bold text-emerald-400 mt-5 mb-2">
          {renderInline(trimmed.substring(4))}
        </h3>
      );
      return;
    }

    if (trimmed.startsWith("#### ")) {
      flushList(idx);
      elements.push(
        <h4 key={idx} className="text-sm sm:text-base font-semibold text-gray-200 mt-4 mb-1.5">
          {renderInline(trimmed.substring(5))}
        </h4>
      );
      return;
    }

    // Unordered lists (- or *)
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      inList = true;
      listItems.push(
        <li key={`li-${idx}`} className="text-gray-300 text-sm leading-relaxed">
          {renderInline(trimmed.substring(2))}
        </li>
      );
      return;
    }

    // Numbered list (e.g. 1. 2.)
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (numMatch) {
      flushList(idx);
      elements.push(
        <div key={idx} className="flex items-start gap-2.5 my-1.5 text-sm text-gray-300 leading-relaxed">
          <span className="font-mono text-emerald-400 font-bold text-xs mt-0.5">{numMatch[1]}.</span>
          <span className="flex-1">{renderInline(numMatch[2])}</span>
        </div>
      );
      return;
    }

    // Empty line
    if (!trimmed) {
      flushList(idx);
      return;
    }

    // Standard Paragraph
    flushList(idx);
    elements.push(
      <p key={idx} className="my-2.5 text-sm text-gray-300 leading-relaxed">
        {renderInline(trimmed)}
      </p>
    );
  });

  flushList(lines.length);

  return <div className={`prose-devengine space-y-1 ${className}`}>{elements}</div>;
}
