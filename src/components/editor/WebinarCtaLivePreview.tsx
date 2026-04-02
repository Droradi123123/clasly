import { ExternalLink, Sparkles } from "lucide-react";

type Props = {
  label: string;
  /** Step 2: button only. Step 3: include url line */
  url?: string;
  variant: "button_only" | "with_url";
};

export function WebinarCtaLivePreview({ label, url, variant }: Props) {
  const safeLabel = label.trim() || "Your button label";
  const displayUrl = url?.trim();
  const shortUrl =
    displayUrl && displayUrl.length > 42 ? `${displayUrl.slice(0, 38)}…` : displayUrl;

  return (
    <div className="w-full max-w-md mx-auto rounded-3xl border border-border/60 bg-gradient-to-b from-violet-600/95 via-violet-700/98 to-[#0f172a] p-5 shadow-xl">
      <div className="flex items-center gap-2 text-violet-100/90 text-xs font-semibold uppercase tracking-wider mb-3">
        <Sparkles className="w-4 h-4 text-amber-300 shrink-0" aria-hidden />
        From the host
      </div>
      <p className="text-sm text-violet-100/80 mb-4 leading-snug">
        Tap the button to open the link in your browser. You can close this anytime.
      </p>
      <button
        type="button"
        className="w-full min-h-[3.75rem] rounded-2xl bg-white text-violet-950 text-lg font-bold shadow-lg shadow-black/25 flex items-center justify-center gap-2 pointer-events-none opacity-95"
      >
        {safeLabel}
        <ExternalLink className="w-5 h-5 opacity-80 shrink-0" aria-hidden />
      </button>
      {variant === "with_url" && displayUrl ? (
        <p className="mt-4 text-center text-[11px] text-violet-200/70 break-all px-1">{shortUrl}</p>
      ) : null}
    </div>
  );
}
