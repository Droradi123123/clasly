-- Create the slide-images Storage bucket for AI-generated images.
-- Images are uploaded by Edge Functions (service role) and served publicly via CDN.
-- This replaces storing base64 in the lectures JSONB column.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'slide-images',
  'slide-images',
  true,
  5242880,  -- 5 MB max per image
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Public read: anyone can view slide images via URL
DROP POLICY IF EXISTS "Public read access for slide images" ON storage.objects;
CREATE POLICY "Public read access for slide images"
ON storage.objects FOR SELECT
USING (bucket_id = 'slide-images');

-- Authenticated users can upload (for client-side image upload)
DROP POLICY IF EXISTS "Authenticated users can upload slide images" ON storage.objects;
CREATE POLICY "Authenticated users can upload slide images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'slide-images');

-- Service role can upload (for Edge Functions)
DROP POLICY IF EXISTS "Service role can manage slide images" ON storage.objects;
CREATE POLICY "Service role can manage slide images"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'slide-images')
WITH CHECK (bucket_id = 'slide-images');
