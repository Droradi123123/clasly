import { supabase } from "@/integrations/supabase/client";

export type ProductEventName =
  | "signed_up"
  | "lecture_created"
  | "present_clicked"
  | "present_started"
  | "lecture_ended"
  | "lecture_duplicated"
  | "upgrade_view_plans_clicked";

/**
 * Best-effort product event logging (never blocks UX).
 * Safe even if table isn't present yet: errors are swallowed.
 */
export async function logProductEvent(input: {
  userId: string | null | undefined;
  event: ProductEventName;
  lectureId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const { userId, event, lectureId, metadata } = input;
  if (!userId) return;
  try {
    // Avoid bringing server errors to the UI; this is analytics only.
    await supabase.from("product_events").insert({
      user_id: userId,
      lecture_id: lectureId ?? null,
      event,
      metadata: metadata ?? {},
    } as any);
  } catch {
    // noop
  }
}

