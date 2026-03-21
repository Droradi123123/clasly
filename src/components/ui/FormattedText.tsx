import * as React from "react";

/**
 * Renders text with **bold** and __underline__ as actual formatting.
 * WYSIWYG display - no raw markers shown.
 */
export function FormattedText({
  children,
  className,
  style,
  as: Component = "span",
  ...props
}: {
  children: string;
  className?: string;
  style?: React.CSSProperties;
  as?: "span" | "p" | "div";
  [key: string]: unknown;
}) {
  const text = String(children ?? "");
  const parts = parseFormattedText(text);

  return (
    <Component className={className} style={style} {...props}>
      {parts.map((part, i) => {
        if (part.bold && part.underline) {
          return (
            <strong key={i}>
              <u>{part.text}</u>
            </strong>
          );
        }
        if (part.bold) return <strong key={i}>{part.text}</strong>;
        if (part.underline) return <u key={i}>{part.text}</u>;
        return <React.Fragment key={i}>{part.text}</React.Fragment>;
      })}
    </Component>
  );
}

interface FormattedPart {
  text: string;
  bold?: boolean;
  underline?: boolean;
}

function parseFormattedText(text: string): FormattedPart[] {
  const parts: FormattedPart[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Match **bold** or __underline__ (greedy, then non-greedy for nesting)
    const boldMatch = remaining.match(/^\*\*(.+?)\*\*/);
    const underlineMatch = remaining.match(/^__(.+?)__/);
    const boldUnderlineMatch = remaining.match(/^\*\*__(.+?)__\*\*/);
    const underlineBoldMatch = remaining.match(/^__\*\*(.+?)\*\*__/);

    if (boldUnderlineMatch) {
      parts.push({ text: boldUnderlineMatch[1], bold: true, underline: true });
      remaining = remaining.slice(boldUnderlineMatch[0].length);
      continue;
    }
    if (underlineBoldMatch) {
      parts.push({ text: underlineBoldMatch[1], bold: true, underline: true });
      remaining = remaining.slice(underlineBoldMatch[0].length);
      continue;
    }
    if (boldMatch) {
      parts.push({ text: boldMatch[1], bold: true });
      remaining = remaining.slice(boldMatch[0].length);
      continue;
    }
    if (underlineMatch) {
      parts.push({ text: underlineMatch[1], underline: true });
      remaining = remaining.slice(underlineMatch[0].length);
      continue;
    }

    // No match - take until next marker or end
    const nextBold = remaining.indexOf("**");
    const nextUnderline = remaining.indexOf("__");
    let next = remaining.length;
    if (nextBold >= 0 && nextBold < next) next = nextBold;
    if (nextUnderline >= 0 && nextUnderline < next) next = nextUnderline;

    const plain = remaining.slice(0, next);
    if (plain) parts.push({ text: plain });
    remaining = remaining.slice(next);
  }

  return parts;
}
