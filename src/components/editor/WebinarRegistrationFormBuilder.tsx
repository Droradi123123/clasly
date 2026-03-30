import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  type WebinarRegistrationConfig,
  type WebinarRegistrationField,
  type WebinarRegistrationFieldType,
  WEBINAR_FIELD_TYPES,
  createRegistrationFieldId,
  defaultWebinarRegistrationConfig,
  presetEmailNameCompany,
  presetEmailOnly,
} from "@/types/webinarRegistration";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";

type Props = {
  value: WebinarRegistrationConfig;
  onChange: (next: WebinarRegistrationConfig) => void;
};

const TYPE_LABELS: Record<WebinarRegistrationFieldType, string> = {
  email: "Email",
  name: "Name",
  text: "Free text",
};

export function WebinarRegistrationFormBuilder({ value, onChange }: Props) {
  const fields = value.fields;

  const updateField = (index: number, patch: Partial<WebinarRegistrationField>) => {
    const next = [...fields];
    next[index] = { ...next[index]!, ...patch };
    onChange({ ...value, fields: next });
  };

  const removeField = (index: number) => {
    if (fields.length <= 1) return;
    onChange({ ...value, fields: fields.filter((_, i) => i !== index) });
  };

  const moveField = (index: number, dir: -1 | 1) => {
    const j = index + dir;
    if (j < 0 || j >= fields.length) return;
    const next = [...fields];
    [next[index], next[j]] = [next[j]!, next[index]!];
    onChange({ ...value, fields: next });
  };

  const addField = (type: WebinarRegistrationFieldType) => {
    const base: WebinarRegistrationField = {
      id: createRegistrationFieldId(),
      type,
      label:
        type === "email" ? "Email" : type === "name" ? "Name" : "Notes",
      placeholder: "",
      required: type === "email",
    };
    onChange({ ...value, fields: [...fields, base] });
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold text-foreground uppercase tracking-wide mb-2">Quick presets</p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-xs h-8"
            onClick={() => onChange(defaultWebinarRegistrationConfig())}
          >
            Email + name
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-xs h-8"
            onClick={() => onChange(presetEmailOnly())}
          >
            Email only
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-xs h-8"
            onClick={() => onChange(presetEmailNameCompany())}
          >
            Email + name + company
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="wr-form-title">Form title</Label>
          <Input
            id="wr-form-title"
            value={value.formTitle ?? ""}
            onChange={(e) => onChange({ ...value, formTitle: e.target.value })}
            placeholder="e.g. Join the webinar"
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="wr-form-sub">Subtitle (optional)</Label>
          <Input
            id="wr-form-sub"
            value={value.formSubtitle ?? ""}
            onChange={(e) => onChange({ ...value, formSubtitle: e.target.value })}
            placeholder="Short line under the title"
          />
        </div>
      </div>

      <div className="rounded-lg border border-border/60 bg-muted/30 p-3 space-y-3">
        <div className="flex items-center gap-2">
          <Checkbox
            id="wr-privacy"
            checked={!!value.showPrivacyNote}
            onCheckedChange={(c) =>
              onChange({ ...value, showPrivacyNote: c === true })
            }
          />
          <Label htmlFor="wr-privacy" className="text-sm font-normal cursor-pointer">
            Show a short note under the form (consent / how we use data)
          </Label>
        </div>
        {value.showPrivacyNote && (
          <Textarea
            value={value.privacyNote ?? ""}
            onChange={(e) => onChange({ ...value, privacyNote: e.target.value })}
            placeholder="e.g. We’ll only use this to send the replay and relevant offers."
            rows={2}
            className="resize-none text-sm"
          />
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Fields (order = on phone)</p>
          <span className="text-[11px] text-muted-foreground">{fields.length}/12</span>
        </div>
        <div className="space-y-3 max-h-[min(52vh,420px)] overflow-y-auto pr-1">
          {fields.map((field, index) => (
            <div
              key={field.id}
              className="rounded-xl border border-border/70 bg-background p-3 space-y-3 shadow-sm"
            >
              <div className="flex flex-wrap items-start gap-2">
                <div className="w-full sm:w-[130px] space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Type</Label>
                  <select
                    className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
                    value={field.type}
                    onChange={(e) =>
                      updateField(index, { type: e.target.value as WebinarRegistrationFieldType })
                    }
                  >
                    {WEBINAR_FIELD_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {TYPE_LABELS[t]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex-1 min-w-[140px] space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Label shown to attendees</Label>
                  <Input
                    value={field.label}
                    onChange={(e) => updateField(index, { label: e.target.value })}
                    placeholder="Field label"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Placeholder (optional)</Label>
                <Input
                  value={field.placeholder ?? ""}
                  onChange={(e) => updateField(index, { placeholder: e.target.value })}
                  placeholder="Hint inside the field"
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id={`req-${field.id}`}
                    checked={!!field.required}
                    onCheckedChange={(c) => updateField(index, { required: c === true })}
                  />
                  <Label htmlFor={`req-${field.id}`} className="text-sm font-normal cursor-pointer">
                    Required
                  </Label>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    disabled={index === 0}
                    onClick={() => moveField(index, -1)}
                    aria-label="Move up"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    disabled={index === fields.length - 1}
                    onClick={() => moveField(index, 1)}
                    aria-label="Move down"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    disabled={fields.length <= 1}
                    onClick={() => removeField(index)}
                    aria-label="Remove field"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 pt-2">
          <Button type="button" variant="secondary" size="sm" onClick={() => addField("email")}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Email
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={() => addField("name")}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Name
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={() => addField("text")}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Text
          </Button>
        </div>
      </div>
    </div>
  );
}
