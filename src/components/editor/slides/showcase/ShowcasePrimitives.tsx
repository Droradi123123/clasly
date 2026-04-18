import { type ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/** Shared “Showcase” canvas language: clean surfaces, theme accent via CSS vars from SlideWrapper. */

export function ShowcaseShell({
  children,
  className,
  dir,
}: {
  children: ReactNode;
  className?: string;
  dir?: "ltr" | "rtl";
}) {
  return (
    <div
      dir={dir}
      className={cn(
        "w-full max-w-4xl mx-auto flex flex-col gap-6 min-h-0",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function ShowcaseTitle({
  children,
  className,
  subtle,
}: {
  children: ReactNode;
  className?: string;
  subtle?: boolean;
}) {
  return (
    <h2
      className={cn(
        "font-semibold tracking-tight text-balance leading-tight",
        subtle
          ? "text-sm md:text-base text-[hsl(var(--theme-text-secondary))]"
          : "text-xl md:text-3xl text-[hsl(var(--theme-text-primary))]",
        className,
      )}
    >
      {children}
    </h2>
  );
}

export function ShowcaseStat({
  value,
  label,
  className,
}: {
  value: string | number;
  label?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-start gap-1", className)}>
      <span
        className="text-4xl md:text-6xl font-semibold tabular-nums tracking-tight text-[hsl(var(--theme-accent))]"
        style={{ fontFamily: "var(--theme-font-family-display), var(--theme-font-family)" }}
      >
        {value}
      </span>
      {label ? (
        <span className="text-xs md:text-sm text-[hsl(var(--theme-text-secondary))] uppercase tracking-widest">
          {label}
        </span>
      ) : null}
    </div>
  );
}

export function ShowcaseBar({
  percent,
  show,
  className,
  trackClassName,
  rtl,
}: {
  percent: number;
  show?: boolean;
  className?: string;
  trackClassName?: string;
  /** When true, bar grows from the inline-end edge */
  rtl?: boolean;
}) {
  const w = Math.max(0, Math.min(100, percent));
  return (
    <div
      className={cn(
        "relative h-2.5 md:h-3 rounded-full overflow-hidden bg-[hsl(var(--theme-text-primary)/0.08)] border border-white/10 dark:border-black/10",
        trackClassName,
      )}
    >
      <motion.div
        className={cn(
          "absolute inset-y-0 rounded-full bg-[hsl(var(--theme-accent))]",
          rtl ? "right-0" : "left-0",
          className,
        )}
        initial={false}
        animate={{ width: show ? `${w}%` : "0%" }}
        transition={{ type: "spring", stiffness: 120, damping: 22 }}
      />
    </div>
  );
}

/** Horizontal bar with label row; fill uses theme accent. */
export function ShowcaseLabeledBar({
  label,
  percent,
  count,
  showStats,
  rank,
  muted,
  barRtl,
}: {
  label: ReactNode;
  percent: number;
  count?: number;
  showStats: boolean;
  rank?: number;
  muted?: boolean;
  barRtl?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: muted ? 0.35 : 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={cn(
        "rounded-3xl border border-white/10 dark:border-black/10 bg-[hsl(var(--theme-surface)/0.45)] shadow-sm px-4 py-3 md:px-5 md:py-4",
        muted && "opacity-90",
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-start gap-2 min-w-0 flex-1">
          {rank != null ? (
            <span className="shrink-0 tabular-nums text-xs font-medium text-[hsl(var(--theme-text-secondary))] pt-0.5">
              {rank}.
            </span>
          ) : null}
          <div className="min-w-0 text-sm md:text-base font-medium text-[hsl(var(--theme-text-primary))] leading-snug">
            {label}
          </div>
        </div>
        {showStats ? (
          <div className="shrink-0 text-end tabular-nums">
            <span className="text-lg md:text-xl font-semibold text-[hsl(var(--theme-text-primary))]">
              {Math.round(percent)}%
            </span>
            {count != null ? (
              <span className="block text-xs text-[hsl(var(--theme-text-secondary))]">
                {count}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
      <ShowcaseBar percent={percent} show={showStats} rtl={barRtl} />
    </motion.div>
  );
}

export function ShowcaseDivider() {
  return (
    <div className="h-px w-full bg-gradient-to-r from-transparent via-[hsl(var(--theme-text-primary)/0.12)] to-transparent" />
  );
}

export function ShowcaseChip({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-white/10 dark:border-black/10 bg-[hsl(var(--theme-surface)/0.5)] px-3 py-1 text-xs md:text-sm font-medium text-[hsl(var(--theme-text-primary))]",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function ShowcaseLetterBadge({
  letter,
  highlight,
}: {
  letter: string;
  highlight?: boolean;
}) {
  return (
    <span
      className={cn(
        "flex h-9 w-9 md:h-10 md:w-10 shrink-0 items-center justify-center rounded-full border text-sm font-semibold tabular-nums",
        highlight
          ? "border-[hsl(var(--theme-accent))] bg-[hsl(var(--theme-accent)/0.2)] text-[hsl(var(--theme-accent))]"
          : "border-white/15 bg-[hsl(var(--theme-text-primary)/0.06)] text-[hsl(var(--theme-text-primary))]",
      )}
    >
      {letter}
    </span>
  );
}
