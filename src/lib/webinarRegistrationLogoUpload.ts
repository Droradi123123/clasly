import { supabase } from "@/integrations/supabase/client";

/** Upload a logo for webinar registration (same bucket as slide assets). */
export async function uploadWebinarRegistrationLogo(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please select an image file");
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error("Image must be smaller than 10MB");
  }
  const ext = file.name.split(".").pop();
  const path = `webinar-reg/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from("slide-images").upload(path, file, { upsert: false });
  if (error) throw error;
  const { data: publicData } = supabase.storage.from("slide-images").getPublicUrl(path);
  let displayUrl = publicData.publicUrl;
  try {
    const { data: signedData } = await supabase.storage.from("slide-images").createSignedUrl(path, 60 * 60 * 24 * 365);
    if (signedData?.signedUrl) displayUrl = signedData.signedUrl;
  } catch {
    /* use public URL */
  }
  return displayUrl;
}
