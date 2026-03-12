import { ReactNode } from "react";

/**
 * Shared frame for slide content so Editor and Present use the same aspect and sizing contract.
 * Single source of truth: 16:9 aspect, fills container. Parent controls max size (Present: larger, Editor: scaled).
 */
export function SlideFrame({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`aspect-video w-full h-full min-h-0 overflow-hidden ${className}`}
      style={{ maxWidth: "100%" }}
    >
      {children}
    </div>
  );
}
