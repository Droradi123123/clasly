import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Loader2, ImageIcon, X } from "lucide-react";
import { toast } from "sonner";
import {
  type WebinarBranding,
  DEFAULT_WEBINAR_PRIMARY_COLOR,
} from "@/types/webinarRegistration";
import { uploadWebinarRegistrationLogo } from "@/lib/webinarRegistrationLogoUpload";

type Props = {
  branding: WebinarBranding | undefined;
  onBrandingChange: (branding: WebinarBranding) => void;
  isPro: boolean;
  onPremiumLogoBlocked: () => void;
  onPremiumColorBlocked: () => void;
};

export function PresentationBrandingPanel({
  branding,
  onBrandingChange,
  isPro,
  onPremiumLogoBlocked,
  onPremiumColorBlocked,
}: Props) {
  const [logoUploading, setLogoUploading] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const primary =
    branding?.primaryColor?.match(/^#[0-9A-Fa-f]{6}$/)
      ? branding.primaryColor
      : DEFAULT_WEBINAR_PRIMARY_COLOR;

  const hasLogo = !!branding?.logoUrl?.trim();

  const update = (patch: { primaryColor?: string; logoUrl?: string | null }) => {
    const next: WebinarBranding = {
      primaryColor: patch.primaryColor ?? branding?.primaryColor ?? DEFAULT_WEBINAR_PRIMARY_COLOR,
    };
    if (patch.logoUrl === null) {
      /* clear */
    } else if (patch.logoUrl !== undefined && patch.logoUrl.trim()) {
      next.logoUrl = patch.logoUrl.trim();
    } else if (branding?.logoUrl?.trim()) {
      next.logoUrl = branding.logoUrl.trim();
    }
    onBrandingChange(next);
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
      update({ logoUrl: url });
      toast.success("Logo uploaded");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLogoUploading(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  };

  return (
    <div className="grid gap-5 sm:grid-cols-2">
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
          onChange={(e) => void handleFile(e)}
        />
        {hasLogo && (
          <div className="flex items-center justify-center rounded-lg border border-border bg-muted/30 p-3">
            <img
              src={branding!.logoUrl!}
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
                onClick={() => update({ logoUrl: null })}
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

      {/* Accent color */}
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
              onChange={(e) => update({ primaryColor: e.target.value })}
              className="h-12 w-16 p-1 border border-input cursor-pointer shrink-0 rounded-lg"
            />
            <Input
              type="text"
              value={primary}
              onChange={(e) => {
                const v = e.target.value.trim();
                if (/^#[0-9A-Fa-f]{6}$/.test(v)) update({ primaryColor: v });
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
          Used for buttons and highlights during your presentation.
        </p>
      </section>
    </div>
  );
}
