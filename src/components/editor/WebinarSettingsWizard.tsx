import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Loader2, ImageIcon, X } from "lucide-react";
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
      /* omit logoUrl */
    } else if (patch.logoUrl !== undefined && patch.logoUrl.trim()) {
      branding.logoUrl = patch.logoUrl.trim();
    } else if (webinarRegConfig.branding?.logoUrl?.trim()) {
      branding.logoUrl = webinarRegConfig.branding.logoUrl.trim();
    }
    onWebinarRegChange({
      ...webinarRegConfig,
      branding,
    });
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
      const msg = err instanceof Error ? err.message : "Upload failed";
      toast.error(msg);
    } finally {
      setLogoUploading(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  };

  const urlInvalid = urlTouched && webinarCtaUrl.trim().length > 0 && !isValidHttpUrl(webinarCtaUrl);

  const goNext = () => setStep((s) => Math.min(STEPS - 1, s + 1));
  const goBack = () => setStep((s) => Math.max(0, s - 1));
  const skip = () => goNext();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        {Array.from({ length: STEPS }, (_, i) => (
          <div key={i} className="flex flex-1 items-center gap-2 min-w-0">
            <div
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                i === step ? "bg-primary text-primary-foreground" : i < step ? "bg-primary/25 text-primary" : "bg-muted text-muted-foreground",
              )}
            >
              {i + 1}
            </div>
            {i < STEPS - 1 ? <div className={cn("h-0.5 flex-1 rounded-full", i < step ? "bg-primary/40" : "bg-border")} /> : null}
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground text-center">
        Step {step + 1} of {STEPS}
      </p>

      {step === 0 && (
        <div className="grid gap-8 lg:grid-cols-[1fr_minmax(260px,320px)] lg:items-start">
          <div className="space-y-6 min-w-0">
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground border-b border-border/60 pb-2">Registration form</h3>
              <WebinarRegistrationFormBuilder value={webinarRegConfig} onChange={onWebinarRegChange} />
            </section>
            <section className="space-y-3 rounded-xl border border-border/60 bg-muted/20 p-4">
              <h3 className="text-sm font-semibold text-foreground">Branding</h3>
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1.5">
                  Primary color
                  {!isPro && <Lock className="w-3 h-3 text-amber-500" aria-hidden />}
                </Label>
                {isPro ? (
                  <div className="flex flex-wrap gap-2 items-center">
                    <Input
                      type="color"
                      value={primary}
                      onChange={(e) => setBranding({ primaryColor: e.target.value })}
                      className="h-10 w-14 p-1 border border-input cursor-pointer shrink-0"
                    />
                    <Input
                      type="text"
                      value={primary}
                      onChange={(e) => {
                        const v = e.target.value.trim();
                        if (/^#[0-9A-Fa-f]{6}$/.test(v)) setBranding({ primaryColor: v });
                      }}
                      className="font-mono text-sm max-w-[140px]"
                      placeholder="#7c3aed"
                    />
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2 items-center">
                    <div
                      className="h-10 w-14 rounded-md border border-border shrink-0"
                      style={{ backgroundColor: primary }}
                      title="Registration accent"
                    />
                    <span className="text-xs font-mono text-muted-foreground">{primary}</span>
                    <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={onPremiumColorBlocked}>
                      <Lock className="w-3.5 h-3.5" />
                      Unlock custom color
                    </Button>
                  </div>
                )}
              </div>
              <div className="space-y-2 pt-2">
                <Label className="text-xs flex items-center gap-1.5">
                  Logo (optional)
                  {!isPro && <Lock className="w-3 h-3 text-amber-500" aria-hidden />}
                </Label>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => void handleLogoFile(e)}
                />
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
                      Upload logo
                    </Button>
                    {webinarRegConfig.branding?.logoUrl?.trim() ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => setBranding({ logoUrl: null })}
                      >
                        <X className="w-4 h-4 mr-1" />
                        Remove
                      </Button>
                    ) : null}
                  </div>
                ) : (
                  <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={onPremiumLogoBlocked}>
                    <Lock className="w-3.5 h-3.5" />
                    Logo upload (Pro)
                  </Button>
                )}
              </div>
            </section>
          </div>
          <div className="space-y-2 lg:sticky lg:top-0">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-center lg:text-left">Preview</p>
            <WebinarRegistrationPreview config={webinarRegConfig} />
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground border-b border-border/60 pb-2">Live CTA (during session)</h3>
            <p className="text-sm text-muted-foreground">
              Button text attendees see on their phones when you send the CTA from Present mode.
            </p>
            <div className="space-y-2">
              <Label htmlFor="wiz-cta-label">Button label</Label>
              <Input
                id="wiz-cta-label"
                placeholder='e.g. "Get the playbook"'
                value={webinarCtaLabel}
                onChange={(e) => onWebinarCtaLabelChange(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Preview</p>
            <WebinarCtaLivePreview label={webinarCtaLabel} variant="button_only" />
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground border-b border-border/60 pb-2">Destination URL</h3>
            <p className="text-sm text-muted-foreground">
              Full link opened when attendees tap the button. Use <code className="text-xs bg-muted px-1 rounded">https://</code>
            </p>
            <div className="space-y-2">
              <Label htmlFor="wiz-cta-url">URL</Label>
              <Input
                id="wiz-cta-url"
                type="url"
                inputMode="url"
                placeholder="https://…"
                value={webinarCtaUrl}
                onChange={(e) => {
                  onWebinarCtaUrlChange(e.target.value);
                  setUrlTouched(true);
                }}
                onBlur={() => setUrlTouched(true)}
                className={urlInvalid ? "border-destructive focus-visible:ring-destructive" : ""}
              />
              {urlInvalid ? (
                <p className="text-xs text-destructive">Enter a valid URL starting with https://</p>
              ) : (
                <p className="text-xs text-muted-foreground">You can leave this empty until you are ready.</p>
              )}
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/30 p-4 space-y-2 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">How to activate in Present</p>
              <p>
                In Present mode, tap <strong className="text-foreground">CTA</strong> in the top toolbar to broadcast this button
                to every attendee.
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Preview</p>
            <WebinarCtaLivePreview
              label={webinarCtaLabel}
              url={webinarCtaUrl}
              variant="with_url"
            />
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/50">
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={goBack} disabled={step === 0}>
            Back
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={skip} disabled={step === STEPS - 1}>
            Skip
          </Button>
        </div>
        {step < STEPS - 1 ? (
          <Button type="button" onClick={goNext}>
            Next
          </Button>
        ) : (
          <span className="text-xs text-muted-foreground">Use Done to close — save from the editor header.</span>
        )}
      </div>
    </div>
  );
}
