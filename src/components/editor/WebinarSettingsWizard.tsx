import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Loader2, ImageIcon, X, Palette, FileText, Link2 } from "lucide-react";
import { toast } from "sonner";
import {
  type WebinarRegistrationConfig,
  DEFAULT_WEBINAR_PRIMARY_COLOR,
} from "@/types/webinarRegistration";
import { WebinarRegistrationFormBuilder } from "@/components/editor/WebinarRegistrationFormBuilder";
import { WebinarRegistrationPreview } from "@/components/editor/WebinarRegistrationPreview";
import { WebinarCtaLivePreview } from "@/components/editor/WebinarCtaLivePreview";
import { uploadWebinarRegistrationLogo } from "@/lib/webinarRegistrationLogoUpload";
import { cn } from "@/lib/utils";

const STEPS = 3;
const STEP_LABELS = ["Branding", "Registration", "Live CTA"];
const STEP_ICONS = [Palette, FileText, Link2];

function isValidHttpUrl(s: string): boolean {
  const t = s.trim();
  if (!t) return false;
  try {
    const u = new URL(t);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

type Props = {
  webinarRegConfig: WebinarRegistrationConfig;
  onWebinarRegChange: (next: WebinarRegistrationConfig) => void;
  webinarCtaLabel: string;
  onWebinarCtaLabelChange: (v: string) => void;
  webinarCtaUrl: string;
  onWebinarCtaUrlChange: (v: string) => void;
  isPro: boolean;
  onPremiumLogoBlocked: () => void;
  onPremiumColorBlocked: () => void;
  /** Called when a non-Pro user tries to edit a locked webinar setting (registration/CTA). */
  onPremiumWebinarSettingsBlocked: () => void;
};

export function WebinarSettingsWizard({
  webinarRegConfig,
  onWebinarRegChange,
  webinarCtaLabel,
  onWebinarCtaLabelChange,
  webinarCtaUrl,
  onWebinarCtaUrlChange,
  isPro,
  onPremiumLogoBlocked,
  onPremiumColorBlocked,
  onPremiumWebinarSettingsBlocked,
}: Props) {
  const [step, setStep] = useState(0);
  const [urlTouched, setUrlTouched] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const primary =
    webinarRegConfig.branding?.primaryColor?.match(/^#[0-9A-Fa-f]{6}$/)
      ? webinarRegConfig.branding!.primaryColor!
      : DEFAULT_WEBINAR_PRIMARY_COLOR;

  const setBranding = (patch: { primaryColor?: string; logoUrl?: string | null }) => {
    const primaryNext =
      patch.primaryColor ?? webinarRegConfig.branding?.primaryColor ?? DEFAULT_WEBINAR_PRIMARY_COLOR;
    const branding: NonNullable<WebinarRegistrationConfig["branding"]> = {
      primaryColor: primaryNext,
    };
    if (patch.logoUrl === null) {
      /* remove logo */
    } else if (patch.logoUrl !== undefined && patch.logoUrl.trim()) {
      branding.logoUrl = patch.logoUrl.trim();
    } else if (webinarRegConfig.branding?.logoUrl?.trim()) {
      branding.logoUrl = webinarRegConfig.branding.logoUrl.trim();
    }
    onWebinarRegChange({ ...webinarRegConfig, branding });
  };

  const handleLogoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!isPro) {
      onPremiumLogoBlocked();
      e.target.value = "";
      return;
    }
    setLogoUploading(true);
    try {
      const url = await uploadWebinarRegistrationLogo(file);
      setBranding({ logoUrl: url });
      toast.success("Logo uploaded");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLogoUploading(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  };

  const urlInvalid = urlTouched && webinarCtaUrl.trim().length > 0 && !isValidHttpUrl(webinarCtaUrl);
  const goNext = () => setStep((s) => Math.min(STEPS - 1, s + 1));
  const goBack = () => setStep((s) => Math.max(0, s - 1));
  const hasLogo = !!webinarRegConfig.branding?.logoUrl?.trim();

  return (
    <div className="space-y-5">
      {/* Step indicator */}
      <div className="flex items-center gap-1.5">
        {Array.from({ length: STEPS }, (_, i) => {
          const Icon = STEP_ICONS[i];
          return (
            <div key={i} className="flex flex-1 items-center gap-1.5 min-w-0">
              <button
                type="button"
                onClick={() => setStep(i)}
                className={cn(
                  "flex items-center gap-1.5 shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                  i === step
                    ? "bg-primary text-primary-foreground"
                    : i < step
                    ? "bg-primary/15 text-primary hover:bg-primary/25"
                    : "bg-muted text-muted-foreground hover:bg-muted/80",
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{STEP_LABELS[i]}</span>
                <span className="sm:hidden">{i + 1}</span>
              </button>
              {i < STEPS - 1 && (
                <div className={cn("h-0.5 flex-1 rounded-full", i < step ? "bg-primary/30" : "bg-border")} />
              )}
            </div>
          );
        })}
      </div>

      {/* ── Step 1: Branding ── */}
      {step === 0 && (
        <div className="space-y-5">
          <div className="rounded-xl border border-border/50 bg-muted/15 px-4 py-3">
            <h3 className="text-base font-semibold text-foreground">Branding</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Set your logo and accent color — they appear on the registration form and during the session.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {/* Logo */}
            <section className="space-y-3 rounded-xl border border-border/60 bg-card p-4">
              <Label className="text-sm font-semibold flex items-center gap-1.5">
                Logo
                {!isPro && <Lock className="w-3 h-3 text-amber-500" />}
              </Label>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => void handleLogoFile(e)}
              />
              {hasLogo && (
                <div className="flex items-center justify-center rounded-lg border border-border bg-muted/30 p-3">
                  <img
                    src={webinarRegConfig.branding!.logoUrl!}
                    alt="Logo preview"
                    className="max-h-16 max-w-full object-contain"
                  />
                </div>
              )}
              {isPro ? (
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={logoUploading}
                    onClick={() => logoInputRef.current?.click()}
                  >
                    {logoUploading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ImageIcon className="w-4 h-4 mr-1.5" />
                    )}
                    {hasLogo ? "Replace" : "Upload logo"}
                  </Button>
                  {hasLogo && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => setBranding({ logoUrl: null })}
                    >
                      <X className="w-4 h-4 mr-1" /> Remove
                    </Button>
                  )}
                </div>
              ) : (
                <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={onPremiumLogoBlocked}>
                  <Lock className="w-3.5 h-3.5" /> Logo upload (Pro)
                </Button>
              )}
            </section>

            {/* Color */}
            <section className="space-y-3 rounded-xl border border-border/60 bg-card p-4">
              <Label className="text-sm font-semibold flex items-center gap-1.5">
                Accent color
                {!isPro && <Lock className="w-3 h-3 text-amber-500" />}
              </Label>
              {isPro ? (
                <div className="flex flex-wrap gap-3 items-center">
                  <Input
                    type="color"
                    value={primary}
                    onChange={(e) => setBranding({ primaryColor: e.target.value })}
                    className="h-12 w-16 p-1 border border-input cursor-pointer shrink-0 rounded-lg"
                  />
                  <Input
                    type="text"
                    value={primary}
                    onChange={(e) => {
                      const v = e.target.value.trim();
                      if (/^#[0-9A-Fa-f]{6}$/.test(v)) setBranding({ primaryColor: v });
                    }}
                    className="font-mono text-sm max-w-[130px]"
                    placeholder="#7c3aed"
                  />
                </div>
              ) : (
                <div className="flex flex-wrap gap-2 items-center">
                  <div
                    className="h-12 w-16 rounded-lg border border-border shrink-0"
                    style={{ backgroundColor: primary }}
                  />
                  <span className="text-xs font-mono text-muted-foreground">{primary}</span>
                  <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={onPremiumColorBlocked}>
                    <Lock className="w-3.5 h-3.5" /> Unlock color
                  </Button>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Used for buttons, links, and highlights.
              </p>
            </section>
          </div>
        </div>
      )}

      {/* ── Step 2: Registration ── */}
      {step === 1 && (
        <div className="grid gap-6 lg:grid-cols-[1fr_minmax(260px,320px)] lg:items-start">
          <div className="space-y-4 min-w-0">
            <div className="rounded-xl border border-border/50 bg-muted/15 px-4 py-3">
              <h3 className="text-base font-semibold text-foreground">Registration form</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Choose which fields attendees fill before joining. Collected data appears in your session analytics.
              </p>
            </div>
            <div
              className={!isPro ? "relative" : undefined}
              onClickCapture={() => {
                if (!isPro) onPremiumWebinarSettingsBlocked();
              }}
            >
              <div className={!isPro ? "pointer-events-none opacity-75 select-none" : undefined}>
                <WebinarRegistrationFormBuilder
                  value={webinarRegConfig}
                  onChange={onWebinarRegChange}
                  variant="wizard"
                />
              </div>
              {!isPro && (
                <div className="absolute inset-0 rounded-xl ring-1 ring-amber-400/30 bg-gradient-to-br from-amber-500/5 via-transparent to-transparent pointer-events-none" />
              )}
            </div>
          </div>
          <div className="space-y-2 lg:sticky lg:top-0">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-center lg:text-left">Preview</p>
            <WebinarRegistrationPreview config={webinarRegConfig} />
          </div>
        </div>
      )}

      {/* ── Step 3: Live CTA ── */}
      {step === 2 && (
        <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
          <div className="space-y-4">
            <div className="rounded-xl border border-border/50 bg-muted/15 px-4 py-3">
              <h3 className="text-base font-semibold text-foreground">Live CTA button</h3>
              <p className="text-sm text-muted-foreground mt-1">
                During your live session, tap <strong className="text-foreground">CTA</strong> in Present mode to pop a button on every attendee's phone.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="wiz-cta-label">Button label</Label>
              <Input
                id="wiz-cta-label"
                placeholder='e.g. "Get the playbook"'
                value={webinarCtaLabel}
                onChange={(e) => {
                  if (!isPro) {
                    onPremiumWebinarSettingsBlocked();
                    return;
                  }
                  onWebinarCtaLabelChange(e.target.value);
                }}
                onFocus={() => {
                  if (!isPro) onPremiumWebinarSettingsBlocked();
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wiz-cta-url">Opens (URL)</Label>
              <Input
                id="wiz-cta-url"
                type="url"
                inputMode="url"
                placeholder="https://…"
                value={webinarCtaUrl}
                onChange={(e) => {
                  if (!isPro) {
                    onPremiumWebinarSettingsBlocked();
                    return;
                  }
                  onWebinarCtaUrlChange(e.target.value);
                  setUrlTouched(true);
                }}
                onBlur={() => setUrlTouched(true)}
                onFocus={() => {
                  if (!isPro) onPremiumWebinarSettingsBlocked();
                }}
                className={urlInvalid ? "border-destructive focus-visible:ring-destructive" : ""}
              />
              {urlInvalid ? (
                <p className="text-xs text-destructive">Use a full URL starting with https://</p>
              ) : (
                <p className="text-xs text-muted-foreground">Optional until you go live.</p>
              )}
            </div>
          </div>
          <div className="space-y-2 lg:sticky lg:top-0">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Preview</p>
            <WebinarCtaLivePreview label={webinarCtaLabel} url={webinarCtaUrl} variant="with_url" />
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/50">
        <Button type="button" variant="outline" size="sm" onClick={goBack} disabled={step === 0}>
          Back
        </Button>
        {step < STEPS - 1 ? (
          <Button type="button" onClick={goNext}>
            Next: {STEP_LABELS[step + 1]}
          </Button>
        ) : (
          <span className="text-xs text-muted-foreground">Use Done to close — save from the editor header.</span>
        )}
      </div>
    </div>
  );
}
