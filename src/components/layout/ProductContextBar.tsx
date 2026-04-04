import { useLocation, useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import { getProductSurfaceInfo } from "@/lib/productNavigation";

type ProductContextBarProps = {
  /** Override route-based detection (e.g. Present knows lecture_mode before URL has ?track=) */
  product?: "education" | "webinar";
  /** Override subtitle line */
  subtitle?: string;
  className?: string;
  /** Dark stage (present mode) — light text on translucent bar */
  tone?: "default" | "onDark";
};

export function ProductContextBar({
  product: productOverride,
  subtitle: subtitleOverride,
  className,
  tone = "default",
}: ProductContextBarProps) {
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const fromRoute = getProductSurfaceInfo(location.pathname, searchParams);
  const product = productOverride ?? fromRoute.product;
  const title = product === "webinar" ? "Clasly for Webinar" : "Clasly for Educator";
  const subtitle = subtitleOverride ?? fromRoute.subtitle;

  const webinar = product === "webinar";

  const onDark = tone === "onDark";

  return (
    <div
      className={cn(
        "border-b px-4 sm:px-6 py-2",
        onDark
          ? webinar
            ? "border-teal-400/25 bg-teal-950/40"
            : "border-violet-400/25 bg-violet-950/35"
          : webinar
            ? "border-teal-500/30 bg-teal-500/[0.07]"
            : "border-violet-500/25 bg-violet-500/[0.06]",
        className,
      )}
      role="status"
      aria-label={`${title}. ${subtitle}.`}
    >
      <div className="container mx-auto flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p
          className={cn(
            "text-sm font-semibold tracking-tight",
            onDark ? "text-white" : "text-foreground",
          )}
        >
          {title}
          <span className={cn("font-normal", onDark ? "text-white/75" : "text-muted-foreground")}>
            {" "}
            · {subtitle}
          </span>
        </p>
        <span
          className={cn(
            "text-[10px] font-bold uppercase tracking-widest",
            onDark
              ? webinar
                ? "text-teal-300"
                : "text-violet-200"
              : webinar
                ? "text-teal-700 dark:text-teal-300"
                : "text-violet-800 dark:text-violet-200",
          )}
        >
          {webinar ? "Webinar product" : "Educator product"}
        </span>
      </div>
    </div>
  );
}
