import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  type WebinarRegistrationConfig,
  type WebinarRegistrationField,
  type WebinarRegistrationFieldType,
  WEBINAR_FIELD_TYPES,
  createRegistrationFieldId,
} from "@/types/webinarRegistration";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

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
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
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
              <div className="space-y-2">
                <Label className="text-[11px] text-muted-foreground">Field type</Label>
                <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Field type">
                  {WEBINAR_FIELD_TYPES.map((t) => (
                    <button
                      key={t}
                      type="button"
                      role="radio"
                      aria-checked={field.type === t}
                      onClick={() => updateField(index, { type: t })}
                      className={cn(
                        "rounded-lg border px-2 py-2.5 text-center text-xs font-medium transition-colors min-h-[44px]",
                        field.type === t
                          ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary/30"
                          : "border-border/80 bg-muted/20 text-muted-foreground hover:bg-muted/40 hover:text-foreground",
                      )}
                    >
                      {TYPE_LABELS[t]}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Label shown to attendees</Label>
                <Input
                  value={field.label}
                  onChange={(e) => updateField(index, { label: e.target.value })}
                  placeholder="Field label"
                />
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
        <div className="pt-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="secondary" size="sm" disabled={fields.length >= 12}>
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Add field
                <ChevronDown className="w-3.5 h-3.5 ml-1 opacity-70" aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuItem onClick={() => addField("email")}>Email</DropdownMenuItem>
              <DropdownMenuItem onClick={() => addField("name")}>Name</DropdownMenuItem>
              <DropdownMenuItem onClick={() => addField("text")}>Free text</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
