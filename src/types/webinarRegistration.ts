import { z } from "zod";

export const WEBINAR_FIELD_TYPES = ["email", "name", "text"] as const;
export type WebinarRegistrationFieldType = (typeof WEBINAR_FIELD_TYPES)[number];

const fieldSchema = z.object({
  id: z.string().min(1),
  type: z.enum(WEBINAR_FIELD_TYPES),
  label: z.string().min(1).max(120),
  placeholder: z.string().max(200).optional(),
  required: z.boolean().optional(),
});

export type WebinarRegistrationField = z.infer<typeof fieldSchema>;

export const webinarRegistrationConfigSchema = z.object({
  formTitle: z.string().max(200).optional(),
  formSubtitle: z.string().max(400).optional(),
  /** When true, show a short privacy note under the form (host-written copy). */
  showPrivacyNote: z.boolean().optional(),
  privacyNote: z.string().max(500).optional(),
  fields: z.array(fieldSchema).min(1).max(12),
});

export type WebinarRegistrationConfig = z.infer<typeof webinarRegistrationConfigSchema>;

export function createRegistrationFieldId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `f_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function defaultWebinarRegistrationConfig(): WebinarRegistrationConfig {
  return {
    formTitle: "Webinar registration",
    formSubtitle: "Enter your details to continue",
    fields: [
      {
        id: createRegistrationFieldId(),
        type: "email",
        label: "Email",
        placeholder: "you@company.com",
        required: true,
      },
      {
        id: createRegistrationFieldId(),
        type: "name",
        label: "Full name",
        placeholder: "Your name",
        required: true,
      },
    ],
  };
}

/** Presets hosts can apply in one click */
export function presetEmailOnly(): WebinarRegistrationConfig {
  return {
    formTitle: "Join the session",
    formSubtitle: "We’ll send updates to your inbox",
    fields: [
      {
        id: createRegistrationFieldId(),
        type: "email",
        label: "Email",
        placeholder: "you@company.com",
        required: true,
      },
    ],
  };
}

export function presetEmailNameCompany(): WebinarRegistrationConfig {
  return {
    formTitle: "Webinar registration",
    formSubtitle: "Tell us who you are",
    fields: [
      {
        id: createRegistrationFieldId(),
        type: "email",
        label: "Work email",
        placeholder: "you@company.com",
        required: true,
      },
      {
        id: createRegistrationFieldId(),
        type: "name",
        label: "Full name",
        placeholder: "Your name",
        required: true,
      },
      {
        id: createRegistrationFieldId(),
        type: "text",
        label: "Company",
        placeholder: "Company or team",
        required: false,
      },
    ],
  };
}

export function parseWebinarRegistrationConfig(raw: unknown): WebinarRegistrationConfig | null {
  if (raw == null || typeof raw !== "object") return null;
  const parsed = webinarRegistrationConfigSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export function mergeWebinarRegistrationFromSettings(
  settings: Record<string, unknown> | null | undefined,
): WebinarRegistrationConfig {
  const fromDb = parseWebinarRegistrationConfig(settings?.webinarRegistration);
  return fromDb ?? defaultWebinarRegistrationConfig();
}

/** Extract canonical email/name columns for lecture_leads + full answers map */
export function buildLeadPayloadFromAnswers(
  fields: WebinarRegistrationField[],
  answers: Record<string, string>,
): { email: string; name: string; answers: Record<string, string> } {
  let email = "";
  let name = "";
  const normalized: Record<string, string> = {};
  for (const f of fields) {
    const v = (answers[f.id] ?? "").trim();
    normalized[f.id] = v;
    if (f.type === "email" && !email) email = v;
    if (f.type === "name" && !name) name = v;
  }
  return { email, name, answers: normalized };
}

export function validateLeadAnswers(
  fields: WebinarRegistrationField[],
  answers: Record<string, string>,
): { ok: true } | { ok: false; message: string } {
  for (const f of fields) {
    const v = (answers[f.id] ?? "").trim();
    if (f.required && !v) {
      return { ok: false, message: `Please fill in: ${f.label}` };
    }
    if (f.type === "email" && v) {
      const simple = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      if (!simple) {
        return { ok: false, message: `Enter a valid email for: ${f.label}` };
      }
    }
  }
  const hasAny =
    fields.some((f) => (answers[f.id] ?? "").trim().length > 0);
  if (!hasAny) {
    return { ok: false, message: "Please fill in the form." };
  }
  return { ok: true };
}
