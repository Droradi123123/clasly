import { supabase } from "@/integrations/supabase/client";
import { Json } from "@/integrations/supabase/types";

export interface BuilderMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
}

export interface BuilderConversation {
  id: string;
  user_id: string;
  lecture_id: string | null;
  messages: { role: string; content: string; timestamp: string }[];
  original_prompt: string | null;
  target_audience: string | null;
  created_at: string;
  updated_at: string;
}

export async function saveBuilderConversation(params: {
  userId: string;
  messages: { role: string; content: string; timestamp?: Date }[];
  lectureId?: string | null;
  originalPrompt?: string;
  targetAudience?: string;
}): Promise<{ id: string } | null> {
  const { userId, messages, lectureId, originalPrompt, targetAudience } = params;

  if (messages.length === 0) return null;

  const payload = messages.map((m) => ({
    role: m.role,
    content: m.content,
    timestamp: (m.timestamp instanceof Date ? m.timestamp : new Date()).toISOString(),
  }));

  const { data, error } = await supabase
    .from("builder_conversations")
    .insert({
      user_id: userId,
      lecture_id: lectureId || null,
      messages: payload as Json,
      original_prompt: originalPrompt || null,
      target_audience: targetAudience || null,
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    console.error("[builderConversations] Save error:", error);
    return null;
  }

  return data;
}

/** Fetch all builder conversations. Admins see all; regular users see only their own (RLS). */
export async function getAllBuilderConversations(limit = 100): Promise<BuilderConversation[]> {
  const { data, error } = await supabase
    .from("builder_conversations")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[builderConversations] Fetch error:", error);
    return [];
  }

  return (data as BuilderConversation[]) || [];
}
