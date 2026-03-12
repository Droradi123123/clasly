import * as React from "react";

export interface AutoResizeTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  minRows?: number;
  maxRows?: number;
}

function getLineHeight(el: HTMLTextAreaElement) {
  const computed = window.getComputedStyle(el);
  const lh = parseFloat(computed.lineHeight);
  if (!Number.isFinite(lh)) return 20;
  return lh;
}

export const AutoResizeTextarea = React.forwardRef<
  HTMLTextAreaElement,
  AutoResizeTextareaProps
>(function AutoResizeTextarea(
  { minRows = 1, maxRows, style, onChange, ...props },
  ref
) {
  const innerRef = React.useRef<HTMLTextAreaElement | null>(null);

  React.useImperativeHandle(ref, () => innerRef.current as HTMLTextAreaElement);

  const resize = React.useCallback(() => {
    const el = innerRef.current;
    if (!el) return;

    el.style.height = "auto";

    const lineHeight = getLineHeight(el);
    const minHeight = Math.max(minRows, 1) * lineHeight;
    const maxHeight = maxRows ? maxRows * lineHeight : undefined;

    const next = Math.max(el.scrollHeight, minHeight);
    el.style.height = `${maxHeight ? Math.min(next, maxHeight) : next}px`;
    el.style.overflowY = maxHeight && next > maxHeight ? "auto" : "hidden";
  }, [minRows, maxRows]);

  React.useLayoutEffect(() => {
    resize();
  }, [resize, props.value]);

  return (
    <textarea
      {...props}
      ref={(node) => {
        innerRef.current = node;
        if (typeof ref === "function") ref(node);
      }}
      style={{ ...style, resize: "none", overflow: "hidden" }}
      onChange={(e) => {
        onChange?.(e);
        // resize after value change
        requestAnimationFrame(resize);
      }}
    />
  );
});
