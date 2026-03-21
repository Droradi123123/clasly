/**
 * Renders text with **bold** and __underline__ as actual formatting.
 * Used for WYSIWYG display in slides.
 */
import React from "react";

export function FormattedText({ children, className, style }: { children: string; className?: string; style?: React.CSSProperties }) {
  if (!children || typeof children !== "string") return null;

  const parts: React.ReactNode[] = [];
  let remaining = children;
  let key = 0;

  // Parse **bold** and __underline__
  while (remaining.length > 0) {
    const boldMatch = remaining.match(/\*\*([\s\S]+?)\*\*/);
    const underlineMatch = remaining.match(/__([\s\S]+?)__/);

    let earliest: { index: number; type: "bold" | "underline"; match: RegExpMatchArray } | null = null;
    if (boldMatch && boldMatch.index !== undefined) {
      earliest = { index: boldMatch.index, type: "bold", match: boldMatch };
    }
    if (underlineMatch && underlineMatch.index !== undefined) {
      if (!earliest || underlineMatch.index < earliest.index) {
        earliest = { index: underlineMatch.index, type: "underline", match: underlineMatch };
      }
    }

    if (!earliest) {
      parts.push(<span key={key++}>{remaining}</span>);
      break;
    }

    if (earliest.index > 0) {
      parts.push(<span key={key++}>{remaining.slice(0, earliest.index)}</span>);
    }
    if (earliest.type === "bold") {
      parts.push(<strong key={key++}>{earliest.match[1]}</strong>);
    } else {
      parts.push(<span key={key++} className="underline">{earliest.match[1]}</span>);
    }
    remaining = remaining.slice(earliest.index + earliest.match[0].length);
  }

  return (
    <span className={className} style={style}>
      {parts}
    </span>
  );
}
