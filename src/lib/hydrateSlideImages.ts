import { supabase } from "@/integrations/supabase/client";
import type { Slide } from "@/types/slides";

export type PendingSlideImage = { index: number; prompt: string; type: string };

/** Fill overlay images after generate-slides returns pendingSlideImages (charges generate-image credits per image). */
export async function hydratePendingSlideImages(
  slides: Slide[],
  pending: PendingSlideImage[] | undefined,
  accessToken: string,
  onProgress?: (next: Slide[]) => void,
): Promise<Slide[]> {
  if (!pending?.length) return slides;
  let next: Slide[] = slides.map((s) => ({ ...s, design: { ...s.design } }));
  const concurrency = 2;
  for (let i = 0; i < pending.length; i += concurrency) {
    const chunk = pending.slice(i, i + concurrency);
    await Promise.all(
      chunk.map(async (task) => {
        const idx = task.index;
        if (idx < 0 || idx >= next.length || !task.prompt.trim()) return;
        const { data, error } = await supabase.functions.invoke("generate-image", {
          body: { prompt: task.prompt },
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (error || !data || typeof (data as { imageUrl?: string }).imageUrl !== "string") return;
        const url = (data as { imageUrl: string }).imageUrl;
        const slide = next[idx];
        if (!slide) return;
        next[idx] = {
          ...slide,
          design: {
            ...slide.design,
            overlayImageUrl: url,
          },
        };
      }),
    );
    onProgress?.(next.map((s) => ({ ...s, design: { ...s.design } })));
  }
  return next;
}
