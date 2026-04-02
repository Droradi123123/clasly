import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { WebinarRegistrationConfig } from "@/types/webinarRegistration";
import { DEFAULT_WEBINAR_PRIMARY_COLOR } from "@/types/webinarRegistration";

type Props = {
  config: WebinarRegistrationConfig;
  /** Read-only preview */
  className?: string;
};

function lightenHex(hex: string, amount = 0.35): string {
  const h = hex.replace("#", "");
  if (h.length !== 6) return hex;
  const r = Math.min(255, Math.round(parseInt(h.slice(0, 2), 16) + (255 - parseInt(h.slice(0, 2), 16)) * amount));
  const g = Math.min(255, Math.round(parseInt(h.slice(2, 4), 16) + (255 - parseInt(h.slice(2, 4), 16)) * amount));
  const b = Math.min(255, Math.round(parseInt(h.slice(4, 6), 16) + (255 - parseInt(h.slice(4, 6), 16)) * amount));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

export function WebinarRegistrationPreview({ config, className = "" }: Props) {
  const primary = config.branding?.primaryColor ?? DEFAULT_WEBINAR_PRIMARY_COLOR;
  const glow = lightenHex(primary, 0.45);
  const logo = config.branding?.logoUrl?.trim();

  return (
    <div
      className={`relative mx-auto w-full max-w-[320px] rounded-[2rem] border-4 border-zinc-700 bg-zinc-900 p-2 shadow-2xl ${className}`}
      aria-hidden
    >
      <div className="absolute left-1/2 top-2 h-1.5 w-16 -translate-x-1/2 rounded-full bg-zinc-700" />
      <div
        className="mt-5 overflow-hidden rounded-3xl"
        style={{
          background: `linear-gradient(165deg, ${primary}55 0%, #0a0c18 42%, #0a0c18 100%)`,
        }}
      >
        <div
          className="px-4 pt-6 pb-8"
          style={{
            boxShadow: `inset 0 0 80px ${glow}22`,
          }}
        >
          {logo ? (
            <div className="flex justify-center mb-4">
              <img src={logo} alt="" className="h-10 max-w-[160px] object-contain" />
            </div>
          ) : (
            <div className="flex justify-center mb-4">
              <div className="h-10 w-24 rounded-lg bg-white/10 border border-white/15" />
            </div>
          )}
          <div className="text-center mb-5">
            <h2 className="text-lg font-display font-bold text-white leading-tight px-1">
              {config.formTitle?.trim() || "Webinar registration"}
            </h2>
            <p className="text-xs text-violet-100/80 mt-1.5 px-1">
              {config.formSubtitle?.trim() || "Enter your details to continue"}
            </p>
          </div>
          <div className="space-y-3">
            {config.fields.map((field) => (
              <div key={field.id} className="space-y-1 text-left">
                <Label className="text-[11px] text-violet-100/90">
                  {field.label}
                  {field.required ? <span className="text-rose-300"> *</span> : null}
                </Label>
                {field.type === "text" ? (
                  <Textarea
                    readOnly
                    tabIndex={-1}
                    placeholder={field.placeholder || "…"}
                    rows={2}
                    className="rounded-xl border-white/10 bg-[#12152a]/90 text-xs text-white/90 pointer-events-none resize-none min-h-[56px]"
                  />
                ) : (
                  <Input
                    readOnly
                    tabIndex={-1}
                    placeholder={field.placeholder || "…"}
                    className="h-10 rounded-xl border-white/10 bg-[#12152a]/90 text-xs text-white/90 pointer-events-none"
                  />
                )}
              </div>
            ))}
          </div>
          <Button
            type="button"
            tabIndex={-1}
            className="mt-5 w-full h-11 rounded-xl font-bold text-white border-0 pointer-events-none opacity-90"
            style={{ backgroundColor: primary }}
          >
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
}
