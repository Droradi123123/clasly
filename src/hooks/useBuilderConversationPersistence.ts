import { useEffect, useRef, useCallback } from "react";
import { saveBuilderConversation } from "@/lib/builderConversations";
import { toast } from "sonner";

const SAVE_DEBOUNCE_MS = 1200;

/**
 * Persists builder chat conversations to Supabase.
 * Call from ConversationalBuilder and Editor (when using AI chat).
 * Use flush() before navigate/reset to ensure data is saved.
 */
export function useBuilderConversationPersistence(params: {
  userId: string | undefined;
  messages: { role: string; content: string; timestamp?: Date }[];
  lectureId?: string | null;
  originalPrompt?: string;
  targetAudience?: string;
}) {
  const { userId, messages, lectureId, originalPrompt, targetAudience } = params;
  const saveDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<string>("");

  const doSave = useCallback(
    async (force = false) => {
      if (!userId || messages.length === 0) return;

      const key = JSON.stringify({
        len: messages.length,
        last: messages[messages.length - 1]?.content?.slice(0, 50),
        lectureId,
      });
      if (!force && lastSavedRef.current === key) return;
      lastSavedRef.current = key;

      const result = await saveBuilderConversation({
        userId,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
          timestamp: m.timestamp,
        })),
        lectureId,
        originalPrompt: originalPrompt || undefined,
        targetAudience: targetAudience || undefined,
      });

      if (result === null && force) {
        toast.error("Failed to save conversation history");
      }
    },
    [userId, messages, lectureId, originalPrompt, targetAudience]
  );

  // Debounced save on message change
  useEffect(() => {
    if (!userId || messages.length === 0) return;

    if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current);
    saveDebounceRef.current = setTimeout(() => {
      doSave();
      saveDebounceRef.current = null;
    }, SAVE_DEBOUNCE_MS);

    return () => {
      if (saveDebounceRef.current) {
        clearTimeout(saveDebounceRef.current);
        saveDebounceRef.current = null;
      }
    };
  }, [userId, messages, lectureId, originalPrompt, targetAudience, doSave]);

  /** Call before navigate/reset to flush immediately */
  const flush = useCallback(async () => {
    if (saveDebounceRef.current) {
      clearTimeout(saveDebounceRef.current);
      saveDebounceRef.current = null;
    }
    await doSave(true /* force */);
  }, [doSave]);

  return { flush };
}
