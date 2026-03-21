import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export type BuilderMessageRole = "user" | "assistant" | "system";

/** Client-side persist (e.g. editor import welcome). Edge functions also write via service role. */
export async function insertBuilderConversationMessages(
  sessionId: string,
  rows: {
    role: BuilderMessageRole;
    content: string;
    metadata?: Record<string, unknown>;
  }[]
): Promise<{ error: Error | null }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !sessionId) {
    return { error: new Error("Not signed in or missing session") };
  }

  const { error } = await supabase.from("builder_conversation").insert(
    rows.map((r) => ({
      user_id: user.id,
      session_id: sessionId,
      role: r.role,
      content: r.content,
      metadata: (r.metadata ?? {}) as Json,
    }))
  );

  if (error) {
    console.error("[builder_conversation]", error);
    return { error: new Error(error.message) };
  }
  return { error: null };
}
